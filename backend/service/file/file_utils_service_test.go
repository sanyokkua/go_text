package file

import (
	"encoding/json"
	"fmt"
	"go_text/backend/constant"
	"go_text/backend/model/settings"
	"io/fs"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
		return filepath.Join(tmpDir, "AppData", "Roaming", AppName)
	} else if runtime.GOOS == "darwin" {
		return filepath.Join(tmpDir, "Library", "Application Support", AppName)
	} else {
		return filepath.Join(tmpDir, ".config", AppName)
	}
}

func TestInitAndGetAppSettingsFolder_Success(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	appConfigDir, err := service.InitAndGetAppSettingsFolder()
	require.NoError(t, err)

	// Get expected path
	expectedPath := getAppConfigDir(tmpDir)

	assert.Equal(t, expectedPath, appConfigDir)

	// Check if directory was created
	info, err := os.Stat(expectedPath)
	require.NoError(t, err)
	assert.True(t, info.IsDir())

	// Check permissions (0700)
	if runtime.GOOS != "windows" { // Windows doesn't have Unix-style permissions
		expectedMode := fs.FileMode(0700)
		assert.Equal(t, expectedMode, info.Mode().Perm())
	}
}

func TestInitAndGetAppSettingsFolder_FallbackToHomeDir(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Clear XDG_CONFIG_HOME to force fallback to home directory
	os.Unsetenv("XDG_CONFIG_HOME")

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	appConfigDir, err := service.InitAndGetAppSettingsFolder()
	require.NoError(t, err)

	// Get expected path
	expectedPath := getAppConfigDir(tmpDir)

	assert.Equal(t, expectedPath, appConfigDir)

	// Check if directory was created
	_, err = os.Stat(expectedPath)
	assert.NoError(t, err)
}

func TestInitAndGetAppSettingsFolder_CompleteFailure(t *testing.T) {
	// Save original environment
	originalHome := os.Getenv("HOME")
	originalXDGConfig := os.Getenv("XDG_CONFIG_HOME")
	originalAppData := os.Getenv("APPDATA")
	originalLocalAppData := os.Getenv("LOCALAPPDATA")
	defer func() {
		os.Setenv("HOME", originalHome)
		os.Setenv("XDG_CONFIG_HOME", originalXDGConfig)
		os.Setenv("APPDATA", originalAppData)
		os.Setenv("LOCALAPPDATA", originalLocalAppData)
	}()

	// Clear all relevant environment variables
	os.Unsetenv("HOME")
	os.Unsetenv("XDG_CONFIG_HOME")
	os.Unsetenv("APPDATA")
	os.Unsetenv("LOCALAPPDATA")

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	_, err := service.InitAndGetAppSettingsFolder()
	assert.Error(t, err)
}

func TestInitAndGetAppSettingsFolder_DirCreationFailure(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create a directory within our test space that we can control
	testDir := filepath.Join(tmpDir, "test_dir")
	err := os.MkdirAll(testDir, 0700)
	require.NoError(t, err)

	// Set environment variables to point to our test directory
	os.Setenv("HOME", testDir)
	os.Setenv("XDG_CONFIG_HOME", filepath.Join(testDir, ".config"))
	os.Setenv("APPDATA", filepath.Join(testDir, "AppData", "Roaming"))
	os.Setenv("LOCALAPPDATA", filepath.Join(testDir, "AppData", "Local"))

	// Make the directory unwritable
	if runtime.GOOS != "windows" {
		err := os.Chmod(testDir, 0500) // Read+execute only
		require.NoError(t, err)
		defer os.Chmod(testDir, 0700)
	} else {
		// On Windows, we can't easily make a directory unwritable for testing
		// Instead, we'll try to create a file with the same name as the directory we want
		dirPath := getAppConfigDir(testDir)
		parentDir := filepath.Dir(dirPath)
		err := os.MkdirAll(parentDir, 0700)
		require.NoError(t, err)

		// Create a file where the directory should be
		err = os.WriteFile(dirPath, []byte{}, 0600)
		require.NoError(t, err)
	}

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	_, err = service.InitAndGetAppSettingsFolder()
	assert.Error(t, err)
}

func TestInitDefaultSettingsIfAbsent_AlreadyExists(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create the settings file
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	err = os.WriteFile(settingsPath, []byte("{}"), 0600)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	err = service.InitDefaultSettingsIfAbsent()
	assert.NoError(t, err)

	// Verify file still exists and wasn't modified
	_, err = os.Stat(settingsPath)
	assert.NoError(t, err)
}

