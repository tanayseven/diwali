import {Application, Particle, ParticleContainer, PointData, Rectangle, Sprite} from "pixi.js"
import type {createAudioControl} from "./audioControl"
import {Background, scenery, skylineUrls} from "./background"
import {blastSoundUrls, mixColour, paint, toBgr} from "./fireworks"
import {Lighting, radialTexture} from "./lighting"
import {buildingsIn} from "./skylineLights"

// Shells go up from between the city's buildings now and then, and burst a little
// above them. Everything here is in the near skyline drawing's units, as they're drawn
// on it and slide with it as the camera pans; it's 420 tall, standing on its bottom
const skylineFoot = 420
// Each burst is heard a second after it's seen, as it's far off: a laddi's bang,
// muffled and soft
const bangDelay = 1000
const bangLevel = 0.3
// A shell goes up every 1.2 to 3.5 seconds, and now and then two or three go up
// together, a moment apart
const launchEvery = {min: 1.2, max: 3.5}
const volleyShare = 0.25
const volleySize = {min: 2, max: 3}
const volleyGap = {min: 0.15, max: 0.4}
// Gaps between buildings narrower than this aren't launched from, and shells go up
// at least this far in from either side
const minGap = 12
const gapMargin = 4
// A shell bursts this far above the taller building beside it
const burstAbove = {min: 25, max: 70}
// A shell climbs slowing all the way, bursting as it stops, with a little sway, and
// sheds a trail of sparks as it goes
const rocketGravity = 220
const rocketSway = 6
const rocketSize = 1.6
const rocketBgr = toBgr(0xfff0c8)
const rocketTrailRate = 40
const rocketTrailLife = {min: 0.25, max: 0.45}
// A burst throws its stars out all round, as a ball seen from afar, so some fly
// across and some come mostly towards or away, filling in its middle. They spread
// this fast, slowed hard by the air so they reach about speed / starDrag out, and
// droop as they fade
const starCount = {min: 140, max: 190}
const starSpeed = {min: 120, max: 160}
const starDrag = 2.2
const starGravity = 40
const starLife = {min: 1.1, max: 1.7}
const starSize = 1.8
// How much longer a star is drawn per unit of its speed, as the streak it leaves
const starStreak = 1 / 14
// Stars shed glittering gold specks while they're fast, which hang and fade
const glitterRate = 12
const glitterFor = 0.6
const glitterLife = {min: 0.3, max: 0.6}
const glitterSize = 0.9
const glitterBgr = toBgr(0xffe2a0)
// A burst's stars start white hot, then turn its colour as they fly
const shellColours = [0xb48cff, 0xffc861, 0xff6a5a, 0x7dff9a, 0x76a8ff, 0xff7ad9]
const whiteFor = 0.12
const colourBy = 0.45
// A burst flashes faintly for a moment as it goes off
const flashSize = 100
const flashAlpha = 0.45
const flashDuration = 0.25
// Long frames, like coming back to the tab, are taken in smaller steps
const maxStep = 0.05

// A star's colour as it flies, white hot then its shell's colour, worked out once for
// each shell colour and swapped ready to paint, as there are thousands of stars a frame
const starShades = 64
const starTables = new Map(shellColours.map(colour => [colour, Array.from({length: starShades}, (_, idx) => {
  const t = idx / (starShades - 1)
  return toBgr(t < whiteFor ? 0xffffff : mixColour(0xffffff, colour, Math.min(1, (t - whiteFor) / (colourBy - whiteFor))))
})]))

const random = (min: number, max: number) => min + (max - min) * Math.random()
const between = (range: {min: number, max: number}) => random(range.min, range.max)

type Gap = {
  // The middle of the gap, how far either side of it a shell can go up from, and the
  // top of the taller building beside it
  x: number
  spread: number
  top: number
}

type Spark = {
  particle: Particle
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  // A climbing shell, a star from a burst, or a speck shed by either
  kind: "rocket" | "star" | "speck"
  // Where a shell bursts, and its colour, or a star's colours as it flies
  burstAt: number
  colour: number
  shades: number[]
  // When it next sheds a speck
  shedDebt: number
}

type Flash = {sprite: Sprite, age: number}

// The gaps between buildings wide enough to launch from, left to right
const gapsBetween = (buildings: ReturnType<typeof buildingsIn>): Gap[] => {
  const sorted = [...buildings].sort((a, b) => a.left - b.left)
  const gaps: Gap[] = []
  for (let idx = 1; idx < sorted.length; idx++) {
    const before = sorted[idx - 1]
    const after = sorted[idx]
    const width = after.left - before.right
    if (width >= minGap) {
      gaps.push({x: (before.right + after.left) / 2, spread: width / 2 - gapMargin, top: Math.min(before.top, after.top)})
    }
  }
  return gaps
}

