import {Application, Container, Rectangle, Text} from "pixi.js"
import {Screen} from "./app"
import {createCopyLinkButton} from "./copyLink"
import {createGreeting} from "./greeting"
import {createInputBox} from "./inputBox"
import {toTitleCase} from "./stringUtils"

// Tappable "back" hint just below the top row of diyas, so touch users can leave too
const isTouchOnly = window.matchMedia("(pointer: coarse)").matches

const createBackHint = (app: Application, label: string, onBack: () => void) => {
  const hint = new Text({
    // Only mention Esc where there's likely a keyboard
    text: isTouchOnly ? label : `${label} (Esc)`,
    style: {fontFamily: "monospace", fontSize: 18, fill: 0xaaaaaa},
  })
  hint.anchor.set(0.5)
  // Pad the tap area well beyond the small text so it's easy to hit on touch screens
  hint.hitArea = new Rectangle(-hint.width / 2 - 24, -hint.height / 2 - 16, hint.width + 48, hint.height + 32)
  hint.eventMode = "static"
  hint.cursor = "pointer"
  hint.on("pointertap", () => requestAnimationFrame(onBack))

  const layout = () => hint.position.set(app.screen.width / 2, 120)
  layout()
  return {container: hint, layout}
}

const createInputScreen = (
  app: Application,
  {onDone, onBack}: { onDone: (recipient: string) => void, onBack: () => void },
): Screen => {
  const container = new Container()
  const inputBox = createInputBox(app)
  const hint = createBackHint(app, "← Back to menu", onBack)
  container.addChild(inputBox.container, hint.container)

  let step: "from" | "to" = "from"
  inputBox.setPrompt("Enter your name")

  return {
    container,
    layout() {
      inputBox.layout()
      hint.layout()
    },
    destroy() {
      inputBox.destroy()
      container.destroy({children: true})
    },
    onKeyDown(e) {
      if (e.key === "Escape") {
        onBack()
      } else if (e.key === "Enter") {
        const value = inputBox.value.trim()
        if (!value) {
          return
        }
        if (step === "from") {
          step = "to"
          inputBox.clear()
          inputBox.setPrompt("Enter recipient's name")
        } else {
          onDone(value)
        }
      } else if (e.key === "Backspace") {
        inputBox.backspace()
      } else if (e.key.length === 1) {
        e.preventDefault()
        inputBox.append(e.key)
      }
    },
  }
}

const createGreetingScreen = (
  app: Application,
  name: string,
  {shareable, backLabel, onBack}: { shareable: boolean, backLabel: string, onBack: () => void },
): Screen => {
  const container = new Container()
  const greeting = createGreeting(app, `Happy Diwali ${toTitleCase(name)}`)
  const hint = createBackHint(app, backLabel, onBack)
  const copyLink = shareable ? createCopyLinkButton(app, name) : undefined
  container.addChild(greeting.container, hint.container)
  if (copyLink) {
    container.addChild(copyLink.container)
  }

  return {
    container,
    layout() {
      greeting.layout()
      hint.layout()
      copyLink?.layout()
    },
    destroy() {
      greeting.destroy()
      container.destroy({children: true})
    },
    onKeyDown(e) {
      if (e.key === "Escape") {
        onBack()
      }
    },
  }
}

const aboutText = [
  "Send an animated Diwali greeting to someone special.",
  "",
  "Pick \"Create a greeting\", enter your name and theirs,",
  "then copy the link and share it with them.",
  "",
  "Built with PixiJS.",
].join("\n")

const createAboutScreen = (app: Application, {onBack}: { onBack: () => void }): Screen => {
  const container = new Container()
  const body = new Text({
    text: aboutText,
    style: {
      fontFamily: "monospace",
      fontSize: 22,
      fill: 0xffffff,
      align: "center",
      wordWrap: true,
      lineHeight: 32,
    },
  })
  body.anchor.set(0.5)
  const hint = createBackHint(app, "← Back to menu", onBack)
  container.addChild(body, hint.container)

  const layout = () => {
    const fontSize = Math.min(22, app.screen.width / 20)
    body.style.fontSize = fontSize
    body.style.lineHeight = fontSize * 1.45
    body.style.wordWrapWidth = app.screen.width - 48
    // Centre in the gap between the back hint and the bottom row of diyas
    body.position.set(app.screen.width / 2, (150 + app.screen.height - 200) / 2)
    hint.layout()
  }
  layout()

  return {
    container,
    layout,
    destroy: () => container.destroy({children: true}),
    onKeyDown(e) {
      if (e.key === "Escape" || e.key === "Enter") {
        onBack()
      }
    },
  }
}

export {createAboutScreen, createGreetingScreen, createInputScreen}
