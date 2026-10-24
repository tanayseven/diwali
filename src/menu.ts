import {Application, Container, Graphics, Text} from "pixi.js"
import {Screen} from "./app"

type MenuOption = {
  label: string
  onSelect: () => void
}

// Buttons are at least 64px tall so they're comfortable touch targets
const buttonHeight = 64
const buttonGap = 16
const maxButtonWidth = 420
const sideGutter = 24
const highlight = 0xffd700

type Button = {
  container: Container
  background: Graphics
  label: Text
}

const createMenu = (app: Application, title: string, options: MenuOption[]): Screen => {
  const container = new Container()
  const heading = new Text({
    text: title,
    style: {fontFamily: "monospace", fontSize: 48, fill: highlight},
  })
  heading.anchor.set(0.5)
  container.addChild(heading)

  let selected = 0
  let pressed = -1
  let buttonWidth = maxButtonWidth

  const choose = (idx: number) => {
    // Defer so the menu isn't destroyed mid pointer-event dispatch
    requestAnimationFrame(() => options[idx].onSelect())
  }

  const buttons: Button[] = options.map((option, idx) => {
    const button = new Container()
    const background = new Graphics()
    const label = new Text({
      text: option.label,
      style: {fontFamily: "monospace", fontSize: 26},
    })
    label.anchor.set(0.5)
    button.addChild(background, label)
    button.eventMode = "static"
    button.cursor = "pointer"
    button.on("pointerover", () => select(idx))
    button.on("pointerdown", () => {
      pressed = idx
      select(idx)
    })
    button.on("pointerup", () => release())
    button.on("pointerupoutside", () => release())
    button.on("pointertap", () => choose(idx))
    container.addChild(button)
    return {container: button, background, label}
  })

  const render = () => {
    buttons.forEach(({container: button, background, label}, idx) => {
      const active = idx === selected
      background.clear()
        .roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16)
        .fill(active ? highlight : 0x1a1a1a)
        .stroke({width: 3, color: active ? highlight : 0x555555})
      label.style.fill = active ? 0x000000 : 0xffffff
      button.scale.set(idx === pressed ? 0.96 : 1)
    })
  }

  const select = (idx: number) => {
    selected = (idx + buttons.length) % buttons.length
    render()
  }

  const release = () => {
    pressed = -1
    render()
  }

  const layout = () => {
    const centerX = app.screen.width / 2
    buttonWidth = Math.min(maxButtonWidth, app.screen.width - sideGutter * 2)
    const stackHeight = buttons.length * buttonHeight + (buttons.length - 1) * buttonGap
    const top = app.screen.height / 2 - stackHeight / 2 + buttonHeight / 2
    heading.style.fontSize = Math.min(48, app.screen.width / 10)
    heading.position.set(centerX, top - buttonHeight / 2 - heading.height)
    buttons.forEach(({container: button, label}, idx) => {
      label.style.fontSize = Math.min(26, buttonWidth / 13)
      button.position.set(centerX, top + idx * (buttonHeight + buttonGap))
    })
    render()
  }

  layout()

  return {
    container,
    layout,
    destroy: () => container.destroy({children: true}),
    onKeyDown(e) {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        select(selected - 1)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        select(selected + 1)
      } else if (e.key === "Enter") {
        choose(selected)
      }
    },
  }
}

export {createMenu}
export type {MenuOption}
