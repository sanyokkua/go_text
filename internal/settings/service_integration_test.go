package settings

import (
	"testing"

	"go_text/internal/file"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

// Test SettingsService Constructor
func TestSettingsService_Constructor(t *testing.T) {
	tests := []struct {
		name         string
		logger       logger.Logger
		repo         SettingsRepositoryAPI
		fileUtils    file.FileUtilsServiceAPI
		expectPanic  bool
		panicMessage string
	}{
		{
			name:        "success_with_valid_dependencies",
			logger:      &TestLogger{},
			repo:        &SettingsRepository{},
			fileUtils:   &file.FileUtilsService{},
			expectPanic: false,
		},
		{
			name:         "panic_when_logger_is_nil",
			logger:       nil,
			repo:         &SettingsRepository{},
			fileUtils:    &file.FileUtilsService{},
			expectPanic:  true,
			panicMessage: "logger cannot be nil",
		},
		{
			name:         "panic_when_repo_is_nil",
			logger:       &TestLogger{},
			repo:         nil,
			fileUtils:    &file.FileUtilsService{},
			expectPanic:  true,
			panicMessage: "settingsRepo cannot be nil",
		},
		{
			name:         "panic_when_fileUtils_is_nil",
			logger:       &TestLogger{},
			repo:         &SettingsRepository{},
			fileUtils:    nil,
			expectPanic:  true,
			panicMessage: "fileUtils cannot be nil",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectPanic {
				assert.PanicsWithValue(t, tt.panicMessage, func() {
					NewSettingsService(tt.logger, tt.repo, tt.fileUtils)
				})
			} else {
				assert.NotPanics(t, func() {
					service := NewSettingsService(tt.logger, tt.repo, tt.fileUtils)
					assert.NotNil(t, service)
				})
			}
		})
	}
}

// Test helper functions for creating test data
func createTestSettingsService(t *testing.T) SettingsServiceAPI {
	logger := &TestLogger{}
	fileUtils := file.NewFileUtilsService(logger)
	repo := NewSettingsRepository(logger, fileUtils)

	return NewSettingsService(logger, repo, fileUtils)
}

// Test Core Service Methods
func TestSettingsService_GetAppSettingsMetadata(t *testing.T) {
	service := createTestSettingsService(t)

	metadata, err := service.GetAppSettingsMetadata()

	assert.NoError(t, err)
	assert.NotNil(t, metadata)
	assert.NotEmpty(t, metadata.AuthTypes)
	assert.NotEmpty(t, metadata.ProviderTypes)
	assert.NotEmpty(t, metadata.SettingsFolder)
	assert.NotEmpty(t, metadata.SettingsFile)
	assert.Contains(t, metadata.SettingsFolder, "GoTextApp")
	assert.Contains(t, metadata.SettingsFile, "settings_v2.json")
}

func TestSettingsService_ResetSettingsToDefault(t *testing.T) {
	service := createTestSettingsService(t)

	settings, err := service.ResetSettingsToDefault()

	assert.NoError(t, err)
	assert.NotNil(t, settings)
	assert.Equal(t, DefaultSetting, *settings)
}

func TestSettingsService_InitDefaultSettingsIfAbsent(t *testing.T) {
	service := createTestSettingsService(t)

	err := service.InitDefaultSettingsIfAbsent()

	assert.NoError(t, err)
}

// Test Getter Methods
func TestSettingsService_GetAllProviderConfigs(t *testing.T) {
	service := createTestSettingsService(t)

	configs, err := service.GetAllProviderConfigs()

	assert.NoError(t, err)
	assert.NotNil(t, configs)
	assert.True(t, len(configs) > 0)

	// Verify we get the default provider configs
	foundOllama := false
	foundLMStudio := false

	for _, config := range configs {
		if config.ProviderName == "Ollama" {
			foundOllama = true
		}
		if config.ProviderName == "LM Studio" {
			foundLMStudio = true
		}
	}

	assert.True(t, foundOllama, "Should contain Ollama config")
	assert.True(t, foundLMStudio, "Should contain LM Studio config")
}

