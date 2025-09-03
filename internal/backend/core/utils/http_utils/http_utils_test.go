package http_utils_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go_text/internal/backend/core/utils/http_utils"
	"go_text/internal/backend/models"

	"github.com/stretchr/testify/assert"
	"resty.dev/v3"
)

func TestBuildRequestURL(t *testing.T) {
	tests := []struct {
		name      string
		baseUrl   string
		endpoint  string
		wantURL   string
		wantError bool
	}{
		{
			name:      "Empty baseUrl",
			baseUrl:   "",
			endpoint:  "/test",
			wantURL:   "",
			wantError: true,
		},
		{
			name:      "Whitespace baseUrl",
			baseUrl:   "   ",
			endpoint:  "/test",
			wantURL:   "",
			wantError: true,
		},
		{
			name:      "Valid baseUrl",
			baseUrl:   "http://example.com",
			endpoint:  "/api",
			wantURL:   "http://example.com/api",
			wantError: false,
		},
		{
			name:      "BaseUrl with trailing slash",
			baseUrl:   "http://example.com/",
			endpoint:  "/api",
			wantURL:   "http://example.com/api",
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := http_utils.BuildRequestURL(tt.baseUrl, tt.endpoint)
			if (err != nil) != tt.wantError {
				t.Errorf("BuildRequestURL() error = %v, wantError %v", err, tt.wantError)
				return
			}
			if got != tt.wantURL {
				t.Errorf("BuildRequestURL() = %v, want %v", got, tt.wantURL)
			}
		})
	}
}

func TestMakeLLMModelListRequest(t *testing.T) {
	t.Run("Empty baseUrl", func(t *testing.T) {
		client := http_utils.NewRestyClient()
		_, err := http_utils.MakeLLMModelListRequest(client, "", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "baseUrl cannot be blank")
	})

	t.Run("Successful response", func(t *testing.T) {
		// Create proper model objects with pointers
		name1 := "Model One"
		name2 := "Model Two"

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/v1/models", r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(200)
			json.NewEncoder(w).Encode(models.ModelListResponse{
				Data: []models.Model{
					{ID: "model1", Name: &name1},
					{ID: "model2", Name: &name2},
				},
			})
		}))
		defer server.Close()

		client := http_utils.NewRestyClient()
		resp, err := http_utils.MakeLLMModelListRequest(client, server.URL, map[string]string{})
		assert.NoError(t, err)
		assert.Equal(t, 2, len(resp.Data))
		assert.Equal(t, "model1", resp.Data[0].ID)
		if resp.Data[0].Name != nil {
			assert.Equal(t, "Model One", *resp.Data[0].Name)
		}
	})

	t.Run("Server error response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(500)
		}))
		defer server.Close()

		client := http_utils.NewRestyClient()
		_, err := http_utils.MakeLLMModelListRequest(client, server.URL, nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "API request failed")
	})
}

func TestMakeLLMCompletionRequest(t *testing.T) {
	t.Run("Valid request", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			assert.Equal(t, "/v1/chat/completions", r.URL.Path)
			assert.Equal(t, "POST", r.Method)

			var req models.ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)
			assert.Equal(t, "test-model", req.Model)
			assert.Equal(t, 0.7, req.Temperature)
			assert.Equal(t, 2, len(req.Messages))

			w.WriteHeader(200)
			json.NewEncoder(w).Encode(models.ChatCompletionResponse{
				ID:    "resp-123",
				Model: "test-model",
				Choices: []models.Choice{
					{
						Index: 0,
						Message: models.Message{
							Role:    "assistant",
							Content: "Test response",
						},
						FinishReason: "stop",
					},
				},
				Usage: models.Usage{
					PromptTokens:     10,
					CompletionTokens: 5,
					TotalTokens:      15,
				},
			})
		}))
		defer server.Close()

		client := http_utils.NewRestyClient()
		request := models.NewChatCompletionRequest(
			"test-model",
			"Test prompt",
			"System prompt",
			0.7,
		)

		resp, err := http_utils.MakeLLMCompletionRequest(client, server.URL, nil, &request)
		assert.NoError(t, err)
		assert.Equal(t, "resp-123", resp.ID)
		assert.Equal(t, "Test response", resp.Choices[0].Message.Content)
	})

	t.Run("Invalid baseUrl", func(t *testing.T) {
		client := http_utils.NewRestyClient()
		_, err := http_utils.MakeLLMCompletionRequest(client, "", nil, &models.ChatCompletionRequest{})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "baseUrl cannot be blank")
	})
}

func TestMakeHttpRequest(t *testing.T) {
	t.Run("GET request without body", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			assert.Equal(t, "GET", r.Method)
			assert.Equal(t, "test-value", r.Header.Get("X-Test-Header"))
			w.WriteHeader(200)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}))
		defer server.Close()

		client := http_utils.NewRestyClient()
		var result map[string]string
		err := http_utils.MakeHttpRequest(
			client,
			resty.MethodGet,
			server.URL,
			map[string]string{"X-Test-Header": "test-value"},
			nil,
			&result,
		)
		assert.NoError(t, err)
		assert.Equal(t, "ok", result["status"])
	})

	t.Run("POST request with body", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			assert.Equal(t, "POST", r.Method)
			var body map[string]string
			json.NewDecoder(r.Body).Decode(&body)
			assert.Equal(t, "test", body["key"])
			w.WriteHeader(200)
			json.NewEncoder(w).Encode(map[string]string{"status": "created"})
		}))
		defer server.Close()

		client := http_utils.NewRestyClient()
		var result map[string]string
		err := http_utils.MakeHttpRequest(
			client,
			resty.MethodPost,
			server.URL,
			nil,
			map[string]string{"key": "test"},
			&result,
		)
		assert.NoError(t, err)
		assert.Equal(t, "created", result["status"])
	})

	t.Run("Error response handling", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(400)
		}))
		defer server.Close()

		client := http_utils.NewRestyClient()
		var result map[string]string
		err := http_utils.MakeHttpRequest(
			client,
			resty.MethodGet,
			server.URL,
			nil,
			nil,
			&result,
		)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "API request failed")
	})
}

func TestValidateHttpResponse(t *testing.T) {
	t.Run("200 OK", func(t *testing.T) {
		resp := &resty.Response{
			RawResponse: &http.Response{StatusCode: 200},
		}
		err := http_utils.ValidateHttpResponse(resp)
		assert.NoError(t, err)
	})

	t.Run("404 Not Found", func(t *testing.T) {
		resp := &resty.Response{
			RawResponse: &http.Response{StatusCode: 404},
		}
		err := http_utils.ValidateHttpResponse(resp)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "API request failed with status 404")
	})

	t.Run("500 Server Error", func(t *testing.T) {
		resp := &resty.Response{
			RawResponse: &http.Response{StatusCode: 500},
		}
		err := http_utils.ValidateHttpResponse(resp)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "API request failed with status 500")
	})
}

func TestNewRestyClient(t *testing.T) {
	client := http_utils.NewRestyClient()

	// Verify timeout is set correctly by checking client behavior
	start := time.Now()
	_, err := client.R().
		SetTimeout(1 * time.Nanosecond).
		Get("https://httpbin.org/delay/1")
	elapsed := time.Since(start)

	assert.Error(t, err)
	assert.True(t, elapsed < 100*time.Millisecond, "Request should time out quickly")

	// Verify headers are set by making a test request
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "application/json", r.Header.Get("Accept"))
		w.WriteHeader(200)
	}))
	defer server.Close()

	_, err = client.R().Get(server.URL)
	assert.NoError(t, err)
}
