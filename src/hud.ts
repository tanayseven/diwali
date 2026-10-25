import {Application, Assets, Container, Graphics, PointData, Rectangle, Sprite, Text, Texture} from "pixi.js"
import {fontFamily} from "./app"

const slotCount = 10
// Big enough to be comfortable touch targets
const slotSize = 76
const slotGap = 12
const panelPadding = 12
const bottomMargin = 20
const sideGutter = 16
const highlight = 0xffd700
// Share of a slot an item's icon fills
const iconFill = 0.8
// The count badge in the slot's top-right corner
const badgeRadius = 13
const badgeInset = 6

type Item = {
  url: string
  // Where the drawing sits in its SVG's canvas, so it can be cropped to fill a slot
  crop: Rectangle
  // How many there are, shown on a badge; tools like the oil bottle have no count
  count?: number
  // Turns the icon, so long thin things lie across the slot's diagonal
  rotation?: number
}

// A drawing cropped out of its loaded SVG's canvas
const cropped = (url: string, crop: Rectangle) =>
  new Texture({source: Assets.get<Texture>(url).source, frame: crop})

const panelWidth = slotCount * slotSize + (slotCount - 1) * slotGap + panelPadding * 2
const panelHeight = slotSize + panelPadding * 2

// A bar of empty inventory slots along the bottom of the screen, shrunk to fit narrow
// screens. Whatever fills the slots is added to the container at the boxes' positions
const createHud = (app: Application) => {
  const container = new Container()
  const panel = new Graphics()
  container.addChild(panel)

  const boxes = Array.from({length: slotCount}, (_, idx) => {
    const box = new Graphics()
    box.position.set(
      panelPadding + slotSize / 2 + idx * (slotSize + slotGap) - panelWidth / 2,
      panelPadding + slotSize / 2 - panelHeight / 2,
    )
    container.addChild(box)
    return box
  })

  // Draws every slot, outlining the highlighted one, if any
  const drawBoxes = (highlighted?: Graphics) => boxes.forEach(box => box.clear()
    .roundRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 12)
    .fill(0x1a1a1a)
    .stroke({width: 3, color: box === highlighted ? highlight : 0x555555}))

  // Whether a point on screen is over the bar
  const isOver = (point: PointData) => {
    const local = container.toLocal(point)
    return Math.abs(local.x) <= panelWidth / 2 && Math.abs(local.y) <= panelHeight / 2
  }

  const layout = () => {
    const scale = Math.min(1, (app.screen.width - sideGutter * 2) / panelWidth)
    container.scale.set(scale)
    container.position.set(app.screen.width / 2, app.screen.height - bottomMargin - panelHeight * scale / 2)
    panel.clear()
      .roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 18)
      .fill({color: 0x000000, alpha: 0.55})
      .stroke({width: 2, color: 0x555555})
  }

  // Puts an item in a slot: its drawing fitted inside, with a badge for its count if
  // it's counted. The slot can be pressed to take one; show updates it after a change
  const addItem = (idx: number, item: Item) => {
    const slot = new Container()
    slot.position.copyFrom(boxes[idx].position)
    slot.eventMode = "static"
    slot.hitArea = new Rectangle(-slotSize / 2, -slotSize / 2, slotSize, slotSize)
    const icon = new Sprite(cropped(item.url, item.crop))
    icon.anchor.set(0.5)
    icon.rotation = item.rotation ?? 0
    // Turned onto the diagonal, a long thin icon has room to be longer
    const room = item.rotation ? Math.SQRT2 : 1
    icon.scale.set(slotSize * iconFill * room / Math.max(icon.texture.width, icon.texture.height))
    slot.addChild(icon)
    let label: Text | undefined
    if (item.count !== undefined) {
      const badge = new Container()
      badge.position.set(slotSize / 2 - badgeInset, -slotSize / 2 + badgeInset)
      const circle = new Graphics()
        .circle(0, 0, badgeRadius)
        .fill(highlight)
        .stroke({width: 2, color: 0x000000})
      label = new Text({text: "", style: {fontFamily, fontSize: 20, fill: 0x000000}})
      label.anchor.set(0.5)
      label.roundPixels = true
      badge.addChild(circle, label)
      slot.addChild(badge)
    }
    container.addChild(slot)
    return {
      container: slot,
      box: boxes[idx],
      // An empty stack, or a tool while it's in use, stays visible but faded
      show(inUse = false) {
        const available = !inUse && item.count !== 0
        icon.alpha = available ? 1 : 0.35
        slot.cursor = available ? "grab" : "default"
        if (label) {
          label.text = String(item.count)
        }
      },
    }
  }

  layout()
  drawBoxes()

  return {
    container,
    addItem,
    drawBoxes,
    isOver,
    layout,
    setOpacity(alpha: number) {
      container.alpha = alpha
      container.visible = alpha > 0
    },
    setInteractive(interactive: boolean) {
      container.eventMode = interactive ? "passive" : "none"
    },
  }
}

export {createHud, cropped, highlight}
export type {Item}
