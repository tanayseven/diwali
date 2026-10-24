import {createApp} from "./app"
import {createMenu} from "./menu"
import {createPortraitWarning} from "./portraitWarning"

const main = async () => {
  const app = await createApp()

  // These options don't open anything yet; only the menu exists so far
  const menu = createMenu(app, "Diwali this year", [
    {label: "Diyas", onSelect: () => {}},
    {label: "Fireworks", onSelect: () => {}},
    {label: "Craft Kandil", onSelect: () => {}},
    {label: "Decorate House", onSelect: () => {}},
    {label: "Draw Rangoli", onSelect: () => {}},
  ])
  app.stage.addChild(menu.container)
  const portraitWarning = createPortraitWarning()

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => menu.layout())
  })

  window.addEventListener("keydown", e => {
    // Don't let the keyboard drive the menu while it's hidden behind the warning
    if (e.ctrlKey || e.metaKey || e.altKey || portraitWarning.isShown()) {
      return
    }
    menu.onKeyDown?.(e)
  })
}

main()
