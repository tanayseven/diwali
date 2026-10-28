import {Application, Container, Graphics, Rectangle} from "pixi.js"
import {fontFamily} from "./app"
import {LL} from "./locale"

const siteUrl = "https://diwali.tanay.tech"
const highlight = "#ffd700"
const fileName = "diwali-this-year.png"
// The address printed in the photo's bottom-right corner, sized to the photo
const urlHeightShare = 0.045
const urlMargin = 0.025
// A soft white flash over the screen as the photo's taken
const flashAlpha = 0.35
const flashDuration = 300

// The photo: the scene as it's shown on screen, without the bars and buttons over it,
// with the site's address printed on it
const takePhoto = (app: Application, scene: Container) => {
  const {width, height} = app.screen
  const shot = app.renderer.extract.canvas({
    target: scene,
    frame: new Rectangle(0, 0, width, height),
    resolution: app.renderer.resolution,
  }) as HTMLCanvasElement
  const context = shot.getContext("2d")!
  const fontSize = Math.round(shot.height * urlHeightShare)
  const margin = Math.round(Math.min(shot.width, shot.height) * urlMargin)
  context.font = `${fontSize}px ${fontFamily}`
  context.textBaseline = "middle"
  // On a dark pill, so it reads over anything
  const textWidth = context.measureText(siteUrl).width
  const padX = fontSize * 0.6
  const pillWidth = textWidth + padX * 2
  const pillHeight = fontSize * 1.6
  const left = shot.width - margin - pillWidth
  const top = shot.height - margin - pillHeight
  context.fillStyle = "rgba(0, 0, 0, 0.6)"
  context.beginPath()
  context.roundRect(left, top, pillWidth, pillHeight, pillHeight / 2)
  context.fill()
  context.fillStyle = highlight
  context.fillText(siteUrl, left + padX, top + pillHeight / 2)
  return new Promise<Blob>((resolve, reject) =>
    shot.toBlob(blob => blob ? resolve(blob) : reject(new Error("Couldn't make the photo")), "image/png"))
}

// Shares the photo to whichever app is picked, where the browser can share files, or
// else saves it as a download
const sharePhoto = async (blob: Blob) => {
  const file = new File([blob], fileName, {type: "image/png"})
  const data = {files: [file], title: LL.title(), text: LL.screenshot.shareText({url: siteUrl})}
  if (navigator.canShare?.(data)) {
    try {
      await navigator.share(data)
      return
    } catch (error) {
      // Closing the share sheet without picking anything isn't a failure
      if ((error as DOMException).name === "AbortError") {
        return
      }
      console.error("Couldn't share the photo, so saving it instead", error)
    }
  }
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

const flash = () => {
  const cover = document.createElement("div")
  Object.assign(cover.style, {
    position: "fixed",
    inset: "0",
    background: "#ffffff",
    opacity: String(flashAlpha),
    pointerEvents: "none",
    transition: `opacity ${flashDuration}ms ease-out`,
    zIndex: "3",
  })
  document.body.appendChild(cover)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    cover.style.opacity = "0"
  }))
  setTimeout(() => cover.remove(), flashDuration + 50)
}

// A camera button that takes a photo of the scene and shares it
const createScreenshotButton = (app: Application, scene: Container, radius: number) => {
  const button = new Container()
  const circle = new Graphics()
  // A camera: its body, the bump on top and the lens
  const camera = new Graphics()
    .roundRect(-12, -7, 24, 17, 4)
    .stroke({width: 2.5, color: highlight})
    .roundRect(-5, -11, 10, 4, 1.5)
    .fill(highlight)
    .circle(0, 1.5, 5)
    .stroke({width: 2.5, color: highlight})
  button.addChild(circle, camera)
  button.eventMode = "static"
  button.cursor = "pointer"
  const render = (hovered: boolean) => circle.clear()
    .circle(0, 0, radius)
    .fill(0x1a1a1a)
    .stroke({width: 3, color: hovered ? highlight : 0x555555})
  render(false)
  button.on("pointerover", () => render(true))
  button.on("pointerout", () => render(false))
  let busy = false
  button.on("pointertap", async () => {
    if (busy) {
      return
    }
    busy = true
    try {
      // Taken before the flash, so the flash isn't in it
      const photo = await takePhoto(app, scene)
      flash()
      await sharePhoto(photo)
    } catch (error) {
      console.error("Couldn't take the photo", error)
    } finally {
      busy = false
    }
  })
  return button
}

export {createScreenshotButton}
