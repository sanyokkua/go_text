package settings

import (
	"fmt"

	"go_text/internal/apperr"

	"github.com/rs/zerolog"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

// SettingsHandlerAPI defines the contract for bound settings methods.
// All methods return an apperr.*Result envelope — no separate error return.
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
}

// SettingsHandler is the Wails-bound handler for settings operations.
// Each method follows the envelope pattern: named return + defer/recover for panic
// safety, apperr.ToWire for service errors, and an apperr.*Result return type.
type SettingsHandler struct {
	logger          logger.Logger
	zlog            zerolog.Logger
	settingsService SettingsServiceAPI
}

// NewSettingsHandler constructs a SettingsHandler. wailsLogger may be nil in
// tests; zlog is used only by apperr.ToWire.
func NewSettingsHandler(wailsLogger logger.Logger, zlog zerolog.Logger, settingsService SettingsServiceAPI) *SettingsHandler {
	return &SettingsHandler{
		logger:          wailsLogger,
		zlog:            zlog,
		settingsService: settingsService,
	}
}

// ─── V2 → V3 type adapters ────────────────────────────────────────────────
// These convert the v2 settings.* types (returned by the JSON-backed service)
// to the v3 apperr.* wire types. Fields that exist only in v3 are zero-valued
// here; T06 replaces the service implementation and these adapters entirely.

func toWireProviderConfig(v ProviderConfig) apperr.ProviderConfig {
	return apperr.ProviderConfig{
		ID:              v.ProviderID,
		Name:            v.ProviderName,
		Kind:            string(v.ProviderType),
		BaseURL:         v.BaseUrl,
		AuthScheme:      string(v.AuthType),
		APIKeyEnvVar:    v.EnvVarTokenName, // env-var NAME only — never the secret value
		APIVersion:      "",                 // v3 field; T06 adds
		SelectedModel:   "",                 // v3 field; T06 adds
		CompletionPath:  v.CompletionEndpoint,
		ModelsPath:      v.ModelsEndpoint,
		UseCustomModels: v.UseCustomModels,
		Headers:         v.Headers,
		CustomModels:    v.CustomModels,
		CreatedAt:       0, // v3 field; T06 adds
		UpdatedAt:       0, // v3 field; T06 adds
	}
}

func fromWireProviderConfig(v apperr.ProviderConfig) ProviderConfig {
	return ProviderConfig{
		ProviderID:          v.ID,
		ProviderName:        v.Name,
		ProviderType:        ProviderType(v.Kind),
		BaseUrl:             v.BaseURL,
		CompletionEndpoint:  v.CompletionPath,
		ModelsEndpoint:      v.ModelsPath,
		AuthType:            AuthType(v.AuthScheme),
		AuthToken:           "",                   // never accepted from the wire
		UseAuthTokenFromEnv: v.APIKeyEnvVar != "",
		EnvVarTokenName:     v.APIKeyEnvVar,
		UseCustomHeaders:    len(v.Headers) > 0,
		Headers:             v.Headers,
		UseCustomModels:     v.UseCustomModels,
		CustomModels:        v.CustomModels,
	}
}

func toWireAppBehaviorConfig(v AppBehaviorConfig) apperr.AppBehaviorConfig {
	return apperr.AppBehaviorConfig{
		EnableTaskLogging: v.EnableTaskLogging,
		HistoryEnabled:    false, // v3 field; T06 adds
		HistoryMaxEntries: 0,     // v3 field; T06 adds
	}
}

func fromWireAppBehaviorConfig(v apperr.AppBehaviorConfig) AppBehaviorConfig {
	return AppBehaviorConfig{
		EnableTaskLogging: v.EnableTaskLogging,
		LogDirectory:      "", // v3 uses LoggingConfig for this; T06 removes field
	}
}

