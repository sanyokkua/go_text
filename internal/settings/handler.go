package settings

import (
	"fmt"

	"go_text/internal/apperr"

	"github.com/rs/zerolog"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

// SettingsHandlerAPI defines the Wails-bound settings method contract.
type SettingsHandlerAPI interface {
	GetAppSettingsMetadata() apperr.MetadataResult
	GetSettings() apperr.SettingsResult
	ResetSettingsToDefault() apperr.SettingsResult
	GetAllProviderConfigs() apperr.ProvidersResult
	GetCurrentProviderConfig() apperr.ProviderResult
	GetProviderConfig(providerId string) apperr.ProviderResult
	CreateProviderConfig(cfg apperr.ProviderConfig) apperr.ProviderResult
	UpdateProviderConfig(cfg apperr.ProviderConfig) apperr.ProviderResult
	DeleteProviderConfig(providerId string) apperr.VoidResult
	SetAsCurrentProviderConfig(providerId string) apperr.ProviderResult
	GetInferenceBaseConfig() apperr.InferenceResult
	UpdateInferenceBaseConfig(cfg apperr.InferenceBaseConfig) apperr.InferenceResult
	GetModelConfig() apperr.ModelConfigResult
	UpdateModelConfig(cfg apperr.ModelConfig) apperr.ModelConfigResult
	GetLanguageConfig() apperr.LanguageResult
	SetDefaultInputLanguage(language string) apperr.VoidResult
	SetDefaultOutputLanguage(language string) apperr.VoidResult
	AddLanguage(language string) apperr.LanguagesResult
	RemoveLanguage(language string) apperr.LanguagesResult
	GetAppBehaviorConfig() apperr.AppBehaviorResult
	UpdateAppBehaviorConfig(cfg apperr.AppBehaviorConfig) apperr.AppBehaviorResult
	GetLoggingConfig() apperr.LoggingResult
	UpdateLoggingConfig(cfg apperr.LoggingConfig) apperr.LoggingResult
}

// SettingsHandler is the Wails-bound handler for settings operations.
// It is created before the database is open; Configure() must be called from
// application.Init() before any bound method is dispatched.
type SettingsHandler struct {
	logger          logger.Logger
	zlog            zerolog.Logger
	settingsService SettingsServiceAPI
}

// NewSettingsHandler constructs a SettingsHandler shell.
func NewSettingsHandler(wailsLogger logger.Logger, zlog zerolog.Logger, settingsService SettingsServiceAPI) *SettingsHandler {
	return &SettingsHandler{
		logger:          wailsLogger,
		zlog:            zlog,
		settingsService: settingsService,
	}
}

// Configure wires the fully-initialised service into the already-bound handler.
// Called from application.Init() after the database is open.
func (h *SettingsHandler) Configure(wailsLogger logger.Logger, zlog zerolog.Logger, service SettingsServiceAPI) {
	h.logger = wailsLogger
	h.zlog = zlog
	h.settingsService = service
}

// ── Type adapters ──────────────────────────────────────────────────────────
// Internal settings.* types match apperr.* wire types field-for-field,
// so conversions are direct Go type conversions.

func toWireProvider(v ProviderConfig) apperr.ProviderConfig     { return apperr.ProviderConfig(v) }
func fromWireProvider(v apperr.ProviderConfig) ProviderConfig   { return ProviderConfig(v) }
func toWireInference(v InferenceBaseConfig) apperr.InferenceBaseConfig {
	return apperr.InferenceBaseConfig(v)
}
func fromWireInference(v apperr.InferenceBaseConfig) InferenceBaseConfig {
	return InferenceBaseConfig(v)
}
func toWireModel(v ModelConfig) apperr.ModelConfig       { return apperr.ModelConfig(v) }
func fromWireModel(v apperr.ModelConfig) ModelConfig     { return ModelConfig(v) }
func toWireLanguage(v LanguageConfig) apperr.LanguageConfig { return apperr.LanguageConfig(v) }
func toWireAppBehavior(v AppBehaviorConfig) apperr.AppBehaviorConfig {
	return apperr.AppBehaviorConfig(v)
}
func fromWireAppBehavior(v apperr.AppBehaviorConfig) AppBehaviorConfig {
	return AppBehaviorConfig(v)
}
func toWireLogging(v LoggingConfig) apperr.LoggingConfig   { return apperr.LoggingConfig(v) }
func fromWireLogging(v apperr.LoggingConfig) LoggingConfig { return LoggingConfig(v) }
func toWireMetadata(v AppSettingsMetadata) apperr.AppSettingsMetadata {
	return apperr.AppSettingsMetadata(v)
}

func toWireSettings(v Settings) apperr.Settings {
	providers := make([]apperr.ProviderConfig, len(v.AvailableProviderConfigs))
	for i, p := range v.AvailableProviderConfigs {
		providers[i] = toWireProvider(p)
	}
	return apperr.Settings{
		AvailableProviderConfigs: providers,
		CurrentProviderConfig:    toWireProvider(v.CurrentProviderConfig),
		InferenceBaseConfig:      toWireInference(v.InferenceBaseConfig),
		ModelConfig:              toWireModel(v.ModelConfig),
		LanguageConfig:           toWireLanguage(v.LanguageConfig),
		AppBehaviorConfig:        toWireAppBehavior(v.AppBehaviorConfig),
	}
}

const panicFmt = "panic: %v"

// ── Bound handler methods ──────────────────────────────────────────────────

func (h *SettingsHandler) GetAppSettingsMetadata() (res apperr.MetadataResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.MetadataResult{Error: &wire}
		}
	}()
	meta, err := h.settingsService.GetAppSettingsMetadata()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.MetadataResult{Error: &wire}
	}
	m := toWireMetadata(*meta)
	return apperr.MetadataResult{Data: &m}
}

