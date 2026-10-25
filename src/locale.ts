import {navigatorDetector} from "typesafe-i18n/detectors"
import type {TranslationFunctions} from "./i18n/i18n-types"
import {detectLocale, i18nObject} from "./i18n/i18n-util"
import {loadLocaleAsync} from "./i18n/i18n-util.async"

// The app's text in the visitor's language. It's set once by loadLocale, before
// anything shows text, so everywhere else can read it straight from here
let LL: TranslationFunctions

// Picks the browser's preferred language if there's a translation for it, falling back
// to English, and loads just that one translation
const loadLocale = async () => {
  const locale = detectLocale(navigatorDetector)
  await loadLocaleAsync(locale)
  LL = i18nObject(locale)
  document.documentElement.lang = locale
  document.title = LL.title()
}

export {LL, loadLocale}
