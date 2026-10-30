// Benchmarks the built game in a real browser window on this machine's graphics card.
//
//   node scripts/bench/run.mjs [matrix|timeline|memory|all] [--size name|WxHxDPR] [--out file]
//
// matrix:   frame rate and main-thread time per source file, idle, panning and with
//           fireworks lit, at the sizes in `sizes` (or the one given)
// timeline: frames a second for each second after the scene starts, to spot stalls
// memory:   how long loading takes, what's downloaded, and the graphics card memory
//           taken by textures
//
// It serves dist/ itself, so build first (npm run bench does both). Results go to the
// terminal, and are added to --out if it's given
import {appendFileSync} from "node:fs"
import {preview} from "vite"
import {launch, startFrames, stopFrames, temperature, timeBySource} from "./browser.mjs"

const port = 4173
const url = `http://localhost:${port}/`

// The screens to try: a laptop, a desktop at 2x (drawn at the desktop's 1.5x cap), a
// 1440p monitor, and a phone with a touch screen and its processor slowed 4x
const sizes = {
  laptop: {width: 1600, height: 900, density: 1},
  hidpi: {width: 1920, height: 1080, density: 2},
  monitor: {width: 2560, height: 1440, density: 1},
  phone: {width: 412, height: 915, density: 2.625, mobile: true},
}

const args = process.argv.slice(2)
const option = name => {
  const idx = args.indexOf(name)
  return idx >= 0 ? args[idx + 1] : undefined
}
const mode = ["matrix", "timeline", "memory"].find(name => args.includes(name)) ?? "all"
const sizeArg = option("--size")
const out = option("--out")
// --size is one of the sizes' names, or WxHxDPR
const chosen = !sizeArg ? sizes
  : sizes[sizeArg] ? {[sizeArg]: sizes[sizeArg]}
  : {[sizeArg]: (([width, height, density]) => ({width, height, density}))(sizeArg.split("x").map(Number))}

const lines = []
const report = line => {
  console.log(line)
  lines.push(line)
}

// A page with the game open on the porch, past the warning
const openGame = async (browser, size) => {
  const context = await browser.newContext({
    viewport: {width: size.width, height: size.height},
    deviceScaleFactor: size.density,
    isMobile: !!size.mobile,
    hasTouch: !!size.mobile,
  })
  const page = await context.newPage()
  page.on("pageerror", error => report(`  page error: ${error.message}`))
  const cdp = await context.newCDPSession(page)
  if (size.mobile) {
    await cdp.send("Emulation.setCPUThrottlingRate", {rate: 4})
  }
  return {context, page, cdp}
}
// The photosensitivity warning shows once loading's done, which waits for the music to
// buffer, so how long it takes varies. Its text is what's looked for
const warningText = "flashing and twinkling lights"
// Opens the game, trying again if the load's cut off, which now and then happens as one
// browser context closes and the next opens
const open = async page => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await page.goto(url)
    } catch (error) {
      if (attempt === 3) {
        throw error
      }
      await page.waitForTimeout(1000)
    }
  }
}
const enterScene = async page => {
  await open(page)
  await page.waitForFunction(text => document.body.innerText.includes(text), warningText, {timeout: 30000})
  await page.waitForTimeout(500)
  await page.keyboard.press("Space")
  await page.waitForFunction(text => !document.body.innerText.includes(text), warningText, {timeout: 15000})
  // Settled into the scene, past building it and the first frames
  await page.waitForTimeout(5000)
}

const drag = async (page, from, to) => {
  await page.mouse.move(...from)
  await page.mouse.down()
  await page.mouse.move(...to, {steps: 12})
  await page.mouse.up()
  await page.waitForTimeout(250)
}

