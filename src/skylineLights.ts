import {Application, Container, Particle, ParticleContainer, Rectangle} from "pixi.js"
import {quality} from "./app"
import {Background, scenery} from "./background"
import {lightColours} from "./fairyLights"
import {paint, toBgr} from "./fireworks"
import {Lighting, radialTexture} from "./lighting"

// Strings of fairy lights on every one of the city's buildings, too far off to make out
// more than a glowing dot per bulb. Everything here is in the skyline drawings' units
// Each bulb's dot, and how far apart they're strung
const bulbSize = 3
const bulbSpacing = 5
// A bulb fades on and off again over this many seconds, never quite going out, so the
// string still shows between
const blinkPeriod = {min: 1.1, max: 1.6}
const dimLevel = 0.3
// Their colours are worked out afresh this often, in seconds, which is smooth enough
// for a blink this slow and spares redoing thousands of bulbs every frame
const repaintEvery = quality.lightRepaintEvery
// Curtains hang strands this far apart down a building's front, each reaching between
// these shares of the way down it
const strandGap = 7
const strandReach = {min: 0.35, max: 0.9}
// Swags hang in loops this wide along the top of a building, sagging this much
const swagWidth = 18
const swagSag = 5
// In a chase, the lights run along the string this many bulbs to a blink, and in a
// cascade they run down a curtain's strands this far to a blink
const chaseLength = 6
const cascadeLength = 40
// Some buildings' bulbs are all one colour, the rest every colour in turn
const singleColourShare = 0.5
// Some buildings' bulbs twinkle each on their own instead of chasing
const twinkleShare = 0.3

type Building = {left: number, right: number, top: number, bottom: number}

type Bulb = {
  particle: Particle
  x: number
  y: number
  // Its colour, swapped ready to paint
  colour: number
  // How far through its blink it starts, and how long its blink is
  phase: number
  period: number
}

const random = (min: number, max: number) => min + (max - min) * Math.random()
const between = (range: {min: number, max: number}) => random(range.min, range.max)
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]

// Each building's walls in a skyline drawing
const buildingsIn = (svg: Document): Building[] => [...svg.querySelectorAll('g[data-name="Building"]')].flatMap(building => {
  const [left = 0, top = 0] = (building.getAttribute("transform")?.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  const body = building.querySelector('rect[data-name="Body"]')
  if (!body) {
    return []
  }
  const x = left + Number(body.getAttribute("x") ?? 0)
  const y = top + Number(body.getAttribute("y") ?? 0)
  return [{left: x, right: x + Number(body.getAttribute("width")), top: y, bottom: y + Number(body.getAttribute("height"))}]
})

// Points spaced evenly along a straight run
const along = (x1: number, y1: number, x2: number, y2: number) => {
  const count = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / bulbSpacing))
  return Array.from({length: count + 1}, (_, idx) => ({x: x1 + (x2 - x1) * idx / count, y: y1 + (y2 - y1) * idx / count}))
}

// Where a building's bulbs go, each string's in order along it: strands hanging down
// its front, its outline along the top and down its sides, or loops along its top
const stringsOn = (building: Building, style: "curtain" | "outline" | "swags") => {
  const {left, right, top, bottom} = building
  const height = bottom - top
  if (style === "curtain") {
    const count = Math.max(2, Math.floor((right - left) / strandGap))
    return Array.from({length: count}, (_, idx) => {
      const x = left + (right - left) * (idx + 0.5) / count
      return along(x, top + 1, x, top + height * between(strandReach))
    })
  }
  if (style === "outline") {
    return [[...along(left, bottom, left, top), ...along(left, top, right, top).slice(1), ...along(right, top, right, bottom).slice(1)]]
  }
  const loops = Math.max(1, Math.round((right - left) / swagWidth))
  const width = (right - left) / loops
  const perLoop = Math.max(3, Math.round(width / bulbSpacing))
  return [Array.from({length: loops * perLoop + 1}, (_, idx) => {
    const t = (idx % perLoop) / perLoop
    return {x: left + idx * width / perLoop, y: top + 1 + swagSag * 4 * t * (1 - t)}
  })]
}

// The far layer's bulbs are smaller and fainter, as they're further off
const farOff = {size: 0.75, brightness: 0.7}

