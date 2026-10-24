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
// The SVG's own viewBox ratio (width / height)
const diyaAspect = 460 / 380
// The lamp's bowl ends this far down the SVG, below that is only its shadow
const diyaBaseline = 345 / 380
// Share of the SVG's width that's empty space either side of the lamp
const diyaSidePadding = 0.1
const diyaGap = 12

// The diya SVG animates with SMIL, which stops once Pixi rasterises it,
// so it sits over the canvas as an <img> instead
const createTitleDiya = () => {
  const img = document.createElement("img")
  img.src = "sprites/diwali-diya-animated.svg"
  img.alt = ""
  img.style.position = "absolute"
  img.style.pointerEvents = "none"
  document.body.appendChild(img)
  return img
}

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
  const titleDiyas = [createTitleDiya(), createTitleDiya()]

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
    // Leave room for a diya on each side of the title on narrow screens
    heading.style.fontSize = Math.min(48, app.screen.width / 18)
    heading.position.set(centerX, top - buttonHeight / 2 - heading.height)
    const diyaHeight = heading.height * 1.8
    const diyaWidth = diyaHeight * diyaAspect
    // Sit each diya's bowl on the title's baseline
    const diyaTop = heading.y + heading.height / 2 - diyaHeight * diyaBaseline
    titleDiyas.forEach((img, idx) => {
      const side = idx === 0 ? -1 : 1
      const offset = heading.width / 2 + diyaGap + diyaWidth / 2 - diyaWidth * diyaSidePadding
      img.style.width = `${diyaWidth}px`
      img.style.height = `${diyaHeight}px`
      img.style.left = `${centerX + side * offset - diyaWidth / 2}px`
      img.style.top = `${diyaTop}px`
      // Mirror the right diya so both spouts and flames point in at the title
      img.style.transform = side > 0 ? "scaleX(-1)" : ""
    })
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
    destroy() {
      titleDiyas.forEach(img => img.remove())
      container.destroy({children: true})
    },
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
