package actions

import (
	"testing"

	"go_text/internal/settings"
)

// TestNewChatCompletionRequest_MaxOutputTokensDecoupledFromContextWindow is the
// T62 regression guard: newChatCompletionRequest must never derive MaxTokens/
// MaxCompletionTokens from ContextWindow. The two settings are independent.
func TestNewChatCompletionRequest_MaxOutputTokensDecoupledFromContextWindow(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                   string
		modelConfig            settings.ModelConfig
		wantMaxTokens          *int
		wantMaxCompletionToken *int
	}{
		{
			name: "context_window_on_max_output_tokens_off_sends_no_token_cap",
			modelConfig: settings.ModelConfig{
				UseContextWindow:   true,
				ContextWindow:      32768,
				UseMaxOutputTokens: false,
			},
			wantMaxTokens:          nil,
			wantMaxCompletionToken: nil,
		},
		{
			name: "both_on_modern_field_carries_max_output_tokens_not_context_window",
			modelConfig: settings.ModelConfig{
				UseContextWindow:   true,
				ContextWindow:      32768,
				UseMaxOutputTokens: true,
				MaxOutputTokens:    512,
				UseLegacyMaxTokens: false,
			},
			wantMaxTokens:          nil,
			wantMaxCompletionToken: intPtr(512),
		},
		{
			name: "both_on_legacy_field_carries_max_output_tokens_not_context_window",
			modelConfig: settings.ModelConfig{
				UseContextWindow:   true,
				ContextWindow:      32768,
				UseMaxOutputTokens: true,
				MaxOutputTokens:    512,
				UseLegacyMaxTokens: true,
			},
			wantMaxTokens:          intPtr(512),
			wantMaxCompletionToken: nil,
		},
		{
			name: "max_output_tokens_on_context_window_off",
			modelConfig: settings.ModelConfig{
				UseContextWindow:   false,
				UseMaxOutputTokens: true,
				MaxOutputTokens:    256,
				UseLegacyMaxTokens: false,
			},
			wantMaxTokens:          nil,
			wantMaxCompletionToken: intPtr(256),
		},
		{
			name:                   "both_off_sends_no_token_cap",
			modelConfig:            settings.ModelConfig{},
			wantMaxTokens:          nil,
			wantMaxCompletionToken: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			cfg := &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{Kind: "openai"},
				ModelConfig:           tt.modelConfig,
			}

			req := newChatCompletionRequest(cfg, "user prompt", "system prompt")

			assertIntPtrEqual(t, "MaxTokens", req.MaxTokens, tt.wantMaxTokens)
			assertIntPtrEqual(t, "MaxCompletionTokens", req.MaxCompletionTokens, tt.wantMaxCompletionToken)

			if req.MaxTokens != nil && tt.modelConfig.ContextWindow != 0 && *req.MaxTokens == tt.modelConfig.ContextWindow {
				t.Errorf("MaxTokens must never equal ContextWindow (%d); regression of T62", tt.modelConfig.ContextWindow)
			}
			if req.MaxCompletionTokens != nil && tt.modelConfig.ContextWindow != 0 && *req.MaxCompletionTokens == tt.modelConfig.ContextWindow {
				t.Errorf("MaxCompletionTokens must never equal ContextWindow (%d); regression of T62", tt.modelConfig.ContextWindow)
			}
		})
	}
}

func intPtr(v int) *int { return &v }

func assertIntPtrEqual(t *testing.T, field string, got, want *int) {
	t.Helper()
	switch {
	case got == nil && want == nil:
		return
	case got == nil || want == nil:
		t.Errorf("%s: got %v, want %v", field, got, want)
	case *got != *want:
		t.Errorf("%s: got %d, want %d", field, *got, *want)
	}
}
