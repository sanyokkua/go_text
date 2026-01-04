package llms

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"go_text/internal/settings"

	"github.com/wailsapp/wails/v2/pkg/logger"
	"resty.dev/v3"
)

// MockLogger for testing
type MockLogger struct {
	TraceMessages   []string
	InfoMessages    []string
	DebugMessages   []string
	ErrorMessages   []string
	WarningMessages []string
}

func (m *MockLogger) Fatal(message string) {}
func (m *MockLogger) Error(message string) {
	m.ErrorMessages = append(m.ErrorMessages, message)
}
func (m *MockLogger) Warning(message string) {
	m.WarningMessages = append(m.WarningMessages, message)
}
func (m *MockLogger) Info(message string) {
	m.InfoMessages = append(m.InfoMessages, message)
}
func (m *MockLogger) Debug(message string) {
	m.DebugMessages = append(m.DebugMessages, message)
}
func (m *MockLogger) Trace(message string) {
	m.TraceMessages = append(m.TraceMessages, message)
}
func (m *MockLogger) Print(message string) {}
func (m *MockLogger) Clear() {
	m.InfoMessages = nil
	m.DebugMessages = nil
	m.ErrorMessages = nil
	m.WarningMessages = nil
	m.TraceMessages = nil
}

// TestNewLLMApiService tests the constructor
func TestNewLLMApiService(t *testing.T) {
	tests := []struct {
		name          string
		logger        logger.Logger
		client        *resty.Client
		settings      *settings.SettingsService
		expectPanic   bool
		panicContains string
	}{
		{
			name:        "Successful creation with valid parameters",
			logger:      &MockLogger{},
			client:      resty.New(),
			settings:    &settings.SettingsService{}, // Empty but non-nil
			expectPanic: false,
		},
		{
			name:          "Panic when logger is nil",
			logger:        nil,
			client:        resty.New(),
			settings:      &settings.SettingsService{},
			expectPanic:   true,
			panicContains: "logger cannot be nil",
		},
		{
			name:          "Panic when client is nil",
			logger:        &MockLogger{},
			client:        nil,
			settings:      &settings.SettingsService{},
			expectPanic:   true,
			panicContains: "REST client cannot be nil",
		},
		{
			name:          "Panic when settings service is nil",
			logger:        &MockLogger{},
			client:        resty.New(),
			settings:      nil,
			expectPanic:   true,
			panicContains: "settings service cannot be nil",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectPanic {
				defer func() {
					if r := recover(); r == nil {
						t.Error("Expected panic but none occurred")
					} else if tt.panicContains != "" && !strings.Contains(fmt.Sprintf("%v", r), tt.panicContains) {
						t.Errorf("Expected panic to contain %s, got %v", tt.panicContains, r)
					}
				}()
			}

			service := NewLLMApiService(tt.logger, tt.client, tt.settings)

			if !tt.expectPanic {
				if service == nil {
					t.Error("NewLLMApiService returned nil")
				}
			}
		})
	}
}

// TestMapModelNames tests the mapModelNames method
func TestMapModelNames(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		response      *ModelsListResponse
		expectCount   int
		expectWarning bool
		expectInfo    bool
	}{
		{
			name:          "Nil response",
			response:      nil,
			expectCount:   0,
			expectWarning: true,
		},
		{
			name:        "Empty data array",
			response:    &ModelsListResponse{Data: []ModelsResponse{}},
			expectCount: 0,
			expectInfo:  true,
		},
		{
			name:        "Single model with ID",
			response:    &ModelsListResponse{Data: []ModelsResponse{{ID: "model1"}}},
			expectCount: 1,
		},
		{
			name:        "Multiple models with IDs",
			response:    &ModelsListResponse{Data: []ModelsResponse{{ID: "model1"}, {ID: "model2"}, {ID: "model3"}}},
			expectCount: 3,
		},
		{
			name:        "Models with empty and whitespace IDs",
			response:    &ModelsListResponse{Data: []ModelsResponse{{ID: ""}, {ID: "  "}, {ID: "model1"}}},
			expectCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.mapModelNames(tt.response)

			if len(result) != tt.expectCount {
				t.Errorf("mapModelNames() returned %d models, want %d", len(result), tt.expectCount)
			}

			if tt.expectWarning && len(logger.WarningMessages) == 0 {
				t.Error("Expected warning logging to occur")
			}

			if tt.expectInfo && len(logger.InfoMessages) == 0 {
				t.Error("Expected info logging to occur")
			}

			// Clear logger for next test
			logger.Clear()
		})
	}
}

