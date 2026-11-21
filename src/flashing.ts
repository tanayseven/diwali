// Whether flashing's reduced, for people sensitive to it: the screen doesn't flash with a
// bang, blasts light up the porch less and die away slowly, so a laddi's crackers glow
// steadily rather than strobe, and the city's fireworks barely flash. Set on the warning
// shown at the start or in the settings, and remembered on the device. Until it's set,
// it follows the device's own setting for reduced motion
const storageKey = "diwali-reduce-flashing"
// Reduced, a blast's light peaks at this share of what it would, and dies away this
// much more slowly, and the city's bursts flash this much as brightly
const reducedPeak = 0.4
const reducedFade = 0.25
const reducedSkyFlash = 0.25

const load = () => {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === "1" || saved === "0") {
      return saved === "1"
    }
  } catch {
    // Storage can be unavailable; fall through to the device's setting
  }
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
}

let reduced = load()
const listeners = new Set<(reduced: boolean) => void>()

const reduceFlashing = () => reduced

const setReduceFlashing = (value: boolean) => {
  reduced = value
  try {
    localStorage.setItem(storageKey, value ? "1" : "0")
  } catch {
    // Not saving is fine
  }
  listeners.forEach(listener => listener(value))
}

// Calls back whenever it's turned on or off, as on the warning and in the settings
const onReduceFlashing = (listener: (reduced: boolean) => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// How bright a blast's light is at its height, from 0 to 1, and how quickly it fades,
// as a share of how quickly it would
const flashPeak = () => reduced ? reducedPeak : 1
const flashFade = () => reduced ? reducedFade : 1
// How brightly the city's bursts flash, as a share of how brightly they would
const skyFlash = () => reduced ? reducedSkyFlash : 1

export {flashFade, flashPeak, onReduceFlashing, reduceFlashing, setReduceFlashing, skyFlash}
