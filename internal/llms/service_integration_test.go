package llms

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/settings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"resty.dev/v3"
)

// TestLogger is a simple logger for testing that implements the logger.Logger interface
type TestLogger struct{}

func (l *TestLogger) Print(message string)   {}
func (l *TestLogger) Trace(message string)   {}
func (l *TestLogger) Debug(message string)   {}
func (l *TestLogger) Info(message string)    {}
func (l *TestLogger) Warning(message string) {}
func (l *TestLogger) Error(message string)   {}
func (l *TestLogger) Fatal(message string)   {}

// MockSettingsService is a minimal mock for settings service that implements only what LLMServiceAPI needs
type MockSettingsService struct {
	baseConfig     *settings.InferenceBaseConfig
	providerConfig *settings.ProviderConfig
	modelConfig    *settings.ModelConfig
}

func (m *MockSettingsService) GetLoggingConfig() (*settings.LoggingConfig, error) {
	return &settings.LoggingConfig{}, nil
}

func (m *MockSettingsService) UpdateLoggingConfig(cfg *settings.LoggingConfig) (*settings.LoggingConfig, error) {
	return cfg, nil
}

func (m *MockSettingsService) GetAppSettingsMetadata() (*settings.AppSettingsMetadata, error) {
	return &settings.AppSettingsMetadata{}, nil
}

func (m *MockSettingsService) GetSettings() (*settings.Settings, error) {
	return &settings.Settings{}, nil
}

func (m *MockSettingsService) ResetSettingsToDefault() (*settings.Settings, error) {
	return &settings.Settings{}, nil
}

func (m *MockSettingsService) GetAllProviderConfigs() ([]settings.ProviderConfig, error) {
	return []settings.ProviderConfig{}, nil
}

func (m *MockSettingsService) GetCurrentProviderConfig() (*settings.ProviderConfig, error) {
	if m.providerConfig != nil {
		return m.providerConfig, nil
	}
	// Return a default provider for testing
	return &settings.ProviderConfig{
		Name:            "Test Provider",
		Kind:            "openai",
		BaseURL:         "http://localhost:11434/",
		ModelsPath:      "v1/models",
		CompletionPath:  "v1/chat/completions",
		AuthScheme:      "none",
		UseCustomModels: false,
	}, nil
}

func (m *MockSettingsService) GetProviderConfig(providerId string) (*settings.ProviderConfig, error) {
	return &settings.ProviderConfig{}, nil
}

func (m *MockSettingsService) CreateProviderConfig(cfg *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return cfg, nil
}

func (m *MockSettingsService) UpdateProviderConfig(cfg *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return cfg, nil
}

func (m *MockSettingsService) DeleteProviderConfig(providerId string) error {
	return nil
}

func (m *MockSettingsService) SetAsCurrentProviderConfig(providerId string) (*settings.ProviderConfig, error) {
	return &settings.ProviderConfig{}, nil
}

func (m *MockSettingsService) GetInferenceBaseConfig() (*settings.InferenceBaseConfig, error) {
	if m.baseConfig != nil {
		return m.baseConfig, nil
	}
	return &settings.InferenceBaseConfig{
		Timeout:    30,
		MaxRetries: 3,
	}, nil
}

func (m *MockSettingsService) GetModelConfig() (*settings.ModelConfig, error) {
	if m.modelConfig != nil {
		return m.modelConfig, nil
	}
	return &settings.ModelConfig{}, nil
}

func (m *MockSettingsService) UpdateInferenceBaseConfig(cfg *settings.InferenceBaseConfig) (*settings.InferenceBaseConfig, error) {
	m.baseConfig = cfg
	return cfg, nil
}

func (m *MockSettingsService) UpdateModelConfig(cfg *settings.ModelConfig) (*settings.ModelConfig, error) {
	return cfg, nil
}

func (m *MockSettingsService) GetLanguageConfig() (*settings.LanguageConfig, error) {
	return &settings.LanguageConfig{}, nil
}

func (m *MockSettingsService) SetDefaultInputLanguage(language string) error {
	return nil
}

func (m *MockSettingsService) SetDefaultOutputLanguage(language string) error {
	return nil
}

