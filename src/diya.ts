import {AnimatedSprite, Application, Assets, Container, Rectangle, Texture} from "pixi.js"

const frameSize = 16
const frameCount = 4
const diyaScale = 5
const bottomOffset = 200

const loadDiyaFrames = async (): Promise<Texture[]> => {
  const sheet = await Assets.load<Texture>("sprites/diya-1.png")
  sheet.source.scaleMode = "nearest"
  return Array.from({length: frameCount}, (_, i) => new Texture({
    source: sheet.source,
    frame: new Rectangle(i * frameSize, 0, frameSize, frameSize),
  }))
}

const createDiyas = async (app: Application) => {
  const frames = await loadDiyaFrames()
  const container = new Container()

  const layout = () => {
    container.removeChildren().forEach(child => child.destroy())
    // On narrow screens space diyas by their own width so they don't overlap
    const step = Math.max(app.screen.width / 10, frameSize * diyaScale + 16)
    for (const y of [10, app.screen.height - bottomOffset]) {
      for (let x = 0; x < app.screen.width; x += step) {
        const diya = new AnimatedSprite(frames)
        diya.animationSpeed = 5 / 60
        diya.scale.set(diyaScale)
        diya.position.set(x, y)
        diya.play()
        container.addChild(diya)
      }
    }
  }

  layout()
  return {container, layout}
}

export {createDiyas}
