import {Application, Text} from "pixi.js"

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
    setTimeout(() => button.text = label, 1500)
  }

  button.on("pointertap", async () => {
    const link = `${location.origin}${location.pathname}?name=${encodeURIComponent(btoa(recipient))}`
    try {
      await navigator.clipboard.writeText(link)
      flash("Copied!")
    } catch {
      flash("Copy failed")
    }
  })

  const layout = () => {
    button.position.set(app.screen.width / 2, app.screen.height * 0.7)
  }

  layout()
  return {container: button, layout}
}

export {createCopyLinkButton}
