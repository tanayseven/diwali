import {Application, Container, Graphics, Point, PointData, RenderTexture, Sprite, Text, Texture} from "pixi.js"
import {fontFamily} from "./app"
import {Background, porchFloor} from "./background"
import {createHud, slotSize} from "./hud"
import {LL} from "./locale"
import {setOutline} from "./outline"
import {addTooltip} from "./tooltip"

// Rangoli powder colours, as drawn on the porch
const powders = {
  red: 0xe23b2e,
  orange: 0xff8c1a,
  yellow: 0xffd23f,
  green: 0x2fae4e,
  blue: 0x2e6fe0,
  purple: 0x8e44c9,
  pink: 0xff5fa2,
  white: 0xf7f3e8,
}
type Powder = keyof typeof powders
const powderNames = Object.keys(powders) as Powder[]
type Tool = Powder | "eraser"

// Sizes in scene units: a stroke is about a fifth of a diya wide
const brushRadius = 2.2
const eraserRadius = 4
// Stamps are laid this far apart along a stroke, as a share of the brush's radius
const stampSpacing = 0.35
// How many texture pixels the drawing has per scene unit, so it stays crisp up close
const resolution = 5

// A dab of powder: a dense middle that thins out to scattered grains at the edge
const powderTexture = (size: number) => {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const radius = size / 2
  for (let k = 0; k < size * size * 0.6; k++) {
    // More grains towards the middle
    const r = radius * Math.sqrt(Math.random()) * (0.6 + 0.4 * Math.random())
    const angle = Math.random() * Math.PI * 2
    const alpha = 0.35 + 0.65 * (1 - r / radius)
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`
    context.fillRect(radius + Math.cos(angle) * r, radius + Math.sin(angle) * r, 1.2, 1.2)
  }
  return Texture.from(canvas)
}

// A soft, solid round dab, for the eraser
const solidTexture = (size: number) => {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)")
  gradient.addColorStop(0.7, "rgba(255, 255, 255, 1)")
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  return Texture.from(canvas)
}

// The Draw Rangoli tool. Its bar has a slot for each colour of powder, an eraser and
// one to clear the floor; with a colour or the eraser picked, dragging on the porch's
// floor draws with it. The drawing stays on the floor, under anything placed on it
const createRangoli = (app: Application, background: Background) => {
  const container = new Container()
  const bar = createHud(app)
  container.addChild(bar.container)

  // The drawing covers the floor's bounds, clipped to the floor's shape
  const left = Math.min(...porchFloor.map(p => p.x))
  const top = Math.min(...porchFloor.map(p => p.y))
  const right = Math.max(...porchFloor.map(p => p.x))
  const bottom = Math.max(...porchFloor.map(p => p.y))
  const drawing = RenderTexture.create({width: (right - left) * resolution, height: (bottom - top) * resolution})
  const sprite = new Sprite(drawing)
  sprite.position.set(left, top)
  sprite.scale.set(1 / resolution)
  sprite.eventMode = "none"
  // On the floor, under every diya and firework placed on it
  sprite.zIndex = 1
  const mask = new Graphics().poly(porchFloor.flatMap(p => [p.x, p.y])).fill(0xffffff)
  sprite.mask = mask
  background.decorations.addChild(sprite, mask)

  const powderStamp = powderTexture(48)
  const eraserStamp = solidTexture(32)
  // Stamps are gathered here and drawn into the drawing in one go
  const stamps = new Container()
  let tool: Tool = "red"
  let last: PointData | undefined
  let drawingNow = false

  const tips = LL.tooltip.rangoli
  const colourNames: Record<Powder, () => string> = {
    red: tips.red, orange: tips.orange, yellow: tips.yellow, green: tips.green,
    blue: tips.blue, purple: tips.purple, pink: tips.pink, white: tips.white,
  }

  // A swatch of each colour, heaped like a little pile of powder
  const powderSlots = powderNames.map((powder, idx) => {
    const slot = bar.addSlot(idx)
    const swatch = new Sprite(powderStamp)
    swatch.anchor.set(0.5)
    swatch.tint = powders[powder]
    swatch.width = swatch.height = slotSize * 0.7
    const heap = new Graphics().circle(0, 0, slotSize * 0.2).fill(powders[powder])
    slot.container.addChild(swatch, heap)
    slot.container.on("pointerdown", () => select(powder))
    addTooltip(slot.container, () => ({title: colourNames[powder](), lines: [tips.hint()]}))
    return slot
  })

  const eraserSlot = bar.addSlot(powderNames.length)
  eraserSlot.container.addChild(new Graphics()
    .roundRect(-slotSize * 0.28, -slotSize * 0.16, slotSize * 0.56, slotSize * 0.32, 6)
    .fill(0xf2c4ce)
    .stroke({width: 2, color: 0xffffff})
    .rect(-slotSize * 0.28, -slotSize * 0.16, slotSize * 0.18, slotSize * 0.32)
    .fill(0x4a7fd4))
  eraserSlot.container.rotation = -0.5
  eraserSlot.container.on("pointerdown", () => select("eraser"))
  addTooltip(eraserSlot.container, () => ({title: tips.eraser(), lines: [tips.eraserHint()]}))

  const clearSlot = bar.addSlot(powderNames.length + 1)
  const clearLabel = new Text({text: tips.clear(), style: {fontFamily, fontSize: 22, fill: 0xffffff}})
  clearLabel.anchor.set(0.5)
  clearLabel.roundPixels = true
  clearSlot.container.addChild(clearLabel)
  clearSlot.container.on("pointerdown", () => {
    app.renderer.render({container: new Container(), target: drawing, clear: true})
  })
  addTooltip(clearSlot.container, () => ({title: tips.clear(), lines: [tips.clearHint()]}))

  // What's picked is outlined as well as its box highlighted
  const render = () => {
    const picked = tool === "eraser" ? eraserSlot : powderSlots[powderNames.indexOf(tool)]
    bar.drawBoxes(picked.box)
    ;[...powderSlots, eraserSlot].forEach(slot => setOutline(slot.container, "selected", slot === picked))
  }

  function select(next: Tool) {
    tool = next
    render()
  }

  // Lays stamps from the last point to this one, then draws them into the drawing
  const strokeTo = (at: PointData) => {
    const from = last ?? at
    const radius = tool === "eraser" ? eraserRadius : brushRadius
    const distance = Math.hypot(at.x - from.x, at.y - from.y)
    const count = Math.max(1, Math.ceil(distance / (radius * stampSpacing)))
    for (let k = last ? 1 : 0; k <= count; k++) {
      const t = k / count
      const stamp = new Sprite(tool === "eraser" ? eraserStamp : powderStamp)
      stamp.anchor.set(0.5)
      stamp.width = stamp.height = radius * 2 * resolution
      stamp.position.set((from.x + (at.x - from.x) * t - left) * resolution, (from.y + (at.y - from.y) * t - top) * resolution)
      stamp.rotation = Math.random() * Math.PI * 2
      if (tool === "eraser") {
        stamp.blendMode = "erase"
      } else {
        stamp.tint = powders[tool]
      }
      stamps.addChild(stamp)
    }
    app.renderer.render({container: stamps, target: drawing, clear: false})
    stamps.removeChildren().forEach(stamp => stamp.destroy())
    last = at
  }

  // A press on the porch's floor starts drawing there
  const pressHandler = (at: PointData) => {
    if (!background.isOnPorchFloor(at)) {
      return false
    }
    drawingNow = true
    last = undefined
    strokeTo(at)
    return true
  }

  const toStage = (e: PointerEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }
  const onPointerMove = (e: PointerEvent) => {
    if (drawingNow) {
      strokeTo(background.toScene(toStage(e)))
    }
  }
  const onPointerUp = () => {
    drawingNow = false
    last = undefined
  }
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  render()

  return {
    container,
    layout: bar.layout,
    pressHandler,
    // Shows its bar, while the Draw Rangoli tool is the one in use
    setHudShown(shown: boolean) {
      bar.setOpacity(shown ? 1 : 0)
      bar.setInteractive(shown)
    },
    destroy() {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      sprite.destroy()
      mask.destroy()
      drawing.destroy(true)
      powderStamp.destroy(true)
      eraserStamp.destroy(true)
      container.destroy({children: true})
    },
  }
}

export {createRangoli}
