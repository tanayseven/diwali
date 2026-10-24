import {Screen, createApp, loadFont} from "./app"
import {createFairyLights, fairyLightAssets, fairyLightsHeight} from "./fairyLights"
import {createLoader, loadAssets} from "./loader"
import {createMenu} from "./menu"
import {createPortraitWarning} from "./portraitWarning"
import {showSplashWarning} from "./splashWarning"

const main = async () => {
  const [app] = await Promise.all([createApp(), loadFont()])
  const portraitWarning = createPortraitWarning()
  // Whatever is on screen right now, laid out again whenever the window changes size
  let screens: Pick<Screen, "layout">[] = []

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => screens.forEach(screen => screen.layout()))
  })

  const loader = createLoader(app)
  app.stage.addChild(loader.container)
  screens = [loader]
  const failed = await loadAssets({
    textures: fairyLightAssets,
    images: ["sprites/diwali-diya-animated.svg", "sprites/caution-mark.svg", "sprites/caution-flasher.svg"],
  }, progress => loader.setProgress(progress))
  loader.destroy()
  screens = []
  await showSplashWarning()

  // These options don't open anything yet; only the menu exists so far
  const menu = createMenu(app, "Diwali this year", [
    {label: "Diyas", onSelect: () => {}},
    {label: "Fireworks", onSelect: () => {}},
    {label: "Craft Kandil", onSelect: () => {}},
    {label: "Decorate House", onSelect: () => {}},
    {label: "Draw Rangoli", onSelect: () => {}},
  ], () => fairyLightsHeight(app.screen.height))
  app.stage.addChild(menu.container)
  screens = [menu]
  // Without every frame the lights can't twinkle, so leave them out rather than break the menu
  if (fairyLightAssets.every(url => !failed.has(url))) {
    const fairyLights = createFairyLights(app)
    // Hung behind the menu so the bulbs' glow never covers the buttons
    app.stage.addChildAt(fairyLights.container, 0)
    screens.unshift(fairyLights)
  }

  window.addEventListener("keydown", e => {
    // Don't let the keyboard drive the menu while it's hidden behind the warning
    if (e.ctrlKey || e.metaKey || e.altKey || portraitWarning.isShown()) {
      return
    }
    menu.onKeyDown?.(e)
  })
}

main()
