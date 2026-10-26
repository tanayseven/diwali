import {Container, FederatedPointerEvent} from "pixi.js"
import {fontFamily} from "./app"

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
    window.addEventListener("pointerdown", hide)
    window.addEventListener("blur", hide)
  }
  return element
}

const hide = () => {
  owner = undefined
  describe = undefined
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

function onWindowPointerMove(e: PointerEvent) {
  if (!owner) {
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
// describing it as undefined shows none. Touch screens have no hover, so they get none
const addTooltip = (target: Container, describeTarget: () => Tooltip | undefined) => {
  const show = (e: FederatedPointerEvent) => {
    if (owner === target || e.pointerType !== "mouse" || e.buttons !== 0) {
      return
    }
    owner = target
    describe = describeTarget
    render()
    if (owner === target) {
      moveTo(e.clientX, e.clientY)
    }
  }
  target.on("pointerover", show)
  // Also on moving over it, as a drag that ends on it, such as pouring oil into a diya,
  // leaves the pointer already over it, so it's never entered afresh
  target.on("pointermove", show)
  target.on("pointerout", () => {
    if (owner === target) {
      hide()
    }
  })
}

export {addTooltip}
export type {Tooltip}
