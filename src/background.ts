import {Application, Assets, Container, FederatedPointerEvent, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import {pixelDensity} from "./app"
import {hudFrame} from "./hud"

// The night sky, with its moon and stars, and the hills and ground in front of it. A
// city's skyline stands between them, its foot hidden behind the hills
const skyUrl = "sprites/backgrounds/night-sky.svg"
const hillsUrl = "sprites/backgrounds/night-hills.svg"
const houseUrl = "sprites/house.svg"
// The scene is 1280 x 720, and the house is placed in those same units. The sky and
// the hills carry on 400 past either side of it, from x -400 to 1680, so the camera
// can pan further across than the scene. It still zooms out only to the scene
const sceneWidth = 1280
const sceneHeight = 720
const scenery = {left: -400, right: sceneWidth + 400}
// The skyline in two layers, far behind near, each drawn 2560 x 420. It's shown a
// little smaller, centred, standing on y 530
const skylineUrls = {far: "sprites/backgrounds/skyline-far.svg", near: "sprites/backgrounds/skyline-near.svg"}
const skylineSize = {width: 2560, height: 420}
const skylineScale = 0.95
const skylineFoot = 530
const skylineLeft = sceneWidth / 2 - skylineSize.width * skylineScale / 2
const skylineTop = skylineFoot - skylineSize.height * skylineScale
// The skyline's layers are further away than the house, so as the camera pans across,
// they slide past more slowly: on screen the far one moves this share as much as the
// house does, and the near one this much. Only across, as moving up and down would
// lift them off the horizon behind the hills
const skylineDepth = {far: 0.3, near: 0.55}
// The moon and stars are furthest of all, so they barely slide as the camera pans.
// The sky is as wide as the scenery and slides by less than the view does, so it
// still covers the screen wherever the camera goes
const skyDepth = 0.08
// The bar and the credit along the bottom of the screen cover the scene behind them,
// so the camera can go further down than the scene, to bring its bottom up above the
// bar. Below the scene, the ground carries on this far, and the view clears the bar by
// a little
const groundBelow = 400
const barClearance = 8
// The house stands with its bottom edge on the ground band, which starts at y 600
const houseHeight = 470
const houseBottom = 680
// house.svg's own size and where its viewBox starts, which it's scaled from to stand
// houseHeight tall, centred on the scene. Its wings stretch it wide, so it's drawn a
// little smaller than its middle would be on its own, to keep the door diya-sized
const houseSvg = {x: 130, y: 85, width: 1538, height: 766}
const houseScale = houseHeight / houseSvg.height
const houseLeft = sceneWidth / 2 - houseSvg.width * houseScale / 2
const houseTop = houseBottom - houseHeight

// Where a point of house.svg lands in the scene
const fromHouseSvg = (x: number, y: number): PointData => ({
  x: houseLeft + (x - houseSvg.x) * houseScale,
  y: houseTop + (y - houseSvg.y) * houseScale,
})

// The porch's tiled floor, from the first shape after the backfills in house.svg: its
// back edge runs along the foot of the walls and its front edge flares out to the steps
const porchFloor: PointData[] = [
  fromHouseSvg(249.357, 681.086),
  fromHouseSvg(1508.623, 681.086),
  fromHouseSvg(1666.374, 817.301),
  fromHouseSvg(131.386, 815.426),
]

type View = {x: number, y: number, width: number, height: number}

// What the camera frames to begin with: the house from its porch floor, kept clear of
// the bar along the bottom, up to the eaves
const startView: View = {x: 395, y: 470, width: 490, height: 220}
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
  const density = pixelDensity
  const skyResolution = Math.min(3, Math.ceil(density * coverScale(width, height)))
  const houseZoom = fitScale(closestView, width, height) * houseScale
  // It's kept within 4096 pixels across too
  const houseResolution = Math.min(4, Math.ceil(density * houseZoom), 4096 / houseSvg.width)
  // The sky and the hills are wider than the scene, so they're kept within 4096 pixels
  // across
  const sceneryResolution = Math.min(skyResolution, 4096 / (scenery.right - scenery.left))
  Assets.add({alias: skyUrl, src: skyUrl, data: {resolution: sceneryResolution}})
  Assets.add({alias: hillsUrl, src: hillsUrl, data: {resolution: sceneryResolution}})
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
  const sky = new Sprite(Assets.get<Texture>(skyUrl))
  sky.x = scenery.left
  scene.addChild(sky)
  // The skyline's two layers. The near one has whatever changes in it drawn over it too,
  // like its windows going dark
  const skylineLayers = {far: new Container(), near: new Container()}
  ;(["far", "near"] as const).forEach(layer => {
    skylineLayers[layer].position.set(skylineLeft, skylineTop)
    skylineLayers[layer].scale.set(skylineScale)
    skylineLayers[layer].addChild(new Sprite(Assets.get<Texture>(skylineUrls[layer])))
    scene.addChild(skylineLayers[layer])
  })
  const hills = new Sprite(Assets.get<Texture>(hillsUrl))
  hills.x = scenery.left
  scene.addChild(hills)
  // The ground below the scene, behind the bar: the hills' bottom row, drawn on down
  const ground = new Sprite(new Texture({
    source: hills.texture.source, frame: new Rectangle(0, sceneHeight - 1, hills.texture.width, 1),
  }))
  ground.position.set(scenery.left, sceneHeight)
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
  // Extracting leaves out the target's own transform, so the scaled copy is put in a
  // container for its scale to count
  const maskOf = (texture: Texture, scale: number) => {
    const holder = new Container()
    const copy = new Sprite(texture)
    copy.scale.set(scale)
    holder.addChild(copy)
    const {pixels, width, height} = app.renderer.extract.pixels({target: holder, resolution: 1})
    holder.destroy({children: true})
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

  // Keeps the zoom within its range, and the view within the scenery's sides and the
  // scene's top and bottom, though it can go down past the bottom by as much as the bar
  // covers
  const clampView = () => {
    const {width, height} = app.screen
    zoom = Math.min(maxZoom(), Math.max(1, zoom))
    const scale = coverScale(width, height) * zoom
    const bar = hudFrame(app.screen)
    const belowBar = Math.min(groundBelow, (height - (bar.y - bar.height / 2) + barClearance) / scale)
    const clampAxis = (value: number, half: number, from: number, to: number) =>
      half * 2 >= to - from ? (from + to) / 2 : Math.min(to - half, Math.max(from + half, value))
    centre.x = clampAxis(centre.x, width / 2 / scale, scenery.left, scenery.right)
    centre.y = clampAxis(centre.y, height / 2 / scale, 0, sceneHeight + belowBar)
  }

  // The part of the scene on screen, in scene units, and a count of how often it's
  // changed, so whatever only animates what can be seen knows when to look again
  const view = {left: 0, top: 0, right: 0, bottom: 0}
  let viewVersion = 0

  const layout = () => {
    const {width, height} = app.screen
    clampView()
    const scale = coverScale(width, height) * zoom
    scene.scale.set(scale)
    scene.position.set(width / 2 - centre.x * scale, height / 2 - centre.y * scale)
    // The sky and each skyline layer follow the camera across part of the way, so they
    // seem further off
    sky.x = scenery.left + (centre.x - sceneWidth / 2) * (1 - skyDepth)
    ;(["far", "near"] as const).forEach(layer => {
      skylineLayers[layer].x = skylineLeft + (centre.x - sceneWidth / 2) * (1 - skylineDepth[layer])
    })
    const left = centre.x - width / 2 / scale
    const top = centre.y - height / 2 / scale
    if (left !== view.left || top !== view.top || width / scale !== view.right - view.left || height / scale !== view.bottom - view.top) {
      view.left = left
      view.top = top
      view.right = left + width / scale
      view.bottom = top + height / scale
      viewVersion++
    }
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
    house,
    layout,
    // Where a point on screen falls in the scene, in scene units
    toScene(point: PointData) {
      return scene.toLocal(point)
    },
    // How many screen pixels one scene unit currently spans
    scale() {
      return scene.scale.x
    },
    // The part of the scene on screen now, in scene units. It's the same object each
    // time, changed as the camera moves; viewVersion goes up whenever it does
    view: view as Readonly<typeof view>,
    viewVersion: () => viewVersion,
    // Whether a point in the scene, or anything in a box in it, is on screen, or within
    // a margin of it, in scene units
    inView: (x: number, y: number, margin = 0) =>
      x >= view.left - margin && x <= view.right + margin && y >= view.top - margin && y <= view.bottom + margin,
    overlapsView: (left: number, top: number, right: number, bottom: number, margin = 0) =>
      right >= view.left - margin && left <= view.right + margin && bottom >= view.top - margin && top <= view.bottom + margin,
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
    // The skyline's near layer, in the skyline drawing's own units, for things drawn on
    // it. It slides as the camera pans
    skyline: skylineLayers.near,
    // And its far layer, behind it
    skylineFar: skylineLayers.far,
    // The part of a skyline layer's drawing on screen now, in its own units, into a box
    // that's reused
    viewInSkyline(layer: Container, into: {left: number, top: number, right: number, bottom: number}) {
      into.left = (view.left - layer.x) / layer.scale.x
      into.right = (view.right - layer.x) / layer.scale.x
      into.top = (view.top - layer.y) / layer.scale.y
      into.bottom = (view.bottom - layer.y) / layer.scale.y
      return into
    },
    // Where a point in the near skyline's drawing is in the scene now
    fromSkyline: (point: PointData): PointData => ({
      x: skylineLayers.near.x + point.x * skylineScale,
      y: skylineLayers.near.y + point.y * skylineScale,
    }),
    // Whether a point in the scene is hidden from the skyline behind it by the hills,
    // the ground or the house
    hidesSkyline(point: PointData) {
      const x = Math.floor(point.x)
      const y = Math.floor(point.y)
      return isOpaque(hillsMask, x - scenery.left, y) || isOpaque(houseMask, x - Math.floor(houseLeft), y - Math.floor(houseTop))
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

export {addBackgroundAssets, backgroundAssets, createBackground, groundBelow, houseUrl, porchFloor, sceneHeight, sceneWidth, scenery, skylineUrls}
export type {Background}
