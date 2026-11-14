import type {Locales} from "./i18n/i18n-types"
import {languageName, showLanguagePicker} from "./languagePicker"
import {rememberLocale} from "./locale"

const highlight = "#ffd700"
const size = 44
// Beside the speaker button, which is 24 px in from the top right corner, 52 px across
// with its border and padding, with this much between them
const gap = 12

// A globe button in the top right corner, beside the speaker, that opens the language
// picker again, as it's only shown on the first visit, when no language has been
// picked yet. It's labelled with the language in use, named in itself. Picking another
// starts the game again in it, as everything shown so far is in the old one; picking
// the same one carries on
const createLanguageButton = (current: Locales) => {
  const button = document.createElement("button")
  button.type = "button"
  button.setAttribute("aria-label", languageName(current))
  button.title = languageName(current)
  Object.assign(button.style, {
    position: "fixed",
    top: "24px",
    right: `${24 + size + 8 + gap}px`,
    // Under the speaker's volume slider, which opens out over it
    zIndex: "1",
    width: `${size + 8}px`,
    height: `${size + 8}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    borderRadius: "50%",
    background: "rgba(26, 26, 26, 0.85)",
    border: "2px solid #555555",
    cursor: "pointer",
    touchAction: "manipulation",
  })
  // A globe, its meridians and parallels
  button.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${highlight}"
    stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>`
  let picking = false
  button.addEventListener("click", async () => {
    if (picking) {
      return
    }
    picking = true
    const picked = await showLanguagePicker(current)
    picking = false
    if (picked !== current) {
      rememberLocale(picked)
      window.location.reload()
    }
  })
  document.body.appendChild(button)
  return button
}

export {createLanguageButton}
