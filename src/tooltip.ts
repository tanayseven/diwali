import {Container, FederatedPointerEvent} from "pixi.js"
import {fontFamily} from "./app"
import {setOutline} from "./outline"

type Tooltip = {
  title: string
  // Lines under the title, e.g. what state it's in and what can be done with it
  lines?: string[]
}

const highlight = "#ffd700"
// How far from the pointer it sits
const pointerOffset = 18
// Least space kept between it and the edges of the screen
const screenMargin = 8

// One tooltip for the whole app, as only one thing can be hovered at a time. It's an
// element over the canvas, like the speaker button, so its text stays crisp
let element: HTMLDivElement | undefined
// What it's showing for now, and how to describe that
let owner: Container | undefined
let describe: (() => Tooltip | undefined) | undefined
// What's outlined while its tooltip shows, as most things are
let outlinedNow: Container | undefined
// Where it sits when it's opened from a hint's badge rather than by hovering over what
// it's for: beside the badge, wherever that goes. A badge tapped or clicked keeps it
// open, pinned, until something else is pressed
let anchor: (() => DOMRect | undefined) | undefined
let pinned = false
// How to describe each thing given a tooltip, and whether to outline it, so one can be
// shown for it on its own
const describers = new WeakMap<Container, {describe: () => Tooltip | undefined, outline: boolean}>()
// Counts each time it's shown for something, or hidden, so a timer set to hide one
// that's shown for a while only hides that one, not another shown since
let opened = 0

// Touch screens have no hover, so a finger held still on something for a moment shows
// its tooltip instead, above the finger, pinned until the next press, as a hint's
// badge does. Moving the finger, as to drag something out, puts it away
const longPressTime = 450
const longPressSlop = 10
// How far above the finger it's kept, clear of the fingertip
const aboveFinger = 44
let longPress: {pointerId: number, x: number, y: number, timer?: number, shown: boolean} | undefined
// What the last press held long enough to show its tooltip was on, until the next press,
// so what a tap does there can be left undone, whether or not it's still showing
let longPressedOn: Container | undefined

const getElement = () => {
  if (!element) {
    element = document.createElement("div")
    Object.assign(element.style, {
      position: "fixed",
      left: "0",
      top: "0",
      zIndex: "2",
      maxWidth: "260px",
      padding: "8px 12px",
      borderRadius: "12px",
      background: "rgba(26, 26, 26, 0.92)",
      border: "2px solid #555555",
      color: "#ffffff",
      fontFamily,
      fontSize: "18px",
      lineHeight: "1.25",
      pointerEvents: "none",
      userSelect: "none",
      visibility: "hidden",
    })
    document.body.appendChild(element)
    window.addEventListener("pointermove", onWindowPointerMove)
    window.addEventListener("pointermove", onLongPressMove)
    window.addEventListener("pointerup", endLongPress)
    window.addEventListener("pointercancel", endLongPress)
    window.addEventListener("pointerdown", hide)
    // Any new press, by finger or mouse, starts afresh
    window.addEventListener("pointerdown", () => longPressedOn = undefined, true)
    window.addEventListener("blur", hide)
    window.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        hide()
      }
    })
  }
  return element
}

const hide = () => {
  opened++
  if (outlinedNow) {
    setOutline(outlinedNow, "hover", false)
    outlinedNow = undefined
  }
  owner = undefined
  describe = undefined
  anchor = undefined
  pinned = false
  if (element) {
    element.style.visibility = "hidden"
  }
}

// Something can only be hovered while it and everything it's inside are shown and
// take pointer events. Scenes switch these off as they close, which doesn't always
// tell the thing the pointer left it
const isHoverable = (target: Container) => {
  if (target.destroyed || !target.parent) {
    return false
  }
  for (let node: Container | null = target; node; node = node.parent) {
    if (node.destroyed || node.eventMode === "none" || !node.visible || node.alpha === 0) {
      return false
    }
  }
  return true
}

// Rewrites the text, as what it describes can change while it's hovered
const render = () => {
  const content = describe?.()
  if (!content) {
    hide()
    return
  }
  const el = getElement()
  el.replaceChildren()
  const title = document.createElement("div")
  title.textContent = content.title
  title.style.color = highlight
  title.style.fontSize = "22px"
  el.appendChild(title)
  content.lines?.forEach(text => {
    const line = document.createElement("div")
    line.textContent = text
    el.appendChild(line)
  })
  el.style.visibility = "visible"
}

// Beside the pointer, below and to the right, flipped to the other side near an edge
const moveTo = (x: number, y: number) => {
  const el = getElement()
  const {width, height} = el.getBoundingClientRect()
  let left = x + pointerOffset
  let top = y + pointerOffset
  if (left + width > window.innerWidth - screenMargin) {
    left = x - pointerOffset - width
  }
  if (top + height > window.innerHeight - screenMargin) {
    top = y - pointerOffset - height
  }
  el.style.transform = `translate(${Math.max(screenMargin, left)}px, ${Math.max(screenMargin, top)}px)`
}

// Beside a box, such as a hint's badge: below it, or above it near the bottom edge
const moveBeside = (box: DOMRect) => {
  const el = getElement()
  const {width, height} = el.getBoundingClientRect()
  const left = Math.min(box.left, window.innerWidth - screenMargin - width)
  let top = box.bottom + screenMargin
  if (top + height > window.innerHeight - screenMargin) {
    top = box.top - screenMargin - height
  }
  el.style.transform = `translate(${Math.max(screenMargin, left)}px, ${Math.max(screenMargin, top)}px)`
}

const showAnchored = () => {
  const box = anchor?.()
  if (!owner || !box || !isHoverable(owner)) {
    hide()
    return
  }
  render()
  if (owner) {
    moveBeside(box)
  }
}

