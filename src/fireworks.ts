import {Application, Assets, Container, FederatedPointerEvent, Graphics, Particle, ParticleContainer, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import type {createAudioControl} from "./audioControl"
import {createBackground, sceneHeight, sceneWidth} from "./background"
import {Item, createHud} from "./hud"
import {Light, Lighting, radialTexture} from "./lighting"
import {LL} from "./locale"
import {createMatchstick, matchFrameUrls} from "./matchstick"
import {addTooltip, Tooltip} from "./tooltip"

type Background = ReturnType<typeof createBackground>
type AudioControl = ReturnType<typeof createAudioControl>

// An anar's drawing before it's lit, once it's lit (its fuse burnt down to a stub and
// its tip scorched), and after it's burnt out (sooty, with an ash crater for a tip)
const anarUrls = {
  unlit: "sprites/fireworks/anar-unlit.svg",
  lit: "sprites/fireworks/anar-lit.svg",
  spent: "sprites/fireworks/anar-spent.svg",
}
// A string of firecrackers (a laddi) whole, then with one more cracker blown apart in
// each drawing after, from the wick's end at the right
const laddiUrls = Array.from({length: 21}, (_, idx) => `sprites/fireworks/pathaka-${String(idx + 1).padStart(2, "0")}.svg`)
// Every texture the fireworks need, to be loaded before they're created
const fireworksAssets = [...Object.values(anarUrls), ...laddiUrls, ...matchFrameUrls]

type Kind = "anar" | "laddi"

// How each kind of firework's drawings sit in the scene. They're all the same size,
// showing a frame of their drawing's units at a number of pixels to a unit. The origin
// is the point in the drawing that's placed where it's dropped, and they're picked up,
// lit and shown in their slot by an area of it. A laddi is drawn from above, so it's
// squashed top to bottom to lie flat on the floor
type Shape = {
  frame: Rectangle
  density: number
  origin: PointData
  area: Rectangle
  // Where the match is put to its fuse
  fuseAt: PointData
  // Scene units per unit of the drawing, across, and how much shorter it is top to bottom
  scale: number
  flatten: number
}

// The anar SVGs are the pot cropped out of bigger drawings, keeping their units, with
// room for the scorch a spent one leaves on the floor. The cone stands on y 484 and
// narrows to its nozzle at y 446, with the fuse running up to (182, 431). It's a
// little smaller than a diya
const nozzleAt = {x: 180, y: 446}
const anarShape: Shape = {
  frame: new Rectangle(128, 428, 104, 72),
  density: 4,
  origin: {x: 180, y: 484},
  area: new Rectangle(154, 428, 52, 62),
  fuseAt: {x: 182, y: 431},
  scale: 0.42,
  flatten: 1,
}
// The laddi's crackers stand above and below its wick, which runs along y 241 from
// x 72 to 650 and frays out past there. It's about two diyas wide
const laddiShape: Shape = {
  frame: new Rectangle(0, 0, 720, 480),
  density: 1,
  origin: {x: 390, y: 245},
  area: new Rectangle(80, 85, 620, 320),
  fuseAt: {x: 676, y: 262},
  scale: 0.08,
  flatten: 0.55,
}
const shapes: Record<Kind, Shape> = {anar: anarShape, laddi: laddiShape}
// A firework that can be lit grows this much while the match is dragged over it
const targetGrowth = 1.12

// How long each part of an anar's burn lasts, in seconds: the fuse burning down to
// the nozzle, the fountain building up, burning at full height, then sputtering out
const fuseDuration = 1.4
const rampDuration = 1.5
const fullDuration = 15.5
const dieDuration = 3.5

// Heard from when the fountain erupts, at its strength. It roars for about 19 seconds
// and fades out by 20, as the fountain sputters out
const anarSoundUrl = "audio/effects/anar.mp3"
// The anar's recording roars much louder than a laddi's bangs, so it plays quieter to
// let the crackers be heard over it
const anarVolume = 0.7

// The fountain, in scene units and seconds. Sparks leave the nozzle in a narrow cone,
// slow down in the air and fall back, landing in a ring around the pot. At full
// height the fastest reach about 170 units up, two fifths as tall as the house
const gravity = 780
const airDrag = 1.4
const maxSparkRate = 650
const minSparkSpeed = 330
const maxSparkSpeed = 690
// How far from straight up a spark can leave, in radians
const sparkSpread = 0.26
const minSparkLife = 0.7
const maxSparkLife = 1.5
const sparkWidth = 1
// How much longer a spark is drawn per unit of its speed, as the streak it leaves
const streakLength = 1 / 150
// Some sparks crackle: partway up they burst into a few short-lived glittering specks
const glitterShare = 0.16
const glitterSpecks = {min: 4, max: 8}
// Every spark sheds embers as it flies, which hang in the air glowing and fading,
// leaving a trail behind it
const emberRate = 2.5
// Sparks that reach the floor bounce off it, losing most of their speed
const bounce = 0.25
// Smoke billows up from the fountain and spreads out as it fades, lit warm by the
// fire while it's close. A puff goes up as the fountain catches, and a wisp lingers
// after it's burnt out
const maxSmokeRate = 14
const smokeLife = 4.5
const smokeAlpha = 0.3
const smokeTint = 0x7a7a84
const litSmokeTint = 0xffb070
const catchPuffs = 10
const spentSmokeDuration = 3

// Each anar lights up the porch around it while it burns
const lightColour = 0xffc27a
// How far each light reaches, at the start and at the fountain's full height, and
// how far up the fountain its middle rises
const minLightRadius = 70
const maxLightRadius = 320
const lightRise = 75
// The bright glow around the nozzle, drawn over everything
const glowRadius = 16
const coreRadius = 4

// The laddi's crackers, in the order they go off, one per drawing from the second on.
// Each blows apart where it lies: a flash and a burst of light, sparks, shreds of its
// red paper and a puff of smoke. They go off in quick, uneven succession once the
// fuse has fizzed along to the first
const laddiBlasts: PointData[] = [
  {x: 616.1, y: 316.6}, {x: 588.7, y: 180.8}, {x: 562.3, y: 320.2}, {x: 532.4, y: 171.5},
  {x: 509.6, y: 311.7}, {x: 482.4, y: 172.4}, {x: 450.6, y: 306.5}, {x: 424.2, y: 172.2},
  {x: 397.4, y: 305.8}, {x: 367.9, y: 178.8}, {x: 345.1, y: 310.7}, {x: 312.6, y: 167.6},
  {x: 288.8, y: 307.4}, {x: 258.4, y: 172.1}, {x: 230.2, y: 310.2}, {x: 203.1, y: 167.8},
  {x: 178.9, y: 305.1}, {x: 150.7, y: 173.6}, {x: 121.7, y: 301.8}, {x: 95.7, y: 168},
]
const laddiWickY = 241
const laddiFuseDuration = 1
// Each cracker goes off anywhere up to half a second after the one before
const maxBlastGap = 0.5
// Each blast bangs with one of these, picked at random, and flashes the whole screen
// mildly. The sounds are trimmed so the bang comes right at the start
const blastSoundUrls = ["audio/effects/firecracker-1.mp3", "audio/effects/firecracker-2.mp3"]
const screenFlashColour = 0xfff0d0
const screenFlashAlpha = 0.14
const blastLightColour = 0xffd9a0
const blastLightRadius = 150
const blastGlowRadius = 30
const blastCoreRadius = 9
// How quickly a blast's flash and light die away, per second
const blastFade = 16
const blastSparks = 28
const blastSpecks = 10
const blastSparkSpeed = {min: 120, max: 320}
const blastPuffs = 3
// Shreds of paper are thrown up and out, tumble down slowly and lie where they land
const shredsPerBlast = {min: 10, max: 16}
const shredSpeed = {min: 60, max: 200}
const shredGravity = 420
const shredDrag = 3
const shredLife = {min: 2.5, max: 4}
const shredSize = {width: 1.3, height: 0.6}
const shredColours = [0xb8322a, 0xd8503a, 0x8e2018, 0xf2e6c8]

// A spark's colour as it ages: white hot, cooling through gold and orange to red
const sparkColours: [number, number][] = [
  [0, 0xfffbe6],
  [0.15, 0xffe08a],
  [0.45, 0xffa53a],
  [0.8, 0xe8501a],
  [1, 0x8a1e08],
]

const lerp = (from: number, to: number, t: number) => from + (to - from) * t
const random = (min: number, max: number) => lerp(min, max, Math.random())
const clamp = (value: number) => Math.min(1, Math.max(0, value))

const mixColour = (from: number, to: number, t: number) => {
  const channel = (shift: number) => Math.round(lerp((from >> shift) & 0xff, (to >> shift) & 0xff, t)) << shift
  return channel(16) | channel(8) | channel(0)
}

const sparkColour = (t: number) => {
  const next = sparkColours.findIndex(([at]) => at >= t)
  if (next <= 0) {
    return sparkColours[0][1]
  }
  const [fromAt, from] = sparkColours[next - 1]
  const [toAt, to] = sparkColours[next]
  return mixColour(from, to, (t - fromAt) / (toAt - fromAt))
}

// A small white rectangle, tinted as each shred of paper
const shredTexture = () => {
  const canvas = document.createElement("canvas")
  canvas.width = 8
  canvas.height = 4
  const context = canvas.getContext("2d")!
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, 8, 4)
  return Texture.from(canvas)
}

