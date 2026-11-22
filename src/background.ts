import {Application, Assets, Container, FederatedPointerEvent, FillGradient, Graphics, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import {pixelDensity, quality} from "./app"
import {stereoPan} from "./audioControl"
import {hudFrame} from "./hud"
import housePots from "./housePots.json"
import {neighbours, neighboursLeft} from "./street"
import type {HouseName} from "./street"

// The night sky, with its moon and stars, and the hills and ground in front of it. A
// city's skyline stands between them, its foot hidden behind the hills
const skyUrl = "sprites/backgrounds/night-sky.svg"
const hillsUrl = "sprites/backgrounds/night-hills.svg"
const houseUrl = "sprites/house.svg"
// The pots of plants and trees standing on its porch, each cropped from the house's
// drawing, by where it is in the drawing's units, made by scripts/art/house-pots.mjs.
// They're drawn again over the porch floor's rangoli, so a pot stands on it rather
// than under it
const housePotUrls = housePots.map(({url}) => url)
// The scene is 1280 x 720, around the main house, and everything's placed in those
// same units. The street carries on either side of it, with a house after another
// along it, and the sky and the hills carry on 400 past the last of them, so the
// camera can pan along the whole street. It still zooms out only as far as the scene
const sceneWidth = 1280
const sceneHeight = 720
// Where the sky and the hills' drawings start: they're drawn 2080 across, from 400
// left of the scene to 400 right of it, and the hills are repeated along the street,
// mirrored every other time so they join up
// The skyline in two layers, far behind near, each drawn 2560 x 420. It's shown a
// little smaller, centred, standing on y 530
const skylineUrls = {far: "sprites/backgrounds/skyline-far.svg", near: "sprites/backgrounds/skyline-near.svg"}
const skylineSize = {width: 2560, height: 420}
const skylineScale = 0.95
const skylineFoot = 530
const skylineLeft = sceneWidth / 2 - skylineSize.width * skylineScale / 2
const skylineTop = skylineFoot - skylineSize.height * skylineScale
// The skyline's layers are further away than the house, so as the camera pans across,
// they slide past more slowly: on screen the far one moves this share as much as the
// house does, and the near one this much. Only across, as moving up and down would
// lift them off the horizon behind the hills. Little enough that, panned all the way
// along the street, the city still fills the sky
const skylineDepth = {far: 0.1, near: 0.18}
// The moon and stars are furthest of all, so they barely slide as the camera pans.
// The sky is as wide as the scenery and slides by less than the view does, so it
// still covers the screen wherever the camera goes
const skyDepth = 0.08
// The bar and the credit along the bottom of the screen cover the scene behind them,
// so the camera can go further down than the scene, to bring its bottom up above the
// bar. Below the scene, the ground carries on this far, and the view clears the bar by
// a little
const groundBelow = 400
const barClearance = 8
const drawnLeft = -400
const drawnWidth = 2080

// The house stands with its bottom edge on the ground band, which starts at y 600
const houseHeight = 470
const houseBottom = 680
// house.svg's own size and where its viewBox starts, which it's scaled from to stand
// houseHeight tall, centred on the scene. Its wings stretch it wide, so it's drawn a
// little smaller than its middle would be on its own, to keep the door diya-sized
const houseSvg = {x: 130, y: 85, width: 1538, height: 766}
const houseScale = houseHeight / houseSvg.height
const houseLeft = sceneWidth / 2 - houseSvg.width * houseScale / 2
const houseTop = houseBottom - houseHeight

// Where a point of house.svg lands in the scene
const fromHouseSvg = (x: number, y: number): PointData => ({
  x: houseLeft + (x - houseSvg.x) * houseScale,
  y: houseTop + (y - houseSvg.y) * houseScale,
})

// The porch's tiled floor, from the first shape after the backfills in house.svg: its
// back edge runs along the foot of the walls and its front edge flares out to the steps
const porchFloor: PointData[] = [
  fromHouseSvg(249.357, 681.086),
  fromHouseSvg(1508.623, 681.086),
  fromHouseSvg(1666.374, 817.301),
  fromHouseSvg(131.386, 815.426),
]

// The open front door, from its top to the step at its foot, where the guests come and
// go, and the pots of plants standing on the porch, by the middle of their feet
const doorway = {topLeft: fromHouseSvg(860, 475), bottomRight: fromHouseSvg(942, 660)}
const porchPots = [
  fromHouseSvg(215, 800), fromHouseSvg(670, 710), fromHouseSvg(750, 685), fromHouseSvg(1080, 685),
  fromHouseSvg(1320, 685), fromHouseSvg(1358, 730), fromHouseSvg(1522, 820), fromHouseSvg(1604, 800),
]

// The bottom edges of the roofs' eaves, which things can hang from: the upper storey's,
// the porch roof's and the two wings', each from its left end to its right
const eaves: [PointData, PointData][] = [
  [fromHouseSvg(629, 220), fromHouseSvg(1194, 220)],
  [fromHouseSvg(610, 442), fromHouseSvg(1210, 442)],
  [fromHouseSvg(205, 487), fromHouseSvg(655, 487)],
  [fromHouseSvg(1143, 487), fromHouseSvg(1593, 487)],
]

type View = {x: number, y: number, width: number, height: number}

// The other houses along the street, either side of the main one with a gap between
// each, standing on the ground as it does, in the order they stand in
const houseGap = 50
const mainLeft = houseLeft
const mainRight = houseLeft + houseSvg.width * houseScale
const neighbourLefts = (() => {
  const lefts: number[] = []
  let x = mainLeft
  for (let idx = neighboursLeft - 1; idx >= 0; idx--) {
    x -= houseGap + neighbours[idx].size.width
    lefts[idx] = x
  }
  x = mainRight
  for (let idx = neighboursLeft; idx < neighbours.length; idx++) {
    lefts[idx] = x + houseGap
    x = lefts[idx] + neighbours[idx].size.width
  }
  return lefts
})()

// Every house on the street, in scene units: its name, where its drawing is and how
// big, its porch floor, front door, eaves and pots
type House = {
  name: HouseName
  url: string
  left: number
  top: number
  width: number
  height: number
  scale: number
  porch: PointData[]
  door: {left: number, right: number, top: number, bottom: number}
  eaves: [PointData, PointData][]
  pots: PointData[]
}

const houses: House[] = (() => {
  const others = neighbours.map((drawing, idx): House => {
    const left = neighbourLefts[idx]
    const top = houseBottom - drawing.size.height
    const at = (point: PointData) => ({x: left + point.x, y: top + point.y})
    return {
      name: drawing.name, url: drawing.url, left, top, width: drawing.size.width, height: drawing.size.height, scale: 1,
      porch: drawing.porch.map(at),
      door: {
        left: left + drawing.door.left, right: left + drawing.door.right,
        top: top + drawing.door.top, bottom: top + drawing.door.bottom,
      },
      eaves: drawing.eaves.map(([from, to]) => [at(from), at(to)]),
      pots: drawing.pots.map(at),
    }
  })
  const main: House = {
    name: "deepaNiwas", url: houseUrl, left: houseLeft, top: houseTop, width: mainRight - mainLeft, height: houseHeight,
    scale: houseScale, porch: porchFloor,
    door: {left: doorway.topLeft.x, right: doorway.bottomRight.x, top: doorway.topLeft.y, bottom: doorway.bottomRight.y},
    eaves, pots: porchPots,
  }
  return [...others.slice(0, neighboursLeft), main, ...others.slice(neighboursLeft)]
})()

// The scenery, from 400 left of the first house to 400 right of the last
const scenery = {
  left: Math.min(drawnLeft, houses[0].left - 400),
  right: Math.max(drawnLeft + drawnWidth, houses[houses.length - 1].left + houses[houses.length - 1].width + 400),
}

// What the camera frames to begin with: zoomed all the way out on the main house, as
// low as it goes, so its porch and the road in front of it are just clear of the bar
// along the bottom, with the sky above
const wholeView: View = {x: 0, y: sceneHeight / 2, width: sceneWidth, height: sceneHeight}
// Or opened with ?start=porch, as the tests are, the house close up from its porch
// floor, kept clear of the bar along the bottom, up to the eaves, as it used to start
const porchView: View = {x: 395, y: 470, width: 490, height: 220}
const startView = new URLSearchParams(window.location.search).get("start") === "porch" ? porchView : wholeView
// The closest the camera gets: about a diya's width and a half across the screen's
// shorter side on a phone, or a few diyas on a desktop
const closestView = {width: 180, height: 80}
// How much each press of a zoom button or key zooms by, and how long it takes
const zoomStep = 1.5
const zoomDuration = 200
// Following something on the move, like a rocket the player's lit: the camera eases
// towards it by this share a second, never letting it get further from the middle of the
// screen than this share of the way to its edge, and only ever climbing after it, never
// dropping. Once it's gone, the camera stays where it was last seen for a while, to see
// it burst, then eases back to where it was, over this long, in ms
// A shake, as from a sutli bomb bursting: the view jolts about by up to this far, on
// screen, in pixels, at a strength of 1, settling over this long, in ms, shuddering
// this many times a second
const shakePixels = 9
const shakeFor = 550
const shakeRate = 26
const followEase = 5
const followKeep = 0.45
const followHold = 1.8
const followReturn = 1100
// The street, shown three houses at a time, slid along a house at a time: as wide as the
// widest three, with this much either side, down to just below the road, easing out to it
// and back over this long, in ms. The sky's drawn on up above the scene this far, and in
// its colours either side, with stars scattered over it, this many
const streetMargin = 60
const streetBottom = 800
const streetGlide = 900
const skyAbove = 4000
const skyColours = {top: 0x0e1638, bottom: 0x2e3f78}
const streetShows = 3
const starsBeyond = 260
// A press on the street shown whole that moves less than this, on screen, is a tap on
// whichever house it's on
const streetTapSlop = 10

const coverScale = (width: number, height: number) => Math.max(width / sceneWidth, height / sceneHeight)
const fitScale = (view: {width: number, height: number}, width: number, height: number) =>
  Math.max(coverScale(width, height), Math.min(width / view.width, height / view.height))

// Every asset the background needs, to be loaded before it's created
const backgroundAssets = [skyUrl, hillsUrl, ...Object.values(skylineUrls), ...houses.map(({url}) => url), ...housePotUrls]

// The SVGs are rasterised once at load, so draw them at the size they'll be shown
// on this screen to keep them sharp. The house is drawn for the closest zoom; the
// sky, the hills and the skyline are capped to stay within texture limits, as little
// of them shows up close. All are kept within quality.maxTextureWidth across
const addBackgroundAssets = () => {
  const {width, height} = window.screen
  const density = pixelDensity
  const skyResolution = Math.min(3, Math.ceil(density * coverScale(width, height)))
  const houseZoom = fitScale(closestView, width, height) * houseScale
  const widest = quality.maxTextureWidth
  const houseResolution = Math.min(4, Math.ceil(density * houseZoom), widest / houseSvg.width)
  const sceneryResolution = Math.min(skyResolution, widest / drawnWidth)
  Assets.add({alias: skyUrl, src: skyUrl, data: {resolution: sceneryResolution}})
  Assets.add({alias: hillsUrl, src: hillsUrl, data: {resolution: sceneryResolution}})
  const skylineResolution = Math.min(skyResolution * skylineScale, widest / skylineSize.width)
  Object.values(skylineUrls).forEach(url => Assets.add({alias: url, src: url, data: {resolution: skylineResolution}}))
  Assets.add({alias: houseUrl, src: houseUrl, data: {resolution: houseResolution}})
  housePotUrls.forEach(url => Assets.add({alias: url, src: url, data: {resolution: houseResolution}}))
  // The other houses are drawn in scene units, so to be as sharp as the main house is,
  // which is drawn smaller, they're drawn at as many pixels a scene unit as it is,
  // and no more, as each takes a good deal of memory on a phone
  const mainPerUnit = houseResolution * houseScale
  neighbours.forEach(({url, size}) => {
    const resolution = Math.min(4, mainPerUnit, widest / size.width)
    Assets.add({alias: url, src: url, data: {resolution}})
  })
}

const easeOut = (t: number) => 1 - (1 - t) ** 3

// Whether a point is inside a polygon, by counting the edges a ray from it crosses
const isInside = (point: PointData, polygon: PointData[]) => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

// A press on the scenery, given where it fell in the scene. Returning true claims it,
// e.g. to draw, so it doesn't pan the scene
type PressHandler = (at: PointData, e: FederatedPointerEvent) => boolean

// The night sky with the house in it, under a camera that can be panned by dragging
// the scenery or scrolling, and zoomed with zoomBy, a trackpad pinch (or Ctrl and the
// wheel) or a two-finger pinch on touch screens, between seeing the whole scene and a
// close-up of the porch. Expects backgroundAssets to have been loaded already
const createBackground = (app: Application) => {
  const container = new Container()
  const scene = new Container()
  const sky = new Sprite(Assets.get<Texture>(skyUrl))
  sky.x = drawnLeft
  // Behind it, its colours carried on along the whole street and up above the scene,
  // only seen when the whole street's shown
  const skyBeyond = new Graphics()
    .rect(scenery.left, -skyAbove, scenery.right - scenery.left, skyAbove)
    .fill(skyColours.top)
    .rect(scenery.left, 0, scenery.right - scenery.left, sceneHeight)
    .fill(new FillGradient({
      type: "linear", start: {x: 0, y: 0}, end: {x: 0, y: 1},
      colorStops: [{offset: 0, color: skyColours.top}, {offset: 1, color: skyColours.bottom}],
    }))
  for (let k = 0; k < starsBeyond; k++) {
    // Thinning out lower down, where the city's glow would hide them
    const x = scenery.left + Math.random() * (scenery.right - scenery.left)
    const y = -700 + Math.random() ** 1.6 * 1100
    skyBeyond.circle(x, y, Math.random() < 0.8 ? 1.5 : 2.5).fill({color: Math.random() < 0.6 ? 0xffffff : 0xfff2b0, alpha: 0.5 + Math.random() * 0.5})
  }
  scene.addChild(skyBeyond, sky)
  // The skyline's two layers. The near one has whatever changes in it drawn over it too,
  // like its windows going dark
  const skylineLayers = {far: new Container(), near: new Container()}
  ;(["far", "near"] as const).forEach(layer => {
    skylineLayers[layer].position.set(skylineLeft, skylineTop)
    skylineLayers[layer].scale.set(skylineScale)
    skylineLayers[layer].addChild(new Sprite(Assets.get<Texture>(skylineUrls[layer])))
    // And mirrored either side, so it carries on along the street when it's shown wider
    ;[0, skylineSize.width * 2].forEach(x => {
      const beyond = new Sprite(Assets.get<Texture>(skylineUrls[layer]))
      beyond.x = x
      beyond.scale.x = -1
      skylineLayers[layer].addChildAt(beyond, 0)
    })
    scene.addChild(skylineLayers[layer])
  })
  // The hills, along the whole street: repeated, every other one mirrored, so each
  // joins the next. And the ground below the scene, behind the bar: the hills' bottom
  // row, drawn on down
  const hillsTexture = Assets.get<Texture>(hillsUrl)
  const groundTexture = new Texture({
    source: hillsTexture.source, frame: new Rectangle(0, sceneHeight - 1, hillsTexture.width, 1),
  })
  const firstTile = Math.floor((scenery.left - drawnLeft) / drawnWidth)
  const lastTile = Math.ceil((scenery.right - drawnLeft) / drawnWidth) - 1
  for (let tile = firstTile; tile <= lastTile; tile++) {
    const mirrored = tile % 2 !== 0
    const x = drawnLeft + tile * drawnWidth + (mirrored ? drawnWidth : 0)
    const hills = new Sprite(hillsTexture)
    hills.x = x
    hills.scale.x = mirrored ? -1 : 1
    const ground = new Sprite(groundTexture)
    ground.position.set(x, sceneHeight)
    ground.scale.set(mirrored ? -1 : 1, groundBelow)
    scene.addChild(hills, ground)
  }
  // Each house along the street, standing on the ground
  const houseSprites = houses.map(({url, left, top, scale}) => {
    const sprite = new Sprite(Assets.get<Texture>(url))
    sprite.position.set(left, top)
    sprite.scale.set(scale)
    scene.addChild(sprite)
    return sprite
  })
  const house = houseSprites[houses.findIndex(({url}) => url === houseUrl)]
  // Things placed in the scene, like diyas, so they move with the camera
  const decorations = new Container()
  scene.addChild(decorations)
  // Its pots again, over the rangoli drawn on the porch floor (src/rangoli.ts, at 1) and
  // under everything put on the porch, which is drawn by how far forward it is
  housePots.forEach(({url, x, y}) => {
    const pot = new Sprite(Assets.get<Texture>(url))
    pot.position.copyFrom(fromHouseSvg(x, y))
    pot.scale.set(houseScale)
    pot.zIndex = 1.5
    pot.eventMode = "none"
    decorations.addChild(pot)
  })
  // Catches presses on the scenery for panning. It's underneath the scene, so anything
  // placed in it (like diyas) is pressed first
  const panSurface = new Container()
  panSurface.hitArea = app.screen
  panSurface.cursor = "grab"
  panSurface.eventMode = "static"
  container.addChild(panSurface, scene)

  // The house's outline as a mask, one byte per scene unit, so things can be hung on it
  // and not on the sky around it. The hills' outline too, for what they hide
  // Extracting leaves out the target's own transform, so the scaled copy is put in a
  // container for its scale to count
  const maskOf = (texture: Texture, scale: number) => {
    const holder = new Container()
    const copy = new Sprite(texture)
    copy.scale.set(scale)
    holder.addChild(copy)
    const {pixels, width, height} = app.renderer.extract.pixels({target: holder, resolution: 1})
    holder.destroy({children: true})
    return {pixels, width, height}
  }
  const houseMasks = houseSprites.map((sprite, idx) => maskOf(sprite.texture, houses[idx].scale))
  const hillsMask = maskOf(hillsTexture, 1)
  const isOpaque = (mask: typeof hillsMask, x: number, y: number) =>
    x >= 0 && y >= 0 && x < mask.width && y < mask.height && mask.pixels[(y * mask.width + x) * 4 + 3] > 128
  // Whether a point of the scene is on a house's drawing, within a couple of units, as
  // the SVGs have hairline gaps between some of their shapes
  const onHouse = (idx: number, point: PointData, near = 2) => {
    const {left, top} = houses[idx]
    const x = Math.floor(point.x - left)
    const y = Math.floor(point.y - top)
    return [-near, 0, near].some(dy => [-near, 0, near].some(dx => isOpaque(houseMasks[idx], x + dx, y + dy)))
  }
  // And on the hills, repeated and mirrored along the street
  const onHills = (point: PointData) => {
    const along = point.x - drawnLeft
    const tile = Math.floor(along / drawnWidth)
    const within = along - tile * drawnWidth
    return isOpaque(hillsMask, Math.floor(tile % 2 !== 0 ? drawnWidth - within : within), Math.floor(point.y))
  }

  // The point in the scene at the middle of the screen, and how far in it's zoomed: 1
  // just covers the screen with the whole scene
  const centre = {x: startView.x + startView.width / 2, y: startView.y + startView.height / 2}
  let zoom = fitScale(startView, app.screen.width, app.screen.height) / coverScale(app.screen.width, app.screen.height)
  // A zoom eased in over a moment, about a point on screen, from a button or a key
  let zoomAnimation: {from: number, to: number, about: PointData, elapsed: number} | undefined
  let panFrom: Point | undefined
  let onPress: PressHandler | undefined
  // The player's house, by its place along the street: the only one they can decorate
  let home = houses.findIndex(({url}) => url === houseUrl)
  const middleOf = (idx: number) => houses[idx].left + houses[idx].width / 2
  // What the camera's following, where it was last seen, how long it's been gone, and
  // where the camera was before, to go back to, or once it's going back, from where
  let following: {
    target: () => PointData | undefined, last: PointData, gone: number, from: PointData,
    returning?: {start: PointData, elapsed: number},
  } | undefined

  // The whole street, while it's shown, or being eased out to or back from, with the view
  // before, to go back to
  let street: {before: {zoom: number, centre: PointData}} | undefined
  // A view being eased to, from where it was, and what to do once it's there
  let glide: {from: {zoom: number, centre: PointData}, to: {zoom: number, centre: PointData}, elapsed: number, then?: () => void} | undefined
  // The three houses from each along the street, as far as there are three
  const lastWindow = Math.max(0, houses.length - streetShows)
  const windowSides = (first: number) => {
    const last = houses[Math.min(houses.length - 1, first + streetShows - 1)]
    return {left: houses[first].left - streetMargin, right: last.left + last.width + streetMargin}
  }
  const widestWindow = Math.max(...houses.slice(0, lastWindow + 1).map((_, first) => {
    const {left, right} = windowSides(first)
    return right - left
  }))
  // The zoom that shows the widest three, the same for any three, so sliding along doesn't
  // zoom in and out
  const streetZoom = () => {
    const {width, height} = app.screen
    return width / widestWindow / coverScale(width, height)
  }
  // Which three are shown, by the first, the ones the middle of the view's nearest the
  // middle of
  const windowAt = (x: number) => {
    const idx = houses.reduce((best, house, k) =>
      Math.abs(house.left + house.width / 2 - x) < Math.abs(houses[best].left + houses[best].width / 2 - x) ? k : best, 0)
    return Math.min(lastWindow, Math.max(0, idx - 1))
  }
  // The view of three houses from one along the street
  const streetView = (first: number) => {
    const {width, height} = app.screen
    const scale = streetZoom() * coverScale(width, height)
    const {left, right} = windowSides(first)
    return {zoom: streetZoom(), centre: {x: (left + right) / 2, y: streetBottom - height / 2 / scale}}
  }
  // Every street change told to whoever's listening, as the button that shows it does
  const streetListeners = new Set<(shown: boolean) => void>()
  const glideTo = (to: {zoom: number, centre: PointData}, then?: () => void) => {
    following = undefined
    zoomAnimation = undefined
    glide = {from: {zoom, centre: {...centre}}, to, elapsed: 0, then}
  }

  const maxZoom = () => {
    const {width, height} = app.screen
    return fitScale(closestView, width, height) / coverScale(width, height)
  }

  // Keeps the zoom within its range, and the view within the scenery's sides and the
  // scene's top and bottom, though it can go down past the bottom by as much as the bar
  // covers
  const clampView = () => {
    const {width, height} = app.screen
    zoom = Math.min(maxZoom(), Math.max(street ? Math.min(1, streetZoom()) : 1, zoom))
    const scale = coverScale(width, height) * zoom
    const bar = hudFrame(app.screen)
    const belowBar = Math.min(groundBelow, (height - (bar.y - bar.height / 2) + barClearance) / scale)
    const clampAxis = (value: number, half: number, from: number, to: number) =>
      half * 2 >= to - from ? (from + to) / 2 : Math.min(to - half, Math.max(from + half, value))
    centre.x = clampAxis(centre.x, width / 2 / scale, scenery.left, scenery.right)
    if (!street) {
      centre.y = clampAxis(centre.y, height / 2 / scale, 0, sceneHeight + belowBar)
    } else if (!glide) {
      // Kept with the road just above the bottom of the screen
      centre.y = streetBottom - height / 2 / scale
    }
  }

  // How far the view's jolted aside by a shake now, on screen, and the shake, while it lasts
  const shaken = {x: 0, y: 0}
  let shaking: {strength: number, elapsed: number, phase: number} | undefined
  app.ticker.add(() => {
    if (!shaking) {
      return
    }
    shaking.elapsed += app.ticker.deltaMS
    const t = Math.min(1, shaking.elapsed / shakeFor)
    // Strongest at first, dying away, as two shudders at angles to each other
    const reach = shakePixels * shaking.strength * (1 - t) ** 2
    const turn = shaking.elapsed / 1000 * shakeRate * Math.PI * 2
    shaken.x = reach * Math.sin(turn + shaking.phase)
    shaken.y = reach * 0.7 * Math.sin(turn * 1.3 + shaking.phase * 2)
    if (t === 1) {
      shaking = undefined
      shaken.x = shaken.y = 0
    }
    const scale = scene.scale.x
    scene.position.set(app.screen.width / 2 - centre.x * scale + shaken.x, app.screen.height / 2 - centre.y * scale + shaken.y)
  })

  // The part of the scene on screen, in scene units, and a count of how often it's
  // changed, so whatever only animates what can be seen knows when to look again
  const view = {left: 0, top: 0, right: 0, bottom: 0}
  let viewVersion = 0

  const layout = () => {
    const {width, height} = app.screen
    clampView()
    const scale = coverScale(width, height) * zoom
    scene.scale.set(scale)
    scene.position.set(width / 2 - centre.x * scale + shaken.x, height / 2 - centre.y * scale + shaken.y)
    // The sky and each skyline layer follow the camera across part of the way, so they
    // seem further off
    sky.x = drawnLeft + (centre.x - sceneWidth / 2) * (1 - skyDepth)
    ;(["far", "near"] as const).forEach(layer => {
      skylineLayers[layer].x = skylineLeft + (centre.x - sceneWidth / 2) * (1 - skylineDepth[layer])
    })
    const left = centre.x - width / 2 / scale
    const top = centre.y - height / 2 / scale
    if (left !== view.left || top !== view.top || width / scale !== view.right - view.left || height / scale !== view.bottom - view.top) {
      view.left = left
      view.top = top
      view.right = left + width / scale
      view.bottom = top + height / scale
      viewVersion++
    }
  }

  // Moves the view by a distance on screen, the way the scenery is dragged
  const panBy = (dx: number, dy: number) => {
    centre.x -= dx / scene.scale.x
    centre.y -= dy / scene.scale.y
    layout()
  }

  // Zooms to a level, keeping the point of the scene under a point on screen there
  const zoomTo = (level: number, about: PointData) => {
    const anchor = scene.toLocal(about)
    zoom = level
    clampView()
    const scale = coverScale(app.screen.width, app.screen.height) * zoom
    centre.x = anchor.x - (about.x - app.screen.width / 2) / scale
    centre.y = anchor.y - (about.y - app.screen.height / 2) / scale
    layout()
  }

  const screenCentre = () => ({x: app.screen.width / 2, y: app.screen.height / 2})

  const smootherStep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  app.ticker.add(() => {
    if (!following) {
      return
    }
    const dt = Math.min(0.1, app.ticker.deltaMS / 1000)
    const at = following.target()
    if (at) {
      following.last = {x: at.x, y: at.y}
      following.gone = 0
    } else {
      following.gone += dt
    }
    if (following.gone < followHold) {
      const {last, from} = following
      const halfWidth = app.screen.width / 2 / scene.scale.x
      const halfHeight = app.screen.height / 2 / scene.scale.y
      const ease = 1 - Math.exp(-followEase * dt)
      const goal = {x: last.x, y: Math.min(from.y, last.y)}
      centre.x += (goal.x - centre.x) * ease
      centre.y += (goal.y - centre.y) * ease
      centre.x = Math.min(last.x + halfWidth * followKeep, Math.max(last.x - halfWidth * followKeep, centre.x))
      centre.y = Math.min(centre.y, last.y + halfHeight * followKeep)
      layout()
      return
    }
    following.returning ??= {start: {...centre}, elapsed: 0}
    const {returning, from} = following
    returning.elapsed += app.ticker.deltaMS
    const t = smootherStep(Math.min(1, returning.elapsed / followReturn))
    centre.x = returning.start.x + (from.x - returning.start.x) * t
    centre.y = returning.start.y + (from.y - returning.start.y) * t
    layout()
    if (t === 1) {
      following = undefined
    }
  })

  app.ticker.add(() => {
    if (!glide) {
      return
    }
    glide.elapsed += app.ticker.deltaMS
    const t = smootherStep(Math.min(1, glide.elapsed / streetGlide))
    const {from, to} = glide
    zoom = from.zoom + (to.zoom - from.zoom) * t
    centre.x = from.centre.x + (to.centre.x - from.centre.x) * t
    centre.y = from.centre.y + (to.centre.y - from.centre.y) * t
    if (t === 1) {
      const {then} = glide
      glide = undefined
      then?.()
    }
    layout()
  })

  app.ticker.add(() => {
    if (!zoomAnimation) {
      return
    }
    zoomAnimation.elapsed += app.ticker.deltaMS
    const t = Math.min(1, zoomAnimation.elapsed / zoomDuration)
    zoomTo(zoomAnimation.from + (zoomAnimation.to - zoomAnimation.from) * easeOut(t), zoomAnimation.about)
    if (t === 1) {
      zoomAnimation = undefined
    }
  })

  // Moves and releases are heard on the window, so a pan carries on off the canvas
  const toStage = (e: MouseEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }

  // Touches on the canvas, so two of them can pinch to zoom
  const touches = new Map<number, Point>()
  let pinch: {distance: number, middle: Point} | undefined
  const pinchFrom = () => {
    const [a, b] = [...touches.values()]
    return {distance: Math.hypot(a.x - b.x, a.y - b.y), middle: new Point((a.x + b.x) / 2, (a.y + b.y) / 2)}
  }

  // Where a press on the street shown whole started, to tell a tap from a pan
  let streetPress: Point | undefined
  panSurface.on("pointerdown", e => {
    if (street && !glide) {
      streetPress = e.global.clone()
    }
    if (pinch || onPress?.(scene.toLocal(e.global), e)) {
      return
    }
    panFrom = e.global.clone()
    panSurface.cursor = "grabbing"
    following = undefined
  })
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || e.target !== app.canvas) {
      return
    }
    touches.set(e.pointerId, toStage(e))
    if (touches.size === 2) {
      // A second finger turns a pan into a pinch
      panFrom = undefined
      zoomAnimation = undefined
      following = undefined
      pinch = pinchFrom()
    }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, toStage(e))
    }
    if (pinch && touches.size === 2) {
      const next = pinchFrom()
      if (!street) {
        zoomTo(zoom * next.distance / pinch.distance, next.middle)
      }
      panBy(next.middle.x - pinch.middle.x, next.middle.y - pinch.middle.y)
      pinch = next
      return
    }
    if (!panFrom) {
      return
    }
    const at = toStage(e)
    panBy(at.x - panFrom.x, at.y - panFrom.y)
    panFrom = at
  }
  const onPointerUp = (e: PointerEvent) => {
    // A tap on a house on the street shown whole looks at it
    if (streetPress && street && !glide && e.target === app.canvas) {
      const at = toStage(e)
      if (Math.hypot(at.x - streetPress.x, at.y - streetPress.y) < streetTapSlop) {
        const point = scene.toLocal(at)
        const idx = houses.findIndex(({left, width}) => point.x >= left && point.x <= left + width)
        // The player's own goes back to where the view was, if it was on it, or looks at
        // it, like any other
        const before = street.before.centre.x
        if (idx === home && before >= houses[home].left && before <= houses[home].left + houses[home].width) {
          showStreet(false)
        } else if (idx >= 0) {
          lookAt(idx)
        }
      }
    }
    streetPress = undefined
    touches.delete(e.pointerId)
    if (touches.size < 2) {
      pinch = undefined
    }
    panFrom = undefined
    panSurface.cursor = "grab"
  }
  const onWheel = (e: WheelEvent) => {
    if (e.target !== app.canvas) {
      return
    }
    e.preventDefault()
    zoomAnimation = undefined
    following = undefined
    // Trackpad pinches arrive as the wheel with Ctrl held, as does Ctrl and a mouse wheel
    if (e.ctrlKey) {
      if (!street) {
        zoomTo(zoom * Math.exp(-e.deltaY * 0.01), toStage(e))
      }
    } else {
      // Otherwise wheels and trackpads scroll the scenery past, like scrolling a page
      panBy(-e.deltaX, -e.deltaY)
    }
  }
  window.addEventListener("pointerdown", onPointerDown, true)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)
  window.addEventListener("wheel", onWheel, {passive: false})

  // Eases out to show the whole street at once, or back to the view before
  const showStreet = (on: boolean) => {
    if (on && !street) {
      street = {before: {zoom, centre: {...centre}}}
      glideTo(streetView(windowAt(centre.x)))
      streetListeners.forEach(listener => listener(true))
    } else if (!on && street && !glide) {
      glideTo(street.before, () => {
        street = undefined
      })
      streetListeners.forEach(listener => listener(false))
    }
  }
  // Slides the street along a house to the left (-1) or right (1), from the three nearest
  // the middle of the view, as far as the street goes
  const slideStreet = (by: -1 | 1) => {
    if (!street || glide) {
      return
    }
    const next = windowAt(centre.x) + by
    if (next >= 0 && next <= lastWindow) {
      glideTo(streetView(next))
    }
  }
  // Eases from the street shown whole in to a house on it, zoomed all the way out, as
  // the player's own is to begin with
  const lookAt = (idx: number) => {
    if (!street || glide) {
      return
    }
    const {left, width: across} = houses[idx]
    // Where the view settles once it's let go, the same as it would be kept to then
    const whole = {zoom, centre: {...centre}}
    street = undefined
    zoom = 1
    centre.x = left + across / 2
    centre.y = sceneHeight
    clampView()
    const to = {zoom, centre: {...centre}}
    zoom = whole.zoom
    centre.x = whole.centre.x
    centre.y = whole.centre.y
    street = {before: to}
    glideTo(to, () => {
      street = undefined
    })
    streetListeners.forEach(listener => listener(false))
  }

  layout()

  // Opened with ?camera, as scripts/demo/play.mjs does, where a point in the scene is
  // on screen and back, and where the player's house is, for a script playing it to put
  // things in the scene wherever the camera's got to
  if (new URLSearchParams(window.location.search).has("camera")) {
    Object.assign(window, {
      diwaliCamera: {
        toScreen: (point: PointData) => ({...scene.toGlobal(point)}),
        toScene: (point: PointData) => ({...scene.toLocal(point)}),
        // The player's house, from its sides and roof to the ground, in the scene
        house: () => {
          const {left, top, width, height} = houses[home]
          return {left, top, right: left + width, bottom: top + height}
        },
        // And every house on the street, the same way
        houses: () => houses.map(({left, top, width, height}) => ({left, top, right: left + width, bottom: top + height})),
      },
    })
  }

  return {
    container,
    decorations,
    house,
    // Every house on the street, in the order they stand in, with its sprite
    houses: houses.map((house, idx) => ({...house, sprite: houseSprites[idx]})),
    layout,
    // Where a point on screen falls in the scene, in scene units
    toScene(point: PointData) {
      return scene.toLocal(point)
    },
    // How many screen pixels one scene unit currently spans
    scale() {
      return scene.scale.x
    },
    // The part of the scene on screen now, in scene units. It's the same object each
    // time, changed as the camera moves; viewVersion goes up whenever it does
    view: view as Readonly<typeof view>,
    viewVersion: () => viewVersion,
    // Whether a point in the scene, or anything in a box in it, is on screen, or within
    // a margin of it, in scene units
    inView: (x: number, y: number, margin = 0) =>
      x >= view.left - margin && x <= view.right + margin && y >= view.top - margin && y <= view.bottom + margin,
    overlapsView: (left: number, top: number, right: number, bottom: number, margin = 0) =>
      right >= view.left - margin && left <= view.right + margin && bottom >= view.top - margin && top <= view.bottom + margin,
    // Zooms in (above 1) or out (below 1) by a factor, eased over a moment, about a
    // point on screen, or its middle
    zoomBy(factor: number, about: PointData = screenCentre()) {
      if (street) {
        return
      }
      const from = zoomAnimation?.to ?? zoom
      const to = Math.min(maxZoom(), Math.max(1, from * factor))
      zoomAnimation = {from: zoom, to, about, elapsed: 0}
      following = undefined
    },
    zoomStep,
    // Shakes the view for a moment, as a big bang does, at a strength from 0 to 1, the
    // stronger of it and any shake still going
    shake(strength: number) {
      if (strength > (shaking ? shaking.strength * (1 - shaking.elapsed / shakeFor) : 0)) {
        shaking = {strength, elapsed: 0, phase: Math.random() * Math.PI * 2}
      }
    },
    // Follows something on the move with the camera, wherever it is in the scene, until
    // it's gone, as a rocket bursting is, then comes back to where it was before. Any pan
    // or zoom leaves it where it's got to
    follow(target: () => PointData | undefined) {
      const at = target()
      // The street shown whole has it all in view already
      if (!at || street) {
        return
      }
      following = {target, last: {x: at.x, y: at.y}, gone: 0, from: following?.from ?? {...centre}}
    },
    canZoomIn: () => !street && zoom < maxZoom() - 1e-3,
    canZoomOut: () => !street && zoom > 1 + 1e-3,
    // Shows the whole street at once, eased out to, or back to how it was; while it's
    // shown, a tap on a house looks at it, and the player's own goes back
    showStreet,
    isStreetShown: () => street !== undefined,
    slideStreet,
    // Whether the street can be slid along any further that way
    canSlideStreet: (by: -1 | 1) => {
      const next = windowAt(glide?.to.centre.x ?? centre.x) + by
      return street !== undefined && next >= 0 && next <= lastWindow
    },
    // Calls back whenever the street's shown or put away; returns how to stop
    onStreet(listener: (shown: boolean) => void) {
      streetListeners.add(listener)
      return () => {
        streetListeners.delete(listener)
      }
    },
    // Lets a tool claim presses on the scenery, e.g. to draw, instead of them panning it
    setPressHandler(handler: PressHandler | undefined) {
      onPress = handler
    },
    // Which house a point in the scene is on, by its place along the street, or -1 if
    // it's on none, but the sky or the ground
    houseAt(point: PointData) {
      return houses.findIndex(({left, width}, idx) => point.x >= left - 2 && point.x <= left + width + 2 && onHouse(idx, point))
    },
    // Whether a point in the scene is on a house, rather than the sky or ground
    isOnHouse(point: PointData) {
      return houses.some(({left, width}, idx) => point.x >= left - 2 && point.x <= left + width + 2 && onHouse(idx, point))
    },
    // The skyline's near layer, in the skyline drawing's own units, for things drawn on
    // it. It slides as the camera pans
    skyline: skylineLayers.near,
    // And its far layer, behind it
    skylineFar: skylineLayers.far,
    // The part of a skyline layer's drawing on screen now, in its own units, into a box
    // that's reused
    viewInSkyline(layer: Container, into: {left: number, top: number, right: number, bottom: number}) {
      into.left = (view.left - layer.x) / layer.scale.x
      into.right = (view.right - layer.x) / layer.scale.x
      into.top = (view.top - layer.y) / layer.scale.y
      into.bottom = (view.bottom - layer.y) / layer.scale.y
      return into
    },
    // Where a point in the near skyline's drawing is in the scene now
    fromSkyline: (point: PointData): PointData => ({
      x: skylineLayers.near.x + point.x * skylineScale,
      y: skylineLayers.near.y + point.y * skylineScale,
    }),
    // Whether a point in the scene is hidden from the skyline behind it by the hills,
    // the ground or the house
    hidesSkyline(point: PointData) {
      return onHills(point) || houses.some(({left, width}, idx) => point.x >= left && point.x <= left + width && onHouse(idx, point, 0))
    },
    // How far left (-1) or right (1) something at a point in the scene is heard from,
    // by where it is on screen
    panOf: (point: PointData) => stereoPan(scene.x + point.x * scene.scale.x, app.screen.width),
    // How muffled something at a point in the scene is heard, from 0 on screen to 1 half
    // a screen's width or more off it, as if from round a corner
    muffleOf(point: PointData) {
      const off = Math.max(view.left - point.x, point.x - view.right, view.top - point.y, point.y - view.bottom, 0)
      return Math.min(1, off / ((view.right - view.left) / 2))
    },
    // Whether a point in the scene is on a porch's floor, of any house
    isOnPorchFloor: (point: PointData) => houses.some(({porch}) => isInside(point, porch)),
    // The player's house, by its place along the street, which they decorate, and only
    // they can, and whether a point's on its porch's floor, or on it
    home: () => home,
    isOnHomePorch: (point: PointData) => isInside(point, houses[home].porch),
    isOnHomeHouse: (point: PointData) => {
      const {left, width} = houses[home]
      return point.x >= left - 2 && point.x <= left + width + 2 && onHouse(home, point)
    },
    // Makes a house the player's, and moves the camera across to it, framed as it frames
    // the first house to begin with
    setHome(idx: number) {
      centre.x += middleOf(idx) - middleOf(home)
      home = idx
      layout()
    },
    // How high the nearest eave straight above a point in the scene is, if there's one
    eaveAbove(point: PointData) {
      const above = houses.flatMap(house => house.eaves)
        .filter(([left, right]) => point.x >= left.x && point.x <= right.x && left.y < point.y)
        .map(([left]) => left.y)
      return above.length ? Math.max(...above) : undefined
    },
    destroy() {
      window.removeEventListener("pointerdown", onPointerDown, true)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      window.removeEventListener("wheel", onWheel)
      container.destroy({children: true})
    },
  }
}

type Background = ReturnType<typeof createBackground>

export {addBackgroundAssets, backgroundAssets, createBackground, doorway, groundBelow, houses, houseUrl, isInside, porchFloor, porchPots, sceneHeight, sceneWidth, scenery, skyAbove, skylineUrls}
export type {Background, House}
