package gate

import "testing"

func TestInferenceGate_TryAcquire_FreeGate(t *testing.T) {
	t.Parallel()
	g := New()
	if !g.TryAcquire() {
		t.Fatal("TryAcquire on free gate must return true")
	}
	g.Release()
}

func TestInferenceGate_TryAcquire_HeldGate(t *testing.T) {
	t.Parallel()
	g := New()
	if !g.TryAcquire() {
		t.Fatal("first TryAcquire must succeed")
	}
	defer g.Release()
	if g.TryAcquire() {
		t.Fatal("second TryAcquire on held gate must return false")
	}
}

func TestInferenceGate_Release_AllowsReacquire(t *testing.T) {
	t.Parallel()
	g := New()
	if !g.TryAcquire() {
		t.Fatal("first TryAcquire must succeed")
	}
	g.Release()
	if !g.TryAcquire() {
		t.Fatal("TryAcquire after Release must succeed")
	}
	g.Release()
}

func TestInferenceGate_Release_IdempotentOnFreeGate(t *testing.T) {
	t.Parallel()
	g := New()
	// Double-release must not panic or deadlock
	g.Release()
	g.Release()
}
