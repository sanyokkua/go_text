package llms

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go_text/internal/settings"
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
}

func (m *MockSettingsService) InitDefaultSettingsIfAbsent() error {
	return nil
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
		ProviderName:       "Test Provider",
		ProviderType:       settings.ProviderTypeOpenAICompatible,
		BaseUrl:            "http://localhost:11434/",
		ModelsEndpoint:     "v1/models",
		CompletionEndpoint: "v1/chat/completions",
		AuthType:           settings.AuthTypeNone,
		UseCustomModels:    false,
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

// MockServerBehavior controls the mock HTTP server responses
type MockServerBehavior struct {
	StatusCode         int
	ModelsResponse     *ModelsListResponse
	CompletionResponse *ChatCompletionResponse
	DelayDuration      time.Duration
}

// createMockServer creates a mock HTTP server for testing
func createMockServer(behavior *MockServerBehavior) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Apply delay if configured (for timeout tests)
		if behavior.DelayDuration > 0 {
			time.Sleep(behavior.DelayDuration)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(behavior.StatusCode)

		// Only write response body for successful requests
		if behavior.StatusCode == http.StatusOK {
			// Handle models endpoints (GET requests)
			if r.URL.Path == "/api/tags" || r.URL.Path == "/v1/models" {
				if behavior.ModelsResponse != nil {
					json.NewEncoder(w).Encode(behavior.ModelsResponse)
				}
				return
			}

			// Handle completion endpoints (POST requests)
			if r.URL.Path == "/api/chat" || r.URL.Path == "/v1/chat/completions" {
				if behavior.CompletionResponse != nil {
					json.NewEncoder(w).Encode(behavior.CompletionResponse)
				}
				return
			}
		}
	}))
}

// stringPtr is a helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}

// TestLLMServiceAPI_GetModelsList tests the GetModelsList method
func TestLLMServiceAPI_GetModelsList(t *testing.T) {
	logger := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := NewLLMApiService(logger, restyClient, settingsService)

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
		ProviderName:       "Test Provider",
		ProviderType:       settings.ProviderTypeOpenAICompatible,
		BaseUrl:            mockServer.URL + "/",
		ModelsEndpoint:     "v1/models",
		CompletionEndpoint: "v1/chat/completions",
		AuthType:           settings.AuthTypeNone,
		UseCustomModels:    false,
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

	// Test with nil request (should not happen with mock, but test the method)
	t.Run("ErrorHandling", func(t *testing.T) {
		// This tests the error handling in GetModelsListForProvider
		badProvider := &settings.ProviderConfig{
			ProviderName:       "Bad Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            "http://invalid-url-that-will-fail.com/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
		}

		_, err := llmService.GetModelsListForProvider(badProvider)
		assert.Error(t, err, "GetModelsListForProvider should fail with invalid URL")
	})
}

