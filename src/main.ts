import {createApp} from "./app"
import {createMenu} from "./menu"

const main = async () => {
  const app = await createApp()

  // These options don't open anything yet; only the menu exists so far
  const menu = createMenu(app, "Diwali this year", [
    {label: "Diyas", onSelect: () => {}},
    {label: "Fireworks", onSelect: () => {}},
    {label: "Craft Kandil", onSelect: () => {}},
    {label: "Decorate House", onSelect: () => {}},
  ])
  app.stage.addChild(menu.container)

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => menu.layout())
  })

  window.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return
    }
    menu.onKeyDown?.(e)
  })
}

main()
