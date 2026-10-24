const tracks = [
  "audio/background/diwali-vibes-1.mp3",
  "audio/background/diwali-vibes-2.mp3",
]
const highlight = "#ffd700"
const defaultVolume = 0.5
// How long a press has to last to open the slider instead of toggling mute
const holdDuration = 400
const storageKey = "diwali-audio"

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
  let trackIdx = 0
  const audio = new Audio(tracks[trackIdx])
  audio.preload = "auto"
  audio.addEventListener("ended", () => {
    trackIdx = (trackIdx + 1) % tracks.length
    audio.src = tracks[trackIdx]
    play()
  })

  const play = () => {
    if (settings.muted || document.hidden) {
      return
    }
    // Browsers refuse to play before the person has interacted with the page
    audio.play().catch(() => {})
  }

  // Start on the first tap, click or key press, as browsers block audio until then
  const startOnGesture = () => {
    window.removeEventListener("pointerdown", startOnGesture, true)
    window.removeEventListener("keydown", startOnGesture, true)
    play()
  }
  window.addEventListener("pointerdown", startOnGesture, true)
  window.addEventListener("keydown", startOnGesture, true)

  // Pause while the tab is hidden, and pick up again when it's back
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audio.pause()
    } else {
      play()
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
  slider.setAttribute("aria-label", "Volume")
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
    button.setAttribute("aria-label", silent ? "Unmute music" : "Mute music")
    slider.value = String(settings.muted ? 0 : settings.volume)
    audio.volume = settings.volume
    audio.muted = settings.muted
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
      audio.pause()
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

  render()
  setSliderOpen(false)
}

export {createAudioControl}
