import {Application, Assets, Container, Graphics, Sprite, Texture} from "pixi.js"

const colors = ["red", "orange", "yellow", "green", "blue", "white"]
const frameNames = ["f1-off", "f2-25", "f3-50", "f4-75", "f5-on"]
const frameUrl = (color: string, frame: string) =>
  `sprites/fairy-lights/micro-seed-led/${color}/micro-seed-led-${color}-${frame}.svg`
// Each bulb fades on then back off again: off, 25, 50, 75, on, 75, 50, 25
const pingPong = [0, 1, 2, 3, 4, 3, 2, 1]
const frameDuration = 160

// The SVG's copper bead, which the wire runs through, sits at (120, 131) of 240 x 300
const beadAnchor = {x: 120 / 240, y: 131 / 300}
const bulbScale = 0.4
const bulbSpacing = 56
const swagWidth = 400
// The wire hangs from points just above the top edge, so only the sag shows
const hangY = -4
const maxSag = 64
const wireColor = 0x8a5a2b
// The epoxy drop's tip is 185 down the SVG, 54 below the bead
const bulbDrop = (185 - 131) * bulbScale

const sagFor = (screenHeight: number) => Math.min(maxSag, screenHeight * 0.08)

// How far down the screen the lowest bulb reaches, so other things can stay clear of it
const fairyLightsHeight = (screenHeight: number) => hangY + sagFor(screenHeight) + bulbDrop

type Bulb = {
  sprite: Sprite
  frames: Texture[]
  phase: number
}

// Strings of fairy lights draped across the top of the screen in swags
const createFairyLights = async (app: Application) => {
  const textures: Record<string, Texture> = await Assets.load(
    colors.flatMap(color => frameNames.map(frame => frameUrl(color, frame))),
  )
  const framesByColor = colors.map(color => frameNames.map(frame => textures[frameUrl(color, frame)]))

  const container = new Container()
  const wire = new Graphics()
  const bulbLayer = new Container()
  container.addChild(wire, bulbLayer)
  let bulbs: Bulb[] = []
  let elapsed = 0

  const tick = () => {
    elapsed += app.ticker.deltaMS
    const step = Math.floor(elapsed / frameDuration)
    bulbs.forEach(({sprite, frames, phase}) => {
      sprite.texture = frames[pingPong[(step + phase) % pingPong.length]]
    })
  }
  app.ticker.add(tick)

  const layout = () => {
    const width = app.screen.width
    const swags = Math.max(2, Math.round(width / swagWidth))
    const span = width / swags
    const sag = sagFor(app.screen.height)
    const perSwag = Math.max(3, Math.round(span / bulbSpacing))

    wire.clear()
    bulbLayer.removeChildren().forEach(child => child.destroy())
    bulbs = []
    for (let swag = 0; swag < swags; swag++) {
      const x0 = swag * span
      // A quadratic curve dips halfway to its control point, so this sags by `sag`
      const control = {x: x0 + span / 2, y: hangY + sag * 2}
      wire.moveTo(x0, hangY).quadraticCurveTo(control.x, control.y, x0 + span, hangY)
      for (let k = 0; k < perSwag; k++) {
        // The curve is symmetric, so evenly spaced t gives evenly spaced bulbs
        const t = (k + 0.5) / perSwag
        const idx = bulbs.length
        const frames = framesByColor[idx % colors.length]
        const sprite = new Sprite(frames[0])
        sprite.anchor.set(beadAnchor.x, beadAnchor.y)
        sprite.scale.set(bulbScale)
        sprite.position.set(
          (1 - t) ** 2 * x0 + 2 * (1 - t) * t * control.x + t ** 2 * (x0 + span),
          (1 - t) ** 2 * hangY + 2 * (1 - t) * t * control.y + t ** 2 * hangY,
        )
        bulbLayer.addChild(sprite)
        // Each bulb lags its neighbour by a frame so the brightness ripples along the string
        bulbs.push({sprite, frames, phase: pingPong.length - (idx % pingPong.length)})
      }
    }
    wire.stroke({width: 1.5, color: wireColor})
    tick()
  }

  layout()

  return {
    container,
    layout,
    destroy() {
      app.ticker.remove(tick)
      container.destroy({children: true})
    },
  }
}

export {createFairyLights, fairyLightsHeight}