// Fireworks over the city: shells rising from between the skyline's buildings and
// bursting just above them, all through the night. They're drawn over the night, as
// they shine, but hidden wherever the hills or the house stand in front of them
const createSkyFireworks = async (
  app: Application, background: Background, lighting: Lighting, audio: ReturnType<typeof createAudioControl>,
) => {
  const svg = new DOMParser().parseFromString(await (await fetch(skylineUrls.near)).text(), "image/svg+xml")
  const gaps = gapsBetween(buildingsIn(svg))
  const bangs = blastSoundUrls.map(url => audio.createEffect(url, {muffled: true}))
  const bangTimers = new Set<number>()

  const sparkTexture = radialTexture(32, [[0, 1], [0.3, 0.85], [1, 0]])
  const layer = new ParticleContainer({dynamicProperties: {position: true, vertex: true, rotation: true, color: true}})
  layer.blendMode = "add"
  layer.boundsArea = new Rectangle(-200, -skylineFoot, 2960, skylineFoot * 2)
  layer.position.copyFrom(background.skyline.position)
  layer.scale.copyFrom(background.skyline.scale)
  // In front of the fairy lights on the buildings
  layer.zIndex = lighting.aboveNight + 1
  layer.eventMode = "none"
  const flashes: Flash[] = []
  background.decorations.addChild(layer)

  // Particles are reused rather than removed: a spent one is hidden until it's needed
  const sparks: Spark[] = []
  const freeSparks: Spark[] = []
  const addSpark = (x: number, y: number, vx: number, vy: number, life: number, kind: Spark["kind"], colour = 0) => {
    let spark = freeSparks.pop()
    if (!spark) {
      const particle = new Particle({texture: sparkTexture, anchorX: 0.5, anchorY: 0.5})
      layer.addParticle(particle)
      spark = {particle, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, kind, burstAt: 0, colour: 0, shades: [], shedDebt: 0}
    }
    spark.x = x
    spark.y = y
    spark.vx = vx
    spark.vy = vy
    spark.age = 0
    spark.life = life
    spark.kind = kind
    spark.colour = colour
    spark.shades = starTables.get(colour) ?? []
    spark.shedDebt = 0
    sparks.push(spark)
    return spark
  }

  // Whether a point in the skyline drawing is out of sight now, behind the hills or the
  // house, or past the scenery's sides as the skyline slides. Asked of every spark each
  // frame, so where it is in the scene is worked out into the same point each time
  const inScene = {x: 0, y: 0}
  const isHidden = (x: number, y: number) => {
    inScene.x = background.skyline.x + x * background.skyline.scale.x
    inScene.y = background.skyline.y + y * background.skyline.scale.y
    return inScene.x < scenery.left || inScene.x > scenery.right || background.hidesSkyline(inScene)
  }

  const launch = () => {
    // Only from where its burst would be seen
    const seen = gaps.filter(gap => !isHidden(gap.x, gap.top - burstAbove.max))
    const gap = seen[Math.floor(Math.random() * seen.length)]
    if (!gap) {
      return
    }
    const x = gap.x + random(-gap.spread, gap.spread)
    const burstAt = gap.top - between(burstAbove)
    // Fast enough to stop just as it gets there
    const speed = Math.sqrt(2 * rocketGravity * (skylineFoot - burstAt))
    const rocket = addSpark(x, skylineFoot, random(-rocketSway, rocketSway), -speed, Infinity, "rocket")
    rocket.burstAt = burstAt
    rocket.colour = shellColours[Math.floor(Math.random() * shellColours.length)]
  }

  const burst = (at: PointData, colour: number) => {
    const count = Math.round(between(starCount))
    const size = random(0.8, 1.3)
    for (let idx = 0; idx < count; idx++) {
      // A direction on a ball, seen flat
      const towards = random(-1, 1)
      const around = random(0, Math.PI * 2)
      const across = Math.sqrt(1 - towards * towards)
      const speed = between(starSpeed) * size * random(0.92, 1)
      addSpark(at.x, at.y, Math.cos(around) * across * speed, Math.sin(around) * across * speed, between(starLife), "star", colour)
    }
    const sprite = new Sprite(lighting.glowTexture)
    sprite.anchor.set(0.5)
    sprite.position.copyFrom(background.fromSkyline(at))
    sprite.width = sprite.height = flashSize * size
    sprite.blendMode = "add"
    sprite.eventMode = "none"
    sprite.zIndex = lighting.aboveNight + 1
    sprite.visible = !background.hidesSkyline(sprite.position)
    background.decorations.addChild(sprite)
    flashes.push({sprite, age: 0})
    const timer = window.setTimeout(() => {
      bangTimers.delete(timer)
      bangs[Math.floor(Math.random() * bangs.length)]().setLevel(bangLevel)
    }, bangDelay)
    bangTimers.add(timer)
  }

  let nextLaunch = between(launchEvery)
  let volley = 0
  const step = (dt: number) => {
    nextLaunch -= dt
    if (nextLaunch <= 0) {
      launch()
      if (volley > 0) {
        volley--
      } else if (Math.random() < volleyShare) {
        volley = Math.round(between(volleySize)) - 1
      }
      nextLaunch = volley > 0 ? between(volleyGap) : between(launchEvery)
    }

    for (let idx = sparks.length - 1; idx >= 0; idx--) {
      const spark = sparks[idx]
      spark.age += dt
      if (spark.kind === "rocket") {
        spark.vy += rocketGravity * dt
        if (spark.vy >= 0 || spark.y <= spark.burstAt) {
          burst({x: spark.x, y: spark.y}, spark.colour)
          spark.age = spark.life = 0
        } else {
          spark.shedDebt += rocketTrailRate * dt
        }
      } else if (spark.kind === "star") {
        const drag = Math.exp(-starDrag * dt)
        spark.vx *= drag
        spark.vy = spark.vy * drag + starGravity * dt
        if (spark.age < glitterFor) {
          spark.shedDebt += glitterRate * dt
        }
      } else {
        spark.vy += starGravity * 0.5 * dt
      }
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      for (; spark.shedDebt >= 1; spark.shedDebt--) {
        const life = spark.kind === "rocket" ? between(rocketTrailLife) : between(glitterLife)
        addSpark(spark.x, spark.y, spark.vx * 0.1, spark.vy * 0.1, life, "speck")
      }
      // Spent: the last spark takes its place, as hundreds can go out in one step
      if (spark.age >= spark.life) {
        spark.particle.color = 0
        sparks[idx] = sparks[sparks.length - 1]
        sparks.pop()
        freeSparks.push(spark)
      }
    }
  }

  const draw = () => {
    for (const spark of sparks) {
      const {particle} = spark
      particle.x = spark.x
      particle.y = spark.y
      if (isHidden(spark.x, spark.y)) {
        particle.color = 0
        continue
      }
      const t = spark.age / spark.life
      if (spark.kind === "rocket") {
        particle.scaleX = particle.scaleY = rocketSize / sparkTexture.width
        paint(particle, rocketBgr, 1)
      } else if (spark.kind === "star") {
        // Drawn stretched along its path, the streak a fast star leaves to the eye
        const speed = Math.hypot(spark.vx, spark.vy)
        const size = starSize * (1 - 0.3 * t) / sparkTexture.width
        particle.rotation = Math.atan2(spark.vy, spark.vx)
        particle.scaleX = size * (1 + speed * starStreak)
        particle.scaleY = size
        paint(particle, spark.shades[Math.round(t * (starShades - 1))], 1 - t * t * t)
      } else {
        particle.scaleX = particle.scaleY = glitterSize / sparkTexture.width
        paint(particle, glitterBgr, (1 - t) * random(0.3, 1))
      }
    }
  }

  const tick = () => {
    // Over the skyline's near layer, wherever it's slid to
    layer.position.copyFrom(background.skyline.position)
    let left = app.ticker.deltaMS / 1000
    while (left > 0) {
      step(Math.min(left, maxStep))
      left -= maxStep
    }
    draw()
    for (let idx = flashes.length - 1; idx >= 0; idx--) {
      const flash = flashes[idx]
      flash.age += app.ticker.deltaMS / 1000
      flash.sprite.alpha = flashAlpha * Math.max(0, 1 - flash.age / flashDuration)
      if (flash.age >= flashDuration) {
        flash.sprite.destroy()
        flashes.splice(idx, 1)
      }
    }
  }
  app.ticker.add(tick)

  return {
    destroy() {
      app.ticker.remove(tick)
      bangTimers.forEach(timer => clearTimeout(timer))
      flashes.forEach(flash => flash.sprite.destroy())
      layer.destroy({children: true})
    },
  }
}

export {createSkyFireworks}
