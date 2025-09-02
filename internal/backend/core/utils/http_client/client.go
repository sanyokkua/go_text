package http_client

import (
	"bytes"
	"encoding/json"
	"fmt"
	llm2 "go_text/internal/backend/constants/llm"
	llm "go_text/internal/backend/models/llm"

	"io"
	"net/http"
)

func MakeGetModelsRequest(baseUrl string, headers map[string]string) (*llm.ModelListResponse, error) {
	modelsUrl := baseUrl + llm2.OpenAICompatibleGetModels
	req, err := http.NewRequest("GET", modelsUrl, nil)
	if err != nil {
		return nil, fmt.Errorf("request creation failed: %w", err)
	}

	req.Header.Add("Accept", "application/json")
	if len(headers) > 0 {
		for k, v := range headers {
			req.Header.Add(k, v)
		}
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {

		}
	}(resp.Body)

	if resp.StatusCode != http.StatusOK {
		// Read limited body for error context
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("unexpected status: %s, body: %s",
			resp.Status, string(body))
	}

	var result llm.ModelListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("JSON decode failed: %w", err)
	}

	return &result, nil
}

func MakeChatCompletionRequest(baseURL string, request llm.ChatCompletionRequest, headers map[string]string) (*llm.ChatCompletionResponse, error) {
	endpoint := baseURL + "/v1/chat/completions"

	payload, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize request: %w", err)
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(payload))
	if err != nil {
		return nil, fmt.Errorf("request creation failed: %w", err)
	}

	// 4. Set required headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	// 5. Add custom headers if provided
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// 6. Execute request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {

		}
	}(resp.Body)

	// 7. Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Read limited error response for context
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf(
			"API error %d: %s, response: %s",
			resp.StatusCode,
			http.StatusText(resp.StatusCode),
			string(body),
		)
	}

	// 8. Parse JSON response
	var response llm.ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &response, nil
}
