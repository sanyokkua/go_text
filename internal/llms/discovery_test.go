package llms

import (
	"encoding/json"
	"testing"

	"go_text/internal/apperr"
)

// --- parseOllamaTags ---

func TestParseOllamaTags_ValidResponse(t *testing.T) {
	t.Parallel()
	body := []byte(`{"models":[{"name":"llama3:8b"},{"name":"mistral:7b"}]}`)
	got, err := parseOllamaTags(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 models, got %d", len(got))
	}
	if got[0].ID != "llama3:8b" {
		t.Errorf("want ID=llama3:8b, got %q", got[0].ID)
	}
	if got[1].ID != "mistral:7b" {
		t.Errorf("want ID=mistral:7b, got %q", got[1].ID)
	}
}

func TestParseOllamaTags_EmptyModels(t *testing.T) {
	t.Parallel()
	body := []byte(`{"models":[]}`)
	got, err := parseOllamaTags(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("want 0 models, got %d", len(got))
	}
}

func TestParseOllamaTags_MalformedJSON(t *testing.T) {
	t.Parallel()
	_, err := parseOllamaTags([]byte(`not json`))
	if err == nil {
		t.Fatal("want error for malformed JSON, got nil")
	}
}

func TestParseOllamaTags_SkipsEmptyNames(t *testing.T) {
	t.Parallel()
	body := []byte(`{"models":[{"name":""},{"name":"llama3:8b"}]}`)
	got, err := parseOllamaTags(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != "llama3:8b" {
		t.Errorf("want 1 model with ID=llama3:8b, got %v", got)
	}
}

// --- parseStandardModels ---

func TestParseStandardModels_WrappedForm(t *testing.T) {
	t.Parallel()
	body := []byte(`{"data":[{"id":"gpt-4o"},{"id":"gpt-3.5-turbo"}]}`)
	got, err := parseStandardModels(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 models, got %d", len(got))
	}
	if got[0].ID != "gpt-4o" {
		t.Errorf("want gpt-4o, got %q", got[0].ID)
	}
}

func TestParseStandardModels_BareArrayForm(t *testing.T) {
	t.Parallel()
	body := []byte(`[{"id":"model-a"},{"id":"model-b"}]`)
	got, err := parseStandardModels(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 models, got %d", len(got))
	}
	if got[1].ID != "model-b" {
		t.Errorf("want model-b, got %q", got[1].ID)
	}
}

func TestParseStandardModels_EmptyData(t *testing.T) {
	t.Parallel()
	body := []byte(`{"data":[]}`)
	got, err := parseStandardModels(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("want 0 models, got %d", len(got))
	}
}

func TestParseStandardModels_MalformedJSON(t *testing.T) {
	t.Parallel()
	_, err := parseStandardModels([]byte(`{broken`))
	if err == nil {
		t.Fatal("want error for malformed JSON, got nil")
	}
}

func TestParseStandardModels_SkipsEmptyIDs(t *testing.T) {
	t.Parallel()
	body := []byte(`{"data":[{"id":""},{"id":"valid-model"}]}`)
	got, err := parseStandardModels(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != "valid-model" {
		t.Errorf("want 1 model with ID=valid-model, got %v", got)
	}
}

// --- parseAzureDeployments ---

func TestParseAzureDeployments_WrappedRich(t *testing.T) {
	t.Parallel()
	trueVal := true
	maxTok := 4096
	body, _ := json.Marshal(map[string]interface{}{
		"data": []map[string]interface{}{
			{
				"id":           "gpt-4-deployment",
				"display_name": "GPT-4",
				"capabilities": map[string]bool{"chat_completion": true},
				"features":     map[string]interface{}{"temperature": true},
				"limits":       map[string]interface{}{"max_prompt_tokens": 4096},
			},
		},
	})
	_ = trueVal
	_ = maxTok

	got, err := parseAzureDeployments(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("want 1 model, got %d", len(got))
	}
	m := got[0]
	if m.ID != "gpt-4-deployment" {
		t.Errorf("want ID=gpt-4-deployment, got %q", m.ID)
	}
	if m.Label != "GPT-4" {
		t.Errorf("want Label=GPT-4, got %q", m.Label)
	}
	if m.Caps == nil {
		t.Fatal("want non-nil Caps")
	}
	if m.Caps.MaxPromptTokens == nil || *m.Caps.MaxPromptTokens != 4096 {
		t.Errorf("want MaxPromptTokens=4096, got %v", m.Caps.MaxPromptTokens)
	}
}

func TestParseAzureDeployments_FiltersNonChat(t *testing.T) {
	t.Parallel()
	body := []byte(`{"data":[
		{"id":"embedding-model","capabilities":{"chat_completion":false}},
		{"id":"chat-model","capabilities":{"chat_completion":true}}
	]}`)
	got, err := parseAzureDeployments(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != "chat-model" {
		t.Errorf("want only chat-model, got %v", got)
	}
}

func TestParseAzureDeployments_NilCapabilitiesIncluded(t *testing.T) {
	t.Parallel()
	body := []byte(`[{"id":"unknown-model"}]`)
	got, err := parseAzureDeployments(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("want 1 model (nil capabilities = assume chat), got %d", len(got))
	}
}

func TestParseAzureDeployments_MalformedJSON(t *testing.T) {
	t.Parallel()
	_, err := parseAzureDeployments([]byte(`{bad`))
	if err == nil {
		t.Fatal("want error for malformed JSON, got nil")
	}
}

func TestParseAzureDeployments_BareArray(t *testing.T) {
	t.Parallel()
	body := []byte(`[{"id":"dep-a"},{"id":"dep-b"}]`)
	got, err := parseAzureDeployments(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2, got %d", len(got))
	}
}

// Compile-time check: DiscoveryStrategy must be a function type (not an interface).
var _ DiscoveryStrategy = parseOllamaTags
var _ DiscoveryStrategy = parseStandardModels
var _ DiscoveryStrategy = parseAzureDeployments
var _ apperr.ModelInfo // reference apperr to ensure import resolves
