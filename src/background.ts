import {Application, Assets, Container, Graphics, Sprite, Texture} from "pixi.js"

const skyUrl = "sprites/backgrounds/background-night.svg"
const houseUrl = "sprites/house.svg"
// The sky is drawn at 1280 x 720, and the house is placed in those same units
const sceneWidth = 1280
const sceneHeight = 720
// The house stands with its bottom edge on the ground band, which starts at y 600
const houseHeight = 420
const houseBottom = 680
// Darkens the scene so the menu stands out against it
const dimAlpha = 0.5

// Every asset the background needs, to be loaded before it's created
const backgroundAssets = [skyUrl, houseUrl]

// The SVGs are rasterised once at load, so draw them at the size they'll be shown
// on this screen to keep them sharp. Capped so the sky stays within texture limits
const addBackgroundAssets = () => {
  const coverScale = Math.max(window.screen.width / sceneWidth, window.screen.height / sceneHeight)
  const resolution = Math.min(3, Math.ceil((window.devicePixelRatio || 1) * coverScale))
  backgroundAssets.forEach(url => Assets.add({alias: url, src: url, data: {resolution}}))
}

// The night sky with the house in it, covering the screen, under a dimming layer.
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
  const dim = new Graphics()
  container.addChild(scene, dim)

  const layout = () => {
    const {width, height} = app.screen
    // Cover the screen, cropping the sides or the sky rather than the ground
    const scale = Math.max(width / sceneWidth, height / sceneHeight)
    scene.scale.set(scale)
    scene.position.set((width - sceneWidth * scale) / 2, height - sceneHeight * scale)
    dim.clear().rect(0, 0, width, height).fill({color: 0x000000, alpha: dimAlpha})
  }

  layout()

  return {
    container,
    layout,
    destroy() {
      container.destroy({children: true})
    },
  }
}

export {addBackgroundAssets, backgroundAssets, createBackground}
