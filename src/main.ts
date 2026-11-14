import {Container, FederatedPointerEvent, PointData} from "pixi.js"
import {createApp, loadFont} from "./app"
import {createAudioControl} from "./audioControl"
import {addBackgroundAssets, backgroundAssets, createBackground} from "./background"
import {createDiyaInventory, diyaAssets, diyaImages} from "./diyaInventory"
import {createHouseLights, fairyLightAssets} from "./fairyLights"
import {createFireworks, fireworksAssets} from "./fireworks"
import {createFooter} from "./footer"
import {startHints} from "./hints"
import {createHudToggle} from "./hudToggle"
import {createKandils, kandilAssets} from "./kandil"
import {createLighting} from "./lighting"
import {createLoader, loadAssets} from "./loader"
import type {Lightable} from "./matchstick"
import {isLanguagePickerOpen, showLanguagePicker} from "./languagePicker"
import {createLanguageButton} from "./languageButton"
import {LL, loadLocale, preferredLocale, savedLocale} from "./locale"
import {createPortraitWarning} from "./portraitWarning"
import {createRangoli} from "./rangoli"
import {createScreenshotButton} from "./screenshot"
import {RailItem, createSideRail} from "./sideRail"
import {createSkyFireworks} from "./skyFireworks"
import {createSkyline} from "./skyline"
import {handAssets} from "./touchMarker"
import {createWind} from "./wind"
import {createWindBlown} from "./windBlown"
import {showSoundSplash, showSplashWarning} from "./splashWarning"
import {addTooltip, showTooltipOf} from "./tooltip"
import {buttonRadius, createZoomControls} from "./zoomControls"

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
  // What to take first from its bar, to show someone new to it
  firstSlot?: () => Container | undefined
}

// The tools whose first step has been shown, kept on the device so each is only shown
// once
const introducedKey = "diwali-introduced-tools"
const introduced = (() => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(introducedKey) ?? "[]"))
  } catch {
    return new Set<string>()
  }
})()
// How often, and for how long, to try showing a tool's first step, until its bar's slid
// in and can be used
const introduceEvery = 250
const introduceFor = 5000
// How long the name of a tool picked from the rail shows beside it
const toolNameShown = 1500

