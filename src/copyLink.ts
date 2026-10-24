import {Application, Text} from "pixi.js"
import {encodeName} from "./stringUtils"

const label = "Copy link"

const createCopyLinkButton = (app: Application, recipient: string) => {
  const button = new Text({
    text: label,
    style: {fontFamily: "monospace", fontSize: 24, fill: 0xffd700},
  })
  button.anchor.set(0.5)
  button.eventMode = "static"
  button.cursor = "pointer"

  const flash = (message: string) => {
    button.text = message
    setTimeout(() => {
      if (!button.destroyed) {
        button.text = label
      }
    }, 1500)
  }

  button.on("pointertap", async () => {
    const link = `${location.origin}${location.pathname}?name=${encodeURIComponent(encodeName(recipient))}`
    try {
      await navigator.clipboard.writeText(link)
      flash("Copied!")
    } catch {
      flash("Copy failed")
    }
  })

  const layout = () => {
    button.position.set(app.screen.width / 2, app.screen.height * 0.65)
  }

  layout()
  return {container: button, layout}
}

export {createCopyLinkButton}
