import {Application, Assets, Container, Graphics, Sprite, Texture} from "pixi.js"

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
// From just above the lower roof's eaves down to the porch floor
const porchView: View = {x: 380, y: 455, width: 520, height: 235}

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
// setFocus moves the camera from the menu's view (0) to the porch (1), clearing the
// dimming layer on the way. Expects backgroundAssets to have been loaded already
const createBackground = (app: Application) => {
  const container = new Container()
  const scene = new Container()
  scene.addChild(new Sprite(Assets.get<Texture>(skyUrl)))
  const house = new Sprite(Assets.get<Texture>(houseUrl))
  house.anchor.set(0.5, 1)
  house.scale.set(houseHeight / house.texture.height)
  house.position.set(sceneWidth / 2, houseBottom)
  scene.addChild(house)
  const dim = new Graphics()
  container.addChild(scene, dim)
  let focus = 0

  const layout = () => {
    const {width, height} = app.screen
    const view: View = {
      x: lerp(menuView.x, porchView.x, focus),
      y: lerp(menuView.y, porchView.y, focus),
      width: lerp(menuView.width, porchView.width, focus),
      height: lerp(menuView.height, porchView.height, focus),
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

  layout()

  return {
    container,
    layout,
    setFocus(value: number) {
      focus = value
      layout()
    },
    destroy() {
      container.destroy({children: true})
    },
  }
}

export {addBackgroundAssets, backgroundAssets, createBackground}
