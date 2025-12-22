package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go_text/backend/v2/model/llm"

	"resty.dev/v3"
)

// MockLogger for testing
type MockLogger struct {
	InfoMessages  []string
	DebugMessages []string
	ErrorMessages []string
}

func (m *MockLogger) LogInfo(msg string, keysAndValues ...interface{}) {
	m.InfoMessages = append(m.InfoMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) LogDebug(msg string, keysAndValues ...interface{}) {
	m.DebugMessages = append(m.DebugMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) LogWarn(msg string, keysAndValues ...interface{}) {
	// Not used in current implementation
}

func (m *MockLogger) LogError(msg string, keysAndValues ...interface{}) {
	m.ErrorMessages = append(m.ErrorMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) Clear() {
	m.InfoMessages = nil
	m.DebugMessages = nil
	m.ErrorMessages = nil
}

// Test ModelListRequest - Focus on URL validation and error handling
func TestModelListRequest(t *testing.T) {
	tests := []struct {
		name             string
		baseUrl          string
		endpoint         string
		expectError      bool
		expectedErrorMsg string
	}{
		{
			name:             "Empty base URL",
			baseUrl:          "",
			endpoint:         "/v1/models",
			expectError:      true,
			expectedErrorMsg: "failed to construct request URL",
		},
		{
			name:             "Empty endpoint",
			baseUrl:          "http://localhost:11434",
			endpoint:         "",
			expectError:      true,
			expectedErrorMsg: "failed to construct request URL",
		},
		{
			name:             "Whitespace base URL",
			baseUrl:          "   ",
			endpoint:         "/v1/models",
			expectError:      true,
			expectedErrorMsg: "failed to construct request URL",
		},
		{
			name:             "Whitespace endpoint",
			baseUrl:          "http://localhost:11434",
			endpoint:         "   ",
			expectError:      true,
			expectedErrorMsg: "failed to construct request URL",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewLlmHttpApiService(logger, &resty.Client{})

			_, err := service.ModelListRequest(tt.baseUrl, tt.endpoint, nil)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("ModelListRequest() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("ModelListRequest() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				// Should not reach here for these test cases
				t.Error("Expected error but got success")
			}
		})
	}
}

// Test CompletionRequest - Focus on URL validation and error handling
func TestCompletionRequest(t *testing.T) {
	tests := []struct {
		name             string
		baseUrl          string
		endpoint         string
		request          *llm.ChatCompletionRequest
		expectError      bool
		expectedErrorMsg string
	}{
		{
			name:     "Empty base URL",
			baseUrl:  "",
			endpoint: "/v1/chat/completions",
			request: &llm.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []llm.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			expectError:      true,
			expectedErrorMsg: "failed to construct completion URL",
		},
		{
			name:     "Empty endpoint",
			baseUrl:  "http://localhost:11434",
			endpoint: "",
			request: &llm.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []llm.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			expectError:      true,
			expectedErrorMsg: "failed to construct completion URL",
		},
		{
			name:     "Whitespace base URL",
			baseUrl:  "   ",
			endpoint: "/v1/chat/completions",
			request: &llm.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []llm.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			expectError:      true,
			expectedErrorMsg: "failed to construct completion URL",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewLlmHttpApiService(logger, &resty.Client{})

			_, err := service.CompletionRequest(tt.baseUrl, tt.endpoint, nil, tt.request)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("CompletionRequest() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("CompletionRequest() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				// Should not reach here for these test cases
				t.Error("Expected error but got success")
			}
		})
	}
}

// Test buildRequestURL - Test the private method through a helper approach
func TestBuildRequestURL(t *testing.T) {
	tests := []struct {
		name          string
		baseUrl       string
		endpoint      string
		expectedURL   string
		expectError   bool
		expectedError string
	}{
		{
			name:        "Normal URL construction",
			baseUrl:     "http://localhost:11434",
			endpoint:    "/v1/models",
			expectedURL: "http://localhost:11434/v1/models",
			expectError: false,
		},
		{
			name:        "Base URL with trailing slash",
			baseUrl:     "http://localhost:11434/",
			endpoint:    "/v1/models",
			expectedURL: "http://localhost:11434/v1/models",
			expectError: false,
		},
		{
			name:        "Endpoint without leading slash",
			baseUrl:     "http://localhost:11434",
			endpoint:    "v1/models",
			expectedURL: "http://localhost:11434/v1/models",
			expectError: false,
		},
		{
			name:        "Both with slashes",
			baseUrl:     "http://localhost:11434/",
			endpoint:    "/v1/models",
			expectedURL: "http://localhost:11434/v1/models",
			expectError: false,
		},
		{
			name:          "Empty endpoint",
			baseUrl:       "http://localhost:11434",
			endpoint:      "",
			expectedURL:   "http://localhost:11434",
			expectError:   true, // Empty endpoint is considered invalid
			expectedError: "endpoint path cannot be empty or whitespace",
		},
		{
			name:          "Empty base URL",
			baseUrl:       "",
			endpoint:      "/v1/models",
			expectedURL:   "",
			expectError:   true,
			expectedError: "base URL cannot be empty or whitespace",
		},
		{
			name:          "Whitespace base URL",
			baseUrl:       "   ",
			endpoint:      "/v1/models",
			expectedURL:   "",
			expectError:   true,
			expectedError: "base URL cannot be empty or whitespace",
		},
		{
			name:          "Whitespace endpoint",
			baseUrl:       "http://localhost:11434",
			endpoint:      "   ",
			expectedURL:   "",
			expectError:   true,
			expectedError: "endpoint path cannot be empty or whitespace",
		},
		{
			name:        "Complex endpoint path",
			baseUrl:     "http://localhost:11434",
			endpoint:    "/api/v1/models/list",
			expectedURL: "http://localhost:11434/api/v1/models/list",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewLlmHttpApiService(logger, &resty.Client{})

			// Access the private method through type assertion
			serviceImpl := service.(*llmHttpService)
			url, err := serviceImpl.buildRequestURL(tt.baseUrl, tt.endpoint)

			if (err != nil) != tt.expectError {
				t.Errorf("buildRequestURL() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if err.Error() != tt.expectedError {
					t.Errorf("buildRequestURL() error = %v, expectedError %v", err, tt.expectedError)
				}
			} else {
				if url != tt.expectedURL {
					t.Errorf("buildRequestURL() = %v, want %v", url, tt.expectedURL)
				}
			}
		})
	}
}