func TestSettingsService_GetCurrentProviderConfig(t *testing.T) {
	service := createTestSettingsService(t)

	config, err := service.GetCurrentProviderConfig()

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.NotEmpty(t, config.ProviderID)
	assert.NotEmpty(t, config.ProviderName)
	assert.NotEmpty(t, config.BaseUrl)
	assert.NotEmpty(t, config.CompletionEndpoint)
}

func TestSettingsService_GetInferenceBaseConfig(t *testing.T) {
	service := createTestSettingsService(t)

	config, err := service.GetInferenceBaseConfig()

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.True(t, config.Timeout > 0)
	assert.True(t, config.MaxRetries >= 0)
}

func TestSettingsService_GetModelConfig(t *testing.T) {
	service := createTestSettingsService(t)

	config, err := service.GetModelConfig()

	assert.NoError(t, err)
	assert.NotNil(t, config)
	// Note: Default model name can be empty, so we just check that config is not nil
}

func TestSettingsService_GetLanguageConfig(t *testing.T) {
	service := createTestSettingsService(t)

	config, err := service.GetLanguageConfig()

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.True(t, len(config.Languages) > 0)
	assert.NotEmpty(t, config.DefaultInputLanguage)
	assert.NotEmpty(t, config.DefaultOutputLanguage)
}

// Test Configuration Update Methods
func TestSettingsService_UpdateInferenceBaseConfig(t *testing.T) {
	service := createTestSettingsService(t)

	// First set a valid model name to pass validation
	modelConfig := &ModelConfig{
		Name:           "test-model",
		UseTemperature: true,
		Temperature:    0.5,
	}
	service.UpdateModelConfig(modelConfig)

	// Test valid update
	newConfig := &InferenceBaseConfig{
		Timeout:              120,
		MaxRetries:           5,
		UseMarkdownForOutput: true,
	}

	updatedConfig, err := service.UpdateInferenceBaseConfig(newConfig)

	assert.NoError(t, err)
	assert.NotNil(t, updatedConfig)
	assert.Equal(t, 120, updatedConfig.Timeout)
	assert.Equal(t, 5, updatedConfig.MaxRetries)
	assert.True(t, updatedConfig.UseMarkdownForOutput)

	// Test invalid timeout range
	invalidConfig := &InferenceBaseConfig{
		Timeout:              0,
		MaxRetries:           5,
		UseMarkdownForOutput: true,
	}

	_, err = service.UpdateInferenceBaseConfig(invalidConfig)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "timeout must be between 1 and 600 seconds")

	// Test invalid max retries range
	invalidConfig2 := &InferenceBaseConfig{
		Timeout:              60,
		MaxRetries:           11,
		UseMarkdownForOutput: true,
	}

	_, err = service.UpdateInferenceBaseConfig(invalidConfig2)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "max retries must be between 0 and 10")
}

func TestSettingsService_UpdateModelConfig(t *testing.T) {
	service := createTestSettingsService(t)

	// Test valid update
	newConfig := &ModelConfig{
		Name:           "updated-test-model",
		UseTemperature: true,
		Temperature:    0.7,
	}

	updatedConfig, err := service.UpdateModelConfig(newConfig)

	assert.NoError(t, err)
	assert.NotNil(t, updatedConfig)
	assert.Equal(t, "updated-test-model", updatedConfig.Name)
	assert.Equal(t, 0.7, updatedConfig.Temperature)

	// Test empty model name
	validConfigWithEmptyModelName := &ModelConfig{
		Name:           "",
		UseTemperature: true,
		Temperature:    0.7,
	}

	_, err = service.UpdateModelConfig(validConfigWithEmptyModelName)

	assert.NoError(t, err)

	// Test invalid temperature range
	invalidConfig2 := &ModelConfig{
		Name:           "test-model",
		UseTemperature: true,
		Temperature:    3.0,
	}

	_, err = service.UpdateModelConfig(invalidConfig2)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "temperature must be between 0 and 2 when enabled")
}

