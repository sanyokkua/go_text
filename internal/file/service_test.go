package file

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestLogger is a simple logger for testing that implements the logger.Logger interface
type TestLogger struct{}

func (l *TestLogger) Print(message string)   {}
func (l *TestLogger) Trace(message string)   {}
func (l *TestLogger) Debug(message string)   {}
func (l *TestLogger) Info(message string)    {}
func (l *TestLogger) Warning(message string) {}
func (l *TestLogger) Error(message string)   {}
func (l *TestLogger) Fatal(message string)   {}

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

func TestNewFileUtilsService(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		logger := &TestLogger{}
		service := NewFileUtilsService(logger)
		assert.NotNil(t, service)
	})

	t.Run("panic_when_logger_is_nil", func(t *testing.T) {
		assert.PanicsWithValue(t, "logger cannot be nil", func() {
			NewFileUtilsService(nil)
		})
	})
}

func TestEnsureAppSettingsFolderExists(t *testing.T) {
	tests := []struct {
		name           string
		setupEnv       func(tmpDir string)
		expectSuccess  bool
		validateResult func(t *testing.T, result string, err error, tmpDir string)
	}{
		{
			name: "success_with_config_dir",
			setupEnv: func(tmpDir string) {
				// Default setup should work
			},
			expectSuccess: true,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				expectedPath := getAppConfigDir(tmpDir)
				assert.Equal(t, expectedPath, result)

				// Verify directory was created
				info, statErr := os.Stat(result)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
			},
		},
		{
			name: "fallback_to_home_dir",
			setupEnv: func(tmpDir string) {
				// Clear XDG_CONFIG_HOME to force fallback
				os.Unsetenv("XDG_CONFIG_HOME")
				if runtime.GOOS == "windows" {
					os.Unsetenv("APPDATA")
				}
			},
			expectSuccess: true,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				// Should fall back to home directory
				expectedPath := filepath.Join(tmpDir, AppName)
				if runtime.GOOS == "darwin" {
					expectedPath = filepath.Join(tmpDir, "Library", "Application Support", AppName)
				}
				assert.Equal(t, expectedPath, result)

				// Verify directory was created
				info, statErr := os.Stat(result)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
			},
		},
		{
			name: "complete_failure",
			setupEnv: func(tmpDir string) {
				// Clear all environment variables to force complete failure
				os.Unsetenv("HOME")
				os.Unsetenv("XDG_CONFIG_HOME")
				os.Unsetenv("APPDATA")
				os.Unsetenv("LOCALAPPDATA")
			},
			expectSuccess: false,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to determine application directory")
			},
		},
		{
			name: "directory_creation_failure",
			setupEnv: func(tmpDir string) {
				// Create a file where the directory should be to cause creation failure
				expectedPath := getAppConfigDir(tmpDir)
				parentDir := filepath.Dir(expectedPath)
				err := os.MkdirAll(parentDir, 0700)
				require.NoError(t, err)

				// Create a file with the same name as the target directory
				err = os.WriteFile(expectedPath, []byte("dummy"), 0600)
				require.NoError(t, err)
			},
			expectSuccess: false,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to create application directory")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir, cleanup := setupTestEnv(t)
			defer cleanup()

			// Apply test-specific environment setup
			if tt.setupEnv != nil {
				tt.setupEnv(tmpDir)
			}

			// Create service
			logger := &TestLogger{}
			service := NewFileUtilsService(logger)

			// Call the private method using reflection or test the public methods that use it
			// Since ensureAppSettingsFolderExists is private, we'll test it through GetAppSettingsFolderPath
			result, err := service.GetAppSettingsFolderPath()

			// Validate result
			if tt.validateResult != nil {
				tt.validateResult(t, result, err, tmpDir)
			}
		})
	}
}

