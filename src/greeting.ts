import {fontFamily} from "./app"
import type {AudioControl} from "./audioControl"
import {reduceFlashing} from "./flashing"
import {LL} from "./locale"
import {siteUrl} from "./screenshot"
import {shareFile} from "./share"

// How long a greeting is: it can't be stopped before the least, and stops itself at the
// most
const minSeconds = 10
const maxSeconds = 20
// The video's size and frame rate, landscape, as the game's always held
const width = 1280
const height = 720
const frameRate = 30
const videoBitrate = 2_500_000
const audioBitrate = 128_000
const maxNameLength = 30
const highlight = "#ffd700"
const fadeDuration = 400
const diyaUrl = "sprites/icons/diya.svg"
const fileName = "diwali-greeting"
// What it's recorded as, the first the device can: MP4 where it can, as more apps take
// it, or else WebM
const videoTypes = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
]
// The frame round the video: the border's inset, the sparkles twinkling along it, the
// fireworks bursting in its top corners, and the diyas in its bottom ones
const borderInset = 22
const sparkleCount = 40
const burstEvery = 1.3
const burstLife = 1.6
const burstRadius = 95
const burstDots = 18
const burstColors = ["#b388ff", "#ffd54f", "#ff5252", "#69f0ae", "#40c4ff", "#ff80ab"]
const diyaSize = 120

// Where along the border something is, from 0 to 1 the whole way round, clockwise from
// the top left corner
const alongBorder = (share: number) => {
  const w = width - borderInset * 2
  const h = height - borderInset * 2
  let d = (share % 1) * (w + h) * 2
  if (d < w) {
    return {x: borderInset + d, y: borderInset}
  }
  d -= w
  if (d < h) {
    return {x: width - borderInset, y: borderInset + d}
  }
  d -= h
  if (d < w) {
    return {x: width - borderInset - d, y: height - borderInset}
  }
  return {x: borderInset, y: height - borderInset - (d - w)}
}

const sparkles = Array.from({length: sparkleCount}, (_, index) => ({
  ...alongBorder((index + Math.random() * 0.6) / sparkleCount),
  phase: Math.random() * Math.PI * 2,
  speed: 2 + Math.random() * 3,
  size: 5 + Math.random() * 6,
}))

// A four-pointed star, centred on a point
const star = (context: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  context.beginPath()
  context.moveTo(x, y - size)
  context.quadraticCurveTo(x, y, x + size, y)
  context.quadraticCurveTo(x, y, x, y + size)
  context.quadraticCurveTo(x, y, x - size, y)
  context.quadraticCurveTo(x, y, x, y - size)
  context.fill()
}

// Text, centred on a point, shrunk to fit the width it has, outlined so it reads over
// anything the camera sees
const writeText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) => {
  const room = width - (borderInset + diyaSize) * 2
  context.font = `${size}px ${fontFamily}`
  const measured = context.measureText(text).width
  if (measured > room) {
    size = Math.floor(size * room / measured)
    context.font = `${size}px ${fontFamily}`
  }
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.lineJoin = "round"
  context.lineWidth = size * 0.14
  context.strokeStyle = "rgba(20, 8, 30, 0.85)"
  context.strokeText(text, x, y)
  context.fillStyle = color
  context.fillText(text, x, y)
}

