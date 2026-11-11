import {Assets, Container, Graphics, PointData, Sprite} from "pixi.js"

// On touch screens a finger would hide whatever it's dragging, so that's shown a little
// above and to the left of it, on screen, and it's there that it's put down or held to
// something. A hand reaching up from the finger holds it there, pinched between thumb
// and forefinger
const liftOffset = 40
const markerRadius = 26
const markerColour = 0xffffff

// The hand, pointing up, pinching at a point a fraction across and down it. Its
// forefinger's tip is drawn again over what it holds, so it's held rather than stuck on
const handUrl = "sprites/hand/hand-holding.svg"
const handFrontUrl = "sprites/hand/hand-holding-front.svg"
const handAssets = [handUrl, handFrontUrl]
const pinch = {x: 0.5, y: 0.18}
const handScale = 0.4
// Tipped over to reach up and to the left, from the finger to what it's dragging
const handRotation = -Math.PI / 4

// Where something dragged by a pointer at a point is shown
const lift = (at: PointData, pointerType: string): PointData =>
  pointerType === "touch" ? {x: at.x - liftOffset, y: at.y - liftOffset} : {x: at.x, y: at.y}

const handSprite = (url: string) => {
  const sprite = new Sprite(Assets.get(url))
  sprite.anchor.set(pinch.x, pinch.y)
  sprite.scale.set(handScale)
  sprite.rotation = handRotation
  return sprite
}

// A circle where the finger is, if the hand couldn't be loaded
const circle = () => new Graphics()
  .circle(liftOffset, liftOffset, markerRadius)
  .fill({color: markerColour, alpha: 0.15})
  .stroke({width: 3, color: markerColour, alpha: 0.7})

// The hand holding whatever a finger is dragging. Add the marker below what's dragged
// and the front above it, in a container that sorts its children, as the front's
// drawn over everything else in it, whenever that's added
const createTouchMarker = () => {
  const hasHand = handAssets.every(url => Assets.cache.has(url))
  const marker = new Container()
  marker.addChild(hasHand ? handSprite(handUrl) : circle())
  const front = new Container()
  // Placed things keep their height in the scene as their zIndex when they're picked
  // up, so the hand's set below and its forefinger above any that could be
  marker.zIndex = -Number.MAX_SAFE_INTEGER
  front.zIndex = Number.MAX_SAFE_INTEGER
  if (hasHand) {
    front.addChild(handSprite(handFrontUrl))
  }
  for (const part of [marker, front]) {
    part.eventMode = "none"
    part.visible = false
  }
  return {
    marker,
    front,
    // Holds what a finger at a point is dragging, and gives where it's shown
    follow(at: PointData, pointerType: string) {
      const shownAt = lift(at, pointerType)
      for (const part of [marker, front]) {
        part.visible = pointerType === "touch"
        part.position.copyFrom(shownAt)
      }
      return shownAt
    },
    // Moves the hand to hold what's dragged at a point on the stage instead, as the match
    // is held by its stick rather than by its head
    holdAt(grip: PointData) {
      if (!hasHand) {
        return
      }
      for (const part of [marker, front]) {
        part.position.copyFrom(part.parent ? part.parent.toLocal(grip) : grip)
      }
    },
    hide() {
      marker.visible = false
      front.visible = false
    },
  }
}

export {createTouchMarker, handAssets, lift}
