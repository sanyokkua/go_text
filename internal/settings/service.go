package settings

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"go_text/internal/apperr"
	"go_text/internal/file"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

// ── Validation helpers ─────────────────────────────────────────────────────

// ValidateBaseURL checks URL format, scheme, and trailing slash.
func ValidateBaseURL(baseURL string) error {
	if baseURL == "" {
		return errors.New("base URL cannot be empty")
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("invalid base URL format: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("invalid URL scheme %q, must be http or https", u.Scheme)
	}
	if !strings.HasSuffix(u.Path, "/") {
		return errors.New("base URL must end with a trailing slash")
	}
	return nil
}

// ValidateProviderConfig validates v3 ProviderConfig fields.
func ValidateProviderConfig(cfg *ProviderConfig) error {
	if cfg == nil {
		return errors.New("provider config is nil")
	}
	if cfg.Name == "" {
		return errors.New("provider name cannot be empty")
	}
	if !isValidKind(cfg.Kind) {
		return fmt.Errorf("invalid provider kind %q", cfg.Kind)
	}
	if err := ValidateBaseURL(cfg.BaseURL); err != nil {
		return fmt.Errorf("invalid base URL: %w", err)
	}
	if !isValidAuthScheme(cfg.AuthScheme) {
		return fmt.Errorf("invalid auth scheme %q", cfg.AuthScheme)
	}
	if cfg.AuthScheme != "none" && cfg.APIKeyEnvVar == "" {
		return fmt.Errorf("apiKeyEnvVar required for auth scheme %q", cfg.AuthScheme)
	}
	if cfg.UseCustomModels && len(cfg.CustomModels) == 0 {
		return errors.New("customModels required when useCustomModels is true")
	}
	return nil
}

// ── Service interface ──────────────────────────────────────────────────────

// SettingsServiceAPI is the contract consumed by the handler and tasklog.
type SettingsServiceAPI interface {
	GetAppSettingsMetadata() (*AppSettingsMetadata, error)
	GetSettings() (*Settings, error)
	ResetSettingsToDefault() (*Settings, error)
	GetAllProviderConfigs() ([]ProviderConfig, error)
	GetCurrentProviderConfig() (*ProviderConfig, error)
	GetProviderConfig(providerId string) (*ProviderConfig, error)
	CreateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error)
	UpdateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error)
	DeleteProviderConfig(providerId string) error
	SetAsCurrentProviderConfig(providerId string) (*ProviderConfig, error)
	GetInferenceBaseConfig() (*InferenceBaseConfig, error)
	UpdateInferenceBaseConfig(cfg *InferenceBaseConfig) (*InferenceBaseConfig, error)
	GetModelConfig() (*ModelConfig, error)
	UpdateModelConfig(cfg *ModelConfig) (*ModelConfig, error)
	GetLanguageConfig() (*LanguageConfig, error)
	SetDefaultInputLanguage(language string) error
	SetDefaultOutputLanguage(language string) error
	AddLanguage(language string) ([]string, error)
	RemoveLanguage(language string) ([]string, error)
	GetAppBehaviorConfig() (*AppBehaviorConfig, error)
	UpdateAppBehaviorConfig(cfg *AppBehaviorConfig) (*AppBehaviorConfig, error)
	GetLoggingConfig() (*LoggingConfig, error)
	UpdateLoggingConfig(cfg *LoggingConfig) (*LoggingConfig, error)
}

// ── Service implementation ─────────────────────────────────────────────────

type SettingsService struct {
	logger       logger.Logger
	settingsRepo SettingsRepositoryAPI
	fileUtils    file.FileUtilsServiceAPI
}

