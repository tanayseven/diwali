import {Application, Color, Container, defaultFilterVert, Filter, GlProgram, GpuProgram, Sprite} from "pixi.js"
import {pixelDensity} from "./app"

const highlight = 0xffd700
// How thick the outline is on screen, in CSS pixels
const thickness = 2.5
// The fainter, thinner outline round things that are still to be finished, like an
// unlit diya, which pulses between these strengths. Strong enough to stay a clean
// yellow over the night, which muddies a weaker one, but thinner than a selection's
const hintThickness = 2
const hintStrength = {least: 0.6, most: 0.9}
// How long a pulse of it takes, in ms
const hintPulse = 2400
// How opaque a part of a drawing has to be to count as solid, so the soft shadows
// some are drawn with aren't outlined
const solidAlpha = 0.75

// Draws a solid outline around whatever's at least solidAlpha opaque, in the outline's
// colour. With knockout on it draws only the outline, leaving out what's inside it
const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputClamp;
uniform vec2 uThickness;
uniform vec3 uColor;
uniform float uSolid;
uniform float uKnockout;
uniform float uStrength;

const float DOUBLE_PI = 6.28318530718;
const float ANGLE_STEP = 0.314159265;

float solidAt(vec2 at) {
    float alpha = texture(uTexture, clamp(at, uInputClamp.xy, uInputClamp.zw)).a;
    return smoothstep(uSolid - 0.15, uSolid + 0.15, alpha);
}

void main(void) {
    vec4 source = texture(uTexture, vTextureCoord);
    float around = 0.;
    for (float angle = 0.; angle < DOUBLE_PI; angle += ANGLE_STEP) {
        around = max(around, solidAt(vTextureCoord + uThickness * vec2(cos(angle), sin(angle))));
    }
    float outline = around * (1. - solidAt(vTextureCoord)) * uStrength;
    finalColor = source * (1. - uKnockout) * (1. - outline) + vec4(uColor, 1.) * outline;
}
`

// The same for WebGPU, which the app can fall back to
const wgsl = `
struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

struct OutlineUniforms {
  uThickness: vec2<f32>,
  uColor: vec3<f32>,
  uSolid: f32,
  uKnockout: f32,
  uStrength: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> outline: OutlineUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn mainVertex(@location(0) aPosition: vec2<f32>) -> VSOutput {
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  return VSOutput(vec4(position, 0.0, 1.0), aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw));
}

fn solidAt(at: vec2<f32>) -> f32 {
  let alpha = textureSample(uTexture, uSampler, clamp(at, gfu.uInputClamp.xy, gfu.uInputClamp.zw)).a;
  return smoothstep(outline.uSolid - 0.15, outline.uSolid + 0.15, alpha);
}

