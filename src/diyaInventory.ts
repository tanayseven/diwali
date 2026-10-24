import {Application, Assets, Container, FederatedPointerEvent, Graphics, Point, PointData, Rectangle, Sprite, Text, Texture} from "pixi.js"
import {fontFamily} from "./app"
import {createBackground} from "./background"

type Background = ReturnType<typeof createBackground>

// A diya's drawing for each combination of wick and oil, all framed the same way
const diyaUrls = {
  empty: "sprites/diya/diya-no-flame-no-wick-no-oil.svg",
  wick: "sprites/diya/diya-no-flame-wick-no-oil.svg",
  oil: "sprites/diya/diya-no-flame-no-wick-oil.svg",
  wickAndOil: "sprites/diya/diya-no-flame-wick-oil.svg",
}
const wickUrl = "sprites/diya/long-wick.svg"
const oilBottleUrl = "sprites/diya/oil-bottle.svg"
const pouringBottleUrl = "sprites/diya/oil-bottle-pouring.svg"
// Every texture the inventory needs, to be loaded before it's created
const diyaAssets = [...Object.values(diyaUrls), wickUrl, oilBottleUrl, pouringBottleUrl]

// Where each drawing sits in its SVG's canvas, so it can be cropped to fill a slot
const diyaCrop = new Rectangle(44, 200, 303, 154)
const wickCrop = new Rectangle(111, 187, 220, 62)
// The upright bottle's body only, leaving out the floor shadow around it
const bottleCrop = new Rectangle(560, 265, 260, 775)

type Item = {
  url: string
  crop: Rectangle
  // How many there are, shown on a badge; tools like the oil bottle have no count
  count?: number
}

// The HUD's items, slot by slot, made afresh for each inventory as their counts change;
// the remaining slots are empty
const createItems = () => {
  const emptyDiyas: Item = {url: diyaUrls.empty, crop: diyaCrop, count: 5}
  const wicks: Item = {url: wickUrl, crop: wickCrop, count: 5}
  const oilBottle: Item = {url: oilBottleUrl, crop: bottleCrop}
  return {emptyDiyas, wicks, oilBottle, items: [emptyDiyas, wicks, oilBottle]}
}

const slotCount = 5
// Big enough to be comfortable touch targets
const slotSize = 76
const slotGap = 12
const panelPadding = 12
const bottomMargin = 20
const sideGutter = 16
const highlight = 0xffd700
// Share of a slot an item's icon fills
const iconFill = 0.8
// The count badge in the slot's top-right corner
const badgeRadius = 13
const badgeInset = 6

// The diya SVGs are 460 x 380 and their bowls end 345 down; below that is only a
// shadow, so a diya is held and placed by the middle of its bowl's base
const diyaCanvas = {width: 460, height: 380}
const diyaAnchor = {x: 0.5, y: 345 / 380}
// A placed diya's width in scene units, a little over half a porch chair
const diyaSceneWidth = 36
const diyaScale = diyaSceneWidth / diyaCanvas.width
// Where the bowl's mouth is in a diya's canvas, which the oil is poured into
const bowlMouth = {x: 165, y: 212}
// A diya's bowl in its canvas, padded a little, for dropping wicks and oil onto it
const diyaTarget = new Rectangle(diyaCrop.x - 20, diyaCrop.y - 30, diyaCrop.width + 40, diyaCrop.height + 30)
// A diya that can take a wick or oil grows this much while one is dragged over it
const targetGrowth = 1.12

// The wick's length in scene units, as long as it looks beside a diya in its canvas
const wickSceneLength = diyaScale * wickCrop.width
// The bottle's height in scene units. Both bottle SVGs are drawn at the same scale
const bottleSceneHeight = 40
const bottleScale = bottleSceneHeight / bottleCrop.height
// Where the oil stream ends in the pouring bottle's 1380 x 1140 canvas
const pourAnchor = {x: 514 / 1380, y: 721 / 1140}
// How a pour plays out: the bottle fades in, pours, and fades out. The oil appears
// in the diya part way through
const pourFadeIn = 150
const pourHold = 1000
const pourFadeOut = 250
const pourFillAt = 600

