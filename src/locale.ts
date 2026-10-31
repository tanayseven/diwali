import {navigatorDetector} from "typesafe-i18n/detectors"
import type {Locales, TranslationFunctions} from "./i18n/i18n-types"
import {detectLocale, i18nObject, isLocale} from "./i18n/i18n-util"
import {loadLocaleAsync} from "./i18n/i18n-util.async"

// The app's text in the visitor's language. It's set once by loadLocale, before
// anything shows text, so everywhere else can read it straight from here
let LL: TranslationFunctions

// The language picked is remembered between visits. Storage can be unavailable
// (private windows, blocked site data), so it's only a convenience
const storageKey = "diwali-locale"

// The language picked last visit, else the browser's preferred language if there's a
// translation for it, falling back to English
const preferredLocale = (): Locales => {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved && isLocale(saved)) {
      return saved
    }
  } catch {
    // Fall through to the browser's
  }
  return detectLocale(navigatorDetector)
}

// Loads just the picked language's translation, and remembers it for next time
const loadLocale = async (locale: Locales) => {
  try {
    localStorage.setItem(storageKey, locale)
  } catch {
    // Not saving is fine
  }
  await loadLocaleAsync(locale)
  LL = i18nObject(locale)
  document.documentElement.lang = locale
  document.title = LL.title()
}

export {LL, loadLocale, preferredLocale}
