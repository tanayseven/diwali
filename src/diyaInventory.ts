import {Application, Assets, Container, FederatedPointerEvent, Graphics, Point, PointData, Rectangle, Sprite, Text, Texture} from "pixi.js"
import {fontFamily} from "./app"
import {createBackground} from "./background"

type Background = ReturnType<typeof createBackground>

const emptyDiyaUrl = "sprites/diya/diya-no-flame-no-wick-no-oil.svg"
const wickUrl = "sprites/diya/long-wick.svg"
const oilBottleUrl = "sprites/diya/oil-bottle.svg"
// Every texture the inventory needs, to be loaded before it's created
const diyaAssets = [emptyDiyaUrl, wickUrl, oilBottleUrl]

type Item = {
  url: string
  // Where the drawing sits in its SVG's canvas, so its icon can fill the slot
  crop: Rectangle
  // How many there are, shown on a badge; tools like the oil bottle have no count
  count?: number
}

// The HUD's items, slot by slot, made afresh for each inventory as their counts change;
// the remaining slots are empty
const createItems = () => {
  const emptyDiya: Item = {url: emptyDiyaUrl, crop: new Rectangle(44, 200, 303, 154), count: 5}
  const items: Item[] = [
    emptyDiya,
    {url: wickUrl, crop: new Rectangle(111, 187, 220, 62), count: 5},
    // The bottle's body only, leaving out the floor shadow around it
    {url: oilBottleUrl, crop: new Rectangle(560, 265, 260, 775)},
  ]
  return {emptyDiya, items}
}

const slotCount = 5
// Big enough to be comfortable touch targets
const slotSize = 76
const slotGap = 12
const panelPadding = 12
const bottomMargin = 20
const sideGutter = 16
const highlight = 0xffd700
// The diya SVG is 460 x 380 and its bowl ends 345 down; below that is only its shadow,
// so it's held and placed by the middle of the bowl's base
const diyaAnchor = {x: 0.5, y: 345 / 380}
// A placed diya's width in scene units, a little over half a porch chair
const diyaSceneWidth = 36
// Share of a slot an item's icon fills
const iconFill = 0.8
// The count badge in the slot's top-right corner
const badgeRadius = 13
const badgeInset = 6

type Drag = {
  sprite: Sprite
  // Where it came from, so it can go back if the drag is cancelled: the stack, or a spot
  fromStack?: boolean
  fromScene?: PointData
}

// A bar of inventory slots along the bottom of the screen, holding empty diyas, wicks
// and an oil bottle, with badges counting how many are left. Empty diyas can be dragged
// one at a time into the scene, picked up again and moved, or dropped anywhere on the
// bar to go back on their stack. Wicks and the bottle are only shown for now.
// Expects diyaAssets to have been loaded already
const createDiyaInventory = (app: Application, background: Background) => {
  const texture = Assets.get<Texture>(emptyDiyaUrl)
  const {emptyDiya, items} = createItems()
  const container = new Container()
  const hud = new Container()
  const panel = new Graphics()
  hud.addChild(panel)
  // Above the HUD, so a diya being dragged is never hidden behind it
  const dragLayer = new Container()
  container.addChild(hud, dragLayer)
  // Lower diyas are nearer, so they're drawn in front
  background.decorations.sortableChildren = true
  let drag: Drag | undefined
  // Whether a dragged diya is over the bar, where letting go puts it back on the stack
  let overBar = false

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
    // The icon is the item's drawing cropped out of its canvas, fitted inside the slot
    const icon = new Sprite(new Texture({source: Assets.get<Texture>(item.url).source, frame: item.crop}))
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
  const diyaSlot = slots[items.indexOf(emptyDiya)]

  const render = () => {
    boxes.forEach(box => box.clear()
      .roundRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 12)
      .fill(0x1a1a1a)
      .stroke({width: 3, color: box === diyaSlot.box && overBar ? highlight : 0x555555}))
    slots.forEach(({item, icon, label}) => {
      // An empty stack stays visible, faded, so it's clear what it held
      icon.alpha = item.count === 0 ? 0.35 : 1
      if (label) {
        label.text = String(item.count)
      }
    })
    diyaSlot.container.cursor = emptyDiya.count! > 0 ? "grab" : "default"
  }

  diyaSlot.container.eventMode = "static"
  diyaSlot.container.hitArea = new Rectangle(-slotSize / 2, -slotSize / 2, slotSize, slotSize)
  diyaSlot.container.on("pointerdown", e => {
    if (emptyDiya.count === 0) {
      return
    }
    emptyDiya.count! -= 1
    render()
    startDrag(e, new Sprite(texture), {fromStack: true})
  })

  const overPanel = (point: PointData) => {
    const local = hud.toLocal(point)
    return Math.abs(local.x) <= panelWidth / 2 && Math.abs(local.y) <= panelHeight / 2
  }

  const placeInScene = (sprite: Sprite, at: PointData) => {
    sprite.scale.set(diyaSceneWidth / texture.width)
    sprite.position.copyFrom(at)
    sprite.zIndex = at.y
    background.decorations.addChild(sprite)
  }

  const putOnStack = (sprite: Sprite) => {
    sprite.destroy()
    emptyDiya.count! += 1
    render()
  }

  const startDrag = (e: FederatedPointerEvent, sprite: Sprite, from: Omit<Drag, "sprite">) => {
    sprite.anchor.set(diyaAnchor.x, diyaAnchor.y)
    // Shown at the size it'll be placed at, so it lands exactly as seen
    sprite.scale.set(background.scale() * diyaSceneWidth / texture.width)
    sprite.position.copyFrom(e.global)
    sprite.eventMode = "none"
    dragLayer.addChild(sprite)
    drag = {sprite, ...from}
  }

  const setOverBar = (value: boolean) => {
    if (overBar !== value) {
      overBar = value
      render()
    }
  }

  // Sends the dragged diya back where it came from
  const returnDrag = ({sprite, fromStack, fromScene}: Drag) => {
    if (fromStack) {
      putOnStack(sprite)
    } else if (fromScene) {
      makePickable(sprite)
      placeInScene(sprite, fromScene)
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
    if (overPanel(at)) {
      putOnStack(current.sprite)
    } else {
      makePickable(current.sprite)
      placeInScene(current.sprite, background.toScene(at))
    }
  }

  // A placed diya can be picked up again to move it or put it back on the stack
  const makePickable = (sprite: Sprite) => {
    sprite.eventMode = "static"
    sprite.cursor = "grab"
    sprite.removeAllListeners("pointerdown")
    sprite.on("pointerdown", e => {
      const fromScene = {x: sprite.x, y: sprite.y}
      sprite.removeFromParent()
      startDrag(e, sprite, {fromScene})
    })
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
    setOverBar(overPanel(at))
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
      // Leaving the scene mid-drag puts the diya back where it came from
      if (!interactive && drag) {
        const current = drag
        drag = undefined
        setOverBar(false)
        current.sprite.removeFromParent()
        returnDrag(current)
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
