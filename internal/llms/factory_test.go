package llms

import (
	"context"
	"errors"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/settings"
)

// mockProvider is a minimal mock Provider for testing custom kinds.
type mockProvider struct {
	kind ProviderKind
}

func (m *mockProvider) Kind() ProviderKind {
	return m.kind
}

func (m *mockProvider) Capabilities() ProviderCapabilities {
	return ProviderCapabilities{}
}

func (m *mockProvider) Chat(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	return ChatResponse{}, nil
}

func (m *mockProvider) ListModels(ctx context.Context) ([]apperr.ModelInfo, error) {
	return nil, nil
}

// makeMockBuilder returns a builder that always returns a mock provider with the given kind.
func makeMockBuilder(kind ProviderKind) ProviderBuilder {
	return func(cfg ResolvedProviderConfig, profile ProviderProfile) (Provider, error) {
		return &mockProvider{kind: kind}, nil
	}
}

// makeCfgWithKind constructs a ResolvedProviderConfig with the given kind.
func makeCfgWithKind(kind string) ResolvedProviderConfig {
	return ResolvedProviderConfig{
		Config: settings.ProviderConfig{
			Kind:      kind,
			BaseURL:   "http://localhost:11434",
			Name:      "test-provider",
			AuthScheme: "none",
		},
		Secret: "",
	}
}

// TestProviderFactory_Build_AllKinds verifies that NewProviderFactory registers
// all five built-in kinds and that Build() returns a non-nil Provider for each.
func TestProviderFactory_Build_AllKinds(t *testing.T) {
	t.Parallel()

	type args struct {
		kind ProviderKind
	}

	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name:    "ollama",
			args:    args{kind: KindOllama},
			wantErr: false,
		},
		{
			name:    "lmstudio",
			args:    args{kind: KindLMStudio},
			wantErr: false,
		},
		{
			name:    "llamacpp",
			args:    args{kind: KindLlamaCpp},
			wantErr: false,
		},
		{
			name:    "openai",
			args:    args{kind: KindOpenAI},
			wantErr: false,
		},
		{
			name:    "azure",
			args:    args{kind: KindAzure},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			factory := NewProviderFactory(nil)
			cfg := makeCfgWithKind(string(tt.args.kind))

			// Act
			provider, err := factory.Build(cfg)

			// Assert
			if (err != nil) != tt.wantErr {
				t.Errorf("Build() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if provider == nil {
				t.Error("Build() returned nil provider")
				return
			}

			if provider.Kind() != tt.args.kind {
				t.Errorf("Build() provider.Kind() = %v, want %v", provider.Kind(), tt.args.kind)
			}
		})
	}
}

// TestProviderFactory_Build_UnknownKind verifies that Build() returns a validation
// error when the kind is not registered.
func TestProviderFactory_Build_UnknownKind(t *testing.T) {
	t.Parallel()

	// Arrange
	factory := NewProviderFactory(nil)
	cfg := makeCfgWithKind("unknown_provider")

	// Act
	provider, err := factory.Build(cfg)

	// Assert
	if provider != nil {
		t.Error("Build() should return nil provider for unknown kind")
	}

	if err == nil {
		t.Fatal("Build() should return an error for unknown kind")
	}

	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("Build() error is not *apperr.AppError: %T", err)
	}

	if ae.Code != apperr.CodeValidation {
		t.Errorf("Build() error code = %v, want %v", ae.Code, apperr.CodeValidation)
	}
}

// TestProviderFactory_Register_CustomKind verifies that Register() allows adding
// custom providers and that Build() correctly uses the custom builder.
func TestProviderFactory_Register_CustomKind(t *testing.T) {
	t.Parallel()

	// Arrange
	factory := NewProviderFactory(nil)
	customKind := ProviderKind("custom_provider")
	mockBuilder := makeMockBuilder(customKind)
	customProfile := ProviderProfile{
		Kind:               customKind,
		DefaultBaseURL:     "http://custom:8000",
		DefaultAuthScheme:  AuthNone,
		CompletionPathTemplate: "v1/chat/completions",
		ModelsPathTemplate: "v1/models",
		Capabilities: ProviderCapabilities{
			SupportsDiscovery: false,
		},
	}

	// Act
	factory.Register(customKind, mockBuilder, customProfile)
	cfg := makeCfgWithKind(string(customKind))
	provider, err := factory.Build(cfg)

	// Assert
	if err != nil {
		t.Fatalf("Build() returned error: %v", err)
	}

	if provider == nil {
		t.Error("Build() returned nil provider")
		return
	}

	if provider.Kind() != customKind {
		t.Errorf("Build() provider.Kind() = %v, want %v", provider.Kind(), customKind)
	}
}

// TestProviderFactory_Register_OverridesExisting verifies that Register() can replace
// a built-in provider with a custom one.
func TestProviderFactory_Register_OverridesExisting(t *testing.T) {
	t.Parallel()

	// Arrange
	factory := NewProviderFactory(nil)
	mockBuilder := makeMockBuilder(KindOllama)
	customProfile := ProviderProfile{
		Kind:               KindOllama,
		DefaultBaseURL:     "http://custom:8000",
		DefaultAuthScheme:  AuthNone,
		CompletionPathTemplate: "v1/chat/completions",
		ModelsPathTemplate: "v1/models",
		Capabilities: ProviderCapabilities{},
	}

	// Act
	factory.Register(KindOllama, mockBuilder, customProfile)
	cfg := makeCfgWithKind(string(KindOllama))
	provider, err := factory.Build(cfg)

	// Assert
	if err != nil {
		t.Fatalf("Build() returned error: %v", err)
	}

	if provider == nil {
		t.Error("Build() returned nil provider")
		return
	}

	// Verify it's the custom mock, not the default OpenAICompatibleProvider
	mock, ok := provider.(*mockProvider)
	if !ok {
		t.Errorf("Build() returned %T, want *mockProvider", provider)
	} else if mock.kind != KindOllama {
		t.Errorf("mockProvider.kind = %v, want %v", mock.kind, KindOllama)
	}
}
