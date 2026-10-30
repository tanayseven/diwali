import {Application, Assets, Container, FederatedPointerEvent, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import type {createAudioControl} from "./audioControl"
import {createBackground} from "./background"
import {Item, createHud, cropped} from "./hud"
import {Light, Lighting} from "./lighting"
import {LL} from "./locale"
import {createMatchstick, draggedFrom, HeldMatch, matchFrameUrls} from "./matchstick"
import {setOutline} from "./outline"
import {addTooltip, Tooltip} from "./tooltip"

type Background = ReturnType<typeof createBackground>
type AudioControl = ReturnType<typeof createAudioControl>

// A diya's drawing for each combination of wick and oil, all framed the same way
const diyaUrls = {
  empty: "sprites/diya/diya-no-flame-no-wick-no-oil.svg",
  wick: "sprites/diya/diya-no-flame-wick-no-oil.svg",
  oil: "sprites/diya/diya-no-flame-no-wick-oil.svg",
  wickAndOil: "sprites/diya/diya-no-flame-wick-oil.svg",
}
// A lit diya is the menu's animated diya, whose flame flickers. It's the same drawing,
// framed 5 units further right and 6 higher in a canvas of the same size. Turned to
// face the front, it's another animated drawing of it, with its spout towards us
const animatedDiyaUrl = "sprites/diwali-diya-animated.svg"
const animatedDiyaOffset = {x: 5, y: -6}
const frontDiyaUrl = "sprites/diya/diya-front-animated.svg"
// The animated diyas are preloaded as images rather than textures
const diyaImages = [animatedDiyaUrl, frontDiyaUrl]
const wickUrl = "sprites/diya/long-wick.svg"
const oilBottleUrl = "sprites/diya/oil-bottle.svg"
const pouringBottleUrl = "sprites/diya/oil-bottle-pouring.svg"
// Every texture the inventory needs, to be loaded before it's created. The animated
// diya is preloaded separately, as an image
const diyaAssets = [...Object.values(diyaUrls), wickUrl, oilBottleUrl, pouringBottleUrl, ...matchFrameUrls]

// Where each drawing sits in its SVG's canvas, so it can be cropped to fill a slot
const diyaCrop = new Rectangle(44, 200, 303, 154)
const wickCrop = new Rectangle(111, 187, 220, 62)
// The upright bottle's body only, leaving out the floor shadow around it
const bottleCrop = new Rectangle(560, 265, 260, 775)

// The HUD's items besides the matchstick, made afresh for each inventory as their
// counts change
const createItems = () => {
  const emptyDiyas: Item = {url: diyaUrls.empty, crop: diyaCrop, count: 5}
  const wicks: Item = {url: wickUrl, crop: wickCrop, count: 5}
  const oilBottle: Item = {url: oilBottleUrl, crop: bottleCrop}
  return {emptyDiyas, wicks, oilBottle}
}

// The diya SVGs are 460 x 380 and their bowls end 345 down; below that is only a
// shadow, so a diya is held and placed by the middle of its bowl's base
const diyaCanvas = {width: 460, height: 380}
const diyaAnchor = {x: 0.5, y: 345 / 380}
// The same point in the animated diya, so a diya doesn't move when it's lit
const litDiyaAnchor = {
  x: diyaAnchor.x + animatedDiyaOffset.x / diyaCanvas.width,
  y: diyaAnchor.y + animatedDiyaOffset.y / diyaCanvas.height,
}
// A lit diya can be turned to face either side, its spout to the right as drawn or to
// the left, mirrored, or to face the front. It turns about the middle of its foot,
// which is 45.5 units left of where it's held, and is at x 249.5 in the front-facing
// drawing, standing on the same line. Each way, it's held by the same point, and its
// flame is that far from there, in its canvas's units
type Facing = "right" | "front" | "left"
const turnOrder: Facing[] = ["right", "front", "left"]
const footFromAnchor = 45.5
const facings: Record<Facing, {anchor: PointData, flame: PointData}> = {
  right: {anchor: litDiyaAnchor, flame: {x: 92.5, y: -167}},
  front: {anchor: {x: (249.5 + footFromAnchor) / diyaCanvas.width, y: diyaAnchor.y}, flame: {x: -65.5, y: -92}},
  left: {
    anchor: {x: (189.5 - footFromAnchor) / diyaCanvas.width, y: litDiyaAnchor.y},
    flame: {x: -92.5, y: -167},
  },
}
// It turns by narrowing to nothing and widening again the new way, in ms
const turnDuration = 220
// A press on a placed diya only picks it up once it's dragged this far, on screen;
// let go before then, it's a tap, which turns a lit one
const pickUpSlop = 6
// A placed diya's width in scene units, about a third of a porch chair
const diyaSceneWidth = 24
const diyaScale = diyaSceneWidth / diyaCanvas.width
// Where the bowl's mouth is in a diya's canvas, which the oil is poured into
const bowlMouth = {x: 165, y: 212}
// A lit diya lights up the porch around it, flickering a little with its flame, and
// glows at the flame
const diyaLightColour = 0xffb35c
const diyaLightRadius = 110
// How far off screen, in scene units, a diya still counts as on it, as it's drawn
// around where it stands
const diyaMargin = 40
// How often the lit diyas' flame is redrawn, in ms
const redrawEvery = 1000 / 30
const diyaGlowRadius = 10
// A diya's bowl in its canvas, padded a little, for dropping wicks and oil onto it
const diyaTarget = new Rectangle(diyaCrop.x - 20, diyaCrop.y - 30, diyaCrop.width + 40, diyaCrop.height + 30)
// A diya that can take a wick or oil grows this much while one is dragged over it
const targetGrowth = 1.12

// The wick's length in scene units, as long as it looks beside a diya in its canvas
const wickSceneLength = diyaScale * wickCrop.width
// The bottle's height in scene units, a little taller than a diya is wide. Both bottle
// SVGs are drawn at the same scale
const bottleSceneHeight = diyaSceneWidth * 1.1
const bottleScale = bottleSceneHeight / bottleCrop.height
// Where the oil stream ends in the pouring bottle's 1380 x 1140 canvas
const pourAnchor = {x: 514 / 1380, y: 721 / 1140}
// How a pour plays out: the bottle fades in, pours, and fades out. The oil appears
// in the diya part way through
const pourFadeIn = 150
const pourHold = 1000
const pourFadeOut = 250
const pourFillAt = 600

// The animated diya animates its flame with SMIL, which only runs while it's shown as
// an image; turned straight into a texture it would freeze. So a hidden copy of it
// keeps playing, and is drawn onto a canvas every frame for all the lit diyas to share,
// though only while there are any to show it. Where a browser only draws an animated
// SVG's first frame, the flames simply stay still
const createLiveDiyaTexture = (app: Application, url: string, isShown: () => boolean) => {
  const image = document.createElement("img")
  image.src = url
  image.alt = ""
  image.setAttribute("aria-hidden", "true")
  // Browsers stop animating images that are off screen or visibility: hidden, so it
  // stays on screen as a single transparent pixel instead. It's still drawn full size
  Object.assign(image.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  })
  document.body.appendChild(image)
  const canvas = document.createElement("canvas")
  canvas.width = diyaCanvas.width
  canvas.height = diyaCanvas.height
  const context = canvas.getContext("2d")!
  const texture = Texture.from(canvas)
  const draw = () => {
    if (!image.complete || image.naturalWidth === 0) {
      return
    }
    context.clearRect(0, 0, diyaCanvas.width, diyaCanvas.height)
    context.drawImage(image, 0, 0, diyaCanvas.width, diyaCanvas.height)
    texture.source.update()
  }
  // The flame is smooth enough redrawn at half the usual frame rate
  let sinceDrawn = Infinity
  const tick = () => {
    sinceDrawn += app.ticker.deltaMS
    if (sinceDrawn >= redrawEvery && isShown()) {
      sinceDrawn = 0
      draw()
    }
  }
  app.ticker.add(tick)
  draw()
  return {
    texture,
    destroy() {
      app.ticker.remove(tick)
      image.remove()
      texture.destroy(true)
    },
  }
}