func (m *MockSettingsService) AddLanguage(language string) ([]string, error) {
	return []string{language}, nil
}

func (m *MockSettingsService) RemoveLanguage(language string) ([]string, error) {
	return []string{}, nil
}

func (m *MockSettingsService) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error) {
	return &settings.AppBehaviorConfig{}, nil
}

func (m *MockSettingsService) UpdateAppBehaviorConfig(cfg *settings.AppBehaviorConfig) (*settings.AppBehaviorConfig, error) {
	return cfg, nil
}

func (m *MockSettingsService) GetUIPreferencesConfig() (*settings.UIPreferencesConfig, error) {
	return &settings.UIPreferencesConfig{}, nil
}

func (m *MockSettingsService) UpdateUIPreferencesConfig(cfg *settings.UIPreferencesConfig) (*settings.UIPreferencesConfig, error) {
	return cfg, nil
}

func (m *MockSettingsService) GetWindowSizeConfig() (*settings.WindowSizeConfig, error) {
	return &settings.WindowSizeConfig{}, nil
}

func (m *MockSettingsService) SaveWindowSize(width, height int) error {
	return nil
}

// MockServerBehavior controls the mock HTTP server responses
type MockServerBehavior struct {
	StatusCode         int
	ModelsResponse     *ModelsListResponse
	CompletionResponse *ChatCompletionResponse
	DelayDuration      time.Duration
}

// isModelsPath reports whether path is a known model-discovery endpoint.
func isModelsPath(path string) bool {
	return path == "/api/tags" || path == "/v1/models"
}

// isCompletionPath reports whether path is a known chat-completion endpoint.
func isCompletionPath(path string) bool {
	return path == "/api/chat" || path == "/v1/chat/completions"
}

// writeMockResponse routes the request to the appropriate mock response body.
func writeMockResponse(w http.ResponseWriter, r *http.Request, behavior *MockServerBehavior) {
	if isModelsPath(r.URL.Path) && behavior.ModelsResponse != nil {
		json.NewEncoder(w).Encode(behavior.ModelsResponse)
		return
	}
	if isCompletionPath(r.URL.Path) && behavior.CompletionResponse != nil {
		json.NewEncoder(w).Encode(behavior.CompletionResponse)
	}
}

// createMockServer creates a mock HTTP server for testing
func createMockServer(behavior *MockServerBehavior) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if behavior.DelayDuration > 0 {
			time.Sleep(behavior.DelayDuration)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(behavior.StatusCode)
		if behavior.StatusCode == http.StatusOK {
			writeMockResponse(w, r, behavior)
		}
	}))
}

// stringPtr is a helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}

// newTestService creates a new LLMService with a ProviderFactory for tests.
func newTestService(log *TestLogger, client *resty.Client, svc *MockSettingsService) LLMServiceAPI {
	factory := NewProviderFactory(client)
	return NewLLMApiService(log, factory, svc)
}

// TestLLMServiceAPI_GetModelsList tests the GetModelsList method
func TestLLMServiceAPI_GetModelsList(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	// Create mock server with success behavior
	mockBehavior := &MockServerBehavior{
		StatusCode: http.StatusOK,
		ModelsResponse: &ModelsListResponse{
			Data: []ModelsResponse{
				{ID: "model-1", Name: stringPtr("Test Model 1")},
				{ID: "model-2", Name: stringPtr("Test Model 2")},
			},
		},
	}
	mockServer := createMockServer(mockBehavior)
	defer mockServer.Close()

	// Update mock settings to use our test server
	settingsService.baseConfig = &settings.InferenceBaseConfig{
		Timeout:    30,
		MaxRetries: 3,
	}

	// Set the provider to use our mock server
	settingsService.providerConfig = &settings.ProviderConfig{
		Name:            "Test Provider",
		Kind:            "openai",
		BaseURL:         mockServer.URL + "/",
		ModelsPath:      "v1/models",
		CompletionPath:  "v1/chat/completions",
		AuthScheme:      "none",
		UseCustomModels: false,
	}

	// Test happy path
	t.Run("HappyPath", func(t *testing.T) {
		models, err := llmService.GetModelsList()
		require.NoError(t, err, "GetModelsList should succeed")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 2, "Should return 2 models")
		assert.Contains(t, models, "model-1", "Should contain model-1")
		assert.Contains(t, models, "model-2", "Should contain model-2")
	})

	// Discovery failures now fall back silently to custom models (empty list when none configured).
	t.Run("ErrorHandling", func(t *testing.T) {
		badProvider := &settings.ProviderConfig{
			Name:            "Bad Provider",
			Kind:            "openai",
			BaseURL:         "http://invalid-url-that-will-fail.com/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(badProvider)
		require.NoError(t, err, "Discovery failure should fall back silently, not return an error")
		assert.Empty(t, models, "Fallback with no CustomModels should return empty list")
	})
}

