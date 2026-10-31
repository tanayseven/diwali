// Renders the Android app's icon and splash sources in assets/ from the site's diya
// (public/favicon.svg), in Chromium so its gradients and glow come out as in a browser.
// Then `npx capacitor-assets generate --android` makes every size of them, which also
// reformats android/app/src/main/AndroidManifest.xml; put that back with git afterwards
import {readFileSync} from "node:fs"
import {chromium} from "playwright-core"

const root = new URL("../../", import.meta.url).pathname
// Framed wider than the favicon, centred on the diya rather than its flame, and so its
// glow fades out before the edge instead of being cut off by the favicon's own frame
const svg = readFileSync(`${root}public/favicon.svg`, "utf8")
  .replace(/viewBox="[^"]*" width="[^"]*" height="[^"]*"/, `viewBox="-40 -23 460 460" width="460" height="460"`)
// The night the app opens on
const background = "#000000"

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {})
// A square of this size with the diya over this share of it
const render = async (name, size, share, fill) => {
  const page = await browser.newPage({viewport: {width: size, height: size}})
  const diya = Math.round(size * share)
  await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${fill}">${svg}</body>`)
  // Its flame flickers and its glow pulses, so it's stopped at the start, at rest,
  // to come out the same every time
  await page.evaluate(diya => {
    const drawing = document.querySelector("svg")
    drawing.style.width = drawing.style.height = `${diya}px`
    drawing.pauseAnimations()
    drawing.setCurrentTime(0)
  }, diya)
  await page.screenshot({path: `${root}assets/${name}`, omitBackground: fill === "transparent"})
  await page.close()
}
// For Android before 8, which shows it as it is
await render("icon-only.png", 1024, 1.05, background)
// The generator draws the foreground in the 72dp an adaptive icon shows, whose middle
// 92% (the 66dp safe zone) is all every launcher's mask keeps, so the diya stays inside it
await render("icon-foreground.png", 1024, 1.2, "transparent")
await render("icon-background.png", 1024, 0, background)
await render("splash.png", 2732, 0.36, background)
await render("splash-dark.png", 2732, 0.36, background)
await browser.close()
