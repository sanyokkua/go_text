//go:build !dev

package bootstrap

// IsDevBuild is false for any build without the "dev" tag — i.e. every
// `wails build` output and every plain `go build`/`go test` invocation.
const IsDevBuild = false
