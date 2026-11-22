import {Capacitor} from "@capacitor/core"
import {Directory, Filesystem} from "@capacitor/filesystem"
import {Share} from "@capacitor/share"

// Something made in the game to send: a photo of the scene, or a video greeting
type Shareable = {
  blob: Blob
  fileName: string
  // Sent with it, where the app it's shared to takes them
  title: string
  text: string
  // Which of the desktop app's save dialogs it's saved with
  kind: "photo" | "video"
}

// The file as base64, without the data URL's prefix, as the filesystem plugin and the
// desktop app take it
const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve((reader.result as string).split(",")[1])
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

// In the Android app the web view can't share files, so the file's written to the app's
// cache and handed to Android's share sheet
const shareNatively = async ({blob, fileName, title, text}: Shareable) => {
  const {uri} = await Filesystem.writeFile({path: fileName, data: await toBase64(blob), directory: Directory.Cache})
  try {
    await Share.share({title, text, files: [uri], dialogTitle: title})
  } catch (error) {
    // Closing the share sheet without picking anything isn't a failure
    if (!/cancel/i.test((error as Error).message)) {
      throw error
    }
  }
}

// What the desktop app (desktop/app.go) offers the game, which Wails puts on the window
type DesktopApp = {
  SavePhoto: (name: string, png: string) => Promise<string>
  SaveVideo: (name: string, video: string) => Promise<string>
}
const desktopApp = () => (window as Window & {go?: {main?: {App?: DesktopApp}}}).go?.main?.App

// Shares the file to whichever app is picked, through Android's share sheet in the
// app, or where the browser can share files, or else saves it as a download. In the
// desktop app, whose web view can do neither, it's saved where it's picked in a save
// dialog
const shareFile = async (shareable: Shareable) => {
  const {blob, fileName, title, text, kind} = shareable
  if (Capacitor.isNativePlatform()) {
    await shareNatively(shareable)
    return
  }
  const desktop = desktopApp()
  if (desktop) {
    const save = kind === "video" ? desktop.SaveVideo : desktop.SavePhoto
    await save(fileName, await toBase64(blob))
    return
  }
  const file = new File([blob], fileName, {type: blob.type})
  const data = {files: [file], title, text}
  if (navigator.canShare?.(data)) {
    try {
      await navigator.share(data)
      return
    } catch (error) {
      // Closing the share sheet without picking anything isn't a failure
      if ((error as DOMException).name === "AbortError") {
        return
      }
      console.error("Couldn't share the file, so saving it instead", error)
    }
  }
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export {shareFile}
export type {Shareable}
