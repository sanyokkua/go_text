package http_client

import (
	"go_text/internal/backend/models/llm"
	"testing"
)

func TestMakeGetModelsRequest(t *testing.T) {
	baseUrl := "http://localhost:11434"

	resp, err := MakeGetModelsRequest(baseUrl, nil)
	if err != nil {
		t.Fatalf("MakeGetModelsRequest failed: %v", err)
	}

	if len(resp.Data) == 0 {
		t.Fatal("expected at least one model, got empty list")
	}

	t.Logf("Found %d models: %v", len(resp.Data), resp.Data)
}

func TestMakeChatCompletionRequest(t *testing.T) {
	baseUrl := "http://localhost:11434"

	// First get available models
	modelsResp, err := MakeGetModelsRequest(baseUrl, nil)
	if err != nil {
		t.Skipf("skipping chat test - failed to get models: %v", err)
	}
	if len(modelsResp.Data) == 0 {
		t.Skip("skipping chat test - no models available")
	}

	modelID := modelsResp.Data[0].ID
	t.Logf("Using model: %s", modelID)

	// Create minimal valid request
	request := llm.ChatCompletionRequest{
		Model: modelID,
		Messages: []llm.Message{
			{Role: "user", Content: "Hello"},
		},
		Temperature: 0.0,
		Stream:      false,
	}

	resp, err := MakeChatCompletionRequest(baseUrl, request, nil)
	if err != nil {
		t.Fatalf("MakeChatCompletionRequest failed: %v", err)
	}

	if len(resp.Choices) == 0 {
		t.Fatal("expected at least one choice in response")
	}

	if resp.Choices[0].Message.Content == "" {
		t.Fatal("expected non-empty response content")
	}

	t.Logf("Response: %q", resp.Choices[0].Message.Content)
}