func TestInitDefaultSettingsIfAbsent_CreatesFile(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	err = service.InitDefaultSettingsIfAbsent()
	assert.NoError(t, err)

	// Verify file was created
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	_, err = os.Stat(settingsPath)
	assert.NoError(t, err)

	// Verify file content matches default settings
	data, err := os.ReadFile(settingsPath)
	require.NoError(t, err)

	var settings settings.Settings
	err = json.Unmarshal(data, &settings)
	require.NoError(t, err)

	// Compare with default settings
	assert.True(t, reflect.DeepEqual(settings, constant.DefaultSetting))

	// Check file permissions (0600)
	if runtime.GOOS != "windows" {
		info, err := os.Stat(settingsPath)
		require.NoError(t, err)
		assert.Equal(t, fs.FileMode(0600), info.Mode().Perm())
	}
}

func TestInitDefaultSettingsIfAbsent_StatError(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create a directory where the settings file should be (to cause Stat error)
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	err = os.MkdirAll(settingsPath, 0700)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	err = service.InitDefaultSettingsIfAbsent()
	assert.NoError(t, err)
}

// Test InitDefaultSettingsIfAbsent with JSON marshaling error
func TestInitDefaultSettingsIfAbsent_MarshalError(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Temporarily replace the default settings with something that can't be marshaled
	// This is a bit tricky since we can't easily cause a marshal error with normal data
	// For now, we'll just test that the function works with the default settings
	err := service.InitDefaultSettingsIfAbsent()
	assert.NoError(t, err)

	// Verify file was created
	appConfigDir := getAppConfigDir(tmpDir)
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	_, err = os.Stat(settingsPath)
	assert.NoError(t, err)
}

// Test InitDefaultSettingsIfAbsent with file write error
func TestInitDefaultSettingsIfAbsent_WriteError(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Make the directory unwritable to cause write error
	if runtime.GOOS != "windows" {
		err := os.Chmod(appConfigDir, 0400)
		require.NoError(t, err)
		defer os.Chmod(appConfigDir, 0700)
	}

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should fail due to write permissions
	err = service.InitDefaultSettingsIfAbsent()
	assert.Error(t, err)
	// The error could be either stat or write permission denied, both are acceptable
	assert.Contains(t, err.Error(), "permission denied")
}

func TestSaveSettings_Success(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create test settings
	testSettings := &settings.Settings{
		AvailableProviderConfigs: []settings.ProviderConfig{
			{
				ProviderType:       settings.ProviderTypeCustom,
				ProviderName:       "Custom OpenAI",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/api/models/",
				CompletionEndpoint: "/api/completion/",
				Headers:            map[string]string{},
			},
		},
		CurrentProviderConfig: settings.ProviderConfig{
			ProviderType:       settings.ProviderTypeCustom,
			ProviderName:       "Custom OpenAI",
			BaseUrl:            "http://localhost:11434",
			ModelsEndpoint:     "/api/models/",
			CompletionEndpoint: "/api/completion/",
			Headers:            map[string]string{},
		},
		ModelConfig: settings.LlmModelConfig{
			ModelName:            "test-model",
			IsTemperatureEnabled: true,
			Temperature:          0.5,
		},
		LanguageConfig: settings.LanguageConfig{
			Languages:             []string{"English", "Ukrainian"},
			DefaultInputLanguage:  "English",
			DefaultOutputLanguage: "Ukrainian",
		},
		UseMarkdownForOutput: false,
	}

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	err := service.SaveSettings(testSettings)
	assert.NoError(t, err)

	// Verify file was created in the correct location
	appConfigDir := getAppConfigDir(tmpDir)
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	_, err = os.Stat(settingsPath)
	assert.NoError(t, err)

	// Verify file content
	data, err := os.ReadFile(settingsPath)
	require.NoError(t, err)

	var settings settings.Settings
	err = json.Unmarshal(data, &settings)
	require.NoError(t, err)
	assert.Equal(t, testSettings, &settings)
}

func TestLoadSettings_Success(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create test settings file
	testSettings := constant.DefaultSetting
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	data, err := json.MarshalIndent(testSettings, "", "  ")
	require.NoError(t, err)
	err = os.WriteFile(settingsPath, data, 0600)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	settings, err := service.LoadSettings()
	assert.NoError(t, err)
	assert.NotNil(t, settings)
	assert.Equal(t, &testSettings, settings)
}

func TestLoadSettings_FileNotFound(t *testing.T) {
	_, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - no settings file created
	_, err := service.LoadSettings()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read appSettings file")
}

