import {existsSync, readdirSync, readFileSync} from "node:fs"
import {homedir} from "node:os"
import {join} from "node:path"
import {chromium} from "playwright-core"
import {SourceMapConsumer} from "source-map-js"

// Where the built game is, for its source maps
const distAssets = new URL("../../dist/assets/", import.meta.url).pathname

// The Chromium to benchmark in: PLAYWRIGHT_CHROMIUM if it's set, or the newest one in
// Playwright's cache
const chromiumPath = () => {
  if (process.env.PLAYWRIGHT_CHROMIUM) {
    return process.env.PLAYWRIGHT_CHROMIUM
  }
  const cache = join(homedir(), ".cache", "ms-playwright")
  const builds = existsSync(cache) ? readdirSync(cache).filter(name => /^chromium-\d+$/.test(name)).sort() : []
  const found = builds.reverse().map(name => join(cache, name, "chrome-linux", "chrome")).find(existsSync)
  if (!found) {
    throw new Error("No Chromium found: set PLAYWRIGHT_CHROMIUM, or run `npx playwright-core install chromium`")
  }
  return found
}

// A real window on the real graphics card, as headless Chrome only renders in software,
// which is far slower than any device the game runs on
const launch = () => chromium.launch({
  headless: false,
  executablePath: chromiumPath(),
  args: process.env.WAYLAND_DISPLAY ? ["--ozone-platform=wayland"] : [],
})

// The hottest temperature the machine reports, in °C, as this laptop slows down when
// hot and that can look like the game slowing down. Undefined where it can't be read
const temperature = () => {
  try {
    const zones = readdirSync("/sys/class/thermal").filter(name => name.startsWith("thermal_zone"))
    const temps = zones.map(zone => Number(readFileSync(`/sys/class/thermal/${zone}/temp`, "utf8")) / 1000)
    return Math.round(Math.max(...temps))
  } catch {
    return undefined
  }
}

// Starts and stops recording the time between frames on a page, returning how smooth
// they were: frames a second, the 95th percentile frame time, and the share of frames
// slower than 20 ms
const startFrames = page => page.evaluate(() => {
  window.__benchFrames = []
  window.__benchRecording = true
  let last = performance.now()
  const frame = now => {
    window.__benchFrames.push(now - last)
    last = now
    if (window.__benchRecording) {
      requestAnimationFrame(frame)
    }
  }
  requestAnimationFrame(frame)
})
const stopFrames = page => page.evaluate(() => {
  window.__benchRecording = false
  const times = window.__benchFrames.slice(1)
  const total = times.reduce((sum, time) => sum + time, 0)
  const sorted = [...times].sort((a, b) => a - b)
  return {
    fps: Math.round(1000 * times.length / total),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    slow: Math.round(100 * times.filter(time => time > 20).length / times.length),
  }
})

// How much of a CPU profile went to each of the game's source files, found through the
// build's source maps. Time spent in Pixi or the browser on the game's behalf counts
// towards the game's file that called it; the rest is "pixi/browser"
const consumers = new Map()
const consumerFor = url => {
  const file = url.split("/").pop()
  if (!consumers.has(file)) {
    try {
      consumers.set(file, new SourceMapConsumer(JSON.parse(readFileSync(join(distAssets, `${file}.map`), "utf8"))))
    } catch {
      consumers.set(file, undefined)
    }
  }
  return consumers.get(file)
}
const timeBySource = profile => {
  const nodes = new Map(profile.nodes.map(node => [node.id, node]))
  const parents = new Map()
  profile.nodes.forEach(node => (node.children ?? []).forEach(child => parents.set(child, node.id)))
  const sources = new Map()
  const sourceOf = id => {
    if (sources.has(id)) {
      return sources.get(id)
    }
    let source
    for (let at = id; at !== undefined && !source; at = parents.get(at)) {
      const frame = nodes.get(at).callFrame
      const position = frame.url && consumerFor(frame.url)?.originalPositionFor({line: frame.lineNumber + 1, column: frame.columnNumber})
      if (position?.source && /\bsrc\//.test(position.source) && !/node_modules/.test(position.source)) {
        source = position.source.replace(/^.*\bsrc\//, "")
      }
    }
    const leaf = nodes.get(id).callFrame.functionName
    source ??= ["(idle)", "(program)", "(garbage collector)"].includes(leaf) ? leaf : "pixi/browser"
    sources.set(id, source)
    return source
  }
  const spent = new Map()
  let busy = 0
  profile.samples.forEach((id, idx) => {
    const source = sourceOf(id)
    const time = profile.timeDeltas[idx] ?? 0
    if (source !== "(idle)") {
      busy += time
      spent.set(source, (spent.get(source) ?? 0) + time)
    }
  })
  const span = profile.endTime - profile.startTime
  return {
    busy: Math.round(100 * busy / span),
    top: [...spent].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([source, time]) => [source, +(100 * time / span).toFixed(1)]),
  }
}

export {launch, startFrames, stopFrames, temperature, timeBySource}