// One frame of the greeting: the camera, filling the frame, with the decorations and
// the names over it, at a time in seconds
const drawFrame = (context: CanvasRenderingContext2D, camera: HTMLVideoElement | undefined, diya: HTMLImageElement, to: string, from: string, time: number) => {
  context.fillStyle = "#1a1448"
  context.fillRect(0, 0, width, height)
  if (camera && camera.videoWidth > 0) {
    const scale = Math.max(width / camera.videoWidth, height / camera.videoHeight)
    const w = camera.videoWidth * scale
    const h = camera.videoHeight * scale
    context.drawImage(camera, (width - w) / 2, (height - h) / 2, w, h)
  }
  // Darker at the top and bottom, behind the writing
  for (const [edge, inner] of [[0, 210], [height, height - 210]]) {
    const shade = context.createLinearGradient(0, edge, 0, inner)
    shade.addColorStop(0, "rgba(11, 16, 48, 0.75)")
    shade.addColorStop(1, "rgba(11, 16, 48, 0)")
    context.fillStyle = shade
    context.fillRect(0, Math.min(edge, inner), width, 210)
  }
  // The gold border, a thick line inside a thin one
  context.strokeStyle = highlight
  context.lineWidth = 6
  context.beginPath()
  context.roundRect(borderInset, borderInset, width - borderInset * 2, height - borderInset * 2, 18)
  context.stroke()
  context.lineWidth = 2
  context.strokeStyle = "rgba(255, 215, 0, 0.6)"
  context.beginPath()
  context.roundRect(borderInset + 10, borderInset + 10, width - (borderInset + 10) * 2, height - (borderInset + 10) * 2, 12)
  context.stroke()
  // Sparkles twinkling along it
  context.fillStyle = "#fff3c4"
  for (const sparkle of sparkles) {
    context.globalAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * sparkle.speed + sparkle.phase))
    star(context, sparkle.x, sparkle.y, sparkle.size)
  }
  // Fireworks bursting in the top corners, one after another, gentler with flashing
  // reduced
  const brightest = reduceFlashing() ? 0.55 : 1
  const latest = Math.floor(time / burstEvery)
  for (let burst = latest - Math.ceil(burstLife / burstEvery); burst <= latest; burst++) {
    const age = time - burst * burstEvery
    if (burst < 0 || age < 0 || age > burstLife) {
      continue
    }
    // Where each burst is comes from its number, so it stays put as it grows
    const seeded = (n: number) => {
      const value = Math.sin(burst * 12.9898 + n * 78.233) * 43758.5453
      return value - Math.floor(value)
    }
    const left = burst % 2 === 0
    const x = width * (left ? 0.08 + seeded(1) * 0.16 : 0.76 + seeded(1) * 0.16)
    const y = height * (0.14 + seeded(2) * 0.16)
    const grown = 1 - (1 - age / burstLife) ** 3
    context.globalAlpha = brightest * (1 - age / burstLife)
    context.fillStyle = burstColors[burst % burstColors.length]
    for (let dot = 0; dot < burstDots; dot++) {
      const angle = (dot / burstDots) * Math.PI * 2 + seeded(3)
      context.beginPath()
      context.arc(x + Math.cos(angle) * burstRadius * grown, y + Math.sin(angle) * burstRadius * grown + age * age * 12, 4, 0, Math.PI * 2)
      context.fill()
    }
  }
  context.globalAlpha = 1
  // A lit diya in each bottom corner, its glow flickering
  for (const x of [borderInset + 20, width - borderInset - 20 - diyaSize]) {
    const y = height - borderInset - 14 - diyaSize
    const glow = context.createRadialGradient(x + diyaSize / 2, y + diyaSize * 0.3, 0, x + diyaSize / 2, y + diyaSize * 0.3, diyaSize)
    const flicker = 0.35 + 0.1 * Math.sin(time * 9 + x) + 0.05 * Math.sin(time * 23)
    glow.addColorStop(0, `rgba(255, 170, 60, ${flicker})`)
    glow.addColorStop(1, "rgba(255, 170, 60, 0)")
    context.fillStyle = glow
    context.fillRect(x - diyaSize / 2, y - diyaSize / 2, diyaSize * 2, diyaSize * 2)
    if (diya.complete && diya.naturalWidth > 0) {
      context.drawImage(diya, x, y, diyaSize, diyaSize)
    }
  }
  // Who it's for, at the top, and who from, at the bottom, with where it was made
  if (to) {
    writeText(context, LL.greeting.wish({to}), width / 2, 100, 80, highlight)
  }
  if (from) {
    writeText(context, LL.greeting.signed({from}), width / 2, height - 105, 52, "#ffffff")
  }
  writeText(context, siteUrl, width / 2, height - 52, 26, "rgba(255, 215, 0, 0.85)")
}

