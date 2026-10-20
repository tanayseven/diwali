import {createApp, State} from "./app"
import {createCopyLinkButton} from "./copyLink"
import {createDiyas} from "./diya"
import {createGreeting} from "./greeting"
import {createInputBox} from "./inputBox"
import {toTitleCase} from "./stringUtils"

type Layoutable = { layout: () => void }

const fetchNameFromUrl = (): string => {
  try {
    const rawName = new URLSearchParams(window.location.search).get("name")
    if (rawName) {
      return atob(rawName)
    }
  } catch (e) {
    return ""
  }
  return ""
}

const main = async () => {
  const app = await createApp()
  const layoutables: Layoutable[] = []

  const diyas = await createDiyas(app)
  app.stage.addChild(diyas.container)
  layoutables.push(diyas)

  const showGreeting = (name: string) => {
    const greeting = createGreeting(app, `Happy Diwali ${toTitleCase(name)}`)
    app.stage.addChild(greeting.container)
    layoutables.push(greeting)
  }

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => layoutables.forEach(item => item.layout()))
  })

  const decodedName = fetchNameFromUrl()
  if (decodedName) {
    showGreeting(decodedName)
    return
  }

  let state: State = "input-from"
  const inputBox = createInputBox(app)
  inputBox.setPrompt("Enter your name")
  app.stage.addChild(inputBox.container)
  layoutables.push(inputBox)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return
    }
    if (e.key === "Enter") {
      const value = inputBox.value.trim()
      if (!value) {
        return
      }
      if (state === "input-from") {
        state = "input-to"
        inputBox.clear()
        inputBox.setPrompt("Enter recipient's name")
      } else if (state === "input-to") {
        state = "ready"
        window.removeEventListener("keydown", onKeyDown)
        inputBox.destroy()
        layoutables.splice(layoutables.indexOf(inputBox), 1)
        showGreeting(value)
        const copyLink = createCopyLinkButton(app, value)
        app.stage.addChild(copyLink.container)
        layoutables.push(copyLink)
      }
    } else if (e.key === "Backspace") {
      inputBox.backspace()
    } else if (e.key.length === 1) {
      e.preventDefault()
      inputBox.append(e.key)
    }
  }

  window.addEventListener("keydown", onKeyDown)
}

main()
