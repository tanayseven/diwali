import {Application, Assets, Container, FederatedPointerEvent, Graphics, Particle, ParticleContainer, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import {quality} from "./app"
import type {createAudioControl} from "./audioControl"
import {createBackground, sceneHeight, sceneWidth} from "./background"
import {Item, createHud} from "./hud"
import {Light, Lighting, radialTexture} from "./lighting"
import {LL} from "./locale"
import {createMatchstick, draggedFrom, HeldMatch, matchFrameUrls} from "./matchstick"
import {createShownParticles} from "./shownParticles"
import {setOutline} from "./outline"
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
// A chakri (a ground spinner) whole with its wick, then its coil burning away from the
// outside in, smeared by its spin, and finally burnt out
const chakriUrls = Array.from({length: 16}, (_, idx) => `sprites/fireworks/chakri-${String(idx + 1).padStart(2, "0")}.svg`)
// A sutli bomb (a firecracker wound tight in twine) whole, then with its wick burnt
// down a step further in each drawing after, and finally blown apart
const sutliUrls = {
  fuse: Array.from({length: 6}, (_, idx) => `sprites/fireworks/sutli-${String(idx + 1).padStart(2, "0")}.svg`),
  spent: "sprites/fireworks/sutli-spent.svg",
}
// A rocket stood in an empty bottle, the bottle it leaves behind, and the rocket on its
// own as it flies
const rocketUrls = {
  unlit: "sprites/fireworks/rocket-unlit.svg",
  bottle: "sprites/fireworks/rocket-bottle.svg",
  flying: "sprites/fireworks/rocket-flying.svg",
}
// Every texture the fireworks need, to be loaded before they're created
const fireworksAssets = [
  ...Object.values(anarUrls), ...laddiUrls, ...chakriUrls, ...sutliUrls.fuse, sutliUrls.spent,
  ...Object.values(rocketUrls), ...matchFrameUrls,
]

type Kind = "anar" | "laddi" | "chakri" | "sutli" | "rocket"

// How each kind of firework's drawings sit in the scene. They're all the same size,
// showing a frame of their drawing's units at a number of pixels to a unit. The origin
// is the point in the drawing that's placed where it's dropped, and they're picked up,
// lit and shown in their slot by an area of it. They're all drawn in the scene's
// perspective, so they're shown as drawn
type Shape = {
  frame: Rectangle
  density: number
  origin: PointData
  area: Rectangle
  // Where the match is put to its fuse
  fuseAt: PointData
  // Scene units per unit of the drawing
  scale: number
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
}
// The laddi lies on the floor seen from in front, its crackers fanning out behind
// and in front of its wick. The wick runs a little downhill from (117, 226.4) to
// (607, 234.1) and frays out past there. It's placed by the middle of its wick, and
// it's about two diyas wide
const laddiWick = {from: {x: 117.2, y: 226.4}, to: {x: 606.9, y: 234.1}}
const laddiShape: Shape = {
  frame: new Rectangle(0, 0, 720, 480),
  density: 1,
  origin: {x: 362, y: 230},
  area: new Rectangle(110, 125, 550, 255),
  fuseAt: {x: 645, y: 255},
  scale: 0.085,
}
// The chakri lies flat on the floor, its coiled disc seen as an ellipse half as tall
// as it's wide, centred on (364, 265), with the wick's frayed tip at (186, 297) by
// the coil's outer end. It's a little smaller than a diya
const chakriDisc = {x: 364, y: 265, rx: 166, ry: 89}
const chakriShape: Shape = {
  frame: new Rectangle(0, 0, 720, 480),
  density: 1,
  origin: {x: chakriDisc.x, y: chakriDisc.y},
  area: new Rectangle(176, 170, 362, 196),
  fuseAt: {x: 186, y: 297},
  scale: 0.065,
}
// The sutli bomb is a squat block of green twine standing on y 89, with a band of red
// and yellow paper round it. Its short wick rises out of a hole in the middle of its
// top at (60, 49) to a frayed tip at (61, 36). It's a little smaller than an anar
const sutliWick = {from: {x: 61, y: 36}, to: {x: 60, y: 49}}
const sutliShape: Shape = {
  frame: new Rectangle(0, 0, 120, 100),
  density: 4,
  origin: {x: 60, y: 89},
  area: new Rectangle(32, 33, 56, 58),
  fuseAt: sutliWick.from,
  scale: 0.3,
}
// The rocket stands in a green glass bottle on y 152, its striped stick down the neck
// and its tube above, from its nose at (30, 9.5) to its base at (30, 52), where it
// fires from. Its fuse curls out of the tube's side, from (41.5, 53) to (34, 47.5).
// The bottle is a little taller than an anar
const rocketNozzle = {x: 30, y: 52}
const rocketShape: Shape = {
  frame: new Rectangle(0, 0, 60, 160),
  density: 4,
  origin: {x: 30, y: 152},
  area: new Rectangle(16, 8, 28, 146),
  fuseAt: {x: 41.5, y: 53},
  scale: 0.34,
}
const shapes: Record<Kind, Shape> = {
  anar: anarShape, laddi: laddiShape, chakri: chakriShape, sutli: sutliShape, rocket: rocketShape,
}
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
const maxSparkRate = 1450 * quality.particleScale
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
const maxSmokeRate = 14 * quality.particleScale
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

// The laddi's crackers, in the order they go off, one per drawing from the second on:
// each one's middle, and how far along the wick it's tied on, which the fuse burns to.
// Each blows apart where it lies: a flash and a burst of light, sparks, shreds of its
// red paper and a puff of smoke, falling to the floor around it, nearer for the
// crackers in front of the wick. They go off in quick, uneven succession once the
// fuse has fizzed along to the first
const laddiBlasts: (PointData & {tied: number})[] = [
  {x: 595.9, y: 296.3, tied: 581.6}, {x: 544.3, y: 190.6, tied: 560.1},
  {x: 547.5, y: 300.1, tied: 534.6}, {x: 498.2, y: 185.1, tied: 512.7},
  {x: 497.4, y: 291.5, tied: 487.8}, {x: 458, y: 185.5, tied: 465.4},
  {x: 442.8, y: 286.5, tied: 441}, {x: 411.9, y: 185.3, tied: 418.2},
  {x: 394.4, y: 285.9, tied: 394.4}, {x: 366.8, y: 189.1, tied: 371.1},
  {x: 347.2, y: 290.9, tied: 347.7}, {x: 321.9, y: 182.6, tied: 324.1},
  {x: 294.6, y: 287.8, tied: 301.2}, {x: 278.5, y: 184.9, tied: 277.2},
  {x: 240.7, y: 290.9, tied: 254.8}, {x: 234.8, y: 182.4, tied: 230.3},
  {x: 195.1, y: 285.7, tied: 208.4}, {x: 192.3, y: 185.8, tied: 183.6},
  {x: 143.8, y: 282.7, tied: 162.1}, {x: 149.3, y: 182.3, tied: 136.9},
]
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
const blastSparks = 64
const blastSpecks = 24
const blastSparkSpeed = {min: 120, max: 320}
const blastPuffs = 3

// How far from a firework what it throws off can reach, in scene units: an anar's
// fountain rises about 300 above it. One whose reach is all off screen throws nothing
const effectReach = {up: 340, side: 260, down: 60}
// How far off screen a spark or a puff of smoke still counts as on it, as each is drawn
// around its middle and a puff grows to 90 across
const sparkMargin = 20
const smokeMargin = 50
// Shreds of paper are thrown up and out, tumble down slowly and lie where they land
const shredsPerBlast = {min: 20, max: 30}
const shredSpeed = {min: 60, max: 200}
const shredGravity = 420
const shredDrag = 3
const shredLife = {min: 2.5, max: 4}
const shredSize = {width: 1.3, height: 0.6}
const shredColours = [0xb8322a, 0xd8503a, 0x8e2018, 0xf2e6c8]

// A sutli bomb's wick takes its time burning down, then it goes off all at once, much
// bigger than a laddi's crackers: a great flash and light, sparks flung up and out,
// scraps of its twine and paper and a cloud of smoke. It's a deep boom, which flashes
// the screen brighter than a cracker does
const sutliFuseDuration = 3
const sutliSoundUrl = "audio/effects/sutli.mp3"
const sutliFlashAlpha = 0.5
const sutliLightColour = 0xffd29a
const sutliLightRadius = 420
const sutliGlowRadius = 70
const sutliCoreRadius = 20
// Its flash and light die away more slowly than a cracker's, per second
const sutliFade = 6
const sutliSparks = 360
const sutliSpecks = 90
const sutliSparkSpeed = {min: 180, max: 560}
const sutliShreds = {min: 70, max: 90}
const sutliPuffs = 16
// Where it bursts from, in its drawing: the middle of its body
const sutliHeart = {x: 60, y: 68}
const sutliShredColours = [0x2f5a22, 0x4c7f36, 0x24481a, 0xc42320, 0xe9be1c, 0xd9c79a]

// A rocket's fuse fizzes into its tube, then it whooshes up out of its bottle, leaning
// a little, driven hard for a moment and coasting on, trailing a shower of sparks that
// rain down on the porch and a line of smoke. It climbs about 450, well clear of the
// roof, and as it slows near the top it pops into a ball of coloured stars that droop
// and fade. In scene units and seconds
const rocketFuse = {from: {x: 41.5, y: 53}, to: {x: 34, y: 47.5}, duration: 1.6}
const rocketThrust = 2000
const rocketThrustFor = 0.6
const rocketDrag = 0.5
const rocketLean = 0.12
const rocketWobble = 0.03
// It bursts once it's climbing slower than this, near the top of its climb, however
// fast it's going sideways
const rocketBurstSpeed = 60
const rocketTrailRate = 800 * quality.particleScale
const rocketTrailSpeed = {min: 60, max: 200}
const rocketTrailSpread = 0.4
const rocketCoastTrailRate = 80 * quality.particleScale
const rocketSmokeRate = 30 * quality.particleScale
const rocketSoundUrl = "audio/effects/rocket.mp3"
const rocketStars = {min: 110, max: 150}
const rocketStarSpeed = {min: 110, max: 220}
const rocketStarLife = {min: 1, max: 1.6}
// Stars feel only this share of gravity, so they droop rather than drop, and are
// drawn this much bigger than a spark
const rocketStarFall = 0.18
const rocketStarSize = 1.8
const rocketBurstSpecks = 40
const rocketBurstPuffs = 6
const rocketColours = [0xb48cff, 0xffc861, 0xff6a5a, 0x7dff9a, 0x76a8ff, 0xff7ad9]
const rocketLightColour = 0xffd8a8
const rocketLightRadius = {flying: 160, burst: 380}
const rocketGlowRadius = 14
const rocketCoreRadius = 5
// Its burst's light dies away, per second
const rocketFade = 5
// A rocket's effects are around it as it flies, and its sparks fall all the way back
// to the porch
const rocketReach = {up: 260, side: 260, down: 700}

// A chakri's fuse fizzes to the coil's end, then it spins up, burns and spins down,
// in seconds. Its drawings go from whole to burnt out over the burn
const chakriFuse = {from: {x: 186, y: 297}, to: {x: 209, y: 310}, duration: 0.8}
const chakriSpinUp = 0.5
// Each one burns for its own time, up to 6 seconds either side of 12
const chakriBurn = {min: 6, max: 18}
const chakriSpinDown = 1.5
// Turns a second at full speed
const chakriSpin = 12
// The coil burns from its outside in, so the fire is at this share of the disc's
// radius, from the start of the burn to its end
const chakriBurnRadius = {from: 0.97, to: 0.5}
// It skitters about while it spins, around where it was put: it heads for a new
// spot this far away now and then, in scene units across the floor
const chakriRoam = 20
const chakriRoamEvery = {min: 0.3, max: 0.9}
const chakriRoamPull = 40
const chakriRoamDamping = 7
// It shakes as it spins, by up to this much
const chakriJitter = 0.35
// The burning end of the coil spits jets of fire as it whirls round, which make a
// ring of flame, fringed like a sunburst. Each lives so briefly it doesn't trail far
// behind the end, and is drawn as a short streak along the way it's shot
const flameRate = 4800 * quality.particleScale
const flameLife = {min: 0.06, max: 0.13}
const flameSpeed = {min: 45, max: 110}
const flameSize = 1.5
const flameStreak = 1 / 35
// It throws sparks all round, flung off its burning end: most skid out across the
// floor, slowing as they go, and some are thrown up and land further out
const chakriSkidRate = 1900 * quality.particleScale
const chakriFlungRate = 560 * quality.particleScale
const skidSpeed = {min: 200, max: 620}
const skidLife = {min: 0.35, max: 1}
const skidDrag = 1.6
// Skidding sparks are drawn with longer streaks than flying ones
const skidStreak = 1 / 70
const chakriSmokeRate = 7 * quality.particleScale
// Its hiss is heard while it spins, at its strength, so it dies away as it slows. The
// recording runs 18 seconds, as long as the longest burn, and was made louder to match
// the anar's
const chakriSoundUrl = "audio/effects/chakri.mp3"
// A chakri lights up the floor around it as it goes
const chakriLightColour = 0xffcf8a
const chakriLightRadius = {min: 60, max: 240}
const chakriGlowRadius = 9
const chakriCoreRadius = 4

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

// A particle keeps its tint and alpha packed into one number, with the tint's red and
// blue swapped. Setting its tint parses that as a colour each time, which is slow for
// the thousands of sparks a frame, so they're packed here instead
const toBgr = (rgb: number) => ((rgb & 0xff) << 16) | (rgb & 0xff00) | (rgb >> 16)
const paint = (particle: Particle, bgr: number, alpha: number) => {
  particle.color = bgr + ((clamp(alpha) * 255 | 0) << 24)
}
// The sparks' colours as they age, worked out once and swapped ready to paint
const sparkTable = Array.from({length: 256}, (_, idx) => toBgr(sparkColour(idx / 255)))
const sparkBgr = (t: number) => sparkTable[Math.round(clamp(t) * 255)]
// A rocket's stars as they age: white hot, then their colour, darkening as they fade
const starTables = rocketColours.map(colour => Array.from({length: 256}, (_, idx) => {
  const t = idx / 255
  const shade = t < 0.06 ? 0xffffff
    : t < 0.25 ? mixColour(0xffffff, colour, (t - 0.06) / 0.19)
    : mixColour(colour, 0x301008, 0.6 * (t - 0.25) / 0.75)
  return toBgr(shade)
}))
const whiteBgr = 0xffffff
const smokeBgr = toBgr(smokeTint)

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
  // A spark from the fountain, a glitter speck (tiny, white and twinkling), an ember
  // shed by a spark (tiny, orange and fading), or a lick of a chakri's flame
  kind: "spark" | "speck" | "ember" | "flame"
  // Skidding along the floor rather than flying, so it doesn't fall
  grounded: boolean
  // When a crackling spark bursts into specks, if it does
  burstAt: number
  // How far down the floor is for this spark, so they land spread out in depth
  floor: number
  // The share of gravity it feels, how much bigger than a spark it's drawn, and its
  // colours as it ages, swapped ready to paint
  fall: number
  size: number
  shades: number[]
}

