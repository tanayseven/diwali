import {Application, Container, Graphics} from "pixi.js"
import type {Background} from "./background"
import {hudFrame} from "./hud"
import {LL} from "./locale"
import {addTooltip} from "./tooltip"

// Matches the side rail's buttons
const buttonRadius = 26
const buttonGap = 12
const sideMargin = 24
const highlight = 0xffd700
// Clear of the speaker button above, and of the bar's eye button below
const clearTop = 96
const eyeRadius = 26
const clearGap = 12
// The least they're shrunk to, however short the screen
const leastScale = 0.5

// Zoom in and zoom out buttons stacked down the right of the screen, with any other
// buttons given stacked below them, set a little apart, all shrunk to fit between the
// speaker button and the eye button. A zoom button fades when the camera can't zoom
// any further that way
const createZoomControls = (app: Application, background: Background, below: Container[] = []) => {
  const container = new Container()

  const makeButton = (sign: 1 | -1, label: () => string) => {
    const button = new Container()
    const circle = new Graphics()
    const symbol = new Graphics()
      .rect(-10, -1.5, 20, 3)
      .fill(highlight)
    if (sign > 0) {
      symbol.rect(-1.5, -10, 3, 20).fill(highlight)
    }
    button.addChild(circle, symbol)
    button.eventMode = "static"
    button.cursor = "pointer"
    let hovered = false
    button.on("pointerover", () => hovered = true)
    button.on("pointerout", () => hovered = false)
    button.on("pointertap", () => background.zoomBy(sign > 0 ? background.zoomStep : 1 / background.zoomStep))
    addTooltip(button, () => ({title: label()}), {outline: false})
    container.addChild(button)
    const canZoom = sign > 0 ? background.canZoomIn : background.canZoomOut
    let shown: string | undefined
    const render = () => {
      const enabled = canZoom()
      const state = `${enabled}${hovered}`
      // Only redrawn when something about it changes, as it's checked every frame
      if (state === shown) {
        return
      }
      shown = state
      circle.clear()
        .circle(0, 0, buttonRadius)
        .fill(0x1a1a1a)
        .stroke({width: 3, color: enabled && hovered ? highlight : 0x555555})
      button.alpha = enabled ? 1 : 0.4
      button.cursor = enabled ? "pointer" : "default"
    }
    return {container: button, render}
  }

  const zoomIn = makeButton(1, LL.zoom.in)
  const zoomOut = makeButton(-1, LL.zoom.out)
  zoomOut.container.y = buttonRadius * 2 + buttonGap
  below.forEach((button, idx) => {
    button.y = (buttonRadius * 2 + buttonGap) * (idx + 2) + buttonGap
    container.addChild(button)
  })

  // The camera zooms in other ways too, like pinching, so keep the buttons up to date
  const tick = () => {
    zoomIn.render()
    zoomOut.render()
  }
  app.ticker.add(tick)

  const layout = () => {
    const buttons = 2 + below.length
    const height = buttonRadius * 2 * buttons + buttonGap * (buttons - 1) + (below.length > 0 ? buttonGap : 0)
    const bottom = hudFrame(app.screen).y - eyeRadius - clearGap
    const room = bottom - clearTop
    // Shrunk to fit on short screens, like the side rail, so the last of them, the
    // camera, doesn't cover the eye button. Never below half size, still big enough to
    // press: a window too short even for that, which landscape ones can be, has them
    // over the eye button rather than gone, or turned upside down by a scale of none
    const scale = Math.max(leastScale, Math.min(1, room / height))
    container.scale.set(scale)
    container.position.set(
      app.screen.width - sideMargin - buttonRadius,
      clearTop + Math.max(0, (room - height * scale) / 2) + buttonRadius * scale,
    )
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

export {buttonRadius, createZoomControls}
