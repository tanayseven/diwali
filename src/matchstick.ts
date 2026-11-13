import {Application, Assets, Container, Graphics, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import {stereoPan, type createAudioControl} from "./audioControl"
import {screenBox} from "./overlap"

type AudioControl = ReturnType<typeof createAudioControl>

// A match from unlit, through striking and catching, to burning down and going out
const matchFrameUrls = [
  "1-unlit", "2-strike", "3-flare", "4-catch", "5-lit",
  "6-burning-25", "7-burning-50", "8-burning-75", "9-ember", "10-burnt-out",
].map(frame => `sprites/diya/matchstick-${frame}.svg`)
// Heard as a match catches and starts burning down
const matchSoundUrl = "audio/effects/matchstick-lit.mp3"
// The stick in its 200 x 320 canvas, cropped to fill a slot
const matchCrop = new Rectangle(88, 100, 24, 207)
// The match's head, by which it's held and put to a wick or a fuse
const matchCanvas = {width: 200, height: 320}
const matchHead = {x: 100 / matchCanvas.width, y: 110 / matchCanvas.height}
// Where a hand holds it, down its stick from the head, in its canvas's units
const matchGrip = {x: 0, y: 150}
// The match's length in scene units, a little shorter than a diya is wide
const matchSceneLength = 17.28
const matchScale = matchSceneLength / matchCrop.height
// Held tilted, with the stick leaning away from what it's lighting
const matchTilt = -0.45
// How long the match is held to a wick or a fuse before it catches, in ms: it's struck
// and plays out striking, flaring and catching over that time, until it's lit
const lightTime = 1000
const matchLitFrame = 4
// Then a fresh one's in hand at once, and the one that lit it is left where it was to
// burn down, a frame at a time, and fade away
const matchBurnFrame = 220
const matchFadeOut = 250
const burnEnd = (matchFrameUrls.length - 1 - matchLitFrame) * matchBurnFrame
// A match is only taken out of its slot once it's dragged this far, on screen
const dragSlop = 6
// The ring round the match's head that fills as it's held to something, on screen
const ringRadius = 22
const ringWidth = 4
const ringColour = 0xffd700

// While it's struck, the match is moved from the pointer to where its head's put to
// what it's lighting, closing this share of the way each ms, and back once it's lit or
// moved off
const settleRate = 1 / 60

// Something the match is held to: where on the stage its head's put to it, and how to
// light it
type Aim = {target: object, at: () => PointData, light: () => void}

// Things in the scene a held match can light, whichever bar it was taken from
type Lightable = {
  // What a match drawn in a box on screen touches that could be lit, picked out as
  // its target, or nothing
  aimAt: (box: Rectangle) => Aim | undefined
  // Stops picking out whatever was
  clearAim: () => void
}

// What the first that has anything the match touches has, and the rest stop picking
// anything out
const aimAt = (lightables: Lightable[], box: Rectangle) => {
  let aim: Aim | undefined
  for (const lightable of lightables) {
    if (aim) {
      lightable.clearAim()
    } else {
      aim = lightable.aimAt(box)
    }
  }
  return aim
}
const clearAims = (lightables: Lightable[]) => lightables.forEach(lightable => lightable.clearAim())

// A copy of the match just lit, left in its place to burn down and fade away on its own,
// below the fresh one in hand, and then let go of
const burnDown = (app: Application, lit: Sprite, at: Container) => {
  const parent = at.parent
  if (!parent) {
    return
  }
  const match = new Sprite(lit.texture)
  match.eventMode = "none"
  match.anchor.copyFrom(lit.anchor)
  match.rotation = lit.rotation
  match.scale.copyFrom(lit.scale)
  match.position.copyFrom(at.position)
  parent.addChildAt(match, parent.getChildIndex(at))

  let burnt = 0
  const tick = () => {
    // Gone already if whatever it was in was
    if (match.destroyed) {
      app.ticker.remove(tick)
      return
    }
    burnt += app.ticker.deltaMS
    match.texture = Assets.get<Texture>(matchFrameUrls[Math.min(matchFrameUrls.length - 1, matchLitFrame + Math.floor(burnt / matchBurnFrame))])
    match.alpha = burnt < burnEnd ? 1 : Math.max(0, 1 - (burnt - burnEnd) / matchFadeOut)
    if (burnt >= burnEnd + matchFadeOut) {
      app.ticker.remove(tick)
      // The frames are shared, so only the sprite goes
      match.destroy()
    }
  }
  app.ticker.add(tick)
}

// A matchstick to drag out of a HUD and light things in the scene with by holding it
// over them. Expects matchFrameUrls to have been loaded already
const createMatchstick = (app: Application, audio: AudioControl) => {
  const playSound = audio.createEffect(matchSoundUrl)

  return {
    // The HUD slot's item for it
    item: {url: matchFrameUrls[0], crop: matchCrop, rotation: Math.PI / 4},
    // Takes an unlit match in hand at a point on screen, held by its head. Touching
    // something it can light, it's struck, moved to put its head to it, and a ring round
    // its head fills as it flares and catches; moved off, it goes back to the pointer and
    // the ring holds where it's got to until it's touching something again. Once it's
    // full that thing's lit, and a fresh match is in hand straight away, back at the
    // pointer, ready for the next, while the one that lit it burns down and goes out
    // where it was. Told whenever it's moved, for whatever holds it to follow
    hold(at: PointData, onMoved?: () => void) {
      const container = new Container()
      container.eventMode = "none"
      container.position.copyFrom(at)
      // Where the pointer has it, whether or not it's been moved off it to be struck
      const pointer = new Point(at.x, at.y)
      const match = new Sprite(Assets.get<Texture>(matchFrameUrls[0]))
      match.anchor.set(matchHead.x, matchHead.y)
      match.rotation = matchTilt
      const ring = new Graphics()
      container.addChild(match, ring)

      let aim: Aim | undefined
      // Unlit and ready, or being struck and held to something
      let phase: "ready" | "striking" = "ready"
      // How far it's been struck, from 0 to 1
      let progress = 0

      const show = (frame: number) => {
        match.texture = Assets.get<Texture>(matchFrameUrls[frame])
      }
      const takeFresh = () => {
        phase = "ready"
        progress = 0
        show(0)
      }
      const drawRing = () => {
        ring.clear()
        if (phase === "striking") {
          ring.circle(0, 0, ringRadius).stroke({width: ringWidth + 2, color: 0x000000, alpha: 0.45})
          ring.arc(0, 0, ringRadius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
            .stroke({width: ringWidth, color: ringColour, cap: "round"})
        }
      }
      // Moves it towards where it's held to what it's lighting, or to the pointer
      const settle = (dt: number) => {
        const goal = phase === "striking" && aim
          ? (container.parent ? container.parent.toLocal(aim.at()) : aim.at())
          : pointer
        const dx = goal.x - container.x
        const dy = goal.y - container.y
        if (dx === 0 && dy === 0) {
          return
        }
        const step = Math.hypot(dx, dy) < 0.5 ? 1 : 1 - Math.exp(-dt * settleRate)
        container.position.set(container.x + dx * step, container.y + dy * step)
        onMoved?.()
      }
      const tick = () => {
        const dt = app.ticker.deltaMS
        if (phase === "ready" && aim) {
          phase = "striking"
          progress = 0
        }
        if (phase === "striking" && aim) {
          progress = Math.min(1, progress + dt / lightTime)
          show(1 + Math.min(matchLitFrame - 1, Math.floor(progress * matchLitFrame)))
          if (progress >= 1) {
            const {light} = aim
            show(matchLitFrame)
            burnDown(app, match, container)
            // Heard as the match left behind starts burning down, from where it is on
            // screen, and played out whatever happens to the match in hand
            playSound(stereoPan(container.x, app.screen.width))
            takeFresh()
            light()
          }
        }
        settle(dt)
        drawRing()
      }
      app.ticker.add(tick)

      return {
        container,
        // Moves it, and sizes it as the scene is shown, in screen pixels per scene unit
        moveTo(point: PointData, sceneScale: number) {
          pointer.copyFrom(point)
          match.scale.set(sceneScale * matchScale)
          if (phase !== "striking" || !aim) {
            container.position.copyFrom(point)
          }
        },
        // Where its stick is drawn on screen, as it would be at the pointer, for what
        // it's touching there
        box(): Rectangle {
          const {width, height} = match.texture
          const kx = width / matchCanvas.width
          const ky = height / matchCanvas.height
          const box = screenBox(match, new Rectangle(
            matchCrop.x * kx - match.anchor.x * width, matchCrop.y * ky - match.anchor.y * height,
            matchCrop.width * kx, matchCrop.height * ky,
          ))
          const from = container.parent ? container.parent.toGlobal(container.position) : container.position
          const to = container.parent ? container.parent.toGlobal(pointer) : pointer
          box.x += to.x - from.x
          box.y += to.y - from.y
          return box
        },
        // Where a hand holding it holds it, well away from its head, on the stage
        grip(): PointData {
          return match.toGlobal(matchGrip)
        },
        // What it's touching that it could light, and how to light it
        setAim(next: Aim | undefined) {
          aim = next
        },
        destroy() {
          app.ticker.remove(tick)
          container.destroy({children: true})
        },
      }
    },
  }
}

type HeldMatch = ReturnType<ReturnType<typeof createMatchstick>["hold"]>

// Whether a press has been dragged far enough to take something, by default the
// match out of its slot
const draggedFrom = (from: PointData, to: PointData, slop = dragSlop) => Math.hypot(to.x - from.x, to.y - from.y) >= slop

export {aimAt, clearAims, createMatchstick, draggedFrom, matchFrameUrls}
export type {Aim, HeldMatch, Lightable}
