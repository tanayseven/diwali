// Plays through the whole game in a Chromium window, as a phone held sideways (a Pixel
// 7, with touch), so the hand drawn holding whatever's dragged shows: zoomed right in,
// diyas filled and lit with the matchstick; out a little, every firework lit; out a
// little more, kandils made on the house and the porch and fairy lights hung; in again
// for a rangoli; then the city zoomed out to, the volume slider and a photo. The
// window's left open at the end to play on, until it's closed.
//
//   npm run demo [-- out-dir]
//
// SLOW stretches every wait and drag (1.25 by default, about as quickly as a person
// would, and 1 is as fast as it goes),
// HEADLESS=1 plays it without a window, and an out-dir saves a screenshot of each step.
// It exits with an error if the game logged any. It starts the dev server itself, and
// needs Playwright's Chromium (npx playwright-core install chromium), or another one in
// PLAYWRIGHT_CHROMIUM.
//
// Everything's laid out symmetrically about the house's middle, its front door, at x 640
// in the scene's own units, as in src/background.ts. Where things go is put on
// screen through a camera kept in step with the game's: zoomed with its keys, which zoom
// about the middle of the screen, and moved with the wheel, which pans by exactly as
// much. The rail's buttons and the bar's slots are where they are on that screen, in CSS
// pixels, as in scripts/store/screenshots.mjs, so a change to the layout or the camera
// needs them moved too
import {mkdirSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {chromium, devices} from "playwright-core"
import {createServer} from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const out = process.argv[2]
const headless = process.env.HEADLESS === "1"
const slow = Number(process.env.SLOW ?? 1.25)
const port = Number(process.env.DEMO_PORT ?? 4176)

const screen = {width: 844, height: 390}
const phone = {...devices["Pixel 7 landscape"], viewport: screen, screen}
// The rail's buttons down the left, top to bottom
const rail = {diyas: 43, fireworks: 110, kandil: 177, decorate: 244, rangoli: 311}
// The bar's slots along the bottom, left to right
const slot = index => ({x: 125 + 66 * index, y: 300})
// The buttons down the right
const speaker = {x: 793, y: 52}
const zoomOut = {x: 793, y: 186}
const camera = {x: 793, y: 262}
// What's dragged by touch is shown this far up and to the left of the finger, as in
// src/touchMarker.ts, and is put down there
const lift = 64

// The game's camera, as src/background.ts has it: the scene's 1280 x 720 units scaled
// to cover the screen at the least, framing the porch to begin with, a diya and a half
// across at the most, and each press of a zoom key zooming by half again
const cover = Math.max(screen.width / 1280, screen.height / 720)
const fit = view => Math.max(cover, Math.min(screen.width / view.width, screen.height / view.height))
const view = {scale: fit({width: 490, height: 220}), x: 640, y: 580}
const closest = fit({width: 180, height: 80})
const zoomStep = 1.5
// Where a point in the scene is on screen
const onScreen = at => ({
  x: (at.x - view.x) * view.scale + screen.width / 2,
  y: (at.y - view.y) * view.scale + screen.height / 2,
})

if (out) {
  mkdirSync(out, {recursive: true})
}
const server = await createServer({root, server: {port, strictPort: true}, logLevel: "error"})
await server.listen()
const browser = await chromium.launch({
  headless,
  args: headless ? ["--mute-audio"] : ["--window-size=900,520"],
  ...process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {},
})
const context = await browser.newContext(phone)
// Heard, but quietly
await context.addInitScript(() => {
  localStorage.setItem("diwali-audio", JSON.stringify({volume: 0.3, muted: false}))
})
const page = await context.newPage()
const errors = []
page.on("pageerror", error => errors.push(error.message))
page.on("console", message => message.type() === "error" && errors.push(message.text()))
const touchscreen = await context.newCDPSession(page)

const wait = ms => page.waitForTimeout(ms * slow)
const shot = async name => out && page.screenshot({path: `${out}/${name}.png`})
const step = name => console.log(new Date().toTimeString().slice(0, 8), name)
const touch = (type, at) => touchscreen.send("Input.dispatchTouchEvent", {type, touchPoints: at ? [at] : []})
const tap = async at => {
  await page.touchscreen.tap(at.x, at.y)
  await wait(400)
}
// A finger put down, moved to another point, held there a while, and lifted
const swipe = async (from, to, hold = 300) => {
  await touch("touchStart", from)
  await wait(150)
  const steps = Math.round(24 * slow)
  for (let i = 1; i <= steps; i++) {
    await touch("touchMove", {x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps})
    await page.waitForTimeout(20)
  }
  await wait(hold)
  await touch("touchEnd")
  await wait(300)
}
// Drags what's in a bar's slot so it's shown, and put down, at a point in the scene. The
// finger has to stay above the bar for it to go down there, not back on the bar
const put = (index, at, hold) => {
  const shown = onScreen(at)
  return swipe(slot(index), {x: shown.x + lift, y: shown.y + lift}, hold)
}
// A point in the scene moved by a distance in scene units
const by = (at, dx, dy) => ({x: at.x + dx, y: at.y + dy})
// A finger drawn through points in the scene
const draw = async points => {
  const [first, ...rest] = points.map(onScreen)
  await touch("touchStart", first)
  for (const point of rest) {
    await touch("touchMove", point)
    await page.waitForTimeout(25 * slow)
  }
  await touch("touchEnd")
  await wait(200)
}
// Zooms in (more than 0) or out by a number of presses of the zoom keys, about the
// middle of the screen, and waits for it to ease there
const zoom = async (presses, settle = 400 * slow) => {
  for (let i = 0; i < Math.abs(presses); i++) {
    await page.keyboard.press(presses > 0 ? "+" : "-")
    await page.waitForTimeout(60)
  }
  view.scale = Math.min(closest, Math.max(cover, view.scale * zoomStep ** presses))
  await page.waitForTimeout(settle)
}
// Pans by a distance on screen with the wheel, as a trackpad scrolls the scenery past
const scroll = async (dx, dy) => {
  await page.mouse.move(screen.width / 2, 20)
  await page.mouse.wheel(dx, dy)
  view.x += dx / view.scale
  view.y += dy / view.scale
}
// Pans so a point in the scene is in the middle of the screen
const lookAt = async (x, y, settle = 600 * slow) => {
  await scroll((x - view.x) * view.scale, (y - view.y) * view.scale)
  await page.waitForTimeout(settle)
}

await page.goto(`http://localhost:${port}/`)
await wait(1500)
step("Language picker")
await page.getByRole("button", {name: "English"}).tap()
// Past the warning and the advice on sound, once each has been seen
for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
  await page.getByText(text).waitFor({timeout: 60000})
  await wait(1500)
  await tap({x: screen.width / 2, y: screen.height / 2})
}
await wait(2000)

