import {Application, Container, Rectangle} from "pixi.js"
import {fontFamily} from "./app"
import {LL} from "./locale"
import {pulseHints, setOutline} from "./outline"
import {hideTooltipFor, isHoverable, refreshTooltip, showTooltipBeside, Tooltip, tooltipFor} from "./tooltip"

const highlight = "#ffd700"
// The badge's size on screen, in CSS pixels
const badgeSize = 24
// Smaller than this on screen, in CSS pixels, a thing's zoomed too far out to have a
// badge, which would hide it
const leastSize = 14
// How far a press has to move to count as a drag, on screen, which hides the badges so
// they're not in the way of what's dragged
const dragSlop = 6

// Something placed in the scene that can still be finished, such as an unlit diya: a
// "?" badge shows on its corner and it's faintly outlined until it is. Its box is the
// part of it that's drawn, in its own coordinates, as its texture is padded round it
type Hint = {
  target: Container
  describe: () => Tooltip | undefined
  box: Rectangle
  badge?: HTMLButtonElement
  // Whether it's outlined as a hint now, so the outline's only changed when that does
  outlined: boolean
}

const hints: Hint[] = []
let canvas: HTMLCanvasElement | undefined
// Where a press on the scene began, and whether it's become a drag
let pressedAt: {x: number, y: number} | undefined
let dragging = false

// The badge's box on screen while it shows, for its tooltip to sit beside
const badgeBox = (hint: Hint) =>
  hint.badge && hint.badge.style.display !== "none" ? hint.badge.getBoundingClientRect() : undefined

const createBadge = (hint: Hint) => {
  const badge = document.createElement("button")
  badge.type = "button"
  badge.textContent = "?"
  badge.setAttribute("aria-label", LL.tooltip.hintButton())
  Object.assign(badge.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "2",
    width: `${badgeSize}px`,
    height: `${badgeSize}px`,
    padding: "0",
    borderRadius: "50%",
    border: `2px solid ${highlight}`,
    background: "rgba(26, 26, 26, 0.92)",
    color: highlight,
    fontFamily,
    fontSize: "16px",
    fontWeight: "bold",
    lineHeight: "1",
    cursor: "help",
    userSelect: "none",
    touchAction: "none",
    display: "none",
  })
  const open = (pin: boolean) => showTooltipBeside(hint.target, hint.describe, () => badgeBox(hint), {pin})
  // A press on it is its own, not the scene's, so it doesn't pan the scene, put the
  // matchstick away or close the tooltip it's about to open
  badge.addEventListener("pointerdown", e => e.stopPropagation())
  // A mouse shows its tooltip while it's over it. Touch screens have no hover, so a tap,
  // or a click, pins it open until something else is pressed
  badge.addEventListener("pointerenter", e => {
    // Even if what it's on already shows its own tooltip, from the pointer passing over
    // it on the way, as the badge's says what to do next
    if (e.pointerType === "mouse" && !tooltipFor(hint.target)?.pinned) {
      open(false)
    }
  })
  badge.addEventListener("pointerleave", e => {
    if (e.pointerType === "mouse" && tooltipFor(hint.target)?.pinned === false) {
      hideTooltipFor(hint.target)
    }
  })
  badge.addEventListener("click", () => {
    if (tooltipFor(hint.target)?.pinned) {
      hideTooltipFor(hint.target)
    } else {
      open(true)
    }
  })
  document.body.appendChild(badge)
  return badge
}

const forget = (hint: Hint) => {
  hideTooltipFor(hint.target)
  hint.badge?.remove()
  setOutline(hint.target, "hint", false)
  hints.splice(hints.indexOf(hint), 1)
}

// The part of it that's drawn, on screen, in CSS pixels from the page's top-left corner
const screenBox = (hint: Hint, view: DOMRect) => {
  const {x, y, width, height} = hint.box
  const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]]
    .map(([cx, cy]) => hint.target.toGlobal({x: cx, y: cy}))
  const xs = corners.map(point => point.x)
  const ys = corners.map(point => point.y)
  const left = view.left + Math.min(...xs)
  const top = view.top + Math.min(...ys)
  return {left, top, right: view.left + Math.max(...xs), bottom: view.top + Math.max(...ys)}
}

const update = () => {
  pulseHints(performance.now())
  const view = canvas!.getBoundingClientRect()
  const rtl = document.documentElement.dir === "rtl"
  ;[...hints].forEach(hint => {
    if (hint.target.destroyed) {
      forget(hint)
      return
    }
    // Only while it's in the scene and can be used, so not while it's dragged, has oil
    // poured into it, or burns
    const unfinished = isHoverable(hint.target) && hint.describe() !== undefined
    if (unfinished !== hint.outlined) {
      hint.outlined = unfinished
      setOutline(hint.target, "hint", unfinished)
    }
    let shown = unfinished && !dragging
    if (shown) {
      const box = screenBox(hint, view)
      const onScreen = box.right > 0 && box.left < window.innerWidth && box.bottom > 0 && box.top < window.innerHeight
      const bigEnough = Math.max(box.right - box.left, box.bottom - box.top) >= leastSize
      shown = onScreen && bigEnough
      if (shown) {
        hint.badge ??= createBadge(hint)
        // On its top corner, on the side lines of text end on
        const x = Math.round((rtl ? box.left : box.right) - badgeSize / 2)
        const y = Math.round(box.top - badgeSize / 2)
        const transform = `translate(${x}px, ${y}px)`
        if (hint.badge.style.transform !== transform) {
          hint.badge.style.transform = transform
        }
      }
    }
    if (hint.badge) {
      const display = shown ? "block" : "none"
      if (hint.badge.style.display !== display) {
        hint.badge.style.display = display
      }
    }
  })
  refreshTooltip()
}

const onPointerDown = (e: PointerEvent) => {
  pressedAt = {x: e.clientX, y: e.clientY}
}

const onPointerMove = (e: PointerEvent) => {
  if (pressedAt && e.buttons !== 0 && Math.hypot(e.clientX - pressedAt.x, e.clientY - pressedAt.y) > dragSlop) {
    dragging = true
  }
}

const onPointerUp = () => {
  pressedAt = undefined
  dragging = false
}

// Starts showing the hints, every frame, wherever what they're on has moved to
const startHints = (app: Application) => {
  canvas = app.canvas
  window.addEventListener("pointerdown", onPointerDown)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)
  window.addEventListener("blur", onPointerUp)
  app.ticker.add(update)
}

// Gives something placed in the scene a hint at what to do next with it, while
// describing it gives one. Once it's described as undefined, such as a diya once it's
// lit, it's finished, and the badge and outline go
const addHint = (target: Container, describe: () => Tooltip | undefined, box: Rectangle) => {
  hints.push({target, describe, box, outlined: false})
}

export {addHint, startHints}