// Test Language Management Methods
func TestSettingsService_AddLanguage(t *testing.T) {
	service := createTestSettingsService(t)

	// Test adding a new language
	languages, err := service.AddLanguage("German")

	assert.NoError(t, err)
	assert.NotNil(t, languages)
	assert.Contains(t, languages, "German")

	// Test adding an existing language (should succeed but not duplicate)
	originalCount := len(languages)
	languages2, err := service.AddLanguage("English")

	assert.NoError(t, err)
	assert.NotNil(t, languages2)
	assert.Equal(t, originalCount, len(languages2)) // Should not add duplicate

	// Test empty language
	_, err = service.AddLanguage("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "language cannot be empty")
}

func TestSettingsService_RemoveLanguage(t *testing.T) {
	service := createTestSettingsService(t)

	// First add a language we can remove
	_, err := service.AddLanguage("German")
	require.NoError(t, err)

	// Test removing a language
	languages, err := service.RemoveLanguage("German")

	assert.NoError(t, err)
	assert.NotNil(t, languages)
	assert.NotContains(t, languages, "German")

	// Test removing a non-existent language (should succeed gracefully)
	languages2, err := service.RemoveLanguage("NonExistent")

	assert.NoError(t, err)
	assert.NotNil(t, languages2)

	// Test empty language
	_, err = service.RemoveLanguage("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "language cannot be empty")

	// Test removing default input language
	_, err = service.RemoveLanguage("English")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot remove default input language")

	// Test removing default output language
	_, err = service.RemoveLanguage("Ukrainian")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot remove default output language")
}

func TestSettingsService_SetDefaultInputLanguage(t *testing.T) {
	service := createTestSettingsService(t)

	// Test setting a valid language
	err := service.SetDefaultInputLanguage("French")

	assert.NoError(t, err)

	// Verify it was actually set
	config, err := service.GetLanguageConfig()
	require.NoError(t, err)
	assert.Equal(t, "French", config.DefaultInputLanguage)

	// Test empty language
	err = service.SetDefaultInputLanguage("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "language cannot be empty")

	// Test non-existent language
	err = service.SetDefaultInputLanguage("NonExistent")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not in supported languages")
}

func TestSettingsService_SetDefaultOutputLanguage(t *testing.T) {
	service := createTestSettingsService(t)

	// Test setting a valid language
	err := service.SetDefaultOutputLanguage("French")

	assert.NoError(t, err)

	// Verify it was actually set
	config, err := service.GetLanguageConfig()
	require.NoError(t, err)
	assert.Equal(t, "French", config.DefaultOutputLanguage)

	// Test empty language
	err = service.SetDefaultOutputLanguage("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "language cannot be empty")

	// Test non-existent language
	err = service.SetDefaultOutputLanguage("NonExistent")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not in supported languages")
}

// Test Provider Config CRUD Operations
func TestSettingsService_GetSettings(t *testing.T) {
	service := createTestSettingsService(t)

	settings, err := service.GetSettings()

	assert.NoError(t, err)
	assert.NotNil(t, settings)
	assert.NotEmpty(t, settings.AvailableProviderConfigs)
	assert.NotEmpty(t, settings.CurrentProviderConfig.ProviderName)
	assert.Empty(t, settings.ModelConfig.Name)
	assert.NotEmpty(t, settings.LanguageConfig.Languages)
}

func TestSettingsService_GetProviderConfig(t *testing.T) {
	service := createTestSettingsService(t)

	// Get all configs first to find a valid ID
	configs, err := service.GetAllProviderConfigs()
	require.NoError(t, err)
	require.True(t, len(configs) > 0)

	validID := configs[0].ProviderID

	// Test getting a valid provider config
	config, err := service.GetProviderConfig(validID)

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, validID, config.ProviderID)
	assert.NotEmpty(t, config.ProviderName)

	// Test empty provider ID
	_, err = service.GetProviderConfig("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider ID cannot be empty")

	// Test non-existent provider ID
	_, err = service.GetProviderConfig("non-existent-id")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider not found with ID")
}

func TestSettingsService_CreateProviderConfig(t *testing.T) {
	service := createTestSettingsService(t)

	// Create a new valid provider config
	newConfig := &ProviderConfig{
		ProviderName:        "Test Provider",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:9090/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	// Test creating a valid provider
	createdConfig, err := service.CreateProviderConfig(newConfig)

	assert.NoError(t, err)
	assert.NotNil(t, createdConfig)
	assert.NotEmpty(t, createdConfig.ProviderID)
	assert.Equal(t, "Test Provider", createdConfig.ProviderName)

	// Test creating a duplicate provider name
	duplicateConfig := &ProviderConfig{
		ProviderName:        "Test Provider", // Same name
		ProviderType:        ProviderTypeOllama,
		BaseUrl:             "http://localhost:9091/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token-2",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	_, err = service.CreateProviderConfig(duplicateConfig)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider name \"Test Provider\" already exists")

	// Test creating with invalid config (nil)
	_, err = service.CreateProviderConfig(nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider config is nil")
}

func TestSettingsService_UpdateProviderConfig(t *testing.T) {
	service := createTestSettingsService(t)

	// First create a provider to update
	newConfig := &ProviderConfig{
		ProviderName:        "Test Provider To Update",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:9092/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	createdConfig, err := service.CreateProviderConfig(newConfig)
	require.NoError(t, err)
	require.NotNil(t, createdConfig)

	// Update the provider
	updatedConfig := &ProviderConfig{
		ProviderID:          createdConfig.ProviderID,
		ProviderName:        "Updated Test Provider",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:9093/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "updated-test-token",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	// Test updating with valid config
	result, err := service.UpdateProviderConfig(updatedConfig)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Updated Test Provider", result.ProviderName)
	assert.Equal(t, "http://localhost:9093/", result.BaseUrl)

	// Test updating with empty provider ID
	invalidConfig := &ProviderConfig{
		ProviderID:          "",
		ProviderName:        "Should Fail",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:9094/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	_, err = service.UpdateProviderConfig(invalidConfig)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider ID cannot be empty")

	// Test updating non-existent provider
	nonExistentConfig := &ProviderConfig{
		ProviderID:          "non-existent-id",
		ProviderName:        "Should Fail",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:9095/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	_, err = service.UpdateProviderConfig(nonExistentConfig)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider not found with ID")
}

func TestSettingsService_DeleteProviderConfig(t *testing.T) {
	service := createTestSettingsService(t)

	// First create a provider to delete
	newConfig := &ProviderConfig{
		ProviderName:        "Test Provider To Delete",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:9096/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	createdConfig, err := service.CreateProviderConfig(newConfig)
	require.NoError(t, err)
	require.NotNil(t, createdConfig)

	providerID := createdConfig.ProviderID

	// Test deleting a valid provider
	err = service.DeleteProviderConfig(providerID)

	assert.NoError(t, err)

	// Verify it was actually deleted
	_, err = service.GetProviderConfig(providerID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider not found with ID")

	// Test empty provider ID
	err = service.DeleteProviderConfig("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider ID cannot be empty")

	// Test deleting non-existent provider
	err = service.DeleteProviderConfig("non-existent-id")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider not found with ID")
}

func TestSettingsService_SetAsCurrentProviderConfig(t *testing.T) {
	service := createTestSettingsService(t)

	// First create a provider to set as current
	newConfig := &ProviderConfig{
		ProviderName:        "Test Provider To Set Current",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:9097/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token",
		UseAuthTokenFromEnv: false,
		UseCustomModels:     false,
	}

	createdConfig, err := service.CreateProviderConfig(newConfig)
	require.NoError(t, err)
	require.NotNil(t, createdConfig)

	providerID := createdConfig.ProviderID

	// Test setting a valid provider as current
	currentConfig, err := service.SetAsCurrentProviderConfig(providerID)

	assert.NoError(t, err)
	assert.NotNil(t, currentConfig)
	assert.Equal(t, providerID, currentConfig.ProviderID)

	// Verify it was actually set as current
	currentProvider, err := service.GetCurrentProviderConfig()
	require.NoError(t, err)
	assert.Equal(t, providerID, currentProvider.ProviderID)

	// Test empty provider ID
	_, err = service.SetAsCurrentProviderConfig("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider ID cannot be empty")

	// Test non-existent provider ID
	_, err = service.SetAsCurrentProviderConfig("non-existent-id")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider not found with ID")
}
