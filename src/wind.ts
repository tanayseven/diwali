import {Application} from "pixi.js"
import {sceneWidth} from "./background"

// A light breeze over the porch, never a storm: a gentle wind that wanders a little,
// and every so often a gust that sweeps across the scene from the side it blows from
// and dies away again. Speeds are in scene units a second, rightwards; a scene unit is
// about a centimetre and a half
const breeze = 18
const breezeWander = 8
// Each gust builds and fades over a few seconds, a while after the last
const gustPeak = {min: 45, max: 85}
const gustLength = {min: 2.5, max: 4.5}
const gustGap = {min: 5, max: 12}
// How fast a gust's front sweeps across the scene, so it reaches one side first
const frontSpeed = 650
// How likely the wind is to turn round with each gust
const turnChance = 0.2
const turnTime = 2
// The strongest it ever blows, for things to measure how hard it's blowing against
const strongest = breeze + breezeWander + gustPeak.max
// It's worked out once a frame at points this far apart across the scene, and
// anywhere between them is found from the nearest two, as thousands of sparks ask
const sampleSpacing = 40
const sampleCount = Math.ceil(sceneWidth / sampleSpacing) + 1

type Gust = {start: number, length: number, peak: number}

const random = (min: number, max: number) => min + (max - min) * Math.random()

// The wind, worked out as the scene's time goes by. Anything can ask how hard it's
// blowing at a point across the scene, now
const createWind = (app: Application) => {
  let time = 0
  // Which way it blows, 1 for rightwards and -1 for leftwards
  let direction = Math.random() < 0.5 ? 1 : -1
  // Turning round, it drops away and picks up again the other way over a few seconds
  let heading = direction
  const gusts: Gust[] = []
  let nextGust = random(2, gustGap.max)
  const samples = new Float32Array(sampleCount)

  const tick = () => {
    const dt = app.ticker.deltaMS / 1000
    time += dt
    heading += (direction - heading) * Math.min(1, dt / turnTime)
    if (time >= nextGust) {
      if (Math.random() < turnChance && gusts.length === 0) {
        direction = -direction
      }
      const length = random(gustLength.min, gustLength.max)
      gusts.push({start: time, length, peak: random(gustPeak.min, gustPeak.max)})
      nextGust = time + length + random(gustGap.min, gustGap.max)
    }
    // A gust is done once its tail has crossed the whole scene
    const crossing = sceneWidth / frontSpeed
    while (gusts.length && time > gusts[0].start + gusts[0].length + crossing) {
      gusts.shift()
    }
    for (let idx = 0; idx < sampleCount; idx++) {
      samples[idx] = blowing(idx * sampleSpacing)
    }
  }
  app.ticker.add(tick)

  // How far behind a gust's front a point across the scene is, in seconds
  const delayAt = (x: number) => (direction > 0 ? x : sceneWidth - x) / frontSpeed

  // The wind at a point across the scene, in scene units a second, rightwards
  function blowing(x: number) {
    const local = time - delayAt(x)
    let speed = breeze + breezeWander * Math.sin(time * 0.21 + Math.sin(time * 0.07) * 2)
    for (const gust of gusts) {
      const into = (local - gust.start) / gust.length
      if (into > 0 && into < 1) {
        // It swells and dies away smoothly, flickering a little at its height
        speed += gust.peak * Math.sin(Math.PI * into) ** 2 * (1 + 0.12 * Math.sin(local * 9 + x * 0.02))
      }
    }
    return heading * speed
  }

  return {
    strongest,
    // The wind at a point across the scene, in scene units a second, rightwards. Past
    // the scene's sides it's as it is at them
    at(x: number) {
      const at = Math.min(sampleCount - 1, Math.max(0, x / sampleSpacing))
      const idx = Math.min(sampleCount - 2, Math.floor(at))
      return samples[idx] + (samples[idx + 1] - samples[idx]) * (at - idx)
    },
    destroy() {
      app.ticker.remove(tick)
    },
  }
}

type Wind = ReturnType<typeof createWind>

export {createWind}
export type {Wind}