// Every firework in the Fireworks bar, all five each of anars, laddis, chakris, sutli
// bombs and rockets, dragged onto the porch in a grid, then each lit in turn with the
// match dragged out of the bar and held over it until it catches. The rail's button
// and the bar's slots are where they are at 1600 x 900
const fireworksEach = 5
const fireworkKinds = 5
const lightFireworks = async page => {
  await page.mouse.click(56, 354)
  await page.waitForTimeout(800)
  const slot = idx => [403 + 88.3 * idx, 797]
  // Kinds take turns along each row, so each kind is spread across the porch
  const spots = Array.from({length: fireworksEach * fireworkKinds}, (_, idx) =>
    ({kind: idx % fireworkKinds, at: [240 + 280 * (idx % 5), 520 + 55 * Math.floor(idx / 5)]}))
  for (const {kind, at} of spots) {
    await drag(page, slot(kind), at)
  }
  await page.mouse.move(...slot(fireworkKinds))
  await page.mouse.down()
  for (const {at: [x, y]} of spots) {
    // Long enough for the last match to burn out and a fresh one to catch
    await page.mouse.move(x, y - 15, {steps: 6})
    await page.waitForTimeout(2500)
  }
  await page.mouse.up()
}
const fireworkCount = fireworksEach * fireworkKinds

const zoomOut = async page => {
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press("-")
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(1500)
}

// Frame rate and where the main thread's time went, over a scenario
const measure = async ({page, cdp}, name, scenario) => {
  await cdp.send("Profiler.enable")
  await cdp.send("Profiler.setSamplingInterval", {interval: 500})
  await cdp.send("Profiler.start")
  await startFrames(page)
  await scenario()
  const frames = await stopFrames(page)
  const {profile} = await cdp.send("Profiler.stop")
  const time = timeBySource(profile)
  report(`  ${name}: ${frames.fps} fps, p95 ${frames.p95} ms, ${frames.slow}% slow`)
  report(`    main thread ${time.busy}% busy: ${time.top.map(([source, share]) => `${source} ${share}%`).join(", ")}`)
}

const matrix = async (browser, name, size) => {
  report(`\n${name} ${size.width}x${size.height} at ${size.density}x${size.mobile ? ", touch, CPU 4x slower" : ""} (${temperature() ?? "?"} °C)`)
  const game = await openGame(browser, size)
  await enterScene(game.page)
  const wait = ms => () => game.page.waitForTimeout(ms)
  await measure(game, "close-up idle", wait(8000))
  await zoomOut(game.page)
  await measure(game, "zoomed out idle", wait(8000))
  await measure(game, "zoomed out panning", async () => {
    for (let pass = 0; pass < 8; pass++) {
      await drag(game.page, [size.width / 2, size.height / 3], [size.width * (pass % 2 ? 0.7 : 0.3), size.height / 3])
    }
  })
  await game.context.close()
  // The fireworks are placed by where the bar's slots are on a laptop's screen
  if (size.width === 1600 && size.height === 900) {
    const stress = await openGame(browser, size)
    await enterScene(stress.page)
    await lightFireworks(stress.page)
    await measure(stress, `close-up, ${fireworkCount} fireworks lit`, () => stress.page.waitForTimeout(8000))
    await zoomOut(stress.page)
    await measure(stress, `zoomed out, ${fireworkCount} fireworks lit`, () => stress.page.waitForTimeout(8000))
    await stress.context.close()
  }
}

