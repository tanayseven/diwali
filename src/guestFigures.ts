import {Container, Graphics, GraphicsPath, PointData} from "pixi.js"

// The guests on the porch, each drawn side-on facing right, in their own units with
// their feet at (0, 0) and standing about 105 tall. Each is put together from parts
// that turn about their joints: thighs at the hips, shins at the knees and feet at the
// ankles, upper arms at the shoulders and forearms at the elbows, the head at the neck,
// and the body leaning over at the hips, so they can walk with a real stride, and
// cheer, clap, point, fold their hands and bend down to put a diya on the floor

type Shape =
  | {path: string, fill: number, alpha?: number}
  | {line: string, color: number, width: number}
  | {ellipse: [number, number, number, number], fill: number}
  | {rect: [number, number, number, number], fill: number, radius?: number}

const hip = {x: 0, y: -50}
const knee = {x: 0, y: -27}
const ankle = {x: 0, y: -4}
const shoulder = {x: 1, y: -82}
const elbow = {x: 1, y: -66}
const hand = {x: 1, y: -49}
const neck = {x: 1, y: -89}
// How long the thigh and the shin are, and how far the sole is below the ankle
const thighLength = Math.abs(knee.y - hip.y)
const shinLength = Math.abs(ankle.y - knee.y)
const soleBelow = -ankle.y

// Skin tones, each with a darker shade for the neck and ear
type Tone = {skin: number, dark: number}
const tones: Tone[] = [
  {skin: 0xe0b08a, dark: 0xc4916b},
  {skin: 0xd09a6c, dark: 0xb27c52},
  {skin: 0xc68a5c, dark: 0xa96f45},
  {skin: 0xa86f45, dark: 0x8a5634},
  {skin: 0x8a5a3a, dark: 0x6e4529},
  {skin: 0x6e4630, dark: 0x56361f},
]
const eye = 0x2b1d14
const black = 0x1d1411
const grey = 0xa3a3a3
const white = 0xe8e8e8

// The shapes drawn into a part that turns about a joint: the part sits at the joint,
// and its drawing is moved back by as much, so the drawing's own units still hold. A
// part inside another, like a forearm in an upper arm, sits at its joint as seen from
// the other's
const part = (shapes: Shape[], joint: PointData = {x: 0, y: 0}, within: PointData = {x: 0, y: 0}) => {
  const container = new Container()
  container.position.set(joint.x - within.x, joint.y - within.y)
  const graphics = new Graphics()
  shapes.forEach(shape => {
    if ("path" in shape) {
      graphics.path(new GraphicsPath(shape.path)).fill({color: shape.fill, alpha: shape.alpha ?? 1})
    } else if ("line" in shape) {
      graphics.path(new GraphicsPath(shape.line)).stroke({color: shape.color, width: shape.width, cap: "round"})
    } else if ("ellipse" in shape) {
      const [x, y, rx, ry] = shape.ellipse
      graphics.ellipse(x, y, rx, ry).fill(shape.fill)
    } else {
      const [x, y, width, height] = shape.rect
      ;(shape.radius ? graphics.roundRect(x, y, width, height, shape.radius) : graphics.rect(x, y, width, height))
        .fill(shape.fill)
    }
  })
  graphics.position.set(-joint.x, -joint.y)
  container.addChild(graphics)
  return container
}

type Leg = {cloth: number, hem: number, sandal: number, width?: number, hemHeight?: number}
type Arm = {sleeve: number, cuff: number, sleeveEnd?: number, bangles?: number}

const sandal = (colour: number): Shape => ({path: "M-4 -2 L11 -2 Q12 0 10 0 L-4.5 0 Z", fill: colour})

// A stretch of a trouser leg, a dhoti or a sleeve, from one height to another, as wide
// as it is there: each widens a little towards its end
const cloth = (top: number, bottom: number, widthAt: (y: number) => number, x: number, fill: number): Shape => ({
  path: `M${x - widthAt(top)} ${top} L${x + widthAt(top)} ${top} L${x + widthAt(bottom)} ${bottom} L${x - widthAt(bottom)} ${bottom} Z`,
  fill,
})

// A leg in three parts: the thigh, the shin with the hem and ankle, and the foot. Each
// overlaps the next a little, with a round of cloth at the knee, so no gap shows as it
// bends
const legShapes = ({cloth: colour, hem, sandal: sandalColour, width = 7, hemHeight = 4}: Leg, tone: Tone) => {
  const widthAt = (y: number) => width + (y - hip.y) / (ankle.y - 2 - hip.y)
  return {
    thigh: [cloth(hip.y - 2, knee.y + 2, widthAt, 0, colour)],
    shin: [
      {ellipse: [0, knee.y, widthAt(knee.y) - 0.3, widthAt(knee.y) - 0.3], fill: colour} as Shape,
      cloth(knee.y, -6, widthAt, 0, colour),
      {rect: [-width - 1, -6 - hemHeight, 2 * width + 2, hemHeight], fill: hem} as Shape,
      {rect: [-2.5, -6, 5, 4], fill: tone.skin} as Shape,
    ],
    foot: [{ellipse: [0, ankle.y, 2.6, 2.6], fill: tone.skin} as Shape, sandal(sandalColour)],
  }
}