// TestLLMServiceAPI_GetCompletionResponse tests the GetCompletionResponse method
func TestLLMServiceAPI_GetCompletionResponse(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	// Create mock server with success behavior
	mockBehavior := &MockServerBehavior{
		StatusCode: http.StatusOK,
		CompletionResponse: &ChatCompletionResponse{
			ID:    "test-completion-1",
			Model: "model-1",
			Choices: []Choice{
				{
					Index: 0,
					Message: CompletionRequestMessage{
						Role:    "assistant",
						Content: "This is a test completion response.",
					},
					FinishReason: "stop",
				},
			},
			Usage: Usage{
				PromptTokens:     10,
				CompletionTokens: 20,
				TotalTokens:      30,
			},
		},
	}
	mockServer := createMockServer(mockBehavior)
	defer mockServer.Close()

	// Set the provider to use our mock server
	settingsService.providerConfig = &settings.ProviderConfig{
		Name:            "Test Provider",
		Kind:            "openai",
		BaseURL:         mockServer.URL + "/",
		ModelsPath:      "v1/models",
		CompletionPath:  "v1/chat/completions",
		AuthScheme:      "none",
		UseCustomModels: false,
	}

	// Test happy path
	t.Run("HappyPath", func(t *testing.T) {
		request := &ChatCompletionRequest{
			Model: "model-1",
			Messages: []CompletionRequestMessage{
				{
					Role:    "user",
					Content: "Hello, this is a test message.",
				},
			},
			Stream: false,
		}

		response, err := llmService.GetCompletionResponse(request)
		require.NoError(t, err, "GetCompletionResponse should succeed")
		assert.NotEmpty(t, response, "Response should not be empty")
		assert.Contains(t, response, "test completion response", "Response should contain expected content")
	})

	// Test with nil request
	t.Run("NilRequest", func(t *testing.T) {
		_, err := llmService.GetCompletionResponse(nil)
		assert.Error(t, err, "GetCompletionResponse should fail with nil request")
		assert.Contains(t, err.Error(), "completion request cannot be nil", "Error should mention nil request")
	})
}

