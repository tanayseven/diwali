import {createApp} from "./app"
import {createFairyLights, fairyLightsHeight} from "./fairyLights"
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
  ], () => fairyLightsHeight(app.screen.height))
  app.stage.addChild(menu.container)
  // The bulbs load in the background so the menu never waits on them
  let fairyLights: Awaited<ReturnType<typeof createFairyLights>> | undefined
  createFairyLights(app)
    .then(lights => {
      fairyLights = lights
      // Hung behind the menu so the bulbs' glow never covers the buttons
      app.stage.addChildAt(lights.container, 0)
    })
    .catch(err => console.error("Couldn't load the fairy lights", err))
  const portraitWarning = createPortraitWarning()

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => {
      fairyLights?.layout()
      menu.layout()
    })
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