// Test ModelListRequest with successful HTTP response
func TestModelListRequest_Success(t *testing.T) {
	t.Run("Successful model list response", func(t *testing.T) {
		// Create test server
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet {
				t.Errorf("Expected GET request, got %s", r.Method)
			}
			if r.URL.Path != "/v1/models" {
				t.Errorf("Expected path /v1/models, got %s", r.URL.Path)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			modelName1 := "Model One"
			modelName2 := "Model Two"
			response := llm.LlmModelListResponse{
				Data: []llm.LlmModel{
					{ID: "model1", Name: &modelName1},
					{ID: "model2", Name: &modelName2},
				},
			}
			json.NewEncoder(w).Encode(response)
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)

		resp, err := service.ModelListRequest(server.URL, "/v1/models", nil)

		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if len(resp.Data) != 2 {
			t.Errorf("Expected 2 models, got %d", len(resp.Data))
		}

		if resp.Data[0].ID != "model1" {
			t.Errorf("Expected model1, got %s", resp.Data[0].ID)
		}

		// Verify logging occurred
		if len(logger.InfoMessages) == 0 {
			t.Error("Expected info logging to occur")
		}

		if len(logger.ErrorMessages) > 0 {
			t.Error("Expected no error logging")
		}
	})
}

// Test CompletionRequest with successful HTTP response
func TestCompletionRequest_Success(t *testing.T) {
	t.Run("Successful completion response", func(t *testing.T) {
		// Create test server
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Errorf("Expected POST request, got %s", r.Method)
			}
			if r.URL.Path != "/v1/chat/completions" {
				t.Errorf("Expected path /v1/chat/completions, got %s", r.URL.Path)
			}

			// Verify request body
			var req llm.ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)

			if req.Model != "gpt-3.5-turbo" {
				t.Errorf("Expected model gpt-3.5-turbo, got %s", req.Model)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			response := llm.ChatCompletionResponse{
				ID:    "resp-123",
				Model: "gpt-3.5-turbo",
				Choices: []llm.Choice{
					{
						Index:        0,
						Message:      llm.Message{Role: "assistant", Content: "Hello there!"},
						FinishReason: "stop",
					},
				},
				Usage: llm.Usage{
					PromptTokens:     10,
					CompletionTokens: 5,
					TotalTokens:      15,
				},
			}
			json.NewEncoder(w).Encode(response)
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)

		request := &llm.ChatCompletionRequest{
			Model: "gpt-3.5-turbo",
			Messages: []llm.Message{
				{Role: "user", Content: "Hello"},
			},
		}

		resp, err := service.CompletionRequest(server.URL, "/v1/chat/completions", nil, request)

		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if resp.ID != "resp-123" {
			t.Errorf("Expected resp-123, got %s", resp.ID)
		}

		if resp.Choices[0].Message.Content != "Hello there!" {
			t.Errorf("Expected 'Hello there!', got %s", resp.Choices[0].Message.Content)
		}

		// Verify logging occurred
		if len(logger.InfoMessages) == 0 {
			t.Error("Expected info logging to occur")
		}

		if len(logger.ErrorMessages) > 0 {
			t.Error("Expected no error logging")
		}
	})
}