step("Zooming right in on the porch")
await tap({x: 52, y: rail.diyas})
await zoom(2)
await lookAt(640, 612)

step("Diyas, a pair either side of the door's steps, with a wick and oil")
const diyas = [{x: 590, y: 597}, {x: 690, y: 597}]
for (const diya of diyas) {
  await put(0, diya, 500)
  await put(1, by(diya, 0, -4.6), 500)
  await put(2, by(diya, 0, -5.8), 800)
  await wait(1500)
}
await shot("diyas")
step("Lighting them with the matchstick")
for (const diya of diyas) {
  await put(3, by(diya, 4.6, -8), 1800)
}
await wait(800)
await shot("diyas-lit")
step("Turning one")
await tap(onScreen(by(diyas[1], 0, -2.3)))
await wait(800)

step("Fireworks, zoomed out a little, in pairs either side of the rocket at the door")
await tap({x: 52, y: rail.fireworks})
await zoom(-3)
await lookAt(640, 635)
// In the bar's order: anar, laddi, chakri, sutli bomb and rocket
const fireworks = [{x: 540, y: 620}, {x: 450, y: 622}, {x: 830, y: 622}, {x: 740, y: 620}, {x: 640, y: 628}]
for (const [index, at] of fireworks.entries()) {
  await put(index, at, 500)
}
await wait(500)
await shot("fireworks")
step("What to do next")
await page.locator('button:text-is("?"):visible').first().tap()
await wait(2500)
await shot("hint")
await tap({x: screen.width / 2, y: 40})
const [anar, laddi, chakri, sutli, rocket] = fireworks
const light = at => put(5, by(at, 2.3, -8), 1800)
step("Anar")
await light(anar)
await wait(3000)
await shot("anar")
step("Laddi")
await light(laddi)
await wait(3000)
step("Chakri")
await light(chakri)
await wait(3500)
await shot("chakri")
step("Sutli bomb")
await light(sutli)
await wait(5000)
step("Rocket, zoomed out to see it go up")
// Its fuse burns for under 2 s once it's caught, which takes about a second, and it
// bursts high over the roof a second after it's away. So the match is only held that
// long, and the zoom out and the pan up to the sky aren't slowed, to be there in time
await put(5, by(rocket, 2.3, -8), 1400 / slow)
await zoom(-1, 300)
const sky = 240
await scroll(0, -sky)
await page.waitForTimeout(600)
await shot("rocket")
await wait(2500)
// Back down to the porch, left zoomed out for the kandils
await scroll(0, sky)
await wait(1000)

