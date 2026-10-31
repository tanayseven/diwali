import "@fontsource/jaini/400.css"
import "@fontsource/baloo-tamma-2/400.css"
import "@fontsource/baloo-tammudu-2/400.css"
import "@fontsource/baloo-chettan-2/400.css"
import "@fontsource/baloo-thambi-2/400.css"
import "@fontsource/baloo-da-2/400.css"
import "@fontsource/baloo-bhai-2/400.css"
import "@fontsource/baloo-bhaina-2/400.css"
import "@fontsource/baloo-paaji-2/400.css"
import "@fontsource/noto-naskh-arabic/400.css"
import "@fontsource/noto-sans-meetei-mayek/400.css"
import "@fontsource/noto-sans-ol-chiki/400.css"
import {Application, Container} from "pixi.js"

// A full-screen view that main.ts swaps in and out
type Screen = {
  container: Container
  layout: () => void
  destroy: () => void
  onKeyDown?: (e: KeyboardEvent) => void
}

// The fonts are bundled with the app (imported above), so they're there offline, as in
// the Android app; the fallback covers them failing to load. Each script's half of a font
// is only fetched once text in that script shows. Jaini has Latin and Devanagari only,
// so other scripts fall back, letter by letter, to a font for each: Baloo's for Kannada,
// Telugu, Malayalam, Tamil, Bengali (and Assamese), Gujarati, Odia and Gurmukhi, and
// Noto's for the Arabic script (Urdu, Sindhi, Kashmiri, whose extra letters it has, so
// none of a word's letters come from another font and break their joins), Meetei Mayek
// and Ol Chiki
const scriptFonts = [
  "Baloo Tamma 2", "Baloo Tammudu 2", "Baloo Chettan 2", "Baloo Thambi 2",
  "Baloo Da 2", "Baloo Bhai 2", "Baloo Bhaina 2", "Baloo Paaji 2",
  "Noto Naskh Arabic", "Noto Sans Meetei Mayek", "Noto Sans Ol Chiki",
]
const fontFamily = `Jaini, ${scriptFonts.map(font => `"${font}"`).join(", ")}, sans-serif`

// Pixi draws text once and won't redraw it when a web font arrives later,
// so wait for the font before anything draws text. If it fails, text uses the fallback.
// Each font is split by script, so this loads Jaini's Latin, and whatever's needed for
// the letters of the text given that aren't Latin. Not its Latin letters, or every other
// font's Latin would load too, unused
const loadFont = (text: string) => {
  const notLatin = text.replace(/[\u0000-ɏ]/g, "")
  return Promise.all([
    document.fonts.load("16px Jaini"),
    notLatin && document.fonts.load(`16px ${fontFamily}`, notLatin),
  ]).catch(err => {
    console.error("Couldn't load the font", err)
  })
}

// How much the game asks of the device. Phones and tablets, and machines with little
// memory or few cores, get a lighter game: fewer particles, fewer shells over the city
// and the skyline's lights worked out less often. ?quality=low or ?quality=high in the
// address picks one whatever the device
const coarsePointer = window.matchMedia("(pointer: coarse)").matches
const nav = navigator as Navigator & {deviceMemory?: number}
const lowEnd = coarsePointer || (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4
const asked = new URLSearchParams(window.location.search).get("quality")
const light = asked === "low" || (asked !== "high" && lowEnd)

const quality = {
  // The most pixels drawn per CSS pixel: the screen's, so text stays crisp on HiDPI
  // displays, but no more than the GPU can keep up with. Phones and tablets have far
  // fewer pixels across than a desktop screen, so they can go denser
  density: Math.min(window.devicePixelRatio || 1, coarsePointer ? 2 : 1.5),
  // Particles thrown by the fireworks on the porch, as a share of the full count
  particleScale: light ? 0.6 : 1,
  // Shells sent up over the city, as a share of the full count
  skyFireworkRate: light ? 0.6 : 1,
  // How often the skyline's lights are worked out afresh, in seconds
  lightRepaintEvery: light ? 1 / 15 : 1 / 20,
}

// The pixel density everything's drawn at
const pixelDensity = quality.density

const createApp = async (): Promise<Application> => {
  const app = new Application()
  await app.init({
    background: 0x000000,
    resizeTo: window,
    antialias: true,
    resolution: pixelDensity,
    autoDensity: true,
  })
  document.body.appendChild(app.canvas)
  return app
}

export {createApp, fontFamily, loadFont, pixelDensity, quality}
export type {Screen}
