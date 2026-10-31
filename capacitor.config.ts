import type {CapacitorConfig} from "@capacitor/cli"

// The Android app wraps the built web app in dist/
const config: CapacitorConfig = {
  appId: "tech.tanay.diwali",
  appName: "Diwali Celebration",
  webDir: "dist",
}

export default config
