import {Application, Container} from "pixi.js"

// A full-screen view that main.ts swaps in and out
type Screen = {
  container: Container
  layout: () => void
  destroy: () => void
  onKeyDown?: (e: KeyboardEvent) => void
}

const createApp = async (): Promise<Application> => {
  const app = new Application()
  await app.init({
    background: 0x000000,
    resizeTo: window,
    antialias: true,
  })
  document.body.appendChild(app.canvas)
  return app
}

export {createApp}
export type {Screen}