// Test makeHttpRequest method directly
func TestMakeHttpRequest(t *testing.T) {
	t.Run("GET request without body", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)
		serviceImpl := service.(*llmHttpService)

		var result map[string]string
		err := serviceImpl.makeHttpRequest(resty.MethodGet, server.URL, nil, nil, &result)

		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if result["status"] != "ok" {
			t.Errorf("Expected status 'ok', got %s", result["status"])
		}

		// Verify debug logging occurred
		if len(logger.DebugMessages) == 0 {
			t.Error("Expected debug logging to occur")
		}
	})

	t.Run("POST request with body", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				t.Errorf("Expected POST method, got %s", r.Method)
			}

			var body map[string]string
			json.NewDecoder(r.Body).Decode(&body)

			if body["key"] != "value" {
				t.Errorf("Expected body key 'value', got %s", body["key"])
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "created"})
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)
		serviceImpl := service.(*llmHttpService)

		var result map[string]string
		requestBody := map[string]string{"key": "value"}
		err := serviceImpl.makeHttpRequest(resty.MethodPost, server.URL, nil, requestBody, &result)

		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if result["status"] != "created" {
			t.Errorf("Expected status 'created', got %s", result["status"])
		}
	})

	t.Run("Error response handling", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)
		serviceImpl := service.(*llmHttpService)

		var result map[string]string
		err := serviceImpl.makeHttpRequest(resty.MethodGet, server.URL, nil, nil, &result)

		if err == nil {
			t.Fatal("Expected error, got nil")
		}

		if !containsErrorMessage(err.Error(), "remote server error") {
			t.Errorf("Expected error to contain 'remote server error', got: %v", err)
		}

		// Verify error logging occurred
		if len(logger.ErrorMessages) == 0 {
			t.Error("Expected error logging to occur")
		}
	})
}

// Test validateHttpResponse method
func TestValidateHttpResponse(t *testing.T) {
	t.Run("200 OK response", func(t *testing.T) {
		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)
		serviceImpl := service.(*llmHttpService)

		resp := &resty.Response{
			RawResponse: &http.Response{StatusCode: http.StatusOK},
		}

		err := serviceImpl.validateHttpResponse(resp)

		if err != nil {
			t.Errorf("Expected no error for 200 OK, got: %v", err)
		}

		// Verify no error logging occurred
		if len(logger.ErrorMessages) > 0 {
			t.Error("Expected no error logging for successful response")
		}
	})

	t.Run("404 Not Found response", func(t *testing.T) {
		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)
		serviceImpl := service.(*llmHttpService)

		resp := &resty.Response{
			RawResponse: &http.Response{StatusCode: http.StatusNotFound},
		}

		err := serviceImpl.validateHttpResponse(resp)

		if err == nil {
			t.Fatal("Expected error for 404, got nil")
		}

		if !containsErrorMessage(err.Error(), "remote server error: API returned error status 404") {
			t.Errorf("Expected error to contain 'remote server error: API returned error status 404', got: %v", err)
		}

		// Verify error logging occurred
		if len(logger.ErrorMessages) == 0 {
			t.Error("Expected error logging to occur")
		}
	})

	t.Run("500 Server Error response", func(t *testing.T) {
		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)
		serviceImpl := service.(*llmHttpService)

		resp := &resty.Response{
			RawResponse: &http.Response{StatusCode: http.StatusInternalServerError},
		}

		err := serviceImpl.validateHttpResponse(resp)

		if err == nil {
			t.Fatal("Expected error for 500, got nil")
		}

		if !containsErrorMessage(err.Error(), "remote server error: API returned error status 500") {
			t.Errorf("Expected error to contain 'remote server error: API returned error status 500', got: %v", err)
		}
	})
}

