//go:build dev

package bootstrap

// IsDevBuild mirrors the "dev" tag Wails' CLI adds when running `wails dev`
// (see wailsapp/wails/v2 pkg/commands/build/base.go and internal/app/app_dev.go).
const IsDevBuild = true
