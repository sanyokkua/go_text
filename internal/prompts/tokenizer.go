package prompts

import (
	"sync"

	"github.com/pkoukk/tiktoken-go"
	tiktoken_loader "github.com/pkoukk/tiktoken-go-loader"
)

var (
	tiktokenOnce sync.Once
	tiktokenEnc  *tiktoken.Tiktoken
)

// charsPerTokenFallback approximates cl100k_base's average token length when
// the embedded encoder fails to initialize.
const charsPerTokenFallback = 4

func getEncoder() *tiktoken.Tiktoken {
	tiktokenOnce.Do(func() {
		tiktoken.SetBpeLoader(tiktoken_loader.NewOfflineLoader())
		enc, err := tiktoken.GetEncoding("cl100k_base")
		if err == nil {
			tiktokenEnc = enc
		}
	})
	return tiktokenEnc
}

// EstimateTokenCount returns an approximate cl100k_base token count for text,
// using an offline-embedded BPE tokenizer (no network access). Exact for
// OpenAI/Azure-compatible models, a close approximation for other providers.
func EstimateTokenCount(text string) int {
	if text == "" {
		return 0
	}
	enc := getEncoder()
	if enc == nil {
		return len(text) / charsPerTokenFallback
	}
	return len(enc.EncodeOrdinary(text))
}
