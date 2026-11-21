import {fontFamily} from "./app"
import type {AudioControl} from "./audioControl"
import type {Locales} from "./i18n/i18n-types"
import {createLanguageButton, pickLanguage} from "./languageButton"
import {languageName} from "./languagePicker"
import {LL} from "./locale"

const highlight = "#ffd700"
const size = 44
// Beside the speaker button, which is 24 px in from the top right corner, 52 px across
// with its border and padding, with this much between them and each other
const gap = 12

let open = false
// Whether the settings panel's open, so the keyboard doesn't drive the scene behind it
const isSettingsOpen = () => open

// A row in the panel: what it's for, and what sets it
const row = (label: string, ...controls: HTMLElement[]) => {
  const line = document.createElement("div")
  Object.assign(line.style, {display: "flex", alignItems: "center", gap: "12px", minHeight: "44px"})
  const text = document.createElement("span")
  text.textContent = label
  Object.assign(text.style, {flex: "1", minWidth: "8em"})
  line.append(text, ...controls)
  return line
}

const slider = (label: string, value: number, onInput: (value: number) => void) => {
  const input = document.createElement("input")
  input.type = "range"
  input.min = "0"
  input.max = "1"
  input.step = "0.01"
  input.value = String(value)
  input.setAttribute("aria-label", label)
  Object.assign(input.style, {width: "min(160px, 30vw)", accentColor: highlight, cursor: "pointer"})
  input.addEventListener("input", () => onInput(Number(input.value)))
  return input
}

const switchFor = (label: string, on: boolean, onChange: (on: boolean) => void) => {
  const input = document.createElement("input")
  input.type = "checkbox"
  input.setAttribute("role", "switch")
  input.setAttribute("aria-label", label)
  input.checked = on
  Object.assign(input.style, {width: "24px", height: "24px", accentColor: highlight, cursor: "pointer", margin: "0"})
  input.addEventListener("change", () => onChange(input.checked))
  return input
}

const textButton = (text: string) => {
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = text
  Object.assign(button.style, {
    minHeight: "40px",
    padding: "4px 14px",
    borderRadius: "20px",
    border: `2px solid ${highlight}`,
    background: "#1a1a1a",
    color: highlight,
    fontFamily,
    fontSize: "18px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  })
  return button
}

// The buttons in the top right corner, left of the speaker: the language, named, and a
// gear that opens the settings: whether the music plays, and how loud it and the sound
// effects each are, a skip to the next track, and the language. Other settings are added
// to it as rows, after these
const createSettings = (audio: AudioControl, locale: Locales) => {
  const bar = document.createElement("div")
  Object.assign(bar.style, {
    position: "fixed",
    top: "24px",
    right: `${24 + size + 8 + gap}px`,
    // Under the speaker's volume slider, which opens out over them
    zIndex: "1",
    display: "flex",
    flexDirection: "row-reverse",
    gap: `${gap}px`,
  })

  const gear = document.createElement("button")
  gear.type = "button"
  gear.setAttribute("aria-label", LL.settings.open())
  gear.title = LL.settings.open()
  Object.assign(gear.style, {
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
  // A cog: a wheel with eight square teeth round it and a hole in its middle
  gear.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
    ${[0, 45, 90, 135, 180, 225, 270, 315].map(angle =>
      `<rect x="9.75" y="1" width="4.5" height="5" rx="1" fill="${highlight}" transform="rotate(${angle} 12 12)"/>`).join("")}
    <circle cx="12" cy="12" r="7.5" fill="${highlight}"/><circle cx="12" cy="12" r="3" fill="#1a1a1a"/></svg>`
  bar.append(createLanguageButton(locale), gear)
  document.body.appendChild(bar)

  const overlay = document.createElement("div")
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", LL.settings.open())
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    // Above the scene's hint badges and tooltips, under the notice to turn the phone sideways
    zIndex: "3",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.55)",
  })
  const panel = document.createElement("div")
  Object.assign(panel.style, {
    display: "flex",
    flexDirection: "column",
    gap: "min(10px, 2vh)",
    padding: "min(18px, 3vh) 22px",
    borderRadius: "16px",
    background: "rgba(26, 26, 26, 0.96)",
    border: "2px solid #555555",
    color: "#ffffff",
    fontFamily,
    fontSize: "20px",
    width: "min(440px, calc(100vw - 24px))",
    maxHeight: "calc(100vh - 24px)",
    boxSizing: "border-box",
    // Scrolls if the screen's too small for it all, so nothing's out of reach
    overflow: "auto",
  })
  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  const heading = document.createElement("div")
  Object.assign(heading.style, {display: "flex", alignItems: "center", justifyContent: "space-between"})
  const title = document.createElement("h2")
  title.textContent = LL.settings.open()
  Object.assign(title.style, {margin: "0", fontSize: "28px", fontWeight: "normal", color: highlight})
  const close = document.createElement("button")
  close.type = "button"
  close.textContent = "✕"
  close.setAttribute("aria-label", LL.settings.close())
  Object.assign(close.style, {
    width: "44px", height: "44px", borderRadius: "50%", border: "2px solid #bbbbbb",
    background: "#1a1a1a", color: "#bbbbbb", fontSize: "20px", lineHeight: "1", cursor: "pointer",
  })
  heading.append(title, close)

  const musicLevel = slider(LL.settings.musicVolume(), audio.musicLevel(), level => audio.setMusicLevel(level))
  const musicOn = switchFor(LL.settings.music(), audio.musicOn(), on => {
    audio.setMusicOn(on)
    musicLevel.disabled = !on
  })
  musicLevel.disabled = !audio.musicOn()
  const next = textButton(LL.settings.nextTrack())
  next.addEventListener("click", () => audio.nextTrack())
  const language = textButton(languageName(locale))
  language.addEventListener("click", () => {
    hide()
    void pickLanguage(locale)
  })
  const rows = document.createElement("div")
  Object.assign(rows.style, {display: "flex", flexDirection: "column", gap: "min(10px, 2vh)"})
  rows.append(
    row(LL.settings.music(), musicOn, musicLevel),
    row(LL.settings.effects(), slider(LL.settings.effects(), audio.effectsLevel(), level => audio.setEffectsLevel(level))),
    row("", next),
    row(LL.settings.language(), language),
  )
  panel.append(heading, rows)

  const show = () => {
    open = true
    overlay.style.display = "flex"
    close.focus()
  }
  const hide = () => {
    open = false
    overlay.style.display = "none"
  }
  gear.addEventListener("click", show)
  close.addEventListener("click", () => {
    hide()
    gear.focus()
  })
  // A tap outside the panel, or Escape, closes it too
  overlay.addEventListener("pointerdown", e => {
    if (e.target === overlay) {
      hide()
    }
  })
  window.addEventListener("keydown", e => {
    if (open && e.key === "Escape") {
      hide()
      gear.focus()
    }
  })

  return {
    // Adds a row to the panel, for a setting of its own
    addRow(label: string, ...controls: HTMLElement[]) {
      rows.appendChild(row(label, ...controls))
    },
    show,
    hide,
  }
}

type SettingsPanel = ReturnType<typeof createSettings>

export {createSettings, isSettingsOpen, switchFor, textButton}
export type {SettingsPanel}