// Fairy lights strung on every building in a layer of the skyline, fading on and off in
// chases, cascades and twinkles. They're drawn over the night, as they shine, but
// hidden wherever the hills or the house stand in front of them, and the far layer's
// wherever a building in the near one does
const createSkylineLights = (
  app: Application, background: Background, lighting: Lighting, svg: Document,
  {skyline = background.skyline, inFront = []}: {skyline?: Container, inFront?: Building[]} = {},
) => {
  const buildings = buildingsIn(svg)
  const far = skyline !== background.skyline
  const size = bulbSize * (far ? farOff.size : 1)
  const brightness = far ? farOff.brightness : 1

  const bulbTexture = radialTexture(16, [[0, 1], [0.25, 1], [0.5, 0.35], [1, 0]])
  // Nothing about the bulbs changes every frame, so their colours are only sent to be
  // drawn when they're repainted
  const layer = new ParticleContainer({dynamicProperties: {position: false, color: false}})
  layer.blendMode = "add"
  layer.boundsArea = new Rectangle(-200, 0, 2960, 420)
  layer.position.copyFrom(skyline.position)
  layer.scale.copyFrom(skyline.scale)
  layer.zIndex = lighting.aboveNight
  layer.eventMode = "none"
  background.decorations.addChild(layer)

  const palette = Object.values(lightColours)
  // Each building's bulbs, so a whole building off screen can be passed over at once
  const strung = buildings.map(building => ({building, bulbs: [] as Bulb[]}))
  strung.forEach(({building, bulbs}) => {
    const style = pick(["curtain", "outline", "swags"] as const)
    const single = Math.random() < singleColourShare ? pick(palette) : undefined
    const twinkles = Math.random() < twinkleShare
    const period = between(blinkPeriod)
    stringsOn(building, style).forEach(points => points.forEach((point, idx) => {
      const particle = new Particle({
        texture: bulbTexture, x: point.x, y: point.y, anchorX: 0.5, anchorY: 0.5,
        scaleX: size / bulbTexture.width, scaleY: size / bulbTexture.width,
      })
      // Chasing along the string, cascading down a curtain, or each on its own
      const phase = twinkles ? Math.random()
        : style === "curtain" ? -(point.y - building.top) / cascadeLength
          : -idx / chaseLength
      bulbs.push({
        particle, x: point.x, y: point.y, colour: toBgr(single ?? palette[idx % palette.length]),
        phase, period: twinkles ? between(blinkPeriod) : period,
      })
    }))
  })

  // The bulbs that can be seen: on a building that's on screen, and not behind the hills,
  // the house or a nearer building. Only these are drawn and repainted. Worked out again
  // whenever the skyline's slid or the camera's moved, which is every frame of a pan, so
  // each one's place in the scene goes into the same point. Returns whether it had to be
  const near = background.skyline
  const behindNear = (point: {x: number, y: number}) => {
    const x = (point.x - near.x) / near.scale.x
    const y = (point.y - near.y) / near.scale.y
    return inFront.some(building => x >= building.left && x <= building.right && y >= building.top && y <= building.bottom)
  }
  const seen: Bulb[] = []
  const drawn = layer.particleChildren as Particle[]
  let slidTo: number | undefined
  let viewedAt: number | undefined
  const inScene = {x: 0, y: 0}
  const onScreen = {left: 0, top: 0, right: 0, bottom: 0}
  const reveal = () => {
    const {x, y, scale} = skyline
    if (x === slidTo && background.viewVersion() === viewedAt) {
      return false
    }
    slidTo = x
    viewedAt = background.viewVersion()
    background.viewInSkyline(skyline, onScreen)
    seen.length = 0
    drawn.length = 0
    for (const {building, bulbs} of strung) {
      if (building.right + size < onScreen.left || building.left - size > onScreen.right
        || building.bottom + size < onScreen.top || building.top - size > onScreen.bottom) {
        continue
      }
      for (const bulb of bulbs) {
        inScene.x = x + bulb.x * scale.x
        inScene.y = y + bulb.y * scale.y
        if (inScene.x >= scenery.left && inScene.x <= scenery.right && !background.hidesSkyline(inScene) && !behindNear(inScene)) {
          seen.push(bulb)
          drawn.push(bulb.particle)
        }
      }
    }
    return true
  }

  let time = 0
  let sinceRepaint = Infinity
  const tick = () => {
    const dt = app.ticker.deltaMS / 1000
    time += dt
    sinceRepaint += dt
    // Over its layer of the skyline, wherever it's slid to
    layer.position.copyFrom(skyline.position)
    if (!reveal() && sinceRepaint < repaintEvery) {
      return
    }
    sinceRepaint = 0
    for (const bulb of seen) {
      // Up and back down over its blink, from dim to fully on
      const t = ((time / bulb.period + bulb.phase) % 1 + 1) % 1
      const level = 1 - Math.abs(t * 2 - 1)
      paint(bulb.particle, bulb.colour, brightness * (dimLevel + (1 - dimLevel) * level))
    }
    layer.update()
  }
  app.ticker.add(tick)

  return {
    destroy() {
      app.ticker.remove(tick)
      layer.destroy({children: true})
    },
  }
}

export {buildingsIn, createSkylineLights}