func TestGetAppSettingsFolderPath(t *testing.T) {
	tests := []struct {
		name           string
		setupEnv       func(tmpDir string)
		expectSuccess  bool
		validateResult func(t *testing.T, result string, err error, tmpDir string)
	}{
		{
			name: "success",
			setupEnv: func(tmpDir string) {
				// Default setup should work
			},
			expectSuccess: true,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				expectedPath := getAppConfigDir(tmpDir)
				assert.Equal(t, expectedPath, result)

				// Verify directory was created
				info, statErr := os.Stat(result)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
			},
		},
		{
			name: "fallback_to_home_dir",
			setupEnv: func(tmpDir string) {
				// Clear XDG_CONFIG_HOME to force fallback
				os.Unsetenv("XDG_CONFIG_HOME")
				if runtime.GOOS == "windows" {
					os.Unsetenv("APPDATA")
				}
			},
			expectSuccess: true,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				// Should fall back to home directory
				expectedPath := filepath.Join(tmpDir, AppName)
				if runtime.GOOS == "darwin" {
					expectedPath = filepath.Join(tmpDir, "Library", "Application Support", AppName)
				}
				assert.Equal(t, expectedPath, result)

				// Verify directory was created
				info, statErr := os.Stat(result)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
			},
		},
		{
			name: "complete_failure",
			setupEnv: func(tmpDir string) {
				// Clear all environment variables to force complete failure
				os.Unsetenv("HOME")
				os.Unsetenv("XDG_CONFIG_HOME")
				os.Unsetenv("APPDATA")
				os.Unsetenv("LOCALAPPDATA")
			},
			expectSuccess: false,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to determine application directory")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir, cleanup := setupTestEnv(t)
			defer cleanup()

			// Apply test-specific environment setup
			if tt.setupEnv != nil {
				tt.setupEnv(tmpDir)
			}

			// Create service
			logger := &TestLogger{}
			service := NewFileUtilsService(logger)

			// Call the method
			result, err := service.GetAppSettingsFolderPath()

			// Validate result
			if tt.validateResult != nil {
				tt.validateResult(t, result, err, tmpDir)
			}
		})
	}
}

func TestGetAppSettingsFilePath(t *testing.T) {
	tests := []struct {
		name           string
		setupEnv       func(tmpDir string)
		expectSuccess  bool
		validateResult func(t *testing.T, result string, err error, tmpDir string)
	}{
		{
			name: "success",
			setupEnv: func(tmpDir string) {
				// Default setup should work
			},
			expectSuccess: true,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				expectedFolderPath := getAppConfigDir(tmpDir)
				expectedFilePath := filepath.Join(expectedFolderPath, SettingsFileName)
				assert.Equal(t, expectedFilePath, result)

				// Verify directory was created
				info, statErr := os.Stat(expectedFolderPath)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
			},
		},
		{
			name: "fallback_to_home_dir",
			setupEnv: func(tmpDir string) {
				// Clear XDG_CONFIG_HOME to force fallback
				os.Unsetenv("XDG_CONFIG_HOME")
				if runtime.GOOS == "windows" {
					os.Unsetenv("APPDATA")
				}
			},
			expectSuccess: true,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				// Should fall back to home directory
				expectedFolderPath := filepath.Join(tmpDir, AppName)
				if runtime.GOOS == "darwin" {
					expectedFolderPath = filepath.Join(tmpDir, "Library", "Application Support", AppName)
				}
				expectedFilePath := filepath.Join(expectedFolderPath, SettingsFileName)
				assert.Equal(t, expectedFilePath, result)

				// Verify directory was created
				info, statErr := os.Stat(expectedFolderPath)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
			},
		},
		{
			name: "complete_failure",
			setupEnv: func(tmpDir string) {
				// Clear all environment variables to force complete failure
				os.Unsetenv("HOME")
				os.Unsetenv("XDG_CONFIG_HOME")
				os.Unsetenv("APPDATA")
				os.Unsetenv("LOCALAPPDATA")
			},
			expectSuccess: false,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to get settings folder path")
			},
		},
		{
			name: "directory_creation_failure",
			setupEnv: func(tmpDir string) {
				// Create a file where the directory should be to cause creation failure
				expectedPath := getAppConfigDir(tmpDir)
				parentDir := filepath.Dir(expectedPath)
				err := os.MkdirAll(parentDir, 0700)
				require.NoError(t, err)

				// Create a file with the same name as the target directory
				err = os.WriteFile(expectedPath, []byte("dummy"), 0600)
				require.NoError(t, err)
			},
			expectSuccess: false,
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to get settings folder path")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir, cleanup := setupTestEnv(t)
			defer cleanup()

			// Apply test-specific environment setup
			if tt.setupEnv != nil {
				tt.setupEnv(tmpDir)
			}

			// Create service
			logger := &TestLogger{}
			service := NewFileUtilsService(logger)

			// Call the method
			result, err := service.GetAppSettingsFilePath()

			// Validate result
			if tt.validateResult != nil {
				tt.validateResult(t, result, err, tmpDir)
			}
		})
	}
}