const button = (text: string, primary = false) => {
  const element = document.createElement("button")
  element.type = "button"
  element.textContent = text
  Object.assign(element.style, {
    padding: "min(10px, 2vh) 14px",
    borderRadius: "12px",
    border: `2px solid ${primary ? highlight : "#555555"}`,
    background: primary ? highlight : "rgba(26, 26, 26, 0.85)",
    color: primary ? "#1a1448" : "#ffffff",
    fontFamily,
    fontSize: "min(22px, 5vh)",
    lineHeight: "1.1",
    cursor: "pointer",
  })
  return element
}

const nameField = (label: string) => {
  const wrapper = document.createElement("label")
  Object.assign(wrapper.style, {display: "flex", flexDirection: "column", gap: "4px", textAlign: "start"})
  const caption = document.createElement("span")
  caption.textContent = label
  Object.assign(caption.style, {fontSize: "min(18px, 4vh)", opacity: "0.85"})
  const input = document.createElement("input")
  input.type = "text"
  input.maxLength = maxNameLength
  input.autocomplete = "off"
  input.setAttribute("aria-label", label)
  Object.assign(input.style, {
    padding: "min(8px, 1.6vh) 10px",
    borderRadius: "10px",
    border: "2px solid #555555",
    background: "rgba(26, 26, 26, 0.85)",
    color: "#ffffff",
    fontFamily,
    fontSize: "min(22px, 5vh)",
    minWidth: "0",
  })
  input.addEventListener("focus", () => input.style.borderColor = highlight)
  input.addEventListener("blur", () => input.style.borderColor = "#555555")
  wrapper.append(caption, input)
  return {wrapper, input}
}

const clock = (seconds: number) => `0:${String(Math.floor(seconds)).padStart(2, "0")}`