// TestBuildRequestURL tests the buildRequestURL method
func TestBuildRequestURL(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		baseURL       string
		endpoint      string
		expectURL     string
		expectError   bool
		errorContains string
	}{
		{
			name:        "Valid URL with endpoint",
			baseURL:     "http://localhost:8080",
			endpoint:    "api/models",
			expectURL:   "http://localhost:8080/api/models",
			expectError: false,
		},
		{
			name:        "Valid URL with trailing slash and endpoint",
			baseURL:     "http://localhost:8080/",
			endpoint:    "api/models",
			expectURL:   "http://localhost:8080/api/models",
			expectError: false,
		},
		{
			name:        "Valid URL with endpoint starting with slash",
			baseURL:     "http://localhost:8080",
			endpoint:    "/api/models",
			expectURL:   "http://localhost:8080/api/models",
			expectError: false,
		},
		{
			name:        "Valid URL with both slashes",
			baseURL:     "http://localhost:8080/",
			endpoint:    "/api/models",
			expectURL:   "http://localhost:8080/api/models",
			expectError: false,
		},
		{
			name:        "Empty endpoint",
			baseURL:     "http://localhost:8080",
			endpoint:    "",
			expectURL:   "http://localhost:8080/",
			expectError: false,
		},
		{
			name:          "Empty base URL",
			baseURL:       "",
			endpoint:      "api/models",
			expectError:   true,
			errorContains: "base URL cannot be empty",
		},
		{
			name:          "Whitespace base URL",
			baseURL:       "   ",
			endpoint:      "api/models",
			expectError:   true,
			errorContains: "base URL cannot be empty",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url, err := service.buildRequestURL(tt.baseURL, tt.endpoint)

			if (err != nil) != tt.expectError {
				t.Errorf("buildRequestURL() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("buildRequestURL() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			} else {
				if url != tt.expectURL {
					t.Errorf("buildRequestURL() = %s, want %s", url, tt.expectURL)
				}
			}

			// Clear logger for next test
			logger.Clear()
		})
	}
}

// TestValidateTimeout tests the validateTimeout method
func TestValidateTimeout(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		inputTimeout  int
		expectTimeout int
		expectWarning bool
	}{
		{
			name:          "Valid timeout in range",
			inputTimeout:  30,
			expectTimeout: 30,
			expectWarning: false,
		},
		{
			name:          "Timeout too low",
			inputTimeout:  0,
			expectTimeout: 30, // Should default to 30
			expectWarning: true,
		},
		{
			name:          "Timeout too high",
			inputTimeout:  700,
			expectTimeout: 30, // Should default to 30
			expectWarning: true,
		},
		{
			name:          "Timeout at lower boundary",
			inputTimeout:  1,
			expectTimeout: 1,
			expectWarning: false,
		},
		{
			name:          "Timeout at upper boundary",
			inputTimeout:  600,
			expectTimeout: 600,
			expectWarning: false,
		},
		{
			name:          "Negative timeout",
			inputTimeout:  -1,
			expectTimeout: 30, // Should default to 30
			expectWarning: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.validateTimeout(tt.inputTimeout)

			if result != tt.expectTimeout {
				t.Errorf("validateTimeout() = %d, want %d", result, tt.expectTimeout)
			}

			if tt.expectWarning && len(logger.WarningMessages) == 0 {
				t.Error("Expected warning logging to occur")
			}

			if !tt.expectWarning && len(logger.WarningMessages) > 0 {
				t.Error("Unexpected warning logging occurred")
			}

			// Clear logger for next test
			logger.Clear()
		})
	}
}

