package main

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// What the game can ask of the desktop app, as window.go.main.App in its page
type App struct {
	ctx context.Context
}

func newApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SavePhoto saves a photo of the scene, a PNG as base64, where it's picked in a save
// dialog, which opens on the pictures folder. A web view in an app window can't share
// files or save downloads, as a browser can. It returns where it was saved, or nothing
// if the dialog was closed without picking anywhere
func (a *App) SavePhoto(name string, png string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(png)
	if err != nil {
		return "", err
	}
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            "Save the photo",
		DefaultDirectory: picturesFolder(),
		DefaultFilename:  name,
		Filters:          []runtime.FileFilter{{DisplayName: "PNG images (*.png)", Pattern: "*.png"}},
	})
	if err != nil || path == "" {
		return "", err
	}
	return path, os.WriteFile(path, data, 0o644)
}

// The pictures folder in the home folder, where there is one
func picturesFolder() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	pictures := filepath.Join(home, "Pictures")
	if _, err := os.Stat(pictures); err != nil {
		return home
	}
	return pictures
}
