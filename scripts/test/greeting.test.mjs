// Records a video greeting in headless Chromium as a phone held sideways, with
// Chromium's stand-in camera and microphone, and checks that it can't be recorded until
// both names are in, that the camera's drawn in its frame, that it can't be stopped
// before 10 seconds, that it's played back once it's stopped, and that Send hands over
// a video, downloaded here as the browser can't share files, and that Back goes back to
// the menu.
//
//   npm run test:e2e
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {after, before, test} from "node:test"
import {fileURLToPath} from "node:url"
import {chromium, devices} from "playwright-core"
import {createServer} from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const port = 4177
const screen = {width: 844, height: 390}
const phone = {...devices["Pixel 7 landscape"], viewport: screen, screen, acceptDownloads: true}
const muted = {volume: 0.5, muted: true}
const menuName = "How will you celebrate?"

let server
let browser
let page

before(async () => {
  server = await createServer({root, server: {port, strictPort: true}, logLevel: "error"})
  await server.listen()
  browser = await chromium.launch({
    headless: !process.env.HEADFUL,
    // A stand-in camera and microphone, allowed without asking
    args: ["--mute-audio", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    ...process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {},
  })
  const context = await browser.newContext(phone)
  await context.grantPermissions(["camera", "microphone"], {origin: `http://localhost:${port}`})
  await context.addInitScript(settings => {
    localStorage.setItem("diwali-audio", JSON.stringify(settings))
    // Saved rather than shared, the same wherever the tests run, as sharing opens a
    // share sheet where the browser has one
    delete Navigator.prototype.share
    delete Navigator.prototype.canShare
  }, muted)
  page = await context.newPage()
  page.on("pageerror", error => console.error("Page error:", error.message))
  await page.goto(`http://localhost:${port}/?guests=off`)
  await page.getByRole("button", {name: "English"}).tap()
  for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
    await page.getByText(text).waitFor({timeout: 60000})
    await page.waitForTimeout(900)
    await page.touchscreen.tap(screen.width / 2, screen.height / 2)
  }
})

after(async () => {
  await browser?.close()
  await server?.close()
})

const openMenu = async () => {
  const menu = page.getByRole("dialog", {name: menuName})
  await menu.waitFor({timeout: 10000})
  await page.waitForFunction(name => getComputedStyle(document.querySelector(`[aria-label='${name}']`)).opacity === "1", menuName)
  return menu
}

test("a video greeting is recorded for 10 to 20 seconds, played back and sent", {timeout: 120000}, async () => {
  const menu = await openMenu()
  await menu.getByRole("button", {name: "Greeting"}).tap()
  const greeting = page.getByRole("dialog", {name: "Send a Diwali greeting"})
  await greeting.waitFor({timeout: 10000})
  const record = greeting.getByRole("button", {name: "Record", exact: true})
  assert.ok(await record.isDisabled(), "Record can't be pressed without the names")
  await greeting.getByLabel("Your name").fill("Tanay")
  assert.ok(await record.isDisabled(), "Record can't be pressed without who it's for")
  await greeting.getByLabel("Who it's for").fill("Asha")
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some(b => b.textContent === "Record" && !b.disabled), null, {timeout: 15000})

  // The stand-in camera's picture, drawn in the frame, not just the dark background
  const middle = await page.evaluate(() => {
    const canvas = document.querySelector("[role=dialog] canvas")
    const [r, g, b] = canvas.getContext("2d").getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data
    return {r, g, b}
  })
  assert.notDeepEqual(middle, {r: 0x1a, g: 0x14, b: 0x48}, "the camera's drawn in the frame")

  await record.tap()
  const stop = greeting.getByRole("button", {name: "Stop"})
  await stop.waitFor()
  await page.waitForTimeout(3000)
  assert.ok(await stop.isDisabled(), "it can't be stopped before 10 seconds")
  assert.ok(await greeting.getByLabel("Your name").isDisabled(), "the names can't be changed while it's recorded")
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some(b => b.textContent === "Stop" && !b.disabled), null, {timeout: 12000})
  await stop.tap()

  const send = greeting.getByRole("button", {name: "Send"})
  await send.waitFor({timeout: 10000})
  await greeting.getByRole("button", {name: "Record again"}).waitFor()
  assert.ok(await page.evaluate(() => document.querySelector("[role=dialog] video[controls]").src.startsWith("blob:")), "it's played back")

  const [download] = await Promise.all([page.waitForEvent("download"), send.tap()])
  assert.match(download.suggestedFilename(), /^diwali-greeting\.(mp4|webm)$/)
  const video = readFileSync(await download.path())
  // About ten seconds of video, not an empty file
  assert.ok(video.length > 50_000, `the video's ${video.length} bytes`)

  await greeting.getByRole("button", {name: "Back"}).tap()
  await greeting.waitFor({state: "hidden", timeout: 5000})
  await openMenu()
})
