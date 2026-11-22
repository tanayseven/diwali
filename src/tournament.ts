import {fontFamily} from "./app"
import type {Background} from "./background"
import {LL} from "./locale"
import type {Decoration} from "./neighbours"
import {onProgress, Progress} from "./progress"

// What a round ends with: another round, or free play from where it got to
type Outcome = "again" | "free"

const highlight = "#ffd700"
const fadeDuration = 400
// How long a round lasts, in seconds, unless the URL says otherwise (?round=5), as the
// tests do, so a round's over quickly
const defaultRoundSeconds = 60
const roundSeconds = (() => {
  const asked = Number(new URLSearchParams(window.location.search).get("round"))
  return asked > 0 ? asked : defaultRoundSeconds
})()
// Counted down before the round starts, one a second, then "Go!"
const countdownFrom = 3
// Points for what the player does, each up to so many times, so lighting diya after diya
// can't outscore decorating the house
const playerPoints: Partial<Record<Progress, {points: number, most: number}>> = {
  diyaLit: {points: 10, most: 12},
  fireworkLit: {points: 15, most: 8},
  kandilLit: {points: 50, most: 4},
  lightsHung: {points: 30, most: 6},
  rangoliPlaced: {points: 40, most: 3},
}
// And for what a neighbour puts up
const neighbourPoints: Record<Decoration["kind"], number> = {lights: 30, kandil: 50, rangoli: 40}
// How each neighbour goes about it: how many seconds in they start, and by what share of
// the round they'd be done, if the round went on that long. None gets through it all in
// a round: from about half to three quarters of their decorations. Each round, a little
// different
const paces = [
  {start: 8, done: 1.3},
  {start: 12, done: 1.6},
  {start: 6, done: 1.4},
  {start: 14, done: 1.8},
  {start: 10, done: 1.5},
]
const paceJitter = 0.15

type Contender = {idx: number, name: string, points: number, player: boolean}

// A pill at the top of the screen with the time left, the player's points, and who's
// ahead of them, if anyone is
const createRoundHud = () => {
  const hud = document.createElement("div")
  hud.setAttribute("role", "status")
  Object.assign(hud.style, {
    position: "fixed",
    top: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "6px 16px",
    borderRadius: "22px",
    border: `2px solid ${highlight}`,
    background: "rgba(26, 26, 26, 0.85)",
    color: "#ffffff",
    fontFamily,
    fontSize: "min(20px, 5vh)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  })
  const time = document.createElement("span")
  Object.assign(time.style, {color: highlight, fontVariantNumeric: "tabular-nums", minWidth: "2.6em"})
  const mine = document.createElement("span")
  const leader = document.createElement("span")
  Object.assign(leader.style, {opacity: "0.85"})
  hud.append(time, mine, leader)
  document.body.appendChild(hud)
  return {
    show(secondsLeft: number, contenders: Contender[]) {
      const whole = Math.max(0, Math.ceil(secondsLeft))
      time.textContent = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
      const player = contenders.find(({player}) => player)
      mine.textContent = `${LL.tournament.you()} ${player?.points ?? 0}`
      const best = [...contenders].filter(({player}) => !player).sort((a, b) => b.points - a.points)[0]
      leader.textContent = best && best.points > (player?.points ?? 0) ? `🏆 ${best.name} ${best.points}` : ""
    },
    remove: () => hud.remove(),
  }
}

// "3", "2", "1", "Go!" in the middle of the screen, resolving as "Go!" shows
const countDown = () => new Promise<void>(resolve => {
  const shown = document.createElement("div")
  shown.setAttribute("aria-live", "assertive")
  Object.assign(shown.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: highlight,
    fontFamily,
    fontSize: "min(140px, 30vh)",
    textShadow: "0 4px 18px rgba(0, 0, 0, 0.8)",
    pointerEvents: "none",
    transition: "opacity 300ms ease-out, transform 300ms ease-out",
  })
  document.body.appendChild(shown)
  const at = (count: number) => {
    shown.textContent = count > 0 ? String(count) : LL.tournament.go()
    shown.style.opacity = "1"
    shown.style.transform = "scale(1)"
    requestAnimationFrame(() => requestAnimationFrame(() => {
      shown.style.opacity = "0"
      shown.style.transform = "scale(1.6)"
    }))
    if (count > 0) {
      setTimeout(() => at(count - 1), 1000)
    } else {
      resolve()
      setTimeout(() => shown.remove(), 1000)
    }
  }
  at(countdownFrom)
})

// Every house, best first, with the winner named, and a choice of another round or free
// play. Resolves with the choice
const showResults = (contenders: Contender[]) => new Promise<Outcome>(resolve => {
  const ranked = [...contenders].sort((a, b) => b.points - a.points || Number(b.player) - Number(a.player))
  const winner = ranked[0]
  const overlay = document.createElement("div")
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", LL.tournament.results())
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "3",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "min(10px, 2vh)",
    padding: "16px",
    boxSizing: "border-box",
    background: "rgba(11, 16, 48, 0.82)",
    color: "#ffffff",
    fontFamily,
    textAlign: "center",
    opacity: "0",
    transition: `opacity ${fadeDuration}ms ease-in-out`,
  })
  const heading = document.createElement("h1")
  heading.textContent = winner.player ? LL.tournament.youWin() : LL.tournament.houseWins({house: winner.name})
  Object.assign(heading.style, {margin: "0", fontSize: "min(44px, 9vh)", fontWeight: "normal", lineHeight: "1.1", color: highlight})
  const table = document.createElement("ol")
  Object.assign(table.style, {
    listStyle: "none",
    margin: "0",
    padding: "0",
    width: "min(420px, 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "min(4px, 0.8vh)",
  })
  ranked.forEach(contender => {
    const row = document.createElement("li")
    Object.assign(row.style, {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "min(4px, 0.8vh) 14px",
      borderRadius: "12px",
      border: `2px solid ${contender.player ? highlight : "transparent"}`,
      background: "rgba(26, 26, 26, 0.85)",
      fontSize: "min(20px, 4.6vh)",
      color: contender.player ? highlight : "#ffffff",
    })
    const name = document.createElement("span")
    // Houses with the same points share a place
    const shared = ranked.findIndex(({points}) => points === contender.points)
    name.textContent = `${shared + 1}. ${contender.player ? `${contender.name} (${LL.tournament.you()})` : contender.name}`
    const points = document.createElement("span")
    points.textContent = String(contender.points)
    Object.assign(points.style, {fontVariantNumeric: "tabular-nums"})
    row.append(name, points)
    table.appendChild(row)
  })
  const buttons = document.createElement("div")
  Object.assign(buttons.style, {display: "flex", gap: "12px", marginTop: "min(6px, 1vh)"})
  const button = (label: string, outcome: Outcome, main: boolean) => {
    const pressed = document.createElement("button")
    pressed.type = "button"
    pressed.textContent = label
    Object.assign(pressed.style, {
      padding: "min(8px, 1.6vh) 22px",
      borderRadius: "22px",
      border: `2px solid ${highlight}`,
      background: main ? highlight : "rgba(26, 26, 26, 0.85)",
      color: main ? "#1a1448" : highlight,
      fontFamily,
      fontSize: "min(20px, 4.6vh)",
      cursor: "pointer",
    })
    pressed.addEventListener("click", () => {
      if (performance.now() < readyAt) {
        return
      }
      overlay.style.opacity = "0"
      setTimeout(() => {
        overlay.remove()
        resolve(outcome)
      }, fadeDuration)
    })
    buttons.appendChild(pressed)
    return pressed
  }
  const again = button(LL.tournament.playAgain(), "again", true)
  button(LL.modeMenu.freePlay(), "free", false)
  // Taps only count once it's faded in, so one meant for the scene doesn't land here
  const readyAt = performance.now() + fadeDuration
  overlay.append(heading, table, buttons)
  document.body.appendChild(overlay)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = "1"
    again.focus()
  }))
})

