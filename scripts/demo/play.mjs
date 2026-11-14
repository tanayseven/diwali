// Plays through the whole game in a Chromium window, as a phone held sideways (a Pixel
// 7, with touch), so the hand drawn holding whatever's dragged shows: diyas filled and
// lit with the matchstick, every firework lit, kandils made on the house and the porch,
// fairy lights hung, a rangoli drawn, then the city zoomed out to, the volume slider
// and a photo. The window's left open at the end to play on, until it's closed.
//
//   npm run demo [-- out-dir]
//
// SLOW stretches every wait and drag (2 by default, 1 is as fast as it goes),
// HEADLESS=1 plays it without a window, and an out-dir saves a screenshot of each step.
// It exits with an error if the game logged any. It starts the dev server itself, and
// needs Playwright's Chromium (npx playwright-core install chromium), or another one in
// PLAYWRIGHT_CHROMIUM.
//
// The positions below are where the rail's buttons, the bar's slots and the porch are on
// that screen, in CSS pixels, as in scripts/store/screenshots.mjs, so a change to the
// layout needs them moved too
import {mkdirSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {chromium, devices} from "playwright-core"
import {createServer} from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const out = process.argv[2]
const headless = process.env.HEADLESS === "1"
const slow = Number(process.env.SLOW ?? 2)
const port = 4176

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
// Drags what's in a bar's slot so it's shown, and put down, at a point in the scene
const put = (index, at, hold) => swipe(slot(index), {x: at.x + lift, y: at.y + lift}, hold)
// A quick swipe, not slowed
const flick = async (from, to) => {
  await touch("touchStart", from)
  for (let i = 1; i <= 8; i++) {
    await touch("touchMove", {x: from.x + (to.x - from.x) * i / 8, y: from.y + (to.y - from.y) * i / 8})
    await page.waitForTimeout(16)
  }
  await touch("touchEnd")
}
// A finger drawn along a line of points
const draw = async points => {
  await touch("touchStart", points[0])
  for (const point of points.slice(1)) {
    await touch("touchMove", point)
    await page.waitForTimeout(25 * slow)
  }
  await touch("touchEnd")
  await wait(200)
}
const zoom = async (key, times) => {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key)
    await wait(150)
  }
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

// The porch moved up, so what's put on it is put down with the finger still above the bar
step("Panning the porch up")
await tap({x: 52, y: rail.diyas})
await swipe({x: 450, y: 200}, {x: 450, y: 130}, 200)
await wait(600)

step("Diyas, with a wick and oil")
const diyas = [{x: 600, y: 160}, {x: 690, y: 160}]
for (const diya of diyas) {
  await put(0, diya, 500)
  await put(1, {x: diya.x, y: diya.y - 8}, 500)
  await put(2, {x: diya.x, y: diya.y - 10}, 800)
  await wait(1500)
}
await shot("diyas")
step("Lighting them with the matchstick")
for (const diya of diyas) {
  await put(3, {x: diya.x + 8, y: diya.y - 14}, 1800)
}
await wait(800)
await shot("diyas-lit")
step("Turning one")
await tap({x: diyas[1].x, y: diyas[1].y - 4})
await wait(800)

step("Fireworks")
await tap({x: 52, y: rail.fireworks})
const fireworks = [{x: 220, y: 175}, {x: 310, y: 180}, {x: 400, y: 180}, {x: 480, y: 175}, {x: 540, y: 170}]
for (const [index, at] of fireworks.entries()) {
  await put(index, at, 500)
}
await wait(500)
step("What to do next")
await page.locator('button:text-is("?"):visible').first().tap()
await wait(2500)
await shot("hint")
await tap({x: 450, y: 60})
const [anar, laddi, chakri, sutli, rocket] = fireworks
const light = at => put(5, {x: at.x + 4, y: at.y - 14}, 1800)
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
await put(5, {x: rocket.x + 4, y: rocket.y - 14}, 1400 / slow)
for (let i = 0; i < 2; i++) {
  await page.keyboard.press("-")
}
// Once the zoom's settled, as a swipe pans less the further in it is, so the swipe back
// down cancels it exactly
await page.waitForTimeout(300)
const sky = {from: {x: 600, y: 60}, to: {x: 600, y: 300}}
await flick(sky.from, sky.to)
await page.waitForTimeout(600)
await shot("rocket")
await wait(2500)
// Back down to the porch, and in again to where it was
await flick(sky.to, sky.from)
await zoom("+", 2)
await wait(1500)

step("Kandils, one hung from the house and one on the porch")
await tap({x: 52, y: rail.kandil})
const hung = {x: 280, y: 50}
const standing = {x: 160, y: 140}
await put(0, hung, 600)
await wait(2000)
await put(0, standing, 600)
await wait(1000)
// Paper, tails and the bulb onto each
for (const [kandil, paper, tails] of [[hung, 1, 5], [standing, 4, 8]]) {
  await put(paper, {x: kandil.x, y: kandil.y + 30}, 600)
  await wait(600)
  await put(tails, {x: kandil.x, y: kandil.y + 40}, 600)
  await wait(600)
  await put(9, {x: kandil.x, y: kandil.y + 30}, 600)
  await wait(1200)
}
await shot("kandils")

step("Fairy lights, red and mixed")
await tap({x: 52, y: rail.decorate})
await tap(slot(0))
await swipe({x: 380, y: 30}, {x: 520, y: 40}, 300)
await wait(1500)
await tap(slot(6))
await swipe({x: 540, y: 40}, {x: 760, y: 30}, 300)
await wait(2500)
await shot("fairy-lights")

step("Rangoli")
await tap({x: 52, y: rail.rangoli})
const ring = (x, y, radius) => Array.from({length: 37}, (_, i) => ({
  x: x + radius * Math.cos(i / 36 * 2 * Math.PI),
  y: y + radius * 0.5 * Math.sin(i / 36 * 2 * Math.PI),
}))
for (const [colour, radius] of [[0, 45], [3, 30], [6, 15]]) {
  await tap(slot(colour))
  await draw(ring(460, 225, radius))
}
await wait(1500)
await shot("rangoli")

step("The whole scene, with the bar hidden")
await page.keyboard.press("h")
await wait(600)
for (let i = 0; i < 3; i++) {
  await tap(zoomOut)
}
await wait(5000)
await shot("city")
await zoom("+", 2)
await wait(1500)
step("Panning")
await swipe({x: 600, y: 120}, {x: 420, y: 180}, 300)
await wait(1500)
await page.keyboard.press("h")
await wait(600)

step("Volume, by pressing and holding the speaker")
await touch("touchStart", speaker)
await wait(1500)
await touch("touchEnd")
await wait(2000)
await shot("volume")
await tap({x: 450, y: 60})
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
