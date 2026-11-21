import {fontFamily} from "./app"
import {reduceFlashing, setReduceFlashing} from "./flashing"
import {createCautionIcon} from "./portraitWarning"
import {LL} from "./locale"

const fadeDuration = 800
// Long enough to read the message at a comfortable pace
const holdDuration = 5000
// The advice on sound is shorter, so it's held for less
const soundHoldDuration = 3500

// A full-screen splash with an icon, a heading and a message, that fades in over
// everything, holds, then fades out. Tapping or pressing a key once it's shown skips
// straight to the fade out, except on a control of its own, if it has one, which holds it
// for as long again instead. Resolves once it's gone
const showSplash = (iconUrl: string, heading: string, message: string, hold: number, control?: HTMLElement) => new Promise<void>(resolve => {
  const overlay = document.createElement("div")
  overlay.setAttribute("role", "alert")
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "24px",
    boxSizing: "border-box",
    background: "#000000",
    color: "#ffffff",
    fontFamily,
    textAlign: "center",
    opacity: "0",
    transition: `opacity ${fadeDuration}ms ease-in-out`,
  })

  const icon = createCautionIcon(96, iconUrl)
  // Shrink the icon and heading on short landscape phones so everything still fits
  icon.style.width = icon.style.height = "min(96px, 18vh)"

  const title = document.createElement("p")
  title.textContent = heading
  Object.assign(title.style, {margin: "0", fontSize: "min(80px, 16vh)", lineHeight: "1.1", color: "#ffd700"})

  const text = document.createElement("p")
  text.textContent = message
  Object.assign(text.style, {margin: "0", fontSize: "22px", lineHeight: "1.4", maxWidth: "600px"})

  overlay.append(icon, title, text)
  if (control) {
    overlay.appendChild(control)
  }
  document.body.appendChild(overlay)

  let holdTimer: number | undefined
  let fadingOut = false
  let shown = false
  // Its control doesn't skip it, and gives as long again to read it after
  control?.addEventListener("pointerdown", e => e.stopPropagation())
  control?.addEventListener("keydown", e => e.stopPropagation())
  control?.addEventListener("change", () => {
    if (shown && !fadingOut) {
      clearTimeout(holdTimer)
      holdTimer = setTimeout(fadeOut, hold)
    }
  })

  const fadeOut = () => {
    if (fadingOut) {
      return
    }
    fadingOut = true
    clearTimeout(holdTimer)
    window.removeEventListener("keydown", fadeOut)
    overlay.removeEventListener("pointerdown", fadeOut)
    overlay.style.opacity = "0"
    setTimeout(() => {
      overlay.remove()
      resolve()
    }, fadeDuration)
  }

  // Wait a frame so the browser sees opacity 0 first and actually transitions
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = "1"
    setTimeout(() => {
      window.addEventListener("keydown", fadeOut)
      overlay.addEventListener("pointerdown", fadeOut)
      holdTimer = setTimeout(fadeOut, hold)
      shown = true
    }, fadeDuration)
  }))
})

// A switch to reduce flashing, with what it does beside it, on the warning
const reduceFlashingSwitch = () => {
  const label = document.createElement("label")
  Object.assign(label.style, {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 18px",
    borderRadius: "24px",
    border: "2px solid #ffd700",
    color: "#ffd700",
    fontSize: "22px",
    cursor: "pointer",
  })
  const input = document.createElement("input")
  input.type = "checkbox"
  input.setAttribute("role", "switch")
  input.checked = reduceFlashing()
  Object.assign(input.style, {width: "24px", height: "24px", margin: "0", accentColor: "#ffd700", cursor: "pointer"})
  input.addEventListener("change", () => setReduceFlashing(input.checked))
  label.append(input, LL.settings.reduceFlashing())
  return label
}

// A photosensitivity warning, with the flashing-light symbol in place of the caution
// sign's "!", and a switch to reduce flashing
const showSplashWarning = () => showSplash(
  "sprites/caution-flasher.svg", LL.splashWarning.heading(), LL.splashWarning.message(), holdDuration, reduceFlashingSwitch())

// Advice to listen on headphones or stereo speakers, as sounds are heard from where
// they are in the scene
const showSoundSplash = () =>
  showSplash("sprites/headphones.svg", LL.soundSplash.heading(), LL.soundSplash.message(), soundHoldDuration)

export {showSoundSplash, showSplashWarning}
