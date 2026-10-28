import {Application, Color, Container, defaultFilterVert, Filter, GlProgram, GpuProgram, Sprite} from "pixi.js"
import {pixelDensity} from "./app"

const highlight = 0xffd700
// How thick the outline is on screen, in CSS pixels
const thickness = 2.5
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
    float outline = around * (1. - solidAt(vTextureCoord));
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
  let edge = around * (1.0 - solidAt(uv));
  return source * (1.0 - outline.uKnockout) * (1.0 - edge) + vec4(outline.uColor, 1.0) * edge;
}
`

class OutlineFilter extends Filter {
  constructor(knockout: boolean) {
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
        },
      },
      // Room around what's outlined for the outline itself
      padding: Math.ceil(thickness) + 1,
      resolution: "inherit",
    })
  }

  // The thickness is in the filtered texture's pixels, which are device pixels
  apply(...args: Parameters<Filter["apply"]>) {
    const [, input] = args
    const pixels = thickness * pixelDensity
    const uniforms = this.resources.outline.uniforms
    uniforms.uThickness[0] = pixels / input.source.width
    uniforms.uThickness[1] = pixels / input.source.height
    super.apply(...args)
  }
}

// Why something is outlined: hovered over, or selected (dragged, about to be used on,
// or the colour picked in a bar). It's outlined while any reason holds
type Reason = "hover" | "selected"

// Filters are shared, as everything outlined looks the same: one for things outlined
// as they're drawn, and one that draws only the outline
let around: OutlineFilter | undefined
let only: OutlineFilter | undefined
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

const show = (target: Container) => {
  if (aboveNight && target instanceof Sprite && target.parent === aboveNight.scene) {
    const copy = new Sprite()
    copy.eventMode = "none"
    only ??= new OutlineFilter(true)
    copy.filters = [only]
    aboveNight.layer.addChild(copy)
    copies.set(target, copy)
    followSprites()
  } else {
    around ??= new OutlineFilter(false)
    target.filters = [around]
  }
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
    show(target)
  } else {
    reasons.delete(target)
  }
}

export {outlineAboveNight, setOutline}
