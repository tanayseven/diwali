import {Application, Container} from "pixi.js"

// A full-screen view that main.ts swaps in and out
type Screen = {
  container: Container
  layout: () => void
  destroy: () => void
  onKeyDown?: (e: KeyboardEvent) => void
}

// Jaini comes from Google Fonts (linked in index.html); the fallback covers it failing to load.
// It has Latin and Devanagari only, so Kannada, Telugu, Malayalam and Tamil fall back,
// letter by letter, to the Baloo font for each
const fontFamily = `Jaini, "Baloo Tamma 2", "Baloo Tammudu 2", "Baloo Chettan 2", "Baloo Thambi 2", sans-serif`

// Pixi draws text once and won't redraw it when a web font arrives later,
// so wait for the font before anything draws text. If it fails, text uses the fallback.
// Google Fonts splits each font by script, so this loads Jaini's Latin, and whatever's
// needed for the letters of the text given that aren't Latin. Not its Latin letters,
// or every Baloo font's Latin would load too, unused
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