// TestValidateMaxRetries tests the validateMaxRetries method
func TestValidateMaxRetries(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		inputRetries  int
		expectRetries int
		expectWarning bool
	}{
		{
			name:          "Valid retries in range",
			inputRetries:  3,
			expectRetries: 3,
			expectWarning: false,
		},
		{
			name:          "Retries too low (negative)",
			inputRetries:  -1,
			expectRetries: 3, // Should default to 3
			expectWarning: true,
		},
		{
			name:          "Retries too high",
			inputRetries:  15,
			expectRetries: 3, // Should default to 3
			expectWarning: true,
		},
		{
			name:          "Retries at lower boundary",
			inputRetries:  0,
			expectRetries: 0,
			expectWarning: false,
		},
		{
			name:          "Retries at upper boundary",
			inputRetries:  10,
			expectRetries: 10,
			expectWarning: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.validateMaxRetries(tt.inputRetries)

			if result != tt.expectRetries {
				t.Errorf("validateMaxRetries() = %d, want %d", result, tt.expectRetries)
			}

			if tt.expectWarning && len(logger.WarningMessages) == 0 {
				t.Error("Expected warning logging to occur")
			}

			if !tt.expectWarning && len(logger.WarningMessages) > 0 {
				t.Error("Unexpected warning logging occurred")
			}

			// Clear logger for next test
			logger.Clear()
		})
	}
}

// TestGetAuthToken tests the getAuthToken method
func TestGetAuthToken(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name           string
		providerConfig *settings.ProviderConfig
		expectToken    string
		expectEmpty    bool
		expectWarning  bool
	}{
		{
			name:           "Nil provider",
			providerConfig: nil,
			expectToken:    "",
			expectEmpty:    true,
			expectWarning:  false,
		},
		{
			name: "AuthTypeNone",
			providerConfig: &settings.ProviderConfig{
				AuthType: settings.AuthTypeNone,
			},
			expectToken:   "",
			expectEmpty:   true,
			expectWarning: false,
		},
		{
			name: "UseAuthTokenFromEnv with valid env var",
			providerConfig: &settings.ProviderConfig{
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     "TEST_AUTH_TOKEN",
			},
			expectToken:   "", // Will be empty since env var is not set
			expectEmpty:   true,
			expectWarning: true, // Should warn that env var is not set
		},
		{
			name: "UseAuthTokenFromEnv with empty env var name",
			providerConfig: &settings.ProviderConfig{
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     "",
			},
			expectToken:   "",
			expectEmpty:   true,
			expectWarning: true, // Should warn that no auth token found
		},
		{
			name: "UseAuthTokenFromEnv with valid env var (set in test)",
			providerConfig: &settings.ProviderConfig{
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     "TEST_AUTH_TOKEN_FOR_TEST",
			},
			expectToken:   "test-env-token-value",
			expectEmpty:   false,
			expectWarning: false,
		},
		{
			name: "Direct auth token",
			providerConfig: &settings.ProviderConfig{
				AuthType:            settings.AuthTypeBearer,
				UseAuthTokenFromEnv: false,
				AuthToken:           "test-token-123",
			},
			expectToken:   "test-token-123",
			expectEmpty:   false,
			expectWarning: false,
		},
		{
			name: "ApiKey auth type",
			providerConfig: &settings.ProviderConfig{
				AuthType:            settings.AuthTypeApiKey,
				UseAuthTokenFromEnv: false,
				AuthToken:           "api-key-456",
			},
			expectToken:   "api-key-456",
			expectEmpty:   false,
			expectWarning: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup environment for the specific test case
			if tt.name == "UseAuthTokenFromEnv with valid env var (set in test)" {
				os.Setenv("TEST_AUTH_TOKEN_FOR_TEST", "test-env-token-value")
				defer os.Unsetenv("TEST_AUTH_TOKEN_FOR_TEST")
			}

			result := service.getAuthToken(tt.providerConfig)

			if tt.expectEmpty && result != "" {
				t.Errorf("getAuthToken() = %s, want empty string", result)
			}

			if !tt.expectEmpty && result != tt.expectToken {
				t.Errorf("getAuthToken() = %s, want %s", result, tt.expectToken)
			}

			if tt.expectWarning && len(logger.WarningMessages) == 0 {
				t.Error("Expected warning logging to occur")
			}

			if !tt.expectWarning && len(logger.WarningMessages) > 0 {
				t.Error("Unexpected warning logging occurred")
			}

			// Clear logger for next test
			logger.Clear()
		})
	}
}