const main = async () => {
  const app = await createApp()
  // Everything after shows text, so the language comes first
  // Picked only on the first visit; after that, the one picked is used straight away,
  // and the globe button opens the picker again
  const locale = savedLocale() ?? await showLanguagePicker(preferredLocale())
  await loadLocale(locale)
  // Only now is it known which script the text is in, so which font it needs
  await loadFont(LL.title())
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
    textures: [
      ...backgroundAssets, ...fairyLightAssets, ...diyaAssets, ...fireworksAssets, ...kandilAssets,
      ...handAssets, ...tools.map(tool => tool.icon),
    ],
    images: [...diyaImages, "sprites/caution-mark.svg", "sprites/caution-flasher.svg", "sprites/headphones.svg"],
    // Enough of the first track to start the music without a wait
    others: [{url: audio.firstTrack, load: audio.ready}],
  }, progress => loader.setProgress(progress))
  loader.destroy()
  screens = []
  // Who made it, with the privacy policy, shown only over the splashes
  const footer = createFooter()
  await showSplashWarning()
  await showSoundSplash()
  // Fading away as the scene comes in, without holding it up
  void footer.remove()
  // Beside the speaker, to pick another language
  createLanguageButton(locale)

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
  // Fireworks going up all over the city, bursting just above its buildings
  createSkyFireworks(app, background, lighting, audio).catch(error => console.error("Couldn't set off the city's fireworks", error))
  // A light breeze with now and then a gust, carrying leaves and petals past the house
  // and blowing the fireworks' smoke and sparks, the fairy lights and the kandils about
  const wind = createWind(app)
  createWindBlown(app, background, lighting, wind)

  // Each tool has a bar of things to use, shown while it's the one picked. What's
  // placed in the scene stays there, and can be picked up again, whichever tool is picked
  const controls: Partial<Record<Tool, ToolControls>> = {}
  // What either bar's matchstick can light: diyas and fireworks alike
  const lightables: Lightable[] = []
  if (loaded(diyaAssets)) {
    const diyas = createDiyaInventory(app, background, lighting, audio, lightables)
    diyas.setInteractive(true)
    controls.diyas = diyas
  }
  if (loaded(fireworksAssets)) {
    const fireworks = createFireworks(app, background, lighting, audio, wind, lightables)
    fireworks.setInteractive(true)
    controls.fireworks = fireworks
  }
  if (loaded(kandilAssets)) {
    controls.kandil = createKandils(app, background, lighting, wind)
  }
  if (loaded(fairyLightAssets)) {
    controls.decorate = createHouseLights(app, background, lighting, wind)
  }
  controls.rangoli = createRangoli(app, background)
  // A "?" badge, and a faint outline, on whatever's placed and still to be finished,
  // such as an unlit diya, which shows what to do next with it
  startHints(app)

  const available = tools.filter(tool => controls[tool.name] && loaded([tool.icon]))
  let selected = available[0].name
  // Only the picked tool's bar shows, unless the bars have been hidden with the eye
  const showBars = () => Object.entries(controls).forEach(([name, control]) =>
    control.setHudShown(name === selected && hudToggle.isShown()))
  const select = (tool: Tool, picked = true) => {
    selected = tool
    showBars()
    // The tool still draws or hangs things with whatever was last picked from its bar
    background.setPressHandler(controls[tool]?.pressHandler)
    introduce(tool, picked)
  }
  // The first time a tool's used, what to take first from its bar, and what to do with
  // it, is shown beside it until the next press, as there's no hovering to find out on
  // a touch screen. After that, picking it from the rail shows its name for a moment
  let introducing = 0
  const introduce = (tool: Tool, picked: boolean) => {
    const slot = controls[tool]?.firstSlot?.()
    if (slot && !introduced.has(tool)) {
      const startedAt = performance.now()
      // Only the latest try goes on, so picking the tool again doesn't leave two
      const attempt = ++introducing
      const tryShowing = () => {
        if (attempt !== introducing || introduced.has(tool) || selected !== tool || !hudToggle.isShown()
          || performance.now() - startedAt > introduceFor) {
          return
        }
        if (!showTooltipOf(slot, undefined, {pin: true})) {
          setTimeout(tryShowing, introduceEvery)
          return
        }
        // Only once it's been shown, so one missed, as with the bar hidden, is shown
        // the next time the tool's picked
        introduced.add(tool)
        try {
          localStorage.setItem(introducedKey, JSON.stringify([...introduced]))
        } catch {
          // Shown again next time, then
        }
      }
      setTimeout(tryShowing, introduceEvery)
    } else if (picked) {
      const button = rail.buttonFor(tool)
      if (button) {
        showTooltipOf(button, undefined, {hideAfter: toolNameShown})
      }
    }
  }
  // A photo of the scene to share, taken with the camera button under the zoom buttons
  const camera = createScreenshotButton(app, background.container, buttonRadius)
  addTooltip(camera, () => ({title: LL.screenshot.take()}), {outline: false})
  const zoomControls = createZoomControls(app, background, [camera])
  const rail = createSideRail(app, available, select)
  const hudToggle = createHudToggle(app, showBars)
  app.stage.addChild(zoomControls.container, rail.container, hudToggle.container)
  screens.push(zoomControls, rail, hudToggle)
  // Above the rail and zoom buttons, so whatever's dragged from a bar is never hidden
  Object.values(controls).forEach(control => {
    app.stage.addChild(control.container)
    screens.push(control)
  })
  select(selected, false)

  window.addEventListener("keydown", e => {
    // Don't let the keyboard drive anything while it's hidden behind the warning
    // or the language picker
    if (e.ctrlKey || e.metaKey || e.altKey || portraitWarning.isShown() || isLanguagePickerOpen()) {
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
