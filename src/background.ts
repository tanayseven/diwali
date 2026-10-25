import {Application, Assets, Container, Graphics, Point, PointData, Sprite, Texture} from "pixi.js"

const skyUrl = "sprites/backgrounds/background-night.svg"
const houseUrl = "sprites/house.svg"
// The sky is drawn at 1280 x 720, and the house is placed in those same units
const sceneWidth = 1280
const sceneHeight = 720
// The house stands with its bottom edge on the ground band, which starts at y 600
const houseHeight = 420
const houseBottom = 680
// house.svg's own height, which it's scaled from to stand houseHeight tall
const houseSvgHeight = 489.61
// Darkens the scene so the menu stands out against it
const dimAlpha = 0.5

type View = {x: number, y: number, width: number, height: number}

// What the camera frames, in scene units. Each view is fitted inside the screen,
// but never zoomed out past covering it, and never shows beyond the scene's edges.
// The menu frames the bottom half so wide screens crop the sky, not the ground
const menuView: View = {x: 0, y: sceneHeight / 2, width: sceneWidth, height: sceneHeight / 2}
// A close-up of the middle of the porch, by the door and the chairs. It's tighter than
// the porch, so the scene can be panned around from there
const porchView: View = {x: 477.5, y: 499, width: 325, height: 147}
// A little further out than the porch, about the same middle and resting on the same
// floor, so a bit more of the house and the sky above it are in view
const fireworksView: View = {x: 440, y: 466, width: 400, height: 180}
// The close-up each scene's camera moves in to
const sceneViews = {diyas: porchView, fireworks: fireworksView}
type SceneName = keyof typeof sceneViews

const coverScale = (width: number, height: number) => Math.max(width / sceneWidth, height / sceneHeight)
const fitScale = (view: View, width: number, height: number) =>
  Math.max(coverScale(width, height), Math.min(width / view.width, height / view.height))

// Every asset the background needs, to be loaded before it's created
const backgroundAssets = [skyUrl, houseUrl]

// The SVGs are rasterised once at load, so draw them at the size they'll be shown
// on this screen to keep them sharp. The house is drawn for the porch close-up;
// the sky is capped to stay within texture limits, as little of it shows up close
const addBackgroundAssets = () => {
  const {width, height} = window.screen
  const density = window.devicePixelRatio || 1
  const skyResolution = Math.min(3, Math.ceil(density * coverScale(width, height)))
  const houseZoom = fitScale(porchView, width, height) * houseHeight / houseSvgHeight
  const houseResolution = Math.min(4, Math.ceil(density * houseZoom))
  Assets.add({alias: skyUrl, src: skyUrl, data: {resolution: skyResolution}})
  Assets.add({alias: houseUrl, src: houseUrl, data: {resolution: houseResolution}})
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

// The night sky with the house in it, covering the screen, under a dimming layer.
// setFocus moves the camera from the menu's view (0) to the current scene's close-up
// (1), clearing the dimming layer on the way; setScene picks which close-up that is. Once there, setPannable lets the scene be dragged around,
// or scrolled with a wheel or trackpad, within its edges.
// Expects backgroundAssets to have been loaded already
const createBackground = (app: Application) => {
  const container = new Container()
  const scene = new Container()
  scene.addChild(new Sprite(Assets.get<Texture>(skyUrl)))
  const house = new Sprite(Assets.get<Texture>(houseUrl))
  house.anchor.set(0.5, 1)
  house.scale.set(houseHeight / house.texture.height)
  house.position.set(sceneWidth / 2, houseBottom)
  scene.addChild(house)
  // Things placed in the scene, like diyas, so they move with the camera
  const decorations = new Container()
  scene.addChild(decorations)
  const dim = new Graphics()
  // Catches presses on the scenery for panning. It's underneath the scene, so anything
  // placed in it (like diyas) is pressed first, and it's only there while pannable
  const panSurface = new Container()
  panSurface.hitArea = app.screen
  panSurface.cursor = "grab"
  panSurface.eventMode = "none"
  container.addChild(panSurface, scene, dim)
  let focus = 0
  let closeView = porchView
  // How far the close-up has been panned, in scene units. It eases in and out with
  // the focus, so the menu's view is never panned
  const pan = {x: 0, y: 0}
  let pannable = false
  let panFrom: Point | undefined

  // Keeps the panned close-up inside the scene's edges on this screen
  const clampPan = () => {
    const {width, height} = app.screen
    const scale = fitScale(closeView, width, height)
    const clampAxis = (centre: number, half: number, size: number) =>
      half * 2 >= size ? size / 2 : Math.min(size - half, Math.max(half, centre))
    const centreX = closeView.x + closeView.width / 2
    const centreY = closeView.y + closeView.height / 2
    pan.x = clampAxis(centreX + pan.x, width / 2 / scale, sceneWidth) - centreX
    pan.y = clampAxis(centreY + pan.y, height / 2 / scale, sceneHeight) - centreY
  }

  const layout = () => {
    const {width, height} = app.screen
    clampPan()
    const view: View = {
      x: lerp(menuView.x, closeView.x + pan.x, focus),
      y: lerp(menuView.y, closeView.y + pan.y, focus),
      width: lerp(menuView.width, closeView.width, focus),
      height: lerp(menuView.height, closeView.height, focus),
    }
    const scale = fitScale(view, width, height)
    // Centre the view on screen, then pull it back inside the scene's edges
    const x = width / 2 - (view.x + view.width / 2) * scale
    const y = height / 2 - (view.y + view.height / 2) * scale
    scene.scale.set(scale)
    scene.position.set(
      Math.min(0, Math.max(width - sceneWidth * scale, x)),
      Math.min(0, Math.max(height - sceneHeight * scale, y)),
    )
    dim.clear().rect(0, 0, width, height).fill({color: 0x000000, alpha: dimAlpha * (1 - focus)})
  }

  // Moves the view by a distance on screen, the way the scenery is dragged
  const panBy = (dx: number, dy: number) => {
    pan.x -= dx / scene.scale.x
    pan.y -= dy / scene.scale.y
    layout()
  }

  panSurface.on("pointerdown", e => {
    panFrom = e.global.clone()
    panSurface.cursor = "grabbing"
  })
  // Moves and releases are heard on the window, so a pan carries on off the canvas
  const toStage = (e: PointerEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!panFrom) {
      return
    }
    const at = toStage(e)
    panBy(at.x - panFrom.x, at.y - panFrom.y)
    panFrom = at
  }
  const endPan = () => {
    panFrom = undefined
    panSurface.cursor = "grab"
  }
  const onWheel = (e: WheelEvent) => {
    if (!pannable || e.ctrlKey) {
      return
    }
    // Wheels and trackpads scroll the scenery past, like scrolling a page
    e.preventDefault()
    panBy(-e.deltaX, -e.deltaY)
  }
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", endPan)
  window.addEventListener("pointercancel", endPan)
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
    // Changes which close-up the camera moves to, starting it unpanned. It's only
    // meant to change while on the menu, as the camera would jump otherwise
    setScene(name: SceneName) {
      closeView = sceneViews[name]
      pan.x = 0
      pan.y = 0
      layout()
    },
    setFocus(value: number) {
      focus = value
      layout()
    },
    setPannable(value: boolean) {
      pannable = value
      panSurface.eventMode = value ? "static" : "none"
      if (!value) {
        endPan()
      }
    },
    destroy() {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", endPan)
      window.removeEventListener("pointercancel", endPan)
      window.removeEventListener("wheel", onWheel)
      container.destroy({children: true})
    },
  }
}

export {addBackgroundAssets, backgroundAssets, createBackground}
export type {SceneName}