// One round against the neighbours: a countdown, then the round's time to decorate the
// player's house, scored by what they light, hang and draw, while each neighbour puts up
// their own decorations at their own pace. Every house's points show at the end, with a
// choice of another round or free play
const runTournamentRound = async (background: Background, neighbours: Decoration[][]): Promise<Outcome> => {
  const contenders: Contender[] = background.houses.map(({name}, idx) => ({
    idx, name: LL.houses[name](), points: 0, player: idx === background.home(),
  }))
  const player = contenders.find(({player}) => player)!
  const hud = createRoundHud()
  hud.show(roundSeconds, contenders)
  await countDown()

  // What the player's done so far, each counted up to its most
  const done = new Map<Progress, number>()
  const stopListening = onProgress(progress => {
    const scored = playerPoints[progress]
    const times = done.get(progress) ?? 0
    if (!scored || times >= scored.most) {
      return
    }
    done.set(progress, times + 1)
    player.points += scored.points
  })
  // When each neighbour puts up each of its decorations, spread over its share of the
  // round, from when it starts. What it doesn't get to in time isn't put up
  let paceIdx = 0
  const planned = neighbours.flatMap((decorations, idx) => {
    if (decorations.length === 0) {
      return []
    }
    const pace = paces[paceIdx++ % paces.length]
    const jitter = 1 + (Math.random() * 2 - 1) * paceJitter
    const start = pace.start * jitter
    const finish = roundSeconds * pace.done * jitter
    // Shorter rounds start the neighbours sooner, keeping their share of the round
    const scale = Math.min(1, roundSeconds / defaultRoundSeconds)
    return decorations.map((decoration, k) => ({
      at: start * scale + (k + 1) / decorations.length * (finish - start * scale),
      idx,
      decoration,
    }))
  }).sort((a, b) => a.at - b.at)

  const startedAt = performance.now()
  await new Promise<void>(resolve => {
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000
      while (planned.length > 0 && planned[0].at <= elapsed && elapsed < roundSeconds) {
        const {idx, decoration} = planned.shift()!
        decoration.put()
        contenders[idx].points += neighbourPoints[decoration.kind]
      }
      hud.show(roundSeconds - elapsed, contenders)
      if (elapsed >= roundSeconds) {
        resolve()
      } else {
        setTimeout(tick, 100)
      }
    }
    tick()
  })
  stopListening()
  hud.remove()
  return showResults(contenders)
}

export {runTournamentRound}
export type {Outcome}
