import {createApp, Screen} from "./app"
import {createDiyas} from "./diya"
import {createMenu} from "./menu"
import {createAboutScreen, createGreetingScreen, createInputScreen} from "./screens"
import {decodeName} from "./stringUtils"

const sampleName = "Friend"

const fetchNameFromUrl = (): string => {
  try {
    const rawName = new URLSearchParams(window.location.search).get("name")
    if (rawName) {
      // URLSearchParams turns an unescaped "+" into a space; restore it
      return decodeName(rawName.replace(/ /g, "+"))
    }
  } catch (e) {
    return ""
  }
  return ""
}

const main = async () => {
  const app = await createApp()

  const diyas = await createDiyas(app)
  app.stage.addChild(diyas.container)

  let current: Screen | undefined

  const show = (screen: Screen, {withDiyas = true} = {}) => {
    current?.destroy()
    current = screen
    diyas.container.visible = withDiyas
    app.stage.addChild(screen.container)
  }

  const showMenu = () => show(createMenu(app, "Happy Diwali", [
    {
      label: "Create a greeting",
      onSelect: () => show(createInputScreen(app, {
        onDone: recipient => show(createGreetingScreen(app, recipient, {
          shareable: true,
          backLabel: "← Back to menu",
          onBack: showMenu,
        })),
        onBack: showMenu,
      })),
    },
    {
      label: "See a sample",
      onSelect: () => show(createGreetingScreen(app, sampleName, {
        shareable: false,
        backLabel: "← Back to menu",
        onBack: showMenu,
      })),
    },
    {
      label: "About",
      onSelect: () => show(createAboutScreen(app, {onBack: showMenu})),
    },
  ]), {withDiyas: false})

  window.addEventListener("resize", () => {
    // resizeTo updates the renderer on the next frame, so lay out after it
    requestAnimationFrame(() => {
      diyas.layout()
      current?.layout()
    })
  })

  window.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return
    }
    current?.onKeyDown?.(e)
  })

  const decodedName = fetchNameFromUrl()
  if (decodedName) {
    show(createGreetingScreen(app, decodedName, {
      shareable: false,
      backLabel: "Create your own greeting",
      onBack: showMenu,
    }))
  } else {
    showMenu()
  }
}

main()