// TestLLMServiceAPI_GetCompletionResponse_ContextWindowDecoupledFromMaxTokens is the
// T62 regression guard at the llms layer: a large ContextWindow must route only to
// options.num_ctx, never to a top-level max_tokens/max_completion_tokens field. Since
// T63, Ollama chat requests go through the native /api/chat endpoint (options.num_ctx
// is silently ignored by Ollama's OpenAI-compatible endpoint) — the output-token cap
// travels as options.num_predict there, not as a top-level field. This test proves the
// llms layer forwards the small output-token cap unchanged and never substitutes
// ContextWindow for it.
func TestLLMServiceAPI_GetCompletionResponse_ContextWindowDecoupledFromMaxTokens(t *testing.T) {
	log := &TestLogger{}
	restyClient := resty.New()

	var capturedBody map[string]any
	var capturedPath string
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedPath = r.URL.Path
		require.NoError(t, json.NewDecoder(r.Body).Decode(&capturedBody))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(&OllamaNativeChatResponse{
			Message:    CompletionRequestMessage{Role: "assistant", Content: "ok"},
			DoneReason: "stop",
		})
	}))
	defer mockServer.Close()

	const smallMaxOutputTokens = 512
	const largeContextWindow = 32768

	settingsService := &MockSettingsService{
		providerConfig: &settings.ProviderConfig{
			Name:           "Test Ollama Provider",
			Kind:           "ollama",
			BaseURL:        mockServer.URL + "/",
			ModelsPath:     "v1/models",
			CompletionPath: "v1/chat/completions",
			AuthScheme:     "none",
		},
		modelConfig: &settings.ModelConfig{
			UseContextWindow: true,
			ContextWindow:    largeContextWindow,
		},
	}
	llmService := newTestService(log, restyClient, settingsService)

	maxTokens := smallMaxOutputTokens
	request := &ChatCompletionRequest{
		Model:               "model-1",
		Messages:            []CompletionRequestMessage{{Role: "user", Content: "hello"}},
		MaxCompletionTokens: &maxTokens,
	}

	_, err := llmService.GetCompletionResponse(request)
	require.NoError(t, err)

	assert.Equal(t, "/api/chat", capturedPath, "ollama requests must hit the native chat endpoint")
	assert.NotContains(t, capturedBody, "max_completion_tokens")
	assert.NotContains(t, capturedBody, "max_tokens")

	options, ok := capturedBody["options"].(map[string]any)
	require.True(t, ok, "expected options object for ollama request")
	assert.Equal(t, float64(largeContextWindow), options["num_ctx"], "ContextWindow must route to num_ctx")
	assert.NotEqual(t, float64(largeContextWindow), options["num_predict"],
		"num_predict must never equal ContextWindow")
	assert.Equal(t, float64(smallMaxOutputTokens), options["num_predict"])
}

