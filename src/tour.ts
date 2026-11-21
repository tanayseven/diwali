import {Application, Container, PointData, Sprite} from "pixi.js"
import {fontFamily} from "./app"
import type {Background} from "./background"
import {LL} from "./locale"
import {setOutline} from "./outline"
import {onProgress, Progress} from "./progress"
import {createTouchMarker} from "./touchMarker"

const highlight = "#ffd700"
// The hand shows each step: fading in on what to take, dragging it to where it goes,
// pausing there and fading away, each over this long, in ms, then again after this
// long, unless the player's pressed something since, when it waits that long from then
const demoFadeIn = 400
const demoMove = 1200
const demoHold = 500
const demoFadeOut = 400
const demoEvery = 5500
const demoIdle = 4000
// What the hand's finger is held from what it's dragging, as when a finger drags
const lift = 64

type Tool = "diyas" | "fireworks" | "kandil" | "decorate" | "rangoli"

// What the tour needs of the game: the tool in use, the rail's buttons and the bars'
// slots, to point to, and the diyas placed, to show the next step on the latest one
type TourGame = {
  app: Application
  background: Background
  selected: () => Tool
  select: (tool: Tool) => void
  railButton: (tool: Tool) => Container | undefined
  slot: (tool: Tool, idx: number) => Container | undefined
  lastDiya: () => PointData | undefined
}

type Step = {
  text: () => string
  // What to outline while it's the step
  outlined: () => (Container | undefined)[]
  // What the hand drags, from a slot to a point in the scene, if anything
  demo?: () => {from: Container | undefined, to: PointData | undefined}
  // Whether it's done: by something the player does, or by how the game is now
  doneBy?: Progress
  doneWhen?: () => boolean
}

// Where something's shown on the porch, in the scene: the middle of the player's porch
const porchMiddleOf = (background: Background): PointData => {
  const {porch} = background.houses[background.home()]
  return {x: porch.reduce((sum, p) => sum + p.x, 0) / porch.length, y: porch.reduce((sum, p) => sum + p.y, 0) / porch.length}
}

let running: (() => void) | undefined
const isTourRunning = () => running !== undefined