// A screen to record a video greeting on: the sender's and recipient's names, written
// over the camera in a festive frame, recorded for 10 to 20 seconds with the
// microphone, played back, and sent through the share sheet, or saved where it can't
// be. Resolves once it's closed
const showGreeting = (audio: AudioControl) => new Promise<void>(resolve => {
  const overlay = document.createElement("div")
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", LL.greeting.heading())
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "16px",
    boxSizing: "border-box",
    background: "radial-gradient(ellipse at 50% 120%, #4a1d10 0%, transparent 60%), linear-gradient(180deg, #0b1030, #1a1448 60%, #24112e)",
    color: "#ffffff",
    fontFamily,
    opacity: "0",
    transition: `opacity ${fadeDuration}ms ease-in-out`,
  })

  // The video, as it's being made, and once it's made, played back
  const stage = document.createElement("div")
  Object.assign(stage.style, {
    position: "relative",
    flex: "1 1 0",
    minWidth: "0",
    maxWidth: "calc((100vh - 32px) * 16 / 9)",
    aspectRatio: "16 / 9",
    borderRadius: "14px",
    overflow: "hidden",
    background: "#000000",
  })
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const playback = document.createElement("video")
  playback.controls = true
  playback.playsInline = true
  playback.loop = true
  for (const element of [canvas, playback]) {
    Object.assign(element.style, {position: "absolute", inset: "0", width: "100%", height: "100%"})
  }
  playback.hidden = true
  // The camera itself isn't shown, only drawn onto the canvas, but some web views only
  // play a video that's on the page
  const camera = document.createElement("video")
  camera.muted = true
  camera.playsInline = true
  Object.assign(camera.style, {position: "absolute", width: "1px", height: "1px", opacity: "0", pointerEvents: "none"})
  const message = document.createElement("p")
  Object.assign(message.style, {
    position: "absolute",
    inset: "0",
    margin: "0",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    textAlign: "center",
    fontSize: "min(22px, 5vh)",
    background: "rgba(11, 16, 48, 0.8)",
  })
  // Shown over it while it's recording
  const recording = document.createElement("span")
  recording.textContent = "●"
  recording.setAttribute("aria-hidden", "true")
  Object.assign(recording.style, {position: "absolute", top: "10px", insetInlineStart: "14px", color: "#ff3b30", fontSize: "22px"})
  recording.hidden = true
  stage.append(camera, canvas, playback, message, recording)

  // The names, and what to do
  const panel = document.createElement("div")
  Object.assign(panel.style, {
    display: "flex",
    flexDirection: "column",
    gap: "min(10px, 2vh)",
    width: "min(260px, 36vw)",
    flex: "0 0 auto",
    maxHeight: "100%",
    overflowY: "auto",
  })
  const heading = document.createElement("h1")
  heading.textContent = LL.greeting.heading()
  Object.assign(heading.style, {margin: "0", fontSize: "min(30px, 6.5vh)", fontWeight: "normal", lineHeight: "1.1", color: highlight})
  const from = nameField(LL.greeting.from())
  const to = nameField(LL.greeting.to())
  const status = document.createElement("p")
  status.setAttribute("aria-live", "polite")
  Object.assign(status.style, {margin: "0", fontSize: "min(18px, 4vh)", opacity: "0.85"})
  // How far through it is, with a mark at the least it can be
  const progress = document.createElement("div")
  Object.assign(progress.style, {position: "relative", height: "8px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.15)", overflow: "hidden"})
  const progressFill = document.createElement("div")
  Object.assign(progressFill.style, {position: "absolute", insetBlock: "0", insetInlineStart: "0", width: "0%", background: highlight})
  const progressMark = document.createElement("div")
  Object.assign(progressMark.style, {position: "absolute", insetBlock: "0", insetInlineStart: `${minSeconds / maxSeconds * 100}%`, width: "2px", background: "#ffffff"})
  progress.append(progressFill, progressMark)
  const primary = button(LL.greeting.record(), true)
  const again = button(LL.greeting.again())
  const back = button(LL.greeting.back())
  panel.append(heading, from.wrapper, to.wrapper, status, progress, primary, again, back)
  overlay.append(stage, panel)

  const diya = new Image()
  diya.src = diyaUrl
  const context = canvas.getContext("2d")!
  const names = () => ({to: to.input.value.trim(), from: from.input.value.trim()})

  let state: "setup" | "recording" | "recorded" = "setup"
  let cameraStream: MediaStream | undefined
  let recorder: MediaRecorder | undefined
  let startedAt = 0
  let recordedUrl: string | undefined
  let recorded: Blob | undefined
  let closed = false
  let ticker: number | undefined

  const render = () => {
    const ready = Boolean(cameraStream) && Boolean(names().to) && Boolean(names().from)
    from.input.disabled = to.input.disabled = state !== "setup"
    canvas.hidden = state === "recorded"
    playback.hidden = state !== "recorded"
    recording.hidden = state !== "recording"
    again.hidden = state !== "recorded"
    const elapsed = state === "recording" ? (performance.now() - startedAt) / 1000 : 0
    progress.style.visibility = state === "recording" ? "visible" : "hidden"
    progressFill.style.width = `${Math.min(1, elapsed / maxSeconds) * 100}%`
    if (state === "setup") {
      primary.textContent = LL.greeting.record()
      primary.disabled = !ready
      status.textContent = LL.greeting.hint({min: minSeconds, max: maxSeconds})
    } else if (state === "recording") {
      primary.textContent = LL.greeting.stop()
      primary.disabled = elapsed < minSeconds
      status.textContent = `${clock(elapsed)} / ${clock(maxSeconds)}`
    } else {
      primary.textContent = LL.greeting.send()
      primary.disabled = false
      status.textContent = ""
    }
    primary.style.opacity = primary.disabled ? "0.5" : "1"
    primary.style.cursor = primary.disabled ? "default" : "pointer"
  }

  // The frame drawn over and over while the screen's open, for the preview and the
  // recording alike
  const draw = (now: number) => {
    if (closed) {
      return
    }
    const {to, from} = names()
    drawFrame(context, cameraStream ? camera : undefined, diya, to, from, now / 1000)
    requestAnimationFrame(draw)
  }
  requestAnimationFrame(draw)

  const showProblem = (text: string) => {
    message.textContent = text
    message.style.display = "flex"
  }

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      showProblem(LL.greeting.noCamera())
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: "user", width: {ideal: width}, height: {ideal: height}},
        audio: {echoCancellation: true, noiseSuppression: true},
      })
      if (closed) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      cameraStream = stream
      camera.srcObject = stream
      await camera.play()
    } catch (error) {
      console.error("Couldn't open the camera", error)
      showProblem(LL.greeting.noCamera())
    }
    render()
  }

  // The names' letters, in whichever script, loaded before they're drawn, as a font's
  // only fetched for a script once it's needed
  const nameChanged = () => {
    const {to, from} = names()
    document.fonts?.load(`52px ${fontFamily}`, `${LL.greeting.wish({to})} ${LL.greeting.signed({from})}`).catch(() => {})
    render()
  }
  from.input.addEventListener("input", nameChanged)
  to.input.addEventListener("input", nameChanged)

  const forgetRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
    }
    playback.removeAttribute("src")
    recordedUrl = undefined
    recorded = undefined
  }

  const stopRecording = () => {
    clearInterval(ticker)
    if (recorder?.state === "recording") {
      recorder.stop()
    }
  }

  const startRecording = () => {
    if (!cameraStream) {
      return
    }
    const type = videoTypes.find(type => MediaRecorder.isTypeSupported(type))
    const stream = canvas.captureStream(frameRate)
    cameraStream.getAudioTracks().forEach(track => stream.addTrack(track))
    const chunks: Blob[] = []
    const made = new MediaRecorder(stream, {
      ...type ? {mimeType: type} : {},
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: audioBitrate,
    })
    made.addEventListener("dataavailable", event => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    })
    made.addEventListener("stop", () => {
      // Only the canvas's track: the microphone's the camera's, kept for another go
      stream.getVideoTracks().forEach(track => track.stop())
      if (closed || recorder !== made) {
        return
      }
      recorded = new Blob(chunks, {type: (made.mimeType || type || "video/webm").split(";")[0]})
      recordedUrl = URL.createObjectURL(recorded)
      playback.src = recordedUrl
      state = "recorded"
      render()
      playback.play().catch(() => {})
    })
    recorder = made
    made.start(1000)
    startedAt = performance.now()
    state = "recording"
    render()
    ticker = window.setInterval(() => {
      if ((performance.now() - startedAt) / 1000 >= maxSeconds) {
        stopRecording()
      }
      render()
    }, 200)
  }

  const send = async () => {
    if (!recorded) {
      return
    }
    const {to, from} = names()
    const extension = recorded.type.includes("mp4") ? "mp4" : "webm"
    primary.disabled = true
    try {
      await shareFile({
        blob: recorded,
        fileName: `${fileName}.${extension}`,
        title: LL.title(),
        text: LL.greeting.shareText({to, from, url: siteUrl}),
        kind: "video",
      })
    } catch (error) {
      console.error("Couldn't send the greeting", error)
    } finally {
      render()
    }
  }

  primary.addEventListener("click", () => {
    if (primary.disabled) {
      return
    }
    if (state === "setup") {
      startRecording()
    } else if (state === "recording") {
      stopRecording()
    } else {
      void send()
    }
  })
  again.addEventListener("click", () => {
    playback.pause()
    forgetRecording()
    state = "setup"
    render()
  })

  const close = () => {
    if (closed) {
      return
    }
    closed = true
    clearInterval(ticker)
    if (recorder?.state === "recording") {
      recorder.stop()
    }
    playback.pause()
    cameraStream?.getTracks().forEach(track => track.stop())
    audio.setHushed(false)
    document.removeEventListener("keydown", onKeyDown)
    overlay.style.opacity = "0"
    setTimeout(() => {
      forgetRecording()
      overlay.remove()
      resolve()
    }, fadeDuration)
  }
  back.addEventListener("click", close)
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      close()
    }
  }
  document.addEventListener("keydown", onKeyDown)

  // The music's paused while the microphone's open, so it isn't heard in the greeting
  audio.setHushed(true)
  render()
  document.body.appendChild(overlay)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = "1"
    from.input.focus()
  }))
  void openCamera()
})

export {maxSeconds, minSeconds, showGreeting}
