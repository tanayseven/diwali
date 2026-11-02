import {Graphics, PointData} from "pixi.js"

// On touch screens a finger would hide whatever it's dragging, so that's shown a little
// above and to the left of it, on screen, and it's there that it's put down or held to
// something. A circle marks where the finger is
const liftOffset = 40
const markerRadius = 26
const markerColour = 0xffffff

// Where something dragged by a pointer at a point is shown
const lift = (at: PointData, pointerType: string): PointData =>
  pointerType === "touch" ? {x: at.x - liftOffset, y: at.y - liftOffset} : {x: at.x, y: at.y}

// The circle under a finger while it's dragging something. Add it below what's dragged
const createTouchMarker = () => {
  const marker = new Graphics()
    .circle(0, 0, markerRadius)
    .fill({color: markerColour, alpha: 0.15})
    .stroke({width: 3, color: markerColour, alpha: 0.7})
  marker.eventMode = "none"
  marker.visible = false
  return {
    marker,
    // Marks a finger at a point, and gives where what it's dragging is shown
    follow(at: PointData, pointerType: string) {
      marker.visible = pointerType === "touch"
      marker.position.copyFrom(at)
      return lift(at, pointerType)
    },
    hide() {
      marker.visible = false
    },
  }
}

export {createTouchMarker, lift}
