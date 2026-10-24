import {Application, Container, FederatedPointerEvent, Graphics, Point, PointData, Sprite, Text, Texture} from "pixi.js"
import {fontFamily} from "./app"
import {createBackground} from "./background"

type Background = ReturnType<typeof createBackground>

const diyaUrl = "sprites/diwali-diya-animated.svg"
// Every image the inventory needs, to be preloaded (as an image, not a texture) first
const diyaAssets = [diyaUrl]
// The diya SVG's own size
const diyaWidth = 460
const diyaHeight = 380

const slotCount = 5
// How many diyas there are to place, all stacked in the first slot
const diyaCount = 5
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
// The count badge in the slot's top-right corner
const badgeRadius = 13
const badgeInset = 6

type Drag = {
  sprite: Sprite
  // Where it came from, so it can go back if the drag is cancelled: the stack, or a spot
  fromStack?: boolean
  fromScene?: PointData
}

// The diya SVG animates its flame with SMIL, which only runs while it's shown as an
// image; turned straight into a texture it would freeze. So a hidden copy of it keeps
// playing, and is drawn onto a canvas every frame for all the diyas to share. Where a
// browser only draws an animated SVG's first frame, the diyas simply stay still
const createLiveDiyaTexture = (app: Application) => {
  const image = document.createElement("img")
  image.src = diyaUrl
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
  canvas.width = diyaWidth
  canvas.height = diyaHeight
  const context = canvas.getContext("2d")!
  const texture = Texture.from(canvas)
  const draw = () => {
    if (!image.complete || image.naturalWidth === 0) {
      return
    }
    context.clearRect(0, 0, diyaWidth, diyaHeight)
    context.drawImage(image, 0, 0, diyaWidth, diyaHeight)
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

// A bar of inventory slots along the bottom of the screen. The first holds a stack of
// diyas, with a badge counting how many are left, to drag one at a time into the scene;
// the rest are empty for now. Placed diyas can be picked up again and moved, or dropped
// anywhere on the bar to go back on the stack.
// Expects diyaAssets to have been preloaded already
const createDiyaInventory = (app: Application, background: Background) => {
  const liveDiya = createLiveDiyaTexture(app)
  const {texture} = liveDiya
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
  let count = diyaCount
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
  const stackBox = boxes[0]

  const stack = new Container()
  stack.position.copyFrom(stackBox.position)
  stack.eventMode = "static"
  stack.hitArea = {contains: (x: number, y: number) => Math.abs(x) <= slotSize / 2 && Math.abs(y) <= slotSize / 2}
  const icon = new Sprite(texture)
  icon.anchor.set(0.5)
  icon.scale.set(slotSize * iconFill / texture.width)
  const badge = new Container()
  badge.position.set(slotSize / 2 - badgeInset, -slotSize / 2 + badgeInset)
  const badgeCircle = new Graphics()
    .circle(0, 0, badgeRadius)
    .fill(highlight)
    .stroke({width: 2, color: 0x000000})
  const badgeLabel = new Text({text: "", style: {fontFamily, fontSize: 20, fill: 0x000000}})
  badgeLabel.anchor.set(0.5)
  badgeLabel.roundPixels = true
  badge.addChild(badgeCircle, badgeLabel)
  stack.addChild(icon, badge)
  hud.addChild(stack)

  const render = () => {
    boxes.forEach(box => box.clear()
      .roundRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 12)
      .fill(0x1a1a1a)
      .stroke({width: 3, color: box === stackBox && overBar ? highlight : 0x555555}))
    // An empty stack stays visible, faded, so it's clear where diyas go back
    icon.alpha = count > 0 ? 1 : 0.35
    badgeLabel.text = String(count)
    stack.cursor = count > 0 ? "grab" : "default"
  }

  stack.on("pointerdown", e => {
    if (count === 0) {
      return
    }
    count -= 1
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
    count += 1
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
      liveDiya.destroy()
    },
  }
}

export {createDiyaInventory, diyaAssets}
