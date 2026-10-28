import {Application, Assets, Container, FederatedPointerEvent, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import {hudFrame} from "./hud"

// The night sky, with its moon and stars, and the hills and ground in front of it. A
// city's skyline stands between them, its foot hidden behind the hills
const skyUrl = "sprites/backgrounds/night-sky.svg"
const hillsUrl = "sprites/backgrounds/night-hills.svg"
const houseUrl = "sprites/house.svg"
// The sky is drawn at 1280 x 720, and the house is placed in those same units
const sceneWidth = 1280
const sceneHeight = 720
// The skyline in two layers, far behind near, each drawn 2560 x 420. It's shown a
// little smaller, centred, standing on y 530
const skylineUrls = {far: "sprites/backgrounds/skyline-far.svg", near: "sprites/backgrounds/skyline-near.svg"}
const skylineSize = {width: 2560, height: 420}
const skylineScale = 0.95
const skylineFoot = 530
const skylineLeft = sceneWidth / 2 - skylineSize.width * skylineScale / 2
const skylineTop = skylineFoot - skylineSize.height * skylineScale
// The bar and the credit along the bottom of the screen cover the scene behind them,
// so the camera can go further down than the scene, to bring its bottom up above the
// bar. Below the scene, the ground carries on this far, and the view clears the bar by
// a little
const groundBelow = 400
const barClearance = 8
// The house stands with its bottom edge on the ground band, which starts at y 600
const houseHeight = 420
const houseBottom = 680
// house.svg's own size and where its viewBox starts, which it's scaled from to stand
// houseHeight tall, centred on the scene
const houseSvg = {x: 153.35, y: 52.83, width: 597.11, height: 489.61}
const houseScale = houseHeight / houseSvg.height
const houseLeft = sceneWidth / 2 - houseSvg.width * houseScale / 2
const houseTop = houseBottom - houseHeight

// Where a point of house.svg lands in the scene
const fromHouseSvg = (x: number, y: number): PointData => ({
  x: houseLeft + (x - houseSvg.x) * houseScale,
  y: houseTop + (y - houseSvg.y) * houseScale,
})

// The porch's tiled floor, from the first path in house.svg: its back edge runs along
// the foot of the wall and its front edge flares out to the steps
const porchFloor: PointData[] = [
  fromHouseSvg(201.225, 479.175),
  fromHouseSvg(683.175, 479.175),
  fromHouseSvg(743.55, 528.225),
  fromHouseSvg(156.075, 527.55),
]

type View = {x: number, y: number, width: number, height: number}

// What the camera frames to begin with: the house from its porch floor, kept clear of
// the bar along the bottom, up to the eaves
const startView: View = {x: 440, y: 510, width: 400, height: 180}
// The closest the camera gets: about a diya's width and a half across the screen's
// shorter side on a phone, or a few diyas on a desktop
const closestView = {width: 180, height: 80}
// How much each press of a zoom button or key zooms by, and how long it takes
const zoomStep = 1.5
const zoomDuration = 200

const coverScale = (width: number, height: number) => Math.max(width / sceneWidth, height / sceneHeight)
const fitScale = (view: {width: number, height: number}, width: number, height: number) =>
  Math.max(coverScale(width, height), Math.min(width / view.width, height / view.height))

// Every asset the background needs, to be loaded before it's created
const backgroundAssets = [skyUrl, hillsUrl, ...Object.values(skylineUrls), houseUrl]

// The SVGs are rasterised once at load, so draw them at the size they'll be shown
// on this screen to keep them sharp. The house is drawn for the closest zoom; the
// sky, the hills and the skyline are capped to stay within texture limits, as little
// of them shows up close
const addBackgroundAssets = () => {
  const {width, height} = window.screen
  const density = window.devicePixelRatio || 1
  const skyResolution = Math.min(3, Math.ceil(density * coverScale(width, height)))
  const houseZoom = fitScale(closestView, width, height) * houseScale
  const houseResolution = Math.min(4, Math.ceil(density * houseZoom))
  Assets.add({alias: skyUrl, src: skyUrl, data: {resolution: skyResolution}})
  Assets.add({alias: hillsUrl, src: hillsUrl, data: {resolution: skyResolution}})
  // The skyline is wider than the scene, so it's kept within 4096 pixels across
  const skylineResolution = Math.min(skyResolution * skylineScale, 4096 / skylineSize.width)
  Object.values(skylineUrls).forEach(url => Assets.add({alias: url, src: url, data: {resolution: skylineResolution}}))
  Assets.add({alias: houseUrl, src: houseUrl, data: {resolution: houseResolution}})
}

const easeOut = (t: number) => 1 - (1 - t) ** 3

// Whether a point is inside a polygon, by counting the edges a ray from it crosses
const isInside = (point: PointData, polygon: PointData[]) => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

// A press on the scenery, given where it fell in the scene. Returning true claims it,
// e.g. to draw, so it doesn't pan the scene
type PressHandler = (at: PointData, e: FederatedPointerEvent) => boolean

// The night sky with the house in it, under a camera that can be panned by dragging
// the scenery or scrolling, and zoomed with zoomBy, a trackpad pinch (or Ctrl and the
// wheel) or a two-finger pinch on touch screens, between seeing the whole scene and a
// close-up of the porch. Expects backgroundAssets to have been loaded already
const createBackground = (app: Application) => {
  const container = new Container()
  const scene = new Container()
  scene.addChild(new Sprite(Assets.get<Texture>(skyUrl)))
  // The skyline, and over it whatever changes in it, like its windows going dark
  const skyline = new Container()
  skyline.position.set(skylineLeft, skylineTop)
  skyline.scale.set(skylineScale)
  skyline.addChild(new Sprite(Assets.get<Texture>(skylineUrls.far)), new Sprite(Assets.get<Texture>(skylineUrls.near)))
  scene.addChild(skyline)
  const hills = new Sprite(Assets.get<Texture>(hillsUrl))
  scene.addChild(hills)
  // The ground below the scene, behind the bar: the hills' bottom row, drawn on down
  const ground = new Sprite(new Texture({
    source: hills.texture.source, frame: new Rectangle(0, sceneHeight - 1, sceneWidth, 1),
  }))
  ground.position.set(0, sceneHeight)
  ground.scale.set(1, groundBelow)
  scene.addChild(ground)
  const house = new Sprite(Assets.get<Texture>(houseUrl))
  house.anchor.set(0.5, 1)
  house.scale.set(houseScale)
  house.position.set(sceneWidth / 2, houseBottom)
  scene.addChild(house)
  // Things placed in the scene, like diyas, so they move with the camera
  const decorations = new Container()
  scene.addChild(decorations)
  // Catches presses on the scenery for panning. It's underneath the scene, so anything
  // placed in it (like diyas) is pressed first
  const panSurface = new Container()
  panSurface.hitArea = app.screen
  panSurface.cursor = "grab"
  panSurface.eventMode = "static"
  container.addChild(panSurface, scene)

  // The house's outline as a mask, one byte per scene unit, so things can be hung on it
  // and not on the sky around it. The hills' outline too, for what they hide
  const maskOf = (texture: Texture, scale: number) => {
    const copy = new Sprite(texture)
    copy.scale.set(scale)
    const {pixels, width, height} = app.renderer.extract.pixels({target: copy, resolution: 1})
    copy.destroy()
    return {pixels, width, height}
  }
  const houseMask = maskOf(house.texture, houseScale)
  const hillsMask = maskOf(hills.texture, 1)
  const isOpaque = (mask: typeof houseMask, x: number, y: number) =>
    x >= 0 && y >= 0 && x < mask.width && y < mask.height && mask.pixels[(y * mask.width + x) * 4 + 3] > 128

  // The point in the scene at the middle of the screen, and how far in it's zoomed: 1
  // just covers the screen with the whole scene
  const centre = {x: startView.x + startView.width / 2, y: startView.y + startView.height / 2}
  let zoom = fitScale(startView, app.screen.width, app.screen.height) / coverScale(app.screen.width, app.screen.height)
  // A zoom eased in over a moment, about a point on screen, from a button or a key
  let zoomAnimation: {from: number, to: number, about: PointData, elapsed: number} | undefined
  let panFrom: Point | undefined
  let onPress: PressHandler | undefined

  const maxZoom = () => {
    const {width, height} = app.screen
    return fitScale(closestView, width, height) / coverScale(width, height)
  }

  // Keeps the zoom within its range, and the view within the scene's edges, though it
  // can go down past the bottom one by as much as the bar covers
  const clampView = () => {
    const {width, height} = app.screen
    zoom = Math.min(maxZoom(), Math.max(1, zoom))
    const scale = coverScale(width, height) * zoom
    const bar = hudFrame(app.screen)
    const belowBar = Math.min(groundBelow, (height - (bar.y - bar.height / 2) + barClearance) / scale)
    const clampAxis = (value: number, half: number, size: number, past = 0) =>
      half * 2 >= size + past ? (size + past) / 2 : Math.min(size - half + past, Math.max(half, value))
    centre.x = clampAxis(centre.x, width / 2 / scale, sceneWidth)
    centre.y = clampAxis(centre.y, height / 2 / scale, sceneHeight, belowBar)
  }

  const layout = () => {
    const {width, height} = app.screen
    clampView()
    const scale = coverScale(width, height) * zoom
    scene.scale.set(scale)
    scene.position.set(width / 2 - centre.x * scale, height / 2 - centre.y * scale)
  }

  // Moves the view by a distance on screen, the way the scenery is dragged
  const panBy = (dx: number, dy: number) => {
    centre.x -= dx / scene.scale.x
    centre.y -= dy / scene.scale.y
    layout()
  }

  // Zooms to a level, keeping the point of the scene under a point on screen there
  const zoomTo = (level: number, about: PointData) => {
    const anchor = scene.toLocal(about)
    zoom = level
    clampView()
    const scale = coverScale(app.screen.width, app.screen.height) * zoom
    centre.x = anchor.x - (about.x - app.screen.width / 2) / scale
    centre.y = anchor.y - (about.y - app.screen.height / 2) / scale
    layout()
  }

  const screenCentre = () => ({x: app.screen.width / 2, y: app.screen.height / 2})

  app.ticker.add(() => {
    if (!zoomAnimation) {
      return
    }
    zoomAnimation.elapsed += app.ticker.deltaMS
    const t = Math.min(1, zoomAnimation.elapsed / zoomDuration)
    zoomTo(zoomAnimation.from + (zoomAnimation.to - zoomAnimation.from) * easeOut(t), zoomAnimation.about)
    if (t === 1) {
      zoomAnimation = undefined
    }
  })

  // Moves and releases are heard on the window, so a pan carries on off the canvas
  const toStage = (e: MouseEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }

  // Touches on the canvas, so two of them can pinch to zoom
  const touches = new Map<number, Point>()
  let pinch: {distance: number, middle: Point} | undefined
  const pinchFrom = () => {
    const [a, b] = [...touches.values()]
    return {distance: Math.hypot(a.x - b.x, a.y - b.y), middle: new Point((a.x + b.x) / 2, (a.y + b.y) / 2)}
  }

  panSurface.on("pointerdown", e => {
    if (pinch || onPress?.(scene.toLocal(e.global), e)) {
      return
    }
    panFrom = e.global.clone()
    panSurface.cursor = "grabbing"
  })
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || e.target !== app.canvas) {
      return
    }
    touches.set(e.pointerId, toStage(e))
    if (touches.size === 2) {
      // A second finger turns a pan into a pinch
      panFrom = undefined
      zoomAnimation = undefined
      pinch = pinchFrom()
    }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, toStage(e))
    }
    if (pinch && touches.size === 2) {
      const next = pinchFrom()
      zoomTo(zoom * next.distance / pinch.distance, next.middle)
      panBy(next.middle.x - pinch.middle.x, next.middle.y - pinch.middle.y)
      pinch = next
      return
    }
    if (!panFrom) {
      return
    }
    const at = toStage(e)
    panBy(at.x - panFrom.x, at.y - panFrom.y)
    panFrom = at
  }
  const onPointerUp = (e: PointerEvent) => {
    touches.delete(e.pointerId)
    if (touches.size < 2) {
      pinch = undefined
    }
    panFrom = undefined
    panSurface.cursor = "grab"
  }
  const onWheel = (e: WheelEvent) => {
    if (e.target !== app.canvas) {
      return
    }
    e.preventDefault()
    zoomAnimation = undefined
    // Trackpad pinches arrive as the wheel with Ctrl held, as does Ctrl and a mouse wheel
    if (e.ctrlKey) {
      zoomTo(zoom * Math.exp(-e.deltaY * 0.01), toStage(e))
    } else {
      // Otherwise wheels and trackpads scroll the scenery past, like scrolling a page
      panBy(-e.deltaX, -e.deltaY)
    }
  }
  window.addEventListener("pointerdown", onPointerDown, true)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)
  window.addEventListener("wheel", onWheel, {passive: false})

  layout()

  return {
    container,
    decorations,
    layout,
    // Where a point on screen falls in the scene, in scene units
    toScene(point: PointData) {
      return scene.toLocal(point)
    },
    // How many screen pixels one scene unit currently spans
    scale() {
      return scene.scale.x
    },
    // Zooms in (above 1) or out (below 1) by a factor, eased over a moment, about a
    // point on screen, or its middle
    zoomBy(factor: number, about: PointData = screenCentre()) {
      const from = zoomAnimation?.to ?? zoom
      const to = Math.min(maxZoom(), Math.max(1, from * factor))
      zoomAnimation = {from: zoom, to, about, elapsed: 0}
    },
    zoomStep,
    canZoomIn: () => zoom < maxZoom() - 1e-3,
    canZoomOut: () => zoom > 1 + 1e-3,
    // Lets a tool claim presses on the scenery, e.g. to draw, instead of them panning it
    setPressHandler(handler: PressHandler | undefined) {
      onPress = handler
    },
    // Whether a point in the scene is on the house, rather than the sky or ground. The
    // SVG has hairline gaps between some of its shapes, so a point counts if anything
    // of the house is within a couple of units of it
    isOnHouse(point: PointData) {
      const x = Math.floor(point.x - houseLeft)
      const y = Math.floor(point.y - houseTop)
      return [-2, 0, 2].some(dy => [-2, 0, 2].some(dx => isOpaque(houseMask, x + dx, y + dy)))
    },
    // The skyline's layer, in the skyline drawing's own units, for things drawn on it
    skyline,
    // Where a point in the skyline drawing is in the scene
    fromSkyline: (point: PointData): PointData => ({
      x: skylineLeft + point.x * skylineScale,
      y: skylineTop + point.y * skylineScale,
    }),
    // Whether a point in the scene is hidden from the skyline behind it by the hills,
    // the ground or the house
    hidesSkyline(point: PointData) {
      const x = Math.floor(point.x)
      const y = Math.floor(point.y)
      return isOpaque(hillsMask, x, y) || isOpaque(houseMask, x - Math.floor(houseLeft), y - Math.floor(houseTop))
    },
    // Whether a point in the scene is on the porch's floor
    isOnPorchFloor: (point: PointData) => isInside(point, porchFloor),
    destroy() {
      window.removeEventListener("pointerdown", onPointerDown, true)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      window.removeEventListener("wheel", onWheel)
      container.destroy({children: true})
    },
  }
}

type Background = ReturnType<typeof createBackground>

export {addBackgroundAssets, backgroundAssets, createBackground, groundBelow, porchFloor, sceneHeight, sceneWidth, skylineUrls}
export type {Background}
