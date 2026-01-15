package actions

import (
	"encoding/json"
	"fmt"
	"go_text/internal/file"
	"go_text/internal/llms"
	"go_text/internal/prompts"
	"go_text/internal/prompts/categories"
	"go_text/internal/settings"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

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

// setupTestEnv sets up a temporary environment for testing
// Returns cleanup function to restore original environment
func setupTestEnv(t *testing.T) (string, func()) {
	// Create a temporary directory to use as our "home" directory
	tmpDir, err := os.MkdirTemp("", "go_text_test_*")
	require.NoError(t, err)

	// Save original environment variables
	originalHome := os.Getenv("HOME")
	originalXDGConfig := os.Getenv("XDG_CONFIG_HOME")
	originalAppData := os.Getenv("APPDATA")
	originalLocalAppData := os.Getenv("LOCALAPPDATA")

	// Cleanup function to restore environment and remove temp dir
	cleanup := func() {
		os.Setenv("HOME", originalHome)
		os.Setenv("XDG_CONFIG_HOME", originalXDGConfig)
		os.Setenv("APPDATA", originalAppData)
		os.Setenv("LOCALAPPDATA", originalLocalAppData)
		os.RemoveAll(tmpDir)
	}

	// Set environment variables to point to our temp directory
	os.Setenv("HOME", tmpDir)
	os.Setenv("XDG_CONFIG_HOME", filepath.Join(tmpDir, ".config"))
	os.Setenv("APPDATA", filepath.Join(tmpDir, "AppData", "Roaming"))
	os.Setenv("LOCALAPPDATA", filepath.Join(tmpDir, "AppData", "Local"))

	return tmpDir, cleanup
}

// getAppConfigDir gets the expected app config directory based on OS
func getAppConfigDir(tmpDir string) string {
	if runtime.GOOS == "windows" {
		return filepath.Join(tmpDir, "AppData", "Roaming", file.AppName)
	} else if runtime.GOOS == "darwin" {
		return filepath.Join(tmpDir, "Library", "Application Support", file.AppName)
	} else {
		return filepath.Join(tmpDir, ".config", file.AppName)
	}
}

// MockServerBehavior controls the mock HTTP server responses
type MockServerBehavior struct {
	StatusCode         int
	ModelsResponse     *llms.ModelsListResponse
	CompletionResponse *llms.ChatCompletionResponse
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
			if r.URL.Path == "/v1/models" || r.URL.Path == "/api/tags" {
				if behavior.ModelsResponse != nil {
					json.NewEncoder(w).Encode(behavior.ModelsResponse)
				}
			} else if r.URL.Path == "/v1/chat/completions" || r.URL.Path == "/api/chat" {
				if behavior.CompletionResponse != nil {
					json.NewEncoder(w).Encode(behavior.CompletionResponse)
				}
			}
		}
	}))
}