// A guided first run: a card at the top of the screen says what to do, one step at a
// time, what to use is outlined, and a hand shows how, until the player's done it: a
// diya put on the porch, a wick and oil in it and it lit with the match, the fireworks
// picked, and an anar put down and lit. Then the other tools are pointed out. Skip ends
// it at any point. Resolves once it's over, either way
const runTour = (game: TourGame) => new Promise<void>(resolve => {
  running?.()
  const {app, background} = game
  const steps: Step[] = [
    {
      text: () => LL.tour.diya(),
      outlined: () => [game.slot("diyas", 0)],
      demo: () => ({from: game.slot("diyas", 0), to: porchMiddleOf(background)}),
      doneBy: "diyaPlaced",
    },
    {
      text: () => LL.tour.lightDiya(),
      outlined: () => [1, 2, 3].map(idx => game.slot("diyas", idx)),
      demo: () => ({from: game.slot("diyas", 1), to: game.lastDiya()}),
      doneBy: "diyaLit",
    },
    {
      text: () => LL.tour.pickFireworks(),
      outlined: () => [game.railButton("fireworks")],
      doneWhen: () => game.selected() === "fireworks",
    },
    {
      text: () => LL.tour.firework(),
      outlined: () => [game.slot("fireworks", 0), game.slot("fireworks", 5)],
      demo: () => ({from: game.slot("fireworks", 0), to: porchMiddleOf(background)}),
      doneBy: "fireworkLit",
    },
    {
      text: () => LL.tour.more(),
      outlined: () => (["kandil", "decorate", "rangoli"] as const).map(tool => game.railButton(tool)),
    },
  ]

  // The card: what to do, which step of how many, and Skip, or Done on the last
  const card = document.createElement("div")
  card.setAttribute("role", "status")
  Object.assign(card.style, {
    position: "fixed",
    top: "12px",
    // Clear of the rail on the left, and the buttons in the top right
    left: "104px",
    width: "min(460px, calc(100vw - 104px - 320px))",
    minWidth: "240px",
    zIndex: "2",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px 10px 16px",
    boxSizing: "border-box",
    borderRadius: "14px",
    background: "rgba(26, 26, 26, 0.94)",
    border: `2px solid ${highlight}`,
    color: "#ffffff",
    fontFamily,
    fontSize: "19px",
    lineHeight: "1.25",
  })
  const words = document.createElement("div")
  Object.assign(words.style, {flex: "1"})
  const counter = document.createElement("div")
  Object.assign(counter.style, {color: highlight, fontSize: "15px", marginBottom: "2px"})
  const text = document.createElement("div")
  words.append(counter, text)
  const skip = document.createElement("button")
  skip.type = "button"
  Object.assign(skip.style, {
    minHeight: "40px",
    padding: "4px 14px",
    borderRadius: "20px",
    border: `2px solid ${highlight}`,
    background: "#1a1a1a",
    color: highlight,
    fontFamily,
    fontSize: "17px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flex: "none",
  })
  card.append(words, skip)
  document.body.appendChild(card)

  // The hand, and what it drags, over everything
  const layer = new Container()
  layer.eventMode = "none"
  layer.sortableChildren = true
  const hand = createTouchMarker()
  const ghost = new Sprite()
  ghost.anchor.set(0.5)
  layer.addChild(ghost, hand.marker, hand.front)
  app.stage.addChild(layer)

  let at = -1
  let outlined: Container[] = []
  // When the hand last started, and when the player last pressed anything
  let demoAt = -Infinity
  let pressedAt = -Infinity
  let demo: {from: PointData, to: PointData, started: number} | undefined

  const stopDemo = () => {
    demo = undefined
    ghost.visible = false
    hand.hide()
  }

  const show = (idx: number) => {
    outlined.forEach(target => !target.destroyed && setOutline(target, "ready", false))
    stopDemo()
    at = idx
    if (at >= steps.length) {
      finish()
      return
    }
    const step = steps[at]
    counter.textContent = `${at + 1} / ${steps.length}`
    text.textContent = step.text()
    skip.textContent = at === steps.length - 1 ? LL.tour.done() : LL.tour.skip()
    outlined = step.outlined().filter(target => target !== undefined)
    outlined.forEach(target => setOutline(target, "ready", true))
    demoAt = -Infinity
  }

  // Starts the hand going, if the step has something to show and it's on screen
  const startDemo = (now: number) => {
    const shown = steps[at]?.demo?.()
    if (!shown?.from || !shown.to || shown.from.destroyed) {
      return
    }
    const icon = shown.from.children.find(child => child instanceof Sprite) as Sprite | undefined
    const to = background.decorations.toGlobal(shown.to)
    if (!icon || to.x < 0 || to.y < 0 || to.x > app.screen.width || to.y > app.screen.height) {
      return
    }
    ghost.texture = icon.texture
    ghost.scale.set(Math.hypot(icon.worldTransform.a, icon.worldTransform.b))
    ghost.rotation = icon.rotation
    demo = {from: shown.from.getGlobalPosition(), to, started: now}
    demoAt = now
  }

  const ease = (t: number) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
  const tick = () => {
    const now = performance.now()
    const step = steps[at]
    if (step?.doneWhen?.()) {
      show(at + 1)
      return
    }
    if (!demo && now - demoAt > demoEvery && now - pressedAt > demoIdle) {
      startDemo(now)
    }
    if (!demo) {
      return
    }
    const elapsed = now - demo.started
    const {from, to} = demo
    let shownAt: PointData = from
    let alpha = 1
    if (elapsed < demoFadeIn) {
      alpha = elapsed / demoFadeIn
    } else if (elapsed < demoFadeIn + demoMove) {
      const t = ease((elapsed - demoFadeIn) / demoMove)
      shownAt = {x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t}
    } else if (elapsed < demoFadeIn + demoMove + demoHold) {
      shownAt = to
    } else if (elapsed < demoFadeIn + demoMove + demoHold + demoFadeOut) {
      shownAt = to
      alpha = 1 - (elapsed - demoFadeIn - demoMove - demoHold) / demoFadeOut
    } else {
      stopDemo()
      return
    }
    ghost.visible = true
    ghost.position.copyFrom(shownAt)
    hand.follow({x: shownAt.x + lift, y: shownAt.y + lift}, "touch")
    layer.alpha = alpha
  }

  // A press by the player puts the hand away, to let them get on with it
  const onPress = () => {
    pressedAt = performance.now()
    stopDemo()
  }
  const stopProgress = onProgress(done => {
    if (steps[at]?.doneBy === done) {
      show(at + 1)
    }
  })

  const finish = () => {
    outlined.forEach(target => !target.destroyed && setOutline(target, "ready", false))
    outlined = []
    app.ticker.remove(tick)
    window.removeEventListener("pointerdown", onPress, true)
    stopProgress()
    layer.destroy({children: true})
    card.remove()
    running = undefined
    resolve()
  }
  running = finish
  skip.addEventListener("pointerdown", e => e.stopPropagation())
  skip.addEventListener("click", finish)
  window.addEventListener("pointerdown", onPress, true)
  app.ticker.add(tick)

  // From the diyas, as the first steps are theirs
  if (game.selected() !== "diyas") {
    game.select("diyas")
  }
  show(0)
})

export {isTourRunning, runTour}
