package settings

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"go_text/internal/apperr"
	"go_text/internal/file"
	"go_text/internal/logging"

	"github.com/rs/zerolog"
)

const settingsComponent = "settings"

// minWindowWidth/minWindowHeight are the app's minimum native window
// dimensions. They must stay in sync with MinimalWidth/MinimalHeight in main.go.
const minWindowWidth = 830
const minWindowHeight = 550

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
	GetUIPreferencesConfig() (*UIPreferencesConfig, error)
	UpdateUIPreferencesConfig(cfg *UIPreferencesConfig) (*UIPreferencesConfig, error)
	GetLoggingConfig() (*LoggingConfig, error)
	UpdateLoggingConfig(cfg *LoggingConfig) (*LoggingConfig, error)
	GetWindowSizeConfig() (*WindowSizeConfig, error)
	SaveWindowSize(width, height int) error
}

// ── Service implementation ─────────────────────────────────────────────────

type SettingsService struct {
	logger       *logging.Logger
	settingsRepo SettingsRepositoryAPI
	fileUtils    file.FileUtilsServiceAPI
}

// NewSettingsService constructs the settings service.
// settingsRepo may be nil at construction time (DI is completed in Init).
func NewSettingsService(log *logging.Logger, settingsRepo SettingsRepositoryAPI, fileUtils file.FileUtilsServiceAPI) *SettingsService {
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

// log returns a sub-logger stamped with the calling method's op and the
// package component, matching the structured pattern used in internal/actions.
func (s *SettingsService) log(op string) zerolog.Logger {
	return s.logger.WithOp(op).With().Str("component", settingsComponent).Logger()
}

// SetRepository replaces the repository. Called from application.Init() after DB open.
func (s *SettingsService) SetRepository(repo SettingsRepositoryAPI) {
	s.settingsRepo = repo
}

func (s *SettingsService) GetAppSettingsMetadata() (*AppSettingsMetadata, error) {
	const op = "SettingsService.GetAppSettingsMetadata"
	lg := s.log(op)
	lg.Info().Msg("retrieving application settings metadata")

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
	// Ensure (not just resolve) the folder so the path returned to the UI exists
	// on disk; otherwise the "Open logs folder" action fails OpenPath's os.Stat
	// check when file logging is disabled and startup never created it.
	logsFolder, err := s.fileUtils.EnsureAppLogsFolderExists(logDir)
	if err != nil {
		lg.Warn().Err(err).Msg("could not ensure logs folder")
		// Fall back to the resolved (possibly non-existent) path so it still displays.
		if resolved, rErr := s.fileUtils.ResolveAppLogsFolderPath(logDir); rErr == nil {
			logsFolder = resolved
		} else {
			logsFolder = ""
		}
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
	lg := s.log(op)
	lg.Info().Msg("resetting settings to default")
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
	if providerId == "" {
		return nil, apperr.Validation("providerId", "non-empty UUID", "empty string")
	}
	return s.settingsRepo.GetProvider(providerId)
}

func (s *SettingsService) CreateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	const op = "SettingsService.CreateProviderConfig"
	lg := s.log(op)
	lg.Info().Str("provider", cfg.Name).Msg("creating provider")
	if err := ValidateProviderConfig(cfg); err != nil {
		return nil, apperr.Validation("provider config", "valid fields", err.Error())
	}
	return s.settingsRepo.CreateProvider(cfg)
}

func (s *SettingsService) UpdateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	const op = "SettingsService.UpdateProviderConfig"
	lg := s.log(op)
	lg.Info().Str("providerId", cfg.ID).Msg("updating provider")
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
	lg := s.log(op)
	lg.Info().Str("providerId", providerId).Msg("deleting provider")
	if providerId == "" {
		return apperr.Validation("providerId", "non-empty UUID", "empty string")
	}
	if err := s.settingsRepo.DeleteProvider(providerId); err != nil {
		return err
	}
	// The repository already reassigned app_state.current_provider_id (or
	// cleared it, if no provider remains); resync the active model to match.
	current, err := s.settingsRepo.GetCurrentProvider()
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if err := s.syncModelToProvider(current); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *SettingsService) SetAsCurrentProviderConfig(providerId string) (*ProviderConfig, error) {
	const op = "SettingsService.SetAsCurrentProviderConfig"
	if providerId == "" {
		return nil, apperr.Validation("providerId", "non-empty UUID", "empty string")
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
	if err := s.syncModelToProvider(p); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return p, nil
}

// syncModelToProvider pulls p's stored SelectedModel into the global active
// model, so a run never inherits a model left over from a previously-current
// provider. p may be nil (no provider left), which clears the active model.
// Shared by every path that changes which provider is current.
func (s *SettingsService) syncModelToProvider(p *ProviderConfig) error {
	modelCfg, err := s.settingsRepo.GetModelConfig()
	if err != nil {
		return err
	}
	target := ""
	if p != nil {
		target = p.SelectedModel
	}
	if modelCfg.Name == target {
		return nil
	}
	modelCfg.Name = target
	return s.settingsRepo.UpdateModelConfig(modelCfg)
}

// syncModelToCurrentProvider pushes a newly-active model name onto the
// current provider's SelectedModel, so it is remembered per-provider and
// survives a switch away and back. No-op if there is no current provider.
func (s *SettingsService) syncModelToCurrentProvider(modelName string) error {
	current, err := s.settingsRepo.GetCurrentProvider()
	if err != nil {
		return err
	}
	if current == nil || current.SelectedModel == modelName {
		return nil
	}
	current.SelectedModel = modelName
	_, err = s.settingsRepo.UpdateProvider(current)
	return err
}

func (s *SettingsService) GetInferenceBaseConfig() (*InferenceBaseConfig, error) {
	return s.settingsRepo.GetInferenceConfig()
}

func (s *SettingsService) UpdateInferenceBaseConfig(cfg *InferenceBaseConfig) (*InferenceBaseConfig, error) {
	const op = "SettingsService.UpdateInferenceBaseConfig"
	if cfg.Timeout < 1 || cfg.Timeout > 600 {
		return nil, apperr.Validation("timeout", "1–600 seconds", fmt.Sprintf("%d", cfg.Timeout))
	}
	if cfg.MaxRetries < 0 || cfg.MaxRetries > 10 {
		return nil, apperr.Validation("maxRetries", "0–10", fmt.Sprintf("%d", cfg.MaxRetries))
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
		return nil, apperr.Validation("temperature", "0–2 when enabled", fmt.Sprintf("%v", cfg.Temperature))
	}
	if cfg.UseContextWindow && (cfg.ContextWindow < 1024 || cfg.ContextWindow > 200000) {
		return nil, apperr.Validation("contextWindow", "1024–200000 when enabled", fmt.Sprintf("%d", cfg.ContextWindow))
	}
	if cfg.UseMaxOutputTokens && (cfg.MaxOutputTokens < 1 || cfg.MaxOutputTokens > 32000) {
		return nil, apperr.Validation("maxOutputTokens", "1–32000 when enabled", fmt.Sprintf("%d", cfg.MaxOutputTokens))
	}
	if cfg.UseContextWindow && cfg.UseMaxOutputTokens && cfg.MaxOutputTokens >= cfg.ContextWindow {
		return nil, apperr.Validation(
			"maxOutputTokens",
			fmt.Sprintf("less than contextWindow (%d) when both are enabled", cfg.ContextWindow),
			fmt.Sprintf("%d", cfg.MaxOutputTokens),
		)
	}
	if err := s.settingsRepo.UpdateModelConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if err := s.syncModelToCurrentProvider(cfg.Name); err != nil {
		return nil, fmt.Errorf("%s: sync model to current provider: %w", op, err)
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
		return apperr.Validation("language", "non-empty string", "empty string")
	}
	langCfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if !containsIgnoreCase(langCfg.Languages, language) {
		return apperr.Validation("language", "one of the configured supported languages", language)
	}
	return s.settingsRepo.SetDefaultInputLanguage(language)
}

func (s *SettingsService) SetDefaultOutputLanguage(language string) error {
	const op = "SettingsService.SetDefaultOutputLanguage"
	language = strings.TrimSpace(language)
	if language == "" {
		return apperr.Validation("language", "non-empty string", "empty string")
	}
	langCfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	if !containsIgnoreCase(langCfg.Languages, language) {
		return apperr.Validation("language", "one of the configured supported languages", language)
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
		return nil, apperr.Validation("language", "non-empty string", "empty string")
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
		return nil, apperr.Validation("language", "non-empty string", "empty string")
	}
	langCfg, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if strings.ToLower(language) == strings.ToLower(langCfg.DefaultInputLanguage) {
		return nil, apperr.Validation("language", "is the current default input language and cannot be removed", language)
	}
	if strings.ToLower(language) == strings.ToLower(langCfg.DefaultOutputLanguage) {
		return nil, apperr.Validation("language", "is the current default output language and cannot be removed", language)
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
	if cfg.HistoryMaxEntries < 10 || cfg.HistoryMaxEntries > 1000 {
		return nil, apperr.Validation("historyMaxEntries", "10–1000", fmt.Sprintf("%d", cfg.HistoryMaxEntries))
	}
	if err := s.settingsRepo.UpdateAppBehaviorConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg, nil
}

func (s *SettingsService) GetUIPreferencesConfig() (*UIPreferencesConfig, error) {
	return s.settingsRepo.GetUIPreferencesConfig()
}

func (s *SettingsService) UpdateUIPreferencesConfig(cfg *UIPreferencesConfig) (*UIPreferencesConfig, error) {
	const op = "SettingsService.UpdateUIPreferencesConfig"
	switch cfg.Theme {
	case "auto", "light", "dark":
		// valid
	default:
		return nil, apperr.Validation("theme", "one of auto|light|dark", cfg.Theme)
	}
	switch cfg.Layout {
	case "", "side", "stacked":
		// valid; empty means "use default"
	default:
		return nil, apperr.Validation("layout", "one of side|stacked", cfg.Layout)
	}
	switch cfg.ViewMode {
	case "", "preview", "source", "diff":
		// valid; empty means "use default"
	default:
		return nil, apperr.Validation("viewMode", "one of preview|source|diff", cfg.ViewMode)
	}
	if err := s.settingsRepo.UpdateUIPreferencesConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg, nil
}

func (s *SettingsService) GetLoggingConfig() (*LoggingConfig, error) {
	return s.settingsRepo.GetLoggingConfig()
}

func (s *SettingsService) UpdateLoggingConfig(cfg *LoggingConfig) (*LoggingConfig, error) {
	const op = "SettingsService.UpdateLoggingConfig"
	if err := s.settingsRepo.UpdateLoggingConfig(cfg); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return cfg, nil
}

func (s *SettingsService) GetWindowSizeConfig() (*WindowSizeConfig, error) {
	return s.settingsRepo.GetWindowSizeConfig()
}

func (s *SettingsService) SaveWindowSize(width, height int) error {
	const op = "SettingsService.SaveWindowSize"
	if width < minWindowWidth || height < minWindowHeight {
		return apperr.Validation("windowSize", "at least 830x550", fmt.Sprintf("%dx%d", width, height))
	}
	cfg := &WindowSizeConfig{Width: width, Height: height}
	if err := s.settingsRepo.UpdateWindowSizeConfig(cfg); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}
