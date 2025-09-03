package validators_test

import (
	"testing"

	"go_text/internal/backend/core/utils/validators"
	"go_text/internal/backend/models"

	"github.com/stretchr/testify/assert"
)

func TestIsSettingsValid(t *testing.T) {
	validSettings := &models.Settings{
		BaseUrl:               "http://localhost:11434",
		ModelName:             "gpt-3.5-turbo",
		Temperature:           0.5,
		DefaultInputLanguage:  "English",
		DefaultOutputLanguage: "Ukrainian",
		Languages:             []string{"English", "Ukrainian"},
	}

	tests := []struct {
		name      string
		modify    func(*models.Settings)
		wantValid bool
		wantError string
	}{
		{
			name:      "Valid settings",
			modify:    func(s *models.Settings) {},
			wantValid: true,
		},
		{
			name: "Empty baseUrl",
			modify: func(s *models.Settings) {
				s.BaseUrl = ""
			},
			wantValid: false,
			wantError: "cannot save settings: base url is empty",
		},
		{
			name: "Whitespace baseUrl",
			modify: func(s *models.Settings) {
				s.BaseUrl = "   \t\n"
			},
			wantValid: false,
			wantError: "cannot save settings: base url is empty",
		},
		{
			name: "BaseUrl ending with /",
			modify: func(s *models.Settings) {
				s.BaseUrl = "http://localhost:11434/"
			},
			wantValid: false,
			wantError: "baseUrl must not end with /",
		},
		{
			name: "BaseUrl without http(s) prefix",
			modify: func(s *models.Settings) {
				s.BaseUrl = "localhost:11434"
			},
			wantValid: false,
			wantError: "baseUrl must start with http:// or https://",
		},
		{
			name: "BaseUrl with invalid protocol",
			modify: func(s *models.Settings) {
				s.BaseUrl = "ftp://localhost:11434"
			},
			wantValid: false,
			wantError: "baseUrl must start with http:// or https://",
		},
		{
			name: "Empty modelName",
			modify: func(s *models.Settings) {
				s.ModelName = ""
			},
			wantValid: false,
			wantError: "modelName must not be empty",
		},
		{
			name: "Whitespace modelName",
			modify: func(s *models.Settings) {
				s.ModelName = "   "
			},
			wantValid: false,
			wantError: "modelName must not be empty",
		},
		{
			name: "Empty defaultInputLanguage",
			modify: func(s *models.Settings) {
				s.DefaultInputLanguage = ""
			},
			wantValid: false,
			wantError: "defaultInputLanguage must not be empty",
		},
		{
			name: "Whitespace defaultInputLanguage",
			modify: func(s *models.Settings) {
				s.DefaultInputLanguage = "\t"
			},
			wantValid: false,
			wantError: "defaultInputLanguage must not be empty",
		},
		{
			name: "Empty defaultOutputLanguage",
			modify: func(s *models.Settings) {
				s.DefaultOutputLanguage = ""
			},
			wantValid: false,
			wantError: "defaultOutputLanguage must not be empty",
		},
		{
			name: "Temperature below 0",
			modify: func(s *models.Settings) {
				s.Temperature = -0.1
			},
			wantValid: false,
			wantError: "temperature must be greater than 0 and less than 1",
		},
		{
			name: "Temperature 0",
			modify: func(s *models.Settings) {
				s.Temperature = 0
			},
			wantValid: true,
			wantError: "",
		},
		{
			name: "Temperature 1",
			modify: func(s *models.Settings) {
				s.Temperature = 1
			},
			wantValid: true,
			wantError: "",
		},
		{
			name: "Temperature above 1",
			modify: func(s *models.Settings) {
				s.Temperature = 1.1
			},
			wantValid: false,
			wantError: "temperature must be greater than 0 and less than 1",
		},
		{
			name: "Empty languages slice",
			modify: func(s *models.Settings) {
				s.Languages = []string{}
			},
			wantValid: false,
			wantError: "languages must not be empty",
		},
		{
			name: "Valid http baseUrl",
			modify: func(s *models.Settings) {
				s.BaseUrl = "http://example.com"
			},
			wantValid: true,
		},
		{
			name: "Valid https baseUrl",
			modify: func(s *models.Settings) {
				s.BaseUrl = "https://api.example.com"
			},
			wantValid: true,
		},
		{
			name: "Valid temperature range (0.0001)",
			modify: func(s *models.Settings) {
				s.Temperature = 0.0001
			},
			wantValid: true,
		},
		{
			name: "Valid temperature range (0.9999)",
			modify: func(s *models.Settings) {
				s.Temperature = 0.9999
			},
			wantValid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			settings := *validSettings // Copy the valid settings
			tt.modify(&settings)

			valid, err := validators.IsSettingsValid(&settings)

			assert.Equal(t, tt.wantValid, valid)
			if tt.wantError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantError)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestIsAppActionObjWrapperValid(t *testing.T) {
	validObj := &models.AppActionObjWrapper{
		ActionID:             "1",
		ActionInput:          "Test input",
		ActionInputLanguage:  "English",
		ActionOutputLanguage: "Ukrainian",
	}

	tests := []struct {
		name          string
		modify        func(*models.AppActionObjWrapper)
		isTranslation bool
		wantValid     bool
		wantError     string
	}{
		{
			name:          "Valid non-translation action",
			modify:        func(o *models.AppActionObjWrapper) {},
			isTranslation: false,
			wantValid:     true,
		},
		{
			name:          "Valid translation action",
			modify:        func(o *models.AppActionObjWrapper) {},
			isTranslation: true,
			wantValid:     true,
		},
		{
			name: "Empty actionID",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionID = ""
			},
			isTranslation: false,
			wantValid:     false,
			wantError:     "invalid action id",
		},
		{
			name: "Whitespace actionID",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionID = "   \t"
			},
			isTranslation: false,
			wantValid:     false,
			wantError:     "invalid action id",
		},
		{
			name: "Empty actionInput",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionInput = ""
			},
			isTranslation: false,
			wantValid:     false,
			wantError:     "invalid action input",
		},
		{
			name: "Whitespace actionInput",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionInput = "\n"
			},
			isTranslation: false,
			wantValid:     false,
			wantError:     "invalid action input",
		},
		{
			name: "Empty inputLanguage (translation)",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionInputLanguage = ""
			},
			isTranslation: true,
			wantValid:     false,
			wantError:     "invalid action inputLanguage",
		},
		{
			name: "Whitespace inputLanguage (translation)",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionInputLanguage = " \t"
			},
			isTranslation: true,
			wantValid:     false,
			wantError:     "invalid action inputLanguage",
		},
		{
			name: "Empty outputLanguage (translation)",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionOutputLanguage = ""
			},
			isTranslation: true,
			wantValid:     false,
			wantError:     "invalid action outputLanguage",
		},
		{
			name: "Whitespace outputLanguage (translation)",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionOutputLanguage = "  "
			},
			isTranslation: true,
			wantValid:     false,
			wantError:     "invalid action outputLanguage",
		},
		{
			name: "Non-translation with empty languages (should pass)",
			modify: func(o *models.AppActionObjWrapper) {
				o.ActionInputLanguage = ""
				o.ActionOutputLanguage = ""
			},
			isTranslation: false,
			wantValid:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			obj := *validObj // Copy the valid object
			tt.modify(&obj)

			valid, err := validators.IsAppActionObjWrapperValid(&obj, tt.isTranslation)

			assert.Equal(t, tt.wantValid, valid)
			if tt.wantError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantError)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestIsAppActionObjWrapperValidWhenNilPassed(t *testing.T) {
	t.Run("Validate IsSettingsValid when nil is passed", func(t *testing.T) {
		got, err := validators.IsAppActionObjWrapperValid(nil, false)
		assert.False(t, got)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "appActionObjWrapper must not be nil")
	})
}

func TestIsSettingsValidWhenNilPassed(t *testing.T) {
	t.Run("Validate IsSettingsValid when nil is passed", func(t *testing.T) {
		got, err := validators.IsSettingsValid(nil)
		assert.False(t, got)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "settings cannot be nil")
	})
}
