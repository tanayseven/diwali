import {LL} from "./locale"
const tracks = [
  "audio/background/diwali-vibes-1.mp3",
  "audio/background/diwali-vibes-2.mp3",
]
const highlight = "#ffd700"
const defaultVolume = 0.5
// How long a press has to last to open the slider instead of toggling mute
const holdDuration = 400
const storageKey = "diwali-audio"
// While a sound effect plays at full level the music drops to this share of its volume,
// so the effect stands out. Quieter effects dip it less
const duckLevel = 0.3
// How long the music takes to dip, and to come back up, across the full dip
const duckFadeOut = 150
const duckFadeIn = 800
// Wait this long after the last effect before bringing the music back, so effects in
// quick succession (a laddi's crackers) don't make it pump up and down between them
const duckRelease = 400
// Some browsers (notably iOS Safari) won't buffer audio before a tap, so the loader
// stops waiting for the first track after this long rather than getting stuck
const readyTimeout = 8000
// Muffled effects, like bangs from far off, lose everything above this pitch, in Hz
const muffledCutoff = 600
// An effect is heard from the side of the screen it's on, but never wholly from one
// speaker, as a sound off to one side still reaches both ears
const maxPan = 0.8

// How far left (-1) or right (1) an effect is heard from, for something at x across a
// screen this wide. Anything off screen is heard from as far as that side goes
const stereoPan = (x: number, width: number) => Math.max(-1, Math.min(1, 2 * x / width - 1)) * maxPan

// The volume and mute setting are remembered between visits. Storage can be
// unavailable (private windows, blocked site data), so it's only a convenience
const loadSettings = (): {volume: number, muted: boolean} => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null")
    if (typeof saved?.volume === "number" && typeof saved?.muted === "boolean") {
      return saved
    }
  } catch {
    // Fall through to the defaults
  }
  return {volume: defaultVolume, muted: false}
}

const saveSettings = (settings: {volume: number, muted: boolean}) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings))
  } catch {
    // Not saving is fine
  }
}

const speakerIcon = (muted: boolean) => `
<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="${highlight}" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 9h4l5-4v14l-5-4H4z" fill="${highlight}"/>
  ${muted
    ? `<path d="M17 9l5 6M22 9l-5 6"/>`
    : `<path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>`}
</svg>`