type Smoke = {particle: Particle, x: number, y: number, vx: number, vy: number, age: number}

type Shred = {
  particle: Particle
  // Its colour, swapped ready to paint
  colour: number
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  age: number
  life: number
  floor: number
}

// A rocket in the air, by its nozzle, and how long its thrust has left
type Flight = {
  sprite: Sprite
  x: number
  y: number
  vx: number
  vy: number
  thrustLeft: number
}

type Placed = {
  kind: Kind
  sprite: Sprite
  // Burning is the anar's fountain, or the laddi's crackers going off
  state: "unlit" | "fuse" | "burning" | "spent"
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
  // An anar's roar or a chakri's hiss, while it's burning
  sound?: ReturnType<ReturnType<AudioControl["createEffect"]>>
  // How many of a laddi's crackers have gone off, when the last did and the next will
  blasts: number
  lastBlastAt: number
  nextBlastAt: number
  // A chakri's turn, where it was put and how far it's roamed from there, how fast and
  // to where, and when it'll head somewhere else
  spin: number
  // How long its coil burns for, picked as it catches
  burnFor: number
  home: PointData
  roam: PointData
  roamVelocity: PointData
  roamGoal: PointData
  nextRoamAt: number
  // A rocket once it's left its bottle, until it bursts
  flight?: Flight
}