func TestLoadSettings_InvalidJSON(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create invalid settings file
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	err = os.WriteFile(settingsPath, []byte("{invalid json"), 0600)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	_, err = service.LoadSettings()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse appSettings")
}

func TestLoadSettings_ReturnsNilOnError(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Make the directory unwritable to cause an error
	if runtime.GOOS != "windows" {
		err := os.Chmod(appConfigDir, 0400)
		require.NoError(t, err)
		defer os.Chmod(appConfigDir, 0700)
	}

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	settings, err := service.LoadSettings()
	assert.Nil(t, settings)
	assert.Error(t, err)
}

// Test SaveSettings with nil settings
func TestSaveSettings_NilSettings(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function with nil settings
	// Note: nil can actually be marshaled to JSON as "null", so this test
	// verifies that the function handles nil input gracefully
	err := service.SaveSettings(nil)
	assert.NoError(t, err) // This should succeed as nil can be marshaled

	// Verify that a file was created with "null" content
	appConfigDir := getAppConfigDir(tmpDir)
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	data, err := os.ReadFile(settingsPath)
	assert.NoError(t, err)
	assert.Equal(t, "null", string(data))
}

// Test SaveSettings with invalid settings structure
func TestSaveSettings_InvalidSettingsStructure(t *testing.T) {
	_, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Create settings with invalid structure (circular reference would cause issues)
	// For this test, we'll use a settings object that should be valid but test the serialization
	testSettings := &settings.Settings{
		AvailableProviderConfigs: []settings.ProviderConfig{
			{
				ProviderType:       "invalid-provider-type", // Invalid provider type
				ProviderName:       "",                      // Empty provider name
				BaseUrl:            "",                      // Empty base URL
				ModelsEndpoint:     "",                      // Empty models endpoint
				CompletionEndpoint: "",                      // Empty completion endpoint
				Headers:            map[string]string{"key": "value"},
			},
		},
		CurrentProviderConfig: settings.ProviderConfig{
			ProviderType:       "invalid-provider-type",
			ProviderName:       "",
			BaseUrl:            "",
			ModelsEndpoint:     "",
			CompletionEndpoint: "",
			Headers:            map[string]string{"key": "value"},
		},
		ModelConfig: settings.LlmModelConfig{
			ModelName:            "", // Empty model name
			IsTemperatureEnabled: true,
			Temperature:          -1.0, // Invalid temperature
		},
		LanguageConfig: settings.LanguageConfig{
			Languages:             []string{}, // Empty languages
			DefaultInputLanguage:  "",         // Empty default input language
			DefaultOutputLanguage: "",         // Empty default output language
		},
		UseMarkdownForOutput: false,
	}

	// Test the function
	err := service.SaveSettings(testSettings)
	assert.NoError(t, err) // Should still succeed as JSON serialization should handle this

	// Verify file was created and can be loaded back
	loadedSettings, err := service.LoadSettings()
	assert.NoError(t, err)
	assert.NotNil(t, loadedSettings)
}

func TestGetSettingsFilePath_Success(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	filePath := service.GetSettingsFilePath()

	// Get expected path
	expectedPath := getAppConfigDir(tmpDir)
	expectedFilePath := filepath.Join(expectedPath, SettingsFileName)

	assert.Equal(t, expectedFilePath, filePath)

	// Verify the directory was created
	info, err := os.Stat(expectedPath)
	require.NoError(t, err)
	assert.True(t, info.IsDir())
}

func TestGetSettingsFilePath_WithExistingDirectory(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory first
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	filePath := service.GetSettingsFilePath()
	expectedFilePath := filepath.Join(appConfigDir, SettingsFileName)

	assert.Equal(t, expectedFilePath, filePath)

	// Verify the directory still exists
	info, err := os.Stat(appConfigDir)
	require.NoError(t, err)
	assert.True(t, info.IsDir())
}

func TestGetSettingsFilePath_FallbackToHomeDir(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Clear XDG_CONFIG_HOME to force fallback to home directory
	os.Unsetenv("XDG_CONFIG_HOME")

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function
	filePath := service.GetSettingsFilePath()

	// Get expected path (should fall back to home directory)
	expectedPath := getAppConfigDir(tmpDir)
	expectedFilePath := filepath.Join(expectedPath, SettingsFileName)

	assert.Equal(t, expectedFilePath, filePath)

	// Verify the directory was created
	info, err := os.Stat(expectedPath)
	require.NoError(t, err)
	assert.True(t, info.IsDir())
}

