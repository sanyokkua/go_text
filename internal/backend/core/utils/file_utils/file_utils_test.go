package file_utils_test

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"testing"

	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/utils/file_utils"
	"go_text/internal/backend/models"

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
		return filepath.Join(tmpDir, "AppData", "Roaming", file_utils.AppName)
	} else if runtime.GOOS == "darwin" {
		return filepath.Join(tmpDir, "Library", "Application Support", file_utils.AppName)
	} else {
		return filepath.Join(tmpDir, ".config", file_utils.AppName)
	}
}

func TestInitAndGetAppSettingsFolder_Success(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Test the function
	appConfigDir, err := file_utils.InitAndGetAppSettingsFolder()
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

	// Test the function
	appConfigDir, err := file_utils.InitAndGetAppSettingsFolder()
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

	// Test the function
	_, err := file_utils.InitAndGetAppSettingsFolder()
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

	// Test the function
	_, err = file_utils.InitAndGetAppSettingsFolder()
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
	settingsPath := filepath.Join(appConfigDir, file_utils.SettingsFileName)
	err = os.WriteFile(settingsPath, []byte("{}"), 0600)
	require.NoError(t, err)

	// Test the function
	err = file_utils.InitDefaultSettingsIfAbsent()
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

	// Test the function
	err = file_utils.InitDefaultSettingsIfAbsent()
	assert.NoError(t, err)

	// Verify file was created
	settingsPath := filepath.Join(appConfigDir, file_utils.SettingsFileName)
	_, err = os.Stat(settingsPath)
	assert.NoError(t, err)

	// Verify file content matches default settings
	data, err := os.ReadFile(settingsPath)
	require.NoError(t, err)

	var settings models.Settings
	err = json.Unmarshal(data, &settings)
	require.NoError(t, err)

	// Compare with default settings
	assert.True(t, reflect.DeepEqual(settings, constants.DefaultSetting))

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
	settingsPath := filepath.Join(appConfigDir, file_utils.SettingsFileName)
	err = os.MkdirAll(settingsPath, 0700)
	require.NoError(t, err)

	// Test the function
	err = file_utils.InitDefaultSettingsIfAbsent()
	assert.NoError(t, err)
}

func TestSaveSettings_Success(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create test settings
	testSettings := &models.Settings{
		BaseUrl:               "http://localhost:11434",
		ModelsEndpoint:        "/api/models/",
		CompletionEndpoint:    "/api/completion/",
		ModelName:             "test-model",
		Temperature:           0.5,
		DefaultInputLanguage:  "English",
		DefaultOutputLanguage: "Ukrainian",
		Languages:             []string{"English", "Ukrainian"},
	}

	// Test the function
	err := file_utils.SaveSettings(testSettings)
	assert.NoError(t, err)

	// Verify file was created in the correct location
	appConfigDir := getAppConfigDir(tmpDir)
	settingsPath := filepath.Join(appConfigDir, file_utils.SettingsFileName)
	_, err = os.Stat(settingsPath)
	assert.NoError(t, err)

	// Verify file content
	data, err := os.ReadFile(settingsPath)
	require.NoError(t, err)

	var settings models.Settings
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
	testSettings := constants.DefaultSetting
	settingsPath := filepath.Join(appConfigDir, file_utils.SettingsFileName)
	data, err := json.MarshalIndent(testSettings, "", "  ")
	require.NoError(t, err)
	err = os.WriteFile(settingsPath, data, 0600)
	require.NoError(t, err)

	// Test the function
	settings, err := file_utils.LoadSettings()
	assert.NoError(t, err)
	assert.NotNil(t, settings)
	assert.Equal(t, &testSettings, settings)
}

func TestLoadSettings_FileNotFound(t *testing.T) {
	_, cleanup := setupTestEnv(t)
	defer cleanup()

	// Test the function - no settings file created
	_, err := file_utils.LoadSettings()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read settings file")
}

func TestLoadSettings_InvalidJSON(t *testing.T) {
	tmpDir, cleanup := setupTestEnv(t)
	defer cleanup()

	// Create the app config directory
	appConfigDir := getAppConfigDir(tmpDir)
	err := os.MkdirAll(appConfigDir, 0700)
	require.NoError(t, err)

	// Create invalid settings file
	settingsPath := filepath.Join(appConfigDir, file_utils.SettingsFileName)
	err = os.WriteFile(settingsPath, []byte("{invalid json"), 0600)
	require.NoError(t, err)

	// Test the function
	_, err = file_utils.LoadSettings()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse settings")
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

	// Test the function
	settings, err := file_utils.LoadSettings()
	assert.Nil(t, settings)
	assert.Error(t, err)
}
