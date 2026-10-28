import {Application, Assets, Container, Graphics, Sprite, Texture} from "pixi.js"
import {addTooltip} from "./tooltip"

type RailItem<Name extends string> = {
  name: Name
  icon: string
  label: () => string
}

// Big enough to be comfortable touch targets
const buttonRadius = 32
const buttonGap = 14
const sideMargin = 24
const highlight = 0xffd700
// Share of a button an icon fills
const iconFill = 0.62
// The bar is centred and always leaves room either side of it, and the speaker button
// is on the right, so the rail runs from near the top down to the footer
const clearTop = 16
const clearBottom = 52

// A column of round buttons down the left of the screen, one per tool, each with an
// icon. Pressing one picks that tool and highlights it. It shrinks to fit short screens.
// Expects every item's icon to have been loaded already
const createSideRail = <Name extends string>(app: Application, items: RailItem<Name>[], onSelect: (name: Name) => void) => {
  const container = new Container()
  let selected = items[0].name

  const buttons = items.map((item, idx) => {
    const button = new Container()
    const background = new Graphics()
    const icon = new Sprite(Assets.get<Texture>(item.icon))
    icon.anchor.set(0.5)
    icon.scale.set(buttonRadius * 2 * iconFill / Math.max(icon.texture.width, icon.texture.height))
    button.addChild(background, icon)
    button.y = idx * (buttonRadius * 2 + buttonGap)
    button.eventMode = "static"
    button.cursor = "pointer"
    let hovered = false
    button.on("pointerover", () => {
      hovered = true
      render()
    })
    button.on("pointerout", () => {
      hovered = false
      render()
    })
    button.on("pointertap", () => select(item.name))
    addTooltip(button, () => ({title: item.label()}), {outline: false})
    container.addChild(button)
    const render = () => {
      const active = item.name === selected
      background.clear()
        .circle(0, 0, buttonRadius)
        .fill(active ? 0x3a2f0a : 0x1a1a1a)
        .stroke({width: 3, color: active || hovered ? highlight : 0x555555})
      button.scale.set(active ? 1.08 : 1)
    }
    return {render}
  })

  const renderAll = () => buttons.forEach(button => button.render())

  const select = (name: Name) => {
    if (name === selected) {
      return
    }
    selected = name
    renderAll()
    onSelect(name)
  }

  const layout = () => {
    const height = items.length * buttonRadius * 2 + (items.length - 1) * buttonGap
    const room = app.screen.height - clearTop - clearBottom
    const scale = Math.min(1, room / height)
    container.scale.set(scale)
    container.position.set(
      sideMargin + buttonRadius * scale,
      clearTop + (room - height * scale) / 2 + buttonRadius * scale,
    )
  }

  renderAll()
  layout()

  return {container, layout, select}
}

export {createSideRail}
export type {RailItem}
