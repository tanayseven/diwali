import {Application, Assets, Container, Graphics, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import {stereoPan, type createAudioControl} from "./audioControl"

type AudioControl = ReturnType<typeof createAudioControl>

// A match from unlit, through striking and catching, to burning down and going out
const matchFrameUrls = [
  "1-unlit", "2-strike", "3-flare", "4-catch", "5-lit",
  "6-burning-25", "7-burning-50", "8-burning-75", "9-ember", "10-burnt-out",
].map(frame => `sprites/diya/matchstick-${frame}.svg`)
// Heard as a match is struck
const matchSoundUrl = "audio/effects/matchstick-lit.mp3"
// The stick in its 200 x 320 canvas, cropped to fill a slot
const matchCrop = new Rectangle(88, 100, 24, 207)
// The match's head, by which it's held and put to a wick or a fuse
const matchCanvas = {width: 200, height: 320}
const matchHead = {x: 100 / matchCanvas.width, y: 110 / matchCanvas.height}
// The match's length in scene units, a little shorter than a diya is wide
const matchSceneLength = 17.28
const matchScale = matchSceneLength / matchCrop.height
// Held tilted, with the stick leaning away from what it's lighting
const matchTilt = -0.45
// How long the match is held to a wick or a fuse before it catches, in ms: it's struck
// and plays out striking, flaring and catching over that time, until it's lit
const lightTime = 1000
const matchLitFrame = 4
// Then it burns down, a frame at a time, and fades away, and a fresh one's in hand
const matchBurnFrame = 220
const matchFadeOut = 250
const burnEnd = (matchFrameUrls.length - 1 - matchLitFrame) * matchBurnFrame
// A match is only taken out of its slot once it's dragged this far, on screen
const dragSlop = 6
// The ring round the match's head that fills as it's held to something, on screen
const ringRadius = 22
const ringWidth = 4
const ringColour = 0xffd700

type Aim = {target: object, light: () => void}

// A matchstick to drag out of a HUD and light things in the scene with by holding it
// over them. Expects matchFrameUrls to have been loaded already
const createMatchstick = (app: Application, audio: AudioControl) => {
  const playSound = audio.createEffect(matchSoundUrl)

  return {
    // The HUD slot's item for it
    item: {url: matchFrameUrls[0], crop: matchCrop, rotation: Math.PI / 4},
    // Takes an unlit match in hand at a point on screen, held by its head. Over
    // something it can light, it's struck, and a ring round its head fills as it flares
    // and catches; moved off, the ring holds where it's got to until it's over something
    // again. Once it's full that thing's lit, and the match burns down and goes out in
    // hand, and a fresh one takes its place
    hold(at: PointData) {
      const container = new Container()
      container.eventMode = "none"
      container.position.copyFrom(at)
      const match = new Sprite(Assets.get<Texture>(matchFrameUrls[0]))
      match.anchor.set(matchHead.x, matchHead.y)
      match.rotation = matchTilt
      const ring = new Graphics()
      container.addChild(match, ring)

      let aim: Aim | undefined
      // Unlit and ready, being struck and held to something, or burning down after
      // lighting it
      let phase: "ready" | "striking" | "burning" = "ready"
      // How far it's been struck, from 0 to 1, or how long it's burnt since, in ms
      let progress = 0
      let burnt = 0
      let strikeSound: ReturnType<typeof playSound> | undefined

      const show = (frame: number) => {
        match.texture = Assets.get<Texture>(matchFrameUrls[frame])
      }
      const takeFresh = () => {
        phase = "ready"
        progress = 0
        match.alpha = 1
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
      const tick = () => {
        const dt = app.ticker.deltaMS
        if (phase === "ready" && aim) {
          phase = "striking"
          progress = 0
          // Heard from where it's struck on screen
          strikeSound = playSound(stereoPan(container.x, app.screen.width))
        }
        if (phase === "striking" && aim) {
          progress = Math.min(1, progress + dt / lightTime)
          show(1 + Math.min(matchLitFrame - 1, Math.floor(progress * matchLitFrame)))
          if (progress >= 1) {
            const {light} = aim
            phase = "burning"
            burnt = 0
            strikeSound = undefined
            light()
          }
        } else if (phase === "burning") {
          burnt += dt
          show(Math.min(matchFrameUrls.length - 1, matchLitFrame + Math.floor(burnt / matchBurnFrame)))
          match.alpha = burnt < burnEnd ? 1 : Math.max(0, 1 - (burnt - burnEnd) / matchFadeOut)
          if (burnt >= burnEnd + matchFadeOut) {
            takeFresh()
          }
        }
        drawRing()
      }
      app.ticker.add(tick)

      return {
        container,
        // Moves it, and sizes it as the scene is shown, in screen pixels per scene unit
        moveTo(point: PointData, sceneScale: number) {
          container.position.copyFrom(point)
          match.scale.set(sceneScale * matchScale)
        },
        // What it's over that it could light, and how to light it
        setAim(next: Aim | undefined) {
          aim = next
        },
        destroy() {
          strikeSound?.stop()
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

export {createMatchstick, draggedFrom, matchFrameUrls}
export type {HeldMatch}
