import {Application, Assets, Container, FederatedPointerEvent, Particle, ParticleContainer, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import type {createAudioControl} from "./audioControl"
import {createBackground, sceneHeight, sceneWidth} from "./background"
import {Item, createHud} from "./hud"
import {Light, Lighting, radialTexture} from "./lighting"
import {createMatchstick, matchFrameUrls} from "./matchstick"

type Background = ReturnType<typeof createBackground>
type AudioControl = ReturnType<typeof createAudioControl>

// An anar's drawing before it's lit, once it's lit (its fuse burnt down to a stub and
// its tip scorched), and after it's burnt out (sooty, with an ash crater for a tip)
const anarUrls = {
  unlit: "sprites/fireworks/anar-unlit.svg",
  lit: "sprites/fireworks/anar-lit.svg",
  spent: "sprites/fireworks/anar-spent.svg",
}
// Every texture the fireworks need, to be loaded before they're created
const fireworksAssets = [...Object.values(anarUrls), ...matchFrameUrls]

// The anar SVGs are the pot cropped out of bigger drawings, keeping their units: they
// show the 104 x 72 of them from (128, 428), at 4 pixels to a unit, with room for the
// scorch a spent one leaves on the floor. The cone stands on y 484 and narrows to its
// nozzle at y 446, with the fuse running up to (182, 431)
const svgFrame = {x: 128, y: 428, width: 104, height: 72}
const svgDensity = 4
const potBase = {x: 180, y: 484}
const nozzleAt = {x: 180, y: 446}
const fuseTipAt = {x: 182, y: 431}
// The pot and its fuse in the drawing, to fill a slot and to be picked up or lit by
const potArea = new Rectangle(154, 428, 52, 62)
// Scene units per unit of the drawing, so the pot is a little smaller than a diya
const anarScale = 0.42
// An anar that can be lit grows this much while the match is dragged over it
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

type PlacedAnar = {
  sprite: Sprite
  state: "unlit" | "fuse" | "burning" | "spent"
  // While the match is lighting it, it can't be picked up or lit again
  busy: boolean
  // Time since its fuse was lit, in seconds
  elapsed: number
  // How brightly it's burning, from 0 to 1, eased so its light never jumps
  brightness: number
  // Sparks and puffs owed from earlier frames, as they rarely come out to a whole number
  sparkDebt: number
  smokeDebt: number
  // When it burnt out, for the smoke that lingers after
  spentAt: number
  // Its light on the scene, and its glow over it
  light: Light
  // Its roar, while it's burning
  sound?: ReturnType<ReturnType<AudioControl["createEffect"]>>
  glow: Sprite
  core: Sprite
}

type Drag =
  // An anar, from the stack or picked up from the scene, and where to put it back
  | {kind: "anar", sprite: Sprite, anar: PlacedAnar, fromScene?: PointData}
  | {kind: "match", sprite: Sprite}

// The fireworks scene's HUD and what's set off from it. Anars (flowerpot fireworks)
// are dragged from their stack onto the porch, and can be picked up to move them or
// dropped on the bar to put them back; burnt-out ones are cleared away the same way.
// The matchstick dragged onto an unlit anar lights its fuse, which fizzes down to the
// nozzle; then it throws up a fountain of sparks that crackle and glitter, shedding
// embers and smoke and lighting up the porch, and sputters out after a while.
// Expects fireworksAssets to have been loaded
const createFireworks = (app: Application, background: Background, lighting: Lighting, audio: AudioControl) => {
  const anars: Item = {url: anarUrls.unlit, crop: new Rectangle(
    (potArea.x - svgFrame.x) * svgDensity, (potArea.y - svgFrame.y) * svgDensity,
    potArea.width * svgDensity, potArea.height * svgDensity,
  ), count: 5}
  const matchstick = createMatchstick(app, audio)
  const playAnarSound = audio.createEffect(anarSoundUrl)
  const container = new Container()
  const bar = createHud(app)
  // Above the HUD, so whatever is being dragged is never hidden behind it
  const dragLayer = new Container()
  container.addChild(bar.container, dragLayer)
  const anarSlot = bar.addItem(0, anars)
  const matchSlot = bar.addItem(1, matchstick.item)
  const anarTexture = Assets.get<Texture>(anarUrls.unlit)
  // Scene units per pixel of the anars' textures, which are all the same size
  const spriteScale = anarScale * svgFrame.width / anarTexture.width

  const sparkTexture = radialTexture(32, [[0, 1], [0.3, 0.85], [1, 0]])
  const {glowTexture} = lighting
  const smokeTexture = radialTexture(64, [[0, 0.5], [0.5, 0.25], [1, 0]])

  // Over the darkness: smoke, then the sparks, then the glows at the nozzles
  const smokeLayer = new ParticleContainer({dynamicProperties: {position: true, vertex: true, color: true}})
  const sparkLayer = new ParticleContainer({dynamicProperties: {position: true, vertex: true, rotation: true, color: true}})
  sparkLayer.blendMode = "add"
  const sceneArea = new Rectangle(0, 0, sceneWidth, sceneHeight)
  smokeLayer.boundsArea = sceneArea
  sparkLayer.boundsArea = sceneArea
  const glowLayer = new Container()
  glowLayer.eventMode = "none"
  const overlays = [smokeLayer, sparkLayer, glowLayer]
  overlays.forEach((overlay, idx) => {
    overlay.zIndex = lighting.aboveNight + idx
  })
  // Lower anars are nearer, so they're drawn in front, like the diyas
  background.decorations.sortableChildren = true
  background.decorations.addChild(...overlays)

  const placed: PlacedAnar[] = []
  let drag: Drag | undefined
  // Whether a dragged anar is over the bar, where letting go puts it back on the stack
  let overBar = false
  // The placed anar the match would light if let go now
  let target: PlacedAnar | undefined
  // Whether the fireworks scene is open, so its HUD and placed anars can be used
  let interactive = false
  let time = 0

  // A point in an anar's drawing, in scene units
  const onAnar = (anar: PlacedAnar, point: PointData) => ({
    x: anar.sprite.x + (point.x - potBase.x) * anarScale,
    y: anar.sprite.y + (point.y - potBase.y) * anarScale,
  })

  // Particles are reused rather than removed: a spent one is hidden until it's needed
  const sparks: Spark[] = []
  const freeSparks: Spark[] = []
  const smoke: Smoke[] = []
  const freeSmoke: Smoke[] = []

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

  // A spark from an anar's fountain, leaving the nozzle at a speed that grows with it
  const emitSpark = (anar: PlacedAnar, strength: number) => {
    const nozzle = onAnar(anar, nozzleAt)
    const angle = -Math.PI / 2 + (Math.random() + Math.random() - 1) * sparkSpread
    const speed = random(minSparkSpeed, maxSparkSpeed) * (0.45 + 0.55 * Math.sqrt(strength))
    addSpark(nozzle.x, nozzle.y, Math.cos(angle) * speed, Math.sin(angle) * speed,
      random(minSparkLife, maxSparkLife), "spark", anar.sprite.y + random(-4, 8))
  }

  // A fizzing spark off a burning fuse, thrown any way
  const emitFuseSpark = (anar: PlacedAnar, at: PointData) => {
    const angle = random(0, Math.PI * 2)
    const speed = random(15, 45)
    addSpark(at.x, at.y, Math.cos(angle) * speed, Math.sin(angle) * speed - 15,
      random(0.15, 0.4), "speck", anar.sprite.y + random(-2, 4))
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
  const fountainStrength = (anar: PlacedAnar) => {
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
    bar.drawBoxes(overBar ? anarSlot.box : undefined)
    anarSlot.show()
    matchSlot.show(drag?.kind === "match")
  }

  const setOverBar = (value: boolean) => {
    if (overBar !== value) {
      overBar = value
      render()
    }
  }

  // The nearest placed anar under a point on screen that could be lit
  const anarAt = (point: PointData) => {
    const at = background.toScene(point)
    return placed
      .filter(anar => anar.state === "unlit" && !anar.busy)
      .sort((a, b) => b.sprite.zIndex - a.sprite.zIndex)
      .find(({sprite}) => potArea.contains(
        potBase.x + (at.x - sprite.x) / anarScale,
        potBase.y + (at.y - sprite.y) / anarScale,
      ))
  }

  const setTarget = (anar: PlacedAnar | undefined) => {
    if (target !== anar) {
      target?.sprite.scale.set(spriteScale)
      target = anar
      target?.sprite.scale.set(spriteScale * targetGrowth)
    }
  }

  // A placed anar can be picked up to move it or put it back, unless it's burning or
  // being lit, or another scene is open
  const makePickable = (anar: PlacedAnar) => {
    const {sprite} = anar
    const burning = anar.state === "fuse" || anar.state === "burning"
    sprite.eventMode = interactive && !anar.busy && !burning ? "static" : "none"
  }

  const createAnar = (): PlacedAnar => {
    const sprite = new Sprite(anarTexture)
    sprite.anchor.set((potBase.x - svgFrame.x) / svgFrame.width, (potBase.y - svgFrame.y) / svgFrame.height)
    sprite.cursor = "grab"
    const light = lighting.addLight(lightColour)
    const glow = new Sprite(glowTexture)
    glow.tint = 0xffd59a
    const core = new Sprite(glowTexture)
    ;[glow, core].forEach(sprite => {
      sprite.anchor.set(0.5)
      sprite.blendMode = "add"
      sprite.visible = false
    })
    const anar: PlacedAnar = {
      sprite, state: "unlit", busy: false, elapsed: 0, brightness: 0,
      sparkDebt: 0, smokeDebt: 0, spentAt: -Infinity, light, glow, core,
    }
    sprite.on("pointerdown", e => {
      const fromScene = {x: sprite.x, y: sprite.y}
      placed.splice(placed.indexOf(anar), 1)
      sprite.removeFromParent()
      startAnarDrag(e, anar, fromScene)
    })
    return anar
  }

  const placeAnar = (anar: PlacedAnar, at: PointData) => {
    const {sprite} = anar
    sprite.scale.set(spriteScale)
    sprite.position.copyFrom(at)
    sprite.zIndex = at.y
    background.decorations.addChild(sprite)
    glowLayer.addChild(anar.glow, anar.core)
    makePickable(anar)
    if (!placed.includes(anar)) {
      placed.push(anar)
    }
  }

  // An unlit anar goes back on the stack; a burnt-out one is simply cleared away
  const removeAnar = (anar: PlacedAnar) => {
    const index = placed.indexOf(anar)
    if (index >= 0) {
      placed.splice(index, 1)
    }
    if (anar.state === "unlit") {
      anars.count! += 1
    }
    anar.sound?.stop()
    anar.sprite.destroy()
    anar.light.destroy()
    anar.glow.destroy()
    anar.core.destroy()
    render()
  }

  // Strikes the match against an anar's fuse; the fuse catches as the match does
  const light = (anar: PlacedAnar) => {
    anar.busy = true
    makePickable(anar)
    // In front of the anar it's lighting
    matchstick.strike(background.decorations, onAnar(anar, fuseTipAt), anar.sprite.zIndex + 0.5, () => {
      anar.state = "fuse"
      anar.sprite.texture = Assets.get<Texture>(anarUrls.lit)
      anar.elapsed = 0
      makePickable(anar)
    }, () => {
      anar.busy = false
      makePickable(anar)
    })
  }

  const startDrag = (e: FederatedPointerEvent, next: Drag, scale: number) => {
    const {sprite} = next
    sprite.scale.set(scale)
    sprite.position.copyFrom(e.global)
    sprite.eventMode = "none"
    dragLayer.addChild(sprite)
    drag = next
    render()
  }

  // Anars are shown while dragged at the size they'll be placed at, so they land as seen
  const startAnarDrag = (e: FederatedPointerEvent, anar: PlacedAnar, fromScene?: PointData) => {
    startDrag(e, {kind: "anar", sprite: anar.sprite, anar, fromScene}, background.scale() * spriteScale)
  }

  anarSlot.container.on("pointerdown", e => {
    if (anars.count === 0 || drag) {
      return
    }
    anars.count! -= 1
    startAnarDrag(e, createAnar())
  })

  // The match is held by its head, so it's the head that's put to a fuse
  matchSlot.container.on("pointerdown", e => {
    if (drag) {
      return
    }
    startDrag(e, {kind: "match", sprite: matchstick.createSprite()}, background.scale() * matchstick.scale)
  })

  // Sends whatever's dragged back where it came from
  const returnDrag = (current: Drag) => {
    current.sprite.removeFromParent()
    if (current.kind === "anar") {
      if (current.fromScene) {
        placeAnar(current.anar, current.fromScene)
      } else {
        removeAnar(current.anar)
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
    if (current.kind === "anar") {
      if (bar.isOver(at)) {
        removeAnar(current.anar)
      } else {
        placeAnar(current.anar, background.toScene(at))
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
    if (drag.kind === "anar") {
      setOverBar(bar.isOver(at))
    } else {
      setTarget(anarAt(at))
    }
  }
  const onPointerUp = (e: PointerEvent) => endDrag(toStage(e))
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  // Moves an anar's burn on, emitting its sparks and smoke and setting its light
  const burn = (anar: PlacedAnar, dt: number) => {
    let strength = 0
    let fuseAt: PointData | undefined
    const nozzle = onAnar(anar, nozzleAt)
    if (anar.state === "fuse" || anar.state === "burning") {
      anar.elapsed += dt
    }
    if (anar.state === "fuse") {
      const fuseTip = onAnar(anar, fuseTipAt)
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
      anar.sound?.setLevel(strength)
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
    const smouldering = clamp(1 - (time - anar.spentAt) / spentSmokeDuration)
    if (anar.state === "spent" && smouldering > 0) {
      anar.smokeDebt += 3 * smouldering * dt
      while (anar.smokeDebt >= 1) {
        anar.smokeDebt--
        addSmoke(nozzle.x + random(-1, 1), nozzle.y - random(0, 4))
      }
    }

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
    const lightAt = fuseAt ?? {x: nozzle.x, y: nozzle.y - lightRise * brightness}
    light.shine(lightAt, lerp(minLightRadius, maxLightRadius, brightness), lit * 1.4)
    const glowAt = fuseAt ?? nozzle
    glow.position.copyFrom(glowAt)
    core.position.copyFrom(glowAt)
    glow.width = glow.height = glowRadius * 2 * (0.4 + 0.6 * brightness)
    core.width = core.height = coreRadius * 2 * (0.5 + 0.5 * brightness)
    glow.alpha = clamp(lit * 1.5)
    core.alpha = clamp(lit * 3)
  }

  const tick = () => {
    const dt = Math.min(0.05, app.ticker.deltaMS / 1000)
    time += dt
    placed.forEach(anar => burn(anar, dt))

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
      const lighting = placed.reduce((most, anar) => {
        const nozzle = onAnar(anar, nozzleAt)
        const nearness = clamp(1 - Math.hypot(puff.x - nozzle.x, puff.y - nozzle.y) / 120)
        return Math.max(most, nearness * anar.brightness)
      }, 0)
      particle.tint = mixColour(smokeTint, litSmokeTint, 0.6 * lighting)
    }
  }
  app.ticker.add(tick)

  render()

  return {
    container,
    layout: bar.layout,
    setOpacity: bar.setOpacity,
    setInteractive(value: boolean) {
      interactive = value
      bar.setInteractive(interactive)
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
      placed.forEach(anar => anar.sprite.destroy())
      overlays.forEach(overlay => overlay.destroy({children: true}))
      sparkTexture.destroy(true)
      smokeTexture.destroy(true)
    },
  }
}

export {createFireworks, fireworksAssets}
