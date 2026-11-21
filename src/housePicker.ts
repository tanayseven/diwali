import {fontFamily} from "./app"
import {houses} from "./background"
import {LL} from "./locale"
import type {HouseName} from "./street"

const highlight = "#ffd700"
const storageKey = "diwali-house"
const fadeDuration = 400

// The house picked before, kept on the device, if it's still one of the street's
const savedHouse = (): HouseName | undefined => {
  try {
    const saved = localStorage.getItem(storageKey)
    return houses.find(({name}) => name === saved)?.name
  } catch {
    return undefined
  }
}

const saveHouse = (name: HouseName) => {
  try {
    localStorage.setItem(storageKey, name)
  } catch {
    // Picked again next time, then
  }
}

// Forgets the house picked, so it's picked again when the game next starts
const forgetHouse = () => {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // Nothing to forget
  }
}

// Shown at the start, the first time: every house on the street, drawn and named, in the
// order they stand in, to pick the player's own, which they decorate. The neighbours have
// decorated theirs already. Resolves with the one picked, and remembers it
const showHousePicker = () => new Promise<HouseName>(resolve => {
  const overlay = document.createElement("div")
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", LL.housePicker.heading())
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "3",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "min(12px, 2.5vh)",
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
  heading.textContent = LL.housePicker.heading()
  Object.assign(heading.style, {margin: "0", fontSize: "min(48px, 9vh)", fontWeight: "normal", lineHeight: "1.1", color: highlight})
  const hint = document.createElement("p")
  hint.textContent = LL.housePicker.hint()
  Object.assign(hint.style, {margin: "0", fontSize: "min(20px, 4.5vh)", lineHeight: "1.3", maxWidth: "640px", opacity: "0.9"})
  const grid = document.createElement("div")
  Object.assign(grid.style, {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "min(12px, 2vh)",
    width: "min(760px, 100%)",
  })
  const cards = houses.map(({name, url}) => {
    const card = document.createElement("button")
    card.type = "button"
    card.setAttribute("aria-label", LL.houses[name]())
    Object.assign(card.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
      padding: "8px 8px 6px",
      borderRadius: "14px",
      border: "2px solid #555555",
      background: "rgba(26, 26, 26, 0.85)",
      color: "#ffffff",
      fontFamily,
      fontSize: "min(20px, 4.5vh)",
      cursor: "pointer",
      minWidth: "0",
    })
    const picture = document.createElement("img")
    picture.src = url
    picture.alt = ""
    Object.assign(picture.style, {width: "100%", height: "min(110px, 17vh)", objectFit: "contain"})
    const label = document.createElement("span")
    label.textContent = LL.houses[name]()
    card.append(picture, label)
    const lightUp = (on: boolean) => {
      card.style.borderColor = on ? highlight : "#555555"
      label.style.color = on ? highlight : "#ffffff"
    }
    card.addEventListener("pointerenter", () => lightUp(true))
    card.addEventListener("pointerleave", () => lightUp(false))
    card.addEventListener("focus", () => lightUp(true))
    card.addEventListener("blur", () => lightUp(false))
    card.addEventListener("click", () => {
      saveHouse(name)
      cards.forEach(other => other.disabled = true)
      overlay.style.opacity = "0"
      setTimeout(() => {
        overlay.remove()
        resolve(name)
      }, fadeDuration)
    })
    grid.appendChild(card)
    return card
  })
  overlay.append(heading, hint, grid)
  document.body.appendChild(overlay)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = "1"
    cards[houses.findIndex(({name}) => name === "deepaNiwas")]?.focus()
  }))
})

export {forgetHouse, savedHouse, showHousePicker}
