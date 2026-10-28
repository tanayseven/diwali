import {Container, FederatedPointerEvent, PointData} from "pixi.js"
import {createApp, loadFont} from "./app"
import {createAudioControl} from "./audioControl"
import {addBackgroundAssets, backgroundAssets, createBackground} from "./background"
import {createDiyaInventory, diyaAssets} from "./diyaInventory"
import {createHouseLights, fairyLightAssets} from "./fairyLights"
import {createFireworks, fireworksAssets} from "./fireworks"
import {createFooter} from "./footer"
import {createHud} from "./hud"
import {createHudToggle} from "./hudToggle"
import {createLighting} from "./lighting"
import {createLoader, loadAssets} from "./loader"
import {LL, loadLocale} from "./locale"
import {createPortraitWarning} from "./portraitWarning"
import {createRangoli} from "./rangoli"
import {RailItem, createSideRail} from "./sideRail"
import {createSkyline} from "./skyline"
import {showSplashWarning} from "./splashWarning"
import {createZoomControls} from "./zoomControls"

type Tool = "diyas" | "fireworks" | "kandil" | "decorate" | "rangoli"

// The side rail's tools, in order, each with its icon
const tools: RailItem<Tool>[] = [
  {name: "diyas", icon: "sprites/icons/diya.svg", label: () => LL.tools.diyas()},
  {name: "fireworks", icon: "sprites/icons/firecracker.svg", label: () => LL.tools.fireworks()},
  {name: "kandil", icon: "sprites/icons/kandil.svg", label: () => LL.tools.kandil()},
  {name: "decorate", icon: "sprites/icons/fairy-lights.svg", label: () => LL.tools.decorate()},
  {name: "rangoli", icon: "sprites/icons/rangoli.svg", label: () => LL.tools.rangoli()},
]

type Layout = {layout: () => void}

// What each tool brings: its bar (and whatever it drags from it), shown while the tool
// is the one picked, and optionally a claim on presses on the scenery, e.g. to draw
type ToolControls = Layout & {
  container: Container
  setHudShown: (shown: boolean) => void
  pressHandler?: (at: PointData, e: FederatedPointerEvent) => boolean
}

const main = async () => {
  const [app] = await Promise.all([createApp(), loadFont(), loadLocale()])
  const portraitWarning = createPortraitWarning()
  // Available on every screen, from the loader on
  const audio = createAudioControl()
  // Whatever is on screen right now, laid out again whenever the window changes size
  let screens: Layout[] = []

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => screens.forEach(screen => screen.layout()))
  })

  const loader = createLoader(app)
  app.stage.addChild(loader.container)
  screens = [loader]
  addBackgroundAssets()
  const failed = await loadAssets({
    textures: [...backgroundAssets, ...fairyLightAssets, ...diyaAssets, ...fireworksAssets, ...tools.map(tool => tool.icon)],
    images: ["sprites/diwali-diya-animated.svg", "sprites/caution-mark.svg", "sprites/caution-flasher.svg"],
    // Enough of the first track to start the music without a wait
    others: [{url: audio.firstTrack, load: audio.ready}],
  }, progress => loader.setProgress(progress))
  loader.destroy()
  screens = []
  await showSplashWarning()
  createFooter()

  // Without the background there's nowhere to put anything, so nothing more to show
  if (backgroundAssets.some(url => failed.has(url))) {
    return
  }
  const loaded = (urls: string[]) => urls.every(url => !failed.has(url))
  const background = createBackground(app)
  app.stage.addChild(background.container)
  screens.push(background)
  // It's Diwali night: the porch is dark, lit only by what's lit on it
  const lighting = createLighting(app, background)
  lighting.setNight(1)
  // Lights in the city's windows, glowing through the night and now and then switched
  createSkyline(app, background, lighting).catch(error => console.error("Couldn't light the skyline", error))

  // Each tool has a bar of things to use, shown while it's the one picked. What's
  // placed in the scene stays there, and can be picked up again, whichever tool is picked
  const controls: Partial<Record<Tool, ToolControls>> = {}
  if (loaded(diyaAssets)) {
    const diyas = createDiyaInventory(app, background, lighting, audio)
    diyas.setInteractive(true)
    controls.diyas = diyas
  }
  if (loaded(fireworksAssets)) {
    const fireworks = createFireworks(app, background, lighting, audio)
    fireworks.setInteractive(true)
    controls.fireworks = fireworks
  }
  // Nothing to craft a kandil with yet, so its bar is empty
  const kandilHud = createHud(app)
  controls.kandil = {
    container: kandilHud.container,
    layout: kandilHud.layout,
    setHudShown(shown) {
      kandilHud.setOpacity(shown ? 1 : 0)
      kandilHud.setInteractive(shown)
    },
  }
  if (loaded(fairyLightAssets)) {
    controls.decorate = createHouseLights(app, background, lighting)
  }
  controls.rangoli = createRangoli(app, background)

  const available = tools.filter(tool => controls[tool.name] && loaded([tool.icon]))
  let selected = available[0].name
  // Only the picked tool's bar shows, unless the bars have been hidden with the eye
  const showBars = () => Object.entries(controls).forEach(([name, control]) =>
    control.setHudShown(name === selected && hudToggle.isShown()))
  const select = (tool: Tool) => {
    selected = tool
    showBars()
    // The tool still draws or hangs things with whatever was last picked from its bar
    background.setPressHandler(controls[tool]?.pressHandler)
  }
  const zoomControls = createZoomControls(app, background)
  const rail = createSideRail(app, available, select)
  const hudToggle = createHudToggle(app, showBars)
  app.stage.addChild(zoomControls.container, rail.container, hudToggle.container)
  screens.push(zoomControls, rail, hudToggle)
  // Above the rail and zoom buttons, so whatever's dragged from a bar is never hidden
  Object.values(controls).forEach(control => {
    app.stage.addChild(control.container)
    screens.push(control)
  })
  select(selected)

  window.addEventListener("keydown", e => {
    // Don't let the keyboard drive anything while it's hidden behind the warning
    if (e.ctrlKey || e.metaKey || e.altKey || portraitWarning.isShown()) {
      return
    }
    if (e.key === "+" || e.key === "=") {
      background.zoomBy(background.zoomStep)
    } else if (e.key === "-" || e.key === "_") {
      background.zoomBy(1 / background.zoomStep)
    } else if (e.key === "h" || e.key === "H") {
      hudToggle.toggle()
    } else if (/^[1-9]$/.test(e.key) && available[Number(e.key) - 1]) {
      // Number keys pick tools in the rail's order
      rail.select(available[Number(e.key) - 1].name)
    }
  })
}

main()