// TestActionHandlerIntegration is a comprehensive integration test for ActionHandlerAPI
// It runs 29 sequential test steps that share state to simulate real application behavior
func TestActionHandlerIntegration(t *testing.T) {
	// Setup test environment
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create real instances (no mocks except env variables)
	logger := &TestLogger{}
	fileUtilsService := file.NewFileUtilsService(logger)
	settingsRepo := settings.NewSettingsRepository(logger, fileUtilsService)
	settingsService := settings.NewSettingsService(logger, settingsRepo, fileUtilsService)
	settingsHandler := settings.NewSettingsHandler(logger, settingsService)

	// Create prompt service
	promptService := prompts.NewPromptService(logger)

	// Create resty client
	restyClient := resty.New()

	// Create LLM service
	llmService := llms.NewLLMApiService(logger, restyClient, settingsService)

	// Create action service and handler
	actionService := NewActionService(logger, promptService, llmService, settingsService)
	handler := NewActionHandler(logger, actionService)

	// Shared state across tests
	var mockServer *httptest.Server
	var mockBehavior *MockServerBehavior
	var customProviderID string

	// Step 1: Initialize Settings and Configure Mock Provider
	t.Run("Step_01_InitializeSettingsAndMockProvider", func(t *testing.T) {
		// Initialize default settings
		err := settingsService.InitDefaultSettingsIfAbsent()
		require.NoError(t, err, "Failed to initialize default settings")

		// Verify settings file was created
		expectedPath := filepath.Join(getAppConfigDir(tmpDir), file.SettingsFileName)
		_, err = os.Stat(expectedPath)
		assert.NoError(t, err, "Settings file should exist after initialization")

		// Create mock server with success behavior
		mockBehavior = &MockServerBehavior{
			StatusCode: http.StatusOK,
			ModelsResponse: &llms.ModelsListResponse{
				Data: []llms.ModelsResponse{
					{ID: "model-1", Name: stringPtr("Test Model 1")},
					{ID: "model-2", Name: stringPtr("Test Model 2")},
				},
			},
			CompletionResponse: &llms.ChatCompletionResponse{
				ID:    "test-completion-1",
				Model: "model-1",
				Choices: []llms.Choice{
					{
						Index: 0,
						Message: llms.CompletionRequestMessage{
							Role:    "assistant",
							Content: "This is a test completion response.",
						},
						FinishReason: "stop",
					},
				},
				Usage: llms.Usage{
					PromptTokens:     10,
					CompletionTokens: 20,
					TotalTokens:      30,
				},
			},
		}
		mockServer = createMockServer(mockBehavior)

		// Create custom provider pointing to mock server
		customProvider := settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
			UseCustomModels:    false,
		}

		created, err := settingsHandler.CreateProviderConfig(customProvider)
		require.NoError(t, err)
		customProviderID = created.ProviderID

		// Set as current provider
		_, err = settingsHandler.SetAsCurrentProviderConfig(customProviderID)
		require.NoError(t, err)

		// Update timeout to a reasonable value for tests (2 seconds)
		inferenceConfig := settings.InferenceBaseConfig{
			Timeout:              2,
			MaxRetries:           1,
			UseMarkdownForOutput: false,
		}
		_, err = settingsHandler.UpdateInferenceBaseConfig(inferenceConfig)
		require.NoError(t, err)

		// Set a model name
		modelConfig := settings.ModelConfig{
			Name:           "model-1",
			UseTemperature: false,
			Temperature:    0.5,
		}
		_, err = settingsHandler.UpdateModelConfig(modelConfig)
		require.NoError(t, err)
	})

	// Step 2: Test GetModelsList() - Success
	t.Run("Step_02_GetModelsList_Success", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK

		models, err := handler.GetModelsList()
		require.NoError(t, err)

		assert.Len(t, models, 2, "Should return 2 models")
		assert.Contains(t, models, "model-1")
		assert.Contains(t, models, "model-2")
	})

	// Step 3: Test GetModelsList() - Error (HTTP 400 Bad Request)
	t.Run("Step_03_GetModelsList_Error400", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusBadRequest

		_, err := handler.GetModelsList()
		assert.Error(t, err, "Should return error for HTTP 400")
	})

	// Step 4: Test GetModelsList() - Error (HTTP 403 Forbidden)
	t.Run("Step_04_GetModelsList_Error403", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusForbidden

		_, err := handler.GetModelsList()
		assert.Error(t, err, "Should return error for HTTP 403")
	})

	// Step 5: Test GetModelsList() - Error (HTTP 404 Not Found)
	t.Run("Step_05_GetModelsList_Error404", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusNotFound

		_, err := handler.GetModelsList()
		assert.Error(t, err, "Should return error for HTTP 404")
	})

	// Step 6: Test GetModelsList() - Error (HTTP 500 Server Error)
	t.Run("Step_06_GetModelsList_Error500", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusInternalServerError

		_, err := handler.GetModelsList()
		assert.Error(t, err, "Should return error for HTTP 500")
	})

	// Step 7: Test GetModelsListForProvider() - Success
	t.Run("Step_07_GetModelsListForProvider_Success", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK

		provider := &settings.ProviderConfig{
			ProviderName:       "Custom Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		models, err := handler.GetModelsListForProvider(provider)
		require.NoError(t, err)

		assert.Len(t, models, 2, "Should return 2 models")
		assert.Contains(t, models, "model-1")
		assert.Contains(t, models, "model-2")
	})

	// Step 8: Test GetModelsListForProvider() - Error (HTTP 400 Bad Request)
	t.Run("Step_08_GetModelsListForProvider_Error400", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusBadRequest

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		_, err := handler.GetModelsListForProvider(provider)
		assert.Error(t, err, "Should return error for HTTP 400")
	})

	// Step 9: Test GetModelsListForProvider() - Error (HTTP 403 Forbidden)
	t.Run("Step_09_GetModelsListForProvider_Error403", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusForbidden

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		_, err := handler.GetModelsListForProvider(provider)
		assert.Error(t, err, "Should return error for HTTP 403")
	})

	// Step 10: Test GetModelsListForProvider() - Error (HTTP 404 Not Found)
	t.Run("Step_10_GetModelsListForProvider_Error404", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusNotFound

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		_, err := handler.GetModelsListForProvider(provider)
		assert.Error(t, err, "Should return error for HTTP 404")
	})

	// Step 11: Test GetModelsListForProvider() - Error (HTTP 500 Server Error)
	t.Run("Step_11_GetModelsListForProvider_Error500", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusInternalServerError

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		_, err := handler.GetModelsListForProvider(provider)
		assert.Error(t, err, "Should return error for HTTP 500")
	})

	// Step 12: Test GetModelsListForProvider() - Error (Invalid Provider)
	t.Run("Step_12_GetModelsListForProvider_InvalidProvider", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK

		provider := &settings.ProviderConfig{
			ProviderName:       "Invalid Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            "not-a-valid-url",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		_, err := handler.GetModelsListForProvider(provider)
		assert.Error(t, err, "Should return error for invalid URL")
	})

	// Step 13: Test GetCompletionResponse() - Success
	t.Run("Step_13_GetCompletionResponse_Success", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello, how are you?"},
			},
			Stream: false,
		}

		response, err := handler.GetCompletionResponse(request)
		require.NoError(t, err)

		assert.NotEmpty(t, response, "Response should not be empty")
		assert.Equal(t, "This is a test completion response.", response)
	})

	// Step 14: Test GetCompletionResponse() - Error (HTTP 400 Bad Request)
	t.Run("Step_14_GetCompletionResponse_Error400", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusBadRequest

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponse(request)
		assert.Error(t, err, "Should return error for HTTP 400")
	})

	// Step 15: Test GetCompletionResponse() - Error (HTTP 403 Forbidden)
	t.Run("Step_15_GetCompletionResponse_Error403", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusForbidden

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponse(request)
		assert.Error(t, err, "Should return error for HTTP 403")
	})

	// Step 16: Test GetCompletionResponse() - Error (HTTP 500 Server Error)
	t.Run("Step_16_GetCompletionResponse_Error500", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusInternalServerError

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponse(request)
		assert.Error(t, err, "Should return error for HTTP 500")
	})

	// Step 17: Test GetCompletionResponse() - Error (Timeout)
	t.Run("Step_17_GetCompletionResponse_Timeout", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK
		mockBehavior.DelayDuration = 3 * time.Second // Longer than configured timeout (2s)

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponse(request)
		assert.Error(t, err, "Should return timeout error")

		// Reset delay for subsequent tests
		mockBehavior.DelayDuration = 0
	})

	// Step 18: Test GetCompletionResponseForProvider() - Success
	t.Run("Step_18_GetCompletionResponseForProvider_Success", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello, how are you?"},
			},
			Stream: false,
		}

		response, err := handler.GetCompletionResponseForProvider(provider, request)
		require.NoError(t, err)

		assert.NotEmpty(t, response, "Response should not be empty")
		assert.Equal(t, "This is a test completion response.", response)
	})

	// Step 19: Test GetCompletionResponseForProvider() - Error (HTTP 400 Bad Request)
	t.Run("Step_19_GetCompletionResponseForProvider_Error400", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusBadRequest

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponseForProvider(provider, request)
		assert.Error(t, err, "Should return error for HTTP 400")
	})

	// Step 20: Test GetCompletionResponseForProvider() - Error (HTTP 403 Forbidden)
	t.Run("Step_20_GetCompletionResponseForProvider_Error403", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusForbidden

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponseForProvider(provider, request)
		assert.Error(t, err, "Should return error for HTTP 403")
	})

	// Step 21: Test GetCompletionResponseForProvider() - Error (HTTP 500 Server Error)
	t.Run("Step_21_GetCompletionResponseForProvider_Error500", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusInternalServerError

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponseForProvider(provider, request)
		assert.Error(t, err, "Should return error for HTTP 500")
	})

	// Step 22: Test GetCompletionResponseForProvider() - Error (Timeout)
	t.Run("Step_22_GetCompletionResponseForProvider_Timeout", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK
		mockBehavior.DelayDuration = 3 * time.Second // Longer than timeout

		provider := &settings.ProviderConfig{
			ProviderName:       "Test Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            mockServer.URL + "/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponseForProvider(provider, request)
		assert.Error(t, err, "Should return timeout error")

		// Reset delay
		mockBehavior.DelayDuration = 0
	})

	// Step 23: Test GetCompletionResponseForProvider() - Error (Invalid Provider)
	t.Run("Step_23_GetCompletionResponseForProvider_InvalidProvider", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK

		provider := &settings.ProviderConfig{
			ProviderName:       "Invalid Provider",
			ProviderType:       settings.ProviderTypeOpenAICompatible,
			BaseUrl:            "", // Empty base URL
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           settings.AuthTypeNone,
		}

		request := &llms.ChatCompletionRequest{
			Model: "model-1",
			Messages: []llms.CompletionRequestMessage{
				{Role: "user", Content: "Hello"},
			},
			Stream: false,
		}

		_, err := handler.GetCompletionResponseForProvider(provider, request)
		assert.Error(t, err, "Should return error for invalid provider")
	})

	// Step 24: Test GetPromptGroups() - Verify Groups Structure
	t.Run("Step_24_GetPromptGroups_VerifyStructure", func(t *testing.T) {
		appPrompts, err := handler.GetPromptGroups()
		require.NoError(t, err)

		assert.NotNil(t, appPrompts, "Prompts should not be nil")
		assert.NotNil(t, appPrompts.PromptGroups, "Prompt groups should not be nil")

		// Verify expected groups exist
		expectedGroups := []string{
			categories.PromptGroupTranslation,
			categories.PromptGroupProofreading,
			categories.PromptGroupFormatting,
			categories.PromptGroupSummarization,
			categories.PromptGroupRewriting,
		}

		for _, groupName := range expectedGroups {
			group, exists := appPrompts.PromptGroups[groupName]
			assert.True(t, exists, fmt.Sprintf("Group %s should exist", groupName))
			assert.NotNil(t, group.Prompts, fmt.Sprintf("Group %s should have prompts", groupName))
			assert.Greater(t, len(group.Prompts), 0, fmt.Sprintf("Group %s should have at least one prompt", groupName))
		}
	})

	// Step 25: Test ProcessPrompt() - Success with Proofreading
	t.Run("Step_25_ProcessPrompt_SuccessProofreading", func(t *testing.T) {
		mockBehavior.StatusCode = http.StatusOK
		mockBehavior.CompletionResponse = &llms.ChatCompletionResponse{
			ID:    "test-completion-2",
			Model: "model-1",
			Choices: []llms.Choice{
				{
					Index: 0,
					Message: llms.CompletionRequestMessage{
						Role:    "assistant",
						Content: "This is the corrected text.",
					},
					FinishReason: "stop",
				},
			},
		}

		// Find a valid proofreading prompt ID
		allPrompts, err := handler.GetPromptGroups()
		require.NoError(t, err)

		var proofreadPromptID string
		if group, exists := allPrompts.PromptGroups[categories.PromptGroupProofreading]; exists {
			for id := range group.Prompts {
				proofreadPromptID = id
				break
			}
		}
		require.NotEmpty(t, proofreadPromptID, "Should find a proofreading prompt")

		actionReq := prompts.PromptActionRequest{
			ID:        proofreadPromptID,
			InputText: "This is a test text with some erors.",
		}

		result, err := handler.ProcessPrompt(actionReq)
		require.NoError(t, err)

		assert.NotEmpty(t, result, "Result should not be empty")
		assert.Equal(t, "This is the corrected text.", result)
	})

	// Step 26: Test ProcessPrompt() - Error (Empty ID)
	t.Run("Step_26_ProcessPrompt_EmptyID", func(t *testing.T) {
		actionReq := prompts.PromptActionRequest{
			ID:        "",
			InputText: "Some text",
		}

		_, err := handler.ProcessPrompt(actionReq)
		assert.Error(t, err, "Should return error for empty ID")
		assert.Contains(t, err.Error(), "cannot be empty")
	})

	// Step 27: Test ProcessPrompt() - Error (Invalid Prompt ID)
	t.Run("Step_27_ProcessPrompt_InvalidPromptID", func(t *testing.T) {
		actionReq := prompts.PromptActionRequest{
			ID:        "non-existent-prompt-id-12345",
			InputText: "Some text",
		}

		_, err := handler.ProcessPrompt(actionReq)
		assert.Error(t, err, "Should return error for invalid prompt ID")
	})

	// Step 28: Test ProcessPrompt() - Success with Translation (Same Language Optimization)
	t.Run("Step_28_ProcessPrompt_SameLanguageOptimization", func(t *testing.T) {
		// Find a valid translation prompt ID
		allPrompts, err := handler.GetPromptGroups()
		require.NoError(t, err)

		var translationPromptID string
		if group, exists := allPrompts.PromptGroups[categories.PromptGroupTranslation]; exists {
			for id := range group.Prompts {
				translationPromptID = id
				break
			}
		}
		require.NotEmpty(t, translationPromptID, "Should find a translation prompt")

		inputText := "This is the original text."
		actionReq := prompts.PromptActionRequest{
			ID:               translationPromptID,
			InputText:        inputText,
			InputLanguageID:  "English",
			OutputLanguageID: "English", // Same language
		}

		result, err := handler.ProcessPrompt(actionReq)
		require.NoError(t, err)

		// When translating to the same language, should return input text unchanged
		assert.Equal(t, inputText, result, "Should return input text unchanged for same-language translation")
	})

	// Step 29: Reset Settings and Verify Default State
	t.Run("Step_29_ResetSettingsAndVerify", func(t *testing.T) {
		resetSettings, err := settingsHandler.ResetSettingsToDefault()
		require.NoError(t, err)

		assert.Len(t, resetSettings.AvailableProviderConfigs, 5, "Should have 5 default providers")
		assert.Equal(t, "Ollama", resetSettings.CurrentProviderConfig.ProviderName)

		// Verify persistence
		currentSettings, err := settingsHandler.GetSettings()
		require.NoError(t, err)

		assert.Len(t, currentSettings.AvailableProviderConfigs, 5)
		assert.Equal(t, "Ollama", currentSettings.CurrentProviderConfig.ProviderName)
	})

	// Cleanup mock server
	if mockServer != nil {
		mockServer.Close()
	}
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
