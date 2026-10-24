// The app is laid out for landscape screens, so in portrait it's covered
// with a notice asking to rotate the device, which clears once rotated
const portrait = window.matchMedia("(orientation: portrait)")

const createPortraitWarning = () => {
  const overlay = document.createElement("div")
  overlay.setAttribute("role", "alert")
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "1",
    display: "none",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "24px",
    boxSizing: "border-box",
    background: "#000000",
    color: "#ffffff",
    fontFamily: "monospace",
    textAlign: "center",
  })

  // The icon is drawn in black, so it's used as a mask over a gold fill
  // to show up on the black background
  const icon = document.createElement("div")
  icon.setAttribute("aria-hidden", "true")
  const iconMask = "url(sprites/caution-mark.svg) center / contain no-repeat"
  Object.assign(icon.style, {
    width: "72px",
    height: "72px",
    flexShrink: "0",
    background: "#ffd700",
    mask: iconMask,
    webkitMask: iconMask,
  })

  const heading = document.createElement("p")
  heading.textContent = "Portrait mode isn't supported"
  Object.assign(heading.style, {margin: "0", fontSize: "24px", color: "#ffd700"})

  const message = document.createElement("p")
  message.textContent = "This app can't be shown in portrait mode. Please rotate your device to landscape mode to continue."
  Object.assign(message.style, {margin: "0", fontSize: "18px", lineHeight: "1.5", maxWidth: "420px"})

  overlay.append(icon, heading, message)
  document.body.appendChild(overlay)

  const update = () => {
    overlay.style.display = portrait.matches ? "flex" : "none"
  }
  portrait.addEventListener("change", update)
  update()

  return {isShown: () => portrait.matches}
}

export {createPortraitWarning}
