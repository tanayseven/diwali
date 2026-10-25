import {Application, Assets, Container, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import type {createAudioControl} from "./audioControl"

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
// How long each frame of the match shows while striking (unlit to lit), and then
// while burning down to burnt out, before it fades away
const matchStrikeFrame = 140
const matchBurnFrame = 220
const matchLitFrame = 4
const matchFadeOut = 250

// A matchstick to drag out of a HUD and strike against something in the scene.
// Expects matchFrameUrls to have been loaded already
const createMatchstick = (app: Application, audio: AudioControl) => {
  const playSound = audio.createEffect(matchSoundUrl)

  return {
    // The HUD slot's item for it
    item: {url: matchFrameUrls[0], crop: matchCrop, rotation: Math.PI / 4},
    // How many scene units a pixel of its drawing spans
    scale: matchScale,
    // An unlit match, held by its head, to drag around
    createSprite() {
      const sprite = new Sprite(Assets.get<Texture>(matchFrameUrls[0]))
      sprite.anchor.set(matchHead.x, matchHead.y)
      sprite.rotation = matchTilt
      return sprite
    },
    // Strikes a match with its head at a point in a layer of the scene, with the sound
    // of it: it plays out striking and catching, calling onLit as it catches, then burns
    // down and fades away, calling onDone once it's gone
    strike(layer: Container, at: PointData, zIndex: number, onLit: () => void, onDone: () => void) {
      const match = new Sprite(Assets.get<Texture>(matchFrameUrls[1]))
      match.anchor.set(matchHead.x, matchHead.y)
      match.scale.set(matchScale)
      match.rotation = matchTilt
      match.position.copyFrom(at)
      match.zIndex = zIndex
      match.eventMode = "none"
      layer.addChild(match)
      playSound()
      // Striking runs from the strike frame up to lit, then burning from there to the end
      const strikeEnd = (matchLitFrame - 1) * matchStrikeFrame
      const burnEnd = strikeEnd + (matchFrameUrls.length - 1 - matchLitFrame) * matchBurnFrame
      let elapsed = 0
      let lit = false
      const tick = () => {
        elapsed += app.ticker.deltaMS
        const frame = elapsed < strikeEnd
          ? 1 + Math.floor(elapsed / matchStrikeFrame)
          : Math.min(matchFrameUrls.length - 1, matchLitFrame + Math.floor((elapsed - strikeEnd) / matchBurnFrame))
        match.texture = Assets.get<Texture>(matchFrameUrls[frame])
        if (!lit && frame >= matchLitFrame) {
          lit = true
          onLit()
        }
        match.alpha = elapsed < burnEnd ? 1 : Math.max(0, 1 - (elapsed - burnEnd) / matchFadeOut)
        if (elapsed >= burnEnd + matchFadeOut) {
          app.ticker.remove(tick)
          match.destroy()
          onDone()
        }
      }
      app.ticker.add(tick)
    },
  }
}

export {createMatchstick, matchFrameUrls}