// Plays the background tracks one after the other on a loop, with a speaker button
// in the top-right corner of every screen. Clicking it mutes; hovering over it, or
// pressing and holding on touch screens, opens a volume slider beside it
const createAudioControl = () => {
  const settings = loadSettings()
  // One player per track, so the next one is already buffered when the current ends.
  // Only the first loads straight away; the rest wait until it's ready
  const players = tracks.map((src, idx) => {
    const player = new Audio()
    player.preload = idx === 0 ? "auto" : "none"
    player.src = src
    return player
  })
  let current = 0
  // Sound effects playing now, each with its level: the share of the volume it plays at
  const effects = new Map<object, number>()
  // The share of the volume the music plays at, lowered while effects play
  let duck = 1
  let duckTarget = 1
  let duckFrame: number | undefined
  let duckReleaseTimer: number | undefined
  // Effects are played from decoded sound, not audio elements, as browsers only allow a
  // page so many of those and quick repeats would soon run out. They all go through one
  // gain for the volume and mute setting, and muffled ones through a filter before it.
  // Made the first time an effect is loaded
  let mixer: {context: AudioContext, master: GainNode, muffler: BiquadFilterNode} | undefined
  const getMixer = () => {
    if (!mixer) {
      const context = new AudioContext()
      const master = context.createGain()
      master.connect(context.destination)
      const muffler = context.createBiquadFilter()
      muffler.type = "lowpass"
      muffler.frequency.value = muffledCutoff
      muffler.connect(master)
      mixer = {context, master, muffler}
      renderEffectsVolume()
    }
    return mixer
  }
  // It starts suspended until there's been a tap, and is resumed once there has
  const resumeEffects = () => {
    if (!document.hidden) {
      mixer?.context.resume().catch(() => {})
    }
  }
  const renderEffectsVolume = () => {
    if (mixer) {
      mixer.master.gain.value = settings.muted ? 0 : settings.volume
    }
  }

  const renderMusicVolume = () => players.forEach(player => player.volume = settings.volume * duck)

  // Eases the music's level towards the target a frame at a time
  const fadeDuck = (last: number) => {
    duckFrame = requestAnimationFrame(now => {
      const span = 1 - duckLevel
      const elapsed = now - last
      duck = duckTarget < duck
        ? Math.max(duckTarget, duck - span * elapsed / duckFadeOut)
        : Math.min(duckTarget, duck + span * elapsed / duckFadeIn)
      renderMusicVolume()
      if (duck === duckTarget) {
        duckFrame = undefined
      } else {
        fadeDuck(now)
      }
    })
  }

  const setDuckTarget = (target: number) => {
    duckTarget = target
    if (duckFrame === undefined && duck !== target) {
      fadeDuck(performance.now())
    }
  }

  // Dips the music by as much as the loudest effect playing calls for, or brings it
  // back up a moment after the last one ends
  const updateDuck = () => {
    clearTimeout(duckReleaseTimer)
    if (effects.size > 0) {
      const loudest = Math.max(...effects.values())
      setDuckTarget(1 - (1 - duckLevel) * Math.min(1, loudest))
    } else {
      duckReleaseTimer = window.setTimeout(() => setDuckTarget(1), duckRelease)
    }
  }

  players.forEach((player, idx) => player.addEventListener("ended", () => {
    current = (idx + 1) % players.length
    players[current].currentTime = 0
    play()
  }))

  const play = () => {
    if (settings.muted || document.hidden) {
      return
    }
    // Browsers refuse to play before the person has interacted with the page
    players[current].play().catch(() => {})
  }
  const pause = () => players[current].pause()

  // Settles once enough of the first track has buffered to play it through, so the
  // music can start the moment it's allowed to. The rest of it keeps buffering after,
  // and the other tracks start loading then, so they don't slow down the loader
  const ready = new Promise<void>((resolve, reject) => {
    const first = players[0]
    if (first.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      resolve()
    }
    first.addEventListener("canplaythrough", () => resolve(), {once: true})
    first.addEventListener("error", () => reject(new Error(`Couldn't load ${tracks[0]}`)), {once: true})
    setTimeout(resolve, readyTimeout)
  }).finally(() => {
    players.slice(1).forEach(player => {
      player.preload = "auto"
      player.load()
    })
  })

  // Start on the first tap, click or key press, as browsers block audio until then
  const startOnGesture = () => {
    window.removeEventListener("pointerdown", startOnGesture, true)
    window.removeEventListener("keydown", startOnGesture, true)
    play()
    resumeEffects()
  }
  window.addEventListener("pointerdown", startOnGesture, true)
  window.addEventListener("keydown", startOnGesture, true)

  // Pause while the tab is hidden, and pick up again when it's back. Effects pause too,
  // as whatever they go with stops moving while the tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause()
      mixer?.context.suspend().catch(() => {})
    } else {
      play()
      resumeEffects()
    }
  })

  const wrapper = document.createElement("div")
  Object.assign(wrapper.style, {
    position: "fixed",
    top: "24px",
    right: "24px",
    // Above the warning splash, below the portrait notice
    zIndex: "2",
    display: "flex",
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: "4px",
    borderRadius: "28px",
    background: "rgba(26, 26, 26, 0.85)",
    border: "2px solid #555555",
    touchAction: "none",
    userSelect: "none",
  })

  const button = document.createElement("button")
  Object.assign(button.style, {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    border: "none",
    borderRadius: "50%",
    background: "transparent",
    cursor: "pointer",
  })

  const slider = document.createElement("input")
  slider.type = "range"
  slider.min = "0"
  slider.max = "1"
  slider.step = "0.01"
  slider.setAttribute("aria-label", LL.audio.volume())
  Object.assign(slider.style, {
    width: "0",
    margin: "0",
    opacity: "0",
    accentColor: highlight,
    cursor: "pointer",
    transition: "width 150ms ease-in-out, opacity 150ms ease-in-out, margin 150ms ease-in-out",
  })

  wrapper.append(button, slider)
  document.body.appendChild(wrapper)

  const render = () => {
    const silent = settings.muted || settings.volume === 0
    button.innerHTML = speakerIcon(silent)
    button.setAttribute("aria-label", silent ? LL.audio.unmute() : LL.audio.mute())
    slider.value = String(settings.muted ? 0 : settings.volume)
    renderMusicVolume()
    players.forEach(player => player.muted = settings.muted)
    renderEffectsVolume()
  }

  const setSliderOpen = (open: boolean) => {
    Object.assign(slider.style, {
      width: open ? "120px" : "0",
      // The slider sits to the button's left: room from the pill's edge and the button
      margin: open ? "0 4px 0 12px" : "0",
      opacity: open ? "1" : "0",
    })
    slider.tabIndex = open ? 0 : -1
  }

  const setMuted = (muted: boolean) => {
    settings.muted = muted
    // Unmuting at zero volume would still be silent, so bring it back up
    if (!muted && settings.volume === 0) {
      settings.volume = defaultVolume
    }
    saveSettings(settings)
    render()
    if (muted) {
      pause()
    } else {
      play()
    }
  }

  slider.addEventListener("input", () => {
    settings.volume = Number(slider.value)
    settings.muted = settings.volume === 0
    saveSettings(settings)
    render()
    play()
  })

  // A press held long enough opens the slider, and then doesn't count as a click.
  // Whether it was held is judged from the events' own timestamps, as a busy page can
  // run timers late or handle a quick click slowly; the timer only opens it sooner
  let holdTimer: number | undefined
  let pressedAt: number | undefined
  let held = false
  button.addEventListener("pointerdown", e => {
    held = false
    pressedAt = e.timeStamp
    holdTimer = window.setTimeout(() => setSliderOpen(true), holdDuration)
  })
  button.addEventListener("pointerup", e => {
    clearTimeout(holdTimer)
    held = pressedAt !== undefined && e.timeStamp - pressedAt >= holdDuration
    if (held) {
      setSliderOpen(true)
    }
    pressedAt = undefined
  })
  const cancelHold = () => {
    clearTimeout(holdTimer)
    pressedAt = undefined
  }
  button.addEventListener("pointerleave", cancelHold)
  button.addEventListener("pointercancel", cancelHold)
  // Long presses on touch screens would otherwise open the browser's context menu
  button.addEventListener("contextmenu", e => e.preventDefault())
  button.addEventListener("click", e => {
    if (held) {
      held = false
      return
    }
    setMuted(!settings.muted)
    // Don't keep focus after a pointer click, or Enter would also reach the menu
    if (e.detail > 0) {
      button.blur()
    }
  })

  // Hovering opens the slider for mice; touch opens it by holding instead
  wrapper.addEventListener("pointerenter", e => {
    if (e.pointerType === "mouse") {
      setSliderOpen(true)
    }
  })
  wrapper.addEventListener("pointerleave", e => {
    if (e.pointerType === "mouse") {
      setSliderOpen(false)
    }
  })
  // A tap anywhere else closes it
  window.addEventListener("pointerdown", e => {
    if (!wrapper.contains(e.target as Node)) {
      setSliderOpen(false)
    }
  })
  // Keyboard users get it while focus is inside
  wrapper.addEventListener("focusin", () => setSliderOpen(true))
  wrapper.addEventListener("focusout", e => {
    // Clicking drops focus too, so stay open while the mouse is still over it
    if (!wrapper.contains(e.relatedTarget as Node) && !wrapper.matches(":hover")) {
      setSliderOpen(false)
    }
  })

  // A sound effect, loaded now and played at the music's volume, following the mute and
  // volume setting while it plays. Each play is a fresh copy of it, so quick repeats
  // overlap instead of cutting off, and can be made quieter, moved left or right (from
  // stereoPan) or stopped early. A muffled one sounds far off. Plays asked for before it's loaded, or while effects can't be
  // heard yet (before the first tap, or with the tab hidden), are skipped, so they don't
  // all go off at once later
  const createEffect = (src: string, {muffled = false} = {}) => {
    const {context, master, muffler} = getMixer()
    let sound: AudioBuffer | undefined
    fetch(src)
      .then(response => response.arrayBuffer())
      .then(data => context.decodeAudioData(data))
      .then(decoded => sound = decoded)
      .catch(error => console.error(`Couldn't load ${src}`, error))
    return (pan = 0) => {
      const handle = {}
      if (!sound || context.state !== "running") {
        return {setLevel() {}, setPan() {}, stop() {}}
      }
      const source = context.createBufferSource()
      source.buffer = sound
      const level = context.createGain()
      const panner = context.createStereoPanner()
      panner.pan.value = pan
      source.connect(level)
      level.connect(panner)
      panner.connect(muffled ? muffler : master)
      const forget = () => {
        if (effects.delete(handle)) {
          source.disconnect()
          level.disconnect()
          panner.disconnect()
          updateDuck()
        }
      }
      effects.set(handle, 1)
      updateDuck()
      source.addEventListener("ended", forget)
      source.start()
      return {
        // Plays it at a share of the volume, from 0 to 1
        setLevel(value: number) {
          if (effects.has(handle)) {
            effects.set(handle, value)
            level.gain.value = Math.max(0, value)
            updateDuck()
          }
        },
        // Moves it to be heard from left (-1) or right (1), as what makes it moves
        setPan(value: number) {
          panner.pan.value = value
        },
        stop() {
          if (effects.has(handle)) {
            source.stop()
            forget()
          }
        },
      }
    }
  }

  render()
  setSliderOpen(false)

  return {ready, firstTrack: tracks[0], createEffect}
}

export {createAudioControl, stereoPan}
