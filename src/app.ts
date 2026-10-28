import {Application, Container} from "pixi.js"

// A full-screen view that main.ts swaps in and out
type Screen = {
  container: Container
  layout: () => void
  destroy: () => void
  onKeyDown?: (e: KeyboardEvent) => void
}

// Jaini comes from Google Fonts (linked in index.html); the fallback covers it failing to load
const fontFamily = "Jaini, sans-serif"

// Pixi draws text once and won't redraw it when a web font arrives later,
// so wait for the font before anything draws text. If it fails, text uses the fallback
const loadFont = () => document.fonts.load(`16px ${fontFamily}`).catch(err => {
  console.error("Couldn't load the font", err)
})

// The pixel density everything's drawn at: the screen's, so text stays crisp on HiDPI
// displays, but no more than the GPU can keep up with. Phones and tablets have far
// fewer pixels across than a desktop screen, so they can go denser
const maxDensity = {touch: 2, desktop: 1.5}
const pixelDensity = Math.min(
  window.devicePixelRatio || 1,
  window.matchMedia("(pointer: coarse)").matches ? maxDensity.touch : maxDensity.desktop,
)

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

export {createApp, fontFamily, loadFont, pixelDensity}
export type {Screen}