type PlacedDiya = {
  sprite: Sprite
  wick: boolean
  oil: boolean
  pouring: boolean
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
// Expects diyaAssets to have been loaded already
const createDiyaInventory = (app: Application, background: Background) => {
  const {emptyDiyas, wicks, oilBottle, items} = createItems()
  const container = new Container()
  const hud = new Container()
  const panel = new Graphics()
  hud.addChild(panel)
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
  const diyaTexture = ({wick, oil}: PlacedDiya) => Assets.get<Texture>(
    wick && oil ? diyaUrls.wickAndOil : wick ? diyaUrls.wick : oil ? diyaUrls.oil : diyaUrls.empty,
  )

  const panelWidth = slotCount * slotSize + (slotCount - 1) * slotGap + panelPadding * 2
  const panelHeight = slotSize + panelPadding * 2

  const boxes = Array.from({length: slotCount}, (_, idx) => {
    const box = new Graphics()
    box.position.set(
      panelPadding + slotSize / 2 + idx * (slotSize + slotGap) - panelWidth / 2,
      panelPadding + slotSize / 2 - panelHeight / 2,
    )
    hud.addChild(box)
    return box
  })

  const slots = items.map((item, idx) => {
    const slot = new Container()
    slot.position.copyFrom(boxes[idx].position)
    slot.eventMode = "static"
    slot.hitArea = new Rectangle(-slotSize / 2, -slotSize / 2, slotSize, slotSize)
    // The icon is the item's drawing cropped out of its canvas, fitted inside the slot
    const icon = new Sprite(cropped(item.url, item.crop))
    icon.anchor.set(0.5)
    icon.scale.set(slotSize * iconFill / Math.max(icon.texture.width, icon.texture.height))
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
    return {item, container: slot, box: boxes[idx], icon, label}
  })
  const slotOf = (item: Item) => slots[items.indexOf(item)]

  const render = () => {
    boxes.forEach(box => box.clear()
      .roundRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 12)
      .fill(0x1a1a1a)
      .stroke({width: 3, color: box === slotOf(emptyDiyas).box && overBar ? highlight : 0x555555}))
    slots.forEach(({item, container: slot, icon, label}) => {
      // An empty stack, or the bottle while it's in use, stays visible but faded
      const inUse = item === oilBottle && drag?.kind === "oil"
      const available = !inUse && item.count !== 0
      icon.alpha = available ? 1 : 0.35
      slot.cursor = available ? "grab" : "default"
      if (label) {
        label.text = String(item.count)
      }
    })
  }

  const overPanel = (point: PointData) => {
    const local = hud.toLocal(point)
    return Math.abs(local.x) <= panelWidth / 2 && Math.abs(local.y) <= panelHeight / 2
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
      .filter(diya => !diya.pouring && wants(diya))
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
    sprite.texture = diyaTexture(diya)
    sprite.anchor.set(diyaAnchor.x, diyaAnchor.y)
    sprite.scale.set(diyaScale)
    sprite.position.copyFrom(at)
    sprite.zIndex = at.y
    background.decorations.addChild(sprite)
    makePickable(diya)
    if (!placed.includes(diya)) {
      placed.push(diya)
    }
  }

  // A diya going back on the stack gives back its wick; any oil in it is spilt
  const returnDiya = (diya: PlacedDiya) => {
    placed.splice(placed.indexOf(diya), 1)
    diya.sprite.destroy()
    emptyDiyas.count! += 1
    if (diya.wick) {
      wicks.count! += 1
    }
    render()
  }

  // Pours oil into a diya: the pouring bottle appears with its stream over the bowl,
  // and the oil shows in the diya part way through
  const pour = (diya: PlacedDiya) => {
    diya.pouring = true
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
        diya.sprite.texture = diyaTexture(diya)
      }
      if (elapsed >= pourFadeIn + pourHold + pourFadeOut) {
        app.ticker.remove(tick)
        bottle.destroy()
        diya.pouring = false
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
    diya.sprite.texture = diyaTexture(diya)
    diya.sprite.anchor.set(diyaAnchor.x, diyaAnchor.y)
    startDrag(e, {kind: "diya", sprite: diya.sprite, diya, fromScene}, background.scale() * diyaScale)
  }

  slotOf(emptyDiyas).container.on("pointerdown", e => {
    if (emptyDiyas.count === 0) {
      return
    }
    emptyDiyas.count! -= 1
    const diya: PlacedDiya = {sprite: new Sprite(), wick: false, oil: false, pouring: false}
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

  // A placed diya can be picked up again to move it or put it back on the stack,
  // except while oil is being poured into it
  const makePickable = (diya: PlacedDiya) => {
    const {sprite} = diya
    sprite.eventMode = diya.pouring ? "none" : "static"
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
      if (overPanel(at)) {
        placed.push(current.diya)
        returnDiya(current.diya)
      } else {
        placeDiya(current.diya, background.toScene(at))
      }
    } else if (current.kind === "wick" && into) {
      current.sprite.destroy()
      into.wick = true
      into.sprite.texture = diyaTexture(into)
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
    if (!drag) {
      return
    }
    const at = toStage(e)
    drag.sprite.position.copyFrom(at)
    if (drag.kind === "diya") {
      setOverBar(overPanel(at))
    } else if (drag.kind === "wick") {
      setTarget(diyaAt(at, diya => !diya.wick))
    } else {
      setTarget(diyaAt(at, diya => !diya.oil))
    }
  }
  const onPointerUp = (e: PointerEvent) => endDrag(toStage(e))
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  const layout = () => {
    // Shrink the bar to fit narrow screens
    const scale = Math.min(1, (app.screen.width - sideGutter * 2) / panelWidth)
    hud.scale.set(scale)
    hud.position.set(app.screen.width / 2, app.screen.height - bottomMargin - panelHeight * scale / 2)
    panel.clear()
      .roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 18)
      .fill({color: 0x000000, alpha: 0.55})
      .stroke({width: 2, color: 0x555555})
  }

  layout()
  render()

  return {
    container,
    layout,
    setOpacity(alpha: number) {
      hud.alpha = alpha
      hud.visible = alpha > 0
    },
    setInteractive(interactive: boolean) {
      hud.eventMode = interactive ? "passive" : "none"
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
    },
  }
}

export {createDiyaInventory, diyaAssets}
