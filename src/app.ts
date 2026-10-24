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

const createApp = async (): Promise<Application> => {
  const app = new Application()
  await app.init({
    background: 0x000000,
    resizeTo: window,
    antialias: true,
    // Render at the screen's pixel density so text stays crisp on HiDPI displays
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })
  document.body.appendChild(app.canvas)
  return app
}

export {createApp, fontFamily, loadFont}
export type {Screen}
