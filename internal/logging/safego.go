package logging

import (
	"fmt"
	"runtime/debug"
)

// SafeGo starts fn in a new goroutine. If fn panics, the panic is recovered
// and logged at Error level — the application keeps running.
func SafeGo(l *Logger, where string, fn func()) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				l.Error(fmt.Sprintf("[panic in %s] %v\n%s", where, r, debug.Stack()))
			}
		}()
		fn()
	}()
}
