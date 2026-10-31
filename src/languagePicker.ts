import {fontFamily} from "./app"
import type {Locales} from "./i18n/i18n-types"

const fadeDuration = 800

// Each language named in itself, so whoever reads it can find their own
const languages: {locale: Locales, name: string}[] = [
  {locale: "hi", name: "हिन्दी"},
  {locale: "hi-Latn", name: "Hinglish"},
  {locale: "mr", name: "मराठी"},
  {locale: "en", name: "English"},
  {locale: "kn", name: "ಕನ್ನಡ"},
  {locale: "te", name: "తెలుగు"},
  {locale: "ml", name: "മലയാളം"},
  {locale: "ta", name: "தமிழ்"},
]

// Shown first, before anything else has text, to pick the language everything after
// is in. The preferred one is highlighted and focused, so Enter picks it.
// Resolves with the picked language as soon as one's picked, while it fades out
const showLanguagePicker = (preferred: Locales) => new Promise<Locales>(resolve => {
  const overlay = document.createElement("div")
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-label", "Choose a language")
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "min(32px, 6vh)",
    padding: "24px",
    boxSizing: "border-box",
    background: "#000000",
    color: "#ffffff",
    fontFamily,
    textAlign: "center",
    opacity: "0",
    transition: `opacity ${fadeDuration}ms ease-in-out`,
  })

  // Not yet knowing the language, ask in the one most widely shared across them
  const heading = document.createElement("p")
  heading.textContent = "Choose a language"
  Object.assign(heading.style, {margin: "0", fontSize: "min(48px, 10vh)", lineHeight: "1.3", color: "#ffd700"})

  const choices = document.createElement("div")
  Object.assign(choices.style, {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "16px",
    maxWidth: "720px",
  })

  let picked = false
  const pick = (locale: Locales) => {
    if (picked) {
      return
    }
    picked = true
    overlay.style.pointerEvents = "none"
    overlay.style.opacity = "0"
    setTimeout(() => overlay.remove(), fadeDuration)
    resolve(locale)
  }

  const buttons = languages.map(({locale, name}) => {
    const button = document.createElement("button")
    button.type = "button"
    button.lang = locale
    button.textContent = name
    const highlighted = locale === preferred
    Object.assign(button.style, {
      minWidth: "160px",
      padding: "8px 24px",
      border: "2px solid #ffd700",
      borderRadius: "12px",
      background: highlighted ? "#ffd700" : "transparent",
      color: highlighted ? "#000000" : "#ffffff",
      fontFamily,
      fontSize: "min(36px, 8vh)",
      lineHeight: "1.4",
      cursor: "pointer",
    })
    button.addEventListener("click", () => pick(locale))
    return button
  })
  choices.append(...buttons)

  overlay.append(heading, choices)
  document.body.appendChild(overlay)
  buttons[languages.findIndex(language => language.locale === preferred)]?.focus()

  // Wait a frame so the browser sees opacity 0 first and actually transitions
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = "1"
  }))
})

export {showLanguagePicker}