// TestBuildRequestHeaders tests the buildRequestHeaders method
func TestBuildRequestHeaders(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name           string
		providerConfig *settings.ProviderConfig
		authToken      string
		expectHeaders  map[string]string
		expectWarning  bool
	}{
		{
			name:           "Nil provider",
			providerConfig: nil,
			authToken:      "",
			expectHeaders:  map[string]string{},
			expectWarning:  false,
		},
		{
			name: "Bearer auth with token",
			providerConfig: &settings.ProviderConfig{
				AuthType: settings.AuthTypeBearer,
			},
			authToken: "test-token",
			expectHeaders: map[string]string{
				"Authorization": "Bearer test-token",
			},
			expectWarning: false,
		},
		{
			name: "API key auth with token",
			providerConfig: &settings.ProviderConfig{
				AuthType: settings.AuthTypeApiKey,
			},
			authToken: "api-key-123",
			expectHeaders: map[string]string{
				"Api-Key": "api-key-123",
			},
			expectWarning: false,
		},
		{
			name: "Bearer auth with empty token",
			providerConfig: &settings.ProviderConfig{
				AuthType: settings.AuthTypeBearer,
			},
			authToken:     "",
			expectHeaders: map[string]string{},
			expectWarning: false,
		},
		{
			name: "Custom headers",
			providerConfig: &settings.ProviderConfig{
				AuthType:         settings.AuthTypeNone,
				UseCustomHeaders: true,
				Headers: map[string]string{
					"X-Custom-Header":  "custom-value",
					"X-Another-Header": "another-value",
				},
			},
			authToken: "",
			expectHeaders: map[string]string{
				"X-Custom-Header":  "custom-value",
				"X-Another-Header": "another-value",
			},
			expectWarning: false,
		},
		{
			name: "Custom headers overriding existing",
			providerConfig: &settings.ProviderConfig{
				AuthType:         settings.AuthTypeBearer,
				UseCustomHeaders: true,
				Headers: map[string]string{
					"Authorization": "custom-auth-token", // This should override the bearer token
				},
			},
			authToken: "original-token",
			expectHeaders: map[string]string{
				"Authorization": "custom-auth-token", // Should be overridden
			},
			expectWarning: true, // Should warn about header override
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.buildRequestHeaders(tt.providerConfig, tt.authToken)

			if len(result) != len(tt.expectHeaders) {
				t.Errorf("buildRequestHeaders() returned %d headers, want %d", len(result), len(tt.expectHeaders))
			}

			for key, expectedValue := range tt.expectHeaders {
				if result[key] != expectedValue {
					t.Errorf("buildRequestHeaders() header %s = %s, want %s", key, result[key], expectedValue)
				}
			}

			if tt.expectWarning && len(logger.WarningMessages) == 0 {
				t.Error("Expected warning logging to occur")
			}

			if !tt.expectWarning && len(logger.WarningMessages) > 0 {
				t.Error("Unexpected warning logging occurred")
			}

			// Clear logger for next test
			logger.Clear()
		})
	}
}

// TestValidateHttpResponse tests the validateHttpResponse method
func TestValidateHttpResponse(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		response      *resty.Response
		expectError   bool
		errorContains string
	}{
		{
			name:          "Nil response",
			response:      nil,
			expectError:   true,
			errorContains: "HTTP response is nil",
		},
		{
			name: "Successful response (200)",
			response: &resty.Response{
				RawResponse: &http.Response{
					StatusCode: http.StatusOK,
					Status:     "200 OK",
				},
			},
			expectError: false,
		},
		{
			name: "Error response (404)",
			response: &resty.Response{
				RawResponse: &http.Response{
					StatusCode: http.StatusNotFound,
					Status:     "404 Not Found",
				},
			},
			expectError:   true,
			errorContains: "API returned error status 404",
		},
		{
			name: "Error response (500)",
			response: &resty.Response{
				RawResponse: &http.Response{
					StatusCode: http.StatusInternalServerError,
					Status:     "500 Internal Server Error",
				},
			},
			expectError:   true,
			errorContains: "API returned error status 500",
		},
		{
			name: "Successful response (201)",
			response: &resty.Response{
				RawResponse: &http.Response{
					StatusCode: http.StatusCreated,
					Status:     "201 Created",
				},
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.validateHttpResponse(tt.response)

			if (err != nil) != tt.expectError {
				t.Errorf("validateHttpResponse() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("validateHttpResponse() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			}

			// Clear logger for next test
			logger.Clear()
		})
	}
}