// TestLLMServiceAPI_GetCompletionResponse tests the GetCompletionResponse method
func TestLLMServiceAPI_GetCompletionResponse(t *testing.T) {
	logger := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := NewLLMApiService(logger, restyClient, settingsService)

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
		ProviderName:       "Test Provider",
		ProviderType:       settings.ProviderTypeOpenAICompatible,
		BaseUrl:            mockServer.URL + "/",
		ModelsEndpoint:     "v1/models",
		CompletionEndpoint: "v1/chat/completions",
		AuthType:           settings.AuthTypeNone,
		UseCustomModels:    false,
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

// TestLLMServiceAPI_GetModelsListForProvider tests the GetModelsListForProvider method
func TestLLMServiceAPI_GetModelsListForProvider(t *testing.T) {
	logger := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := NewLLMApiService(logger, restyClient, settingsService)

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
			ProviderName:       "Custom Models Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    true,
			CustomModels:       []string{"custom-model-1", "custom-model-2", "custom-model-3"},
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
			ProviderName:       "API Models Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
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

	// Test with invalid URL
	t.Run("InvalidURL", func(t *testing.T) {
		badProvider := &settings.ProviderConfig{
			ProviderName:       "Bad Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            "http://invalid-url-that-will-fail.com/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
		}

		_, err := llmService.GetModelsListForProvider(badProvider)
		assert.Error(t, err, "GetModelsListForProvider should fail with invalid URL")
	})
}

// TestLLMServiceAPI_GetCompletionResponseForProvider tests the GetCompletionResponseForProvider method
func TestLLMServiceAPI_GetCompletionResponseForProvider(t *testing.T) {
	logger := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := NewLLMApiService(logger, restyClient, settingsService)

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
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
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
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
		}

		_, err := llmService.GetCompletionResponseForProvider(provider, nil)
		assert.Error(t, err, "GetCompletionResponseForProvider should fail with nil request")
		assert.Contains(t, err.Error(), "completion request cannot be nil", "Error should mention nil request")
	})

	// Test with empty choices
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
			ProviderName:       "Empty Choices Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            emptyChoicesServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
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
		assert.Error(t, err, "GetCompletionResponseForProvider should fail with empty choices")
		assert.Contains(t, err.Error(), "no choices returned", "Error should mention empty choices")
	})

	// Test with empty content (should succeed but return empty string)
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
			ProviderName:       "Empty Content Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            emptyContentServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
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

		// This should succeed but return empty content (warning case)
		response, err := llmService.GetCompletionResponseForProvider(provider, request)
		require.NoError(t, err, "GetCompletionResponseForProvider should succeed with empty content")
		assert.Empty(t, response, "Response should be empty")
	})
}

