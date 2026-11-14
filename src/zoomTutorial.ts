import {Container} from "pixi.js"
import {hideTooltipFor, showTooltipOf} from "./tooltip"

// The camera it moves, as the background has it, and how far in it is
type Camera = {zoomBy: (factor: number) => void, scale: () => number}

// How far it zooms in, and back out, a little at a time so it's smooth
const zoomSteps = 6
const zoomPerStep = 1.08
const stepEvery = 140
// Long enough for a zoom step that's under way to finish, in ms
const zoomEases = 250
// How long the fingers take to spread or pinch, and how long each way's held
const fingerMove = zoomSteps * stepEvery
const hold = 900
// How far apart the fingertips start and end, on screen, in CSS pixels
const together = 36
const apart = 150
const fingerSize = 34

// Shows, the first time the scene's shown, how to zoom: two fingertips over the middle
// of the screen spread apart as the camera zooms in, with the zoom in button saying
// what it does, then pinch together as it zooms back out, with the zoom out button.
// Any press, or scrolling or pinching a trackpad, ends it early, the camera put back as
// it was. Resolves when it's done
const showZoomTutorial = (camera: Camera, zoomIn: Container, zoomOut: Container) => new Promise<void>(resolve => {
  const layer = document.createElement("div")
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2",
    pointerEvents: "none",
  })
  const fingers = [-1, 1].map(side => {
    const finger = document.createElement("div")
    Object.assign(finger.style, {
      position: "absolute",
      left: "50%",
      top: "45%",
      width: `${fingerSize}px`,
      height: `${fingerSize}px`,
      margin: `${-fingerSize / 2}px 0 0 ${-fingerSize / 2}px`,
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.55)",
      border: "3px solid #ffd700",
      boxShadow: "0 0 12px rgba(255, 215, 0, 0.6)",
      transition: `transform ${fingerMove}ms ease-in-out, opacity 300ms`,
      opacity: "0",
    })
    layer.appendChild(finger)
    return {finger, side}
  })
  document.body.appendChild(layer)

  // Fingertips set apart by a distance, along a slant, as a thumb and finger would be
  const spread = (distance: number) => fingers.forEach(({finger, side}) => {
    finger.style.transform = `translate(${side * distance / 2}px, ${-side * distance / 4}px)`
  })

  const timers: number[] = []
  const after = (ms: number, then: () => void) => timers.push(window.setTimeout(then, ms))
  // How far in the camera was, to put it back to if it's ended early
  const startScale = camera.scale()
  let zoomed = false
  const zoom = (steps: number) => {
    for (let i = 0; i < Math.abs(steps); i++) {
      after(i * stepEvery, () => {
        camera.zoomBy(steps > 0 ? zoomPerStep : 1 / zoomPerStep)
        zoomed = true
      })
    }
  }

  let ended = false
  const end = () => {
    if (ended) {
      return
    }
    ended = true
    timers.forEach(timer => clearTimeout(timer))
    window.removeEventListener("pointerdown", end, true)
    window.removeEventListener("wheel", endByWheel, true)
    // Once any step under way has finished, back to as far in as it was, unless a
    // trackpad's taken the camera over, as a scroll or pinch does.
    // Any press or scroll before then takes the camera over, so it's left as it is
    if (zoomed && !byWheel) {
      const reset = window.setTimeout(() => {
        stopWaiting()
        camera.zoomBy(startScale / camera.scale())
      }, zoomEases)
      const takenOver = () => {
        clearTimeout(reset)
        stopWaiting()
      }
      const stopWaiting = () => {
        window.removeEventListener("pointerdown", takenOver, true)
        window.removeEventListener("wheel", takenOver, true)
      }
      window.addEventListener("pointerdown", takenOver, true)
      window.addEventListener("wheel", takenOver, true)
    }
    hideTooltipFor(zoomIn)
    hideTooltipFor(zoomOut)
    layer.style.transition = "opacity 300ms"
    layer.style.opacity = "0"
    window.setTimeout(() => layer.remove(), 300)
    resolve()
  }
  let byWheel = false
  const endByWheel = () => {
    byWheel = true
    end()
  }
  window.addEventListener("pointerdown", end, true)
  window.addEventListener("wheel", endByWheel, true)

  // Shown together, then spread apart as it zooms in
  spread(together)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    // Not if it's been ended already, in the moment before
    if (ended) {
      return
    }
    fingers.forEach(({finger}) => finger.style.opacity = "1")
    after(300, () => {
      showTooltipOf(zoomIn)
      spread(apart)
      zoom(zoomSteps)
    })
    // Then pinched together as it zooms back out
    after(300 + fingerMove + hold, () => {
      hideTooltipFor(zoomIn)
      showTooltipOf(zoomOut)
      spread(together)
      zoom(-zoomSteps)
    })
    after(300 + 2 * fingerMove + hold, end)
  }))
})

export {showZoomTutorial}
