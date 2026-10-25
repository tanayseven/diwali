import {Application, Assets, Container, FederatedPointerEvent, Graphics, Point, PointData, Rectangle, Sprite, Text, Texture} from "pixi.js"
import {fontFamily} from "./app"
import type {createAudioControl} from "./audioControl"
import {createBackground} from "./background"
import {createHud, highlight, slotSize} from "./hud"

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
// framed 5 units further right and 6 higher in a canvas of the same size
const animatedDiyaUrl = "sprites/diwali-diya-animated.svg"
const animatedDiyaOffset = {x: 5, y: -6}
const wickUrl = "sprites/diya/long-wick.svg"
const oilBottleUrl = "sprites/diya/oil-bottle.svg"
const pouringBottleUrl = "sprites/diya/oil-bottle-pouring.svg"
// A match from unlit, through striking and catching, to burning down and going out
const matchFrameUrls = [
  "1-unlit", "2-strike", "3-flare", "4-catch", "5-lit",
  "6-burning-25", "7-burning-50", "8-burning-75", "9-ember", "10-burnt-out",
].map(frame => `sprites/diya/matchstick-${frame}.svg`)
// Heard as a match is struck to light a diya
const matchSoundUrl = "audio/effects/matchstick-lit.mp3"
// Every texture the inventory needs, to be loaded before it's created. The animated
// diya is preloaded separately, as an image
const diyaAssets = [...Object.values(diyaUrls), wickUrl, oilBottleUrl, pouringBottleUrl, ...matchFrameUrls]

// Where each drawing sits in its SVG's canvas, so it can be cropped to fill a slot
const diyaCrop = new Rectangle(44, 200, 303, 154)
const wickCrop = new Rectangle(111, 187, 220, 62)
// The upright bottle's body only, leaving out the floor shadow around it
const bottleCrop = new Rectangle(560, 265, 260, 775)
const matchCrop = new Rectangle(88, 100, 24, 207)

type Item = {
  url: string
  crop: Rectangle
  // How many there are, shown on a badge; tools like the oil bottle have no count
  count?: number
  // Turns the icon, so long thin things lie across the slot's diagonal
  rotation?: number
}

// The HUD's items, slot by slot, made afresh for each inventory as their counts change;
// the remaining slots are empty
const createItems = () => {
  const emptyDiyas: Item = {url: diyaUrls.empty, crop: diyaCrop, count: 5}
  const wicks: Item = {url: wickUrl, crop: wickCrop, count: 5}
  const oilBottle: Item = {url: oilBottleUrl, crop: bottleCrop}
  const matchstick: Item = {url: matchFrameUrls[0], crop: matchCrop, rotation: Math.PI / 4}
  return {emptyDiyas, wicks, oilBottle, matchstick, items: [emptyDiyas, wicks, oilBottle, matchstick]}
}

// Share of a slot an item's icon fills
const iconFill = 0.8
// The count badge in the slot's top-right corner
const badgeRadius = 13
const badgeInset = 6

// The diya SVGs are 460 x 380 and their bowls end 345 down; below that is only a
// shadow, so a diya is held and placed by the middle of its bowl's base
const diyaCanvas = {width: 460, height: 380}
const diyaAnchor = {x: 0.5, y: 345 / 380}
// The same point in the animated diya, so a diya doesn't move when it's lit
const litDiyaAnchor = {
  x: diyaAnchor.x + animatedDiyaOffset.x / diyaCanvas.width,
  y: diyaAnchor.y + animatedDiyaOffset.y / diyaCanvas.height,
}
// A placed diya's width in scene units, about a third of a porch chair
const diyaSceneWidth = 24
const diyaScale = diyaSceneWidth / diyaCanvas.width
// Where the bowl's mouth is in a diya's canvas, which the oil is poured into
const bowlMouth = {x: 165, y: 212}
// Where the wick's tip is in a diya's canvas, which the match lights
const wickTip = {x: 322, y: 196}
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

