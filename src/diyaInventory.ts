import {Application, Assets, Container, FederatedPointerEvent, Graphics, Point, PointData, Sprite, Texture} from "pixi.js"
import {createBackground} from "./background"

type Background = ReturnType<typeof createBackground>

const diyaUrl = "sprites/diwali-diya-animated.svg"
// Every asset the inventory needs, to be loaded before it's created
const diyaAssets = [diyaUrl]

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
// Share of a slot's width the diya icon fills
const iconFill = 0.85

type Slot = {
  container: Container
  box: Graphics
  icon: Sprite
  filled: boolean
}

type Drag = {
  sprite: Sprite
  // Where it came from, so it can go back if the drag is cancelled or dropped on a full slot
  fromSlot?: Slot
  fromScene?: PointData
}

// A bar of inventory slots along the bottom of the screen, each holding a diya to drag
// into the scene. Placed diyas can be picked up again, moved, or dropped back in a slot.
// Expects diyaAssets to have been loaded already
const createDiyaInventory = (app: Application, background: Background) => {
  const texture = Assets.get<Texture>(diyaUrl)
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
  let hoveredSlot: Slot | undefined

  const panelWidth = slotCount * slotSize + (slotCount - 1) * slotGap + panelPadding * 2
  const panelHeight = slotSize + panelPadding * 2

  const renderSlot = (slot: Slot) => {
    const active = slot === hoveredSlot
    slot.box.clear()
      .roundRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 12)
      .fill(0x1a1a1a)
      .stroke({width: 3, color: active ? highlight : 0x555555})
    slot.icon.visible = slot.filled
    slot.container.cursor = slot.filled ? "grab" : "default"
  }

  const slots: Slot[] = Array.from({length: slotCount}, (_, idx) => {
    const slotContainer = new Container()
    const box = new Graphics()
    const icon = new Sprite(texture)
    icon.anchor.set(0.5)
    icon.scale.set(slotSize * iconFill / texture.width)
    slotContainer.addChild(box, icon)
    slotContainer.position.set(
      panelPadding + slotSize / 2 + idx * (slotSize + slotGap) - panelWidth / 2,
      panelPadding + slotSize / 2 - panelHeight / 2,
    )
    slotContainer.eventMode = "static"
    const slot: Slot = {container: slotContainer, box, icon, filled: true}
    slotContainer.on("pointerdown", e => {
      if (!slot.filled) {
        return
      }
      slot.filled = false
      renderSlot(slot)
      startDrag(e, new Sprite(texture), {fromSlot: slot})
    })
    hud.addChild(slotContainer)
    renderSlot(slot)
    return slot
  })

  // Which slot, if any, a point on screen is over
  const slotAt = (point: PointData) => {
    const local = hud.toLocal(point)
    return slots.find(({container: slotContainer}) =>
      Math.abs(local.x - slotContainer.x) <= slotSize / 2 && Math.abs(local.y - slotContainer.y) <= slotSize / 2)
  }

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

  const putInSlot = (slot: Slot, sprite: Sprite) => {
    sprite.destroy()
    slot.filled = true
    renderSlot(slot)
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

  const setHoveredSlot = (slot: Slot | undefined) => {
    const previous = hoveredSlot
    hoveredSlot = slot
    if (previous) {
      renderSlot(previous)
    }
    if (slot) {
      renderSlot(slot)
    }
  }

  // Sends the dragged diya back where it came from
  const returnDrag = ({sprite, fromSlot, fromScene}: Drag) => {
    if (fromSlot) {
      putInSlot(fromSlot, sprite)
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
    setHoveredSlot(undefined)
    current.sprite.removeFromParent()
    const slot = slotAt(at)
    if (slot && !slot.filled) {
      putInSlot(slot, current.sprite)
    } else if (overPanel(at)) {
      returnDrag(current)
    } else {
      makePickable(current.sprite)
      placeInScene(current.sprite, background.toScene(at))
    }
  }

  // A placed diya can be picked up again to move it or put it back in a slot
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
    const slot = slotAt(at)
    setHoveredSlot(slot && !slot.filled ? slot : undefined)
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
        setHoveredSlot(undefined)
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
