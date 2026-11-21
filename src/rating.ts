/// <reference types="vite/client" />
import {Capacitor} from "@capacitor/core"
import {fontFamily} from "./app"
import {LL} from "./locale"
import {onProgress} from "./progress"
import type {SettingsPanel} from "./settings"
import {textButton} from "./settings"
import {isTourRunning} from "./tour"

const highlight = "#ffd700"
// The app's page in whichever store's installed: Google Play's or F-Droid's app opens it.
// With neither, nothing happens, as the app can't open it any other way
const storeUrl = "market://details?id=tech.tanay.diwali"
const storageKey = "diwali-rating"
// Never asked in the first session, and after "Not now", not for this many more
const firstAskedIn = 2
const askAgainAfter = 3
// Asked once something's been made, and nothing's been pressed for this long, in ms
const pauseFor = 4000

type Asked = {sessions: number, askFrom: number, never: boolean}

const load = (): Asked => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null")
    if (typeof saved?.sessions === "number" && typeof saved?.askFrom === "number" && typeof saved?.never === "boolean") {
      return saved
    }
  } catch {
    // Fall through to a first session
  }
  return {sessions: 0, askFrom: firstAskedIn, never: false}
}

const save = (asked: Asked) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(asked))
  } catch {
    // Asked again next time, then
  }
}

// Only in the Android app, as that's what's in a store to rate. In the dev server, as the
// tests run it, ?rating stands in for it
const canRate = () =>
  (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android")
  || (import.meta.env.DEV && new URLSearchParams(window.location.search).has("rating"))

const openStore = () => {
  window.location.href = storeUrl
}

// Rating the app, in the Android app only: a row in the settings to rate it whenever,
// and, gently, once in a while, a card asking: never in the first session, only once a
// kandil's been lit or a rangoli design put down, and only once nothing's been pressed
// for a moment after, so it never gets in the way. Rate opens the store's page, Not now
// asks again a few sessions later, and Don't ask again doesn't
const createRating = (settings: SettingsPanel) => {
  if (!canRate()) {
    return
  }
  const rate = textButton(LL.rating.rate())
  rate.addEventListener("click", () => {
    settings.hide()
    openStore()
  })
  settings.addRow(LL.rating.title(), rate)

  const asked = load()
  asked.sessions += 1
  save(asked)
  if (asked.never || asked.sessions < asked.askFrom) {
    return
  }
  let made = false
  let lastPress = performance.now()
  let timer: number | undefined
  const onPress = () => {
    lastPress = performance.now()
  }
  window.addEventListener("pointerdown", onPress, true)
  const stop = onProgress(done => {
    if (done === "kandilLit" || done === "rangoliPlaced") {
      made = true
      wait()
    }
  })
  // Checks again until there's been a pause, with nothing else going on
  const wait = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      const busy = isTourRunning() || document.querySelector("[role=dialog][aria-modal=true]:not([style*='display: none'])")
      if (made && !busy && performance.now() - lastPress >= pauseFor) {
        ask()
      } else {
        wait()
      }
    }, pauseFor)
  }
  const ask = () => {
    stop()
    window.removeEventListener("pointerdown", onPress, true)
    const card = document.createElement("div")
    card.setAttribute("role", "dialog")
    card.setAttribute("aria-label", LL.rating.title())
    Object.assign(card.style, {
      position: "fixed",
      top: "12px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "2",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      maxWidth: "min(560px, calc(100vw - 24px))",
      padding: "12px 16px",
      boxSizing: "border-box",
      borderRadius: "14px",
      background: "rgba(26, 26, 26, 0.95)",
      border: `2px solid ${highlight}`,
      color: "#ffffff",
      fontFamily,
      fontSize: "19px",
    })
    const text = document.createElement("span")
    text.textContent = LL.rating.ask()
    Object.assign(text.style, {flex: "1 1 220px"})
    const rateNow = textButton(LL.rating.rate())
    const later = textButton(LL.rating.later())
    const never = textButton(LL.rating.never())
    ;[later, never].forEach(button => Object.assign(button.style, {borderColor: "#777777", color: "#dddddd"}))
    card.append(text, rateNow, later, never)
    document.body.appendChild(card)
    const close = (next: Partial<Asked>) => {
      Object.assign(asked, next)
      save(asked)
      card.remove()
    }
    rateNow.addEventListener("click", () => {
      close({never: true})
      openStore()
    })
    later.addEventListener("click", () => close({askFrom: asked.sessions + askAgainAfter}))
    never.addEventListener("click", () => close({never: true}))
  }
}

export {createRating}