// TestLLMServiceAPI_GetModelsListForProvider tests the GetModelsListForProvider method
func TestLLMServiceAPI_GetModelsListForProvider(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	// Create mock server with success behavior
	mockBehavior := &MockServerBehavior{
		StatusCode: http.StatusOK,
		ModelsResponse: &ModelsListResponse{
			Data: []ModelsResponse{
				{ID: "api-model-1", Name: stringPtr("API Model 1")},
				{ID: "api-model-2", Name: stringPtr("API Model 2")},
			},
		},
	}
	mockServer := createMockServer(mockBehavior)
	defer mockServer.Close()

	// Test with custom models
	t.Run("CustomModels", func(t *testing.T) {
		customModelsProvider := &settings.ProviderConfig{
			Name:            "Custom Models Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: true,
			CustomModels:    []string{"custom-model-1", "custom-model-2", "custom-model-3"},
		}

		models, err := llmService.GetModelsListForProvider(customModelsProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with custom models")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 3, "Should return 3 custom models")
		assert.Contains(t, models, "custom-model-1", "Should contain custom-model-1")
		assert.Contains(t, models, "custom-model-2", "Should contain custom-model-2")
		assert.Contains(t, models, "custom-model-3", "Should contain custom-model-3")
	})

	// Test with API models
	t.Run("APIModels", func(t *testing.T) {
		apiModelsProvider := &settings.ProviderConfig{
			Name:            "API Models Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(apiModelsProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with API models")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 2, "Should return 2 API models")
		assert.Contains(t, models, "api-model-1", "Should contain api-model-1")
		assert.Contains(t, models, "api-model-2", "Should contain api-model-2")
	})

	// Test with nil provider
	t.Run("NilProvider", func(t *testing.T) {
		_, err := llmService.GetModelsListForProvider(nil)
		assert.Error(t, err, "GetModelsListForProvider should fail with nil provider")
		assert.Contains(t, err.Error(), "provider configuration cannot be nil", "Error should mention nil provider")
	})

	// Discovery failures fall back silently — invalid URL returns empty list, no error.
	t.Run("InvalidURL", func(t *testing.T) {
		badProvider := &settings.ProviderConfig{
			Name:            "Bad Provider",
			Kind:            "openai",
			BaseURL:         "http://invalid-url-that-will-fail.com/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(badProvider)
		require.NoError(t, err, "Discovery failure should fall back silently, not return an error")
		assert.Empty(t, models, "Fallback with no CustomModels should return empty list")
	})
}

// TestLLMServiceAPI_GetCompletionResponseForProvider tests the GetCompletionResponseForProvider method
func TestLLMServiceAPI_GetCompletionResponseForProvider(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	// Create mock server with success behavior
	mockBehavior := &MockServerBehavior{
		StatusCode: http.StatusOK,
		CompletionResponse: &ChatCompletionResponse{
			ID:    "test-completion-1",
			Model: "model-1",
			Choices: []Choice{
				{
					Index: 0,
					Message: CompletionRequestMessage{
						Role:    "assistant",
						Content: "This is a test completion response.",
					},
					FinishReason: "stop",
				},
			},
			Usage: Usage{
				PromptTokens:     10,
				CompletionTokens: 20,
				TotalTokens:      30,
			},
		},
	}
	mockServer := createMockServer(mockBehavior)
	defer mockServer.Close()

	// Test happy path
	t.Run("HappyPath", func(t *testing.T) {
		provider := &settings.ProviderConfig{
			Name:            "Test Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		request := &ChatCompletionRequest{
			Model: "model-1",
			Messages: []CompletionRequestMessage{
				{
					Role:    "user",
					Content: "Test completion request.",
				},
			},
			Stream: false,
		}

		response, err := llmService.GetCompletionResponseForProvider(provider, request)
		require.NoError(t, err, "GetCompletionResponseForProvider should succeed")
		assert.NotEmpty(t, response, "Response should not be empty")
		assert.Contains(t, response, "test completion response", "Response should contain expected content")
	})

	// Test with nil provider
	t.Run("NilProvider", func(t *testing.T) {
		_, err := llmService.GetCompletionResponseForProvider(nil, &ChatCompletionRequest{})
		assert.Error(t, err, "GetCompletionResponseForProvider should fail with nil provider")
		assert.Contains(t, err.Error(), "provider configuration cannot be nil", "Error should mention nil provider")
	})

	// Test with nil request
	t.Run("NilRequest", func(t *testing.T) {
		provider := &settings.ProviderConfig{
			Name:            "Test Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		_, err := llmService.GetCompletionResponseForProvider(provider, nil)
		assert.Error(t, err, "GetCompletionResponseForProvider should fail with nil request")
		assert.Contains(t, err.Error(), "completion request cannot be nil", "Error should mention nil request")
	})

	// Empty choices now returns apperr.EmptyCompletion from the provider layer.
	t.Run("EmptyChoices", func(t *testing.T) {
		emptyChoicesBehavior := &MockServerBehavior{
			StatusCode: http.StatusOK,
			CompletionResponse: &ChatCompletionResponse{
				ID:      "test-empty",
				Model:   "model-1",
				Choices: []Choice{}, // Empty choices
				Usage:   Usage{},
			},
		}
		emptyChoicesServer := createMockServer(emptyChoicesBehavior)
		defer emptyChoicesServer.Close()

		provider := &settings.ProviderConfig{
			Name:            "Empty Choices Provider",
			Kind:            "openai",
			BaseURL:         emptyChoicesServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		request := &ChatCompletionRequest{
			Model: "model-1",
			Messages: []CompletionRequestMessage{
				{
					Role:    "user",
					Content: "Test message.",
				},
			},
			Stream: false,
		}

		_, err := llmService.GetCompletionResponseForProvider(provider, request)
		require.Error(t, err, "GetCompletionResponseForProvider should fail with empty choices")
		var ae *apperr.AppError
		require.True(t, errors.As(err, &ae), "Error should be an *apperr.AppError")
		assert.Equal(t, apperr.CodeEmptyCompletion, ae.Code, "Error code should be CodeEmptyCompletion")
	})

	// Empty content now returns apperr.EmptyCompletion from the provider layer.
	t.Run("EmptyContent", func(t *testing.T) {
		emptyContentBehavior := &MockServerBehavior{
			StatusCode: http.StatusOK,
			CompletionResponse: &ChatCompletionResponse{
				ID:    "test-empty-content",
				Model: "model-1",
				Choices: []Choice{
					{
						Index: 0,
						Message: CompletionRequestMessage{
							Role:    "assistant",
							Content: "", // Empty content
						},
						FinishReason: "stop",
					},
				},
				Usage: Usage{},
			},
		}
		emptyContentServer := createMockServer(emptyContentBehavior)
		defer emptyContentServer.Close()

		provider := &settings.ProviderConfig{
			Name:            "Empty Content Provider",
			Kind:            "openai",
			BaseURL:         emptyContentServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		request := &ChatCompletionRequest{
			Model: "model-1",
			Messages: []CompletionRequestMessage{
				{
					Role:    "user",
					Content: "Test message.",
				},
			},
			Stream: false,
		}

		// Empty content is now an error — the provider returns apperr.EmptyCompletion.
		_, err := llmService.GetCompletionResponseForProvider(provider, request)
		require.Error(t, err, "GetCompletionResponseForProvider should fail with empty content")
		var ae *apperr.AppError
		require.True(t, errors.As(err, &ae), "Error should be an *apperr.AppError")
		assert.Equal(t, apperr.CodeEmptyCompletion, ae.Code, "Error code should be CodeEmptyCompletion")
	})
}

// TestLLMServiceAPI_Authentication tests authentication functionality
func TestLLMServiceAPI_Authentication(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	// Create mock server with success behavior
	mockBehavior := &MockServerBehavior{
		StatusCode: http.StatusOK,
		ModelsResponse: &ModelsListResponse{
			Data: []ModelsResponse{
				{ID: "auth-model-1", Name: stringPtr("Auth Model 1")},
			},
		},
	}
	mockServer := createMockServer(mockBehavior)
	defer mockServer.Close()

	// Test Bearer Token Authentication via env var
	t.Run("BearerToken", func(t *testing.T) {
		envVarName := "TEST_LLM_BEARER_V3"
		t.Setenv(envVarName, "test-bearer-token-123")

		bearerProvider := &settings.ProviderConfig{
			Name:            "Bearer Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "bearer",
			APIKeyEnvVar:    envVarName,
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(bearerProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with bearer token")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})

	// Test API Key Authentication via env var
	t.Run("APIKey", func(t *testing.T) {
		envVarName := "TEST_LLM_APIKEY_V3"
		t.Setenv(envVarName, "test-api-key-456")

		apiKeyProvider := &settings.ProviderConfig{
			Name:            "API Key Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "apiKey",
			APIKeyEnvVar:    envVarName,
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(apiKeyProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with API key")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})

	// Test Auth Token from Environment Variable
	t.Run("AuthTokenFromEnvVar", func(t *testing.T) {
		envVarName := "TEST_LLM_AUTH_TOKEN_V3"
		envTokenValue := "test-env-token-789"
		t.Setenv(envVarName, envTokenValue)

		envBearerProvider := &settings.ProviderConfig{
			Name:            "Env Bearer Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "bearer",
			APIKeyEnvVar:    envVarName,
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(envBearerProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with env bearer token")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")

		envApiKeyProvider := &settings.ProviderConfig{
			Name:            "Env API Key Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "apiKey",
			APIKeyEnvVar:    envVarName,
			UseCustomModels: false,
		}

		models, err = llmService.GetModelsListForProvider(envApiKeyProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with env API key")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})

	// Test Custom Headers — Headers map is always applied
	t.Run("CustomHeaders", func(t *testing.T) {
		customHeaderServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "custom-value-1", r.Header.Get("X-Custom-Header-1"), "Custom header 1 should be present")
			assert.Equal(t, "custom-value-2", r.Header.Get("X-Custom-Header-2"), "Custom header 2 should be present")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&ModelsListResponse{
				Data: []ModelsResponse{
					{ID: "custom-header-model", Name: stringPtr("Custom Header Model")},
				},
			})
		}))
		defer customHeaderServer.Close()

		customHeadersProvider := &settings.ProviderConfig{
			Name:           "Custom Headers Provider",
			Kind:           "openai",
			BaseURL:        customHeaderServer.URL + "/",
			ModelsPath:     "api/tags",
			CompletionPath: "api/chat",
			AuthScheme:     "none",
			Headers: map[string]string{
				"X-Custom-Header-1": "custom-value-1",
				"X-Custom-Header-2": "custom-value-2",
			},
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(customHeadersProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with custom headers")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})

	// Test No Auth
	t.Run("NoAuth", func(t *testing.T) {
		noAuthProvider := &settings.ProviderConfig{
			Name:            "No Auth Provider",
			Kind:            "openai",
			BaseURL:         mockServer.URL + "/",
			ModelsPath:      "api/tags",
			CompletionPath:  "api/chat",
			AuthScheme:      "none",
			UseCustomModels: false,
		}

		models, err := llmService.GetModelsListForProvider(noAuthProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed without auth")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})
}

// TestLLMServiceAPI_Timeout tests timeout functionality.
// Under the new facade, discovery timeouts fall back silently (no error returned).
func TestLLMServiceAPI_Timeout(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	// Create a slow server that will timeout
	slowBehavior := &MockServerBehavior{
		StatusCode:    http.StatusOK,
		DelayDuration: 5 * time.Second, // Longer than configured timeout
		ModelsResponse: &ModelsListResponse{
			Data: []ModelsResponse{
				{ID: "slow-model", Name: stringPtr("Slow Model")},
			},
		},
	}
	slowServer := createMockServer(slowBehavior)
	defer slowServer.Close()

	// Set a short timeout in base config
	settingsService.baseConfig = &settings.InferenceBaseConfig{
		Timeout:    1, // 1 second timeout
		MaxRetries: 0,
	}

	slowProvider := &settings.ProviderConfig{
		Name:            "Slow Provider",
		Kind:            "openai",
		BaseURL:         slowServer.URL + "/",
		ModelsPath:      "api/tags",
		CompletionPath:  "api/chat",
		AuthScheme:      "none",
		UseCustomModels: false,
	}

	// Discovery timeout falls back silently — returns empty list, no error.
	models, err := llmService.GetModelsListForProvider(slowProvider)
	require.NoError(t, err, "Discovery timeout should fall back silently, not return an error")
	assert.Empty(t, models, "Fallback with no CustomModels should return empty list")
}

// TestLLMService_GetCompletionResponseForProvider_TimeoutMessageReflectsConfiguredSeconds
// verifies the real chain-execution completion path (T85, finding #5/#12): with a
// configured 1-second timeout and a server that sleeps 3 seconds (strictly between the
// configured 1s and the old hardcoded "0s" placeholder bug), the returned error must be
// CodeTimeout carrying the real configured seconds — not "0s" — proving
// mapTransportError's timeout-seconds bug is fixed on the chain path too, not just in
// the verification diagnostics.
func TestLLMService_GetCompletionResponseForProvider_TimeoutMessageReflectsConfiguredSeconds(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{
		baseConfig: &settings.InferenceBaseConfig{Timeout: 1, MaxRetries: 0},
	}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	slowBehavior := &MockServerBehavior{
		StatusCode:    http.StatusOK,
		DelayDuration: 3 * time.Second,
		CompletionResponse: &ChatCompletionResponse{
			ID:    "test-completion-slow",
			Model: "model-1",
			Choices: []Choice{
				{
					Index:        0,
					Message:      CompletionRequestMessage{Role: "assistant", Content: "too slow"},
					FinishReason: "stop",
				},
			},
		},
	}
	slowServer := createMockServer(slowBehavior)
	defer slowServer.Close()

	slowProvider := &settings.ProviderConfig{
		Name:            "Slow Provider",
		Kind:            "openai",
		BaseURL:         slowServer.URL + "/",
		ModelsPath:      "api/tags",
		CompletionPath:  "api/chat",
		AuthScheme:      "none",
		UseCustomModels: false,
	}
	request := &ChatCompletionRequest{
		Model: "model-1",
		Messages: []CompletionRequestMessage{
			{Role: "user", Content: "Test completion request."},
		},
		Stream: false,
	}

	_, err := llmService.GetCompletionResponseForProvider(slowProvider, request)
	require.Error(t, err, "GetCompletionResponseForProvider should fail when the server exceeds the configured 1s timeout")

	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "Error should be an *apperr.AppError")
	assert.Equal(t, apperr.CodeTimeout, ae.Code, "Error code should be CodeTimeout")
	assert.Equal(t, "1", ae.Details["timeout"], "Details[timeout] should reflect the real configured seconds")
	assert.Contains(t, ae.Message, "1s", "Message should reflect the real configured seconds, not the old 0s placeholder")
}

// TestLLMServiceAPI_GetCompletionResponseForProvider_MissingCredential verifies that
// GetCompletionResponseForProvider returns apperr.CodeMissingCredential when the
// provider requires auth (AuthScheme="bearer") but APIKeyEnvVar is empty.
func TestLLMServiceAPI_GetCompletionResponseForProvider_MissingCredential(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	provider := &settings.ProviderConfig{
		Name:            "Bearer Provider No Key",
		Kind:            "openai",
		AuthScheme:      "bearer",
		APIKeyEnvVar:    "", // empty — resolveConfig must return MissingCredential
		UseCustomModels: false,
	}

	request := &ChatCompletionRequest{
		Model: "model-1",
		Messages: []CompletionRequestMessage{
			{Role: "user", Content: "Hello."},
		},
	}

	_, err := llmService.GetCompletionResponseForProvider(provider, request)

	require.Error(t, err, "GetCompletionResponseForProvider should fail when APIKeyEnvVar is empty")
	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "Error should be an *apperr.AppError")
	assert.Equal(t, apperr.CodeMissingCredential, ae.Code, "Error code should be CodeMissingCredential")
}

// TestLLMServiceAPI_GetCompletionResponseForProvider_MissingCredential_WhitespaceEnvVar verifies that
// GetCompletionResponseForProvider returns apperr.CodeMissingCredential when APIKeyEnvVar contains
// only whitespace characters.
func TestLLMServiceAPI_GetCompletionResponseForProvider_MissingCredential_WhitespaceEnvVar(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	provider := &settings.ProviderConfig{
		Name:            "Bearer Provider Whitespace Key",
		Kind:            "openai",
		AuthScheme:      "bearer",
		APIKeyEnvVar:    "   ", // whitespace-only — TrimSpace guard fires
		UseCustomModels: false,
	}

	request := &ChatCompletionRequest{
		Model: "model-1",
		Messages: []CompletionRequestMessage{
			{Role: "user", Content: "Hello."},
		},
	}

	_, err := llmService.GetCompletionResponseForProvider(provider, request)

	require.Error(t, err, "GetCompletionResponseForProvider should fail when APIKeyEnvVar is whitespace-only")
	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "Error should be an *apperr.AppError")
	assert.Equal(t, apperr.CodeMissingCredential, ae.Code, "Error code should be CodeMissingCredential")
}

// TestLLMServiceAPI_GetCompletionResponseForProvider_EnvVarUnset verifies that
// GetCompletionResponseForProvider returns apperr.CodeMissingCredential when the
// provider specifies a valid (non-empty) APIKeyEnvVar name, but the environment variable
// is not actually set (or is set to empty string). This exercises the os.Getenv returns ""
// branch in resolveConfig.
func TestLLMServiceAPI_GetCompletionResponseForProvider_EnvVarUnset(t *testing.T) {
	log := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := newTestService(log, restyClient, settingsService)

	// Use a known non-existent environment variable name
	provider := &settings.ProviderConfig{
		Name:            "Bearer Provider Env Unset",
		Kind:            "openai",
		AuthScheme:      "bearer",
		APIKeyEnvVar:    "GOTEXT_TEST_KEY_UNSET_XYZ", // Valid name, but env var is not set
		UseCustomModels: false,
	}

	request := &ChatCompletionRequest{
		Model: "model-1",
		Messages: []CompletionRequestMessage{
			{Role: "user", Content: "Hello."},
		},
	}

	_, err := llmService.GetCompletionResponseForProvider(provider, request)

	require.Error(t, err, "GetCompletionResponseForProvider should fail when env var is unset")
	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "Error should be an *apperr.AppError")
	assert.Equal(t, apperr.CodeMissingCredential, ae.Code, "Error code should be CodeMissingCredential")
}