// NewSettingsService constructs the settings service.
// settingsRepo may be nil at construction time (DI is completed in Init).
func NewSettingsService(log logger.Logger, settingsRepo SettingsRepositoryAPI, fileUtils file.FileUtilsServiceAPI) *SettingsService {
	if log == nil {
		panic("SettingsService: logger cannot be nil")
	}
	if fileUtils == nil {
		panic("SettingsService: fileUtils cannot be nil")
	}
	return &SettingsService{
		logger:       log,
		settingsRepo: settingsRepo,
		fileUtils:    fileUtils,
	}
}

// SetRepository replaces the repository. Called from application.Init() after DB open.
func (s *SettingsService) SetRepository(repo SettingsRepositoryAPI) {
	s.settingsRepo = repo
}

func (s *SettingsService) GetAppSettingsMetadata() (*AppSettingsMetadata, error) {
	const op = "SettingsService.GetAppSettingsMetadata"
	s.logger.Info(fmt.Sprintf("%s: retrieving application settings metadata", op))

	folderPath, err := s.fileUtils.GetAppSettingsFolderPath()
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	dbPath, err := s.fileUtils.GetAppDatabaseFilePath()
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	var logDir string
	if logCfg, err := s.settingsRepo.GetLoggingConfig(); err == nil && logCfg != nil {
		logDir = logCfg.LogDirectory
	}
	logsFolder, err := s.fileUtils.ResolveAppLogsFolderPath(logDir)
	if err != nil {
		s.logger.Warning(fmt.Sprintf("%s: could not resolve logs folder: %v", op, err))
		logsFolder = ""
	}

	return &AppSettingsMetadata{
		AuthSchemes:    AuthSchemes,
		ProviderKinds:  ProviderKinds,
		SettingsFolder: folderPath,
		DatabaseFile:   dbPath,
		LogsFolder:     logsFolder,
		AppVersion:     AppVersion,
	}, nil
}

func (s *SettingsService) GetSettings() (*Settings, error) {
	const op = "SettingsService.GetSettings"

	providers, err := s.settingsRepo.ListProviders()
	if err != nil {
		return nil, fmt.Errorf("%s: list providers: %w", op, err)
	}
	current, err := s.settingsRepo.GetCurrentProvider()
	if err != nil {
		return nil, fmt.Errorf("%s: current provider: %w", op, err)
	}
	inferCfg, err := s.settingsRepo.GetInferenceConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: inference config: %w", op, err)
	}
	modelCfg, err := s.settingsRepo.GetModelConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: model config: %w", op, err)
	}
	langCfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: language config: %w", op, err)
	}
	appCfg, err := s.settingsRepo.GetAppBehaviorConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: app behavior config: %w", op, err)
	}

	var currentProvider ProviderConfig
	if current != nil {
		currentProvider = *current
	}
	return &Settings{
		AvailableProviderConfigs: providers,
		CurrentProviderConfig:    currentProvider,
		InferenceBaseConfig:      *inferCfg,
		ModelConfig:              *modelCfg,
		LanguageConfig:           *langCfg,
		AppBehaviorConfig:        *appCfg,
	}, nil
}

func (s *SettingsService) ResetSettingsToDefault() (*Settings, error) {
	const op = "SettingsService.ResetSettingsToDefault"
	s.logger.Info(fmt.Sprintf("%s: resetting settings to default", op))
	if err := s.settingsRepo.ResetToDefaults(); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return s.GetSettings()
}

func (s *SettingsService) GetAllProviderConfigs() ([]ProviderConfig, error) {
	return s.settingsRepo.ListProviders()
}

func (s *SettingsService) GetCurrentProviderConfig() (*ProviderConfig, error) {
	const op = "SettingsService.GetCurrentProviderConfig"
	p, err := s.settingsRepo.GetCurrentProvider()
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if p == nil {
		return nil, fmt.Errorf("%s: no current provider configured", op)
	}
	return p, nil
}

func (s *SettingsService) GetProviderConfig(providerId string) (*ProviderConfig, error) {
	const op = "SettingsService.GetProviderConfig"
	if providerId == "" {
		return nil, fmt.Errorf("%s: provider ID cannot be empty", op)
	}
	return s.settingsRepo.GetProvider(providerId)
}