func (h *SettingsHandler) GetSettings() (res apperr.SettingsResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.SettingsResult{Error: &wire}
		}
	}()
	s, err := h.settingsService.GetSettings()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.SettingsResult{Error: &wire}
	}
	ws := toWireSettings(*s)
	return apperr.SettingsResult{Data: &ws}
}

func (h *SettingsHandler) ResetSettingsToDefault() (res apperr.SettingsResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.SettingsResult{Error: &wire}
		}
	}()
	s, err := h.settingsService.ResetSettingsToDefault()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.SettingsResult{Error: &wire}
	}
	ws := toWireSettings(*s)
	return apperr.SettingsResult{Data: &ws}
}

func (h *SettingsHandler) GetAllProviderConfigs() (res apperr.ProvidersResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ProvidersResult{Error: &wire}
		}
	}()
	cfgs, err := h.settingsService.GetAllProviderConfigs()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProvidersResult{Error: &wire}
	}
	out := make([]apperr.ProviderConfig, len(cfgs))
	for i, c := range cfgs {
		out[i] = toWireProvider(c)
	}
	return apperr.ProvidersResult{Data: out}
}

func (h *SettingsHandler) GetCurrentProviderConfig() (res apperr.ProviderResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ProviderResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.GetCurrentProviderConfig()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProviderResult{Error: &wire}
	}
	p := toWireProvider(*cfg)
	return apperr.ProviderResult{Data: &p}
}

func (h *SettingsHandler) GetProviderConfig(providerId string) (res apperr.ProviderResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ProviderResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.GetProviderConfig(providerId)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProviderResult{Error: &wire}
	}
	p := toWireProvider(*cfg)
	return apperr.ProviderResult{Data: &p}
}

func (h *SettingsHandler) CreateProviderConfig(cfg apperr.ProviderConfig) (res apperr.ProviderResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ProviderResult{Error: &wire}
		}
	}()
	v := fromWireProvider(cfg)
	created, err := h.settingsService.CreateProviderConfig(&v)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProviderResult{Error: &wire}
	}
	p := toWireProvider(*created)
	return apperr.ProviderResult{Data: &p}
}

func (h *SettingsHandler) UpdateProviderConfig(cfg apperr.ProviderConfig) (res apperr.ProviderResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ProviderResult{Error: &wire}
		}
	}()
	v := fromWireProvider(cfg)
	updated, err := h.settingsService.UpdateProviderConfig(&v)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProviderResult{Error: &wire}
	}
	p := toWireProvider(*updated)
	return apperr.ProviderResult{Data: &p}
}

func (h *SettingsHandler) DeleteProviderConfig(providerId string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := h.settingsService.DeleteProviderConfig(providerId); err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}

func (h *SettingsHandler) SetAsCurrentProviderConfig(providerId string) (res apperr.ProviderResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ProviderResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.SetAsCurrentProviderConfig(providerId)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProviderResult{Error: &wire}
	}
	p := toWireProvider(*cfg)
	return apperr.ProviderResult{Data: &p}
}

