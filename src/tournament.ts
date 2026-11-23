import {Text} from "pixi.js"
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

// The button that shows the whole street, at the left of the round's pill
const streetIconUrl = "sprites/icons/street.svg"
// A "+N" rising from above a house as it scores, over this long, in ms, this far, in
// pixels on screen, at this size, whatever the zoom
const popDuration = 1200
const popRise = 40
const popSize = 26
// Each thing a neighbour does, said under the pill for this long, in ms
const feedShown = 3000
// Over each house while the street's shown, its name and points, at this size on screen
const labelSize = 22
// Races open to every house, twice a round, at these shares of the way through it, each
// for this long, in seconds, or what's left of the round, for this many points to whoever
// does it first. The neighbours react after this long, in seconds, by their pace, give
// or take a little, and never sooner than the quickest, leaving the player time to pick
// the tool and do it, so they win about half of them
const challengeAt = [0.25, 0.58]
const challengeSeconds = 10
const challengePoints = 50
const reactions = [7, 10, 6, 12, 8]
const reactionJitter = 1.5
const quickestReaction = 5
// What a race can be, by what the player does to win it. A race asked for in the URL
// (?challenge=rangoli) is the first one every time, as the tests ask
type Challenge = Decoration["kind"]
const challengeFor: Record<Challenge, Progress> = {kandil: "kandilLit", lights: "lightsHung", rangoli: "rangoliPlaced"}
const askedChallenge = (() => {
  const asked = new URLSearchParams(window.location.search).get("challenge")
  return asked && asked in challengeFor ? asked as Challenge : undefined
})()

