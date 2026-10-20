import {Application} from "pixi.js"

type State = "input-from" | "input-to" | "ready"

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

export {createApp, State}
