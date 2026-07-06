package gate

// InferenceGate is a process-wide single-slot non-blocking semaphore.
// TryAcquire returns true only when no inference is currently in progress.
// The same instance is shared between TestInference (T09) and the chain
// orchestrator (T13) so a run and a test inference are mutually exclusive.
type InferenceGate struct {
	ch chan struct{}
}

// New returns an unacquired InferenceGate.
func New() *InferenceGate {
	return &InferenceGate{ch: make(chan struct{}, 1)}
}

// TryAcquire acquires the gate non-blocking. Returns false immediately if
// already held.
func (g *InferenceGate) TryAcquire() bool {
	select {
	case g.ch <- struct{}{}:
		return true
	default:
		return false
	}
}

// Release releases the gate. No-op if the gate is already free.
func (g *InferenceGate) Release() {
	select {
	case <-g.ch:
	default:
	}
}