@fragment
fn mainFragment(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let source = textureSample(uTexture, uSampler, uv);
  var around = 0.0;
  for (var angle = 0.0; angle < 6.28318530718; angle += 0.314159265) {
    around = max(around, solidAt(uv + outline.uThickness * vec2(cos(angle), sin(angle))));
  }
  let edge = around * (1.0 - solidAt(uv)) * outline.uStrength;
  return source * (1.0 - outline.uKnockout) * (1.0 - edge) + vec4(outline.uColor, 1.0) * edge;
}
`

class OutlineFilter extends Filter {
  private readonly thickness: number

  constructor(knockout: boolean, {thickness: width = thickness, strength = 1} = {}) {
    super({
      glProgram: GlProgram.from({vertex: defaultFilterVert, fragment, name: "outline"}),
      gpuProgram: GpuProgram.from({
        vertex: {source: wgsl, entryPoint: "mainVertex"},
        fragment: {source: wgsl, entryPoint: "mainFragment"},
      }),
      resources: {
        outline: {
          uThickness: {value: new Float32Array(2), type: "vec2<f32>"},
          uColor: {value: new Float32Array(new Color(highlight).toRgbArray()), type: "vec3<f32>"},
          uSolid: {value: solidAlpha, type: "f32"},
          uKnockout: {value: knockout ? 1 : 0, type: "f32"},
          uStrength: {value: strength, type: "f32"},
        },
      },
      // Room around what's outlined for the outline itself
      padding: Math.ceil(width) + 1,
      resolution: "inherit",
    })
    this.thickness = width
  }

  set strength(value: number) {
    this.resources.outline.uniforms.uStrength = value
  }

  // The thickness is in the filtered texture's pixels, which are device pixels
  apply(...args: Parameters<Filter["apply"]>) {
    const [, input] = args
    const pixels = this.thickness * pixelDensity
    const uniforms = this.resources.outline.uniforms
    uniforms.uThickness[0] = pixels / input.source.width
    uniforms.uThickness[1] = pixels / input.source.height
    super.apply(...args)
  }
}

// Why something is outlined: hovered over, or selected (dragged, about to be used on,
// or the colour picked in a bar), or still to be finished, a hint at what to do next.
// It's outlined while any reason holds, faintly if it's only a hint
type Reason = "hover" | "selected" | "hint"

// Filters are shared, as everything outlined looks the same: one for things outlined
// as they're drawn, and one that draws only the outline, and fainter ones of each for
// hints, which pulse together
let around: OutlineFilter | undefined
let only: OutlineFilter | undefined
let faintAround: OutlineFilter | undefined
let faintOnly: OutlineFilter | undefined
// Sprites in the scene are drawn under the night, which would darken their outlines,
// so each one's outline is drawn by a copy of it on a layer above the night
let aboveNight: {scene: Container, layer: Container} | undefined
const copies = new Map<Sprite, Sprite>()

const reasons = new Map<Container, Set<Reason>>()

// Keeps the copies drawing the outlines where their sprites are
const followSprites = () => copies.forEach((copy, sprite) => {
  if (sprite.destroyed || sprite.parent !== aboveNight?.scene) {
    copy.visible = false
    return
  }
  copy.visible = sprite.visible && sprite.alpha > 0
  copy.texture = sprite.texture
  copy.anchor.copyFrom(sprite.anchor)
  copy.position.copyFrom(sprite.position)
  copy.scale.copyFrom(sprite.scale)
  copy.rotation = sprite.rotation
})

// Where sprites in the scene are placed, and a layer over the night, in the same place,
// to draw their outlines on
const outlineAboveNight = (app: Application, scene: Container, layer: Container) => {
  aboveNight = {scene, layer}
  app.ticker.add(followSprites)
}

const faint = {thickness: hintThickness, strength: hintStrength.least}

const show = (target: Container, faintly: boolean) => {
  if (aboveNight && target instanceof Sprite && target.parent === aboveNight.scene) {
    const copy = new Sprite()
    copy.eventMode = "none"
    copy.filters = [faintly ? faintOnly ??= new OutlineFilter(true, faint) : only ??= new OutlineFilter(true)]
    aboveNight.layer.addChild(copy)
    copies.set(target, copy)
    followSprites()
  } else {
    target.filters = [faintly ? faintAround ??= new OutlineFilter(false, faint) : around ??= new OutlineFilter(false)]
  }
}

// Brightens and dims the hints' outlines a little, given the time in ms
const pulseHints = (now: number) => {
  const wave = (1 - Math.cos(now / hintPulse * Math.PI * 2)) / 2
  const strength = hintStrength.least + (hintStrength.most - hintStrength.least) * wave
  ;[faintAround, faintOnly].forEach(filter => {
    if (filter) {
      filter.strength = strength
    }
  })
}

const hide = (target: Container) => {
  const copy = copies.get(target as Sprite)
  if (copy) {
    copy.destroy()
    copies.delete(target as Sprite)
  }
  if (!target.destroyed) {
    target.filters = null
  }
}

// Outlines something in yellow for a reason, or stops for that reason
const setOutline = (target: Container, reason: Reason, on: boolean) => {
  const held = reasons.get(target) ?? new Set<Reason>()
  if (on) {
    held.add(reason)
  } else {
    held.delete(reason)
  }
  // It's outlined afresh, as a sprite may have moved into or out of the scene since,
  // like one picked up off the porch to drag it
  hide(target)
  if (held.size > 0 && !target.destroyed) {
    reasons.set(target, held)
    show(target, !held.has("hover") && !held.has("selected"))
  } else {
    reasons.delete(target)
  }
}

// Runs something without the hints' outlines, such as taking a photo of the scene to share
const withoutHints = <T>(run: () => T): T => {
  const filters = [faintAround, faintOnly].filter(filter => filter !== undefined)
  filters.forEach(filter => filter.strength = 0)
  try {
    return run()
  } finally {
    pulseHints(performance.now())
  }
}

export {outlineAboveNight, pulseHints, setOutline, withoutHints}
