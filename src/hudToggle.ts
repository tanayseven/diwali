import {Application, Container, Graphics} from "pixi.js"
import {hudFrame} from "./hud"
import {LL} from "./locale"
import {addTooltip} from "./tooltip"

// Matches the zoom buttons
const buttonRadius = 26
const gap = 14
const highlight = 0xffd700

// An eye: open while the bar shows, crossed out while it's hidden
const drawEye = (eye: Graphics, open: boolean) => {
  eye.clear()
    .moveTo(-13, 0)
    .quadraticCurveTo(0, -11, 13, 0)
    .quadraticCurveTo(0, 11, -13, 0)
    .stroke({width: 2.5, color: highlight})
    .circle(0, 0, 4)
    .fill(highlight)
  if (!open) {
    eye.moveTo(-12, 10).lineTo(12, -10).stroke({width: 3, color: highlight})
  }
}

// A round button just right of the bar along the bottom, which shows and hides it to
// see more of the scene. It stays where it is either way, so it can bring the bar back
const createHudToggle = (app: Application, onChange: (shown: boolean) => void) => {
  const container = new Container()
  const circle = new Graphics()
  const eye = new Graphics()
  container.addChild(circle, eye)
  container.eventMode = "static"
  container.cursor = "pointer"
  let shown = true
  let hovered = false

  const render = () => {
    circle.clear()
      .circle(0, 0, buttonRadius)
      .fill(0x1a1a1a)
      .stroke({width: 3, color: hovered ? highlight : 0x555555})
    drawEye(eye, shown)
  }

  const setShown = (value: boolean) => {
    shown = value
    render()
    onChange(shown)
  }

  container.on("pointerover", () => {
    hovered = true
    render()
  })
  container.on("pointerout", () => {
    hovered = false
    render()
  })
  container.on("pointertap", () => setShown(!shown))
  addTooltip(container, () => ({title: shown ? LL.hud.hide() : LL.hud.show()}))

  const layout = () => {
    const frame = hudFrame(app.screen)
    container.position.set(frame.x + frame.width / 2 + gap + buttonRadius, frame.y)
  }

  render()
  layout()

  return {
    container,
    layout,
    toggle: () => setShown(!shown),
    isShown: () => shown,
  }
}

export {createHudToggle}
