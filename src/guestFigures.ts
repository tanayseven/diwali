import {Container, Graphics, GraphicsPath, PointData} from "pixi.js"

// The guests on the porch, each drawn side-on facing right, in their own units with
// their feet at (0, 0) and standing about 105 tall. Each is put together from parts
// that turn about their joints: the legs at the hip, the arms at the shoulder, the head
// at the neck, and the body leaning over at the hips, so they can walk, cheer, point
// and bend down to put a diya on the floor

type Shape =
  | {path: string, fill: number, alpha?: number}
  | {line: string, color: number, width: number}
  | {ellipse: [number, number, number, number], fill: number}
  | {rect: [number, number, number, number], fill: number, radius?: number}

const hip = {x: 0, y: -50}
const shoulder = {x: 1, y: -82}
const neck = {x: 1, y: -89}
const hand = {x: 1, y: -49}

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
// and its drawing is moved back by as much, so the drawing's own units still hold
const part = (shapes: Shape[], joint: PointData = {x: 0, y: 0}) => {
  const container = new Container()
  container.position.set(joint.x, joint.y)
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

const legShapes = ({cloth, hem, sandal: sandalColour, width = 7, hemHeight = 4}: Leg, tone: Tone): Shape[] => [
  {path: `M${-width} -52 L${width} -52 L${width + 1} -6 L${-width - 1} -6 Z`, fill: cloth},
  {rect: [-width - 1, -6 - hemHeight, 2 * width + 2, hemHeight], fill: hem},
  {rect: [-2.5, -6, 5, 4], fill: tone.skin},
  sandal(sandalColour),
]

const armShapes = ({sleeve, cuff, sleeveEnd = -53, bangles}: Arm, tone: Tone): Shape[] => [
  {rect: [-2.6, -82, 6.2, 31], fill: tone.skin, radius: 3},
  {path: `M-3.4 -84 L5.4 -84 L4.4 ${sleeveEnd} L-2.4 ${sleeveEnd} Z`, fill: sleeve},
  {rect: [-2.4, sleeveEnd - 2.5, 6.8, 2.5], fill: cuff},
  ...(bangles ? [{rect: [-3.2, sleeveEnd - 1, 6.4, 2.2], fill: bangles} as Shape] : []),
  {ellipse: [1, -49, 3.4, 3.4], fill: tone.skin},
]

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

// How someone looks: their skin, hair and what's on their face, what they wear, how
// big they are next to a grown-up, and how long a stride takes them
type Look = {tone: Tone, hair: Shape[], outfit: Outfit, size: number, stride: number}

const look = (
  tone: number, style: HairStyle, hairColour: number, outfit: Outfit, size: number, stride: number,
  extras: Shape[] = [],
): Look => ({tone: tones[tone], hair: [...hairStyles[style](hairColour), ...extras], outfit, size, stride})

// The first house's family, each drawn to suit them
const looks = {
  grandfather: look(2, "bald", grey, outfits.dhotiKurta(0xd9541e, 0xf29a1f, 0xf0dca8, 0xe8890c), 1, 0.95, [moustache(white)]),
  grandson: look(2, "boy", black, outfits.dhotiKurta(0xd9541e, 0xf29a1f, 0xf0dca8, 0xe8890c), 0.66, 0.55),
  sari: look(2, "bun", black, outfits.sari(0xc2255c, 0xf2c14e, 0x7b1640), 0.97, 0.75, [bindi]),
  youngMan: look(2, "short", 0x1b1411, outfits.kurtaPyjama(0x2f6db5, 0xf2c14e, 0xf3efe6), 1.03, 0.7),
  girl: look(2, "plait", black, outfits.lehenga(0x2b8a3e, 0xf2c14e, 0xf08c00, 0xffd43b), 0.8, 0.6),
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
      ? look(tone, "turban", pick([0xf08c00, 0xc92a2a, 0xfab005, 0xffffff, 0x1864ab]), outfits.kurtaPyjama(pick(creams), pick(golds), pick(creams), random() < 0.6 ? pick(darks) : undefined), 1, 0.95, beard(white))
      : look(tone, "bald", grey, outfits.dhotiKurta(pick([bright(), pick(creams)]), pick(golds), pick(creams), bright()), 1, 0.95, random() < 0.5 ? [moustache(white), ...glasses] : [moustache(white)])
  case "grandmother":
    return look(tone, "bun", grey, outfits.sari(pick([pick(creams), bright()]), bright(), bright()), 0.94, 0.95, random() < 0.6 ? [...glasses, bindi] : [bindi])
  case "man": {
    const kind = random()
    return kind < 0.4
      ? look(tone, random() < 0.2 ? "turban" : "short", random() < 0.2 ? bright() : hair, outfits.kurtaPyjama(bright(), pick(golds), pick(creams), random() < 0.4 ? pick(darks) : undefined), 1.02, 0.72, random() < 0.4 ? [moustache(hair)] : random() < 0.3 ? beard(hair) : [])
      : kind < 0.7
        ? look(tone, "short", hair, outfits.shirtTrousers(pick([bright(), pick(creams)]), pick(darks)), 1.02, 0.7, random() < 0.4 ? [moustache(hair)] : [])
        : look(tone, "short", hair, outfits.dhotiKurta(bright(), pick(golds), pick(creams), pick(golds)), 1, 0.75, random() < 0.5 ? [moustache(hair)] : [])
  }
  case "woman":
    return random() < 0.55
      ? look(tone, pick<HairStyle>(["bun", "plait", "open"]), hair, outfits.sari(bright(), pick(golds), bright()), 0.97, 0.75, [bindi])
      : look(tone, pick<HairStyle>(["plait", "open", "bun"]), hair, outfits.salwarKameez(bright(), pick([pick(creams), bright()]), bright()), 0.97, 0.72, random() < 0.6 ? [bindi] : [])
  case "teen":
    return random() < 0.5
      ? look(tone, "spiky", hair, outfits.shirtTrousers(bright(), pick(darks)), 0.9, 0.62)
      : look(tone, pick<HairStyle>(["plait", "open"]), hair, outfits.lehenga(bright(), pick(golds), bright(), pick(golds)), 0.88, 0.62)
  case "boy":
    return random() < 0.5
      ? look(tone, "boy", hair, outfits.kurtaPyjama(bright(), pick(golds), pick(creams)), 0.66, 0.55)
      : look(tone, "boy", hair, outfits.dhotiKurta(bright(), pick(golds), pick(creams), bright()), 0.66, 0.55)
  case "girl":
    return look(tone, "plait", hair, outfits.lehenga(bright(), pick(golds), bright(), pick(golds)), 0.68, 0.55)
  }
}

