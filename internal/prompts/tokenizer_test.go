package prompts

import (
	"fmt"
	"net/http"
	"testing"
)

// blockedTransport fails every request, simulating a fully offline environment.
type blockedTransport struct{}

func (blockedTransport) RoundTrip(_ *http.Request) (*http.Response, error) {
	return nil, fmt.Errorf("network access is blocked in this test")
}

// TestEstimateTokenCount_NeverFetchesOverNetwork proves the BPE rank data is
// loaded entirely from the embedded offline loader: with the default HTTP
// transport replaced by one that fails every request, encoding must still
// succeed. This must run before any other test in this file triggers the
// encoder's one-time initialization, otherwise it would only exercise the
// already-cached encoder rather than the offline load path itself.
func TestEstimateTokenCount_NeverFetchesOverNetwork(t *testing.T) {
	original := http.DefaultTransport
	http.DefaultTransport = blockedTransport{}
	t.Cleanup(func() { http.DefaultTransport = original })

	got := EstimateTokenCount("Hello, world!")
	want := 4
	if got != want {
		t.Errorf("EstimateTokenCount with network blocked = %d, want %d (offline loader must not depend on HTTP)", got, want)
	}
}

func TestEstimateTokenCount_EmptyString(t *testing.T) {
	if got := EstimateTokenCount(""); got != 0 {
		t.Errorf("EstimateTokenCount(\"\") = %d, want 0", got)
	}
}

func TestEstimateTokenCount_KnownStrings(t *testing.T) {
	tests := []struct {
		name string
		text string
		want int
	}{
		{name: "single_word", text: "hello", want: 1},
		{name: "greeting_with_punctuation", text: "Hello, world!", want: 4},
		{name: "short_sentence", text: "The quick brown fox jumps over the lazy dog.", want: 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EstimateTokenCount(tt.text); got != tt.want {
				t.Errorf("EstimateTokenCount(%q) = %d, want %d", tt.text, got, tt.want)
			}
		})
	}
}

func TestEstimateTokenCount_ScalesWithLength(t *testing.T) {
	shortCount := EstimateTokenCount("hello world")
	longCount := EstimateTokenCount("hello world, this is a much longer sentence with many more words in it")

	if longCount <= shortCount {
		t.Errorf("expected longer text to yield more tokens: short=%d long=%d", shortCount, longCount)
	}
}