// A pill at the top of the screen with the time left, the player's points, and who's
// ahead of them, if anyone is
const createRoundHud = (background: Background) => {
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
  // The whole street, shown and put away, the button lit while it's shown
  const street = document.createElement("button")
  street.type = "button"
  street.setAttribute("aria-label", LL.tournament.street())
  street.setAttribute("aria-pressed", "false")
  Object.assign(street.style, {
    pointerEvents: "auto",
    width: "min(36px, 9vh)",
    height: "min(36px, 9vh)",
    marginLeft: "-8px",
    padding: "4px",
    borderRadius: "50%",
    border: "2px solid transparent",
    background: `url(${streetIconUrl}) center / 74% no-repeat`,
    cursor: "pointer",
  })
  street.addEventListener("click", () => background.showStreet(!background.isStreetShown()))
  const stopStreet = background.onStreet(shown => {
    street.setAttribute("aria-pressed", String(shown))
    street.style.borderColor = shown ? highlight : "transparent"
    showArrows()
  })
  // Arrows either side of the screen, while the street's shown, sliding it a house along
  const arrow = (by: -1 | 1) => {
    const pressed = document.createElement("button")
    pressed.type = "button"
    pressed.textContent = by < 0 ? "‹" : "›"
    pressed.setAttribute("aria-label", by < 0 ? LL.tournament.streetLeft() : LL.tournament.streetRight())
    Object.assign(pressed.style, {
      position: "fixed",
      top: "50%",
      [by < 0 ? "left" : "right"]: "12px",
      transform: "translateY(-50%)",
      zIndex: "2",
      width: "min(52px, 13vh)",
      height: "min(52px, 13vh)",
      borderRadius: "50%",
      border: `2px solid ${highlight}`,
      background: "rgba(26, 26, 26, 0.85)",
      color: highlight,
      fontFamily,
      fontSize: "min(36px, 9vh)",
      lineHeight: "1",
      cursor: "pointer",
      display: "none",
    })
    pressed.addEventListener("click", () => background.slideStreet(by))
    document.body.appendChild(pressed)
    return pressed
  }
  const arrows = {left: arrow(-1), right: arrow(1)}
  // Each shown while the street's shown, if it can go any further that way
  const showArrows = () => {
    const shown = background.isStreetShown() && street.getAttribute("aria-pressed") === "true"
    arrows.left.style.display = shown && background.canSlideStreet(-1) ? "block" : "none"
    arrows.right.style.display = shown && background.canSlideStreet(1) ? "block" : "none"
  }
  const time = document.createElement("span")
  Object.assign(time.style, {color: highlight, fontVariantNumeric: "tabular-nums", minWidth: "2.6em"})
  const mine = document.createElement("span")
  const leader = document.createElement("span")
  Object.assign(leader.style, {opacity: "0.85"})
  hud.append(street, time, mine, leader)
  // What a neighbour's just done, under the pill, fading after a while
  const feed = document.createElement("div")
  feed.setAttribute("aria-live", "polite")
  Object.assign(feed.style, {
    position: "fixed",
    top: "calc(10px + min(36px, 9vh) + 22px)",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2",
    padding: "2px 12px",
    borderRadius: "12px",
    background: "rgba(26, 26, 26, 0.7)",
    color: "#ffffff",
    fontFamily,
    fontSize: "min(16px, 4vh)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 300ms ease-in-out",
  })
  let feedTimer: ReturnType<typeof setTimeout> | undefined
  // A race open to every house, under the pill, with what's left of its time running out
  // along its bottom, and the feed moved down below it while it's there
  const banner = document.createElement("div")
  banner.setAttribute("role", "alert")
  Object.assign(banner.style, {
    position: "fixed",
    top: "calc(10px + min(36px, 9vh) + 22px)",
    left: "50%",
    transform: "translateX(-50%) translateY(-8px)",
    zIndex: "2",
    padding: "4px 16px 8px",
    borderRadius: "14px",
    border: `2px solid ${highlight}`,
    background: "rgba(74, 29, 16, 0.92)",
    color: highlight,
    fontFamily,
    fontSize: "min(20px, 4.8vh)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    overflow: "hidden",
    opacity: "0",
    transition: "opacity 250ms ease-out, transform 250ms ease-out",
  })
  const bannerText = document.createElement("span")
  const timeBar = document.createElement("div")
  Object.assign(timeBar.style, {
    position: "absolute",
    left: "0",
    bottom: "0",
    height: "4px",
    width: "100%",
    background: highlight,
    transformOrigin: "left",
  })
  banner.append(bannerText, timeBar)
  let bannerTimer: ReturnType<typeof setTimeout> | undefined
  // S shows the street, or puts it away, as the button does, and the arrow keys slide it
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return
    }
    if (e.key === "s" || e.key === "S") {
      background.showStreet(!background.isStreetShown())
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      background.slideStreet(e.key === "ArrowLeft" ? -1 : 1)
    }
  }
  window.addEventListener("keydown", onKey)
  document.body.append(hud, feed, banner)
  // Over each house, its name and points, seen while the street's shown, the same size
  // on screen whatever the zoom, and above the night, the player's own in gold
  const labels = background.houses.map(({left, top, width}, idx) => {
    const label = new Text({
      text: "",
      style: {fontFamily, fontSize: labelSize, fill: 0xffffff, stroke: {color: 0x1a1a1a, width: 5}, align: "center"},
      anchor: {x: 0.5, y: 1},
    })
    label.eventMode = "none"
    label.zIndex = 10000
    label.visible = false
    background.decorations.addChild(label)
    return {label, at: {x: left + width / 2, y: top}, idx}
  })
  let labelling = true
  const placeLabels = () => {
    if (!labelling) {
      return
    }
    const shown = street.getAttribute("aria-pressed") === "true"
    const scale = 1 / background.scale()
    labels.forEach(({label, at}) => {
      label.visible = shown
      label.scale.set(scale)
      label.position.set(at.x, at.y - 10 * scale)
    })
    showArrows()
    requestAnimationFrame(placeLabels)
  }
  placeLabels()
  return {
    show(secondsLeft: number, contenders: Contender[]) {
      contenders.forEach(({idx, name, points, player}) => {
        const {label} = labels[idx]
        label.text = `${player ? LL.tournament.you() : name}\n${points}`
        label.style.fill = player ? highlight : "#ffffff"
      })
      const whole = Math.max(0, Math.ceil(secondsLeft))
      time.textContent = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
      const player = contenders.find(({player}) => player)
      mine.textContent = `${LL.tournament.you()} ${player?.points ?? 0}`
      const best = [...contenders].filter(({player}) => !player).sort((a, b) => b.points - a.points)[0]
      leader.textContent = best && best.points > (player?.points ?? 0) ? `🏆 ${best.name} ${best.points}` : ""
    },
    say(line: string) {
      feed.textContent = line
      feed.style.opacity = "1"
      clearTimeout(feedTimer)
      feedTimer = setTimeout(() => feed.style.opacity = "0", feedShown)
    },
    // A race opened, said with how much it's worth
    challenge(line: string) {
      clearTimeout(bannerTimer)
      bannerText.textContent = line
      timeBar.style.transform = "scaleX(1)"
      timeBar.style.visibility = "visible"
      banner.style.opacity = "1"
      banner.style.transform = "translateX(-50%) translateY(0)"
      feed.style.top = "calc(10px + min(36px, 9vh) + 22px + min(20px, 4.8vh) + 24px)"
    },
    // How much of the race's time is left, from 1 down to 0
    challengeLeft(share: number) {
      timeBar.style.transform = `scaleX(${Math.max(0, share)})`
    },
    // The race over: who won it, said for a moment, or put away straight away if no one did
    endChallenge(line?: string) {
      const hide = () => {
        banner.style.opacity = "0"
        banner.style.transform = "translateX(-50%) translateY(-8px)"
        feed.style.top = "calc(10px + min(36px, 9vh) + 22px)"
      }
      if (line) {
        bannerText.textContent = line
        timeBar.style.visibility = "hidden"
        bannerTimer = setTimeout(hide, feedShown)
      } else {
        hide()
      }
    },
    remove() {
      labelling = false
      labels.forEach(({label}) => label.destroy())
      arrows.left.remove()
      arrows.right.remove()
      clearTimeout(feedTimer)
      clearTimeout(bannerTimer)
      banner.remove()
      stopStreet()
      window.removeEventListener("keydown", onKey)
      // Back to the view before, once the round's done
      background.showStreet(false)
      hud.remove()
      feed.remove()
    },
  }
}

