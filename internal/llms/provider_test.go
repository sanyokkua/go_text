package llms

import (
	"strings"
	"testing"

	"go_text/internal/settings"
)

func makeCfg(kind, baseURL, authScheme, apiKeyEnv, completionPath, modelsPath, model, apiVersion string, headers map[string]string) ResolvedProviderConfig {
	return ResolvedProviderConfig{
		Config: settings.ProviderConfig{
			Name:           "test-provider",
			Kind:           kind,
			BaseURL:        baseURL,
			AuthScheme:     authScheme,
			APIKeyEnvVar:   apiKeyEnv,
			SelectedModel:  model,
			CompletionPath: completionPath,
			ModelsPath:     modelsPath,
			APIVersion:     apiVersion,
			Headers:        headers,
		},
		Secret: "",
	}
}

// --- URL building ---

func TestBuildCompletionURL_OllamaDefault(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{
		cfg:     makeCfg("ollama", "", "", "", "", "", "", "", nil),
		profile: ollamaProfile,
	}
	got := p.buildCompletionURL()
	if got != "http://127.0.0.1:11434/v1/chat/completions" {
		t.Errorf("unexpected URL: %q", got)
	}
}

func TestBuildCompletionURL_CustomBaseURL(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{
		cfg:     makeCfg("ollama", "http://custom:9999/", "", "", "", "", "", "", nil),
		profile: ollamaProfile,
	}
	got := p.buildCompletionURL()
	if got != "http://custom:9999/v1/chat/completions" {
		t.Errorf("unexpected URL: %q", got)
	}
}

func TestBuildCompletionURL_AzureDeploymentInPath(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{
		cfg:     makeCfg("azure", "https://my-endpoint.openai.azure.com/", "", "", "", "", "gpt-4o", "", nil),
		profile: azureProfile,
	}
	got := p.buildCompletionURL()
	want := "https://my-endpoint.openai.azure.com/openai/deployments/gpt-4o/chat/completions"
	if got != want {
		t.Errorf("want %q\ngot  %q", want, got)
	}
}

func TestBuildModelsURL_OllamaUsesV1Models(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{
		cfg:     makeCfg("ollama", "", "", "", "", "", "", "", nil),
		profile: ollamaProfile,
	}
	got := p.buildModelsURL()
	if got != "http://127.0.0.1:11434/v1/models" {
		t.Errorf("unexpected URL: %q", got)
	}
}

func TestBuildModelsURL_AzureWithAPIVersion(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{
		cfg:     makeCfg("azure", "https://ep.openai.azure.com/", "", "", "", "", "", "2024-02-01", nil),
		profile: azureProfile,
	}
	got := p.buildModelsURL()
	want := "https://ep.openai.azure.com/openai/deployments?api-version=2024-02-01"
	if got != want {
		t.Errorf("want %q\ngot  %q", want, got)
	}
}

func TestBuildModelsURL_CustomModelsPath(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{
		cfg:     makeCfg("openai", "https://api.openai.com/", "", "", "", "v1/models/custom", "", "", nil),
		profile: openAIProfile,
	}
	got := p.buildModelsURL()
	if got != "https://api.openai.com/v1/models/custom" {
		t.Errorf("unexpected URL: %q", got)
	}
}

// --- Auth headers ---

func TestBuildHeaders_None(t *testing.T) {
	t.Parallel()
	cfg := makeCfg("ollama", "", "none", "", "", "", "", "", nil)
	cfg.Secret = "should-be-ignored"
	p := &OpenAICompatibleProvider{cfg: cfg, profile: ollamaProfile}
	h := p.buildHeaders()
	if _, ok := h["Authorization"]; ok {
		t.Error("expected no Authorization header for auth=none")
	}
}

func TestBuildHeaders_Bearer(t *testing.T) {
	t.Parallel()
	cfg := makeCfg("openai", "", "bearer", "MY_KEY", "", "", "", "", nil)
	cfg.Secret = "sk-secret"
	p := &OpenAICompatibleProvider{cfg: cfg, profile: openAIProfile}
	h := p.buildHeaders()
	if h["Authorization"] != "Bearer sk-secret" {
		t.Errorf("want 'Bearer sk-secret', got %q", h["Authorization"])
	}
}

func TestBuildHeaders_APIKey(t *testing.T) {
	t.Parallel()
	cfg := makeCfg("azure", "", "apiKey", "AZURE_KEY", "", "", "", "", nil)
	cfg.Secret = "azure-secret"
	p := &OpenAICompatibleProvider{cfg: cfg, profile: azureProfile}
	h := p.buildHeaders()
	if h["Api-Key"] != "azure-secret" {
		t.Errorf("want 'azure-secret', got %q", h["Api-Key"])
	}
}

func TestBuildHeaders_CustomHeadersMerged(t *testing.T) {
	t.Parallel()
	cfg := makeCfg("openai", "", "bearer", "", "", "", "", "", map[string]string{"X-Custom": "value"})
	cfg.Secret = "tok"
	p := &OpenAICompatibleProvider{cfg: cfg, profile: openAIProfile}
	h := p.buildHeaders()
	if h["X-Custom"] != "value" {
		t.Errorf("want custom header, got %q", h["X-Custom"])
	}
	if !strings.HasPrefix(h["Authorization"], "Bearer ") {
		t.Error("want Authorization header alongside custom header")
	}
}

func TestBuildHeaders_DefaultAuthSchemeUsedWhenConfigEmpty(t *testing.T) {
	t.Parallel()
	// OpenAI profile default = bearer; config leaves AuthScheme empty
	cfg := makeCfg("openai", "", "", "", "", "", "", "", nil)
	cfg.Secret = "tok"
	p := &OpenAICompatibleProvider{cfg: cfg, profile: openAIProfile}
	h := p.buildHeaders()
	if !strings.HasPrefix(h["Authorization"], "Bearer ") {
		t.Errorf("want default bearer from profile, got %v", h)
	}
}

// --- Capabilities and Kind ---

func TestCapabilities_OllamaStripsThinkTags(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{profile: ollamaProfile}
	if !p.Capabilities().StripThinkTags {
		t.Error("want StripThinkTags=true for ollama")
	}
}

func TestCapabilities_OpenAIDoesNotStrip(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{profile: openAIProfile}
	if p.Capabilities().StripThinkTags {
		t.Error("want StripThinkTags=false for openai")
	}
}

func TestKind_ReturnsProfileKind(t *testing.T) {
	t.Parallel()
	p := &OpenAICompatibleProvider{profile: lmStudioProfile}
	if p.Kind() != KindLMStudio {
		t.Errorf("want KindLMStudio, got %q", p.Kind())
	}
}