// TestEdgeCases tests edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	t.Run("MapModelNames with models containing only whitespace", func(t *testing.T) {
		response := &ModelsListResponse{
			Data: []ModelsResponse{
				{ID: "  "},
				{ID: "\t"},
				{ID: "\n"},
				{ID: "model1"},
				{ID: "  model2  "},
			},
		}

		result := service.mapModelNames(response)

		if len(result) != 2 {
			t.Errorf("mapModelNames() returned %d models, want 2", len(result))
		}

		if result[0] != "model1" {
			t.Errorf("mapModelNames() first model = %s, want model1", result[0])
		}

		if result[1] != "model2" {
			t.Errorf("mapModelNames() second model = %s, want model2", result[1])
		}

		logger.Clear()
	})

	t.Run("BuildRequestURL with complex URLs", func(t *testing.T) {
		testCases := []struct {
			baseURL   string
			endpoint  string
			expectURL string
		}{
			{"http://localhost:8080/api/v1", "models", "http://localhost:8080/api/v1/models"},
			{"https://example.com", "chat/completions", "https://example.com/chat/completions"},
			{"http://localhost:8080/", "", "http://localhost:8080/"},
			{"http://localhost:8080", "", "http://localhost:8080/"},
		}

		for _, tc := range testCases {
			url, err := service.buildRequestURL(tc.baseURL, tc.endpoint)
			if err != nil {
				t.Errorf("buildRequestURL(%q, %q) failed: %v", tc.baseURL, tc.endpoint, err)
			} else if url != tc.expectURL {
				t.Errorf("buildRequestURL(%q, %q) = %q, want %q", tc.baseURL, tc.endpoint, url, tc.expectURL)
			}
		}

		logger.Clear()
	})

	t.Run("ValidateTimeout with boundary values", func(t *testing.T) {
		boundaryCases := []struct {
			input  int
			expect int
		}{
			{1, 1},     // Minimum valid
			{600, 600}, // Maximum valid
			{30, 30},   // Middle value
		}

		for _, tc := range boundaryCases {
			result := service.validateTimeout(tc.input)
			if result != tc.expect {
				t.Errorf("validateTimeout(%d) = %d, want %d", tc.input, result, tc.expect)
			}
		}

		logger.Clear()
	})
}

// TestPerformance tests that operations complete in reasonable time
func TestPerformance(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	t.Run("MapModelNames performance with many models", func(t *testing.T) {
		// Create a response with many models
		modelsData := make([]ModelsResponse, 1000)
		for i := 0; i < 1000; i++ {
			modelsData[i] = ModelsResponse{ID: fmt.Sprintf("model-%d", i)}
		}

		response := &ModelsListResponse{Data: modelsData}

		startTime := time.Now()
		result := service.mapModelNames(response)
		duration := time.Since(startTime)

		if len(result) != 1000 {
			t.Errorf("mapModelNames() returned %d models, want 1000", len(result))
		}

		// Should complete in under 100ms for 1000 models
		if duration > 100*time.Millisecond {
			t.Errorf("mapModelNames() took %v, expected < 100ms", duration)
		}

		logger.Clear()
	})

	t.Run("BuildRequestURL performance", func(t *testing.T) {
		startTime := time.Now()

		// Test with many iterations
		for i := 0; i < 1000; i++ {
			_, err := service.buildRequestURL("http://localhost:8080", "api/models")
			if err != nil {
				t.Errorf("buildRequestURL failed on iteration %d: %v", i, err)
				break
			}
		}

		duration := time.Since(startTime)

		// Should complete in under 100ms for 1000 iterations
		if duration > 100*time.Millisecond {
			t.Errorf("buildRequestURL performance test took %v, expected < 100ms", duration)
		}

		logger.Clear()
	})
}

