import {navigatorDetector} from "typesafe-i18n/detectors"
import type {Locales, TranslationFunctions} from "./i18n/i18n-types"
import {detectLocale, i18nObject, isLocale} from "./i18n/i18n-util"
import {loadLocaleAsync} from "./i18n/i18n-util.async"

// The app's text in the visitor's language. It's set once by loadLocale, before
// anything shows text, so everywhere else can read it straight from here
let LL: TranslationFunctions

// The languages written right to left, in the Arabic script
const rightToLeft: Locales[] = ["ks", "sd", "ur"]

// The language picked is remembered between visits. Storage can be unavailable
// (private windows, blocked site data), so it's only a convenience
const storageKey = "diwali-locale"

// The URL's query parameter that carries a language picked from the globe button across
// the reload that starts the game again in it, in case it can't be saved
const urlKey = "lang"

// The language picked on an earlier visit, if one was and it's still there: the one
// just picked, carried in the URL, else the one saved
const savedLocale = (): Locales | undefined => {
  const url = new URL(window.location.href)
  const carried = url.searchParams.get(urlKey)
  if (carried !== null) {
    // Taken out of the URL, so it's not kept if the page is bookmarked or shared
    url.searchParams.delete(urlKey)
    window.history.replaceState(null, "", url)
    if (isLocale(carried)) {
      return carried
    }
  }
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved && isLocale(saved)) {
      return saved
    }
  } catch {
    // As if none was picked
  }
  return undefined
}

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

// Remembers a language for next time
const rememberLocale = (locale: Locales) => {
  try {
    localStorage.setItem(storageKey, locale)
  } catch {
    // Not saving is fine
  }
}

// Loads just the picked language's translation, and remembers it for next time
const loadLocale = async (locale: Locales) => {
  rememberLocale(locale)
  await loadLocaleAsync(locale)
  LL = i18nObject(locale)
  document.documentElement.lang = locale
  // So the text shown over the game, like the warnings and footer, reads the right way
  document.documentElement.dir = rightToLeft.includes(locale) ? "rtl" : "ltr"
  document.title = LL.title()
}

// Starts the game again in another language, remembered for next time, and carried
// across in the URL too, in case remembering it fails
const restartIn = (locale: Locales) => {
  rememberLocale(locale)
  const url = new URL(window.location.href)
  url.searchParams.set(urlKey, locale)
  window.location.replace(url)
}

export {LL, loadLocale, preferredLocale, rememberLocale, restartIn, savedLocale}