// An arm in two parts: the upper arm, and the forearm with the hand. The sleeve goes as
// far down as it does, across the elbow or not
const armShapes = ({sleeve, cuff, sleeveEnd = -53, bangles}: Arm, tone: Tone) => {
  const widthAt = (y: number) => 3.4 + (y - shoulder.y) / (hand.y - shoulder.y) * -0.6
  const long = sleeveEnd > elbow.y
  const upper: Shape[] = [
    {rect: [-2.1, shoulder.y, 6.2, elbow.y - shoulder.y + 3], fill: tone.skin, radius: 3},
    cloth(shoulder.y - 2, long ? elbow.y + 2 : sleeveEnd, widthAt, 1, sleeve),
  ]
  const lower: Shape[] = [
    {ellipse: [1, elbow.y, 3, 3], fill: long ? sleeve : tone.skin},
    {rect: [-1.8, elbow.y, 5.6, hand.y - elbow.y], fill: tone.skin, radius: 2.6},
  ]
  ;(long ? lower : upper).push(
    ...(long ? [cloth(elbow.y, sleeveEnd, widthAt, 1, sleeve)] : []),
    {rect: [-2.4, sleeveEnd - 2.5, 6.8, 2.5], fill: cuff},
  )
  if (bangles) {
    lower.push({rect: [-2.3, hand.y - 6, 6.6, 2.2], fill: bangles})
  }
  lower.push({ellipse: [hand.x, hand.y, 3.4, 3.4], fill: tone.skin})
  return {upper, lower}
}

const headShapes = (tone: Tone, hair: Shape[]): Shape[] => [
  {rect: [-2, -92, 6, 7], fill: tone.dark},
  {ellipse: [2, -98, 8.2, 9], fill: tone.skin},
  {path: "M9.5 -98 L12.2 -94.4 L9.6 -93.6 Z", fill: tone.skin},
  {ellipse: [7, -99, 0.95, 0.95], fill: eye},
  ...hair,
  {ellipse: [-1, -97, 1.7, 2.5], fill: tone.dark},
]

// Hair, and what's worn on the head or face, each in a colour
const hairStyles = {
  bald: (colour: number): Shape[] => [
    {path: "M-6.2 -102 Q-9.3 -96 -6 -90 L-3.6 -90.5 Q-6 -95.5 -3.6 -101.5 Z", fill: colour},
    {path: "M0.6 -101.8 Q-0.6 -99 0.4 -96.4 L-1.6 -96 Q-2.4 -99.5 -1 -102.3 Z", fill: colour},
    {line: "M5 -101.6 L9 -101.2", color: colour, width: 0.9},
  ],
  short: (colour: number): Shape[] => [{
    path: "M-6.8 -99 Q-4 -109 6 -106.5 Q10.6 -104.5 10.2 -100.5 Q5 -103 1.5 -102 Q-0.6 -98 -1.5 -95 L-6 -92.5 Q-8.6 -95 -6.8 -99 Z",
    fill: colour,
  }],
  boy: (colour: number): Shape[] => [
    {path: "M-6.8 -99 Q-4 -109.5 6 -107 Q10.8 -105 10.4 -100.5 Q5.5 -104 2 -102 Q-0.6 -98.5 -1.5 -95 L-6 -92 Q-8.8 -95 -6.8 -99 Z", fill: colour},
    {line: "M3 -106.5 Q7 -103 9.5 -103.5", color: colour, width: 1.6},
  ],
  spiky: (colour: number): Shape[] => [{
    path: "M-7 -98 L-6.5 -104 L-3.5 -103.5 L-2 -108.5 L1.5 -105.5 L4.5 -109.5 L6.5 -105.5 L10.5 -103.5 Q10.4 -101 9.5 -100.6 Q5 -103.5 1.5 -102 Q-0.6 -98 -1.5 -95 L-6 -92.5 Q-8.6 -95 -7 -98 Z",
    fill: colour,
  }],
  bun: (colour: number): Shape[] => [
    longHair(colour),
    {ellipse: [-8.6, -96, 4.2, 4.2], fill: colour},
    {ellipse: [-9.6, -97, 1.2, 1.2], fill: 0xf2f2f2},
    {ellipse: [-7.4, -99, 1, 1], fill: 0xf2f2f2},
  ],
  plait: (colour: number): Shape[] => [
    longHair(colour),
    {line: "M-6.5 -94 Q-11 -82 -9.5 -70", color: colour, width: 3.4},
    {ellipse: [-9.5, -68.5, 1.6, 1.6], fill: 0xe03131},
  ],
  open: (colour: number): Shape[] => [
    longHair(colour),
    {path: "M-6.5 -98 Q-11 -88 -9.5 -78 L-3.5 -79 Q-4.5 -88 -2 -93 Z", fill: colour},
  ],
  turban: (colour: number): Shape[] => [
    {path: "M-8.5 -99 Q-9 -110 2 -112 Q11.5 -111 11 -101 L9.5 -100.5 Q4 -103.5 -2 -101.5 Q-5 -98 -6 -94 Z", fill: colour},
    {line: "M-7.5 -104 Q2 -107 10.6 -103.5", color: 0x000000, width: 0.6},
    {line: "M-6 -108 Q2 -110.5 9 -108.5", color: 0x000000, width: 0.6},
  ],
}
type HairStyle = keyof typeof hairStyles

