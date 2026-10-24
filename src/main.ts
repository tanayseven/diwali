import {Screen, createApp, loadFont} from "./app"
import {createAudioControl} from "./audioControl"
import {addBackgroundAssets, backgroundAssets, createBackground} from "./background"
import {createBackButton} from "./backButton"
import {createDiyaInventory, diyaAssets} from "./diyaInventory"
import {createFairyLights, fairyLightAssets, fairyLightsHeight} from "./fairyLights"
import {createFooter} from "./footer"
import {createLoader, loadAssets} from "./loader"
import {createMenu} from "./menu"
import {createPortraitWarning} from "./portraitWarning"
import {showSplashWarning} from "./splashWarning"

// How long the camera takes to move between the menu and a scene
const transitionDuration = 1400

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const easeInOut = (t: number) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2

const main = async () => {
  const [app] = await Promise.all([createApp(), loadFont()])
  const portraitWarning = createPortraitWarning()
  // Available on every screen, from the loader on
  const audio = createAudioControl()
  // Whatever is on screen right now, laid out again whenever the window changes size
  let screens: Pick<Screen, "layout">[] = []

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => screens.forEach(screen => screen.layout()))
  })

  const loader = createLoader(app)
  app.stage.addChild(loader.container)
  screens = [loader]
  addBackgroundAssets()
  const failed = await loadAssets({
    textures: [...backgroundAssets, ...fairyLightAssets, ...diyaAssets],
    images: ["sprites/diwali-diya-animated.svg", "sprites/caution-mark.svg", "sprites/caution-flasher.svg"],
    // Enough of the first track to start the music without a wait
    others: [{url: audio.firstTrack, load: audio.ready}],
  }, progress => loader.setProgress(progress))
  loader.destroy()
  screens = []
  await showSplashWarning()

  // Only "Diyas" opens anything so far: it zooms the camera onto the house's porch
  const menu = createMenu(app, "Diwali this year", [
    {label: "Diyas", onSelect: () => goTo(1)},
    {label: "Fireworks", onSelect: () => {}},
    {label: "Craft Kandil", onSelect: () => {}},
    {label: "Decorate House", onSelect: () => {}},
    {label: "Draw Rangoli", onSelect: () => {}},
  ], () => fairyLightsHeight(app.screen.height))
  const footer = createFooter()
  const backButton = createBackButton(app, () => goTo(0))
  app.stage.addChild(menu.container, backButton.container)
  screens = [menu, backButton]
  // Without every frame the lights can't twinkle, so leave them out rather than break the menu
  let fairyLights: ReturnType<typeof createFairyLights> | undefined
  if (fairyLightAssets.every(url => !failed.has(url))) {
    fairyLights = createFairyLights(app)
    // Hung behind the menu so the bulbs' glow never covers the buttons
    app.stage.addChildAt(fairyLights.container, 0)
    screens.unshift(fairyLights)
  }
  // Below the lights and the menu, so its dimming layer only darkens the scene
  let background: ReturnType<typeof createBackground> | undefined
  if (backgroundAssets.every(url => !failed.has(url))) {
    background = createBackground(app)
    app.stage.addChildAt(background.container, 0)
    screens.unshift(background)
  }
  // Diyas are placed in the scene, so they need the background to go anywhere
  let inventory: ReturnType<typeof createDiyaInventory> | undefined
  if (background && diyaAssets.every(url => !failed.has(url))) {
    inventory = createDiyaInventory(app, background)
    // On top of everything, so a dragged diya is never hidden
    app.stage.addChild(inventory.container)
    screens.push(inventory)
  }

  // Everything about moving between the menu (0) and the diyas scene (1) follows one
  // progress value, so going back mid-way simply reverses from wherever it got to
  let progress = 0
  let target = 0
  const apply = () => {
    background?.setFocus(easeInOut(progress))
    // The menu and lights fade out over the first part, the back button fades in at the end
    const menuAlpha = 1 - clamp(progress / 0.3)
    menu.setOpacity(menuAlpha)
    footer.setOpacity(menuAlpha)
    if (fairyLights) {
      fairyLights.container.alpha = menuAlpha
      fairyLights.container.visible = menuAlpha > 0
    }
    // The scene's controls fade in at the end
    const controlsAlpha = clamp((progress - 0.7) / 0.3)
    backButton.setOpacity(controlsAlpha)
    inventory?.setOpacity(controlsAlpha)
  }
  const goTo = (value: number) => {
    target = value
    menu.setInteractive(target === 0)
    footer.setInteractive(target === 0)
    backButton.setInteractive(target === 1)
    inventory?.setInteractive(target === 1)
    background?.setPannable(target === 1)
  }
  app.ticker.add(() => {
    if (progress === target) {
      return
    }
    const step = app.ticker.deltaMS / transitionDuration
    progress = target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step)
    apply()
  })
  goTo(0)
  apply()

  window.addEventListener("keydown", e => {
    // Don't let the keyboard drive anything while it's hidden behind the warning
    if (e.ctrlKey || e.metaKey || e.altKey || portraitWarning.isShown()) {
      return
    }
    if (target === 0) {
      menu.onKeyDown?.(e)
    } else if (e.key === "Escape" || e.key === "Backspace") {
      e.preventDefault()
      goTo(0)
    }
  })
}

main()
