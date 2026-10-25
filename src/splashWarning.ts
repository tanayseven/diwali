import {fontFamily} from "./app"
import {createCautionIcon} from "./portraitWarning"
import {LL} from "./locale"

const fadeDuration = 800
// Long enough to read the message at a comfortable pace
const holdDuration = 5000

// A photosensitivity warning that fades in over everything, holds, then fades out.
// Tapping or pressing a key once it's shown skips straight to the fade out.
// Resolves once it's gone
const showSplashWarning = () => new Promise<void>(resolve => {
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

  // The caution sign with the flashing-light symbol in place of its "!"
  const icon = createCautionIcon(96, "sprites/caution-flasher.svg")
  // Shrink the icon and heading on short landscape phones so everything still fits
  icon.style.width = icon.style.height = "min(96px, 18vh)"

  const heading = document.createElement("p")
  heading.textContent = LL.splashWarning.heading()
  Object.assign(heading.style, {margin: "0", fontSize: "min(80px, 16vh)", lineHeight: "1.1", color: "#ffd700"})

  const message = document.createElement("p")
  message.textContent = LL.splashWarning.message()
  Object.assign(message.style, {margin: "0", fontSize: "22px", lineHeight: "1.4", maxWidth: "600px"})

  overlay.append(icon, heading, message)
  document.body.appendChild(overlay)

  let holdTimer: number | undefined
  let fadingOut = false

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
      holdTimer = setTimeout(fadeOut, holdDuration)
    }, fadeDuration)
  }))
})

export {showSplashWarning}