// Test ModelListRequest with server error response
func TestModelListRequest_ServerError(t *testing.T) {
	t.Run("Server returns 500 error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)

		_, err := service.ModelListRequest(server.URL, "/v1/models", nil)

		if err == nil {
			t.Fatal("Expected error, got nil")
		}

		if !containsErrorMessage(err.Error(), "model list request failed") {
			t.Errorf("Expected error to contain 'model list request failed', got: %v", err)
		}

		// Verify error logging occurred
		if len(logger.ErrorMessages) == 0 {
			t.Error("Expected error logging to occur")
		}
	})
}

// Test CompletionRequest with server error response
func TestCompletionRequest_ServerError(t *testing.T) {
	t.Run("Server returns 400 error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)

		request := &llm.ChatCompletionRequest{
			Model: "gpt-3.5-turbo",
			Messages: []llm.Message{
				{Role: "user", Content: "Hello"},
			},
		}

		_, err := service.CompletionRequest(server.URL, "/v1/chat/completions", nil, request)

		if err == nil {
			t.Fatal("Expected error, got nil")
		}

		if !containsErrorMessage(err.Error(), "completion request failed") {
			t.Errorf("Expected error to contain 'completion request failed', got: %v", err)
		}

		// Verify error logging occurred
		if len(logger.ErrorMessages) == 0 {
			t.Error("Expected error logging to occur")
		}
	})
}

// Test LlmHttpApi interface implementation
func TestLlmHttpApiInterface(t *testing.T) {
	t.Run("Service should implement LlmHttpApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		client := &resty.Client{}

		service := NewLlmHttpApiService(logger, client)

		if service == nil {
			t.Fatal("NewLlmHttpApiService returned nil")
		}

		var _ = service
	})
}

// Test logging behavior
func TestLoggingBehavior(t *testing.T) {
	t.Run("Info logging should occur for successful requests", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(llm.LlmModelListResponse{})
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)

		_, err := service.ModelListRequest(server.URL, "/v1/models", nil)

		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		// Verify info logging occurred
		if len(logger.InfoMessages) == 0 {
			t.Error("Expected info logging to occur")
		}

		// Check that info messages contain expected content
		foundStart := false
		foundSuccess := false
		for _, msg := range logger.InfoMessages {
			if containsErrorMessage(msg, "[ModelListRequest] Starting request") {
				foundStart = true
			}
			if containsErrorMessage(msg, "[ModelListRequest] Successfully completed") {
				foundSuccess = true
			}
		}

		if !foundStart {
			t.Error("Expected info message to contain 'Starting request'")
		}
		if !foundSuccess {
			t.Error("Expected info message to contain 'Successfully completed'")
		}
	})

	t.Run("Error logging should occur for failed requests", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()
		service := NewLlmHttpApiService(logger, client)

		_, err := service.ModelListRequest(server.URL, "/v1/models", nil)

		if err == nil {
			t.Fatal("Expected error, got nil")
		}

		// Verify error logging occurred
		if len(logger.ErrorMessages) == 0 {
			t.Error("Expected error logging to occur")
		}

		// Check that error messages contain expected content
		foundError := false
		for _, msg := range logger.ErrorMessages {
			if containsErrorMessage(msg, "[ModelListRequest] HTTP request failed") {
				foundError = true
				break
			}
		}

		if !foundError {
			t.Error("Expected error message to contain 'HTTP request failed'")
		}
	})
}

// Test timeout handling
func TestTimeoutHandling(t *testing.T) {
	t.Run("Request should timeout appropriately", func(t *testing.T) {
		// Create a slow server
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(100 * time.Millisecond)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(llm.LlmModelListResponse{})
		}))
		defer server.Close()

		logger := &MockLogger{}
		client := resty.New()

		// Set a very short timeout to force timeout
		client.SetTimeout(1 * time.Nanosecond)

		service := NewLlmHttpApiService(logger, client)

		_, err := service.ModelListRequest(server.URL, "/v1/models", nil)

		// Should get a timeout error
		if err == nil {
			t.Fatal("Expected timeout error, got nil")
		}

		// Verify error logging occurred
		if len(logger.ErrorMessages) == 0 {
			t.Error("Expected error logging to occur for timeout")
		}
	})
}

// Helper function to check if error message contains expected substring
func containsErrorMessage(actual, expected string) bool {
	return len(actual) >= len(expected) && (actual == expected || len(actual) > len(expected) && actual[:len(expected)] == expected)
}
