import {Application, Container, Graphics, PointData} from "pixi.js"

const slotCount = 10
// Big enough to be comfortable touch targets
const slotSize = 76
const slotGap = 12
const panelPadding = 12
const bottomMargin = 20
const sideGutter = 16
const highlight = 0xffd700

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

  layout()
  drawBoxes()

  return {
    container,
    boxes,
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

export {createHud, highlight, slotSize}