func (s *SettingsService) CreateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	const op = "SettingsService.CreateProviderConfig"
	s.logger.Info(fmt.Sprintf("%s: creating provider %q", op, cfg.Name))
	if err := ValidateProviderConfig(cfg); err != nil {
		return nil, apperr.Validation("provider config", "valid fields", err.Error())
	}
	return s.settingsRepo.CreateProvider(cfg)
}

func (s *SettingsService) UpdateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	const op = "SettingsService.UpdateProviderConfig"
	s.logger.Info(fmt.Sprintf("%s: updating provider %s", op, cfg.ID))
	if cfg.ID == "" {
		return nil, apperr.Validation("providerId", "non-empty UUID", "empty string")
	}
	if err := ValidateProviderConfig(cfg); err != nil {
		return nil, apperr.Validation("provider config", "valid fields", err.Error())
	}
	return s.settingsRepo.UpdateProvider(cfg)
}

func (s *SettingsService) DeleteProviderConfig(providerId string) error {
	const op = "SettingsService.DeleteProviderConfig"
	s.logger.Info(fmt.Sprintf("%s: deleting provider %s", op, providerId))
	if providerId == "" {
		return fmt.Errorf("%s: provider ID cannot be empty", op)
	}
	return s.settingsRepo.DeleteProvider(providerId)
}

func (s *SettingsService) SetAsCurrentProviderConfig(providerId string) (*ProviderConfig, error) {
	const op = "SettingsService.SetAsCurrentProviderConfig"
	if providerId == "" {
		return nil, fmt.Errorf("%s: provider ID cannot be empty", op)
	}
	p, err := s.settingsRepo.GetProvider(providerId)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if err := s.settingsRepo.SetCurrentProvider(providerId); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	// Sync the active model to the newly-current provider's selected model so a
	// run never uses a stale model carried over from the previous provider.
	modelCfg, mErr := s.settingsRepo.GetModelConfig()
	if mErr == nil && modelCfg != nil && modelCfg.Name != p.SelectedModel {
		modelCfg.Name = p.SelectedModel
		if uErr := s.settingsRepo.UpdateModelConfig(modelCfg); uErr != nil {
			return nil, fmt.Errorf("%s: sync model to provider: %w", op, uErr)
		}
	}
	return p, nil
}

func (s *SettingsService) GetInferenceBaseConfig() (*InferenceBaseConfig, error) {
	return s.settingsRepo.GetInferenceConfig()
}

func (s *SettingsService) UpdateInferenceBaseConfig(cfg *InferenceBaseConfig) (*InferenceBaseConfig, error) {
	const op = "SettingsService.UpdateInferenceBaseConfig"
	if cfg.Timeout < 1 || cfg.Timeout > 600 {
		return nil, fmt.Errorf("%s: timeout must be 1–600 seconds", op)
	}
	if cfg.MaxRetries < 0 || cfg.MaxRetries > 10 {
		return nil, fmt.Errorf("%s: maxRetries must be 0–10", op)
	}
	if err := s.settingsRepo.UpdateInferenceConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg, nil
}

func (s *SettingsService) GetModelConfig() (*ModelConfig, error) {
	return s.settingsRepo.GetModelConfig()
}

func (s *SettingsService) UpdateModelConfig(cfg *ModelConfig) (*ModelConfig, error) {
	const op = "SettingsService.UpdateModelConfig"
	if cfg.UseTemperature && (cfg.Temperature < 0 || cfg.Temperature > 2) {
		return nil, fmt.Errorf("%s: temperature must be 0–2 when enabled", op)
	}
	if cfg.UseContextWindow && (cfg.ContextWindow < 1024 || cfg.ContextWindow > 200000) {
		return nil, fmt.Errorf("%s: contextWindow must be 1024–200000 when enabled", op)
	}
	if err := s.settingsRepo.UpdateModelConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg, nil
}