// TestModelListRequest tests the modelListRequest method with HTTP server mocking
func TestModelListRequest(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		response      *ModelsListResponse
		serverStatus  int
		expectError   bool
		errorContains string
	}{
		{
			name: "Successful model list request",
			response: &ModelsListResponse{
				Data: []ModelsResponse{
					{ID: "model1", Name: stringPtr("Model One")},
					{ID: "model2", Name: stringPtr("Model Two")},
				},
			},
			serverStatus: http.StatusOK,
			expectError:  false,
		},
		{
			name: "Empty model list response",
			response: &ModelsListResponse{
				Data: []ModelsResponse{},
			},
			serverStatus: http.StatusOK,
			expectError:  false,
		},
		{
			name: "Server error response",
			response: &ModelsListResponse{
				Data: []ModelsResponse{
					{ID: "model1"},
				},
			},
			serverStatus:  http.StatusInternalServerError,
			expectError:   true,
			errorContains: "model list request failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup test server
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tt.serverStatus)

				if tt.response != nil {
					jsonResponse, _ := json.Marshal(tt.response)
					w.Write(jsonResponse)
				}
			}))
			defer server.Close()

			// Create request parameters
			requestParams := &RequestParameters{
				ModelsEndpoint:     server.URL,
				CompletionEndpoint: "",
				Headers:            map[string]string{},
				TimeoutSeconds:     30,
				MaxRetries:         3,
			}

			// Test the modelListRequest method
			result, err := service.modelListRequest(requestParams)

			if (err != nil) != tt.expectError {
				t.Errorf("modelListRequest() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("modelListRequest() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			} else {
				if result == nil {
					t.Error("modelListRequest() returned nil response")
				} else if len(result.Data) != len(tt.response.Data) {
					t.Errorf("modelListRequest() returned %d models, want %d", len(result.Data), len(tt.response.Data))
				}
			}

			logger.Clear()
		})
	}
}

// TestCompletionRequest tests the completionRequest method with HTTP server mocking
func TestCompletionRequest(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		request       *ChatCompletionRequest
		response      *ChatCompletionResponse
		serverStatus  int
		expectError   bool
		errorContains string
	}{
		{
			name: "Successful completion request",
			request: &ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []CompletionRequestMessage{
					{Role: "user", Content: "Hello, world!"},
				},
			},
			response: &ChatCompletionResponse{
				ID:    "cmpl-123",
				Model: "gpt-3.5-turbo",
				Choices: []Choice{
					{
						Index:        0,
						Message:      CompletionRequestMessage{Role: "assistant", Content: "Hello! How can I help you?"},
						FinishReason: "stop",
					},
				},
			},
			serverStatus: http.StatusOK,
			expectError:  false,
		},
		{
			name: "Completion request with empty choices",
			request: &ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []CompletionRequestMessage{
					{Role: "user", Content: "Hello, world!"},
				},
			},
			response: &ChatCompletionResponse{
				ID:      "cmpl-123",
				Model:   "gpt-3.5-turbo",
				Choices: []Choice{},
			},
			serverStatus: http.StatusOK,
			expectError:  false, // The method doesn't validate empty choices in the HTTP layer
		},
		{
			name: "Server error response",
			request: &ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []CompletionRequestMessage{
					{Role: "user", Content: "Hello, world!"},
				},
			},
			response: &ChatCompletionResponse{
				ID:    "cmpl-123",
				Model: "gpt-3.5-turbo",
				Choices: []Choice{
					{
						Index:        0,
						Message:      CompletionRequestMessage{Role: "assistant", Content: "Hello!"},
						FinishReason: "stop",
					},
				},
			},
			serverStatus:  http.StatusInternalServerError,
			expectError:   true,
			errorContains: "completion request failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup test server
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tt.serverStatus)

				if tt.response != nil {
					jsonResponse, _ := json.Marshal(tt.response)
					w.Write(jsonResponse)
				}
			}))
			defer server.Close()

			// Create request parameters
			requestParams := &RequestParameters{
				ModelsEndpoint:     "",
				CompletionEndpoint: server.URL,
				Headers:            map[string]string{},
				TimeoutSeconds:     30,
				MaxRetries:         3,
			}

			// Test the completionRequest method
			result, err := service.completionRequest(requestParams, tt.request)

			if (err != nil) != tt.expectError {
				t.Errorf("completionRequest() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("completionRequest() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			} else {
				if result == nil {
					t.Error("completionRequest() returned nil response")
				} else if len(result.Choices) != len(tt.response.Choices) {
					t.Errorf("completionRequest() returned %d choices, want %d", len(result.Choices), len(tt.response.Choices))
				} else if len(result.Choices) > 0 && result.Choices[0].Message.Content != tt.response.Choices[0].Message.Content {
					t.Errorf("completionRequest() first choice content = %s, want %s", result.Choices[0].Message.Content, tt.response.Choices[0].Message.Content)
				}
			}

			logger.Clear()
		})
	}
}