const longHair = (colour: number): Shape => ({
  path: "M-6.5 -100 Q-2 -109 7 -105.5 Q10.3 -103.5 10 -101 Q4 -103.5 1 -101 Q-1 -97 -2 -92 L-6.5 -91 Q-9 -95 -6.5 -100 Z",
  fill: colour,
})
const moustache = (colour: number): Shape => ({path: "M6.6 -93.4 Q10 -95 12 -92.6 Q9.4 -91.7 6.6 -92.4 Z", fill: colour})
const beard = (colour: number): Shape[] => [
  {path: "M-1 -95 Q-1 -88 5 -86.5 Q10.5 -86.5 11.8 -91.5 L9.5 -92 Q6 -91 3.5 -94.5 Z", fill: colour},
  moustache(colour),
]
const glasses: Shape[] = [
  {line: "M4.6 -98.4 Q7 -96.4 9.6 -98.4 Q9.6 -101.2 7 -101.2 Q4.6 -101.2 4.6 -98.4 Z", color: 0x3a2a20, width: 0.7},
  {line: "M4.6 -99.6 L-0.6 -98.6", color: 0x3a2a20, width: 0.7},
]
const bindi: Shape = {ellipse: [9.3, -101.2, 0.9, 0.9], fill: 0xd6203b}

// What each guest wears: their legs, or feet under a long skirt, what's below the
// waist that stays put as they lean, their body and arms
type Outfit = {
  legs?: [Leg, Leg]
  feet?: [number, number]
  lower: Shape[]
  body: Shape[]
  arms: [Arm, Arm]
}

// A darker shade of a colour, for what's on the far side
const shade = (colour: number, by = 0.82) =>
  [16, 8, 0].reduce((sum, shift) => sum + (Math.round(((colour >> shift) & 0xff) * by) << shift), 0)