func (s *SettingsService) GetLanguageConfig() (*LanguageConfig, error) {
	return s.settingsRepo.GetLanguageConfig()
}

func (s *SettingsService) SetDefaultInputLanguage(language string) error {
	const op = "SettingsService.SetDefaultInputLanguage"
	language = strings.TrimSpace(language)
	if language == "" {
		return fmt.Errorf("%s: language cannot be empty", op)
	}
	langCfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if !containsIgnoreCase(langCfg.Languages, language) {
		return fmt.Errorf("%s: language %q not in supported languages", op, language)
	}
	return s.settingsRepo.SetDefaultInputLanguage(language)
}

func (s *SettingsService) SetDefaultOutputLanguage(language string) error {
	const op = "SettingsService.SetDefaultOutputLanguage"
	language = strings.TrimSpace(language)
	if language == "" {
		return fmt.Errorf("%s: language cannot be empty", op)
	}
	langCfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if !containsIgnoreCase(langCfg.Languages, language) {
		return fmt.Errorf("%s: language %q not in supported languages", op, language)
	}
	return s.settingsRepo.SetDefaultOutputLanguage(language)
}

func containsIgnoreCase(list []string, item string) bool {
	lowerItem := strings.ToLower(item)
	for _, i := range list {
		if strings.ToLower(i) == lowerItem {
			return true
		}
	}
	return false
}

func (s *SettingsService) AddLanguage(language string) ([]string, error) {
	const op = "SettingsService.AddLanguage"
	language = strings.TrimSpace(language)
	if language == "" {
		return nil, fmt.Errorf("%s: language cannot be empty", op)
	}
	if err := s.settingsRepo.AddLanguage(language); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	cfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg.Languages, nil
}

func (s *SettingsService) RemoveLanguage(language string) ([]string, error) {
	const op = "SettingsService.RemoveLanguage"
	language = strings.TrimSpace(language)
	if language == "" {
		return nil, fmt.Errorf("%s: language cannot be empty", op)
	}
	langCfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if strings.ToLower(language) == strings.ToLower(langCfg.DefaultInputLanguage) {
		return nil, fmt.Errorf("%s: cannot remove default input language %q", op, language)
	}
	if strings.ToLower(language) == strings.ToLower(langCfg.DefaultOutputLanguage) {
		return nil, fmt.Errorf("%s: cannot remove default output language %q", op, language)
	}
	if err := s.settingsRepo.RemoveLanguage(language); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	updated, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return updated.Languages, nil
}

func (s *SettingsService) GetAppBehaviorConfig() (*AppBehaviorConfig, error) {
	return s.settingsRepo.GetAppBehaviorConfig()
}

func (s *SettingsService) UpdateAppBehaviorConfig(cfg *AppBehaviorConfig) (*AppBehaviorConfig, error) {
	const op = "SettingsService.UpdateAppBehaviorConfig"
	if cfg == nil {
		return nil, fmt.Errorf("%s: config cannot be nil", op)
	}
	if cfg.HistoryMaxEntries < 10 {
		cfg.HistoryMaxEntries = 10
	}
	if cfg.HistoryMaxEntries > 1000 {
		cfg.HistoryMaxEntries = 1000
	}
	if err := s.settingsRepo.UpdateAppBehaviorConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg, nil
}

func (s *SettingsService) GetLoggingConfig() (*LoggingConfig, error) {
	return s.settingsRepo.GetLoggingConfig()
}

func (s *SettingsService) UpdateLoggingConfig(cfg *LoggingConfig) (*LoggingConfig, error) {
	const op = "SettingsService.UpdateLoggingConfig"
	if cfg == nil {
		return nil, fmt.Errorf("%s: config cannot be nil", op)
	}
	if err := s.settingsRepo.UpdateLoggingConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg, nil
}
