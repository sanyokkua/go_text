package logging_test

import (
	"sync"
	"testing"
	"time"

	"go_text/internal/logging"
)

func TestSafeGo_recoversFromPanic(t *testing.T) {
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	var done sync.WaitGroup
	done.Add(1)

	logging.SafeGo(l, "TestSafeGo_recoversFromPanic", func() {
		defer done.Done()
		panic("test panic")
	})

	// If SafeGo did not recover, this goroutine would be killed and the test
	// would fail with a panic stack trace rather than reaching this point.
	waitWithTimeout(t, &done, 2*time.Second)
}

func TestSafeGo_runsFunction(t *testing.T) {
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	var called bool
	var wg sync.WaitGroup
	wg.Add(1)
	logging.SafeGo(l, "TestSafeGo_runsFunction", func() {
		defer wg.Done()
		called = true
	})

	waitWithTimeout(t, &wg, 2*time.Second)

	if !called {
		t.Error("SafeGo did not call the provided function")
	}
}

func waitWithTimeout(t *testing.T, wg *sync.WaitGroup, timeout time.Duration) {
	t.Helper()
	done := make(chan struct{})
	go func() { wg.Wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(timeout):
		t.Fatalf("goroutine did not finish within %v", timeout)
	}
}