const outfits = {
  // A kurta, a stole over the shoulder, and a dhoti with a coloured border
  dhotiKurta: (kurta: number, stole: number, dhoti: number, border: number): Outfit => ({
    legs: [
      {cloth: shade(dhoti, 0.9), hem: shade(border), sandal: 0x7a4022},
      {cloth: dhoti, hem: border, sandal: 0x8a4b2a},
    ],
    lower: [
      {path: "M-10.5 -52 L11 -52 L10.5 -40 L-10 -40 Z", fill: dhoti},
      {path: "M3 -52 L8 -52 L6.5 -12 L2 -12 Z", fill: border},
    ],
    body: [
      {path: "M-9 -87 Q2 -90 9.5 -86 L12 -42 L-11 -42 Q-12.5 -66 -9 -87 Z", fill: kurta},
      {path: "M-9 -87 Q-12.5 -66 -11 -42 L-6 -42 Q-8 -66 -5.5 -87.5 Z", fill: shade(kurta, 0.87)},
      {path: "M-6 -89 Q2 -86 9 -88.5 L10 -85 Q2 -82 -6.5 -85.5 Z", fill: stole},
      {path: "M5.5 -87 Q11.5 -84 11 -76 L9.6 -55 L4.6 -55 L5.4 -78 Z", fill: stole},
      {line: "M5.6 -76 L5 -56", color: shade(stole), width: 0.8},
    ],
    arms: [{sleeve: shade(kurta), cuff: shade(kurta, 0.9)}, {sleeve: kurta, cuff: shade(kurta, 1.1)}],
  }),
  // A kurta to the knee over pyjamas, with a sleeveless jacket over it or not
  kurtaPyjama: (kurta: number, trim: number, pyjama: number, jacket?: number): Outfit => ({
    legs: [
      {cloth: shade(pyjama, 0.9), hem: shade(pyjama, 0.9), sandal: 0x3b2a20, width: 5.5, hemHeight: 0.1},
      {cloth: pyjama, hem: pyjama, sandal: 0x4a3426, width: 5.5, hemHeight: 0.1},
    ],
    lower: [],
    body: [
      {path: "M-9 -87 Q2 -90 9.5 -86 L12.5 -30 L-11.5 -30 Q-12 -60 -9 -87 Z", fill: kurta},
      {path: "M-9 -87 Q-12 -60 -11.5 -30 L-6.5 -30 Q-8 -60 -5.5 -87.5 Z", fill: shade(kurta, 0.88)},
      {line: "M-12 -33 L12.6 -33", color: trim, width: 1},
      ...(jacket === undefined ? [{line: "M8.4 -86 L9.4 -66", color: trim, width: 1.2} as Shape] : [
        {path: "M-9.4 -86.5 Q-1 -89.5 7 -87.5 L9.6 -50 L-11.2 -50 Q-11.8 -67 -9.4 -86.5 Z", fill: jacket} as Shape,
        {line: "M7.2 -86 L9.4 -51", color: trim, width: 0.9} as Shape,
      ]),
    ],
    arms: [{sleeve: shade(kurta, 0.85), cuff: shade(kurta, 0.85)}, {sleeve: kurta, cuff: kurta}],
  }),
  // A sari with a border, its pallu over the shoulder, and a blouse
  sari: (sari: number, border: number, blouse: number): Outfit => ({
    feet: [0x6b3a1f, 0x8a4b2a],
    lower: [
      {path: "M-9 -60 L9.5 -60 L13 -2.5 L-12.5 -2.5 Z", fill: sari},
      {path: "M-12.4 -8 L12.7 -8 L13 -2.5 L-12.5 -2.5 Z", fill: border},
      {line: "M3 -58 L5 -3", color: shade(sari, 0.8), width: 0.8},
      {line: "M6 -58 L8.5 -3", color: shade(sari, 0.8), width: 0.8},
    ],
    body: [
      {path: "M-8.5 -87 Q2 -90 9 -86 L9.5 -59 L-9.5 -59 Q-10.5 -77 -8.5 -87 Z", fill: blouse},
      {path: "M5 -88 Q11 -80 2 -66 Q-6 -56 -10 -46 L-13 -24 L-8.5 -24 L-6 -44 Q0 -56 7 -64 Q14 -76 9 -88.5 Z", fill: shade(sari, 1.08)},
      {line: "M5 -88 Q11 -80 2 -66 Q-6 -56 -10 -46 L-13 -24", color: border, width: 1.6},
    ],
    arms: [
      {sleeve: blouse, cuff: border, sleeveEnd: -72, bangles: 0xf2c14e},
      {sleeve: blouse, cuff: border, sleeveEnd: -72, bangles: 0xf2c14e},
    ],
  }),
  // A long flared skirt with a border, a short blouse, and a dupatta flowing behind
  lehenga: (skirt: number, border: number, choli: number, dupatta: number): Outfit => ({
    feet: [0xa61e4d, 0xc2255c],
    lower: [
      {path: "M-8.5 -62 L9 -62 Q15 -30 17 -3 L-16 -3 Q-14 -30 -8.5 -62 Z", fill: skirt},
      {path: "M-15.6 -9 L16.6 -9 L17 -3 L-16 -3 Z", fill: border},
      {line: "M-12.6 -36 Q0 -33 13.6 -36", color: border, width: 1},
    ],
    body: [
      {path: "M-8.5 -87 Q2 -90 9 -86 L9.5 -62 L-9 -62 Q-10.5 -77 -8.5 -87 Z", fill: choli},
      {path: "M6 -88 Q-4 -74 -11 -62 Q-16 -50 -19 -40 L-15 -40 Q-12 -52 -7 -62 Q0 -74 9 -86 Z", fill: dupatta},
    ],
    arms: [
      {sleeve: choli, cuff: border, sleeveEnd: -74, bangles: 0xe03131},
      {sleeve: choli, cuff: border, sleeveEnd: -74, bangles: 0xe03131},
    ],
  }),
  // A long kameez over loose salwar, with a dupatta round the neck falling behind
  salwarKameez: (kameez: number, salwar: number, dupatta: number): Outfit => ({
    legs: [
      {cloth: shade(salwar, 0.9), hem: shade(salwar, 0.75), sandal: 0x6b3a1f, width: 7.5, hemHeight: 2},
      {cloth: salwar, hem: shade(salwar, 0.85), sandal: 0x8a4b2a, width: 7.5, hemHeight: 2},
    ],
    lower: [],
    body: [
      {path: "M-8.5 -87 Q2 -90 9 -86 L13 -27 L-12 -27 Q-12 -60 -8.5 -87 Z", fill: kameez},
      {line: "M-11.8 -30 L12.8 -30", color: shade(kameez, 0.7), width: 1.2},
      {path: "M-8 -87.5 Q-14 -70 -14.5 -46 L-10.5 -46 Q-10 -68 -4.5 -85 Z", fill: shade(dupatta, 0.88)},
      {path: "M-7 -89 Q2 -85 9 -88.5 L10.2 -84 Q2 -80 -7.5 -84.5 Z", fill: dupatta},
    ],
    arms: [
      {sleeve: shade(kameez, 0.85), cuff: shade(kameez, 0.7), sleeveEnd: -60, bangles: 0xf2c14e},
      {sleeve: kameez, cuff: shade(kameez, 0.7), sleeveEnd: -60, bangles: 0xf2c14e},
    ],
  }),
  // A shirt tucked into trousers, and shoes
  shirtTrousers: (shirt: number, trousers: number): Outfit => ({
    legs: [
      {cloth: shade(trousers, 0.88), hem: shade(trousers, 0.88), sandal: 0x241a14, width: 5.6, hemHeight: 0.1},
      {cloth: trousers, hem: trousers, sandal: 0x2e221a, width: 5.6, hemHeight: 0.1},
    ],
    lower: [],
    body: [
      {path: "M-9 -87 Q2 -90 9.5 -86 L10.5 -48 L-10 -48 Q-11 -66 -9 -87 Z", fill: shirt},
      {path: "M2.5 -89 L9.4 -88.5 L7.5 -84.5 Z", fill: shade(shirt, 1.12)},
      {line: "M8.6 -84 L9.8 -50", color: shade(shirt, 0.8), width: 0.7},
      {rect: [-10.2, -50, 21, 3], fill: 0x3a2a20},
    ],
    arms: [{sleeve: shade(shirt, 0.85), cuff: shade(shirt, 0.85), sleeveEnd: -58}, {sleeve: shirt, cuff: shirt, sleeveEnd: -58}],
  }),
}

