// Makes the drawings of the pots of plants and trees standing on Deepa Niwas's porch,
// from public/sprites/house.svg, for the game to draw over the porch floor's rangoli,
// which is otherwise drawn over the whole house, pots and all, so a pot standing on a
// rangoli hides it rather than the other way round. Each clump of them (a pot, a tree in
// its pot, the plants by the steps) is a drawing of its own, cropped close round it,
// as one drawing the size of the house would take as much memory again as the house:
// public/sprites/house-pots/<n>.svg, with where each is in house.svg's units in
// src/housePots.json.
//
//   node scripts/art/house-pots.mjs
//
// It's measured in headless Chromium, as working out where an SVG's shapes reach needs
// a browser. The house's drawing is a list of groups, each a part of it, in the order
// they're drawn. The porch's pots and plants run from the first pot (bnTZo, by the steps
// left of the door) up to the door's frame (fQ2yz), which is drawn after them; change
// these if the drawing's parts are moved about
import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {chromium} from "playwright-core"

const root = new URL("../../", import.meta.url).pathname
const from = `${root}public/sprites/house.svg`
const out = `${root}public/sprites/house-pots`
const listed = `${root}src/housePots.json`
const first = "bnTZo"
const after = "fQ2yz"
// Room left round each clump, in house.svg's units, so its edges aren't cut off
const margin = 2

const lines = readFileSync(from, "utf8").split("\n")
// Each of the drawing's parts starts on a line of its own, indented by two spaces
const starts = lines.flatMap((line, idx) => /^ {2}<[a-z]/.test(line) ? [idx] : [])
const startOf = id => {
  const idx = starts.find(start => lines[start].includes(`id="${id}"`))
  if (idx === undefined) {
    throw new Error(`No part with id ${id} in ${from}`)
  }
  return idx
}
// Each part's lines, in the order they're drawn
const potStarts = starts.filter(start => start >= startOf(first) && start < startOf(after))
const parts = potStarts.map((start, idx) => lines.slice(start, potStarts[idx + 1] ?? startOf(after)).join("\n"))
const pots = parts.join("\n")
const [open] = lines
const svgOf = (box, members) => `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">
  <title>Deepa Niwas — a pot on its porch, made from house.svg by scripts/art/house-pots.mjs</title>
${members.map(idx => parts[idx]).join("\n")}
</svg>
`

// Where each part reaches, in house.svg's units
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {})
const page = await browser.newPage()
await page.setContent(`<body style="margin:0">${open}\n${pots}\n</svg></body>`)
const boxes = await page.evaluate(() => {
  const svg = document.querySelector("svg")
  const toSvg = svg.getScreenCTM().inverse()
  return [...svg.children].map(part => {
    const box = part.getBoundingClientRect()
    const topLeft = new DOMPoint(box.left, box.top).matrixTransform(toSvg)
    const bottomRight = new DOMPoint(box.right, box.bottom).matrixTransform(toSvg)
    return {left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y}
  })
})
await browser.close()

// Parts that touch or overlap are one clump, cropped round them all
const touching = (a, b) => a.left <= b.right + margin * 2 && b.left <= a.right + margin * 2
  && a.top <= b.bottom + margin * 2 && b.top <= a.bottom + margin * 2
const clumps = []
for (const [idx, box] of boxes.entries()) {
  let merged = {...box, members: [idx]}
  for (let idx = clumps.length - 1; idx >= 0; idx--) {
    if (touching(clumps[idx], merged)) {
      const [clump] = clumps.splice(idx, 1)
      merged = {
        left: Math.min(clump.left, merged.left), top: Math.min(clump.top, merged.top),
        right: Math.max(clump.right, merged.right), bottom: Math.max(clump.bottom, merged.bottom),
        members: [...clump.members, ...merged.members],
      }
      idx = clumps.length
    }
  }
  clumps.push(merged)
}
clumps.sort((a, b) => a.left - b.left)

rmSync(out, {recursive: true, force: true})
mkdirSync(out, {recursive: true})
const drawings = clumps.map((clump, idx) => {
  const x = Math.floor(clump.left - margin)
  const y = Math.floor(clump.top - margin)
  const box = {x, y, width: Math.ceil(clump.right + margin) - x, height: Math.ceil(clump.bottom + margin) - y}
  const url = `sprites/house-pots/${idx + 1}.svg`
  // Its parts in the order they're drawn in the house
  writeFileSync(`${root}public/${url}`, svgOf(box, clump.members.sort((a, b) => a - b)))
  return {url, ...box}
})
writeFileSync(listed, `${JSON.stringify(drawings, null, "\t")}\n`)
console.log(`Wrote ${drawings.length} drawings to ${out}, listed in ${listed}`)