// Held still long enough, the finger's press shows the tooltip of what it's on
const startLongPress = (target: Container, e: FederatedPointerEvent) => {
  getElement()
  endLongPress()
  const press = {pointerId: e.pointerId, x: e.clientX, y: e.clientY, shown: false, timer: undefined as number | undefined}
  press.timer = window.setTimeout(() => {
    press.timer = undefined
    if (longPress !== press || !isHoverable(target)) {
      return
    }
    longPressedOn = target
    showTooltipOf(target, () => new DOMRect(press.x - 20, press.y - aboveFinger, 40, window.innerHeight), {pin: true})
    press.shown = owner === target
  }, longPressTime)
  longPress = press
}
function onLongPressMove(e: PointerEvent) {
  if (!longPress || e.pointerId !== longPress.pointerId
    || Math.hypot(e.clientX - longPress.x, e.clientY - longPress.y) < longPressSlop) {
    return
  }
  const {shown} = longPress
  endLongPress()
  if (shown) {
    hide()
  }
}
// Lifting the finger leaves a tooltip it opened showing, to be read
function endLongPress() {
  if (longPress?.timer !== undefined) {
    clearTimeout(longPress.timer)
  }
  longPress = undefined
}

function onWindowPointerMove(e: PointerEvent) {
  // One opened from a badge stays by it, and is kept up to date by refreshTooltip
  if (!owner || anchor) {
    return
  }
  // Not while dragging, nor once what it's for is gone or can't be used
  if (e.buttons !== 0 || !isHoverable(owner)) {
    hide()
    return
  }
  render()
  if (owner) {
    moveTo(e.clientX, e.clientY)
  }
}

// Shows a tooltip beside the pointer while a mouse hovers over the target. It's
// described afresh as the pointer moves, so it follows changes to what it's for;
// describing it as undefined shows none. Touch screens have no hover, so they get none.
// While it shows, the target's outlined in yellow too, unless it's a button that has
// its own way of showing it's hovered
const addTooltip = (target: Container, describeTarget: () => Tooltip | undefined, {outline = true} = {}) => {
  describers.set(target, {describe: describeTarget, outline})
  target.on("pointerdown", e => {
    if (e.pointerType === "touch") {
      startLongPress(target, e)
    }
  })
  const show = (e: FederatedPointerEvent) => {
    // Nor while the pointer's over something on top of the canvas, such as a hint's
    // badge, which has its own
    if (owner === target || e.pointerType !== "mouse" || e.buttons !== 0
      || !(e.nativeEvent.target instanceof HTMLCanvasElement)) {
      return
    }
    hide()
    owner = target
    describe = describeTarget
    if (outline) {
      setOutline(target, "hover", true)
      outlinedNow = target
    }
    render()
    if (owner === target) {
      moveTo(e.clientX, e.clientY)
    }
  }
  target.on("pointerover", show)
  // Also on moving over it, as a drag that ends on it, such as pouring oil into a diya,
  // leaves the pointer already over it, so it's never entered afresh
  target.on("pointermove", show)
  // Not one shown beside it rather than by hovering, which a finger lifted off it on a
  // touch screen would otherwise put away as soon as it's shown
  target.on("pointerout", () => {
    if (owner === target && !anchor) {
      hide()
    }
  })
}

// Shows a tooltip for a target beside a box, such as a hint's badge, rather than the
// pointer, outlining the target so it's clear what it's for. Pinned, it stays until
// something else is pressed, as on a touch screen there's no hover to end
const showTooltipBeside = (target: Container, describeTarget: () => Tooltip | undefined,
  box: () => DOMRect | undefined, {pin = false, outline = true} = {}) => {
  hide()
  owner = target
  describe = describeTarget
  anchor = box
  pinned = pin
  if (outline) {
    setOutline(target, "hover", true)
    outlinedNow = target
  }
  showAnchored()
}

// Shows the tooltip given to something with addTooltip on its own, beside a box, by
// default the box round it on screen: pinned until the next press, or for a while
const showTooltipOf = (target: Container, box?: () => DOMRect | undefined, {pin = false, hideAfter = 0} = {}) => {
  const given = describers.get(target)
  if (!given || !isHoverable(target)) {
    return false
  }
  showTooltipBeside(target, given.describe, box ?? (() => {
    const {x, y, width, height} = target.getBounds().rectangle
    const canvas = document.querySelector("canvas")?.getBoundingClientRect()
    return new DOMRect(x + (canvas?.left ?? 0), y + (canvas?.top ?? 0), width, height)
  }), {pin, outline: given.outline})
  const opening = opened
  if (hideAfter > 0) {
    window.setTimeout(() => {
      if (opened === opening) {
        hide()
      }
    }, hideAfter)
  }
  return owner === target
}

// Whether the press that's just ended on a target was held long enough to show its
// tooltip, so it was to read it, not to do what a tap does
const wasLongPressed = (target: Container) => longPressedOn === target

// Whether a tooltip's showing for a target, and whether it's pinned open
const tooltipFor = (target: Container) =>
  owner === target ? {pinned} : undefined

// Hides the tooltip if it's showing for a target
const hideTooltipFor = (target: Container) => {
  if (owner === target) {
    hide()
  }
}

// Rewrites and moves a tooltip opened beside something, as what it describes changes
// and what it's beside moves, such as a swinging kandil. Called every frame
const refreshTooltip = () => {
  if (anchor) {
    showAnchored()
  }
}

export {addTooltip, hideTooltipFor, isHoverable, refreshTooltip, showTooltipBeside, showTooltipOf, tooltipFor, wasLongPressed}
export type {Tooltip}
