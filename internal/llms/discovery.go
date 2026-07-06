package llms

import (
	"encoding/json"

	"go_text/internal/apperr"
)

// DiscoveryStrategy parses a raw HTTP response body into a slice of ModelInfo.
// Each provider kind supplies its own strategy via ProviderProfile.
type DiscoveryStrategy func(body []byte) ([]apperr.ModelInfo, error)

// parseOllamaTags parses the native Ollama /api/tags response:
//
//	{"models":[{"name":"llama3:8b"},…]}
func parseOllamaTags(body []byte) ([]apperr.ModelInfo, error) {
	var resp OllamaTagsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	out := make([]apperr.ModelInfo, 0, len(resp.Models))
	for _, m := range resp.Models {
		if m.Name != "" {
			out = append(out, apperr.ModelInfo{ID: m.Name, Label: m.Name})
		}
	}
	return out, nil
}

// parseStandardModels parses the OpenAI-compatible /v1/models response.
// Handles both the wrapped form {"data":[…]} and a bare array [{…}].
func parseStandardModels(body []byte) ([]apperr.ModelInfo, error) {
	var wrapped ModelsListResponse
	if err := json.Unmarshal(body, &wrapped); err == nil && wrapped.Data != nil {
		return modelsFromList(wrapped.Data), nil
	}
	var bare []ModelsResponse
	if err := json.Unmarshal(body, &bare); err != nil {
		return nil, err
	}
	return modelsFromList(bare), nil
}

func modelsFromList(items []ModelsResponse) []apperr.ModelInfo {
	out := make([]apperr.ModelInfo, 0, len(items))
	for _, item := range items {
		if item.ID != "" {
			out = append(out, apperr.ModelInfo{ID: item.ID, Label: item.ID})
		}
	}
	return out
}

// parseAzureDeployments parses the Azure OpenAI deployments response.
// Accepts {"data":[rich…]} or a bare array. Filters to chat-completion deployments only.
// Entries without Capabilities (nil) are included (assume chat-capable).
func parseAzureDeployments(body []byte) ([]apperr.ModelInfo, error) {
	var entries []azureDeploymentEntry

	var wrapped struct {
		Data []azureDeploymentEntry `json:"data"`
	}
	if err := json.Unmarshal(body, &wrapped); err == nil && len(wrapped.Data) > 0 {
		entries = wrapped.Data
	} else if err := json.Unmarshal(body, &entries); err != nil {
		return nil, err
	}

	out := make([]apperr.ModelInfo, 0, len(entries))
	for _, e := range entries {
		if e.Capabilities != nil && !e.Capabilities.ChatCompletion {
			continue
		}
		info := apperr.ModelInfo{ID: e.ID, Label: e.ID}
		if e.DisplayName != "" {
			info.Label = e.DisplayName
		}
		if e.Features != nil || e.Limits != nil {
			caps := &apperr.ModelCaps{}
			if e.Features != nil {
				caps.SupportsTemperature = e.Features.Temperature
			}
			if e.Limits != nil {
				caps.MaxPromptTokens = e.Limits.MaxPromptTokens
			}
			info.Caps = caps
		}
		out = append(out, info)
	}
	return out, nil
}
