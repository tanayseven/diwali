import {Container, Rectangle} from "pixi.js"

// Where a part of something is drawn on screen, as the box round it: a rectangle in its
// own units, or by default all it draws. Turned or zoomed, it's the box round its corners
const screenBox = (thing: Container, local?: Rectangle): Rectangle => {
  if (!local) {
    return thing.getBounds().rectangle.clone()
  }
  const corners = [
    {x: local.left, y: local.top}, {x: local.right, y: local.top},
    {x: local.left, y: local.bottom}, {x: local.right, y: local.bottom},
  ].map(corner => thing.toGlobal(corner))
  const xs = corners.map(corner => corner.x)
  const ys = corners.map(corner => corner.y)
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  return new Rectangle(left, top, Math.max(...xs) - left, Math.max(...ys) - top)
}

// How much of the screen two boxes both cover, nothing if they don't touch
const overlap = (a: Rectangle, b: Rectangle) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

// Of the things that could be, the one something on screen overlaps most, if any: so
// whatever it's touching is what it's dropped on or held to, not just what's under the
// pointer
const mostOverlapped = <T>(box: Rectangle, candidates: T[], boxOf: (candidate: T) => Rectangle) => {
  let best: T | undefined
  let most = 0
  for (const candidate of candidates) {
    const shared = overlap(box, boxOf(candidate))
    if (shared > most) {
      best = candidate
      most = shared
    }
  }
  return best
}

export {mostOverlapped, overlap, screenBox}
