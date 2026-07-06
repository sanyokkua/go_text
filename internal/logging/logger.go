package logging

import (
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"gopkg.in/natefinch/lumberjack.v2"
)

// Config controls where and how the logger writes.
type Config struct {
	FileEnabled bool
	Level       string
	Directory   string
	MaxSizeMB   int
	MaxBackups  int
	MaxAgeDays  int
	Compress    bool
}

// DefaultConfig returns console-only info-level defaults used before DB is available.
func DefaultConfig() Config {
	return Config{
		FileEnabled: false,
		Level:       "info",
		MaxSizeMB:   10,
		MaxBackups:  5,
		MaxAgeDays:  30,
		Compress:    false,
	}
}

// ResolveLevel returns level unchanged if it is non-empty. An empty level
// means no explicit choice has been persisted yet, so it resolves to the
// environment-appropriate default: debug in development, warn in production.
func ResolveLevel(level string, dev bool) string {
	if level != "" {
		return level
	}
	if dev {
		return "debug"
	}
	return "warn"
}

// Logger is a zerolog-backed structured logger that also satisfies the
// Wails logger.Logger interface. It supports in-place reconfiguration.
type Logger struct {
	mu   sync.RWMutex
	zl   zerolog.Logger
	file *lumberjack.Logger
}

// New creates a Logger with the given configuration.
// dev=true adds a pretty console writer; dev=false uses JSON-only.
func New(cfg Config, dev bool) (*Logger, error) {
	l := &Logger{}
	if err := l.rebuild(cfg, dev); err != nil {
		return nil, err
	}
	return l, nil
}

// Reconfigure swaps the logger's sinks and level in place.
// Safe to call from any goroutine while logging is in progress.
func (l *Logger) Reconfigure(cfg Config, dev bool) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.rebuild(cfg, dev)
}

// rebuild is the internal implementation of New and Reconfigure (called under mu).
func (l *Logger) rebuild(cfg Config, dev bool) error {
	lvl, err := zerolog.ParseLevel(strings.ToLower(cfg.Level))
	if err != nil {
		lvl = zerolog.InfoLevel
	}

	var writers []io.Writer

	if dev {
		writers = append(writers, zerolog.NewConsoleWriter())
	}

	if cfg.FileEnabled && cfg.Directory != "" {
		if l.file != nil {
			_ = l.file.Close()
		}
		l.file = &lumberjack.Logger{
			Filename:   fmt.Sprintf("%s/app.log", cfg.Directory),
			MaxSize:    cfg.MaxSizeMB,
			MaxBackups: cfg.MaxBackups,
			MaxAge:     cfg.MaxAgeDays,
			Compress:   cfg.Compress,
		}
		writers = append(writers, l.file)
	}

	var w io.Writer
	switch len(writers) {
	case 0:
		w = io.Discard
	case 1:
		w = writers[0]
	default:
		w = zerolog.MultiLevelWriter(writers...)
	}

	l.zl = zerolog.New(w).Level(lvl).With().Timestamp().Logger()
	return nil
}

// Close flushes and closes the file sink (if any). Call during OnShutdown.
func (l *Logger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

// ZeroLogger returns a point-in-time copy of the underlying zerolog.Logger.
// Safe to retain — the copy is independent; a subsequent Reconfigure does not
// invalidate it (callers that need live level changes must call ZeroLogger again).
func (l *Logger) ZeroLogger() zerolog.Logger {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.zl
}

// WithOp returns a sub-logger with the "op" field stamped.
func (l *Logger) WithOp(op string) zerolog.Logger {
	return l.ZeroLogger().With().Str("op", op).Logger()
}

// Redact masks a value whose key matches a sensitive pattern.
// Only the env-var *name* is safe to log — the value itself is masked.
func Redact(key, value string) string {
	k := strings.ToLower(key)
	if strings.Contains(k, "token") ||
		strings.Contains(k, "api_key") ||
		strings.Contains(k, "secret") ||
		strings.Contains(k, "authorization") ||
		strings.Contains(k, "password") {
		return "[REDACTED]"
	}
	return value
}

// ── Wails logger.Logger interface ────────────────────────────────────────────

func (l *Logger) Print(m string)   { l.mu.RLock(); zl := l.zl; l.mu.RUnlock(); zl.Log().Msg(m) }
func (l *Logger) Trace(m string)   { l.mu.RLock(); zl := l.zl; l.mu.RUnlock(); zl.Trace().Msg(m) }
func (l *Logger) Debug(m string)   { l.mu.RLock(); zl := l.zl; l.mu.RUnlock(); zl.Debug().Msg(m) }
func (l *Logger) Info(m string)    { l.mu.RLock(); zl := l.zl; l.mu.RUnlock(); zl.Info().Msg(m) }
func (l *Logger) Warning(m string) { l.mu.RLock(); zl := l.zl; l.mu.RUnlock(); zl.Warn().Msg(m) }
func (l *Logger) Error(m string)   { l.mu.RLock(); zl := l.zl; l.mu.RUnlock(); zl.Error().Msg(m) }
func (l *Logger) Fatal(m string) {
	l.mu.RLock()
	zl := l.zl
	l.mu.RUnlock()
	// WithLevel(FatalLevel) logs at fatal level without calling os.Exit, so the
	// caller can show an error dialog before exiting.
	zl.WithLevel(zerolog.FatalLevel).Msg(m)
}

// ── Timer helper ─────────────────────────────────────────────────────────────

// Timer measures elapsed time and logs duration_ms on Stop.
type Timer struct {
	l     zerolog.Logger
	start time.Time
}

// StartTimer begins measuring. Call t.Stop() with defer.
func StartTimer(l zerolog.Logger) *Timer {
	return &Timer{l: l, start: time.Now()}
}

// Stop emits a Debug entry with a duration_ms int64 field.
func (t *Timer) Stop() {
	t.l.Debug().Int64("duration_ms", time.Since(t.start).Milliseconds()).Msg("completed")
}

// NewAppStructLogger is kept for backwards compatibility during the transition.
// Prefer New(DefaultConfig(), true) directly.
func NewAppStructLogger() *Logger {
	l, _ := New(DefaultConfig(), true)
	return l
}
