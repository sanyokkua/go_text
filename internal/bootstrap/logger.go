package bootstrap

import "go_text/internal/logging"

// NewLogger creates the pre-DB bootstrap logger. It cannot use
// runtime.Environment(ctx).BuildType because ctx does not exist yet this
// early in main() — instead it uses the compile-time "dev" build tag that
// Wails' own CLI already sets for `wails dev` vs `wails build`.
func NewLogger() (*logging.Logger, error) {
	return logging.New(logging.DefaultConfig(), IsDevBuild)
}