// How someone looks: their skin, hair and what's on their face, what they wear, and how
// big they are next to a grown-up
type Look = {tone: Tone, hair: Shape[], outfit: Outfit, size: number}

const look = (
  tone: number, style: HairStyle, hairColour: number, outfit: Outfit, size: number,
  extras: Shape[] = [],
): Look => ({tone: tones[tone], hair: [...hairStyles[style](hairColour), ...extras], outfit, size})

// The first house's family, each drawn to suit them
const looks = {
  grandfather: look(2, "bald", grey, outfits.dhotiKurta(0xd9541e, 0xf29a1f, 0xf0dca8, 0xe8890c), 1, [moustache(white)]),
  grandson: look(2, "boy", black, outfits.dhotiKurta(0xd9541e, 0xf29a1f, 0xf0dca8, 0xe8890c), 0.66),
  sari: look(2, "bun", black, outfits.sari(0xc2255c, 0xf2c14e, 0x7b1640), 0.97, [bindi]),
  youngMan: look(2, "short", 0x1b1411, outfits.kurtaPyjama(0x2f6db5, 0xf2c14e, 0xf3efe6), 1.03),
  girl: look(2, "plait", black, outfits.lehenga(0x2b8a3e, 0xf2c14e, 0xf08c00, 0xffd43b), 0.8),
}

type Who = keyof typeof looks

// The kinds of people in a family made up for a house
type Role = "grandfather" | "grandmother" | "man" | "woman" | "teen" | "boy" | "girl"

// Colours clothes come in: festive brights, and the creams and whites worn with them
const brights = [
  0xd9541e, 0xc2255c, 0x2f6db5, 0x2b8a3e, 0x7b2cbf, 0xe8890c, 0x0c8599, 0xa61e4d, 0xf08c00, 0x5c940d,
  0x1864ab, 0xd6336c, 0x862e9c, 0xf59f00, 0x2f9e44, 0xc92a2a,
]
const golds = [0xf2c14e, 0xffd43b, 0xe8890c, 0xfab005]
const creams = [0xf3efe6, 0xf0dca8, 0xe9e2d0, 0xffffff]
const darks = [0x343a40, 0x1c3d5a, 0x4a3426, 0x2b2b2b, 0x3d4f6a]
const hairColours = [black, 0x2b1d14, 0x3b2418]

