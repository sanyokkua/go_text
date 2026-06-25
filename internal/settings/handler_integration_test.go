package settings

import (
	"os"
	"path/filepath"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/file"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestSettingsHandlerIntegration is a comprehensive integration test for SettingsHandlerAPI.
// It runs 64 sequential test steps that share state to simulate real application behavior.
func TestSettingsHandlerIntegration(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	logger := &TestLogger{}
	fileUtilsService := file.NewFileUtilsService(logger)
	settingsRepo := NewSettingsRepository(logger, fileUtilsService)
	settingsService := NewSettingsService(logger, settingsRepo, fileUtilsService)
	handler := NewSettingsHandler(logger, zerolog.Nop(), settingsService)

	var ollamaID, lmStudioID, newProviderID string

	t.Run("Step_01_InitDefaultSettings", func(t *testing.T) {
		err := settingsService.InitDefaultSettingsIfAbsent()
		require.NoError(t, err, "Failed to initialize default settings")

		expectedPath := filepath.Join(getAppConfigDir(tmpDir), file.SettingsFileName)
		_, err = os.Stat(expectedPath)
		assert.NoError(t, err, "Settings file should exist after initialization")
	})

	t.Run("Step_02_GetAppMetadata", func(t *testing.T) {
		res := handler.GetAppSettingsMetadata()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.NotEmpty(t, res.Data.AuthSchemes, "AuthSchemes should not be empty")
		assert.NotEmpty(t, res.Data.ProviderKinds, "ProviderKinds should not be empty")
		assert.NotEmpty(t, res.Data.SettingsFolder, "SettingsFolder should not be empty")
		assert.NotEmpty(t, res.Data.DatabaseFile, "DatabaseFile should not be empty")
		assert.Contains(t, res.Data.AuthSchemes, string(AuthTypeNone))
		assert.Contains(t, res.Data.AuthSchemes, string(AuthTypeApiKey))
		assert.Contains(t, res.Data.AuthSchemes, string(AuthTypeBearer))
		assert.Contains(t, res.Data.ProviderKinds, string(ProviderTypeOpenAICompatible))
		assert.Contains(t, res.Data.ProviderKinds, string(ProviderTypeOllama))
	})

	t.Run("Step_03_GetInitialSettings", func(t *testing.T) {
		res := handler.GetSettings()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Len(t, res.Data.AvailableProviderConfigs, 5, "Should have 5 default providers")
		assert.Equal(t, "Ollama", res.Data.CurrentProviderConfig.Name)
		assert.Equal(t, 60, res.Data.InferenceBaseConfig.Timeout)
		assert.Equal(t, 3, res.Data.InferenceBaseConfig.MaxRetries)
		assert.Equal(t, 0.5, res.Data.ModelConfig.Temperature)
		assert.True(t, res.Data.ModelConfig.UseTemperature)
		assert.Len(t, res.Data.LanguageConfig.Languages, 15)
		assert.Equal(t, "English", res.Data.LanguageConfig.DefaultInputLanguage)
		assert.Equal(t, "Ukrainian", res.Data.LanguageConfig.DefaultOutputLanguage)
	})

	t.Run("Step_04_GetAllProviders", func(t *testing.T) {
		res := handler.GetAllProviderConfigs()
		require.Nil(t, res.Error)
		assert.Len(t, res.Data, 5, "Should return 5 default providers")

		for _, p := range res.Data {
			switch p.Name {
			case "Ollama":
				ollamaID = p.ID
			case "LM Studio":
				lmStudioID = p.ID
			}
		}

		assert.NotEmpty(t, ollamaID, "Ollama provider should exist")
		assert.NotEmpty(t, lmStudioID, "LM Studio provider should exist")
	})

	t.Run("Step_05_GetCurrentProvider", func(t *testing.T) {
		res := handler.GetCurrentProviderConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "Ollama", res.Data.Name)
		assert.Equal(t, ollamaID, res.Data.ID)
	})

	t.Run("Step_06_GetProviderByID", func(t *testing.T) {
		res := handler.GetProviderConfig(ollamaID)
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "Ollama", res.Data.Name)
		assert.Equal(t, string(ProviderTypeOllama), res.Data.Kind)
		assert.Equal(t, "http://127.0.0.1:11434/", res.Data.BaseURL)
	})

	t.Run("Step_07_GetProviderWithEmptyID", func(t *testing.T) {
		res := handler.GetProviderConfig("")
		assert.NotNil(t, res.Error, "Should return error for empty provider ID")
	})

	t.Run("Step_08_GetProviderWithNonExistentID", func(t *testing.T) {
		res := handler.GetProviderConfig("invalid-id-12345")
		assert.NotNil(t, res.Error, "Should return error for non-existent provider ID")
	})

	t.Run("Step_09_UpdateExistingProvider", func(t *testing.T) {
		getRes := handler.GetProviderConfig(ollamaID)
		require.Nil(t, getRes.Error)
		require.NotNil(t, getRes.Data)

		updated := *getRes.Data
		updated.BaseURL = "http://localhost:11434/"
		updated.UseCustomModels = true
		updated.CustomModels = []string{"llama2", "mistral"}

		updateRes := handler.UpdateProviderConfig(updated)
		require.Nil(t, updateRes.Error)
		require.NotNil(t, updateRes.Data)

		assert.Equal(t, "http://localhost:11434/", updateRes.Data.BaseURL)
		assert.True(t, updateRes.Data.UseCustomModels)
		assert.Len(t, updateRes.Data.CustomModels, 2)
	})

	t.Run("Step_10_UpdateProviderWithEmptyID", func(t *testing.T) {
		invalidProvider := apperr.ProviderConfig{
			ID:             "",
			Name:           "Test",
			Kind:           string(ProviderTypeOllama),
			BaseURL:        "http://localhost:8080/",
			CompletionPath: "v1/chat/completions",
			AuthScheme:     string(AuthTypeNone),
		}

		res := handler.UpdateProviderConfig(invalidProvider)
		assert.NotNil(t, res.Error, "Should return error for empty provider ID")
	})

	t.Run("Step_11_VerifyUpdatePersisted", func(t *testing.T) {
		res := handler.GetProviderConfig(ollamaID)
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "http://localhost:11434/", res.Data.BaseURL)
		assert.True(t, res.Data.UseCustomModels)
		assert.Len(t, res.Data.CustomModels, 2)
		assert.Contains(t, res.Data.CustomModels, "llama2")
		assert.Contains(t, res.Data.CustomModels, "mistral")
	})

	t.Run("Step_12_CreateNewProvider", func(t *testing.T) {
		newProvider := apperr.ProviderConfig{
			Name:            "Custom Provider",
			Kind:            string(ProviderTypeOpenAICompatible),
			BaseURL:         "http://localhost:5000/",
			ModelsPath:      "api/models",
			CompletionPath:  "api/completions",
			AuthScheme:      string(AuthTypeApiKey),
			APIKeyEnvVar:    "CUSTOM_PROVIDER_API_KEY", // env-var NAME only — never the secret value
			UseCustomModels: false,
		}

		res := handler.CreateProviderConfig(newProvider)
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.NotEmpty(t, res.Data.ID, "Provider ID should be generated")
		assert.Equal(t, "Custom Provider", res.Data.Name)
		newProviderID = res.Data.ID
	})

	t.Run("Step_13_VerifyCreatePersisted", func(t *testing.T) {
		res := handler.GetAllProviderConfigs()
		require.Nil(t, res.Error)
		assert.Len(t, res.Data, 6, "Should now have 6 providers")

		found := false
		for _, p := range res.Data {
			if p.ID == newProviderID {
				found = true
				assert.Equal(t, "Custom Provider", p.Name)
			}
		}
		assert.True(t, found, "New provider should exist in the list")
	})

	t.Run("Step_14_CreateDuplicateName", func(t *testing.T) {
		duplicateProvider := apperr.ProviderConfig{
			Name:           "Custom Provider",
			Kind:           string(ProviderTypeOllama),
			BaseURL:        "http://localhost:9000/",
			ModelsPath:     "v1/models",
			CompletionPath: "v1/chat/completions",
			AuthScheme:     string(AuthTypeNone),
		}

		res := handler.CreateProviderConfig(duplicateProvider)
		assert.NotNil(t, res.Error, "Should return error for duplicate provider name")
	})

	t.Run("Step_15_CreateInvalidProvider", func(t *testing.T) {
		invalidProvider := apperr.ProviderConfig{
			Name:           "Invalid Provider",
			Kind:           string(ProviderTypeOllama),
			BaseURL:        "not-a-valid-url",
			CompletionPath: "v1/chat/completions",
			AuthScheme:     string(AuthTypeNone),
		}

		res := handler.CreateProviderConfig(invalidProvider)
		assert.NotNil(t, res.Error, "Should return error for invalid base URL")
	})

	t.Run("Step_16_SetNewCurrentProvider", func(t *testing.T) {
		res := handler.SetAsCurrentProviderConfig(newProviderID)
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, newProviderID, res.Data.ID)
		assert.Equal(t, "Custom Provider", res.Data.Name)
	})

	t.Run("Step_17_SetCurrentWithEmptyID", func(t *testing.T) {
		res := handler.SetAsCurrentProviderConfig("")
		assert.NotNil(t, res.Error, "Should return error for empty provider ID")
	})

	t.Run("Step_18_SetCurrentWithInvalidID", func(t *testing.T) {
		res := handler.SetAsCurrentProviderConfig("invalid-id-12345")
		assert.NotNil(t, res.Error, "Should return error for non-existent provider ID")
	})

	t.Run("Step_19_VerifyCurrentChanged", func(t *testing.T) {
		res := handler.GetCurrentProviderConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, newProviderID, res.Data.ID)
		assert.Equal(t, "Custom Provider", res.Data.Name)
	})

	t.Run("Step_20_DeleteNonCurrentProvider", func(t *testing.T) {
		res := handler.DeleteProviderConfig(lmStudioID)
		assert.Nil(t, res.Error, "Should successfully delete non-current provider")
	})

	t.Run("Step_21_DeleteCurrentProvider", func(t *testing.T) {
		res := handler.DeleteProviderConfig(newProviderID)
		assert.NotNil(t, res.Error, "Should not allow deleting current provider")
	})

	t.Run("Step_22_DeleteWithEmptyID", func(t *testing.T) {
		res := handler.DeleteProviderConfig("")
		assert.NotNil(t, res.Error, "Should return error for empty provider ID")
	})

	t.Run("Step_23_DeleteNonExistent", func(t *testing.T) {
		res := handler.DeleteProviderConfig("invalid-id-12345")
		assert.NotNil(t, res.Error, "Should return error for non-existent provider ID")
	})

	t.Run("Step_24_GetInferenceConfig", func(t *testing.T) {
		res := handler.GetInferenceBaseConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, 60, res.Data.Timeout)
		assert.Equal(t, 3, res.Data.MaxRetries)
		assert.False(t, res.Data.UseMarkdownForOutput)
	})

	t.Run("Step_25_UpdateInferenceConfig", func(t *testing.T) {
		newConfig := apperr.InferenceBaseConfig{
			Timeout:              120,
			MaxRetries:           5,
			UseMarkdownForOutput: true,
		}

		res := handler.UpdateInferenceBaseConfig(newConfig)
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, 120, res.Data.Timeout)
		assert.Equal(t, 5, res.Data.MaxRetries)
		assert.True(t, res.Data.UseMarkdownForOutput)
	})

	t.Run("Step_26_VerifyInferenceUpdate", func(t *testing.T) {
		res := handler.GetInferenceBaseConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, 120, res.Data.Timeout)
		assert.Equal(t, 5, res.Data.MaxRetries)
		assert.True(t, res.Data.UseMarkdownForOutput)
	})

	t.Run("Step_27_UpdateInvalidTimeoutLow", func(t *testing.T) {
		invalidConfig := apperr.InferenceBaseConfig{Timeout: 0, MaxRetries: 3}
		res := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.NotNil(t, res.Error, "Should return error for timeout = 0")
	})

	t.Run("Step_28_UpdateInvalidTimeoutHigh", func(t *testing.T) {
		invalidConfig := apperr.InferenceBaseConfig{Timeout: 700, MaxRetries: 3}
		res := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.NotNil(t, res.Error, "Should return error for timeout > 600")
	})

	t.Run("Step_29_UpdateInvalidRetriesNegative", func(t *testing.T) {
		invalidConfig := apperr.InferenceBaseConfig{Timeout: 60, MaxRetries: -1}
		res := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.NotNil(t, res.Error, "Should return error for negative retries")
	})

	t.Run("Step_30_UpdateInvalidRetriesHigh", func(t *testing.T) {
		invalidConfig := apperr.InferenceBaseConfig{Timeout: 60, MaxRetries: 15}
		res := handler.UpdateInferenceBaseConfig(invalidConfig)
		assert.NotNil(t, res.Error, "Should return error for retries > 10")
	})

	t.Run("Step_31_GetModelConfig", func(t *testing.T) {
		res := handler.GetModelConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.True(t, res.Data.UseTemperature)
		assert.Equal(t, 0.5, res.Data.Temperature)
	})

	t.Run("Step_32_UpdateModelConfig", func(t *testing.T) {
		newConfig := apperr.ModelConfig{
			Name:           "gpt-4",
			UseTemperature: true,
			Temperature:    0.7,
		}

		res := handler.UpdateModelConfig(newConfig)
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "gpt-4", res.Data.Name)
		assert.True(t, res.Data.UseTemperature)
		assert.Equal(t, 0.7, res.Data.Temperature)
	})

	t.Run("Step_33_VerifyModelUpdate", func(t *testing.T) {
		res := handler.GetModelConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "gpt-4", res.Data.Name)
		assert.True(t, res.Data.UseTemperature)
		assert.Equal(t, 0.7, res.Data.Temperature)
	})

	t.Run("Step_34_UpdateModelWithEmptyName", func(t *testing.T) {
		emptyNameConfig := apperr.ModelConfig{Name: "", UseTemperature: false, Temperature: 0}
		res := handler.UpdateModelConfig(emptyNameConfig)
		assert.Nil(t, res.Error, "Empty model name should be allowed")
		require.NotNil(t, res.Data)
		assert.Equal(t, "", res.Data.Name)
	})

	t.Run("Step_35_UpdateInvalidTempLow", func(t *testing.T) {
		invalidConfig := apperr.ModelConfig{Name: "test-model", UseTemperature: true, Temperature: -0.5}
		res := handler.UpdateModelConfig(invalidConfig)
		assert.NotNil(t, res.Error, "Should return error for temperature < 0")
	})

	t.Run("Step_36_UpdateInvalidTempHigh", func(t *testing.T) {
		invalidConfig := apperr.ModelConfig{Name: "test-model", UseTemperature: true, Temperature: 3.0}
		res := handler.UpdateModelConfig(invalidConfig)
		assert.NotNil(t, res.Error, "Should return error for temperature > 2")
	})

	t.Run("Step_37_GetLanguageConfig", func(t *testing.T) {
		res := handler.GetLanguageConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Len(t, res.Data.Languages, 15, "Should have 15 default languages")
		assert.Equal(t, "English", res.Data.DefaultInputLanguage)
		assert.Equal(t, "Ukrainian", res.Data.DefaultOutputLanguage)
	})

	t.Run("Step_38_AddNewLanguage", func(t *testing.T) {
		res := handler.AddLanguage("Japanese")
		require.Nil(t, res.Error)

		assert.Len(t, res.Data, 16, "Should have 16 languages after adding Japanese")
		assert.Contains(t, res.Data, "Japanese")
	})

	t.Run("Step_39_VerifyLanguageAdded", func(t *testing.T) {
		res := handler.GetLanguageConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Contains(t, res.Data.Languages, "Japanese")
		assert.Len(t, res.Data.Languages, 16)
	})

	t.Run("Step_40_AddDuplicateLanguage", func(t *testing.T) {
		res := handler.AddLanguage("English")
		assert.Nil(t, res.Error, "Adding duplicate should be idempotent and not error")
		assert.Len(t, res.Data, 16, "Should still have 16 languages (no duplicate added)")
	})

	t.Run("Step_41_AddEmptyLanguage", func(t *testing.T) {
		res := handler.AddLanguage("")
		assert.NotNil(t, res.Error, "Should return error for empty language")
	})

	t.Run("Step_42_SetDefaultInputLanguage", func(t *testing.T) {
		res := handler.SetDefaultInputLanguage("Japanese")
		assert.Nil(t, res.Error)
	})

	t.Run("Step_43_SetInvalidInputLanguage", func(t *testing.T) {
		res := handler.SetDefaultInputLanguage("NotInList")
		assert.NotNil(t, res.Error, "Should return error for language not in supported list")
	})

	t.Run("Step_44_VerifyInputDefaultChanged", func(t *testing.T) {
		res := handler.GetLanguageConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "Japanese", res.Data.DefaultInputLanguage)
	})

	t.Run("Step_45_SetDefaultOutputLanguage", func(t *testing.T) {
		res := handler.SetDefaultOutputLanguage("French")
		assert.Nil(t, res.Error)
	})

	t.Run("Step_46_SetInvalidOutputLanguage", func(t *testing.T) {
		res := handler.SetDefaultOutputLanguage("NotInList")
		assert.NotNil(t, res.Error, "Should return error for language not in supported list")
	})

	t.Run("Step_47_VerifyOutputDefaultChanged", func(t *testing.T) {
		res := handler.GetLanguageConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "French", res.Data.DefaultOutputLanguage)
	})

	t.Run("Step_48_RemoveNonDefaultLanguage", func(t *testing.T) {
		res := handler.RemoveLanguage("Spanish")
		require.Nil(t, res.Error)

		assert.Len(t, res.Data, 15, "Should have 15 languages after removing Spanish")
		assert.NotContains(t, res.Data, "Spanish")
	})

	t.Run("Step_49_VerifyLanguageRemoved", func(t *testing.T) {
		res := handler.GetLanguageConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.NotContains(t, res.Data.Languages, "Spanish")
		assert.Len(t, res.Data.Languages, 15)
	})

	t.Run("Step_50_RemoveDefaultInputLanguage", func(t *testing.T) {
		res := handler.RemoveLanguage("Japanese")
		assert.NotNil(t, res.Error, "Should not allow removing default input language")
	})

	t.Run("Step_51_RemoveDefaultOutputLanguage", func(t *testing.T) {
		res := handler.RemoveLanguage("French")
		assert.NotNil(t, res.Error, "Should not allow removing default output language")
	})

	t.Run("Step_52_RemoveNonExistentLanguage", func(t *testing.T) {
		res := handler.RemoveLanguage("NotInList")
		assert.Nil(t, res.Error, "Removing non-existent language should be idempotent")
		assert.Len(t, res.Data, 15, "Should still have 15 languages")
	})

	t.Run("Step_53_RemoveEmptyLanguage", func(t *testing.T) {
		res := handler.RemoveLanguage("")
		assert.NotNil(t, res.Error, "Should return error for empty language")
	})

	t.Run("Step_54_ResetSettings", func(t *testing.T) {
		res := handler.ResetSettingsToDefault()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Len(t, res.Data.AvailableProviderConfigs, 5, "Should reset to 5 default providers")
		assert.Equal(t, "Ollama", res.Data.CurrentProviderConfig.Name)
	})

	t.Run("Step_55_VerifyResetPersisted", func(t *testing.T) {
		res := handler.GetSettings()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Len(t, res.Data.AvailableProviderConfigs, 5)
		assert.Equal(t, "Ollama", res.Data.CurrentProviderConfig.Name)
	})

	t.Run("Step_56_VerifyProvidersReset", func(t *testing.T) {
		res := handler.GetAllProviderConfigs()
		require.Nil(t, res.Error)
		assert.Len(t, res.Data, 5, "Should have 5 default providers after reset")

		providerNames := make(map[string]bool)
		for _, p := range res.Data {
			providerNames[p.Name] = true
		}

		assert.True(t, providerNames["Ollama"])
		assert.True(t, providerNames["LM Studio"])
		assert.True(t, providerNames["Llama.cpp"])
		assert.True(t, providerNames["OpenRouter.ai"])
		assert.True(t, providerNames["OpenAI"])
	})

	t.Run("Step_57_VerifyCurrentReset", func(t *testing.T) {
		res := handler.GetCurrentProviderConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "Ollama", res.Data.Name)
		assert.Equal(t, string(ProviderTypeOllama), res.Data.Kind)
	})

	t.Run("Step_58_VerifyInferenceReset", func(t *testing.T) {
		res := handler.GetInferenceBaseConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, 60, res.Data.Timeout)
		assert.Equal(t, 3, res.Data.MaxRetries)
		assert.False(t, res.Data.UseMarkdownForOutput)
	})

	t.Run("Step_59_VerifyModelReset", func(t *testing.T) {
		res := handler.GetModelConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Equal(t, "", res.Data.Name)
		assert.True(t, res.Data.UseTemperature)
		assert.Equal(t, 0.5, res.Data.Temperature)
	})

	t.Run("Step_60_VerifyLanguageReset", func(t *testing.T) {
		res := handler.GetLanguageConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.Len(t, res.Data.Languages, 15, "Should have 15 default languages")
		assert.Equal(t, "English", res.Data.DefaultInputLanguage)
		assert.Equal(t, "Ukrainian", res.Data.DefaultOutputLanguage)
		assert.Contains(t, res.Data.Languages, "English")
		assert.Contains(t, res.Data.Languages, "Ukrainian")
		assert.Contains(t, res.Data.Languages, "Spanish")
		assert.NotContains(t, res.Data.Languages, "Japanese", "Japanese should not be in default languages")
	})

	t.Run("Step_61_GetDefaultAppBehaviorConfig", func(t *testing.T) {
		res := handler.GetAppBehaviorConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.False(t, res.Data.EnableTaskLogging, "EnableTaskLogging should default to false")
	})

	t.Run("Step_62_UpdateAppBehaviorConfig", func(t *testing.T) {
		newConfig := apperr.AppBehaviorConfig{EnableTaskLogging: true}

		res := handler.UpdateAppBehaviorConfig(newConfig)
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.True(t, res.Data.EnableTaskLogging)
	})

	t.Run("Step_63_VerifyAppBehaviorConfigPersisted", func(t *testing.T) {
		res := handler.GetAppBehaviorConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.True(t, res.Data.EnableTaskLogging)
	})

	t.Run("Step_64_VerifyAppBehaviorConfigReset", func(t *testing.T) {
		resetRes := handler.ResetSettingsToDefault()
		require.Nil(t, resetRes.Error)

		res := handler.GetAppBehaviorConfig()
		require.Nil(t, res.Error)
		require.NotNil(t, res.Data)

		assert.False(t, res.Data.EnableTaskLogging, "EnableTaskLogging should be false after reset")
	})

	_ = tmpDir
}