// A firework being dragged, from its stack or picked up from the scene, and where to
// put it back
type Drag = {sprite: Sprite, firework: Placed, fromScene?: PointData}

// The fireworks scene's HUD and what's set off from it. Anars (flowerpot fireworks)
// and laddis (strings of firecrackers) are dragged from their stacks onto the porch,
// and can be picked up to move them or dropped on the bar to put them back; burnt-out
// ones are cleared away the same way. The matchstick dragged out of the bar and held
// over an unlit one is struck, and a ring round it fills until its fuse catches; it
// goes back once it's let go. An anar's fizzes down to the nozzle; then it throws up a fountain of sparks
// that crackle and glitter, shedding embers and smoke and lighting up the porch, and
// sputters out after a while. A laddi's fizzes along to its crackers, which go off one
// after another, each with a blast. A chakri's fizzes to its coil, and it spins about
// in a ring of fire. A sutli bomb's fizzes slowly down its wick, and it goes off all at
// once in one great blast. Expects fireworksAssets to have been loaded
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
  const stacks: Record<Kind, Item> = {
    anar: itemFor(anarShape, anarUrls.unlit),
    laddi: itemFor(laddiShape, laddiUrls[0]),
    chakri: itemFor(chakriShape, chakriUrls[0]),
    sutli: itemFor(sutliShape, sutliUrls.fuse[0]),
    rocket: itemFor(rocketShape, rocketUrls.unlit),
  }
  const unlitUrls: Record<Kind, string> = {
    anar: anarUrls.unlit, laddi: laddiUrls[0], chakri: chakriUrls[0], sutli: sutliUrls.fuse[0], rocket: rocketUrls.unlit,
  }
  const kinds: Kind[] = ["anar", "laddi", "chakri", "sutli", "rocket"]
  const matchstick = createMatchstick(app, audio)
  const playAnarSound = audio.createEffect(anarSoundUrl)
  const playChakriSound = audio.createEffect(chakriSoundUrl)
  const blastSounds = blastSoundUrls.map(url => audio.createEffect(url))
  const playSutliSound = audio.createEffect(sutliSoundUrl)
  const playRocketSound = audio.createEffect(rocketSoundUrl)
  const container = new Container()
  // Over the whole screen, under the HUD, for the blasts' flashes
  const screenFlash = new Graphics()
  screenFlash.eventMode = "none"
  screenFlash.visible = false
  // How bright the screen's flash is now, from 0 to 1, how bright it is at its height,
  // and how quickly it dies away
  let flash = 0
  let flashAlpha = screenFlashAlpha
  let flashFade = blastFade
  // Whether the bar is showing, so fireworks can be put back on it
  let hudShown = false
  const bar = createHud(app)
  // Above the HUD, so whatever is being dragged is never hidden behind it
  const dragLayer = new Container()
  container.addChild(screenFlash, bar.container, dragLayer)
  const slots = {
    anar: bar.addItem(0, stacks.anar), laddi: bar.addItem(1, stacks.laddi), chakri: bar.addItem(2, stacks.chakri),
    sutli: bar.addItem(3, stacks.sutli), rocket: bar.addItem(4, stacks.rocket),
  }
  const matchSlot = bar.addItem(5, matchstick.item)

  const tips = LL.tooltip
  const names: Record<Kind, () => string> = {
    anar: tips.anar.name, laddi: tips.laddi.name, chakri: tips.chakri.name, sutli: tips.sutli.name,
    rocket: tips.rocket.name,
  }
  const stackHints: Record<Kind, () => string> = {
    anar: tips.anar.stack, laddi: tips.laddi.stack, chakri: tips.chakri.stack, sutli: tips.sutli.stack,
    rocket: tips.rocket.stack,
  }
  kinds.forEach(kind => addTooltip(slots[kind].container, () => ({
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
  const shownShreds = createShownParticles(shredLayer)
  const shownSmoke = createShownParticles(smokeLayer)
  const shownSparks = createShownParticles(sparkLayer)
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
  // Sparks and flames a spinning chakri owes from earlier frames
  const chakriDebts = new Map<Placed, {flames: number, skids: number, flung: number}>()
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
    const {origin, scale} = shapes[firework.kind]
    return {
      x: firework.sprite.x + (point.x - origin.x) * scale,
      y: firework.sprite.y + (point.y - origin.y) * scale,
    }
  }

  // Particles are reused rather than made afresh, and only drawn while they're alive
  // and on screen
  const sparks: Spark[] = []
  const freeSparks: Spark[] = []
  const smoke: Smoke[] = []
  const freeSmoke: Smoke[] = []
  const shreds: Shred[] = []
  const freeShreds: Shred[] = []

  // Nothing is thrown off by what's off screen, as it would only be seen if it came back
  // into view before burning out. Set while a firework off screen burns
  let offScreen = false

  const addSpark = (
    x: number, y: number, vx: number, vy: number, life: number, kind: Spark["kind"], floor: number, grounded = false,
  ) => {
    if (offScreen) {
      return
    }
    let spark = freeSparks.pop()
    if (!spark) {
      const particle = new Particle({texture: sparkTexture, anchorX: 0.5, anchorY: 0.5})
      spark = {
        particle, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, kind: "spark", grounded: false, burstAt: Infinity, floor: 0,
        fall: 1, size: 1, shades: sparkTable,
      }
    }
    Object.assign(spark, {x, y, vx, vy, age: 0, life, kind, floor, grounded, fall: 1, size: 1, shades: sparkTable})
    spark.burstAt = kind === "spark" && !grounded && Math.random() < glitterShare ? life * random(0.3, 0.7) : Infinity
    sparks.push(spark)
    return spark
  }

  const addSmoke = (x: number, y: number) => {
    if (offScreen) {
      return
    }
    let puff = freeSmoke.pop()
    if (!puff) {
      const particle = new Particle({texture: smokeTexture, anchorX: 0.5, anchorY: 0.5})
      puff = {particle, x: 0, y: 0, vx: 0, vy: 0, age: 0}
    }
    Object.assign(puff, {x, y, vx: random(-5, 5), vy: random(-18, -9), age: 0})
    smoke.push(puff)
  }

  const addShred = (x: number, y: number, floor: number, colours = shredColours, speedUp = 1) => {
    if (offScreen) {
      return
    }
    let shred = freeShreds.pop()
    if (!shred) {
      const particle = new Particle({
        texture: paperTexture, anchorX: 0.5, anchorY: 0.5,
        scaleX: shredSize.width / paperTexture.width, scaleY: shredSize.height / paperTexture.height,
      })
      shred = {particle, colour: 0, x: 0, y: 0, vx: 0, vy: 0, spin: 0, age: 0, life: 0, floor: 0}
    }
    // Thrown up and out, more sideways than up
    const angle = -Math.PI / 2 + random(-1.3, 1.3)
    const speed = random(shredSpeed.min, shredSpeed.max) * speedUp
    Object.assign(shred, {
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: random(-14, 14),
      age: 0, life: random(shredLife.min, shredLife.max), floor,
    })
    shred.colour = toBgr(colours[Math.floor(Math.random() * colours.length)])
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
    bar.drawBoxes(overBar && drag ? slots[drag.firework.kind].box : undefined)
    kinds.forEach(kind => slots[kind].show())
    matchSlot.show(held !== undefined)
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
    const {scale, density} = shapes[firework.kind]
    firework.sprite.scale.set(scale / density * factor)
  }

  // The nearest placed firework under a point on screen that could be lit
  const fireworkAt = (point: PointData) => {
    const at = background.toScene(point)
    return placed
      .filter(firework => firework.state === "unlit")
      .sort((a, b) => b.sprite.zIndex - a.sprite.zIndex)
      .find(firework => {
        const {origin, area, scale} = shapes[firework.kind]
        return area.contains(
          origin.x + (at.x - firework.sprite.x) / scale,
          origin.y + (at.y - firework.sprite.y) / scale,
        )
      })
  }

  const setTarget = (firework: Placed | undefined) => {
    if (target !== firework) {
      if (target) {
        scaleSprite(target)
        setOutline(target.sprite, "selected", false)
      }
      target = firework
      if (target) {
        scaleSprite(target, targetGrowth)
        setOutline(target.sprite, "selected", true)
      }
    }
  }

  // A placed firework can be picked up to move it or put it back, unless it's burning,
  // the match is in hand, or another scene is open
  const makePickable = (firework: Placed) => {
    const burning = firework.state === "fuse" || firework.state === "burning"
    firework.sprite.eventMode = interactive && !held && !burning ? "static" : "none"
  }

  const createFirework = (kind: Kind): Placed => {
    const {frame, origin} = shapes[kind]
    const sprite = new Sprite(Assets.get<Texture>(unlitUrls[kind]))
    sprite.anchor.set((origin.x - frame.x) / frame.width, (origin.y - frame.y) / frame.height)
    sprite.cursor = "grab"
    const lightColours: Record<Kind, number> = {
      anar: lightColour, laddi: blastLightColour, chakri: chakriLightColour, sutli: sutliLightColour,
      rocket: rocketLightColour,
    }
    const light = lighting.addLight(lightColours[kind])
    const glow = new Sprite(glowTexture)
    glow.tint = 0xffd59a
    const core = new Sprite(glowTexture)
    ;[glow, core].forEach(sprite => {
      sprite.anchor.set(0.5)
      sprite.blendMode = "add"
      sprite.visible = false
    })
    const firework: Placed = {
      kind, sprite, state: "unlit", elapsed: 0, brightness: 0, lightAt: {x: 0, y: 0},
      sparkDebt: 0, smokeDebt: 0, spentAt: -Infinity, light, glow, core, blasts: 0, lastBlastAt: 0, nextBlastAt: 0,
      spin: 0, burnFor: 0, home: {x: 0, y: 0}, roam: {x: 0, y: 0}, roamVelocity: {x: 0, y: 0}, roamGoal: {x: 0, y: 0}, nextRoamAt: 0,
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
    firework.home = {x: at.x, y: at.y}
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
    firework.flight?.sprite.destroy()
    firework.sprite.destroy()
    firework.light.destroy()
    firework.glow.destroy()
    firework.core.destroy()
    render()
  }

  // The held match catches a firework's fuse
  const light = (firework: Placed) => {
    firework.state = "fuse"
    if (firework.kind === "anar") {
      firework.sprite.texture = Assets.get<Texture>(anarUrls.lit)
    }
    firework.elapsed = 0
    makePickable(firework)
  }

  // Fireworks are shown while dragged at the size they'll be placed at, so they land as seen
  const startFireworkDrag = (e: FederatedPointerEvent, firework: Placed, fromScene?: PointData) => {
    const {sprite} = firework
    scaleSprite(firework, background.scale())
    sprite.position.copyFrom(e.global)
    sprite.eventMode = "none"
    dragLayer.addChild(sprite)
    setOutline(sprite, "selected", true)
    drag = {sprite, firework, fromScene}
    render()
  }

  // The match in hand while it's dragged, where the pointer last was, and where a
  // press on its slot began, until it's dragged far enough to take it out
  let held: HeldMatch | undefined
  const pointer = new Point()
  let pressedSlotAt: Point | undefined

  // Points the held match at whatever unlit firework it's over, to light it once it's
  // been pressed there long enough
  const aimMatch = () => {
    if (!held) {
      return
    }
    held.moveTo(pointer, background.scale())
    const firework = fireworkAt(pointer)
    setTarget(firework)
    held.setAim(firework && {target: firework, light: () => {
      light(firework)
      // Whatever else is under it now could be lit next
      aimMatch()
    }})
  }

  const putAwayMatch = () => {
    if (!held) {
      return
    }
    held.destroy()
    held = undefined
    setTarget(undefined)
    placed.forEach(makePickable)
    render()
  }

  kinds.forEach(kind => slots[kind].container.on("pointerdown", e => {
    if (stacks[kind].count === 0 || drag) {
      return
    }
    stacks[kind].count! -= 1
    startFireworkDrag(e, createFirework(kind))
  }))

  // A press on the match's slot only takes the match out once it's dragged
  matchSlot.container.on("pointerdown", e => {
    if (!drag && !held) {
      pressedSlotAt = e.global.clone()
    }
  })
  const takeMatch = () => {
    held = matchstick.hold(pointer)
    dragLayer.addChild(held.container)
    placed.forEach(makePickable)
    aimMatch()
    render()
  }

  // Sends the dragged firework back where it came from
  const returnDrag = (current: Drag) => {
    current.sprite.removeFromParent()
    setOutline(current.sprite, "selected", false)
    if (current.fromScene) {
      placeFirework(current.firework, current.fromScene)
    } else {
      removeFirework(current.firework)
    }
  }

  const endDrag = (at: PointData) => {
    if (!drag) {
      return
    }
    const current = drag
    drag = undefined
    setOverBar(false)
    current.sprite.removeFromParent()
    setOutline(current.sprite, "selected", false)
    if (hudShown && bar.isOver(at)) {
      removeFirework(current.firework)
    } else {
      placeFirework(current.firework, background.toScene(at))
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
    const at = toStage(e)
    if (drag) {
      drag.sprite.position.copyFrom(at)
      setOverBar(hudShown && bar.isOver(at))
    } else if (held) {
      pointer.copyFrom(at)
      aimMatch()
    } else if (pressedSlotAt && draggedFrom(pressedSlotAt, at)) {
      pointer.copyFrom(at)
      pressedSlotAt = undefined
      takeMatch()
    }
  }
  // Letting go puts the match back
  const onPointerUp = (e: PointerEvent) => {
    pressedSlotAt = undefined
    putAwayMatch()
    endDrag(toStage(e))
  }
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
        anar.sound = playAnarSound(background.panOf(anar.sprite.position))
        for (let idx = 0; idx < catchPuffs; idx++) {
          addSmoke(nozzle.x + random(-6, 6), nozzle.y - random(0, 12))
        }
      }
    }
    if (anar.state === "burning") {
      strength = fountainStrength(anar)
      anar.sound?.setLevel(strength * anarVolume)
      // Still heard from where it is as the camera pans
      anar.sound?.setPan(background.panOf(anar.sprite.position))
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
    // What's thrown up falls back to the floor around the cracker, where it lay
    const floor = at.y
    for (let idx = 0; idx < blastSparks; idx++) {
      const angle = random(0, Math.PI * 2)
      const speed = random(blastSparkSpeed.min, blastSparkSpeed.max)
      addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.7 - 60,
        random(0.15, 0.4), "spark", floor + random(0, 4))
    }
    for (let idx = 0; idx < blastSpecks; idx++) {
      const angle = random(0, Math.PI * 2)
      const speed = random(30, 90)
      addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed, random(0.1, 0.25), "speck", floor + 3)
    }
    const shredCount = Math.round(random(shredsPerBlast.min, shredsPerBlast.max))
    for (let idx = 0; idx < shredCount; idx++) {
      addShred(at.x, at.y, floor + random(-2, 6))
    }
    for (let idx = 0; idx < blastPuffs; idx++) {
      addSmoke(at.x + random(-4, 4), at.y - random(0, 8))
    }
    laddi.brightness = 1
    laddi.lightAt = at
    flash = 1
    flashAlpha = screenFlashAlpha
    flashFade = blastFade
    blastSounds[Math.floor(Math.random() * blastSounds.length)](background.panOf(at))
  }

  // Moves a laddi's burn on: the fuse fizzing along, then the crackers going off
  const burnLaddi = (laddi: Placed, dt: number) => {
    // A point along the wick, by how far across the drawing it is
    const wickAt = (x: number) => {
      const {from, to} = laddiWick
      return onFirework(laddi, {x, y: lerp(from.y, to.y, (x - from.x) / (to.x - from.x))})
    }
    let fuseAt: PointData | undefined
    if (laddi.state === "fuse") {
      // From where the match lit it, along the frayed end to the first cracker
      const from = onFirework(laddi, laddiShape.fuseAt)
      const to = wickAt(laddiBlasts[0].tied)
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
        fuseAt = wickAt(lerp(last.tied, next.tied, t))
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

  // How hard a chakri is spinning and burning at this point in its life, from 0 to 1:
  // spinning up once its fuse is burnt, and slowing to a stop as its coil runs out
  const spinStrength = (chakri: Placed) => {
    const t = chakri.elapsed - chakriFuse.duration
    const sway = 0.9 + 0.1 * Math.sin(time * 5.3 + chakri.home.x)
    if (t < chakriSpinUp) {
      return t / chakriSpinUp * sway
    }
    return clamp((chakri.burnFor - t) / chakriSpinDown) ** 1.5 * sway
  }

  // A point on a chakri's disc, at a share of its radius and an angle round it, in
  // scene units. Seen in perspective, the disc is an ellipse
  const onDisc = (chakri: Placed, radius: number, angle: number) => onFirework(chakri, {
    x: chakriDisc.x + Math.cos(angle) * chakriDisc.rx * radius,
    y: chakriDisc.y + Math.sin(angle) * chakriDisc.ry * radius,
  })
  // Across the floor, distances front to back look this much shorter
  const floorSquash = chakriDisc.ry / chakriDisc.rx

  // Moves a chakri's burn on: the fuse fizzing to the coil, then the whole thing
  // spinning and skittering about in a ring of fire, throwing sparks all round
  const burnChakri = (chakri: Placed, dt: number) => {
    let strength = 0
    let fuseAt: PointData | undefined
    if (chakri.state === "fuse") {
      const t = clamp(chakri.elapsed / chakriFuse.duration)
      const {from, to} = chakriFuse
      fuseAt = onFirework(chakri, {x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t)})
      chakri.sparkDebt += 60 * dt
      while (chakri.sparkDebt >= 1) {
        chakri.sparkDebt--
        emitFuseSpark(chakri, fuseAt)
      }
      if (chakri.elapsed >= chakriFuse.duration) {
        chakri.state = "burning"
        chakri.burnFor = random(chakriBurn.min, chakriBurn.max)
        chakri.sound = playChakriSound(background.panOf(chakri.sprite.position))
      }
    }
    if (chakri.state === "burning") {
      const t = chakri.elapsed - chakriFuse.duration
      const progress = clamp(t / chakri.burnFor)
      strength = spinStrength(chakri)
      chakri.sound?.setLevel(strength)
      // Heard from where it's skittered to, and as the camera pans
      chakri.sound?.setPan(background.panOf(chakri.sprite.position))
      // Its drawings burn through the coil, after the whole one with its wick
      const frame = 1 + Math.min(chakriUrls.length - 3, Math.floor(progress * (chakriUrls.length - 2)))
      chakri.sprite.texture = Assets.get<Texture>(chakriUrls[frame])
      const lastSpin = chakri.spin
      chakri.spin += chakriSpin * Math.PI * 2 * strength * dt

      // It heads for somewhere new now and then, pulled there and overshooting a little
      const {roam, roamVelocity: velocity, roamGoal: goal} = chakri
      if (time >= chakri.nextRoamAt) {
        const angle = random(0, Math.PI * 2)
        const distance = random(0, chakriRoam)
        goal.x = Math.cos(angle) * distance
        goal.y = Math.sin(angle) * distance * floorSquash
        chakri.nextRoamAt = time + random(chakriRoamEvery.min, chakriRoamEvery.max)
      }
      velocity.x += ((goal.x - roam.x) * chakriRoamPull - velocity.x * chakriRoamDamping) * strength * dt
      velocity.y += ((goal.y - roam.y) * chakriRoamPull - velocity.y * chakriRoamDamping) * strength * dt
      roam.x += velocity.x * dt
      roam.y += velocity.y * dt
      const shake = chakriJitter * strength
      chakri.sprite.position.set(
        chakri.home.x + roam.x + random(-shake, shake),
        chakri.home.y + roam.y + random(-shake, shake) * floorSquash,
      )
      chakri.sprite.zIndex = chakri.sprite.y

      // The burning end whirls round the coil, spitting flame and flinging sparks. They
      // come out spread along the arc it's swept this frame, so the ring has no gaps
      const radius = lerp(chakriBurnRadius.from, chakriBurnRadius.to, progress)
      const along = (share: number) => lerp(lastSpin, chakri.spin, share)
      const emit = (rate: number, debt: "flames" | "skids" | "flung", fling: (angle: number) => void) => {
        debts[debt] += rate * strength * dt
        const count = Math.floor(debts[debt])
        debts[debt] -= count
        for (let idx = 0; idx < count; idx++) {
          fling(along((idx + Math.random()) / count))
        }
      }
      const debts = chakriDebts.get(chakri) ?? {flames: 0, skids: 0, flung: 0}
      chakriDebts.set(chakri, debts)
      // Which way a spark leaves the burning end at an angle round the disc, across the
      // floor: off the back of the end as it whirls past, and outwards
      const flingDirection = (angle: number) => {
        const spread = random(-0.35, 0.35)
        const x = Math.cos(angle) * 0.7 + Math.sin(angle) * 0.9 + spread * Math.cos(angle + Math.PI / 2)
        const y = Math.sin(angle) * 0.7 - Math.cos(angle) * 0.9 + spread * Math.sin(angle + Math.PI / 2)
        const length = Math.hypot(x, y)
        return {x: x / length, y: y / length}
      }
      emit(flameRate, "flames", angle => {
        const at = onDisc(chakri, radius, angle)
        const away = flingDirection(angle)
        const speed = random(flameSpeed.min, flameSpeed.max)
        addSpark(at.x, at.y, away.x * speed, away.y * speed * floorSquash, random(flameLife.min, flameLife.max),
          "flame", at.y, true)
      })
      emit(chakriSkidRate, "skids", angle => {
        const at = onDisc(chakri, radius, angle)
        const away = flingDirection(angle)
        const speed = random(skidSpeed.min, skidSpeed.max)
        addSpark(at.x, at.y, away.x * speed, away.y * speed * floorSquash, random(skidLife.min, skidLife.max),
          "spark", at.y, true)
      })
      emit(chakriFlungRate, "flung", angle => {
        const at = onDisc(chakri, radius, angle)
        const away = flingDirection(angle)
        const speed = random(skidSpeed.min, skidSpeed.max) * 0.8
        addSpark(at.x, at.y, away.x * speed, away.y * speed * floorSquash - random(120, 300),
          random(minSparkLife, maxSparkLife) * 0.7, "spark", at.y + random(0, 4))
      })
      chakri.smokeDebt += chakriSmokeRate * strength * dt
      while (chakri.smokeDebt >= 1) {
        chakri.smokeDebt--
        const centre = onDisc(chakri, 0, 0)
        addSmoke(centre.x + random(-4, 4), centre.y - random(2, 10))
      }

      if (t >= chakri.burnFor) {
        chakri.state = "spent"
        chakri.spentAt = time
        chakri.sound?.stop()
        chakri.sound = undefined
        chakri.sprite.texture = Assets.get<Texture>(chakriUrls[chakriUrls.length - 1])
        // It stays where it stopped
        chakri.home = {x: chakri.home.x + roam.x, y: chakri.home.y + roam.y}
        chakri.sprite.position.copyFrom(chakri.home)
        chakri.sprite.zIndex = chakri.home.y
        chakriDebts.delete(chakri)
        makePickable(chakri)
      }
    }
    const centre = onDisc(chakri, 0, 0)
    smoulder(chakri, centre, dt)

    // The light goes with it, flickering a little; the disc glows white hot in the
    // middle of its ring of fire
    const target = chakri.state === "fuse" ? 0.1 : strength
    chakri.brightness = lerp(chakri.brightness, target, clamp(dt * 12))
    const {brightness, light, glow, core} = chakri
    const shining = brightness > 0.005
    glow.visible = shining
    core.visible = shining
    if (!shining) {
      light.off()
      return
    }
    const flicker = 0.92 + 0.05 * Math.sin(time * 13 + chakri.home.x) + 0.03 * Math.sin(time * 29)
    const lit = brightness * flicker
    chakri.lightAt = fuseAt ?? centre
    light.shine(chakri.lightAt, lerp(chakriLightRadius.min, chakriLightRadius.max, brightness), lit * 1.3)
    const glowAt = fuseAt ?? centre
    glow.position.copyFrom(glowAt)
    core.position.copyFrom(glowAt)
    glow.width = glow.height = chakriGlowRadius * 2 * (0.3 + 0.7 * brightness)
    glow.height *= fuseAt ? 1 : floorSquash * 1.4
    core.width = core.height = chakriCoreRadius * 2 * (0.4 + 0.6 * brightness)
    glow.alpha = clamp(lit * 1.2)
    core.alpha = clamp(lit * 2.5)
  }

  // A sutli bomb goes off: everything's thrown up and out from its middle, and falls
  // back to the floor all round where it stood
  const explode = (sutli: Placed) => {
    const at = onFirework(sutli, sutliHeart)
    const floor = sutli.sprite.y
    for (let idx = 0; idx < sutliSparks; idx++) {
      // Mostly upwards, as the floor holds the blast down
      const angle = -Math.PI / 2 + random(-1.6, 1.6)
      const speed = random(sutliSparkSpeed.min, sutliSparkSpeed.max)
      addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.8,
        random(0.25, 0.8), "spark", floor + random(-6, 10))
    }
    for (let idx = 0; idx < sutliSpecks; idx++) {
      const angle = random(0, Math.PI * 2)
      const speed = random(40, 160)
      addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed - 40, random(0.15, 0.45), "speck", floor + 3)
    }
    const shredCount = Math.round(random(sutliShreds.min, sutliShreds.max))
    for (let idx = 0; idx < shredCount; idx++) {
      addShred(at.x, at.y, floor + random(-8, 12), sutliShredColours, 1.8)
    }
    for (let idx = 0; idx < sutliPuffs; idx++) {
      addSmoke(at.x + random(-14, 14), at.y - random(0, 30))
    }
    sutli.brightness = 1
    sutli.lightAt = at
    flash = 1
    flashAlpha = sutliFlashAlpha
    flashFade = sutliFade
    playSutliSound(background.panOf(at))
  }

  // Moves a sutli bomb's burn on: the fuse fizzing slowly down its wick, then the blast
  const burnSutli = (sutli: Placed, dt: number) => {
    let fuseAt: PointData | undefined
    if (sutli.state === "fuse") {
      const t = clamp(sutli.elapsed / sutliFuseDuration)
      const {from, to} = sutliWick
      fuseAt = onFirework(sutli, {x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t)})
      // Its drawings burn the wick down as the fuse goes, never quite to nothing
      const frame = Math.min(sutliUrls.fuse.length - 1, Math.floor(t * (sutliUrls.fuse.length - 1)) + 1)
      sutli.sprite.texture = Assets.get<Texture>(sutliUrls.fuse[frame])
      sutli.sparkDebt += 60 * dt
      while (sutli.sparkDebt >= 1) {
        sutli.sparkDebt--
        emitFuseSpark(sutli, fuseAt)
      }
      if (sutli.elapsed >= sutliFuseDuration) {
        fuseAt = undefined
        explode(sutli)
        sutli.state = "spent"
        sutli.spentAt = time
        sutli.sprite.texture = Assets.get<Texture>(sutliUrls.spent)
        makePickable(sutli)
      }
    }
    smoulder(sutli, onFirework(sutli, {x: 60, y: 86}), dt)

    // The blast lights the porch and dies away; the fuse barely glows
    sutli.brightness *= Math.exp(-sutliFade * dt)
    const {brightness, light, glow, core} = sutli
    const shining = brightness > 0.01 || fuseAt !== undefined
    glow.visible = shining
    core.visible = shining
    if (!shining) {
      light.off()
      return
    }
    const lit = Math.max(brightness, fuseAt ? 0.1 : 0)
    const at = fuseAt ?? sutli.lightAt
    light.shine(at, lerp(40, sutliLightRadius, lit), lit * 1.4)
    glow.position.copyFrom(at)
    core.position.copyFrom(at)
    glow.width = glow.height = (fuseAt ? blastGlowRadius : sutliGlowRadius) * 2 * (0.3 + 0.7 * lit)
    core.width = core.height = (fuseAt ? blastCoreRadius : sutliCoreRadius) * 2 * (0.3 + 0.7 * lit)
    glow.alpha = clamp(lit * 1.5)
    core.alpha = clamp(lit * 3)
  }

  // A rocket leaves its bottle, flying from its nozzle
  const launch = (rocket: Placed) => {
    const nozzle = onFirework(rocket, rocketNozzle)
    const sprite = new Sprite(Assets.get<Texture>(rocketUrls.flying))
    const {frame, density, scale} = rocketShape
    sprite.anchor.set((rocketNozzle.x - frame.x) / frame.width, (rocketNozzle.y - frame.y) / frame.height)
    sprite.scale.set(scale / density)
    sprite.eventMode = "none"
    // In front of its bottle as it leaves
    sprite.zIndex = rocket.sprite.zIndex + 0.5
    const lean = random(-rocketLean, rocketLean)
    rocket.flight = {sprite, x: nozzle.x, y: nozzle.y, vx: Math.sin(lean) * 40, vy: -Math.cos(lean) * 40, thrustLeft: rocketThrustFor}
    sprite.position.copyFrom(nozzle)
    sprite.rotation = lean
    background.decorations.addChild(sprite)
    rocket.sprite.texture = Assets.get<Texture>(rocketUrls.bottle)
    rocket.sound = playRocketSound(background.panOf(nozzle))
    for (let idx = 0; idx < catchPuffs; idx++) {
      addSmoke(nozzle.x + random(-4, 4), nozzle.y - random(0, 8))
    }
  }

  // A rocket pops into a ball of coloured stars at the top of its climb
  const burstRocket = (rocket: Placed, flight: Flight) => {
    const floor = rocket.sprite.y
    const shades = starTables[Math.floor(Math.random() * starTables.length)]
    const count = Math.round(random(rocketStars.min, rocketStars.max) * quality.particleScale)
    for (let idx = 0; idx < count; idx++) {
      // Spread evenly round, and some coming more towards or away, filling in the middle
      const angle = random(0, Math.PI * 2)
      const speed = random(rocketStarSpeed.min, rocketStarSpeed.max) * Math.sqrt(random(0.15, 1))
      const star = addSpark(flight.x, flight.y, flight.vx * 0.3 + Math.cos(angle) * speed,
        flight.vy * 0.3 + Math.sin(angle) * speed, random(rocketStarLife.min, rocketStarLife.max), "spark",
        floor + random(-4, 8))
      if (star) {
        star.fall = rocketStarFall
        star.size = rocketStarSize
        star.shades = shades
      }
    }
    for (let idx = 0; idx < rocketBurstSpecks; idx++) {
      const angle = random(0, Math.PI * 2)
      const speed = random(30, 120)
      addSpark(flight.x, flight.y, Math.cos(angle) * speed, Math.sin(angle) * speed, random(0.15, 0.4), "speck", floor)
    }
    for (let idx = 0; idx < rocketBurstPuffs; idx++) {
      addSmoke(flight.x + random(-10, 10), flight.y + random(-10, 10))
    }
    rocket.brightness = 1
    rocket.lightAt = {x: flight.x, y: flight.y}
    flash = 1
    flashAlpha = screenFlashAlpha
    flashFade = blastFade
    blastSounds[Math.floor(Math.random() * blastSounds.length)](background.panOf(rocket.lightAt))
    rocket.sound?.stop()
    rocket.sound = undefined
    flight.sprite.destroy()
    rocket.flight = undefined
    rocket.state = "spent"
    rocket.spentAt = time
    makePickable(rocket)
  }

  // Moves a rocket on: the fuse fizzing into its tube, then its flight, and its burst
  const burnRocket = (rocket: Placed, dt: number) => {
    let fuseAt: PointData | undefined
    if (rocket.state === "fuse") {
      const t = clamp(rocket.elapsed / rocketFuse.duration)
      const {from, to} = rocketFuse
      fuseAt = onFirework(rocket, {x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t)})
      rocket.sparkDebt += 60 * dt
      while (rocket.sparkDebt >= 1) {
        rocket.sparkDebt--
        emitFuseSpark(rocket, fuseAt)
      }
      if (rocket.elapsed >= rocketFuse.duration) {
        rocket.state = "burning"
        fuseAt = undefined
        launch(rocket)
      }
    }
    const {flight} = rocket
    if (rocket.state === "burning" && flight) {
      // Driven along the way it's heading while its thrust lasts, wobbling a little,
      // then coasting, slowed by gravity and the air
      const thrusting = flight.thrustLeft > 0
      flight.thrustLeft -= dt
      const heading = Math.atan2(flight.vx, -flight.vy) + Math.sin(time * 17 + rocket.home.x) * rocketWobble
      const push = thrusting ? rocketThrust : 0
      const drag = Math.max(0, 1 - rocketDrag * dt)
      flight.vx = (flight.vx + Math.sin(heading) * push * dt) * drag
      flight.vy = (flight.vy - Math.cos(heading) * push * dt + gravity * dt) * drag
      flight.x += flight.vx * dt
      flight.y += flight.vy * dt
      flight.sprite.position.set(flight.x, flight.y)
      flight.sprite.rotation = Math.atan2(flight.vx, -flight.vy)
      rocket.sound?.setPan(background.panOf(flight))

      // Sparks stream back out of its nozzle, a shower while it's driven and a dribble
      // as it coasts, and fall back to the porch around its bottle
      const back = Math.atan2(flight.vy, flight.vx) + Math.PI
      rocket.sparkDebt += (thrusting ? rocketTrailRate : rocketCoastTrailRate) * dt
      while (rocket.sparkDebt >= 1) {
        rocket.sparkDebt--
        const angle = back + random(-rocketTrailSpread, rocketTrailSpread)
        const speed = random(rocketTrailSpeed.min, rocketTrailSpeed.max)
        addSpark(flight.x, flight.y, flight.vx * 0.2 + Math.cos(angle) * speed, flight.vy * 0.2 + Math.sin(angle) * speed,
          random(0.3, 0.7), thrusting ? "spark" : "ember", rocket.sprite.y + random(-4, 8))
      }
      if (thrusting) {
        rocket.smokeDebt += rocketSmokeRate * dt
        while (rocket.smokeDebt >= 1) {
          rocket.smokeDebt--
          addSmoke(flight.x + random(-2, 2), flight.y + random(0, 6))
        }
      }
      rocket.lightAt = {x: flight.x, y: flight.y}
      if (!thrusting && flight.vy >= -rocketBurstSpeed) {
        burstRocket(rocket, flight)
      }
    }
    smoulder(rocket, onFirework(rocket, {x: 30, y: 72}), dt)

    // Its flame lights what it passes while it's driven, and its burst lights up the
    // porch and dies away
    const flying = rocket.flight !== undefined
    const target = fuseAt ? 0.1 : flying ? (rocket.flight!.thrustLeft > 0 ? 0.7 : 0.25) : 0
    rocket.brightness = flying || fuseAt
      ? lerp(rocket.brightness, target, clamp(dt * 12))
      : rocket.brightness * Math.exp(-rocketFade * dt)
    const {brightness, light, glow, core} = rocket
    const shining = brightness > 0.01
    glow.visible = shining
    core.visible = shining
    if (!shining) {
      light.off()
      return
    }
    const at = fuseAt ?? rocket.lightAt
    const bursting = !flying && !fuseAt
    light.shine(at, lerp(40, bursting ? rocketLightRadius.burst : rocketLightRadius.flying, brightness), brightness * 1.3)
    glow.position.copyFrom(at)
    core.position.copyFrom(at)
    glow.width = glow.height = (bursting ? sutliGlowRadius : rocketGlowRadius) * 2 * (0.3 + 0.7 * brightness)
    core.width = core.height = (bursting ? blastCoreRadius : rocketCoreRadius) * 2 * (0.3 + 0.7 * brightness)
    glow.alpha = clamp(brightness * 1.5)
    core.alpha = clamp(brightness * 3)
  }

  const tick = () => {
    const dt = Math.min(0.05, app.ticker.deltaMS / 1000)
    time += dt
    placed.forEach(firework => {
      if (firework.state === "fuse" || firework.state === "burning") {
        firework.elapsed += dt
      }
      // It still burns, lights the porch and is heard while it's off screen, but throws
      // nothing off unless what it throws would reach the screen
      const {x, y} = firework.flight ?? firework.sprite
      const reach = firework.kind === "rocket" ? rocketReach : effectReach
      offScreen = !background.overlapsView(x - reach.side, y - reach.up, x + reach.side, y + reach.down)
      if (firework.kind === "anar") {
        burnAnar(firework, dt)
      } else if (firework.kind === "laddi") {
        burnLaddi(firework, dt)
      } else if (firework.kind === "sutli") {
        burnSutli(firework, dt)
      } else if (firework.kind === "rocket") {
        burnRocket(firework, dt)
      } else {
        burnChakri(firework, dt)
      }
    })
    offScreen = false

    // The screen's flash dies away as quickly as a blast's light, and only shows while
    // the scene does
    flash *= Math.exp(-flashFade * dt)
    screenFlash.alpha = flashAlpha * flash
    screenFlash.visible = screenFlash.alpha > 0.002

    for (let idx = sparks.length - 1; idx >= 0; idx--) {
      const spark = sparks[idx]
      spark.age += dt
      // Specks and embers only come off sparks that can be seen
      offScreen = !background.inView(spark.x, spark.y, sparkMargin)
      if (spark.age >= spark.burstAt) {
        spark.burstAt = Infinity
        burst(spark)
      }
      // Sparks skidding on the floor leave their streak for a trail; an ember shed there
      // would only die where it fell
      if (spark.kind === "spark" && !spark.grounded && Math.random() < emberRate * dt) {
        shedEmber(spark)
      }
      offScreen = false
      if (spark.grounded) {
        // Skidding across the floor, it only slows down, and the floor is wherever it is
        const drag = Math.max(0, 1 - skidDrag * dt)
        spark.vx *= drag
        spark.vy *= drag
        spark.x += spark.vx * dt
        spark.y += spark.vy * dt
        spark.floor = spark.y
      } else {
        const drag = Math.max(0, 1 - airDrag * dt)
        spark.vx *= drag
        spark.vy = spark.vy * drag + gravity * spark.fall * dt
        spark.x += spark.vx * dt
        spark.y += spark.vy * dt
      }
      if (!spark.grounded && spark.y > spark.floor && spark.vy > 0) {
        spark.y = spark.floor
        spark.vy *= -bounce
        spark.vx *= 0.5
        // Most of its heat goes into the floor
        spark.life = Math.min(spark.life, spark.age + 0.25)
      }
      const {particle} = spark
      if (spark.age >= spark.life) {
        sparks[idx] = sparks[sparks.length - 1]
        sparks.pop()
        freeSparks.push(spark)
        continue
      }
      if (!background.inView(spark.x, spark.y, sparkMargin)) {
        continue
      }
      shownSparks.show(particle)
      const t = spark.age / spark.life
      particle.x = spark.x
      particle.y = spark.y
      if (spark.kind === "speck") {
        const size = sparkWidth * 0.8 / sparkTexture.width
        particle.scaleX = particle.scaleY = size
        paint(particle, whiteBgr, (1 - t) * random(0.3, 1))
      } else if (spark.kind === "flame") {
        const speed = Math.hypot(spark.vx, spark.vy)
        const size = flameSize * (1 - 0.4 * t) / sparkTexture.width
        particle.rotation = Math.atan2(spark.vy, spark.vx)
        particle.scaleX = size * (1 + speed * flameStreak)
        particle.scaleY = size
        paint(particle, sparkBgr(0.18 + 0.6 * t), 1 - t * t)
      } else if (spark.kind === "ember") {
        const size = sparkWidth * 0.6 / sparkTexture.width
        particle.scaleX = particle.scaleY = size
        paint(particle, sparkBgr(0.35 + 0.65 * t), 0.8 * (1 - t))
      } else {
        // Drawn stretched along its path, the streak a fast spark leaves to the eye
        const speed = Math.hypot(spark.vx, spark.vy)
        const size = sparkWidth * spark.size * (1 - 0.4 * t) / sparkTexture.width
        particle.rotation = Math.atan2(spark.vy, spark.vx)
        particle.scaleX = size * (1 + speed * (spark.grounded ? skidStreak : streakLength))
        particle.scaleY = size
        paint(particle, spark.shades[Math.round(t * 255)], 1 - t * t)
      }
    }

    for (let idx = smoke.length - 1; idx >= 0; idx--) {
      const puff = smoke[idx]
      puff.age += dt
      const {particle} = puff
      if (puff.age >= smokeLife) {
        smoke[idx] = smoke[smoke.length - 1]
        smoke.pop()
        freeSmoke.push(puff)
        continue
      }
      const t = puff.age / smokeLife
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
      if (!background.inView(puff.x, puff.y, smokeMargin)) {
        continue
      }
      shownSmoke.show(particle)
      particle.x = puff.x
      particle.y = puff.y
      particle.scaleX = particle.scaleY = lerp(20, 90, t) / smokeTexture.width
      // Lit by the nearest fire while it's close to it and burning bright
      const lit = placed.reduce((most, firework) => {
        const nearness = clamp(1 - Math.hypot(puff.x - firework.lightAt.x, puff.y - firework.lightAt.y) / 120)
        return Math.max(most, nearness * firework.brightness)
      }, 0)
      const colour = lit > 0.005 ? toBgr(mixColour(smokeTint, litSmokeTint, 0.6 * lit)) : smokeBgr
      paint(particle, colour, smokeAlpha * Math.sin(Math.PI * t))
    }

    for (let idx = shreds.length - 1; idx >= 0; idx--) {
      const shred = shreds[idx]
      shred.age += dt
      const {particle} = shred
      if (shred.age >= shred.life) {
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
      if (!background.inView(shred.x, shred.y, sparkMargin)) {
        continue
      }
      shownShreds.show(particle)
      particle.x = shred.x
      particle.y = shred.y
      // Fading away in the last part of its life
      paint(particle, shred.colour, (1 - shred.age / shred.life) / 0.3)
    }

    shownSparks.draw()
    shownSmoke.draw()
    shownShreds.draw()
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
    // Shows its bar, while the Fireworks tool is the one in use. The match is put away
    // with the bar
    setHudShown(shown: boolean) {
      hudShown = shown
      bar.setShown(shown)
      bar.setInteractive(shown)
      if (!shown) {
        putAwayMatch()
      }
    },
    setInteractive(value: boolean) {
      interactive = value
      placed.forEach(makePickable)
      // Leaving the scene puts the match away, and whatever was dragged back where it
      // came from
      if (!interactive) {
        putAwayMatch()
      }
      if (!interactive && drag) {
        const current = drag
        drag = undefined
        setOverBar(false)
        returnDrag(current)
        render()
      }
    },
    destroy() {
      putAwayMatch()
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      app.ticker.remove(tick)
      container.destroy({children: true})
      placed.forEach(firework => {
        firework.flight?.sprite.destroy()
        firework.sprite.destroy()
      })
      shredLayer.destroy()
      overlays.forEach(overlay => overlay.destroy({children: true}))
      sparkTexture.destroy(true)
      smokeTexture.destroy(true)
      paperTexture.destroy(true)
    },
  }
}

export {blastSoundUrls, createFireworks, fireworksAssets, mixColour, paint, toBgr}
