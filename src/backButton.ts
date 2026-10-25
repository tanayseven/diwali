import {Application, Container, Graphics, Text} from "pixi.js"
import {fontFamily} from "./app"
import {LL} from "./locale"

// Matches the menu's buttons, and is tall enough to be a comfortable touch target
const highlight = 0xffd700
const buttonWidth = 132
const buttonHeight = 56
const margin = 24

// A "Back" button in the top-left corner of a scene
const createBackButton = (app: Application, onBack: () => void) => {
  const container = new Container()
  const background = new Graphics()
  const label = new Text({
    text: LL.back(),
    style: {fontFamily, fontSize: 30},
  })
  label.anchor.set(0.5)
  label.roundPixels = true
  container.addChild(background, label)
  container.cursor = "pointer"
  let hovered = false
  let pressed = false

  const render = () => {
    const active = hovered || pressed
    background.clear()
      .roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16)
      .fill(active ? highlight : 0x1a1a1a)
      .stroke({width: 3, color: active ? highlight : 0x555555})
    label.style.fill = active ? 0x000000 : 0xffffff
    container.scale.set(pressed ? 0.96 : 1)
  }

  container.on("pointerover", () => {
    hovered = true
    render()
  })
  container.on("pointerout", () => {
    hovered = false
    render()
  })
  container.on("pointerdown", () => {
    pressed = true
    render()
  })
  const release = () => {
    pressed = false
    render()
  }
  container.on("pointerup", release)
  container.on("pointerupoutside", release)
  container.on("pointertap", () => onBack())

  const layout = () => {
    container.position.set(margin + buttonWidth / 2, margin + buttonHeight / 2)
  }

  layout()
  render()

  return {
    container,
    layout,
    setOpacity(alpha: number) {
      container.alpha = alpha
      container.visible = alpha > 0
    },
    setInteractive(interactive: boolean) {
      container.eventMode = interactive ? "static" : "none"
      if (!interactive) {
        hovered = false
        pressed = false
        render()
      }
    },
    destroy() {
      container.destroy({children: true})
    },
  }
}

export {createBackButton}