// The match's head in its 200 x 320 canvas, by which it's held and put to the wick
const matchCanvas = {width: 200, height: 320}
const matchHead = {x: 100 / matchCanvas.width, y: 110 / matchCanvas.height}
// The match's length in scene units, a little shorter than a diya is wide
const matchSceneLength = diyaSceneWidth * 0.72
const matchScale = matchSceneLength / matchCrop.height
// Held tilted against the wick, with the stick leaning away from the diya
const matchTilt = -0.45
// How long each frame of the match shows while striking (unlit to lit), and then
// while burning down to burnt out, before it fades away. The diya lights as the
// match does
const matchStrikeFrame = 140
const matchBurnFrame = 220
const matchLitFrame = 4
const matchFadeOut = 250

// The animated diya animates its flame with SMIL, which only runs while it's shown as
// an image; turned straight into a texture it would freeze. So a hidden copy of it
// keeps playing, and is drawn onto a canvas every frame for all the lit diyas to share.
// Where a browser only draws an animated SVG's first frame, the flames simply stay still
const createLiveDiyaTexture = (app: Application) => {
  const image = document.createElement("img")
  image.src = animatedDiyaUrl
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
  app.ticker.add(draw)
  draw()
  return {
    texture,
    destroy() {
      app.ticker.remove(draw)
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
}

type Drag =
  // A diya, from the stack or picked up from the scene, and where to put it back
  | {kind: "diya", sprite: Sprite, diya: PlacedDiya, fromScene?: PointData}
  | {kind: "wick", sprite: Sprite}
  | {kind: "oil", sprite: Sprite}
  | {kind: "match", sprite: Sprite}

// A bar of inventory slots along the bottom of the screen, holding empty diyas, wicks
// and an oil bottle, with badges counting how many are left. Empty diyas are dragged
// into the scene one at a time; placed ones can be picked up and moved, or dropped
// anywhere on the bar to go back on their stack. A wick dragged onto a placed diya
// goes into it, and the bottle dragged onto one pours oil into it, in either order.
// The matchstick dragged onto a diya with both lights it, with the sound of it striking.
// Expects diyaAssets to have been loaded already
const createDiyaInventory = (app: Application, background: Background, audio: AudioControl) => {
  const {emptyDiyas, wicks, oilBottle, matchstick, items} = createItems()
  const playMatchSound = audio.createEffect(matchSoundUrl)
  const litDiya = createLiveDiyaTexture(app)
  const container = new Container()
  const bar = createHud(app)
  const hud = bar.container
  // Above the HUD, so whatever is being dragged is never hidden behind it
  const dragLayer = new Container()
  container.addChild(hud, dragLayer)
  // Lower diyas are nearer, so they're drawn in front
  background.decorations.sortableChildren = true
  const placed: PlacedDiya[] = []
  let drag: Drag | undefined
  // Whether a dragged diya is over the bar, where letting go puts it back on the stack
  let overBar = false
  // The placed diya a wick or the bottle would go into if let go now
  let target: PlacedDiya | undefined

  const cropped = (url: string, crop: Rectangle) =>
    new Texture({source: Assets.get<Texture>(url).source, frame: crop})
  // Shows a diya as it is now, held by the middle of its bowl's base either way
  const showDiya = (diya: PlacedDiya) => {
    const {wick, oil, lit} = diya
    diya.sprite.texture = lit ? litDiya.texture : Assets.get<Texture>(
      wick && oil ? diyaUrls.wickAndOil : wick ? diyaUrls.wick : oil ? diyaUrls.oil : diyaUrls.empty,
    )
    const anchor = lit ? litDiyaAnchor : diyaAnchor
    diya.sprite.anchor.set(anchor.x, anchor.y)
  }

  const slots = items.map((item, idx) => {
    const slot = new Container()
    slot.position.copyFrom(bar.boxes[idx].position)
    slot.eventMode = "static"
    slot.hitArea = new Rectangle(-slotSize / 2, -slotSize / 2, slotSize, slotSize)
    // The icon is the item's drawing cropped out of its canvas, fitted inside the slot
    const icon = new Sprite(cropped(item.url, item.crop))
    icon.anchor.set(0.5)
    icon.rotation = item.rotation ?? 0
    // Turned onto the diagonal, a long thin icon has room to be longer
    const room = item.rotation ? Math.SQRT2 : 1
    icon.scale.set(slotSize * iconFill * room / Math.max(icon.texture.width, icon.texture.height))
    slot.addChild(icon)
    let label: Text | undefined
    if (item.count !== undefined) {
      const badge = new Container()
      badge.position.set(slotSize / 2 - badgeInset, -slotSize / 2 + badgeInset)
      const circle = new Graphics()
        .circle(0, 0, badgeRadius)
        .fill(highlight)
        .stroke({width: 2, color: 0x000000})
      label = new Text({text: "", style: {fontFamily, fontSize: 20, fill: 0x000000}})
      label.anchor.set(0.5)
      label.roundPixels = true
      badge.addChild(circle, label)
      slot.addChild(badge)
    }
    hud.addChild(slot)
    return {item, container: slot, box: bar.boxes[idx], icon, label}
  })
  const slotOf = (item: Item) => slots[items.indexOf(item)]

  const render = () => {
    bar.drawBoxes(overBar ? slotOf(emptyDiyas).box : undefined)
    slots.forEach(({item, container: slot, icon, label}) => {
      // An empty stack, or a tool while it's in use, stays visible but faded
      const inUse = (item === oilBottle && drag?.kind === "oil") || (item === matchstick && drag?.kind === "match")
      const available = !inUse && item.count !== 0
      icon.alpha = available ? 1 : 0.35
      slot.cursor = available ? "grab" : "default"
      if (label) {
        label.text = String(item.count)
      }
    })
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
      target?.sprite.scale.set(diyaScale)
      target = diya
      target?.sprite.scale.set(diyaScale * targetGrowth)
    }
  }

  const placeDiya = (diya: PlacedDiya, at: PointData) => {
    const {sprite} = diya
    showDiya(diya)
    sprite.scale.set(diyaScale)
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

  // Lights a diya: the match is held to the wick and plays out striking and catching,
  // the diya lights as the match does, and the match burns down and fades away
  const light = (diya: PlacedDiya) => {
    diya.busy = true
    makePickable(diya)
    const match = new Sprite(Assets.get<Texture>(matchFrameUrls[1]))
    match.anchor.set(matchHead.x, matchHead.y)
    match.scale.set(matchScale)
    match.rotation = matchTilt
    match.position.set(
      diya.sprite.x + (wickTip.x - diyaCanvas.width * diyaAnchor.x) * diyaScale,
      diya.sprite.y + (wickTip.y - diyaCanvas.height * diyaAnchor.y) * diyaScale,
    )
    // In front of the diya it's lighting
    match.zIndex = diya.sprite.zIndex + 0.5
    match.eventMode = "none"
    background.decorations.addChild(match)
    playMatchSound()
    // Striking runs from the strike frame up to lit, then burning from there to the end
    const strikeEnd = (matchLitFrame - 1) * matchStrikeFrame
    const burnEnd = strikeEnd + (matchFrameUrls.length - 1 - matchLitFrame) * matchBurnFrame
    let elapsed = 0
    const tick = () => {
      elapsed += app.ticker.deltaMS
      const frame = elapsed < strikeEnd
        ? 1 + Math.floor(elapsed / matchStrikeFrame)
        : Math.min(matchFrameUrls.length - 1, matchLitFrame + Math.floor((elapsed - strikeEnd) / matchBurnFrame))
      match.texture = Assets.get<Texture>(matchFrameUrls[frame])
      if (!diya.lit && frame >= matchLitFrame) {
        diya.lit = true
        showDiya(diya)
      }
      match.alpha = elapsed < burnEnd ? 1 : Math.max(0, 1 - (elapsed - burnEnd) / matchFadeOut)
      if (elapsed >= burnEnd + matchFadeOut) {
        app.ticker.remove(tick)
        match.destroy()
        diya.busy = false
        makePickable(diya)
      }
    }
    app.ticker.add(tick)
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

  // Diyas are shown while dragged at the size they'll be placed at, so they land as seen
  const startDiyaDrag = (e: FederatedPointerEvent, diya: PlacedDiya, fromScene?: PointData) => {
    showDiya(diya)
    startDrag(e, {kind: "diya", sprite: diya.sprite, diya, fromScene}, background.scale() * diyaScale)
  }

  slotOf(emptyDiyas).container.on("pointerdown", e => {
    if (emptyDiyas.count === 0) {
      return
    }
    emptyDiyas.count! -= 1
    const diya: PlacedDiya = {sprite: new Sprite(), wick: false, oil: false, lit: false, busy: false}
    startDiyaDrag(e, diya)
  })

  slotOf(wicks).container.on("pointerdown", e => {
    if (wicks.count === 0) {
      return
    }
    wicks.count! -= 1
    const sprite = new Sprite(cropped(wickUrl, wickCrop))
    sprite.anchor.set(0.5)
    startDrag(e, {kind: "wick", sprite}, background.scale() * wickSceneLength / wickCrop.width)
  })

  slotOf(oilBottle).container.on("pointerdown", e => {
    if (drag) {
      return
    }
    const sprite = new Sprite(cropped(oilBottleUrl, bottleCrop))
    sprite.anchor.set(0.5)
    startDrag(e, {kind: "oil", sprite}, background.scale() * bottleScale)
  })

  // The match is held by its head, so it's the head that's put to a wick
  slotOf(matchstick).container.on("pointerdown", e => {
    if (drag) {
      return
    }
    const sprite = new Sprite(Assets.get<Texture>(matchFrameUrls[0]))
    sprite.anchor.set(matchHead.x, matchHead.y)
    sprite.rotation = matchTilt
    startDrag(e, {kind: "match", sprite}, background.scale() * matchScale)
  })

  // A placed diya can be picked up again to move it or put it back on the stack,
  // except while it's busy being filled or lit
  const makePickable = (diya: PlacedDiya) => {
    const {sprite} = diya
    sprite.eventMode = diya.busy ? "none" : "static"
    sprite.cursor = "grab"
    sprite.removeAllListeners("pointerdown")
    sprite.on("pointerdown", e => {
      const fromScene = {x: sprite.x, y: sprite.y}
      placed.splice(placed.indexOf(diya), 1)
      sprite.removeFromParent()
      startDiyaDrag(e, diya, fromScene)
    })
  }

  // Sends whatever's dragged back where it came from
  const returnDrag = (current: Drag) => {
    current.sprite.removeFromParent()
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
    if (current.kind === "diya") {
      if (bar.isOver(at)) {
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
    } else if (current.kind === "match" && into) {
      current.sprite.destroy()
      light(into)
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
    if (!drag) {
      return
    }
    const at = toStage(e)
    drag.sprite.position.copyFrom(at)
    if (drag.kind === "diya") {
      setOverBar(bar.isOver(at))
    } else if (drag.kind === "wick") {
      setTarget(diyaAt(at, diya => !diya.wick))
    } else if (drag.kind === "oil") {
      setTarget(diyaAt(at, diya => !diya.oil))
    } else {
      setTarget(diyaAt(at, diya => diya.wick && diya.oil && !diya.lit))
    }
  }
  const onPointerUp = (e: PointerEvent) => endDrag(toStage(e))
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  render()

  return {
    container,
    layout: bar.layout,
    setOpacity: bar.setOpacity,
    setInteractive(interactive: boolean) {
      bar.setInteractive(interactive)
      background.decorations.eventMode = interactive ? "passive" : "none"
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
      container.destroy({children: true})
      litDiya.destroy()
    },
  }
}

export {createDiyaInventory, diyaAssets}
