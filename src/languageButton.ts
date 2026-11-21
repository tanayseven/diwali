import {fontFamily} from "./app"
import type {Locales} from "./i18n/i18n-types"
import {languageName, showLanguagePicker} from "./languagePicker"
import {restartIn} from "./locale"

const highlight = "#ffd700"
const size = 44

// Opens the language picker, and starts the game again in the language picked, as
// everything shown so far is in the old one; picking the same one carries on. Resolves
// once it's closed, if it isn't started again
let picking = false
const pickLanguage = async (current: Locales) => {
  if (picking) {
    return
  }
  picking = true
  const picked = await showLanguagePicker(current)
  picking = false
  if (picked !== current) {
    restartIn(picked)
  }
}

// A globe button, with the name of the language in use, in itself, beside it, that opens
// the language picker again, as it's only shown on the first visit, when no language has
// been picked yet. Named so it's clear what it's for, in any language
const createLanguageButton = (current: Locales) => {
  const button = document.createElement("button")
  button.type = "button"
  button.setAttribute("aria-label", languageName(current))
  button.title = languageName(current)
  Object.assign(button.style, {
    height: `${size + 8}px`,
    minWidth: `${size + 8}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "0 12px 0 11px",
    borderRadius: `${(size + 8) / 2}px`,
    background: "rgba(26, 26, 26, 0.85)",
    border: "2px solid #555555",
    color: highlight,
    fontFamily,
    fontSize: "20px",
    lineHeight: "1",
    whiteSpace: "nowrap",
    cursor: "pointer",
    touchAction: "manipulation",
  })
  // A globe, its meridians and parallels, and the language's name
  button.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${highlight}"
    stroke-width="2" stroke-linecap="round" aria-hidden="true" style="flex: none"><circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>`
  const name = document.createElement("span")
  name.textContent = languageName(current)
  name.setAttribute("aria-hidden", "true")
  button.appendChild(name)
  button.addEventListener("click", async () => {
    await pickLanguage(current)
    // Back where the keyboard was, to carry on
    button.focus()
  })
  return button
}

export {createLanguageButton, pickLanguage}
