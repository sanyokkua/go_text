package file

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"go_text/internal/logging"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestLogger builds a real *logging.Logger for service construction in
// tests. Level is set to error to minimize noise; it writes to io.Discard
// (dev=false, no file sink configured) so it has no side effects.
func newTestLogger(t *testing.T) *logging.Logger {
	t.Helper()
	cfg := logging.DefaultConfig()
	cfg.Level = "error"
	l, err := logging.New(cfg, false)
	require.NoError(t, err)
	return l
}

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
		logger := newTestLogger(t)
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
				// os.UserConfigDir() falls back to $HOME/.config internally on Unix
				// when XDG_CONFIG_HOME is unset — it only errors if $HOME is also
				// unset, so the app's own fallback to os.UserHomeDir() is unreachable
				// here on Linux/macOS; only Windows (APPDATA/USERPROFILE are
				// independent env vars) actually exercises that branch.
				expectedPath := filepath.Join(tmpDir, AppName)
				switch runtime.GOOS {
				case "darwin":
					expectedPath = filepath.Join(tmpDir, "Library", "Application Support", AppName)
				case "windows":
					// APPDATA unset above triggers the real app-level fallback.
				default:
					expectedPath = getAppConfigDir(tmpDir)
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
			logger := newTestLogger(t)
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
				// os.UserConfigDir() falls back to $HOME/.config internally on Unix
				// when XDG_CONFIG_HOME is unset — it only errors if $HOME is also
				// unset, so the app's own fallback to os.UserHomeDir() is unreachable
				// here on Linux/macOS; only Windows (APPDATA/USERPROFILE are
				// independent env vars) actually exercises that branch.
				expectedPath := filepath.Join(tmpDir, AppName)
				switch runtime.GOOS {
				case "darwin":
					expectedPath = filepath.Join(tmpDir, "Library", "Application Support", AppName)
				case "windows":
					// APPDATA unset above triggers the real app-level fallback.
				default:
					expectedPath = getAppConfigDir(tmpDir)
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
			logger := newTestLogger(t)
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

func TestFileUtilsService_ResolveAppLogsFolderPath(t *testing.T) {
	tests := []struct {
		name           string
		customDir      string
		setupEnv       func(tmpDir string)
		validateResult func(t *testing.T, result string, err error, tmpDir string)
	}{
		{
			name:      "custom_dir_returned_verbatim",
			customDir: "/tmp/my-logs",
			setupEnv:  func(tmpDir string) {},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				assert.Equal(t, "/tmp/my-logs", result)
			},
		},
		{
			name:     "custom_dir_does_not_create_directory",
			setupEnv: func(tmpDir string) {},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				_, statErr := os.Stat(result)
				assert.True(t, os.IsNotExist(statErr))
			},
		},
		{
			name:      "default_uses_os_config_dir",
			customDir: "",
			setupEnv:  func(tmpDir string) {},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				expectedPath := filepath.Join(getAppConfigDir(tmpDir), LogsDirName)
				assert.Equal(t, expectedPath, result)

				// Verify no directory was created
				_, statErr := os.Stat(result)
				assert.True(t, os.IsNotExist(statErr))
			},
		},
		{
			name:      "complete_failure",
			customDir: "",
			setupEnv: func(tmpDir string) {
				// Clear all environment variables to force complete failure
				os.Unsetenv("HOME")
				os.Unsetenv("XDG_CONFIG_HOME")
				os.Unsetenv("APPDATA")
				os.Unsetenv("LOCALAPPDATA")
			},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to determine logs directory")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir, cleanup := setupTestEnv(t)
			defer cleanup()

			if tt.setupEnv != nil {
				tt.setupEnv(tmpDir)
			}

			// Resolve customDir relative to tmpDir for the "does not create" case
			customDir := tt.customDir
			if tt.name == "custom_dir_does_not_create_directory" {
				customDir = filepath.Join(tmpDir, "nonexistent-99999")
			}

			logger := newTestLogger(t)
			service := NewFileUtilsService(logger)

			result, err := service.ResolveAppLogsFolderPath(customDir)

			if tt.validateResult != nil {
				tt.validateResult(t, result, err, tmpDir)
			}
		})
	}
}

