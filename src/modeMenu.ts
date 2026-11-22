import {fontFamily} from "./app"
import {LL} from "./locale"

// How the game's played: decorating freely, or competing against the neighbours
type Mode = "free" | "tournament"

const highlight = "#ffd700"
const fadeDuration = 400
const trophyUrl = "sprites/icons/trophy.svg"
const freePlayUrl = "sprites/icons/diya.svg"

// Shown at the start, every time, after the splashes: free play, or a tournament against
// the neighbours, behind the trophy. Resolves with the one picked
const showModeMenu = () => new Promise<Mode>(resolve => {
  const overlay = document.createElement("div")
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", LL.modeMenu.heading())
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "3",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "min(20px, 4vh)",
    padding: "16px",
    boxSizing: "border-box",
    background: "radial-gradient(ellipse at 50% 120%, #4a1d10 0%, transparent 60%), linear-gradient(180deg, #0b1030, #1a1448 60%, #24112e)",
    color: "#ffffff",
    fontFamily,
    textAlign: "center",
    opacity: "0",
    transition: `opacity ${fadeDuration}ms ease-in-out`,
  })
  const heading = document.createElement("h1")
  heading.textContent = LL.modeMenu.heading()
  Object.assign(heading.style, {margin: "0", fontSize: "min(48px, 9vh)", fontWeight: "normal", lineHeight: "1.1", color: highlight})
  const row = document.createElement("div")
  Object.assign(row.style, {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "min(20px, 3vw)",
    width: "min(640px, 100%)",
  })

  // A big button with a picture, a name and a line on what it is
  const choice = (mode: Mode, icon: string, name: string, about: string) => {
    const card = document.createElement("button")
    card.type = "button"
    card.setAttribute("aria-label", name)
    Object.assign(card.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "min(8px, 1.5vh)",
      padding: "min(18px, 3.5vh) 12px",
      borderRadius: "18px",
      border: "2px solid #555555",
      background: "rgba(26, 26, 26, 0.85)",
      color: "#ffffff",
      fontFamily,
      cursor: "pointer",
      minWidth: "0",
    })
    const picture = document.createElement("img")
    picture.src = icon
    picture.alt = ""
    Object.assign(picture.style, {width: "min(96px, 20vh)", height: "min(96px, 20vh)", objectFit: "contain"})
    const label = document.createElement("span")
    label.textContent = name
    Object.assign(label.style, {fontSize: "min(28px, 6vh)", lineHeight: "1.1"})
    const line = document.createElement("span")
    line.textContent = about
    Object.assign(line.style, {fontSize: "min(16px, 3.6vh)", lineHeight: "1.3", opacity: "0.85"})
    card.append(picture, label, line)
    const lightUp = (on: boolean) => {
      card.style.borderColor = on ? highlight : "#555555"
      label.style.color = on ? highlight : "#ffffff"
    }
    card.addEventListener("pointerenter", () => lightUp(true))
    card.addEventListener("pointerleave", () => lightUp(false))
    card.addEventListener("focus", () => lightUp(true))
    card.addEventListener("blur", () => lightUp(false))
    card.addEventListener("click", () => {
      // Not a tap meant for the splash before, to skip it, landing here as it fades in
      if (performance.now() < readyAt) {
        return
      }
      card.disabled = true
      overlay.style.opacity = "0"
      setTimeout(() => {
        overlay.remove()
        resolve(mode)
      }, fadeDuration)
    })
    return card
  }

  const freePlay = choice("free", freePlayUrl, LL.modeMenu.freePlay(), LL.modeMenu.freePlayAbout())
  const tournament = choice("tournament", trophyUrl, LL.modeMenu.tournament(), LL.modeMenu.tournamentAbout())
  row.append(freePlay, tournament)
  // Taps only count once it's had time to fade in, timed from now
  const readyAt = performance.now() + fadeDuration
  overlay.append(heading, row)
  document.body.appendChild(overlay)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = "1"
    freePlay.focus()
  }))
})

export {freePlayUrl, showModeMenu, trophyUrl}
export type {Mode}