const timeline = async (browser, name, size) => {
  const game = await openGame(browser, size)
  await game.page.addInitScript(() => {
    window.__benchAll = []
    const frame = now => {
      window.__benchAll.push(now)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
  await open(game.page)
  await game.page.waitForFunction(text => document.body.innerText.includes(text), warningText, {timeout: 30000})
  await game.page.waitForTimeout(500)
  const start = await game.page.evaluate(() => performance.now())
  await game.page.keyboard.press("Space")
  await game.page.waitForTimeout(32000)
  const frames = await game.page.evaluate(() => window.__benchAll)
  const perSecond = Array.from({length: 32}, (_, second) =>
    frames.filter(at => at >= start + second * 1000 && at < start + (second + 1) * 1000).length)
  const stalls = frames.slice(1).map((at, idx) => at - frames[idx]).filter(gap => gap > 100)
  report(`\n${name} frames a second after the scene starts (${temperature() ?? "?"} °C): ${perSecond.join(" ")}`)
  report(`  stalls over 100 ms: ${stalls.length ? stalls.map(Math.round).join(", ") : "none"}`)
  await game.context.close()
}

const memory = async (browser, name, size) => {
  const game = await openGame(browser, size)
  // Adds up the textures sent to the graphics card, by their size, as they're made and
  // freed
  await game.page.addInitScript(() => {
    const textures = new Map()
    window.__benchTextures = textures
    const bound = new WeakMap()
    const gl = WebGL2RenderingContext.prototype
    const {bindTexture, deleteTexture, texImage2D, texStorage2D} = gl
    gl.bindTexture = function (target, texture) {
      bound.set(this, texture)
      return bindTexture.call(this, target, texture)
    }
    gl.deleteTexture = function (texture) {
      textures.delete(texture)
      return deleteTexture.call(this, texture)
    }
    gl.texImage2D = function (...args) {
      const texture = bound.get(this)
      if (texture && args[1] === 0) {
        const [width, height] = args.length >= 8 ? [args[3], args[4]] : [args[5].width, args[5].height]
        textures.set(texture, width * height * 4)
      }
      return texImage2D.apply(this, args)
    }
    gl.texStorage2D = function (target, levels, format, width, height) {
      const texture = bound.get(this)
      if (texture) {
        textures.set(texture, width * height * 4)
      }
      return texStorage2D.apply(this, arguments)
    }
  })
  await enterScene(game.page)
  const result = await game.page.evaluate(() => {
    const entries = performance.getEntriesByType("resource")
    const kinds = {js: /\.js/, svg: /\.svg/, audio: /\.mp3/}
    const downloaded = Object.fromEntries(Object.entries(kinds).map(([kind, pattern]) =>
      [kind, Math.round(entries.filter(entry => pattern.test(entry.name)).reduce((sum, entry) => sum + entry.encodedBodySize, 0) / 1024)]))
    // The loader's images, the first fetched, not ones fetched again later for their markup
    const loaded = Math.round(Math.max(...entries.filter(entry => /sprites\//.test(entry.name)).slice(0, 100).map(entry => entry.responseEnd)))
    const sizes = [...window.__benchTextures.values()].sort((a, b) => b - a)
    return {
      downloaded,
      loaded,
      gpu: Math.round(sizes.reduce((sum, size) => sum + size, 0) / 1e6),
      count: sizes.length,
      biggest: sizes.slice(0, 6).map(size => Math.round(size / 1e6)),
      heap: Math.round(performance.memory.usedJSHeapSize / 1e6),
    }
  })
  report(`\n${name} memory: images loaded by ${result.loaded} ms; downloaded ${Object.entries(result.downloaded).map(([kind, kb]) => `${kind} ${kb} KB`).join(", ")}`)
  report(`  textures ${result.gpu} MB in ${result.count} (biggest ${result.biggest.join(", ")} MB), JS heap ${result.heap} MB`)
  await game.context.close()
}

const server = await preview({preview: {port, strictPort: true}, logLevel: "silent"})
const browser = await launch()
try {
  report(`Benchmark ${new Date().toISOString()} (${mode})`)
  for (const [name, size] of Object.entries(chosen)) {
    if (mode === "matrix" || mode === "all") {
      await matrix(browser, name, size)
    }
    if (mode === "timeline" || mode === "all") {
      await timeline(browser, name, size)
    }
    if (mode === "memory" || mode === "all") {
      await memory(browser, name, size)
    }
  }
} finally {
  await browser.close()
  await new Promise(resolve => server.httpServer.close(resolve))
}
if (out) {
  appendFileSync(out, lines.join("\n") + "\n\n")
}
