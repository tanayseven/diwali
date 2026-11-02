import {Application, UPDATE_PRIORITY} from "pixi.js"
import Matter from "matter-js"
import {quality} from "./app"

const {Bodies, Body, Composite, Engine} = Matter

// What hangs from strings, the fairy lights and the kandils, is moved by Matter.js, in
// worlds of its own: each its own engine with its own gravity, stepped together a fixed
// 60 times a second whatever the frame rate, so it swings the same on every screen.
// Stepping by each frame's own length instead costs twice as much whenever a frame runs
// a little long, which then makes the next one long too. After a slow frame only a
// step or two are caught up, so a stall doesn't snowball into a longer one
const stepMs = 1000 / 60
const maxStepsPerFrame = quality.physicsCatchUp
// Matter keeps speeds in units per 60th of a second
const baseStepsPerSecond = 60

const perStep = (perSecond: number) => perSecond / baseStepsPerSecond
const perSecond = (perStep: number) => perStep * baseStepsPerSecond

type WorldOptions = {
  // Downwards, in scene units a second squared
  gravity?: number
  // How many times a step constraints are worked out, for ropes that shouldn't stretch
  constraintIterations?: number
}

type World = ReturnType<typeof createWorld>

const worlds = new Set<World>()
let stepping: (() => void) | undefined
let owed = 0

// Steps every world from one ticker, before anything that draws what's in them
const startStepping = (app: Application) => {
  if (stepping) {
    return
  }
  stepping = () => {
    owed = Math.min(owed + app.ticker.deltaMS, stepMs * maxStepsPerFrame)
    while (owed >= stepMs) {
      owed -= stepMs
      worlds.forEach(world => world.step())
    }
  }
  app.ticker.add(stepping, undefined, UPDATE_PRIORITY.HIGH)
}

const createWorld = (app: Application, {gravity = 0, constraintIterations = 2}: WorldOptions = {}) => {
  // Gravity is an acceleration in units a millisecond squared, as Matter has it
  const engine = Engine.create({gravity: {x: 0, y: 1, scale: gravity / 1e6}, constraintIterations, enableSleeping: false})
  const beforeStep = new Set<() => void>()
  const world = {
    engine,
    // How long a step is, in seconds
    dt: stepMs / 1000,
    // A world with nothing in it isn't stepped, so it costs nothing until something's hung
    step() {
      if (engine.world.bodies.length === 0) {
        return
      }
      beforeStep.forEach(callback => callback())
      Engine.update(engine, stepMs)
    },
    // Called before every step, to push what's in the world about
    onStep(callback: () => void) {
      beforeStep.add(callback)
      return () => beforeStep.delete(callback)
    },
    add(...items: (Matter.Body | Matter.Constraint)[]) {
      Composite.add(engine.world, items)
    },
    remove(...items: (Matter.Body | Matter.Constraint)[]) {
      Composite.remove(engine.world, items)
    },
    destroy() {
      worlds.delete(world)
      Engine.clear(engine)
    },
  }
  worlds.add(world)
  startStepping(app)
  return world
}

// What hangs from strings on the house, the fairy lights' ropes and the kandils, all
// swings in one world, sharing its cost: gravity as the porch has it, in scene units a
// second squared, and lengths of string worked out several times a step so they don't
// stretch
let hanging: World | undefined
const hangingWorld = (app: Application) =>
  hanging ??= createWorld(app, {gravity: 780, constraintIterations: quality.ropeIterations})

// A small round weight that touches nothing and never turns
const createParticleBody = (radius = 0.5) => {
  const body = Bodies.circle(0, 0, radius, {
    frictionAir: 0, friction: 0, frictionStatic: 0, restitution: 0, collisionFilter: {category: 1, mask: 0, group: 0},
  })
  Body.setInertia(body, Infinity)
  return body
}

// Puts a body somewhere at a velocity in units a second
const place = (body: Matter.Body, x: number, y: number, vx: number, vy: number) => {
  Body.setPosition(body, {x, y})
  Body.setVelocity(body, {x: perStep(vx), y: perStep(vy)})
}

// A body's velocity in units a second
const velocityOf = (body: Matter.Body) => {
  const {x, y} = Body.getVelocity(body)
  return {x: perSecond(x), y: perSecond(y)}
}

// Pushes a body this step so it speeds up by this much, in units a second, as an
// acceleration over the step would, through a force Matter applies as it steps: a
// force moves a body on by force / mass times the step squared more each step
const accelerate = (body: Matter.Body, dvx: number, dvy: number) => {
  body.force.x += body.mass * dvx / (1000 * stepMs)
  body.force.y += body.mass * dvy / (1000 * stepMs)
}

// Air resistance as a share of speed lost a second, as Matter's friction per 60th of a
// second, which it scales to its steps
const airFriction = (perSecondShare: number) => Math.min(1, perSecondShare / baseStepsPerSecond)

export {accelerate, airFriction, createParticleBody, hangingWorld, place, velocityOf}
export type {World}