type Spark = {
  particle: Particle
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  // A spark from the fountain, a glitter speck (tiny, white and twinkling), or an
  // ember shed by a spark (tiny, orange and fading)
  kind: "spark" | "speck" | "ember"
  // When a crackling spark bursts into specks, if it does
  burstAt: number
  // How far down the floor is for this spark, so they land spread out in depth
  floor: number
}

type Smoke = {particle: Particle, x: number, y: number, vx: number, vy: number, age: number}

type Shred = {
  particle: Particle
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  age: number
  life: number
  floor: number
}

type Placed = {
  kind: Kind
  sprite: Sprite
  // Burning is the anar's fountain, or the laddi's crackers going off
  state: "unlit" | "fuse" | "burning" | "spent"
  // While the match is lighting it, it can't be picked up or lit again
  busy: boolean
  // Time since its fuse was lit, in seconds
  elapsed: number
  // How brightly it's burning, from 0 to 1, eased so its light never jumps
  brightness: number
  // Where its light is, for the smoke near it to catch
  lightAt: PointData
  // Sparks and puffs owed from earlier frames, as they rarely come out to a whole number
  sparkDebt: number
  smokeDebt: number
  // When it burnt out, for the smoke that lingers after
  spentAt: number
  // Its light on the scene, and its glow over it
  light: Light
  glow: Sprite
  core: Sprite
  // An anar's roar, while it's burning
  sound?: ReturnType<ReturnType<AudioControl["createEffect"]>>
  // How many of a laddi's crackers have gone off, when the last did and the next will
  blasts: number
  lastBlastAt: number
  nextBlastAt: number
}

