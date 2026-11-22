import type {PointData} from "pixi.js"

// What goes on in the scene that the guests on the porch notice, where in the scene it
// is: a firework's fuse lit, one going off in a show of sparks, a bang, a kandil or a
// diya lit by the player, a rocket leaving its bottle and one bursting high in the sky
type Happening = {
  kind: "fuse" | "show" | "bang" | "kandil" | "diya" | "rocket" | "burst"
  at: PointData
  // For a burst, the house, by its place along the street, whose porch it went up from,
  // and what burst
  from?: number
  firework?: string
}

type Listener = (happening: Happening) => void

const listeners = new Set<Listener>()

const happen = (kind: Happening["kind"], at: PointData, about: {from?: number, kind?: string} = {}) => {
  const happening: Happening = {kind, at: {x: at.x, y: at.y}, from: about.from, firework: about.kind}
  listeners.forEach(listener => listener(happening))
}

// Hears whatever happens from now on, until the returned function's called
const onHappening = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export {happen, onHappening}
export type {Happening}
