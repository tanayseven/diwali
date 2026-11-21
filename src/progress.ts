// What the player's done, as they do it, for whatever's following along: the guided first
// run, waiting for each step to be done, and the prompt to rate the app, waiting for
// something to have been made. Only what the player does, never the guests
type Progress =
  | "diyaPlaced" | "diyaLit"
  | "fireworkPlaced" | "fireworkLit"
  | "kandilLit" | "lightsHung"
  | "rangoliPlaced"

const listeners = new Set<(done: Progress) => void>()

const report = (done: Progress) => listeners.forEach(listener => listener(done))

// Calls back with each thing the player does from now on; returns how to stop
const onProgress = (listener: (done: Progress) => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export {onProgress, report}
export type {Progress}
