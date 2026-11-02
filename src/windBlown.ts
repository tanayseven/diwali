import {Application, Graphics, Particle, ParticleContainer} from "pixi.js"
import {quality} from "./app"
import type {Background} from "./background"
import type {Lighting} from "./lighting"
import {createShownParticles} from "./shownParticles"
import type {Wind} from "./wind"

// Leaves, and petals off the marigold and rose garlands, carried past the house on the
// wind: a few in a breeze, more in a gust. They're all one almond shape, tinted, and
// drawn longer for leaves and rounder for petals
const leafColours = [0x4f7a3a, 0x6b8f3a, 0x8a7a2a, 0x9a5a22]
const petalColours = [0xff9a1a, 0xffc21a, 0xe8456a, 0xf4efe0]
const petalShare = 0.6
// They show by moonlight, darker and bluer than by day
const moonlight = [0.82, 0.84, 0.95]
// Sizes along their length in scene units, about a third and a sixth of a diya
const leafLength = {min: 6, max: 9}
const petalLength = {min: 3.5, max: 5}
// How many set off a second as a share of the view's height, in a breeze and at a
// gust's height, and the most there are at once
const breezeRate = 0.3
const gustRate = 1.8
const most = Math.round(20 * quality.particleScale)
// How quickly they're carried along with the wind, a second, and how fast they fall
// and flutter as they go
const windPull = 1.6
const fallSpeed = {min: 10, max: 26}
const flutter = {speed: {min: 1.5, max: 3.5}, reach: 14}
// How far outside the view they set off from and are let go at, in scene units
const margin = 20

type Blown = {
  particle: Particle
  x: number
  y: number
  vx: number
  fall: number
  // Its flutter's speed and where it's got to, and how fast it spins and tumbles
  rate: number
  phase: number
  spin: number
  tumble: number
  length: number
  width: number
  age: number
}

const random = (min: number, max: number) => min + (max - min) * Math.random()
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const toBgr = (colour: number) => {
  const [r, g, b] = [colour >> 16, (colour >> 8) & 0xff, colour & 0xff]
    .map((channel, idx) => Math.round(channel * moonlight[idx]))
  return (b << 16) | (g << 8) | r
}

const createWindBlown = (app: Application, background: Background, lighting: Lighting, wind: Wind) => {
  const shape = new Graphics()
    .moveTo(0, 8)
    .quadraticCurveTo(16, -6, 32, 8)
    .quadraticCurveTo(16, 22, 0, 8)
    .fill(0xffffff)
  const texture = app.renderer.generateTexture({target: shape, resolution: 2})
  shape.destroy()
  const layer = new ParticleContainer({dynamicProperties: {position: true, vertex: true, rotation: true, color: true}})
  layer.eventMode = "none"
  // In front of the house and what's on the porch, by moonlight above the night
  layer.zIndex = lighting.aboveNight
  background.decorations.addChild(layer)
  const shown = createShownParticles(layer)
  const blown: Blown[] = []
  const free: Blown[] = []
  let owed = 0

  // One sets off from just outside the view, upwind of it, or from above it when
  // there's little wind to carry it in from the side
  const setOff = (along: number) => {
    const {view} = background
    const item = free.pop() ?? {
      particle: new Particle({texture, anchorX: 0.5, anchorY: 0.5}),
      x: 0, y: 0, vx: 0, fall: 0, rate: 0, phase: 0, spin: 0, tumble: 0, length: 0, width: 0, age: 0,
    }
    const fromAbove = Math.abs(along) < 30 || Math.random() < 0.25
    item.x = fromAbove ? random(view.left, view.right) : along > 0 ? view.left - margin : view.right + margin
    item.y = fromAbove ? view.top - margin : random(view.top, view.top + (view.bottom - view.top) * 0.8)
    item.vx = along
    item.fall = random(fallSpeed.min, fallSpeed.max)
    item.rate = random(flutter.speed.min, flutter.speed.max)
    item.phase = random(0, Math.PI * 2)
    item.spin = random(-3, 3)
    item.tumble = random(2, 6)
    const petal = Math.random() < petalShare
    item.length = petal ? random(petalLength.min, petalLength.max) : random(leafLength.min, leafLength.max)
    item.width = item.length * (petal ? 0.7 : 0.45)
    item.age = 0
    item.particle.rotation = random(0, Math.PI * 2)
    item.particle.color = toBgr(pick(petal ? petalColours : leafColours)) + (255 << 24)
    blown.push(item)
  }

  const tick = () => {
    const dt = Math.min(0.1, app.ticker.deltaMS / 1000)
    const {view} = background
    // More set off the harder it's blowing, and the more of the scene's on screen
    const middle = (view.left + view.right) / 2
    const along = wind.at(middle)
    const gust = Math.max(0, (Math.abs(along) - 25) / (wind.strongest - 25))
    owed += (breezeRate + gustRate * gust) * (view.bottom - view.top) / 200 * quality.particleScale * dt
    for (; owed >= 1; owed--) {
      if (blown.length < most) {
        setOff(along)
      }
    }
    for (let idx = blown.length - 1; idx >= 0; idx--) {
      const item = blown[idx]
      item.age += dt
      item.phase += item.rate * dt
      // Carried along with the wind, fluttering side to side and up and down as it falls
      item.vx += (wind.at(item.x) - item.vx) * Math.min(1, windPull * dt)
      item.x += (item.vx + Math.cos(item.phase) * flutter.reach) * dt
      item.y += (item.fall + Math.sin(item.phase * 2) * flutter.reach * 0.6) * dt
      if (!background.inView(item.x, item.y, margin * 2) || item.age > 30) {
        blown[idx] = blown[blown.length - 1]
        blown.pop()
        free.push(item)
        continue
      }
      const {particle} = item
      particle.x = item.x
      particle.y = item.y
      particle.rotation += item.spin * dt
      // Tumbling, it turns edge on and back
      particle.scaleX = item.length / texture.width
      particle.scaleY = item.width / texture.height * Math.cos(item.age * item.tumble)
      shown.show(particle)
    }
    shown.draw()
  }
  app.ticker.add(tick)

  return {
    destroy() {
      app.ticker.remove(tick)
      layer.destroy()
      texture.destroy(true)
    },
  }
}

export {createWindBlown}
