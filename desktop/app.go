package main

import (
	"context"
	"encoding/base64"
	"fmt"
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
	return a.save(name, png, "Save the photo", homeFolder("Pictures"),
		runtime.FileFilter{DisplayName: "PNG images (*.png)", Pattern: "*.png"})
}

// SaveVideo saves a video greeting, an MP4 or WebM video as base64, whichever the web
// view recorded, as SavePhoto does a photo, in a save dialog that opens on the videos
// folder
func (a *App) SaveVideo(name string, video string) (string, error) {
	ext := filepath.Ext(name)
	return a.save(name, video, "Save the greeting", homeFolder("Movies", "Videos"),
		runtime.FileFilter{DisplayName: fmt.Sprintf("Videos (*%s)", ext), Pattern: "*" + ext})
}

// Saves a file, as base64, where it's picked in a save dialog, returning where, or
// nothing if the dialog was closed without picking anywhere
func (a *App) save(name string, encoded string, title string, folder string, filter runtime.FileFilter) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            title,
		DefaultDirectory: folder,
		DefaultFilename:  name,
		Filters:          []runtime.FileFilter{filter},
	})
	if err != nil || path == "" {
		return "", err
	}
	return path, os.WriteFile(path, data, 0o644)
}

// The first of these folders in the home folder there is, such as Pictures, or else
// the home folder itself
func homeFolder(names ...string) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	for _, name := range names {
		folder := filepath.Join(home, name)
		if _, err := os.Stat(folder); err == nil {
			return folder
		}
	}
	return home
}