func TestFileUtilsService_EnsureAppLogsFolderExists(t *testing.T) {
	tests := []struct {
		name           string
		setupEnv       func(t *testing.T, tmpDir string) string
		validateResult func(t *testing.T, result string, err error, tmpDir string)
	}{
		{
			name: "creates_custom_directory",
			setupEnv: func(t *testing.T, tmpDir string) string {
				return filepath.Join(tmpDir, "custom-logs")
			},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				assert.Equal(t, filepath.Join(tmpDir, "custom-logs"), result)

				info, statErr := os.Stat(result)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
				assert.Equal(t, os.FileMode(0700), info.Mode().Perm())
			},
		},
		{
			name: "creates_default_directory",
			setupEnv: func(t *testing.T, tmpDir string) string {
				return ""
			},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)
				expectedPath := filepath.Join(getAppConfigDir(tmpDir), LogsDirName)
				assert.Equal(t, expectedPath, result)

				info, statErr := os.Stat(result)
				assert.NoError(t, statErr)
				assert.True(t, info.IsDir())
			},
		},
		{
			name: "idempotent_second_call",
			setupEnv: func(t *testing.T, tmpDir string) string {
				return filepath.Join(tmpDir, "logs2")
			},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.NoError(t, err)

				// Call again; must also succeed
				logger := newTestLogger(t)
				service := NewFileUtilsService(logger)
				result2, err2 := service.EnsureAppLogsFolderExists(filepath.Join(tmpDir, "logs2"))
				assert.NoError(t, err2)
				assert.Equal(t, result, result2)
			},
		},
		{
			name: "fails_when_regular_file_blocks_path",
			setupEnv: func(t *testing.T, tmpDir string) string {
				// Place a regular file at "blockfile"; use "blockfile/logs" as target
				blockFile := filepath.Join(tmpDir, "blockfile")
				err := os.WriteFile(blockFile, []byte("block"), 0600)
				require.NoError(t, err)
				return filepath.Join(tmpDir, "blockfile", "logs")
			},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to create logs directory")
			},
		},
		{
			name: "fails_on_path_resolution_error",
			setupEnv: func(t *testing.T, tmpDir string) string {
				// Clear all environment variables to force resolution failure
				os.Unsetenv("HOME")
				os.Unsetenv("XDG_CONFIG_HOME")
				os.Unsetenv("APPDATA")
				os.Unsetenv("LOCALAPPDATA")
				return ""
			},
			validateResult: func(t *testing.T, result string, err error, tmpDir string) {
				assert.Error(t, err)
				assert.Empty(t, result)
				assert.Contains(t, err.Error(), "failed to resolve logs folder path")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir, cleanup := setupTestEnv(t)
			defer cleanup()

			var customDir string
			if tt.setupEnv != nil {
				customDir = tt.setupEnv(t, tmpDir)
			}

			logger := newTestLogger(t)
			service := NewFileUtilsService(logger)

			result, err := service.EnsureAppLogsFolderExists(customDir)

			if tt.validateResult != nil {
				tt.validateResult(t, result, err, tmpDir)
			}
		})
	}
}

func TestFileUtilsService_GetAppDatabaseFilePath(t *testing.T) {
	t.Run("returns path ending with gotext.db under GoTextApp dir", func(t *testing.T) {
		tmpDir, cleanup := setupTestEnv(t)
		defer cleanup()

		_ = tmpDir
		svc := NewFileUtilsService(newTestLogger(t))

		path, err := svc.GetAppDatabaseFilePath()

		require.NoError(t, err)
		assert.True(t, strings.HasSuffix(path, "gotext.db"), "expected path to end with gotext.db, got: %s", path)
		assert.Contains(t, path, "GoTextApp", "expected path to contain GoTextApp, got: %s", path)
	})
}
