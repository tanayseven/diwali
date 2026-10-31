import {fontFamily} from "./app"
import type {Locales} from "./i18n/i18n-types"

const fadeDuration = 800

// Each language named in itself, so whoever reads it can find their own, and in English
// below that, which they're in the order of
const languages: {locale: Locales, name: string, english: string}[] = [
  {locale: "as", name: "অসমীয়া", english: "Assamese"},
  {locale: "bn", name: "বাংলা", english: "Bengali"},
  {locale: "doi", name: "डोगरी", english: "Dogri"},
  {locale: "en", name: "English", english: "English"},
  {locale: "gu", name: "ગુજરાતી", english: "Gujarati"},
  {locale: "hi", name: "हिन्दी", english: "Hindi"},
  {locale: "hi-Latn", name: "Hinglish", english: "Hinglish"},
  {locale: "kn", name: "ಕನ್ನಡ", english: "Kannada"},
  {locale: "ks", name: "كٲشُر", english: "Kashmiri"},
  {locale: "kok", name: "कोंकणी", english: "Konkani"},
  {locale: "mai", name: "मैथिली", english: "Maithili"},
  {locale: "ml", name: "മലയാളം", english: "Malayalam"},
  {locale: "mni-Mtei", name: "ꯃꯤꯇꯩꯂꯣꯟ", english: "Manipuri"},
  {locale: "mr", name: "मराठी", english: "Marathi"},
  {locale: "or", name: "ଓଡ଼ିଆ", english: "Odia"},
  {locale: "pa", name: "ਪੰਜਾਬੀ", english: "Punjabi"},
  {locale: "sa", name: "संस्कृतम्", english: "Sanskrit"},
  {locale: "sat-Olck", name: "ᱥᱟᱱᱛᱟᱲᱤ", english: "Santali"},
  {locale: "sd", name: "سنڌي", english: "Sindhi"},
  {locale: "ta", name: "தமிழ்", english: "Tamil"},
  {locale: "te", name: "తెలుగు", english: "Telugu"},
  {locale: "ur", name: "اردو", english: "Urdu"},
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
    // Centred, unless there's more than fits, when it scrolls from the top
    justifyContent: "safe center",
    overflowY: "auto",
    gap: "min(24px, 4vh)",
    padding: "min(24px, 4vh) 16px",
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
  Object.assign(heading.style, {margin: "0", fontSize: "min(48px, 9vh)", lineHeight: "1.2", color: "#ffd700"})

  // As many to a row as fit, so all of them do on a landscape phone
  const choices = document.createElement("div")
  Object.assign(choices.style, {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "8px",
    width: "100%",
    maxWidth: "900px",
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

  const buttons = languages.map(({locale, name, english}) => {
    const button = document.createElement("button")
    button.type = "button"
    const highlighted = locale === preferred
    Object.assign(button.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "4px 8px",
      border: "2px solid #ffd700",
      borderRadius: "12px",
      background: highlighted ? "#ffd700" : "transparent",
      color: highlighted ? "#000000" : "#ffffff",
      fontFamily,
      cursor: "pointer",
    })
    const own = document.createElement("span")
    own.lang = locale
    // Urdu, Sindhi and Kashmiri run right to left
    own.dir = "auto"
    own.textContent = name
    Object.assign(own.style, {fontSize: "min(26px, 5vh)", lineHeight: "1.4"})
    button.append(own)
    if (english !== name) {
      const inEnglish = document.createElement("span")
      inEnglish.lang = "en"
      inEnglish.textContent = english
      Object.assign(inEnglish.style, {fontSize: "min(15px, 3vh)", lineHeight: "1.2", opacity: "0.75"})
      button.append(inEnglish)
    }
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