type PlacedDiya = {
  sprite: Sprite
  wick: boolean
  oil: boolean
  lit: boolean
  // While oil is being poured in or it's being lit, it can't be picked up or used
  busy: boolean
  // Its light on the scene and the glow at its flame, once it's lit
  light?: Light
  glow?: Sprite
  // Which way it faces, and how far it's turned to face the next way, in ms, while
  // it's turning
  facing: Facing
  turning?: number
}

type Drag =
  // A diya, from the stack or picked up from the scene, and where to put it back
  | {kind: "diya", sprite: Sprite, diya: PlacedDiya, fromScene?: PointData}
  | {kind: "wick", sprite: Sprite}
  | {kind: "oil", sprite: Sprite}

// A bar of inventory slots along the bottom of the screen, holding empty diyas, wicks
// and an oil bottle, with badges counting how many are left. Empty diyas are dragged
// into the scene one at a time; placed ones can be picked up and moved, or dropped
// anywhere on the bar to go back on their stack. A wick dragged onto a placed diya
// goes into it, and the bottle dragged onto one pours oil into it, in either order.
// The matchstick dragged out of the bar and held over a diya with both is struck, and a
// ring round it fills until the diya lights; it goes back once it's let go.
// Expects diyaAssets to have been loaded already
const createDiyaInventory = (app: Application, background: Background, lighting: Lighting, audio: AudioControl) => {
  const {emptyDiyas, wicks, oilBottle} = createItems()
  const matchstick = createMatchstick(app, audio)
  // Each only drawn while a lit diya on the porch facing its way is on screen, or one
  // is being carried
  const shownFacing = (side: boolean) => (diya: PlacedDiya) => diya.lit && (diya.facing !== "front") === side
  const liveTexture = (url: string, side: boolean) => createLiveDiyaTexture(app, url, () =>
    placed.some(diya => shownFacing(side)(diya) && background.inView(diya.sprite.x, diya.sprite.y, diyaMargin))
    || (drag?.kind === "diya" && shownFacing(side)(drag.diya)))
  const litDiya = liveTexture(animatedDiyaUrl, true)
  const frontDiya = liveTexture(frontDiyaUrl, false)
  const container = new Container()
  const bar = createHud(app)
  const hud = bar.container
  // Above the HUD, so whatever is being dragged is never hidden behind it
  const dragLayer = new Container()
  container.addChild(hud, dragLayer)
  // Lower diyas are nearer, so they're drawn in front
  background.decorations.sortableChildren = true
  // The flames' glows shine through the night
  const glowLayer = new Container()
  glowLayer.eventMode = "none"
  glowLayer.zIndex = lighting.aboveNight
  background.decorations.addChild(glowLayer)
  const placed: PlacedDiya[] = []
  let drag: Drag | undefined
  // Whether a dragged diya is over the bar, where letting go puts it back on the stack
  let overBar = false
  // The placed diya a wick or the bottle would go into if let go now
  let target: PlacedDiya | undefined

  // Shows a diya as it is now, held by the middle of its bowl's base either way, and
  // facing the way it's turned, mirrored to face left. Its size is kept
  const showDiya = (diya: PlacedDiya) => {
    const {wick, oil, lit, facing, sprite} = diya
    sprite.texture = !lit ? Assets.get<Texture>(
      wick && oil ? diyaUrls.wickAndOil : wick ? diyaUrls.wick : oil ? diyaUrls.oil : diyaUrls.empty,
    ) : facing === "front" ? frontDiya.texture : litDiya.texture
    const anchor = lit ? facings[facing].anchor : diyaAnchor
    sprite.anchor.set(anchor.x, anchor.y)
    sprite.scale.x = Math.abs(sprite.scale.x) * (lit && facing === "left" ? -1 : 1)
  }

  // A lit diya turns to face the next way round
  const turn = (diya: PlacedDiya) => {
    if (diya.lit && diya.turning === undefined) {
      diya.turning = 0
    }
  }


  const diyaSlot = bar.addItem(0, emptyDiyas)
  const wickSlot = bar.addItem(1, wicks)
  const bottleSlot = bar.addItem(2, oilBottle)
  const matchSlot = bar.addItem(3, matchstick.item)

  const tips = LL.tooltip
  const stackTooltip = (item: Item, title: string, hint: string) => (): Tooltip =>
    ({title, lines: [item.count === 0 ? tips.noneLeft() : hint]})
  addTooltip(diyaSlot.container, stackTooltip(emptyDiyas, tips.diya.name(), tips.diya.stack()))
  addTooltip(wickSlot.container, stackTooltip(wicks, tips.wick.name(), tips.wick.hint()))
  addTooltip(bottleSlot.container, () => ({title: tips.oil.name(), lines: [tips.oil.hint()]}))
  addTooltip(matchSlot.container, () => ({title: tips.matchstick.name(), lines: [tips.matchstick.diyaHint()]}))

  // What a placed diya still needs, or that it's lit and can be turned
  const diyaTooltip = (diya: PlacedDiya) => (): Tooltip => {
    const status = diya.lit ? tips.diya.lit()
      : diya.wick && diya.oil ? tips.diya.ready()
      : diya.wick ? tips.diya.needsOil()
      : diya.oil ? tips.diya.needsWick()
      : tips.diya.needsWickAndOil()
    return {title: tips.diya.name(), lines: diya.lit ? [status, tips.diya.turn(), tips.move()] : [status, tips.move()]}
  }

  const render = () => {
    bar.drawBoxes(overBar ? diyaSlot.box : undefined)
    diyaSlot.show()
    wickSlot.show()
    bottleSlot.show(drag?.kind === "oil")
    matchSlot.show(held !== undefined)
  }

  const setOverBar = (value: boolean) => {
    if (overBar !== value) {
      overBar = value
      render()
    }
  }

  // The nearest placed diya under a point on screen that could take what's dragged
  const diyaAt = (point: PointData, wants: (diya: PlacedDiya) => boolean) => {
    const at = background.toScene(point)
    return placed
      .filter(diya => !diya.busy && wants(diya))
      .sort((a, b) => b.sprite.zIndex - a.sprite.zIndex)
      .find(({sprite}) => diyaTarget.contains(
        diyaCanvas.width * diyaAnchor.x + (at.x - sprite.x) / diyaScale,
        diyaCanvas.height * diyaAnchor.y + (at.y - sprite.y) / diyaScale,
      ))
  }

  const setTarget = (diya: PlacedDiya | undefined) => {
    if (target !== diya) {
      if (target) {
        target.sprite.scale.set(diyaScale)
        setOutline(target.sprite, "selected", false)
      }
      target = diya
      if (target) {
        target.sprite.scale.set(diyaScale * targetGrowth)
        setOutline(target.sprite, "selected", true)
      }
    }
  }

  const placeDiya = (diya: PlacedDiya, at: PointData) => {
    const {sprite} = diya
    sprite.scale.set(diyaScale)
    showDiya(diya)
    sprite.position.copyFrom(at)
    sprite.zIndex = at.y
    background.decorations.addChild(sprite)
    makePickable(diya)
    if (!placed.includes(diya)) {
      placed.push(diya)
    }
  }

  // A diya going back on the stack gives back its wick, unless it's been burnt by
  // lighting it; any oil in it is spilt
  const returnDiya = (diya: PlacedDiya) => {
    placed.splice(placed.indexOf(diya), 1)
    diya.sprite.destroy()
    diya.light?.destroy()
    diya.glow?.destroy()
    emptyDiyas.count! += 1
    if (diya.wick && !diya.lit) {
      wicks.count! += 1
    }
    render()
  }

  // Pours oil into a diya: the pouring bottle appears with its stream over the bowl,
  // and the oil shows in the diya part way through
  const pour = (diya: PlacedDiya) => {
    diya.busy = true
    makePickable(diya)
    const bottle = new Sprite(Assets.get<Texture>(pouringBottleUrl))
    bottle.anchor.set(pourAnchor.x, pourAnchor.y)
    bottle.scale.set(bottleScale)
    bottle.position.set(
      diya.sprite.x + (bowlMouth.x - diyaCanvas.width * diyaAnchor.x) * diyaScale,
      diya.sprite.y + (bowlMouth.y - diyaCanvas.height * diyaAnchor.y) * diyaScale,
    )
    // In front of the diya it's pouring into
    bottle.zIndex = diya.sprite.zIndex + 0.5
    bottle.alpha = 0
    bottle.eventMode = "none"
    background.decorations.addChild(bottle)
    let elapsed = 0
    const tick = () => {
      elapsed += app.ticker.deltaMS
      if (elapsed < pourFadeIn) {
        bottle.alpha = elapsed / pourFadeIn
      } else if (elapsed < pourFadeIn + pourHold) {
        bottle.alpha = 1
      } else {
        bottle.alpha = Math.max(0, 1 - (elapsed - pourFadeIn - pourHold) / pourFadeOut)
      }
      if (!diya.oil && elapsed >= pourFillAt) {
        diya.oil = true
        showDiya(diya)
      }
      if (elapsed >= pourFadeIn + pourHold + pourFadeOut) {
        app.ticker.remove(tick)
        bottle.destroy()
        diya.busy = false
        makePickable(diya)
      }
    }
    app.ticker.add(tick)
  }

  // The held match lights a diya's wick
  const light = (diya: PlacedDiya) => {
    diya.lit = true
    diya.light = lighting.addLight(diyaLightColour)
    diya.glow = new Sprite(lighting.glowTexture)
    diya.glow.anchor.set(0.5)
    diya.glow.tint = 0xffd08a
    diya.glow.blendMode = "add"
    diya.glow.width = diya.glow.height = diyaGlowRadius * 2
    glowLayer.addChild(diya.glow)
    showDiya(diya)
    makePickable(diya)
  }

  const startDrag = (at: PointData, next: Drag, scale: number) => {
    const {sprite} = next
    sprite.scale.set(scale)
    sprite.position.copyFrom(at)
    sprite.eventMode = "none"
    dragLayer.addChild(sprite)
    setOutline(sprite, "selected", true)
    drag = next
    render()
  }

  // Diyas are shown while dragged at the size they'll be placed at, so they land as seen
  const startDiyaDrag = (at: PointData, diya: PlacedDiya, fromScene?: PointData) => {
    startDrag(at, {kind: "diya", sprite: diya.sprite, diya, fromScene}, background.scale() * diyaScale)
    showDiya(diya)
  }

  // The match in hand while it's dragged, where the pointer last was, and where a
  // press on its slot began, until it's dragged far enough to take it out
  let held: HeldMatch | undefined
  const pointer = new Point()
  let pressedSlotAt: Point | undefined

  // The diyas ready to light under the held match
  const lightable = (diya: PlacedDiya) => diya.wick && diya.oil && !diya.lit

  // Points the held match at whatever diya ready to light it's over, to light it once
  // it's been pressed there long enough
  const aimMatch = () => {
    if (!held) {
      return
    }
    held.moveTo(pointer, background.scale())
    const diya = diyaAt(pointer, lightable)
    setTarget(diya)
    held.setAim(diya && {target: diya, light: () => {
      light(diya)
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

  diyaSlot.container.on("pointerdown", e => {
    if (emptyDiyas.count === 0 || drag) {
      return
    }
    emptyDiyas.count! -= 1
    const diya: PlacedDiya = {sprite: new Sprite(), wick: false, oil: false, lit: false, busy: false, facing: "right"}
    addTooltip(diya.sprite, diyaTooltip(diya))
    startDiyaDrag(e.global, diya)
  })

  wickSlot.container.on("pointerdown", e => {
    if (wicks.count === 0 || drag) {
      return
    }
    wicks.count! -= 1
    const sprite = new Sprite(cropped(wickUrl, wickCrop))
    sprite.anchor.set(0.5)
    startDrag(e.global, {kind: "wick", sprite}, background.scale() * wickSceneLength / wickCrop.width)
  })

  bottleSlot.container.on("pointerdown", e => {
    if (drag) {
      return
    }
    const sprite = new Sprite(cropped(oilBottleUrl, bottleCrop))
    sprite.anchor.set(0.5)
    startDrag(e.global, {kind: "oil", sprite}, background.scale() * bottleScale)
  })

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

  // Whether placed diyas can be picked up, and whether the bar is showing to put them back on
  let interactive = false
  let hudShown = false
  // A placed diya pressed on, and where, until it's dragged far enough to pick it up
  let pressedDiya: {diya: PlacedDiya, at: Point} | undefined

  const pickUp = (diya: PlacedDiya, at: PointData) => {
    const {sprite} = diya
    // It stops turning, whichever way it's got to
    diya.turning = undefined
    const fromScene = {x: sprite.x, y: sprite.y}
    placed.splice(placed.indexOf(diya), 1)
    sprite.removeFromParent()
    diya.light?.off()
    if (diya.glow) {
      diya.glow.visible = false
    }
    startDiyaDrag(at, diya, fromScene)
  }

  // A placed diya can be picked up again to move it or put it back on the stack,
  // except while it's busy being filled, the match is in hand, or another scene is open.
  // It's picked up once it's dragged; a lit one tapped instead is turned
  const makePickable = (diya: PlacedDiya) => {
    const {sprite} = diya
    sprite.eventMode = interactive && !diya.busy && !held ? "static" : "none"
    sprite.cursor = diya.lit ? "pointer" : "grab"
    sprite.removeAllListeners("pointerdown")
    sprite.on("pointerdown", e => {
      pressedDiya = {diya, at: e.global.clone()}
    })
  }

  // Sends whatever's dragged back where it came from
  const returnDrag = (current: Drag) => {
    current.sprite.removeFromParent()
    setOutline(current.sprite, "selected", false)
    if (current.kind === "diya") {
      if (current.fromScene) {
        placeDiya(current.diya, current.fromScene)
      } else {
        placed.push(current.diya)
        returnDiya(current.diya)
      }
    } else {
      if (current.kind === "wick") {
        wicks.count! += 1
      }
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
    setOutline(current.sprite, "selected", false)
    if (current.kind === "diya") {
      if (hudShown && bar.isOver(at)) {
        placed.push(current.diya)
        returnDiya(current.diya)
      } else {
        placeDiya(current.diya, background.toScene(at))
      }
    } else if (current.kind === "wick" && into) {
      current.sprite.destroy()
      into.wick = true
      showDiya(into)
    } else if (current.kind === "oil" && into) {
      current.sprite.destroy()
      pour(into)
    } else {
      returnDrag(current)
    }
    render()
  }

  // Moves and releases are heard on the window so a drag follows the pointer anywhere,
  // even off the canvas. Making the stage interactive instead would make every child
  // interactive too, and the full-screen dimming layer would then block the scene
  const toStage = (e: PointerEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }
  const onPointerMove = (e: PointerEvent) => {
    const at = toStage(e)
    if (pressedDiya && draggedFrom(pressedDiya.at, at, pickUpSlop)) {
      const {diya} = pressedDiya
      pressedDiya = undefined
      pickUp(diya, at)
    }
    if (!drag) {
      if (held) {
        pointer.copyFrom(at)
        aimMatch()
      } else if (pressedSlotAt && draggedFrom(pressedSlotAt, at)) {
        pointer.copyFrom(at)
        pressedSlotAt = undefined
        takeMatch()
      }
      return
    }
    drag.sprite.position.copyFrom(at)
    if (drag.kind === "diya") {
      setOverBar(hudShown && bar.isOver(at))
    } else if (drag.kind === "wick") {
      setTarget(diyaAt(at, diya => !diya.wick))
    } else {
      setTarget(diyaAt(at, diya => !diya.oil))
    }
  }
  // Letting go puts the match back, and a diya pressed and let go without dragging it
  // is turned
  const onPointerUp = (e: PointerEvent) => {
    if (pressedDiya) {
      turn(pressedDiya.diya)
      pressedDiya = undefined
    }
    pressedSlotAt = undefined
    putAwayMatch()
    endDrag(toStage(e))
  }
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  // Lit diyas shine where they're placed, but not while they're being carried. One
  // that's turning narrows to nothing, then widens again facing the next way round
  let time = 0
  const shine = () => {
    time += app.ticker.deltaMS / 1000
    placed.forEach(diya => {
      if (!diya.light || !diya.glow) {
        return
      }
      if (diya.turning !== undefined) {
        const before = diya.turning
        diya.turning += app.ticker.deltaMS
        if (before < turnDuration / 2 && diya.turning >= turnDuration / 2) {
          diya.facing = turnOrder[(turnOrder.indexOf(diya.facing) + 1) % turnOrder.length]
          showDiya(diya)
        }
        const t = Math.min(1, diya.turning / turnDuration)
        diya.sprite.scale.x = Math.sign(diya.sprite.scale.x) * diyaScale * Math.max(0.05, Math.abs(1 - 2 * t))
        if (t >= 1) {
          diya.turning = undefined
        }
      }
      const {flame} = facings[diya.facing]
      const at = {x: diya.sprite.x + flame.x * diyaScale, y: diya.sprite.y + flame.y * diyaScale}
      // Each flame flickers in its own time
      const phase = diya.sprite.x
      const flicker = 0.9 + 0.06 * Math.sin(time * 7 + phase) + 0.04 * Math.sin(time * 13 + phase * 1.7)
      diya.light.shine(at, diyaLightRadius * (0.95 + 0.05 * flicker), flicker)
      diya.glow.position.copyFrom(at)
      diya.glow.alpha = 0.55 * flicker
      diya.glow.visible = background.inView(at.x, at.y, diyaGlowRadius)
    })
  }
  app.ticker.add(shine)

  render()

  return {
    container,
    layout: bar.layout,
    // Shows its bar, while the Diyas tool is the one in use. The match is put away
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
        setTarget(undefined)
        returnDrag(current)
        render()
      }
    },
    destroy() {
      putAwayMatch()
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      app.ticker.remove(shine)
      container.destroy({children: true})
      glowLayer.destroy({children: true})
      litDiya.destroy()
      frontDiya.destroy()
    },
  }
}

export {createDiyaInventory, diyaAssets, diyaImages}