// Someone made up for a role, picking from what suits it with a source of randomness
const makeLook = (role: Role, random: () => number): Look => {
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]
  const tone = Math.floor(random() * tones.length)
  const bright = () => pick(brights)
  const hair = pick(hairColours)
  switch (role) {
  case "grandfather":
    return random() < 0.4
      ? look(tone, "turban", pick([0xf08c00, 0xc92a2a, 0xfab005, 0xffffff, 0x1864ab]), outfits.kurtaPyjama(pick(creams), pick(golds), pick(creams), random() < 0.6 ? pick(darks) : undefined), 1, beard(white))
      : look(tone, "bald", grey, outfits.dhotiKurta(pick([bright(), pick(creams)]), pick(golds), pick(creams), bright()), 1, random() < 0.5 ? [moustache(white), ...glasses] : [moustache(white)])
  case "grandmother":
    return look(tone, "bun", grey, outfits.sari(pick([pick(creams), bright()]), bright(), bright()), 0.94, random() < 0.6 ? [...glasses, bindi] : [bindi])
  case "man": {
    const kind = random()
    return kind < 0.4
      ? look(tone, random() < 0.2 ? "turban" : "short", random() < 0.2 ? bright() : hair, outfits.kurtaPyjama(bright(), pick(golds), pick(creams), random() < 0.4 ? pick(darks) : undefined), 1.02, random() < 0.4 ? [moustache(hair)] : random() < 0.3 ? beard(hair) : [])
      : kind < 0.7
        ? look(tone, "short", hair, outfits.shirtTrousers(pick([bright(), pick(creams)]), pick(darks)), 1.02, random() < 0.4 ? [moustache(hair)] : [])
        : look(tone, "short", hair, outfits.dhotiKurta(bright(), pick(golds), pick(creams), pick(golds)), 1, random() < 0.5 ? [moustache(hair)] : [])
  }
  case "woman":
    return random() < 0.55
      ? look(tone, pick<HairStyle>(["bun", "plait", "open"]), hair, outfits.sari(bright(), pick(golds), bright()), 0.97, [bindi])
      : look(tone, pick<HairStyle>(["plait", "open", "bun"]), hair, outfits.salwarKameez(bright(), pick([pick(creams), bright()]), bright()), 0.97, random() < 0.6 ? [bindi] : [])
  case "teen":
    return random() < 0.5
      ? look(tone, "spiky", hair, outfits.shirtTrousers(bright(), pick(darks)), 0.9)
      : look(tone, pick<HairStyle>(["plait", "open"]), hair, outfits.lehenga(bright(), pick(golds), bright(), pick(golds)), 0.88)
  case "boy":
    return random() < 0.5
      ? look(tone, "boy", hair, outfits.kurtaPyjama(bright(), pick(golds), pick(creams)), 0.66)
      : look(tone, "boy", hair, outfits.dhotiKurta(bright(), pick(golds), pick(creams), bright()), 0.66)
  case "girl":
    return look(tone, "plait", hair, outfits.lehenga(bright(), pick(golds), bright(), pick(golds)), 0.68)
  }
}

// What a guest's doing with their arms and body, besides walking
type Action =
  | "idle" | "cheer" | "clap" | "startle" | "namaste" | "bend" | "carry" | "talk"
  | {point: PointData}

const easeRate = 9

// A small diya held in the hand, lit, kept upright however the arm's turned. It's
// put on the forearm, which turns about the elbow
const heldDiya = () => {
  const diya = new Container()
  const bowl = new Graphics()
    .path(new GraphicsPath("M-6 -1 Q0 6 6 -1 Z")).fill(0xb5532a)
    .path(new GraphicsPath("M-6 -1 L6 -1 L5 -2.2 L-5 -2.2 Z")).fill(0x8a3d1f)
  const flame = new Graphics().path(new GraphicsPath("M0 -2 Q-2.6 -6 0 -10.5 Q2.6 -6 0 -2 Z")).fill(0xffc04a)
  diya.addChild(bowl, flame)
  diya.position.set(hand.x - elbow.x + 2, hand.y - elbow.y - 2)
  diya.visible = false
  return {diya, flame}
}

// How far a leg reaches down from the hip, with its thigh and its shin at these angles
// from hanging straight down
const legReach = (thigh: number, shin: number) =>
  thighLength * Math.cos(thigh) + shinLength * Math.cos(thigh + shin) + soleBelow

// Where each joint's turned to for a pose, from hanging or standing straight: the
// thighs and the knees' bend, the upper arms and the elbows' bend, the head, the lean
// at the hips and a hop. Angles are clockwise, so forward is negative for an arm or a
// thigh, and an elbow or a knee bends the other way to each other
type Pose = {
  thighs: [number, number], knees: [number, number],
  arms: [number, number], elbows: [number, number],
  head: number, lean: number, hop: number,
}

