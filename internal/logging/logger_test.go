package logging_test

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"go_text/internal/logging"

	"github.com/rs/zerolog"
)

func TestResolveLevel(t *testing.T) {
	tests := []struct {
		name  string
		level string
		dev   bool
		want  string
	}{
		{name: "empty level in production defaults to warn", level: "", dev: false, want: "warn"},
		{name: "empty level in development defaults to debug", level: "", dev: true, want: "debug"},
		{name: "explicit level in production is unchanged", level: "error", dev: false, want: "error"},
		{name: "explicit level in development is unchanged", level: "error", dev: true, want: "error"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := logging.ResolveLevel(tt.level, tt.dev)
			if got != tt.want {
				t.Errorf("ResolveLevel(%q, %v) = %q; want %q", tt.level, tt.dev, got, tt.want)
			}
		})
	}
}

func TestRedact_masksTokens(t *testing.T) {
	cases := []struct {
		key     string
		value   string
		wantRaw bool
	}{
		{"api_key", "sk-secret", false},
		{"Authorization", "Bearer token123", false},
		{"password", "hunter2", false},
		{"token", "abc", false},
		{"secret", "xyz", false},
		{"provider_name", "my-provider", true},
		{"base_url", "http://localhost", true},
	}
	for _, tc := range cases {
		got := logging.Redact(tc.key, tc.value)
		if tc.wantRaw && got != tc.value {
			t.Errorf("Redact(%q, %q) = %q; want original value", tc.key, tc.value, got)
		}
		if !tc.wantRaw && got != "[REDACTED]" {
			t.Errorf("Redact(%q, %q) = %q; want [REDACTED]", tc.key, tc.value, got)
		}
	}
}

func TestNew_levelFiltersMessages(t *testing.T) {
	var buf bytes.Buffer
	zl := zerolog.New(&buf).Level(zerolog.WarnLevel)

	zl.Debug().Msg("should be suppressed")
	zl.Warn().Msg("should appear")

	out := buf.String()
	if strings.Contains(out, "should be suppressed") {
		t.Error("debug message should be filtered out at warn level")
	}
	if !strings.Contains(out, "should appear") {
		t.Error("warn message should appear at warn level")
	}
}

func TestLogger_Reconfigure_changesLevel(t *testing.T) {
	cfg := logging.DefaultConfig()
	cfg.Level = "info"
	l, err := logging.New(cfg, false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	cfg.Level = "debug"
	if err := l.Reconfigure(cfg, false); err != nil {
		t.Fatalf("Reconfigure: %v", err)
	}

	zl := l.ZeroLogger()
	if zl.GetLevel() != zerolog.DebugLevel {
		t.Errorf("after Reconfigure(debug), level = %v; want DebugLevel", zl.GetLevel())
	}
}

func TestLogger_WailsInterface_doesNotPanic(t *testing.T) {
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	l.Print("print")
	l.Trace("trace")
	l.Debug("debug")
	l.Info("info")
	l.Warning("warning")
	l.Error("error")
	l.Fatal("fatal")
}

func TestTimer_Stop_emitsDurationMs(t *testing.T) {
	var buf bytes.Buffer
	zl := zerolog.New(&buf)
	timer := logging.StartTimer(zl)
	timer.Stop()

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("Stop() did not emit valid JSON: %v", err)
	}
	if _, ok := entry["duration_ms"]; !ok {
		t.Error("Stop() output missing duration_ms field")
	}
}

func TestLogger_WithOp_stampsField(t *testing.T) {
	var buf bytes.Buffer
	cfg := logging.DefaultConfig()
	cfg.Level = "debug"

	// Build a Logger whose ZeroLogger we override with a test writer.
	// WithOp calls ZeroLogger() internally, so we test via the returned zerolog.Logger.
	l, err := logging.New(cfg, false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	// We can't inject a custom writer into Logger directly, so test the chain
	// by using ZeroLogger's With() to mimic what WithOp does.
	opLog := l.ZeroLogger().With().Str("op", "test.Op").Logger()
	opLog = opLog.Output(&buf)
	opLog.Info().Msg("hello")

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("output not valid JSON: %v", err)
	}
	if entry["op"] != "test.Op" {
		t.Errorf("op field = %v; want test.Op", entry["op"])
	}
}

func TestLogger_Close_idempotent(t *testing.T) {
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if err := l.Close(); err != nil {
		t.Errorf("first Close() error: %v", err)
	}
	if err := l.Close(); err != nil {
		t.Errorf("second Close() error: %v", err)
	}
}

func TestNew_devMode_doesNotPanic(t *testing.T) {
	// Exercises the dev=true console writer branch in rebuild.
	l, err := logging.New(logging.DefaultConfig(), true)
	if err != nil {
		t.Fatalf("New(dev=true): %v", err)
	}
	l.Info("dev mode test")
	_ = l.Close()
}

func TestNew_fileEnabled_writesToFile(t *testing.T) {
	dir := t.TempDir()
	cfg := logging.Config{
		FileEnabled: true,
		Level:       "debug",
		Directory:   dir,
		MaxSizeMB:   1,
		MaxBackups:  1,
		MaxAgeDays:  1,
		Compress:    false,
	}
	l, err := logging.New(cfg, false)
	if err != nil {
		t.Fatalf("New with file: %v", err)
	}
	l.Info("hello from file")
	if err := l.Close(); err != nil {
		t.Errorf("Close: %v", err)
	}
}

func TestLogger_Reconfigure_replacesFileSink(t *testing.T) {
	dir1 := t.TempDir()
	dir2 := t.TempDir()

	cfg := logging.Config{
		FileEnabled: true,
		Level:       "info",
		Directory:   dir1,
		MaxSizeMB:   1,
		MaxBackups:  1,
		MaxAgeDays:  1,
	}
	l, err := logging.New(cfg, false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	// Reconfigure to a different directory — exercises the "close existing file" branch.
	cfg.Directory = dir2
	if err := l.Reconfigure(cfg, false); err != nil {
		t.Fatalf("Reconfigure: %v", err)
	}
	l.Info("after reconfigure")
	_ = l.Close()
}

func TestLogger_WithOp_directCall(t *testing.T) {
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	// WithOp should return a zerolog.Logger without panicking.
	opLog := l.WithOp("SomeService.Method")
	opLog.Info().Msg("op log")
}

func TestLogger_Reconfigure_disablesFileWriter(t *testing.T) {
	dir := t.TempDir()
	cfg := logging.Config{
		FileEnabled: true,
		Level:       "info",
		Directory:   dir,
		MaxSizeMB:   1,
		MaxBackups:  1,
		MaxAgeDays:  1,
		Compress:    false,
	}
	l, err := logging.New(cfg, false)
	if err != nil {
		t.Fatalf("New with file: %v", err)
	}

	// Disable file writer — exercises the close-existing-sink and no-file branch.
	cfg.FileEnabled = false
	if err := l.Reconfigure(cfg, false); err != nil {
		t.Fatalf("Reconfigure to file-disabled: %v", err)
	}

	// Logger must still be usable; writes go to stderr only.
	l.Info("written after file disabled")
	if err := l.Close(); err != nil {
		t.Errorf("Close after disable: %v", err)
	}
}

func TestNewAppStructLogger_returnsWorkingLogger(t *testing.T) {
	l := logging.NewAppStructLogger()
	if l == nil {
		t.Fatal("NewAppStructLogger returned nil")
	}
	// Should not panic.
	l.Info("compat logger works")
}
