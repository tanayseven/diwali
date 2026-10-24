import {Application, Assets, Container, Graphics, Text} from "pixi.js"
import {Screen} from "./app"

const highlight = 0xffd700
const maxBarWidth = 320
const barHeight = 12
const sideGutter = 24
const labelGap = 24

// Shown while the assets load, with a bar that fills as each one arrives
const createLoader = (app: Application): Screen & {setProgress: (progress: number) => void} => {
  const container = new Container()
  const label = new Text({
    text: "Loading…",
    style: {fontFamily: "monospace", fontSize: 26, fill: highlight},
  })
  label.anchor.set(0.5)
  label.roundPixels = true
  const bar = new Graphics()
  container.addChild(label, bar)
  let progress = 0

  const render = () => {
    const width = Math.min(maxBarWidth, app.screen.width - sideGutter * 2)
    bar.clear()
      .roundRect(-width / 2, 0, width, barHeight, barHeight / 2)
      .fill(0x1a1a1a)
      .stroke({width: 2, color: 0x555555})
    if (progress > 0) {
      bar.roundRect(-width / 2, 0, Math.max(barHeight, width * progress), barHeight, barHeight / 2)
        .fill(highlight)
    }
  }

  const layout = () => {
    const centerX = app.screen.width / 2
    const centerY = app.screen.height / 2
    label.position.set(centerX, centerY - labelGap / 2 - label.height / 2)
    bar.position.set(centerX, centerY + labelGap / 2)
    render()
  }

  layout()

  return {
    container,
    layout,
    destroy() {
      container.destroy({children: true})
    },
    setProgress(value) {
      progress = value
      render()
    },
  }
}

// Images shown as <img> rather than drawn by Pixi only need to be in the browser's cache
const preloadImage = (url: string) => new Promise<void>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve()
  image.onerror = () => reject(new Error(`Couldn't load ${url}`))
  image.src = url
})

// Loads every asset, reporting progress from 0 to 1, and returns the URLs that failed
// so the caller can go on without them instead of getting stuck on the loader
const loadAssets = async (
  {textures, images}: {textures: string[], images: string[]},
  onProgress: (progress: number) => void,
): Promise<Set<string>> => {
  const total = textures.length + images.length
  let done = 0
  const failed = new Set<string>()
  const track = (url: string, load: Promise<unknown>) => load
    .catch(err => {
      failed.add(url)
      console.error(err)
    })
    .finally(() => onProgress(++done / total))
  await Promise.all([
    ...textures.map(url => track(url, Assets.load(url))),
    ...images.map(url => track(url, preloadImage(url))),
  ])
  return failed
}

export {createLoader, loadAssets}
