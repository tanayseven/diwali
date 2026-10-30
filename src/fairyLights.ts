import {Application, Assets, Container, Graphics, Point, PointData, Polygon, Rectangle, Sprite, Texture} from "pixi.js"
import type {Background} from "./background"
import {createHud, cropped, iconFill, slotSize} from "./hud"
import {Light, Lighting} from "./lighting"
import {LL} from "./locale"
import {setOutline} from "./outline"
import {addTooltip} from "./tooltip"

const colors = ["red", "orange", "yellow", "green", "blue", "white"] as const
type Color = typeof colors[number]
// The colour of each bulb's light on the scene
const lightColours: Record<Color, number> = {
  red: 0xff4433, orange: 0xff9a33, yellow: 0xffe066, green: 0x55ee77, blue: 0x5599ff, white: 0xfff4dd,
}
const frameNames = ["f1-off", "f2-25", "f3-50", "f4-75", "f5-on"]
const frameUrl = (color: string, frame: string) =>
  `sprites/fairy-lights/micro-seed-led/${color}/micro-seed-led-${color}-${frame}.svg`
// Every frame of every colour, to be loaded before the lights are created
const fairyLightAssets = colors.flatMap(color => frameNames.map(frame => frameUrl(color, frame)))
// Each bulb fades on then back off again: off, 25, 50, 75, on, 75, 50, 25
const pingPong = [0, 1, 2, 3, 4, 3, 2, 1]
const frameDuration = 160
// Per frame from off to on: the bulb is tinted darker towards off, and a copy of it
// added on top glows brighter towards on, pushing both ends past what the SVGs draw
const bulbTints = [0x2a2a2a, 0x8c8c8c, 0xffffff, 0xffffff, 0xffffff]
const bloomAlphas = [0, 0, 0.3, 0.65, 1]
// The added copy is a little larger so its light spreads beyond the bulb
const bloomScale = 1.25
// How strongly a bulb lights the scene around it at each frame, and how far
const lightStrengths = [0, 0.15, 0.3, 0.45, 0.6]
const lightRadius = 14

// The SVG's copper bead, which the wire runs through, sits at (120, 131) of 240 x 300
const beadAnchor = {x: 120 / 240, y: 131 / 300}
// The bulb itself in its canvas, without the glow around it, for the HUD
const bulbCrop = new Rectangle(96, 120, 48, 72)
// Sizes in scene units: a bulb is a few units long, about a seventh of a diya
const bulbScale = 0.05
const bulbSpacing = 7
const wireWidth = 0.4
const wireColor = 0x3a2a1a
// A string sags by this share of its length, up to a limit
const sagShare = 0.12
const maxSag = 30
// Strings shorter than this aren't hung, so a tap doesn't leave a stub
const minLength = 12
// How far either side of the wire a string can be picked up by
const grabWidth = 3

// A string's slot is one colour, or every colour in turn
type Choice = Color | "mixed"
const choices: Choice[] = [...colors, "mixed"]

type Bulb = {
  sprite: Sprite
  bloom: Sprite
  frames: Texture[]
  phase: number
  light: Light
}

type LightString = {
  from: PointData
  to: PointData
  choice: Choice
  container: Container
  bulbs: Bulb[]
}

// Where a quadratic curve is partway along, from 0 to 1
const quadratic = (a: PointData, control: PointData, b: PointData, t: number): PointData => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * control.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * control.y + t ** 2 * b.y,
})