step("Kandils, hung from the porch roof either side of the door")
await tap({x: 52, y: rail.kandil})
const kandils = [{x: 570, y: 525}, {x: 710, y: 525}]
for (const kandil of kandils) {
  await put(0, kandil, 600)
  await wait(1500)
}
// Red paper, green tails and the bulb onto each
for (const [kandil, paper, tails] of kandils.map(kandil => [kandil, 1, 5])) {
  await put(paper, by(kandil, 0, 17), 600)
  await wait(600)
  await put(tails, by(kandil, 0, 23), 600)
  await wait(600)
  await put(9, by(kandil, 0, 17), 600)
  await wait(1200)
}
await shot("kandils")

step("Fairy lights, mixed, across the front of each wing")
await tap({x: 52, y: rail.decorate})
await tap(slot(6))
const line = (from, to) => Array.from({length: 5}, (_, i) => ({x: from.x + (to.x - from.x) * i / 4, y: from.y}))
await draw(line({x: 250, y: 472}, {x: 470, y: 472}))
await wait(1500)
await draw(line({x: 810, y: 472}, {x: 1030, y: 472}))
await wait(2500)
await shot("fairy-lights")

step("Rangoli, zoomed right in, in front of the door")
await zoom(4)
await lookAt(640, 650)
await tap({x: 52, y: rail.rangoli})
const ring = (x, y, radius) => Array.from({length: 37}, (_, i) => ({
  x: x + radius * Math.cos(i / 36 * 2 * Math.PI),
  y: y + radius * 0.5 * Math.sin(i / 36 * 2 * Math.PI),
}))
for (const [colour, radius] of [[0, 22], [3, 14], [6, 7]]) {
  await tap(slot(colour))
  await draw(ring(640, 646, radius))
}
await wait(1500)
await shot("rangoli")

step("The whole scene, with the bar hidden")
await page.keyboard.press("h")
await wait(600)
for (let i = 0; i < 6; i++) {
  await tap(zoomOut)
}
await wait(5000)
await shot("city")
await zoom(2)
step("Panning")
// Across the ground in front of the porch, where there's nothing to pick up
await swipe({x: 650, y: 340}, {x: 450, y: 320}, 300)
await wait(1500)
await page.keyboard.press("h")
await wait(600)

step("Volume, by pressing and holding the speaker")
await touch("touchStart", speaker)
await wait(1500)
await touch("touchEnd")
await wait(2000)
await shot("volume")
await tap({x: screen.width / 2, y: 40})
step("Photo")
await tap(camera)
await wait(3000)

if (!headless) {
  step("Done: play on, and close the window to finish")
  await new Promise(resolve => {
    page.on("close", resolve)
    browser.on("disconnected", resolve)
  })
}
// Whatever went wrong, while it played or while it was played on
if (errors.length) {
  console.error("The game logged errors:\n" + errors.join("\n"))
  process.exitCode = 1
}
await browser.close()
await server.close()
