// The desktop app for Windows, macOS and Linux: the game, built into frontend/dist, in a
// window of its own, shown by the system's web view (WebView2 on Windows, WebKit on
// macOS, WebKitGTK on Linux) through Wails
package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

// The game as `npm run build:desktop` builds it
//
//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	app := newApp()
	err := wails.Run(&options.App{
		Title: "Diwali Celebration",
		// Landscape, as the game only plays that way, and no smaller than it can be
		// played at
		Width:     1280,
		Height:    720,
		MinWidth:  640,
		MinHeight: 360,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// The night the game opens on, so the window doesn't flash white as it loads
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 255},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
		Windows: &windows.Options{
			Theme: windows.Dark,
		},
		Mac: &mac.Options{
			Appearance: mac.NSAppearanceNameDarkAqua,
			About: &mac.AboutInfo{
				Title:   "Diwali Celebration",
				Message: "Light diyas, set off fireworks, hang kandils and draw rangoli on Diwali night.\nhttps://diwali.tanay.tech",
				Icon:    icon,
			},
		},
		Linux: &linux.Options{
			Icon:        icon,
			ProgramName: "diwali-celebration",
			// The game draws with WebGL, so the GPU's always used where there is one
			WebviewGpuPolicy: linux.WebviewGpuPolicyAlways,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