// The Decorate House tool: strings of twinkling fairy lights to hang on the house.
// Its bar has a slot for each colour and one for mixed colours; with one picked,
// dragging from a point on the house to another hangs a string between them, sagging
// under its weight. Hung strings shine on the night around them, and can be dragged
// to move them, or dropped on the bar to take them down.
// Expects fairyLightAssets to have been loaded already
const createHouseLights = (app: Application, background: Background, lighting: Lighting) => {
  const framesByColor = Object.fromEntries(colors.map(color =>
    [color, frameNames.map(frame => Assets.get<Texture>(frameUrl(color, frame)))])) as Record<Color, Texture[]>
  const container = new Container()
  const bar = createHud(app)
  container.addChild(bar.container)
  // Strings shine through the night, above it
  const stringLayer = new Container()
  stringLayer.zIndex = lighting.aboveNight
  background.decorations.addChild(stringLayer)
  const strings: LightString[] = []
  let chosen: Choice = "mixed"
  let hudShown = false
  let elapsed = 0
  // Whether a string's been put up, moved or dimmed since the bulbs were last gone over
  let restrung = true
  // A string being hung, from where it was started, or one being moved, with where
  // it started out and how far it's been dragged
  let hanging: LightString | undefined
  let moving: {string: LightString, from: PointData, to: PointData, grabbedAt: PointData} | undefined

  const tips = LL.tooltip.lights
  const colourNames: Record<Choice, () => string> = {
    red: tips.red, orange: tips.orange, yellow: tips.yellow, green: tips.green,
    blue: tips.blue, white: tips.white, mixed: tips.mixed,
  }

  const slots = choices.map((choice, idx) => {
    const slot = bar.addSlot(idx)
    // A mixed string's slot shows three bulbs side by side
    const shown = choice === "mixed" ? ["red", "green", "blue"] as Color[] : [choice]
    shown.forEach((color, k) => {
      const icon = new Sprite(cropped(frameUrl(color, "f5-on"), bulbCrop))
      icon.anchor.set(0.5)
      icon.scale.set(slotSize * iconFill / bulbCrop.height / (shown.length > 1 ? 1.4 : 1))
      icon.x = (k - (shown.length - 1) / 2) * slotSize * 0.26
      slot.container.addChild(icon)
    })
    slot.container.on("pointerdown", () => {
      chosen = choice
      render()
    })
    addTooltip(slot.container, () => ({title: colourNames[choice](), lines: [tips.hint()]}))
    return slot
  })

  // The colour picked is outlined as well as its box highlighted
  const render = () => {
    bar.drawBoxes(slots[choices.indexOf(chosen)].box)
    slots.forEach((slot, idx) => setOutline(slot.container, "selected", choices[idx] === chosen))
  }

  const colorOf = (string: LightString, idx: number): Color =>
    string.choice === "mixed" ? colors[idx % colors.length] : string.choice

  // Lays out a string's wire and bulbs between its ends, sagging in the middle
  const build = (string: LightString) => {
    restrung = true
    const {from, to, container} = string
    container.removeChildren().forEach(child => child.destroy())
    string.bulbs.forEach(bulb => bulb.light.destroy())
    string.bulbs = []
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    const sag = Math.min(maxSag, length * sagShare)
    // A quadratic curve dips halfway to its control point, so this sags by `sag`
    const control = {x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + sag * 2}
    const wire = new Graphics()
      .moveTo(from.x, from.y)
      .quadraticCurveTo(control.x, control.y, to.x, to.y)
      .stroke({width: wireWidth, color: wireColor})
    const bulbLayer = new Container()
    // Above every bulb, so a bright bulb's light also falls on the wire and its neighbours
    const bloomLayer = new Container()
    container.addChild(wire, bulbLayer, bloomLayer)
    const count = Math.max(2, Math.round(length / bulbSpacing))
    for (let k = 0; k < count; k++) {
      const at = quadratic(from, control, to, (k + 0.5) / count)
      const color = colorOf(string, k)
      const frames = framesByColor[color]
      const sprite = new Sprite(frames[0])
      sprite.anchor.set(beadAnchor.x, beadAnchor.y)
      sprite.scale.set(bulbScale)
      sprite.position.copyFrom(at)
      bulbLayer.addChild(sprite)
      const bloom = new Sprite({texture: frames[0], blendMode: "add"})
      bloom.anchor.copyFrom(sprite.anchor)
      bloom.scale.set(bulbScale * bloomScale)
      bloom.position.copyFrom(at)
      bloomLayer.addChild(bloom)
      // Each bulb lags its neighbour by a frame so the brightness ripples along the string
      string.bulbs.push({sprite, bloom, frames, phase: pingPong.length - (k % pingPong.length), light: lighting.addLight(lightColours[color])})
    }
    // Picked up anywhere along the wire: a band either side of it
    const above: number[] = []
    const below: number[] = []
    for (let k = 0; k <= 16; k++) {
      const at = quadratic(from, control, to, k / 16)
      above.push(at.x, at.y - grabWidth)
      below.unshift(at.x, at.y + grabWidth)
    }
    container.hitArea = new Polygon([...above, ...below])
    twinkle()
  }

  const createString = (from: PointData, to: PointData, choice: Choice): LightString => {
    const string: LightString = {from, to, choice, container: new Container(), bulbs: []}
    string.container.cursor = "grab"
    stringLayer.addChild(string.container)
    return string
  }

  const removeString = (string: LightString) => {
    const index = strings.indexOf(string)
    if (index >= 0) {
      strings.splice(index, 1)
    }
    string.bulbs.forEach(bulb => bulb.light.destroy())
    string.container.destroy({children: true})
  }

  // Both ends have to be on the house, and far enough apart
  const canHang = (from: PointData, to: PointData) =>
    background.isOnHouse(from) && background.isOnHouse(to) && Math.hypot(to.x - from.x, to.y - from.y) >= minLength

  // A string that can't be hung where it is shows faded
  const showValidity = (string: LightString) => {
    string.container.alpha = canHang(string.from, string.to) ? 1 : 0.4
    restrung = true
  }

  const makePickable = (string: LightString) => {
    string.container.eventMode = "static"
    addTooltip(string.container, () => ({title: tips.name(), lines: [tips.move()]}))
    string.container.on("pointerdown", e => {
      if (hanging || moving) {
        return
      }
      e.stopPropagation()
      moving = {string, from: {...string.from}, to: {...string.to}, grabbedAt: background.toScene(e.global)}
      setOutline(string.container, "selected", true)
    })
  }

  // With a colour picked, a press on the house starts a string there
  const pressHandler = (at: PointData) => {
    if (!background.isOnHouse(at) || moving) {
      return false
    }
    hanging = createString(at, at, chosen)
    setOutline(hanging.container, "selected", true)
    hanging.container.eventMode = "none"
    build(hanging)
    showValidity(hanging)
    return true
  }

  const toStage = (e: PointerEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }
  const onPointerMove = (e: PointerEvent) => {
    const at = background.toScene(toStage(e))
    if (hanging) {
      hanging.to = at
      build(hanging)
      showValidity(hanging)
    } else if (moving) {
      const dx = at.x - moving.grabbedAt.x
      const dy = at.y - moving.grabbedAt.y
      moving.string.from = {x: moving.from.x + dx, y: moving.from.y + dy}
      moving.string.to = {x: moving.to.x + dx, y: moving.to.y + dy}
      build(moving.string)
      showValidity(moving.string)
    }
  }
  const onPointerUp = (e: PointerEvent) => {
    if (hanging) {
      const string = hanging
      hanging = undefined
      setOutline(string.container, "selected", false)
      if (canHang(string.from, string.to)) {
        strings.push(string)
        makePickable(string)
      } else {
        removeString(string)
      }
    } else if (moving) {
      const {string, from, to} = moving
      moving = undefined
      string.container.alpha = 1
      restrung = true
      setOutline(string.container, "selected", false)
      if (hudShown && bar.isOver(toStage(e))) {
        removeString(string)
      } else if (!canHang(string.from, string.to)) {
        // Back where it was if it can't hang where it was let go
        string.from = from
        string.to = to
        build(string)
      }
    }
  }
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  // The bulbs only change every frameDuration, or when a string's been put up, moved or
  // dimmed, so they're only gone over then, or when the camera's moved. Strings off
  // screen are hidden, their light too, as it can't reach the screen from there
  let twinkledAt = -1
  let viewedAt = -1
  function twinkle() {
    const step = Math.floor(elapsed / frameDuration)
    if (step === twinkledAt && !restrung && background.viewVersion() === viewedAt) {
      return
    }
    twinkledAt = step
    restrung = false
    viewedAt = background.viewVersion()
    const all = hanging ? [...strings, hanging] : strings
    all.forEach(string => {
      const {from, to} = string
      const reach = maxSag + lightRadius
      string.container.visible = background.overlapsView(
        Math.min(from.x, to.x), Math.min(from.y, to.y), Math.max(from.x, to.x), Math.max(from.y, to.y), reach)
      if (!string.container.visible) {
        string.bulbs.forEach(({light}) => light.off())
      }
    })
    all.forEach(string => string.container.visible && string.bulbs.forEach(({sprite, bloom, frames, phase, light}) => {
      const level = pingPong[(step + phase) % pingPong.length]
      sprite.texture = frames[level]
      sprite.tint = bulbTints[level]
      bloom.texture = frames[level]
      bloom.alpha = bloomAlphas[level]
      bloom.visible = bloom.alpha > 0
      light.shine(sprite.position, lightRadius, lightStrengths[level] * string.container.alpha)
    }))
  }
  const tick = () => {
    elapsed += app.ticker.deltaMS
    twinkle()
  }
  app.ticker.add(tick)

  render()

  return {
    container,
    layout: bar.layout,
    pressHandler,
    // Shows its bar, while the Decorate House tool is the one in use
    setHudShown(shown: boolean) {
      hudShown = shown
      bar.setShown(shown)
      bar.setInteractive(shown)
    },
    destroy() {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      app.ticker.remove(tick)
      ;[...strings].forEach(removeString)
      stringLayer.destroy({children: true})
      container.destroy({children: true})
    },
  }
}

export {createHouseLights, fairyLightAssets, lightColours}