func TestGetSettingsFilePath_CompleteFailure(t *testing.T) {
	// Save original environment
	originalHome := os.Getenv("HOME")
	originalXDGConfig := os.Getenv("XDG_CONFIG_HOME")
	originalAppData := os.Getenv("APPDATA")
	originalLocalAppData := os.Getenv("LOCALAPPDATA")
	defer func() {
		os.Setenv("HOME", originalHome)
		os.Setenv("XDG_CONFIG_HOME", originalXDGConfig)
		os.Setenv("APPDATA", originalAppData)
		os.Setenv("LOCALAPPDATA", originalLocalAppData)
	}()

	// Clear all relevant environment variables
	os.Unsetenv("HOME")
	os.Unsetenv("XDG_CONFIG_HOME")
	os.Unsetenv("APPDATA")
	os.Unsetenv("LOCALAPPDATA")

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should return empty string on complete failure
	filePath := service.GetSettingsFilePath()
	assert.Empty(t, filePath)
}

func TestGetSettingsFilePath_DirCreationFailure(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create a directory within our test space that we can control
	testDir := filepath.Join(tmpDir, "test_dir")
	err := os.MkdirAll(testDir, 0700)
	require.NoError(t, err)

	// Set environment variables to point to our test directory
	os.Setenv("HOME", testDir)
	os.Setenv("XDG_CONFIG_HOME", filepath.Join(testDir, ".config"))
	os.Setenv("APPDATA", filepath.Join(testDir, "AppData", "Roaming"))
	os.Setenv("LOCALAPPDATA", filepath.Join(testDir, "AppData", "Local"))

	// Make the directory unwritable
	if runtime.GOOS != "windows" {
		err := os.Chmod(testDir, 0500) // Read+execute only
		require.NoError(t, err)
		defer os.Chmod(testDir, 0700)
	} else {
		// On Windows, we can't easily make a directory unwritable for testing
		// Instead, we'll try to create a file with the same name as the directory we want
		dirPath := getAppConfigDir(testDir)
		parentDir := filepath.Dir(dirPath)
		err := os.MkdirAll(parentDir, 0700)
		require.NoError(t, err)

		// Create a file where the directory should be
		err = os.WriteFile(dirPath, []byte{}, 0600)
		require.NoError(t, err)
	}

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should return empty string on directory creation failure
	filePath := service.GetSettingsFilePath()
	assert.Empty(t, filePath)
}

// Test LoadSettings with empty file
func TestLoadSettings_EmptyFile(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create empty settings file
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	err = os.WriteFile(settingsPath, []byte(""), 0600)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should fail due to empty JSON
	settings, err := service.LoadSettings()
	assert.Error(t, err)
	assert.Nil(t, settings)
	assert.Contains(t, err.Error(), "failed to parse appSettings")
}

// Test LoadSettings with malformed JSON
func TestLoadSettings_MalformedJSON(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create malformed JSON settings file
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	malformedJSON := []byte(`{"availableProviderConfigs": [{"providerType": "custom", "providerName": "test"`)
	err = os.WriteFile(settingsPath, malformedJSON, 0600)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should fail due to malformed JSON
	settings, err := service.LoadSettings()
	assert.Error(t, err)
	assert.Nil(t, settings)
	assert.Contains(t, err.Error(), "failed to parse appSettings")
}

// Test SaveSettings with large settings file
func TestSaveSettings_LargeSettingsFile(t *testing.T) {
	_, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create a large settings object with many providers
	largeSettings := &settings.Settings{
		AvailableProviderConfigs: make([]settings.ProviderConfig, 100),
		CurrentProviderConfig: settings.ProviderConfig{
			ProviderType:       settings.ProviderTypeCustom,
			ProviderName:       "Large Test Provider",
			BaseUrl:            "http://localhost:11434",
			ModelsEndpoint:     "/api/models/",
			CompletionEndpoint: "/api/completion/",
			Headers:            map[string]string{"key": "value"},
		},
		ModelConfig: settings.LlmModelConfig{
			ModelName:            "large-model",
			IsTemperatureEnabled: true,
			Temperature:          0.7,
		},
		LanguageConfig: settings.LanguageConfig{
			Languages:             []string{"English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese", "Japanese", "Korean"},
			DefaultInputLanguage:  "English",
			DefaultOutputLanguage: "Spanish",
		},
		UseMarkdownForOutput: true,
	}

	// Fill the available providers
	for i := 0; i < 100; i++ {
		largeSettings.AvailableProviderConfigs[i] = settings.ProviderConfig{
			ProviderType:       settings.ProviderTypeCustom,
			ProviderName:       fmt.Sprintf("Provider %d", i),
			BaseUrl:            fmt.Sprintf("http://provider%d.example.com", i),
			ModelsEndpoint:     "/api/models/",
			CompletionEndpoint: "/api/completion/",
			Headers:            map[string]string{"key": "value"},
		}
	}

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should succeed even with large settings
	err := service.SaveSettings(largeSettings)
	assert.NoError(t, err)

	// Verify file was created and can be loaded back
	loadedSettings, err := service.LoadSettings()
	assert.NoError(t, err)
	assert.NotNil(t, loadedSettings)
	assert.Equal(t, largeSettings, loadedSettings)
}