func (h *SettingsHandler) GetInferenceBaseConfig() (res apperr.InferenceResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.InferenceResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.GetInferenceBaseConfig()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.InferenceResult{Error: &wire}
	}
	ic := toWireInference(*cfg)
	return apperr.InferenceResult{Data: &ic}
}

func (h *SettingsHandler) UpdateInferenceBaseConfig(cfg apperr.InferenceBaseConfig) (res apperr.InferenceResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.InferenceResult{Error: &wire}
		}
	}()
	v := fromWireInference(cfg)
	updated, err := h.settingsService.UpdateInferenceBaseConfig(&v)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.InferenceResult{Error: &wire}
	}
	ic := toWireInference(*updated)
	return apperr.InferenceResult{Data: &ic}
}

func (h *SettingsHandler) GetModelConfig() (res apperr.ModelConfigResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ModelConfigResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.GetModelConfig()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ModelConfigResult{Error: &wire}
	}
	mc := toWireModel(*cfg)
	return apperr.ModelConfigResult{Data: &mc}
}

func (h *SettingsHandler) UpdateModelConfig(cfg apperr.ModelConfig) (res apperr.ModelConfigResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ModelConfigResult{Error: &wire}
		}
	}()
	v := fromWireModel(cfg)
	updated, err := h.settingsService.UpdateModelConfig(&v)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ModelConfigResult{Error: &wire}
	}
	mc := toWireModel(*updated)
	return apperr.ModelConfigResult{Data: &mc}
}

func (h *SettingsHandler) GetLanguageConfig() (res apperr.LanguageResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.LanguageResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.GetLanguageConfig()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.LanguageResult{Error: &wire}
	}
	lc := toWireLanguage(*cfg)
	return apperr.LanguageResult{Data: &lc}
}

func (h *SettingsHandler) SetDefaultInputLanguage(language string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := h.settingsService.SetDefaultInputLanguage(language); err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}

func (h *SettingsHandler) SetDefaultOutputLanguage(language string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := h.settingsService.SetDefaultOutputLanguage(language); err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}

func (h *SettingsHandler) AddLanguage(language string) (res apperr.LanguagesResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.LanguagesResult{Error: &wire}
		}
	}()
	langs, err := h.settingsService.AddLanguage(language)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.LanguagesResult{Error: &wire}
	}
	return apperr.LanguagesResult{Data: langs}
}

func (h *SettingsHandler) RemoveLanguage(language string) (res apperr.LanguagesResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.LanguagesResult{Error: &wire}
		}
	}()
	langs, err := h.settingsService.RemoveLanguage(language)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.LanguagesResult{Error: &wire}
	}
	return apperr.LanguagesResult{Data: langs}
}

func (h *SettingsHandler) GetAppBehaviorConfig() (res apperr.AppBehaviorResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.AppBehaviorResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.GetAppBehaviorConfig()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.AppBehaviorResult{Error: &wire}
	}
	ab := toWireAppBehavior(*cfg)
	return apperr.AppBehaviorResult{Data: &ab}
}

func (h *SettingsHandler) UpdateAppBehaviorConfig(cfg apperr.AppBehaviorConfig) (res apperr.AppBehaviorResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.AppBehaviorResult{Error: &wire}
		}
	}()
	v := fromWireAppBehavior(cfg)
	updated, err := h.settingsService.UpdateAppBehaviorConfig(&v)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.AppBehaviorResult{Error: &wire}
	}
	ab := toWireAppBehavior(*updated)
	return apperr.AppBehaviorResult{Data: &ab}
}

func (h *SettingsHandler) GetLoggingConfig() (res apperr.LoggingResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.LoggingResult{Error: &wire}
		}
	}()
	cfg, err := h.settingsService.GetLoggingConfig()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.LoggingResult{Error: &wire}
	}
	lc := toWireLogging(*cfg)
	return apperr.LoggingResult{Data: &lc}
}

func (h *SettingsHandler) UpdateLoggingConfig(cfg apperr.LoggingConfig) (res apperr.LoggingResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.LoggingResult{Error: &wire}
		}
	}()
	v := fromWireLogging(cfg)
	updated, err := h.settingsService.UpdateLoggingConfig(&v)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.LoggingResult{Error: &wire}
	}
	lc := toWireLogging(*updated)
	return apperr.LoggingResult{Data: &lc}
}