// What a guest's doing with their arms and body, besides walking
type Action =
  | "idle" | "cheer" | "clap" | "startle" | "namaste" | "bend" | "carry" | "talk"
  | {point: PointData}

const easeRate = 9

// A small diya held in the hand, lit, kept upright however the arm's turned
const heldDiya = () => {
  const diya = new Container()
  const bowl = new Graphics()
    .path(new GraphicsPath("M-6 -1 Q0 6 6 -1 Z")).fill(0xb5532a)
    .path(new GraphicsPath("M-6 -1 L6 -1 L5 -2.2 L-5 -2.2 Z")).fill(0x8a3d1f)
  const flame = new Graphics().path(new GraphicsPath("M0 -2 Q-2.6 -6 0 -10.5 Q2.6 -6 0 -2 Z")).fill(0xffc04a)
  diya.addChild(bowl, flame)
  // In the hand, on the arm, which turns about the shoulder
  diya.position.set(hand.x - shoulder.x + 3, hand.y - shoulder.y + 3)
  diya.visible = false
  return {diya, flame}
}

const createFigure = (look: Look) => {
  const {tone, outfit} = look
  const root = new Container()
  const shadow = new Graphics().ellipse(0, 0, 15, 3.2).fill({color: 0x000000, alpha: 0.28})
  // Everything that bobs as they walk or hop, over the shadow that stays on the floor
  const bobbing = new Container()
  root.addChild(shadow, bobbing)
  const backArm = part(armShapes(outfit.arms[0], tone), shoulder)
  const frontArm = part(armShapes(outfit.arms[1], tone), shoulder)
  const legs = outfit.legs?.map(leg => part(legShapes(leg, tone), hip))
  const feet = outfit.feet?.map(colour => part([sandal(colour)]))
  const lower = part(outfit.lower)
  const body = part(outfit.body, hip)
  const head = part(headShapes(tone, look.hair), neck)
  const held = heldDiya()
  frontArm.addChild(held.diya)
  bobbing.addChild(backArm, ...(legs ?? []), ...(feet ?? []), lower, body, head, frontArm)
  // Every part that moves, in the same order in every figure of the same look, for a
  // copy to take the same pose
  const moving = [bobbing, backArm, frontArm, ...(legs ?? []), ...(feet ?? []), body, head, held.diya, held.flame]

  // How each part's turned now, eased towards where the pose wants it
  const now = {legs: 0, backArm: 0, frontArm: 0, head: 0, lean: 0, lift: 0}
  let phase = Math.random() * Math.PI * 2
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
    // Moves the pose on by a frame, walking at a speed from 0 (standing) to 1 (a full
    // stride), which sets how far the legs swing as well as how fast
    update(dt: number, walking: number) {
      time += dt
      phase += dt * Math.PI * 2 / look.stride * Math.max(walking, 0)
      const swing = Math.sin(phase) * walking
      const target = {legs: swing * 0.4, backArm: swing * 0.35, frontArm: -swing * 0.35, head: 0, lean: 0, lift: 0}
      // Standing, a little sway
      if (walking < 0.05) {
        target.backArm = Math.sin(time * 1.3) * 0.04
        target.frontArm = -Math.sin(time * 1.3) * 0.04
      }
      if (action === "cheer") {
        target.backArm = -2.75 + Math.sin(time * 9) * 0.2
        target.frontArm = -2.55 - Math.sin(time * 9) * 0.2
        target.head = -0.15
        target.lift = Math.abs(Math.sin(time * 5.5)) * 5
      } else if (action === "clap") {
        const clap = Math.sin(time * 14) * 0.18
        target.backArm = -1.15 + clap
        target.frontArm = -1.15 - clap
        target.head = -0.08
      } else if (action === "startle") {
        target.backArm = -2.85
        target.frontArm = -2.95
        target.lean = -0.12
        target.lift = 3
      } else if (action === "namaste") {
        target.backArm = -0.95
        target.frontArm = -0.95
        target.lean = 0.12
        target.head = 0.1
      } else if (action === "bend") {
        target.lean = 0.6
        target.frontArm = -0.55
        target.backArm = -0.2
        target.head = 0.2
        target.legs = 0
      } else if (action === "carry") {
        target.frontArm = -1.05
      } else if (action === "talk") {
        target.frontArm = -0.7 + Math.sin(time * 4.2) * 0.3
        target.head = Math.sin(time * 2.1) * 0.06
      } else if (typeof action === "object") {
        // Their arm out towards it, and their head turned up to it. The point's in the
        // root's parent, and they're turned to face it already
        const at = root.parent ? root.toLocal(action.point, root.parent) : action.point
        const angle = Math.atan2(at.y - shoulder.y, Math.abs(at.x - shoulder.x))
        target.frontArm = Math.min(-0.3, angle - Math.PI / 2)
        target.head = Math.max(-0.45, Math.min(0.2, angle * 0.5))
      }
      const ease = 1 - Math.exp(-easeRate * dt)
      ;(Object.keys(now) as (keyof typeof now)[]).forEach(key => {
        now[key] += (target[key] - now[key]) * ease
      })
      // A walk bobs up and down twice a stride
      bobbing.y = -Math.abs(Math.sin(phase)) * 1.4 * walking - now.lift
      legs?.forEach((leg, idx) => leg.rotation = idx === 0 ? now.legs : -now.legs)
      feet?.forEach((foot, idx) => foot.x = (idx === 0 ? 1 : -1) * Math.sin(phase) * 5 * walking)
      leant(body, hip, 0)
      leant(head, neck, now.head)
      leant(backArm, shoulder, now.backArm)
      leant(frontArm, shoulder, now.frontArm)
      // The held diya stays upright
      held.diya.rotation = -frontArm.rotation
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