func toWireSettings(v Settings) apperr.Settings {
	providers := make([]apperr.ProviderConfig, len(v.AvailableProviderConfigs))
	for i, p := range v.AvailableProviderConfigs {
		providers[i] = toWireProviderConfig(p)
	}
	return apperr.Settings{
		AvailableProviderConfigs: providers,
		CurrentProviderConfig:    toWireProviderConfig(v.CurrentProviderConfig),
		InferenceBaseConfig:      apperr.InferenceBaseConfig(v.InferenceBaseConfig),
		ModelConfig:              apperr.ModelConfig(v.ModelConfig),
		LanguageConfig:           apperr.LanguageConfig(v.LanguageConfig),
		AppBehaviorConfig:        toWireAppBehaviorConfig(v.AppBehaviorConfig),
	}
}

func toWireAppSettingsMetadata(v AppSettingsMetadata) apperr.AppSettingsMetadata {
	authSchemes := make([]string, len(v.AuthTypes))
	for i, a := range v.AuthTypes {
		authSchemes[i] = string(a)
	}
	providerKinds := make([]string, len(v.ProviderTypes))
	for i, p := range v.ProviderTypes {
		providerKinds[i] = string(p)
	}
	return apperr.AppSettingsMetadata{
		AuthSchemes:    authSchemes,
		ProviderKinds:  providerKinds,
		SettingsFolder: v.SettingsFolder,
		DatabaseFile:   v.SettingsFile, // v2 JSON path; T06 replaces with DB path
		LogsFolder:     v.LogsFolder,
		AppVersion:     "", // v3 field; T06 adds
	}
}

// panicFmt is the format string used when converting a panic value to an error.
const panicFmt = "panic: %v"

// ─── Bound handler methods ────────────────────────────────────────────────
// Envelope pattern: named return + defer/recover catches panics and converts
// them to CodeInternal. Service errors go through apperr.ToWire.

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
	m := toWireAppSettingsMetadata(*meta)
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
	v2s, err := h.settingsService.GetSettings()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.SettingsResult{Error: &wire}
	}
	s := toWireSettings(*v2s)
	return apperr.SettingsResult{Data: &s}
}

func (h *SettingsHandler) ResetSettingsToDefault() (res apperr.SettingsResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.SettingsResult{Error: &wire}
		}
	}()
	v2s, err := h.settingsService.ResetSettingsToDefault()
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.SettingsResult{Error: &wire}
	}
	s := toWireSettings(*v2s)
	return apperr.SettingsResult{Data: &s}
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
		out[i] = toWireProviderConfig(c)
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
	p := toWireProviderConfig(*cfg)
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
	p := toWireProviderConfig(*cfg)
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
	v2cfg := fromWireProviderConfig(cfg)
	created, err := h.settingsService.CreateProviderConfig(&v2cfg)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProviderResult{Error: &wire}
	}
	p := toWireProviderConfig(*created)
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
	v2cfg := fromWireProviderConfig(cfg)
	updated, err := h.settingsService.UpdateProviderConfig(&v2cfg)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ProviderResult{Error: &wire}
	}
	p := toWireProviderConfig(*updated)
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
	p := toWireProviderConfig(*cfg)
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
	ic := apperr.InferenceBaseConfig(*cfg)
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
	v2cfg := InferenceBaseConfig(cfg)
	updated, err := h.settingsService.UpdateInferenceBaseConfig(&v2cfg)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.InferenceResult{Error: &wire}
	}
	ic := apperr.InferenceBaseConfig(*updated)
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
	mc := apperr.ModelConfig(*cfg)
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
	v2cfg := ModelConfig(cfg)
	updated, err := h.settingsService.UpdateModelConfig(&v2cfg)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ModelConfigResult{Error: &wire}
	}
	mc := apperr.ModelConfig(*updated)
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
	lc := apperr.LanguageConfig(*cfg)
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
	ab := toWireAppBehaviorConfig(*cfg)
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
	v2cfg := fromWireAppBehaviorConfig(cfg)
	updated, err := h.settingsService.UpdateAppBehaviorConfig(&v2cfg)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.AppBehaviorResult{Error: &wire}
	}
	ab := toWireAppBehaviorConfig(*updated)
	return apperr.AppBehaviorResult{Data: &ab}
}