type Drag =
  // A firework, from its stack or picked up from the scene, and where to put it back
  | {kind: "firework", sprite: Sprite, firework: Placed, fromScene?: PointData}
  | {kind: "match", sprite: Sprite}

// The fireworks scene's HUD and what's set off from it. Anars (flowerpot fireworks)
// and laddis (strings of firecrackers) are dragged from their stacks onto the porch,
// and can be picked up to move them or dropped on the bar to put them back; burnt-out
// ones are cleared away the same way. The matchstick dragged onto an unlit one lights
// its fuse. An anar's fizzes down to the nozzle; then it throws up a fountain of sparks
// that crackle and glitter, shedding embers and smoke and lighting up the porch, and
// sputters out after a while. A laddi's fizzes along to its crackers, which go off one
// after another, each with a blast. Expects fireworksAssets to have been loaded
const createFireworks = (app: Application, background: Background, lighting: Lighting, audio: AudioControl) => {
  // A firework's slot shows its unlit drawing, cropped to the area it's picked up by
  const itemFor = (shape: Shape, url: string): Item => ({
    url,
    crop: new Rectangle(
      (shape.area.x - shape.frame.x) * shape.density, (shape.area.y - shape.frame.y) * shape.density,
      shape.area.width * shape.density, shape.area.height * shape.density,
    ),
    count: 5,
  })
  const stacks: Record<Kind, Item> = {anar: itemFor(anarShape, anarUrls.unlit), laddi: itemFor(laddiShape, laddiUrls[0])}
  const unlitUrls: Record<Kind, string> = {anar: anarUrls.unlit, laddi: laddiUrls[0]}
  const matchstick = createMatchstick(app, audio)
  const playAnarSound = audio.createEffect(anarSoundUrl)
  const blastSounds = blastSoundUrls.map(url => audio.createEffect(url))
  const container = new Container()
  // Over the whole screen, under the HUD, for the blasts' flashes
  const screenFlash = new Graphics()
  screenFlash.eventMode = "none"
  screenFlash.visible = false
  // How bright the screen's flash is now, from 0 to 1
  let flash = 0
  // Whether the bar is showing, so fireworks can be put back on it
  let hudShown = false
  const bar = createHud(app)
  // Above the HUD, so whatever is being dragged is never hidden behind it
  const dragLayer = new Container()
  container.addChild(screenFlash, bar.container, dragLayer)
  const slots = {anar: bar.addItem(0, stacks.anar), laddi: bar.addItem(1, stacks.laddi)}
  const matchSlot = bar.addItem(2, matchstick.item)

  const tips = LL.tooltip
  const names: Record<Kind, () => string> = {anar: tips.anar.name, laddi: tips.laddi.name}
  const stackHints: Record<Kind, () => string> = {anar: tips.anar.stack, laddi: tips.laddi.stack}
  ;(["anar", "laddi"] as Kind[]).forEach(kind => addTooltip(slots[kind].container, () => ({
    title: names[kind](),
    lines: [stacks[kind].count === 0 ? tips.noneLeft() : stackHints[kind]()],
  })))
  addTooltip(matchSlot.container, () => ({title: tips.matchstick.name(), lines: [tips.matchstick.fireworkHint()]}))
  // Only unlit and burnt-out fireworks can be hovered: they can't be picked up while
  // they burn, so they take no pointer events then
  const fireworkTooltip = (firework: Placed) => (): Tooltip => ({
    title: names[firework.kind](),
    lines: firework.state === "spent" ? [tips.spent()] : [tips.unlit(), tips.move()],
  })

  const sparkTexture = radialTexture(32, [[0, 1], [0.3, 0.85], [1, 0]])
  const {glowTexture} = lighting
  const smokeTexture = radialTexture(64, [[0, 0.5], [0.5, 0.25], [1, 0]])
  const paperTexture = shredTexture()

  // Shreds of paper lie on the porch under the night, above whatever's placed there.
  // Over the night: smoke, then the sparks, then the glows of the fire
  const shredLayer = new ParticleContainer({dynamicProperties: {position: true, rotation: true, color: true}})
  shredLayer.zIndex = sceneHeight
  const smokeLayer = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true}})
  const sparkLayer = new ParticleContainer({dynamicProperties: {position: true, vertex: true, rotation: true, color: true}})
  sparkLayer.blendMode = "add"
  const sceneArea = new Rectangle(0, 0, sceneWidth, sceneHeight)
  ;[shredLayer, smokeLayer, sparkLayer].forEach(layer => {
    layer.boundsArea = sceneArea
  })
  const glowLayer = new Container()
  glowLayer.eventMode = "none"
  const overlays = [smokeLayer, sparkLayer, glowLayer]
  overlays.forEach((overlay, idx) => {
    overlay.zIndex = lighting.aboveNight + idx
  })
  // Lower fireworks are nearer, so they're drawn in front, like the diyas
  background.decorations.sortableChildren = true
  background.decorations.addChild(shredLayer, ...overlays)

  const placed: Placed[] = []
  let drag: Drag | undefined
  // Whether a dragged firework is over the bar, where letting go puts it back
  let overBar = false
  // The placed firework the match would light if let go now
  let target: Placed | undefined
  // Whether the fireworks scene is open, so its HUD and placed fireworks can be used
  let interactive = false
  let time = 0

  // A point in a placed firework's drawing, in scene units
  const onFirework = (firework: Placed, point: PointData) => {
    const {origin, scale, flatten} = shapes[firework.kind]
    return {
      x: firework.sprite.x + (point.x - origin.x) * scale,
      y: firework.sprite.y + (point.y - origin.y) * scale * flatten,
    }
  }

  // Particles are reused rather than removed: a spent one is hidden until it's needed
  const sparks: Spark[] = []
  const freeSparks: Spark[] = []
  const smoke: Smoke[] = []
  const freeSmoke: Smoke[] = []
  const shreds: Shred[] = []
  const freeShreds: Shred[] = []

  const addSpark = (x: number, y: number, vx: number, vy: number, life: number, kind: Spark["kind"], floor: number) => {
    let spark = freeSparks.pop()
    if (!spark) {
      const particle = new Particle({texture: sparkTexture, anchorX: 0.5, anchorY: 0.5})
      sparkLayer.addParticle(particle)
      spark = {particle, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, kind: "spark", burstAt: Infinity, floor: 0}
    }
    Object.assign(spark, {x, y, vx, vy, age: 0, life, kind, floor})
    spark.burstAt = kind === "spark" && Math.random() < glitterShare ? life * random(0.3, 0.7) : Infinity
    sparks.push(spark)
  }

  const addSmoke = (x: number, y: number) => {
    let puff = freeSmoke.pop()
    if (!puff) {
      const particle = new Particle({texture: smokeTexture, anchorX: 0.5, anchorY: 0.5, tint: smokeTint})
      smokeLayer.addParticle(particle)
      puff = {particle, x: 0, y: 0, vx: 0, vy: 0, age: 0}
    }
    Object.assign(puff, {x, y, vx: random(-5, 5), vy: random(-18, -9), age: 0})
    smoke.push(puff)
  }

  const addShred = (x: number, y: number, floor: number) => {
    let shred = freeShreds.pop()
    if (!shred) {
      const particle = new Particle({
        texture: paperTexture, anchorX: 0.5, anchorY: 0.5,
        scaleX: shredSize.width / paperTexture.width, scaleY: shredSize.height / paperTexture.height,
      })
      shredLayer.addParticle(particle)
      shred = {particle, x: 0, y: 0, vx: 0, vy: 0, spin: 0, age: 0, life: 0, floor: 0}
    }
    // Thrown up and out, more sideways than up
    const angle = -Math.PI / 2 + random(-1.3, 1.3)
    const speed = random(shredSpeed.min, shredSpeed.max)
    Object.assign(shred, {
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: random(-14, 14),
      age: 0, life: random(shredLife.min, shredLife.max), floor,
    })
    shred.particle.tint = shredColours[Math.floor(Math.random() * shredColours.length)]
    shred.particle.rotation = random(0, Math.PI)
    shreds.push(shred)
  }

  // A spark from an anar's fountain, leaving the nozzle at a speed that grows with it
  const emitSpark = (anar: Placed, strength: number) => {
    const nozzle = onFirework(anar, nozzleAt)
    const angle = -Math.PI / 2 + (Math.random() + Math.random() - 1) * sparkSpread
    const speed = random(minSparkSpeed, maxSparkSpeed) * (0.45 + 0.55 * Math.sqrt(strength))
    addSpark(nozzle.x, nozzle.y, Math.cos(angle) * speed, Math.sin(angle) * speed,
      random(minSparkLife, maxSparkLife), "spark", anar.sprite.y + random(-4, 8))
  }

  // A fizzing spark off a burning fuse, thrown any way
  const emitFuseSpark = (firework: Placed, at: PointData) => {
    const angle = random(0, Math.PI * 2)
    const speed = random(15, 45)
    addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed - 15,
      random(0.15, 0.4), "speck", firework.sprite.y + random(-2, 4))
  }

  const burst = (spark: Spark) => {
    const count = Math.round(random(glitterSpecks.min, glitterSpecks.max))
    for (let idx = 0; idx < count; idx++) {
      const angle = random(0, Math.PI * 2)
      const speed = random(20, 55)
      addSpark(spark.x, spark.y, spark.vx * 0.3 + Math.cos(angle) * speed, spark.vy * 0.3 + Math.sin(angle) * speed,
        random(0.12, 0.32), "speck", spark.floor)
    }
  }

  // An ember left behind by a spark, drifting slowly where it was shed
  const shedEmber = (spark: Spark) => {
    addSpark(spark.x, spark.y, spark.vx * 0.1 + random(-4, 4), spark.vy * 0.1 + random(-4, 4),
      random(0.25, 0.6), "ember", spark.floor)
  }

  // How strongly an anar's fountain burns at this point in its life, from 0 to 1. It
  // sways a little, the way a real one surges and settles, and gutters as it dies
  const fountainStrength = (anar: Placed) => {
    const t = anar.elapsed - fuseDuration
    // Each anar sways in its own time
    const phase = anar.sprite.x
    const sway = 0.86 + 0.08 * Math.sin(time * 4.3 + phase) + 0.06 * Math.sin(time * 1.7 + 1 + phase)
    if (t < rampDuration) {
      return (1 - (1 - t / rampDuration) ** 2) * sway
    }
    if (t < rampDuration + fullDuration) {
      return sway
    }
    const dying = (t - rampDuration - fullDuration) / dieDuration
    const sputter = Math.sin(time * 8.5 + phase) > 0.2 ? 1 : 0.25
    return Math.max(0, 1 - dying) ** 1.5 * sputter * sway
  }

  const render = () => {
    const dragged = drag?.kind === "firework" ? drag.firework.kind : undefined
    bar.drawBoxes(overBar && dragged ? slots[dragged].box : undefined)
    slots.anar.show()
    slots.laddi.show()
    matchSlot.show(drag?.kind === "match")
  }

  const setOverBar = (value: boolean) => {
    if (overBar !== value) {
      overBar = value
      render()
    }
  }

  // Sizes a firework's sprite as it's drawn in the scene, times a factor: grown while
  // it's targeted, or zoomed like the scene while it's dragged on screen
  const scaleSprite = (firework: Placed, factor = 1) => {
    const {scale, flatten, density} = shapes[firework.kind]
    firework.sprite.scale.set(scale / density * factor, scale * flatten / density * factor)
  }

  // The nearest placed firework under a point on screen that could be lit
  const fireworkAt = (point: PointData) => {
    const at = background.toScene(point)
    return placed
      .filter(firework => firework.state === "unlit" && !firework.busy)
      .sort((a, b) => b.sprite.zIndex - a.sprite.zIndex)
      .find(firework => {
        const {origin, area, scale, flatten} = shapes[firework.kind]
        return area.contains(
          origin.x + (at.x - firework.sprite.x) / scale,
          origin.y + (at.y - firework.sprite.y) / (scale * flatten),
        )
      })
  }

  const setTarget = (firework: Placed | undefined) => {
    if (target !== firework) {
      if (target) {
        scaleSprite(target)
      }
      target = firework
      if (target) {
        scaleSprite(target, targetGrowth)
      }
    }
  }

  // A placed firework can be picked up to move it or put it back, unless it's burning
  // or being lit, or another scene is open
  const makePickable = (firework: Placed) => {
    const burning = firework.state === "fuse" || firework.state === "burning"
    firework.sprite.eventMode = interactive && !firework.busy && !burning ? "static" : "none"
  }

  const createFirework = (kind: Kind): Placed => {
    const {frame, origin} = shapes[kind]
    const sprite = new Sprite(Assets.get<Texture>(unlitUrls[kind]))
    sprite.anchor.set((origin.x - frame.x) / frame.width, (origin.y - frame.y) / frame.height)
    sprite.cursor = "grab"
    const light = lighting.addLight(kind === "anar" ? lightColour : blastLightColour)
    const glow = new Sprite(glowTexture)
    glow.tint = 0xffd59a
    const core = new Sprite(glowTexture)
    ;[glow, core].forEach(sprite => {
      sprite.anchor.set(0.5)
      sprite.blendMode = "add"
      sprite.visible = false
    })
    const firework: Placed = {
      kind, sprite, state: "unlit", busy: false, elapsed: 0, brightness: 0, lightAt: {x: 0, y: 0},
      sparkDebt: 0, smokeDebt: 0, spentAt: -Infinity, light, glow, core, blasts: 0, lastBlastAt: 0, nextBlastAt: 0,
    }
    addTooltip(sprite, fireworkTooltip(firework))
    sprite.on("pointerdown", e => {
      const fromScene = {x: sprite.x, y: sprite.y}
      placed.splice(placed.indexOf(firework), 1)
      sprite.removeFromParent()
      startFireworkDrag(e, firework, fromScene)
    })
    return firework
  }

  const placeFirework = (firework: Placed, at: PointData) => {
    const {sprite} = firework
    scaleSprite(firework)
    sprite.position.copyFrom(at)
    sprite.zIndex = at.y
    background.decorations.addChild(sprite)
    glowLayer.addChild(firework.glow, firework.core)
    makePickable(firework)
    if (!placed.includes(firework)) {
      placed.push(firework)
    }
  }

  // An unlit firework goes back on its stack; a burnt-out one is simply cleared away
  const removeFirework = (firework: Placed) => {
    const index = placed.indexOf(firework)
    if (index >= 0) {
      placed.splice(index, 1)
    }
    if (firework.state === "unlit") {
      stacks[firework.kind].count! += 1
    }
    firework.sound?.stop()
    firework.sprite.destroy()
    firework.light.destroy()
    firework.glow.destroy()
    firework.core.destroy()
    render()
  }

  // Strikes the match against a firework's fuse; the fuse catches as the match does
  const light = (firework: Placed) => {
    firework.busy = true
    makePickable(firework)
    const fuseAt = onFirework(firework, shapes[firework.kind].fuseAt)
    // In front of the firework it's lighting
    matchstick.strike(background.decorations, fuseAt, firework.sprite.zIndex + 0.5, () => {
      firework.state = "fuse"
      if (firework.kind === "anar") {
        firework.sprite.texture = Assets.get<Texture>(anarUrls.lit)
      }
      firework.elapsed = 0
      makePickable(firework)
    }, () => {
      firework.busy = false
      makePickable(firework)
    })
  }

  const startDrag = (e: FederatedPointerEvent, next: Drag) => {
    const {sprite} = next
    sprite.position.copyFrom(e.global)
    sprite.eventMode = "none"
    dragLayer.addChild(sprite)
    drag = next
    render()
  }

  // Fireworks are shown while dragged at the size they'll be placed at, so they land as seen
  const startFireworkDrag = (e: FederatedPointerEvent, firework: Placed, fromScene?: PointData) => {
    scaleSprite(firework, background.scale())
    startDrag(e, {kind: "firework", sprite: firework.sprite, firework, fromScene})
  }

  ;(["anar", "laddi"] as Kind[]).forEach(kind => slots[kind].container.on("pointerdown", e => {
    if (stacks[kind].count === 0 || drag) {
      return
    }
    stacks[kind].count! -= 1
    startFireworkDrag(e, createFirework(kind))
  }))

  // The match is held by its head, so it's the head that's put to a fuse
  matchSlot.container.on("pointerdown", e => {
    if (drag) {
      return
    }
    const sprite = matchstick.createSprite()
    sprite.scale.set(background.scale() * matchstick.scale)
    startDrag(e, {kind: "match", sprite})
  })

  // Sends whatever's dragged back where it came from
  const returnDrag = (current: Drag) => {
    current.sprite.removeFromParent()
    if (current.kind === "firework") {
      if (current.fromScene) {
        placeFirework(current.firework, current.fromScene)
      } else {
        removeFirework(current.firework)
      }
    } else {
      current.sprite.destroy()
    }
  }

  const endDrag = (at: PointData) => {
    if (!drag) {
      return
    }
    const current = drag
    const into = target
    drag = undefined
    setOverBar(false)
    setTarget(undefined)
    current.sprite.removeFromParent()
    if (current.kind === "firework") {
      if (hudShown && bar.isOver(at)) {
        removeFirework(current.firework)
      } else {
        placeFirework(current.firework, background.toScene(at))
      }
    } else if (into) {
      current.sprite.destroy()
      light(into)
    } else {
      returnDrag(current)
    }
    render()
  }

  // Moves and releases are heard on the window so a drag follows the pointer anywhere
  const toStage = (e: PointerEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!drag) {
      return
    }
    const at = toStage(e)
    drag.sprite.position.copyFrom(at)
    if (drag.kind === "firework") {
      setOverBar(hudShown && bar.isOver(at))
    } else {
      setTarget(fireworkAt(at))
    }
  }
  const onPointerUp = (e: PointerEvent) => endDrag(toStage(e))
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  // Puffs of smoke owed at a rate, from a point, for a firework that's smouldering
  const smoulder = (firework: Placed, at: PointData, dt: number) => {
    const smouldering = clamp(1 - (time - firework.spentAt) / spentSmokeDuration)
    if (firework.state === "spent" && smouldering > 0) {
      firework.smokeDebt += 3 * smouldering * dt
      while (firework.smokeDebt >= 1) {
        firework.smokeDebt--
        addSmoke(at.x + random(-1, 1), at.y - random(0, 4))
      }
    }
  }

  // Moves an anar's burn on, emitting its sparks and smoke and setting its light
  const burnAnar = (anar: Placed, dt: number) => {
    let strength = 0
    let fuseAt: PointData | undefined
    const nozzle = onFirework(anar, nozzleAt)
    if (anar.state === "fuse") {
      const fuseTip = onFirework(anar, anarShape.fuseAt)
      const t = clamp(anar.elapsed / fuseDuration)
      fuseAt = {x: lerp(fuseTip.x, nozzle.x, t), y: lerp(fuseTip.y, nozzle.y, t)}
      anar.sparkDebt += 70 * dt
      while (anar.sparkDebt >= 1) {
        anar.sparkDebt--
        emitFuseSpark(anar, fuseAt)
      }
      if (anar.elapsed >= fuseDuration) {
        anar.state = "burning"
        anar.sound = playAnarSound()
        for (let idx = 0; idx < catchPuffs; idx++) {
          addSmoke(nozzle.x + random(-6, 6), nozzle.y - random(0, 12))
        }
      }
    }
    if (anar.state === "burning") {
      strength = fountainStrength(anar)
      anar.sound?.setLevel(strength * anarVolume)
      anar.sparkDebt += maxSparkRate * strength * dt
      while (anar.sparkDebt >= 1) {
        anar.sparkDebt--
        emitSpark(anar, strength)
      }
      anar.smokeDebt += maxSmokeRate * Math.min(1, strength * 1.5) * dt
      while (anar.smokeDebt >= 1) {
        anar.smokeDebt--
        addSmoke(nozzle.x + random(-4, 4), nozzle.y - random(20, 100))
      }
      if (anar.elapsed >= fuseDuration + rampDuration + fullDuration + dieDuration) {
        anar.state = "spent"
        anar.sound?.stop()
        anar.sound = undefined
        anar.spentAt = time
        anar.sprite.texture = Assets.get<Texture>(anarUrls.spent)
        makePickable(anar)
      }
    }
    smoulder(anar, nozzle, dt)

    // The light follows the fountain, with a small flicker on top
    const target = anar.state === "fuse" ? 0.12 : strength
    anar.brightness = lerp(anar.brightness, target, clamp(dt * 10))
    const {brightness, light, glow, core} = anar
    const shining = brightness > 0.005
    glow.visible = shining
    core.visible = shining
    if (!shining) {
      light.off()
      return
    }
    const flicker = 0.93 + 0.04 * Math.sin(time * 11 + anar.sprite.x) + 0.03 * Math.sin(time * 23 + 1)
    const lit = brightness * flicker
    anar.lightAt = fuseAt ?? {x: nozzle.x, y: nozzle.y - lightRise * brightness}
    light.shine(anar.lightAt, lerp(minLightRadius, maxLightRadius, brightness), lit * 1.4)
    const glowAt = fuseAt ?? nozzle
    glow.position.copyFrom(glowAt)
    core.position.copyFrom(glowAt)
    glow.width = glow.height = glowRadius * 2 * (0.4 + 0.6 * brightness)
    core.width = core.height = coreRadius * 2 * (0.5 + 0.5 * brightness)
    glow.alpha = clamp(lit * 1.5)
    core.alpha = clamp(lit * 3)
  }

  // One of a laddi's crackers goes off where it lies
  const blast = (laddi: Placed, at: PointData) => {
    const floor = laddi.sprite.y
    for (let idx = 0; idx < blastSparks; idx++) {
      const angle = random(0, Math.PI * 2)
      const speed = random(blastSparkSpeed.min, blastSparkSpeed.max)
      addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.7 - 60,
        random(0.15, 0.4), "spark", floor + random(-6, 8))
    }
    for (let idx = 0; idx < blastSpecks; idx++) {
      const angle = random(0, Math.PI * 2)
      const speed = random(30, 90)
      addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed, random(0.1, 0.25), "speck", floor + 8)
    }
    const shredCount = Math.round(random(shredsPerBlast.min, shredsPerBlast.max))
    for (let idx = 0; idx < shredCount; idx++) {
      addShred(at.x, at.y, floor + random(-8, 10))
    }
    for (let idx = 0; idx < blastPuffs; idx++) {
      addSmoke(at.x + random(-4, 4), at.y - random(0, 8))
    }
    laddi.brightness = 1
    laddi.lightAt = at
    flash = 1
    blastSounds[Math.floor(Math.random() * blastSounds.length)]()
  }

  // Moves a laddi's burn on: the fuse fizzing along, then the crackers going off
  const burnLaddi = (laddi: Placed, dt: number) => {
    const wickAt = (x: number) => onFirework(laddi, {x, y: laddiWickY})
    let fuseAt: PointData | undefined
    if (laddi.state === "fuse") {
      // From where the match lit it, along the frayed end to the first cracker
      const from = onFirework(laddi, laddiShape.fuseAt)
      const to = wickAt(laddiBlasts[0].x)
      const t = clamp(laddi.elapsed / laddiFuseDuration)
      fuseAt = {x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t)}
      if (laddi.elapsed >= laddiFuseDuration) {
        laddi.state = "burning"
        laddi.nextBlastAt = laddi.elapsed
      }
    }
    if (laddi.state === "burning") {
      if (laddi.elapsed >= laddi.nextBlastAt) {
        const at = laddiBlasts[laddi.blasts]
        laddi.blasts++
        laddi.sprite.texture = Assets.get<Texture>(laddiUrls[laddi.blasts])
        blast(laddi, onFirework(laddi, at))
        laddi.lastBlastAt = laddi.elapsed
        laddi.nextBlastAt = laddi.elapsed + random(0, maxBlastGap)
        if (laddi.blasts === laddiBlasts.length) {
          laddi.state = "spent"
          laddi.spentAt = time
          makePickable(laddi)
        }
      }
      // The fuse burns on between blasts, from the last cracker towards the next
      if (laddi.state === "burning") {
        const last = laddiBlasts[laddi.blasts - 1]
        const next = laddiBlasts[laddi.blasts]
        const gap = Math.max(0.001, laddi.nextBlastAt - laddi.lastBlastAt)
        const t = clamp((laddi.elapsed - laddi.lastBlastAt) / gap)
        fuseAt = wickAt(lerp(last.x, next.x, t))
      }
    }
    if (fuseAt) {
      laddi.sparkDebt += 50 * dt
      while (laddi.sparkDebt >= 1) {
        laddi.sparkDebt--
        emitFuseSpark(laddi, fuseAt)
      }
    }
    smoulder(laddi, onFirework(laddi, laddiBlasts[laddiBlasts.length - 1]), dt)

    // Each blast flashes and lights the porch for a moment; the fuse barely glows
    laddi.brightness *= Math.exp(-blastFade * dt)
    const {brightness, light, glow, core} = laddi
    const shining = brightness > 0.01 || fuseAt !== undefined
    glow.visible = shining
    core.visible = shining
    if (!shining) {
      light.off()
      return
    }
    const lit = Math.max(brightness, fuseAt ? 0.1 : 0)
    const at = brightness > 0.1 || !fuseAt ? laddi.lightAt : fuseAt
    light.shine(at, lerp(40, blastLightRadius, lit), lit * 1.2)
    glow.position.copyFrom(at)
    core.position.copyFrom(at)
    glow.width = glow.height = blastGlowRadius * 2 * (0.3 + 0.7 * lit)
    core.width = core.height = blastCoreRadius * 2 * (0.3 + 0.7 * lit)
    glow.alpha = clamp(lit * 1.5)
    core.alpha = clamp(lit * 3)
  }

  const tick = () => {
    const dt = Math.min(0.05, app.ticker.deltaMS / 1000)
    time += dt
    placed.forEach(firework => {
      if (firework.state === "fuse" || firework.state === "burning") {
        firework.elapsed += dt
      }
      if (firework.kind === "anar") {
        burnAnar(firework, dt)
      } else {
        burnLaddi(firework, dt)
      }
    })

    // The screen's flash dies away as quickly as a blast's light, and only shows while
    // the scene does
    flash *= Math.exp(-blastFade * dt)
    screenFlash.alpha = screenFlashAlpha * flash
    screenFlash.visible = screenFlash.alpha > 0.002

    for (let idx = sparks.length - 1; idx >= 0; idx--) {
      const spark = sparks[idx]
      spark.age += dt
      if (spark.age >= spark.burstAt) {
        spark.burstAt = Infinity
        burst(spark)
      }
      if (spark.kind === "spark" && Math.random() < emberRate * dt) {
        shedEmber(spark)
      }
      const drag = Math.max(0, 1 - airDrag * dt)
      spark.vx *= drag
      spark.vy = spark.vy * drag + gravity * dt
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      if (spark.y > spark.floor && spark.vy > 0) {
        spark.y = spark.floor
        spark.vy *= -bounce
        spark.vx *= 0.5
        // Most of its heat goes into the floor
        spark.life = Math.min(spark.life, spark.age + 0.25)
      }
      const {particle} = spark
      if (spark.age >= spark.life) {
        particle.alpha = 0
        sparks[idx] = sparks[sparks.length - 1]
        sparks.pop()
        freeSparks.push(spark)
        continue
      }
      const t = spark.age / spark.life
      particle.x = spark.x
      particle.y = spark.y
      if (spark.kind === "speck") {
        const size = sparkWidth * 0.8 / sparkTexture.width
        particle.scaleX = particle.scaleY = size
        particle.tint = 0xffffff
        particle.alpha = (1 - t) * random(0.3, 1)
      } else if (spark.kind === "ember") {
        const size = sparkWidth * 0.6 / sparkTexture.width
        particle.scaleX = particle.scaleY = size
        particle.tint = sparkColour(0.35 + 0.65 * t)
        particle.alpha = 0.8 * (1 - t)
      } else {
        // Drawn stretched along its path, the streak a fast spark leaves to the eye
        const speed = Math.hypot(spark.vx, spark.vy)
        const size = sparkWidth * (1 - 0.4 * t) / sparkTexture.width
        particle.rotation = Math.atan2(spark.vy, spark.vx)
        particle.scaleX = size * (1 + speed * streakLength)
        particle.scaleY = size
        particle.tint = sparkColour(t)
        particle.alpha = 1 - t * t
      }
    }

    for (let idx = smoke.length - 1; idx >= 0; idx--) {
      const puff = smoke[idx]
      puff.age += dt
      const {particle} = puff
      if (puff.age >= smokeLife) {
        particle.alpha = 0
        smoke[idx] = smoke[smoke.length - 1]
        smoke.pop()
        freeSmoke.push(puff)
        continue
      }
      const t = puff.age / smokeLife
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
      particle.x = puff.x
      particle.y = puff.y
      particle.scaleX = particle.scaleY = lerp(20, 90, t) / smokeTexture.width
      particle.alpha = smokeAlpha * Math.sin(Math.PI * t)
      // Lit by the nearest fire while it's close to it and burning bright
      const lit = placed.reduce((most, firework) => {
        const nearness = clamp(1 - Math.hypot(puff.x - firework.lightAt.x, puff.y - firework.lightAt.y) / 120)
        return Math.max(most, nearness * firework.brightness)
      }, 0)
      particle.tint = mixColour(smokeTint, litSmokeTint, 0.6 * lit)
    }

    for (let idx = shreds.length - 1; idx >= 0; idx--) {
      const shred = shreds[idx]
      shred.age += dt
      const {particle} = shred
      if (shred.age >= shred.life) {
        particle.alpha = 0
        shreds[idx] = shreds[shreds.length - 1]
        shreds.pop()
        freeShreds.push(shred)
        continue
      }
      // Paper flutters down slowly, and stops still once it's landed
      if (shred.y < shred.floor || shred.vy < 0) {
        const drag = Math.max(0, 1 - shredDrag * dt)
        shred.vx *= drag
        shred.vy = shred.vy * drag + shredGravity * dt
        shred.x += shred.vx * dt
        shred.y = Math.min(shred.floor, shred.y + shred.vy * dt)
        particle.rotation += shred.spin * dt
      }
      particle.x = shred.x
      particle.y = shred.y
      // Fading away in the last part of its life
      particle.alpha = clamp((1 - shred.age / shred.life) / 0.3)
    }
  }
  app.ticker.add(tick)

  const layout = () => {
    bar.layout()
    screenFlash.clear().rect(0, 0, app.screen.width, app.screen.height).fill(screenFlashColour)
  }

  layout()
  render()

  return {
    container,
    layout,
    // Shows its bar, while the Fireworks tool is the one in use
    setHudShown(shown: boolean) {
      hudShown = shown
      bar.setOpacity(shown ? 1 : 0)
      bar.setInteractive(shown)
    },
    setInteractive(value: boolean) {
      interactive = value
      placed.forEach(makePickable)
      // Leaving the scene mid-drag puts whatever was dragged back where it came from
      if (!interactive && drag) {
        const current = drag
        drag = undefined
        setOverBar(false)
        setTarget(undefined)
        returnDrag(current)
        render()
      }
    },
    destroy() {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      app.ticker.remove(tick)
      container.destroy({children: true})
      placed.forEach(firework => firework.sprite.destroy())
      shredLayer.destroy()
      overlays.forEach(overlay => overlay.destroy({children: true}))
      sparkTexture.destroy(true)
      smokeTexture.destroy(true)
      paperTexture.destroy(true)
    },
  }
}

export {createFireworks, fireworksAssets}