// TestLLMServiceAPI_Authentication tests authentication functionality
func TestLLMServiceAPI_Authentication(t *testing.T) {
	logger := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := NewLLMApiService(logger, restyClient, settingsService)

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

	// Test getAuthToken branches comprehensively
	t.Run("GetAuthTokenBranches", func(t *testing.T) {
		// Branch 1: provider == nil || provider.AuthType == settings.AuthTypeNone
		t.Run("NilProvider", func(t *testing.T) {
			token := llmService.(*LLMService).getAuthToken(nil)
			assert.Empty(t, token, "Token should be empty for nil provider")
		})

		t.Run("AuthTypeNone", func(t *testing.T) {
			provider := &settings.ProviderConfig{
				ProviderName:        "No Auth Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeNone,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     "SOME_ENV_VAR",
			}
			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty for AuthTypeNone")
		})

		// Branch 2: provider.UseAuthTokenFromEnv && strings.TrimSpace(provider.EnvVarTokenName) != ""
		t.Run("EnvVarNotSet", func(t *testing.T) {
			envVarName := "TEST_LLM_TOKEN_NOT_SET"

			// Ensure the env var is not set
			oldValue := os.Getenv(envVarName)
			os.Setenv(envVarName, "")
			defer os.Setenv(envVarName, oldValue)

			provider := &settings.ProviderConfig{
				ProviderName:        "Env Var Not Set Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     envVarName,
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty when env var is not set")
		})

		t.Run("EnvVarEmptyString", func(t *testing.T) {
			envVarName := "TEST_LLM_TOKEN_EMPTY"

			// Set env var to empty string
			oldValue := os.Getenv(envVarName)
			os.Setenv(envVarName, "")
			defer os.Setenv(envVarName, oldValue)

			provider := &settings.ProviderConfig{
				ProviderName:        "Env Var Empty Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     envVarName,
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty when env var is empty string")
		})

		t.Run("EnvVarWhitespaceOnly", func(t *testing.T) {
			envVarName := "TEST_LLM_TOKEN_WHITESPACE"

			// Set env var to whitespace only
			oldValue := os.Getenv(envVarName)
			os.Setenv(envVarName, "   ")
			defer os.Setenv(envVarName, oldValue)

			provider := &settings.ProviderConfig{
				ProviderName:        "Env Var Whitespace Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     envVarName,
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Equal(t, "   ", token, "Token should contain whitespace when env var has whitespace")
		})

		t.Run("EnvVarValidToken", func(t *testing.T) {
			envVarName := "TEST_LLM_TOKEN_VALID"
			envTokenValue := "valid-env-token-123"

			// Set env var to valid token
			oldValue := os.Getenv(envVarName)
			os.Setenv(envVarName, envTokenValue)
			defer os.Setenv(envVarName, oldValue)

			provider := &settings.ProviderConfig{
				ProviderName:        "Env Var Valid Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     envVarName,
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Equal(t, envTokenValue, token, "Token should match env var value")
		})

		t.Run("EnvVarNameEmpty", func(t *testing.T) {
			provider := &settings.ProviderConfig{
				ProviderName:        "Empty Env Var Name Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     "", // Empty env var name
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty when env var name is empty")
		})

		t.Run("EnvVarNameWhitespace", func(t *testing.T) {
			provider := &settings.ProviderConfig{
				ProviderName:        "Whitespace Env Var Name Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     "   ", // Whitespace env var name
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty when env var name is whitespace")
		})

		// Branch 3: !provider.UseAuthTokenFromEnv && strings.TrimSpace(provider.AuthToken) != ""
		t.Run("ProviderAuthTokenValid", func(t *testing.T) {
			provider := &settings.ProviderConfig{
				ProviderName:        "Provider Token Valid",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: false,
				AuthToken:           "provider-token-456",
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Equal(t, "provider-token-456", token, "Token should match provider auth token")
		})

		t.Run("ProviderAuthTokenEmpty", func(t *testing.T) {
			provider := &settings.ProviderConfig{
				ProviderName:        "Provider Token Empty",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: false,
				AuthToken:           "",
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty when provider auth token is empty")
		})

		t.Run("ProviderAuthTokenWhitespace", func(t *testing.T) {
			provider := &settings.ProviderConfig{
				ProviderName:        "Provider Token Whitespace",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: false,
				AuthToken:           "   ",
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty when provider auth token is whitespace")
		})

		// Branch 4: No token found (fallback)
		t.Run("NoTokenFound", func(t *testing.T) {
			provider := &settings.ProviderConfig{
				ProviderName:        "No Token Provider",
				ProviderType:        settings.ProviderTypeOpenAICompatible,
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: false,
				AuthToken:           "",
				EnvVarTokenName:     "",
			}

			token := llmService.(*LLMService).getAuthToken(provider)
			assert.Empty(t, token, "Token should be empty when no token is found")
		})
	})

	// Test Bearer Token Authentication
	t.Run("BearerToken", func(t *testing.T) {
		bearerProvider := &settings.ProviderConfig{
			ProviderName:        "Bearer Provider",
			ProviderType:        settings.ProviderTypeOpenAICompatible,
			BaseUrl:             mockServer.URL + "/",
			ModelsEndpoint:      "api/tags",
			CompletionEndpoint:  "api/chat",
			AuthType:            settings.AuthTypeBearer,
			AuthToken:           "test-bearer-token-123",
			UseAuthTokenFromEnv: false,
			UseCustomModels:     false,
		}

		models, err := llmService.GetModelsListForProvider(bearerProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with bearer token")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})

	// Test API Key Authentication
	t.Run("APIKey", func(t *testing.T) {
		apiKeyProvider := &settings.ProviderConfig{
			ProviderName:        "API Key Provider",
			ProviderType:        settings.ProviderTypeOpenAICompatible,
			BaseUrl:             mockServer.URL + "/",
			ModelsEndpoint:      "api/tags",
			CompletionEndpoint:  "api/chat",
			AuthType:            settings.AuthTypeApiKey,
			AuthToken:           "test-api-key-456",
			UseAuthTokenFromEnv: false,
			UseCustomModels:     false,
		}

		models, err := llmService.GetModelsListForProvider(apiKeyProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with API key")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})

	// Test Auth Token from Environment Variable
	t.Run("AuthTokenFromEnvVar", func(t *testing.T) {
		// Set environment variable
		envVarName := "TEST_LLM_AUTH_TOKEN"
		envTokenValue := "test-env-token-789"

		// Set env var
		oldValue := os.Getenv(envVarName)
		os.Setenv(envVarName, envTokenValue)
		defer os.Setenv(envVarName, oldValue)

		// Test bearer token from environment variable
		envBearerProvider := &settings.ProviderConfig{
			ProviderName:        "Env Bearer Provider",
			ProviderType:        settings.ProviderTypeOpenAICompatible,
			BaseUrl:             mockServer.URL + "/",
			ModelsEndpoint:      "api/tags",
			CompletionEndpoint:  "api/chat",
			AuthType:            settings.AuthTypeBearer,
			UseAuthTokenFromEnv: true,
			EnvVarTokenName:     envVarName,
			UseCustomModels:     false,
		}

		models, err := llmService.GetModelsListForProvider(envBearerProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with env bearer token")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")

		// Test API key from environment variable
		envApiKeyProvider := &settings.ProviderConfig{
			ProviderName:        "Env API Key Provider",
			ProviderType:        settings.ProviderTypeOpenAICompatible,
			BaseUrl:             mockServer.URL + "/",
			ModelsEndpoint:      "api/tags",
			CompletionEndpoint:  "api/chat",
			AuthType:            settings.AuthTypeApiKey,
			UseAuthTokenFromEnv: true,
			EnvVarTokenName:     envVarName,
			UseCustomModels:     false,
		}

		models, err = llmService.GetModelsListForProvider(envApiKeyProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed with env API key")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})

	// Test Custom Headers
	t.Run("CustomHeaders", func(t *testing.T) {
		// Create a server that can verify custom headers
		customHeaderBehavior := &MockServerBehavior{
			StatusCode: http.StatusOK,
			ModelsResponse: &ModelsListResponse{
				Data: []ModelsResponse{
					{ID: "custom-header-model", Name: stringPtr("Custom Header Model")},
				},
			},
		}
		customHeaderServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify custom headers are present
			customHeader1 := r.Header.Get("X-Custom-Header-1")
			customHeader2 := r.Header.Get("X-Custom-Header-2")

			assert.Equal(t, "custom-value-1", customHeader1, "Custom header 1 should be present")
			assert.Equal(t, "custom-value-2", customHeader2, "Custom header 2 should be present")

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(customHeaderBehavior.ModelsResponse)
		}))
		defer customHeaderServer.Close()

		customHeadersProvider := &settings.ProviderConfig{
			ProviderName:       "Custom Headers Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            customHeaderServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomHeaders:   true,
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

	// Test No Auth (AuthTypeNone)
	t.Run("NoAuth", func(t *testing.T) {
		noAuthProvider := &settings.ProviderConfig{
			ProviderName:       "No Auth Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "api/tags",
			CompletionEndpoint: "api/chat",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
		}

		models, err := llmService.GetModelsListForProvider(noAuthProvider)
		require.NoError(t, err, "GetModelsListForProvider should succeed without auth")
		assert.NotNil(t, models, "Models list should not be nil")
		assert.Len(t, models, 1, "Should return 1 model")
	})
}

// TestLLMServiceAPI_Timeout tests timeout functionality
func TestLLMServiceAPI_Timeout(t *testing.T) {
	logger := &TestLogger{}
	settingsService := &MockSettingsService{}
	restyClient := resty.New()
	llmService := NewLLMApiService(logger, restyClient, settingsService)

	// Create a slow server that will timeout
	slowBehavior := &MockServerBehavior{
		StatusCode:    http.StatusOK,
		DelayDuration: 5 * time.Second, // Longer than default timeout
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
		ProviderName:       "Slow Provider",
		ProviderType:       settings.ProviderTypeOpenAICompatible,
		BaseUrl:            slowServer.URL + "/",
		ModelsEndpoint:     "api/tags",
		CompletionEndpoint: "api/chat",
		AuthType:           settings.AuthTypeNone,
		UseCustomModels:    false,
	}

	// This should timeout
	_, err := llmService.GetModelsListForProvider(slowProvider)
	assert.Error(t, err, "GetModelsListForProvider should timeout")
}