const createFigure = (look: Look) => {
  const {tone, outfit} = look
  const root = new Container()
  const shadow = new Graphics().ellipse(0, 0, 15, 3.2).fill({color: 0x000000, alpha: 0.28})
  // Everything that rises and falls as they walk or hop, over the shadow that stays on
  // the floor
  const bobbing = new Container()
  root.addChild(shadow, bobbing)
  const arm = (shapes: ReturnType<typeof armShapes>) => {
    const upper = part(shapes.upper, shoulder)
    const lower = part(shapes.lower, elbow, shoulder)
    upper.addChild(lower)
    return {upper, lower}
  }
  const leg = (shapes: ReturnType<typeof legShapes>) => {
    const thigh = part(shapes.thigh, hip)
    const shin = part(shapes.shin, knee, hip)
    const foot = part(shapes.foot, ankle, knee)
    thigh.addChild(shin)
    shin.addChild(foot)
    return {thigh, shin, foot}
  }
  const arms = [arm(armShapes(outfit.arms[0], tone)), arm(armShapes(outfit.arms[1], tone))]
  const legs = outfit.legs?.map(shapes => leg(legShapes(shapes, tone)))
  const feet = outfit.feet?.map(colour => part([sandal(colour)]))
  const lower = part(outfit.lower, hip)
  const body = part(outfit.body, hip)
  const head = part(headShapes(tone, look.hair), neck)
  const held = heldDiya()
  arms[1].lower.addChild(held.diya)
  bobbing.addChild(
    arms[0].upper, ...(legs ?? []).map(({thigh}) => thigh), ...(feet ?? []), lower, body, head, arms[1].upper,
  )
  // Every part that moves, in the same order in every figure of the same look, for a
  // copy to take the same pose
  const moving = [
    bobbing, ...arms.flatMap(({upper, lower: forearm}) => [upper, forearm]),
    ...(legs ?? []).flatMap(({thigh, shin, foot}) => [thigh, shin, foot]),
    ...(feet ?? []), lower, body, head, held.diya, held.flame,
  ]

  // How each joint's turned now, eased towards where the pose wants it
  const now: Pose = {thighs: [0, 0], knees: [0, 0], arms: [0, 0], elbows: [-0.15, -0.15], head: 0, lean: 0, hop: 0}
  // How far through a stride they are, from 0 to 2π, the front leg's half a stride on
  // from the back one's, and how much they're walking, eased in and out
  let phase = Math.random() * Math.PI * 2
  let walking = 0
  let time = Math.random() * 10
  let action: Action = "idle"

  // Where a joint ends up with the body leant over at the hips, and so how far the
  // part on it turns too
  const leant = (container: Container, joint: PointData, turn: number) => {
    const dx = joint.x - hip.x
    const dy = joint.y - hip.y
    const cos = Math.cos(now.lean)
    const sin = Math.sin(now.lean)
    container.position.set(hip.x + dx * cos - dy * sin, hip.y + dx * sin + dy * cos)
    container.rotation = now.lean + turn
  }

  // A walking stride for one leg, at a point in it. From 0 to π the foot's on the
  // floor, taking the weight, as the thigh goes from forward to back, the knee nearly
  // straight; from π to 2π it swings through, the knee bending most just after the toe
  // leaves the floor, and straightening to reach forward for the next step. The arm on
  // the other side swings with it, forward as it does, the elbow bending a little more
  // as the arm comes forward
  const stride = (at: number) => {
    const forward = Math.cos(at)
    const through = Math.max(0, -Math.sin(at - 0.35))
    return {
      thigh: -0.38 * forward,
      knee: 0.08 + 1.05 * through ** 1.4,
      arm: -0.3 * forward,
      elbow: -(0.2 + 0.32 * Math.max(0, forward)),
    }
  }

  const pose = (): Pose => {
    const back = stride(phase)
    const front = stride(phase + Math.PI)
    const w = walking
    const sway = Math.sin(time * 1.3) * 0.04
    const target: Pose = {
      thighs: [back.thigh * w, front.thigh * w],
      knees: [0.04 + (back.knee - 0.04) * w, 0.04 + (front.knee - 0.04) * w],
      // Each arm swings with the leg on the other side
      arms: [front.arm * w + sway, back.arm * w - sway],
      elbows: [-0.15 + (front.elbow + 0.15) * w, -0.15 + (back.elbow + 0.15) * w],
      head: 0,
      lean: 0.04 * w,
      hop: 0,
    }
    const both = (a: number, b: number): [number, number] => [a, b]
    if (action === "cheer") {
      // Arms up, waving from the elbows, and bouncing on the toes
      target.arms = both(-2.6, -2.75)
      target.elbows = both(-0.25 + Math.sin(time * 9) * 0.35, -0.25 - Math.sin(time * 9) * 0.35)
      target.head = -0.15
      target.hop = Math.abs(Math.sin(time * 5.5)) * 4
      target.knees = both(0.15 + target.hop * 0.05, 0.15 + target.hop * 0.05)
    } else if (action === "clap") {
      // Forearms up in front of the chest, the hands coming together and apart
      const clap = Math.abs(Math.sin(time * 7)) * 0.35
      target.arms = both(-0.45, -0.55)
      target.elbows = both(-1.35 + clap, -1.35 - clap)
      target.head = -0.08
    } else if (action === "startle") {
      // Hands to the ears, leaning back from it
      target.arms = both(-2.5, -2.6)
      target.elbows = both(-2.1, -2.1)
      target.lean = -0.12
      target.hop = 2
    } else if (action === "namaste") {
      // Hands together in front of the chest, the head bowed a little
      target.arms = both(-0.3, -0.35)
      target.elbows = both(-1.8, -1.8)
      target.lean = 0.12
      target.head = 0.12
    } else if (action === "bend") {
      // Bending at the hips and the knees to reach the floor in front of them
      target.lean = 0.75
      target.thighs = both(-0.35, -0.6)
      target.knees = both(0.85, 1.15)
      target.arms = both(-0.25, -0.75)
      target.elbows = both(-0.2, -0.15)
      target.head = 0.15
    } else if (action === "carry") {
      // The diya held out in front, the forearm level
      target.arms[1] = -0.35
      target.elbows[1] = -1.15
    } else if (action === "talk") {
      target.arms[1] = -0.3 + Math.sin(time * 2.1) * 0.1
      target.elbows[1] = -1 + Math.sin(time * 4.2) * 0.35
      target.head = Math.sin(time * 2.1) * 0.06
    } else if (typeof action === "object") {
      // An arm out straight towards it, and the head turned up to it. The point's in
      // the root's parent, and they're turned to face it already
      const at = root.parent ? root.toLocal(action.point, root.parent) : action.point
      const angle = Math.atan2(at.y - shoulder.y, Math.abs(at.x - shoulder.x))
      target.arms[1] = Math.min(-0.3, angle - Math.PI / 2)
      target.elbows[1] = -0.05
      target.head = Math.max(-0.45, Math.min(0.2, angle * 0.5))
    }
    return target
  }

  return {
    root,
    size: look.size,
    setAction(next: Action) {
      action = next
    },
    action: () => action,
    moving,
    // Takes the same pose as another figure of the same look, where it is
    copyPose(from: {root: Container, moving: Container[]}) {
      root.position.copyFrom(from.root.position)
      root.scale.copyFrom(from.root.scale)
      moving.forEach((container, idx) => {
        const source = from.moving[idx]
        container.position.copyFrom(source.position)
        container.scale.copyFrom(source.scale)
        container.rotation = source.rotation
        container.visible = source.visible
      })
    },
    // Shows the diya in their hand, or not
    carrying(shown: boolean) {
      held.diya.visible = shown
    },
    // Where the flame of the diya in their hand is, in the root's parent
    flameAt(into: PointData) {
      const point = held.flame.toGlobal({x: 0, y: -6})
      const local = root.parent?.toLocal(point) ?? point
      into.x = local.x
      into.y = local.y
      return into
    },
    // Moves the pose on by a frame, having walked a distance in their own units, at a
    // speed from 0 (standing) to 1 (a full stride), which sets how long their steps are.
    // A stride's two steps are as long as the legs reach, so the foot on the floor
    // stays put as they go
    update(dt: number, distance: number, speed: number) {
      time += dt
      walking += (Math.min(1, speed) - walking) * (1 - Math.exp(-6 * dt))
      const step = 2 * (thighLength + shinLength) * Math.sin(0.32 * Math.max(walking, 0.3))
      phase = (phase + distance / (2 * step) * Math.PI * 2) % (Math.PI * 2)
      const target = pose()
      const ease = 1 - Math.exp(-easeRate * dt)
      const towards = (from: number, to: number) => from + (to - from) * ease
      now.thighs = [towards(now.thighs[0], target.thighs[0]), towards(now.thighs[1], target.thighs[1])]
      now.knees = [towards(now.knees[0], target.knees[0]), towards(now.knees[1], target.knees[1])]
      now.arms = [towards(now.arms[0], target.arms[0]), towards(now.arms[1], target.arms[1])]
      now.elbows = [towards(now.elbows[0], target.elbows[0]), towards(now.elbows[1], target.elbows[1])]
      now.head = towards(now.head, target.head)
      now.lean = towards(now.lean, target.lean)
      now.hop = towards(now.hop, target.hop)
      if (legs) {
        legs.forEach(({thigh, shin, foot}, idx) => {
          thigh.rotation = now.thighs[idx]
          shin.rotation = now.knees[idx]
          // The foot's kept flat on the floor, its toes dropping a little as it swings
          // through
          const through = walking * Math.max(0, -Math.sin(phase + idx * Math.PI - 0.35)) * 0.35
          foot.rotation = -(now.thighs[idx] + now.knees[idx]) + through
        })
        // The body's as high as the longer leg reaches, so the foot taking the weight
        // stays on the floor and they rise and fall as they step
        const reach = Math.max(legReach(now.thighs[0], now.knees[0]), legReach(now.thighs[1], now.knees[1]))
        bobbing.y = -hip.y - reach - now.hop
      } else {
        // Under a long skirt, the feet step out from under its hem in turn, and it sways
        feet?.forEach((foot, idx) => {
          const at = phase + idx * Math.PI
          foot.x = -Math.cos(at) * 5.5 * walking
          foot.y = -Math.max(0, Math.sin(at)) * 1.6 * walking
        })
        bobbing.y = -Math.abs(Math.sin(phase)) * 1.2 * walking - now.hop
        lower.rotation = Math.sin(phase * 2) * 0.015 * walking
      }
      leant(body, hip, 0)
      leant(head, neck, now.head)
      arms.forEach(({upper, lower: forearm}, idx) => {
        leant(upper, shoulder, now.arms[idx])
        forearm.rotation = now.elbows[idx]
      })
      // The held diya stays upright
      held.diya.rotation = -(arms[1].upper.rotation + arms[1].lower.rotation)
      held.flame.scale.set(1 + Math.sin(time * 23) * 0.08, 1 + Math.sin(time * 17) * 0.12)
    },
    destroy() {
      root.destroy({children: true})
    },
  }
}

type Figure = ReturnType<typeof createFigure>

export {createFigure, looks, makeLook}
export type {Action, Figure, Look, Role, Who}