// TestMakeHttpRequest tests the makeHttpRequest method with various HTTP scenarios
func TestMakeHttpRequest(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	tests := []struct {
		name          string
		httpMethod    string
		response      interface{}
		serverStatus  int
		expectError   bool
		errorContains string
	}{
		{
			name:         "Successful GET request",
			httpMethod:   resty.MethodGet,
			response:     &ModelsListResponse{Data: []ModelsResponse{{ID: "model1"}}},
			serverStatus: http.StatusOK,
			expectError:  false,
		},
		{
			name:         "Successful POST request",
			httpMethod:   resty.MethodPost,
			response:     &ChatCompletionResponse{Choices: []Choice{{Message: CompletionRequestMessage{Content: "test"}}}},
			serverStatus: http.StatusOK,
			expectError:  false,
		},
		{
			name:          "GET request with server error",
			httpMethod:    resty.MethodGet,
			response:      &ModelsListResponse{Data: []ModelsResponse{{ID: "model1"}}},
			serverStatus:  http.StatusInternalServerError,
			expectError:   true,
			errorContains: "remote server error",
		},
		{
			name:          "POST request with server error",
			httpMethod:    resty.MethodPost,
			response:      &ChatCompletionResponse{Choices: []Choice{{Message: CompletionRequestMessage{Content: "test"}}}},
			serverStatus:  http.StatusBadRequest,
			expectError:   true,
			errorContains: "remote server error",
		},
		{
			name:          "Empty URL",
			httpMethod:    resty.MethodGet,
			response:      &ModelsListResponse{Data: []ModelsResponse{{ID: "model1"}}},
			serverStatus:  http.StatusOK,
			expectError:   true,
			errorContains: "URL cannot be empty",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup test server
			var server *httptest.Server
			var url string

			if tt.name != "Empty URL" {
				server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(tt.serverStatus)

					if tt.response != nil {
						jsonResponse, _ := json.Marshal(tt.response)
						w.Write(jsonResponse)
					}
				}))
				defer server.Close()
				url = server.URL
			} else {
				url = ""
			}

			// Create request parameters
			requestParams := RequestParameters{
				Headers:        map[string]string{},
				TimeoutSeconds: 30,
				MaxRetries:     3,
			}

			// Test the makeHttpRequest method
			err := service.makeHttpRequest(tt.httpMethod, url, requestParams, nil, tt.response)

			if (err != nil) != tt.expectError {
				t.Errorf("makeHttpRequest() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("makeHttpRequest() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			}

			logger.Clear()
		})
	}
}

// TestLLMServiceInterface tests that the service implements expected methods
func TestLLMServiceInterface(t *testing.T) {
	logger := &MockLogger{}
	client := resty.New()

	// Create a minimal SettingsService for testing
	mockSettingsService := &settings.SettingsService{}

	service := NewLLMApiService(logger, client, mockSettingsService)

	if service == nil {
		t.Fatal("NewLLMApiService returned nil")
	}

	// Test that all expected methods exist by calling them with minimal parameters
	_, err := service.buildRequestURL("http://localhost", "")
	if err != nil {
		t.Errorf("buildRequestURL failed: %v", err)
	}

	result := service.validateTimeout(30)
	if result != 30 {
		t.Errorf("validateTimeout failed: got %d, want 30", result)
	}

	resultRetries := service.validateMaxRetries(3)
	if resultRetries != 3 {
		t.Errorf("validateMaxRetries failed: got %d, want 3", resultRetries)
	}

	token := service.getAuthToken(nil)
	if token != "" {
		t.Errorf("getAuthToken failed: got %s, want empty string", token)
	}

	headers := service.buildRequestHeaders(nil, "")
	if headers == nil {
		t.Errorf("buildRequestHeaders failed: got nil")
	}

	models := service.mapModelNames(nil)
	if models == nil {
		t.Errorf("mapModelNames failed: got nil")
	}

	// Test HTTP response validation
	resp := &resty.Response{
		RawResponse: &http.Response{
			StatusCode: http.StatusOK,
			Status:     "200 OK",
		},
	}
	err = service.validateHttpResponse(resp)
	if err != nil {
		t.Errorf("validateHttpResponse failed: %v", err)
	}

	logger.Clear()
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