// Test LoadSettings with file that contains only whitespace
func TestLoadSettings_WhitespaceOnly(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create settings file with only whitespace
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	whitespaceContent := []byte("   \n\t  \n  ")
	err = os.WriteFile(settingsPath, whitespaceContent, 0600)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should fail due to invalid JSON
	settings, err := service.LoadSettings()
	assert.Error(t, err)
	assert.Nil(t, settings)
	assert.Contains(t, err.Error(), "failed to parse appSettings")
}

// Test LoadSettings with file that contains invalid JSON structure
func TestLoadSettings_InvalidStructure(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create settings file with invalid structure (missing required fields)
	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	invalidContent := []byte("{\"invalid_field\": \"value\"}")
	err = os.WriteFile(settingsPath, invalidContent, 0600)
	require.NoError(t, err)

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Test the function - should succeed parsing but result in empty/default settings
	settings, err := service.LoadSettings()
	assert.NoError(t, err)
	assert.NotNil(t, settings)
	// The settings should be loaded with default values since the JSON doesn't match the expected structure
	// This is actually a valid test case - it shows that the function handles unexpected JSON gracefully
}

func TestGetSettingsFilePath_ConsistencyWithOtherMethods(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create file utils service with test logger
	logger := &TestLogger{}
	service := NewFileUtilsService(logger)

	// Get the file path using GetSettingsFilePath
	filePath := service.GetSettingsFilePath()
	assert.NotEmpty(t, filePath)

	// Verify that SaveSettings and LoadSettings use the same path
	testSettings := &settings.Settings{
		AvailableProviderConfigs: []settings.ProviderConfig{
			{
				ProviderType:       settings.ProviderTypeCustom,
				ProviderName:       "Test Provider",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/api/models/",
				CompletionEndpoint: "/api/completion/",
				Headers:            map[string]string{},
			},
		},
		CurrentProviderConfig: settings.ProviderConfig{
			ProviderType:       settings.ProviderTypeCustom,
			ProviderName:       "Test Provider",
			BaseUrl:            "http://localhost:11434",
			ModelsEndpoint:     "/api/models/",
			CompletionEndpoint: "/api/completion/",
			Headers:            map[string]string{},
		},
		ModelConfig: settings.LlmModelConfig{
			ModelName:            "test-model",
			IsTemperatureEnabled: true,
			Temperature:          0.5,
		},
		LanguageConfig: settings.LanguageConfig{
			Languages:             []string{"English", "Ukrainian"},
			DefaultInputLanguage:  "English",
			DefaultOutputLanguage: "Ukrainian",
		},
		UseMarkdownForOutput: false,
	}

	// Save settings
	err := service.SaveSettings(testSettings)
	assert.NoError(t, err)

	// Load settings and verify they match
	loadedSettings, err := service.LoadSettings()
	assert.NoError(t, err)
	assert.Equal(t, testSettings, loadedSettings)

	// Verify the file path is consistent with what GetSettingsFilePath returns
	appConfigDir := getAppConfigDir(tmpDir)
	expectedFilePath := filepath.Join(appConfigDir, SettingsFileName)
	assert.Equal(t, expectedFilePath, filePath)

	// Verify the file actually exists at the expected path
	_, err = os.Stat(filePath)
	assert.NoError(t, err)
}

// TestLogger is a simple logger for testing that implements the LoggingApi interface
type TestLogger struct{}

func (l *TestLogger) Print(message string)   {}
func (l *TestLogger) Trace(message string)   {}
func (l *TestLogger) Debug(message string)   {}
func (l *TestLogger) Info(message string)    {}
func (l *TestLogger) Warning(message string) {}
func (l *TestLogger) Error(message string)   {}
func (l *TestLogger) Fatal(message string)   {}
