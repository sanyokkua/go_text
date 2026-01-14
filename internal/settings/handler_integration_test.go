package settings

import (
	"os"
	"path/filepath"
	"testing"

	"go_text/internal/file"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestSettingsHandlerIntegration is a comprehensive integration test for SettingsHandlerAPI
// It runs 60 sequential test steps that share state to simulate real application behavior
func TestSettingsHandlerIntegration(t *testing.T) {
	// Setup test environment
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create real instances (no mocks except env variables)
	logger := &TestLogger{}
	fileUtilsService := file.NewFileUtilsService(logger)
	settingsRepo := NewSettingsRepository(logger, fileUtilsService)
	settingsService := NewSettingsService(logger, settingsRepo, fileUtilsService)
	handler := NewSettingsHandler(logger, settingsService)

	// Variables to store state across test steps
	var ollamaID, lmStudioID, newProviderID string

	// Step 1: Initialize default settings
	t.Run("Step_01_InitDefaultSettings", func(t *testing.T) {
		err := settingsService.InitDefaultSettingsIfAbsent()
		require.NoError(t, err, "Failed to initialize default settings")

		// Verify settings file was created
		expectedPath := filepath.Join(getAppConfigDir(tmpDir), file.SettingsFileName)
		_, err = os.Stat(expectedPath)
		assert.NoError(t, err, "Settings file should exist after initialization")
	})

	// Step 2: Get app metadata
	t.Run("Step_02_GetAppMetadata", func(t *testing.T) {
		metadata, err := handler.GetAppSettingsMetadata()
		require.NoError(t, err)

		assert.NotEmpty(t, metadata.AuthTypes, "AuthTypes should not be empty")
		assert.NotEmpty(t, metadata.ProviderTypes, "ProviderTypes should not be empty")
		assert.NotEmpty(t, metadata.SettingsFolder, "SettingsFolder should not be empty")
		assert.NotEmpty(t, metadata.SettingsFile, "SettingsFile should not be empty")
		assert.Contains(t, metadata.AuthTypes, AuthTypeNone)
		assert.Contains(t, metadata.AuthTypes, AuthTypeApiKey)
		assert.Contains(t, metadata.AuthTypes, AuthTypeBearer)
		assert.Contains(t, metadata.ProviderTypes, ProviderTypeOpenAICompatible)
		assert.Contains(t, metadata.ProviderTypes, ProviderTypeOllama)
	})

	// Step 3: Get initial settings
	t.Run("Step_03_GetInitialSettings", func(t *testing.T) {
		settings, err := handler.GetSettings()
		require.NoError(t, err)

		assert.Len(t, settings.AvailableProviderConfigs, 5, "Should have 5 default providers")
		assert.Equal(t, "Ollama", settings.CurrentProviderConfig.ProviderName)
		assert.Equal(t, 60, settings.InferenceBaseConfig.Timeout)
		assert.Equal(t, 3, settings.InferenceBaseConfig.MaxRetries)
		assert.Equal(t, 0.5, settings.ModelConfig.Temperature)
		assert.True(t, settings.ModelConfig.UseTemperature)
		assert.Len(t, settings.LanguageConfig.Languages, 15)
		assert.Equal(t, "English", settings.LanguageConfig.DefaultInputLanguage)
		assert.Equal(t, "Ukrainian", settings.LanguageConfig.DefaultOutputLanguage)
	})

	// Step 4: Get all providers
	t.Run("Step_04_GetAllProviders", func(t *testing.T) {
		providers, err := handler.GetAllProviderConfigs()
		require.NoError(t, err)

		assert.Len(t, providers, 5, "Should return 5 default providers")

		// Store IDs for later use
		for _, p := range providers {
			if p.ProviderName == "Ollama" {
				ollamaID = p.ProviderID
			} else if p.ProviderName == "LM Studio" {
				lmStudioID = p.ProviderID
			}
		}

		assert.NotEmpty(t, ollamaID, "Ollama provider should exist")
		assert.NotEmpty(t, lmStudioID, "LM Studio provider should exist")
	})

	// Step 5: Get current provider
	t.Run("Step_05_GetCurrentProvider", func(t *testing.T) {
		provider, err := handler.GetCurrentProviderConfig()
		require.NoError(t, err)

		assert.Equal(t, "Ollama", provider.ProviderName)
		assert.Equal(t, ollamaID, provider.ProviderID)
	})

	// Step 6: Get provider by ID
	t.Run("Step_06_GetProviderByID", func(t *testing.T) {
		provider, err := handler.GetProviderConfig(ollamaID)
		require.NoError(t, err)

		assert.Equal(t, "Ollama", provider.ProviderName)
		assert.Equal(t, ProviderTypeOllama, provider.ProviderType)
		assert.Equal(t, "http://127.0.0.1:11434/", provider.BaseUrl)
	})

	// Step 7: Get provider with empty ID
	t.Run("Step_07_GetProviderWithEmptyID", func(t *testing.T) {
		_, err := handler.GetProviderConfig("")
		assert.Error(t, err, "Should return error for empty provider ID")
		assert.Contains(t, err.Error(), "provider ID cannot be empty")
	})

	// Step 8: Get provider with non-existent ID
	t.Run("Step_08_GetProviderWithNonExistentID", func(t *testing.T) {
		_, err := handler.GetProviderConfig("invalid-id-12345")
		assert.Error(t, err, "Should return error for non-existent provider ID")
		assert.Contains(t, err.Error(), "not found")
	})

	// Step 9: Update existing provider
	t.Run("Step_09_UpdateExistingProvider", func(t *testing.T) {
		// Get current Ollama config
		originalProvider, err := handler.GetProviderConfig(ollamaID)
		require.NoError(t, err)

		// Modify it
		originalProvider.BaseUrl = "http://localhost:11434/"
		originalProvider.UseCustomModels = true
		originalProvider.CustomModels = []string{"llama2", "mistral"}

		// Update
		updated, err := handler.UpdateProviderConfig(originalProvider)
		require.NoError(t, err)

		assert.Equal(t, "http://localhost:11434/", updated.BaseUrl)
		assert.True(t, updated.UseCustomModels)
		assert.Len(t, updated.CustomModels, 2)
	})

	// Step 10: Update provider with empty ID
	t.Run("Step_10_UpdateProviderWithEmptyID", func(t *testing.T) {
		invalidProvider := ProviderConfig{
			ProviderID:         "",
			ProviderName:       "Test",
			ProviderType:       ProviderTypeOllama,
			BaseUrl:            "http://localhost:8080/",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           AuthTypeNone,
		}

		_, err := handler.UpdateProviderConfig(invalidProvider)
		assert.Error(t, err, "Should return error for empty provider ID")
		assert.Contains(t, err.Error(), "provider ID cannot be empty")
	})

	// Step 11: Verify update persisted
	t.Run("Step_11_VerifyUpdatePersisted", func(t *testing.T) {
		provider, err := handler.GetProviderConfig(ollamaID)
		require.NoError(t, err)

		assert.Equal(t, "http://localhost:11434/", provider.BaseUrl)
		assert.True(t, provider.UseCustomModels)
		assert.Len(t, provider.CustomModels, 2)
		assert.Contains(t, provider.CustomModels, "llama2")
		assert.Contains(t, provider.CustomModels, "mistral")
	})

	// Step 12: Create new provider
	t.Run("Step_12_CreateNewProvider", func(t *testing.T) {
		newProvider := ProviderConfig{
			ProviderName:       "Custom Provider",
			ProviderType:       ProviderTypeOpenAICompatible,
			BaseUrl:            "http://localhost:5000/",
			ModelsEndpoint:     "api/models",
			CompletionEndpoint: "api/completions",
			AuthType:           AuthTypeApiKey,
			AuthToken:          "test-token-123",
			UseCustomModels:    false,
		}

		created, err := handler.CreateProviderConfig(newProvider)
		require.NoError(t, err)

		assert.NotEmpty(t, created.ProviderID, "Provider ID should be generated")
		assert.Equal(t, "Custom Provider", created.ProviderName)
		newProviderID = created.ProviderID
	})

	// Step 13: Verify create persisted
	t.Run("Step_13_VerifyCreatePersisted", func(t *testing.T) {
		providers, err := handler.GetAllProviderConfigs()
		require.NoError(t, err)

		assert.Len(t, providers, 6, "Should now have 6 providers")

		// Verify the new provider exists
		found := false
		for _, p := range providers {
			if p.ProviderID == newProviderID {
				found = true
				assert.Equal(t, "Custom Provider", p.ProviderName)
			}
		}
		assert.True(t, found, "New provider should exist in the list")
	})

	// Step 14: Create duplicate name
	t.Run("Step_14_CreateDuplicateName", func(t *testing.T) {
		duplicateProvider := ProviderConfig{
			ProviderName:       "Custom Provider", // Same name as step 12
			ProviderType:       ProviderTypeOllama,
			BaseUrl:            "http://localhost:9000/",
			ModelsEndpoint:     "v1/models",
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           AuthTypeNone,
			UseCustomModels:    false,
		}

		_, err := handler.CreateProviderConfig(duplicateProvider)
		assert.Error(t, err, "Should return error for duplicate provider name")
		assert.Contains(t, err.Error(), "already exists")
	})

	// Step 15: Create invalid provider
	t.Run("Step_15_CreateInvalidProvider", func(t *testing.T) {
		invalidProvider := ProviderConfig{
			ProviderName:       "Invalid Provider",
			ProviderType:       ProviderTypeOllama,
			BaseUrl:            "not-a-valid-url", // Invalid URL
			CompletionEndpoint: "v1/chat/completions",
			AuthType:           AuthTypeNone,
		}

		_, err := handler.CreateProviderConfig(invalidProvider)
		assert.Error(t, err, "Should return error for invalid base URL")
	})

	// Step 16: Set new current provider
	t.Run("Step_16_SetNewCurrentProvider", func(t *testing.T) {
		provider, err := handler.SetAsCurrentProviderConfig(newProviderID)
		require.NoError(t, err)

		assert.Equal(t, newProviderID, provider.ProviderID)
		assert.Equal(t, "Custom Provider", provider.ProviderName)
	})

	// Step 17: Set current with empty ID
	t.Run("Step_17_SetCurrentWithEmptyID", func(t *testing.T) {
		_, err := handler.SetAsCurrentProviderConfig("")
		assert.Error(t, err, "Should return error for empty provider ID")
		assert.Contains(t, err.Error(), "provider ID cannot be empty")
	})

	// Step 18: Set current with invalid ID
	t.Run("Step_18_SetCurrentWithInvalidID", func(t *testing.T) {
		_, err := handler.SetAsCurrentProviderConfig("invalid-id-12345")
		assert.Error(t, err, "Should return error for non-existent provider ID")
		assert.Contains(t, err.Error(), "not found")
	})

	// Step 19: Verify current changed
	t.Run("Step_19_VerifyCurrentChanged", func(t *testing.T) {
		provider, err := handler.GetCurrentProviderConfig()
		require.NoError(t, err)

		assert.Equal(t, newProviderID, provider.ProviderID)
		assert.Equal(t, "Custom Provider", provider.ProviderName)
	})

	// Step 20: Delete non-current provider
	t.Run("Step_20_DeleteNonCurrentProvider", func(t *testing.T) {
		err := handler.DeleteProviderConfig(lmStudioID)
		assert.NoError(t, err, "Should successfully delete non-current provider")
	})

	// Step 21: Delete current provider
	t.Run("Step_21_DeleteCurrentProvider", func(t *testing.T) {
		err := handler.DeleteProviderConfig(newProviderID)
		assert.Error(t, err, "Should not allow deleting current provider")
		assert.Contains(t, err.Error(), "cannot delete current provider")
	})

	// Step 22: Delete with empty ID
	t.Run("Step_22_DeleteWithEmptyID", func(t *testing.T) {
		err := handler.DeleteProviderConfig("")
		assert.Error(t, err, "Should return error for empty provider ID")
		assert.Contains(t, err.Error(), "provider ID cannot be empty")
	})

	// Step 23: Delete non-existent
	t.Run("Step_23_DeleteNonExistent", func(t *testing.T) {
		err := handler.DeleteProviderConfig("invalid-id-12345")
		assert.Error(t, err, "Should return error for non-existent provider ID")
		assert.Contains(t, err.Error(), "not found")
	})

	// Step 24: Get inference config
	t.Run("Step_24_GetInferenceConfig", func(t *testing.T) {
		config, err := handler.GetInferenceBaseConfig()
		require.NoError(t, err)

		assert.Equal(t, 60, config.Timeout)
		assert.Equal(t, 3, config.MaxRetries)
		assert.False(t, config.UseMarkdownForOutput)
	})

	// Step 25: Update inference config
	t.Run("Step_25_UpdateInferenceConfig", func(t *testing.T) {
		newConfig := InferenceBaseConfig{
			Timeout:              120,
			MaxRetries:           5,
			UseMarkdownForOutput: true,
		}

		updated, err := handler.UpdateInferenceBaseConfig(newConfig)
		require.NoError(t, err)

		assert.Equal(t, 120, updated.Timeout)
		assert.Equal(t, 5, updated.MaxRetries)
		assert.True(t, updated.UseMarkdownForOutput)
	})

	// Step 26: Verify inference update
	t.Run("Step_26_VerifyInferenceUpdate", func(t *testing.T) {
		config, err := handler.GetInferenceBaseConfig()
		require.NoError(t, err)

		assert.Equal(t, 120, config.Timeout)
		assert.Equal(t, 5, config.MaxRetries)
		assert.True(t, config.UseMarkdownForOutput)
	})

	// Step 27: Update invalid timeout (low)
	t.Run("Step_27_UpdateInvalidTimeoutLow", func(t *testing.T) {
		invalidConfig := InferenceBaseConfig{
			Timeout:    0,
			MaxRetries: 3,
		}

		_, err := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.Error(t, err, "Should return error for timeout = 0")
		assert.Contains(t, err.Error(), "timeout")
	})

	// Step 28: Update invalid timeout (high)
	t.Run("Step_28_UpdateInvalidTimeoutHigh", func(t *testing.T) {
		invalidConfig := InferenceBaseConfig{
			Timeout:    700,
			MaxRetries: 3,
		}

		_, err := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.Error(t, err, "Should return error for timeout > 600")
		assert.Contains(t, err.Error(), "timeout")
	})

	// Step 29: Update invalid retries (negative)
	t.Run("Step_29_UpdateInvalidRetriesNegative", func(t *testing.T) {
		invalidConfig := InferenceBaseConfig{
			Timeout:    60,
			MaxRetries: -1,
		}

		_, err := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.Error(t, err, "Should return error for negative retries")
		assert.Contains(t, err.Error(), "retries")
	})

	// Step 30: Update invalid retries (high)
	t.Run("Step_30_UpdateInvalidRetriesHigh", func(t *testing.T) {
		invalidConfig := InferenceBaseConfig{
			Timeout:    60,
			MaxRetries: 15,
		}

		_, err := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.Error(t, err, "Should return error for retries > 10")
		assert.Contains(t, err.Error(), "retries")
	})

	// Step 31: Get model config
	t.Run("Step_31_GetModelConfig", func(t *testing.T) {
		config, err := handler.GetModelConfig()
		require.NoError(t, err)

		// After reset in step 54, this will be default values
		assert.True(t, config.UseTemperature)
		assert.Equal(t, 0.5, config.Temperature)
	})

	// Step 32: Update model config
	t.Run("Step_32_UpdateModelConfig", func(t *testing.T) {
		newConfig := ModelConfig{
			Name:           "gpt-4",
			UseTemperature: true,
			Temperature:    0.7,
		}

		updated, err := handler.UpdateModelConfig(newConfig)
		require.NoError(t, err)

		assert.Equal(t, "gpt-4", updated.Name)
		assert.True(t, updated.UseTemperature)
		assert.Equal(t, 0.7, updated.Temperature)
	})

	// Step 33: Verify model update
	t.Run("Step_33_VerifyModelUpdate", func(t *testing.T) {
		config, err := handler.GetModelConfig()
		require.NoError(t, err)

		assert.Equal(t, "gpt-4", config.Name)
		assert.True(t, config.UseTemperature)
		assert.Equal(t, 0.7, config.Temperature)
	})

	// Step 34: Update model with empty name (now allowed)
	t.Run("Step_34_UpdateModelWithEmptyName", func(t *testing.T) {
		emptyNameConfig := ModelConfig{
			Name:           "",
			UseTemperature: false,
			Temperature:    0,
		}

		// Empty model name is now allowed
		updated, err := handler.UpdateModelConfig(emptyNameConfig)
		assert.NoError(t, err, "Empty model name should be allowed")
		assert.Equal(t, "", updated.Name)
	})

	// Step 35: Update invalid temp (low)
	t.Run("Step_35_UpdateInvalidTempLow", func(t *testing.T) {
		invalidConfig := ModelConfig{
			Name:           "test-model",
			UseTemperature: true,
			Temperature:    -0.5,
		}

		_, err := handler.UpdateModelConfig(invalidConfig)
		assert.Error(t, err, "Should return error for temperature < 0")
		assert.Contains(t, err.Error(), "temperature")
	})

	// Step 36: Update invalid temp (high)
	t.Run("Step_36_UpdateInvalidTempHigh", func(t *testing.T) {
		invalidConfig := ModelConfig{
			Name:           "test-model",
			UseTemperature: true,
			Temperature:    3.0,
		}

		_, err := handler.UpdateModelConfig(invalidConfig)
		assert.Error(t, err, "Should return error for temperature > 2")
		assert.Contains(t, err.Error(), "temperature")
	})

	// Step 37: Get language config
	t.Run("Step_37_GetLanguageConfig", func(t *testing.T) {
		config, err := handler.GetLanguageConfig()
		require.NoError(t, err)

		assert.Len(t, config.Languages, 15, "Should have 15 default languages")
		assert.Equal(t, "English", config.DefaultInputLanguage)
		assert.Equal(t, "Ukrainian", config.DefaultOutputLanguage)
	})

	// Step 38: Add new language
	t.Run("Step_38_AddNewLanguage", func(t *testing.T) {
		languages, err := handler.AddLanguage("Japanese")
		require.NoError(t, err)

		assert.Len(t, languages, 16, "Should have 16 languages after adding Japanese")
		assert.Contains(t, languages, "Japanese")
	})

	// Step 39: Verify language added
	t.Run("Step_39_VerifyLanguageAdded", func(t *testing.T) {
		config, err := handler.GetLanguageConfig()
		require.NoError(t, err)

		assert.Contains(t, config.Languages, "Japanese")
		assert.Len(t, config.Languages, 16)
	})

	// Step 40: Add duplicate language
	t.Run("Step_40_AddDuplicateLanguage", func(t *testing.T) {
		languages, err := handler.AddLanguage("English")
		assert.NoError(t, err, "Adding duplicate should be idempotent and not error")
		assert.Len(t, languages, 16, "Should still have 16 languages (no duplicate added)")
	})

	// Step 41: Add empty language
	t.Run("Step_41_AddEmptyLanguage", func(t *testing.T) {
		_, err := handler.AddLanguage("")
		assert.Error(t, err, "Should return error for empty language")
		assert.Contains(t, err.Error(), "language cannot be empty")
	})

	// Step 42: Set default input language
	t.Run("Step_42_SetDefaultInputLanguage", func(t *testing.T) {
		err := handler.SetDefaultInputLanguage("Japanese")
		assert.NoError(t, err)
	})

	// Step 43: Set invalid input language
	t.Run("Step_43_SetInvalidInputLanguage", func(t *testing.T) {
		err := handler.SetDefaultInputLanguage("NotInList")
		assert.Error(t, err, "Should return error for language not in supported list")
		assert.Contains(t, err.Error(), "not in supported languages")
	})

	// Step 44: Verify input default changed
	t.Run("Step_44_VerifyInputDefaultChanged", func(t *testing.T) {
		config, err := handler.GetLanguageConfig()
		require.NoError(t, err)

		assert.Equal(t, "Japanese", config.DefaultInputLanguage)
	})

	// Step 45: Set default output language
	t.Run("Step_45_SetDefaultOutputLanguage", func(t *testing.T) {
		err := handler.SetDefaultOutputLanguage("French")
		assert.NoError(t, err)
	})

	// Step 46: Set invalid output language
	t.Run("Step_46_SetInvalidOutputLanguage", func(t *testing.T) {
		err := handler.SetDefaultOutputLanguage("NotInList")
		assert.Error(t, err, "Should return error for language not in supported list")
		assert.Contains(t, err.Error(), "not in supported languages")
	})

	// Step 47: Verify output default changed
	t.Run("Step_47_VerifyOutputDefaultChanged", func(t *testing.T) {
		config, err := handler.GetLanguageConfig()
		require.NoError(t, err)

		assert.Equal(t, "French", config.DefaultOutputLanguage)
	})

	// Step 48: Remove non-default language
	t.Run("Step_48_RemoveNonDefaultLanguage", func(t *testing.T) {
		languages, err := handler.RemoveLanguage("Spanish")
		require.NoError(t, err)

		assert.Len(t, languages, 15, "Should have 15 languages after removing Spanish")
		assert.NotContains(t, languages, "Spanish")
	})

	// Step 49: Verify language removed
	t.Run("Step_49_VerifyLanguageRemoved", func(t *testing.T) {
		config, err := handler.GetLanguageConfig()
		require.NoError(t, err)

		assert.NotContains(t, config.Languages, "Spanish")
		assert.Len(t, config.Languages, 15)
	})

	// Step 50: Remove default input language
	t.Run("Step_50_RemoveDefaultInputLanguage", func(t *testing.T) {
		_, err := handler.RemoveLanguage("Japanese")
		assert.Error(t, err, "Should not allow removing default input language")
		assert.Contains(t, err.Error(), "cannot remove default input language")
	})

	// Step 51: Remove default output language
	t.Run("Step_51_RemoveDefaultOutputLanguage", func(t *testing.T) {
		_, err := handler.RemoveLanguage("French")
		assert.Error(t, err, "Should not allow removing default output language")
		assert.Contains(t, err.Error(), "cannot remove default output language")
	})

	// Step 52: Remove non-existent language
	t.Run("Step_52_RemoveNonExistentLanguage", func(t *testing.T) {
		languages, err := handler.RemoveLanguage("NotInList")
		assert.NoError(t, err, "Removing non-existent language should be idempotent")
		assert.Len(t, languages, 15, "Should still have 15 languages")
	})

	// Step 53: Remove empty language
	t.Run("Step_53_RemoveEmptyLanguage", func(t *testing.T) {
		_, err := handler.RemoveLanguage("")
		assert.Error(t, err, "Should return error for empty language")
		assert.Contains(t, err.Error(), "language cannot be empty")
	})

	// Step 54: Reset settings
	t.Run("Step_54_ResetSettings", func(t *testing.T) {
		settings, err := handler.ResetSettingsToDefault()
		require.NoError(t, err)

		assert.Len(t, settings.AvailableProviderConfigs, 5, "Should reset to 5 default providers")
		assert.Equal(t, "Ollama", settings.CurrentProviderConfig.ProviderName)
	})

	// Step 55: Verify reset persisted
	t.Run("Step_55_VerifyResetPersisted", func(t *testing.T) {
		settings, err := handler.GetSettings()
		require.NoError(t, err)

		assert.Len(t, settings.AvailableProviderConfigs, 5)
		assert.Equal(t, "Ollama", settings.CurrentProviderConfig.ProviderName)
	})

	// Step 56: Verify providers reset
	t.Run("Step_56_VerifyProvidersReset", func(t *testing.T) {
		providers, err := handler.GetAllProviderConfigs()
		require.NoError(t, err)

		assert.Len(t, providers, 5, "Should have 5 default providers after reset")

		providerNames := make(map[string]bool)
		for _, p := range providers {
			providerNames[p.ProviderName] = true
		}

		assert.True(t, providerNames["Ollama"])
		assert.True(t, providerNames["LM Studio"])
		assert.True(t, providerNames["Llama.cpp"])
		assert.True(t, providerNames["OpenRouter.ai"])
		assert.True(t, providerNames["OpenAI"])
	})

	// Step 57: Verify current reset
	t.Run("Step_57_VerifyCurrentReset", func(t *testing.T) {
		provider, err := handler.GetCurrentProviderConfig()
		require.NoError(t, err)

		assert.Equal(t, "Ollama", provider.ProviderName)
		assert.Equal(t, ProviderTypeOllama, provider.ProviderType)
	})

	// Step 58: Verify inference reset
	t.Run("Step_58_VerifyInferenceReset", func(t *testing.T) {
		config, err := handler.GetInferenceBaseConfig()
		require.NoError(t, err)

		assert.Equal(t, 60, config.Timeout)
		assert.Equal(t, 3, config.MaxRetries)
		assert.False(t, config.UseMarkdownForOutput)
	})

	// Step 59: Verify model reset
	t.Run("Step_59_VerifyModelReset", func(t *testing.T) {
		config, err := handler.GetModelConfig()
		require.NoError(t, err)

		assert.Equal(t, "", config.Name)
		assert.True(t, config.UseTemperature)
		assert.Equal(t, 0.5, config.Temperature)
	})

	// Step 60: Verify language reset
	t.Run("Step_60_VerifyLanguageReset", func(t *testing.T) {
		config, err := handler.GetLanguageConfig()
		require.NoError(t, err)

		assert.Len(t, config.Languages, 15, "Should have 15 default languages")
		assert.Equal(t, "English", config.DefaultInputLanguage)
		assert.Equal(t, "Ukrainian", config.DefaultOutputLanguage)
		assert.Contains(t, config.Languages, "English")
		assert.Contains(t, config.Languages, "Ukrainian")
		assert.Contains(t, config.Languages, "Spanish")
		assert.NotContains(t, config.Languages, "Japanese", "Japanese should not be in default languages")
	})
}