// A "+N" rising and fading from just above a house, the same size on screen whatever
// the zoom, and above the night, so it's seen lit
const popOver = (background: Background, idx: number, points: number) => {
  const {left, top, width} = background.houses[idx]
  const pop = new Text({
    text: `+${points}`,
    style: {fontFamily, fontSize: popSize, fill: 0xffd700, stroke: {color: 0x1a1a1a, width: 5}},
    anchor: {x: 0.5, y: 1},
  })
  pop.eventMode = "none"
  pop.zIndex = 10000
  background.decorations.addChild(pop)
  const startedAt = performance.now()
  const step = () => {
    const t = Math.min(1, (performance.now() - startedAt) / popDuration)
    const scale = 1 / background.scale()
    pop.scale.set(scale)
    pop.position.set(left + width / 2, top - 8 * scale - popRise * scale * t)
    pop.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
    if (t < 1) {
      requestAnimationFrame(step)
    } else {
      pop.destroy()
    }
  }
  step()
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
  const hud = createRoundHud(background)
  hud.show(roundSeconds, contenders)
  await countDown()

  // The race open now, if one is, and when it closes, in seconds into the round
  let race: {kind: Challenge, until: number, length: number} | undefined
  const win = (idx: number) => {
    if (!race) {
      return
    }
    race = undefined
    const winner = contenders[idx]
    winner.points += challengePoints
    popOver(background, idx, challengePoints)
    hud.endChallenge(`${winner.player ? LL.tournament.challenge.youWon() : LL.tournament.challenge.won({house: winner.name})} +${challengePoints}`)
  }
  // What the player's done so far, each counted up to its most
  const done = new Map<Progress, number>()
  const stopListening = onProgress(progress => {
    if (race && challengeFor[race.kind] === progress) {
      win(player.idx)
    }
    const scored = playerPoints[progress]
    const times = done.get(progress) ?? 0
    if (!scored || times >= scored.most) {
      return
    }
    done.set(progress, times + 1)
    player.points += scored.points
    popOver(background, player.idx, scored.points)
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

  // Which neighbour's which pace, for how quickly they react to a race
  const reactionOf = new Map(neighbours.flatMap((decorations, idx) => decorations.length > 0 ? [idx] : [])
    .map((idx, k) => [idx, reactions[k % reactions.length]]))
  // The races, each a different thing to do, the one asked for first
  const kinds = (Object.keys(challengeFor) as Challenge[]).sort(() => Math.random() - 0.5)
  if (askedChallenge) {
    kinds.splice(kinds.indexOf(askedChallenge), 1)
    kinds.unshift(askedChallenge)
  }
  const races = challengeAt.map((share, k) => ({at: roundSeconds * share, kind: kinds[k % kinds.length]}))
  const open = (kind: Challenge, now: number) => {
    const length = Math.min(challengeSeconds, roundSeconds - now)
    race = {kind, until: now + length, length}
    hud.challenge(`${LL.tournament.challenge[kind]()} +${challengePoints}`)
    // Each neighbour with one of those still to put up hurries the next of them along,
    // after it's reacted
    neighbours.forEach((_, idx) => {
      const next = planned.find(item => item.idx === idx && item.decoration.kind === kind)
      const reaction = reactionOf.get(idx)
      if (next && reaction !== undefined) {
        const after = Math.max(quickestReaction, reaction + (Math.random() * 2 - 1) * reactionJitter)
        next.at = Math.min(next.at, now + after)
      }
    })
    planned.sort((a, b) => a.at - b.at)
  }

  const startedAt = performance.now()
  await new Promise<void>(resolve => {
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000
      if (races.length > 0 && races[0].at <= elapsed) {
        open(races.shift()!.kind, elapsed)
      }
      while (planned.length > 0 && planned[0].at <= elapsed && elapsed < roundSeconds) {
        const {idx, decoration} = planned.shift()!
        decoration.put()
        const points = neighbourPoints[decoration.kind]
        contenders[idx].points += points
        popOver(background, idx, points)
        hud.say(`${LL.tournament.feed[decoration.kind]({house: contenders[idx].name})} +${points}`)
        if (race?.kind === decoration.kind) {
          win(idx)
        }
      }
      if (race) {
        if (elapsed >= race.until) {
          race = undefined
          hud.endChallenge()
        } else {
          hud.challengeLeft((race.until - elapsed) / race.length)
        }
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
