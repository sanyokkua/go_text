package actions

import (
	"fmt"
	"strings"
	"testing"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
	"go_text/internal/settings"
)

// buildTestService creates a minimal ActionService using the real v3 catalog without
// an LLM backend — sufficient for testing planning and composition.
func buildTestService(t *testing.T) *ActionService {
	t.Helper()
	catalog := v3.Catalog()
	return &ActionService{
		catalog:  catalog,
		planner:  NewPlanner(catalog),
		composer: NewComposer(catalog),
	}
}

func TestActionService_BuildPlanAndPrompts_SingleAction(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID:    "rewrite.proofread.basic",
		SampleInput: "Hello world",
		UseMarkdown: false,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview == nil {
		t.Fatal("expected non-nil preview")
	}
	if preview.Inferences != 1 {
		t.Errorf("inferences: got %d, want 1", preview.Inferences)
	}
	if preview.Kind != "single" {
		t.Errorf("kind: got %q, want %q", preview.Kind, "single")
	}
	if len(preview.Groups) != 1 {
		t.Fatalf("groups: got %d, want 1", len(preview.Groups))
	}
	g := preview.Groups[0]
	if g.Family != v3.FamilyRewrite {
		t.Errorf("family: got %q, want %q", g.Family, v3.FamilyRewrite)
	}
	if !strings.Contains(g.UserPrompt, "Hello world") {
		t.Error("user prompt should contain sample input")
	}
	if g.SystemPrompt == "" {
		t.Error("system prompt should not be empty")
	}
	if len(g.AppliedActions) != 1 {
		t.Fatalf("applied actions: got %d, want 1", len(g.AppliedActions))
	}
	if g.AppliedActions[0].ID != "rewrite.proofread.basic" {
		t.Errorf("applied action ID: got %q, want %q", g.AppliedActions[0].ID, "rewrite.proofread.basic")
	}
}

func TestActionService_BuildPlanAndPrompts_ThreeGroupPlan(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.proofread.basic"},
			{ActionID: "structure.format.bullets"},
			{ActionID: "summarize.summary"},
		},
		SampleInput: "sample",
		UseMarkdown: false,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview.Kind != "chain" {
		t.Errorf("kind: got %q, want %q", preview.Kind, "chain")
	}
	if preview.Inferences != 3 {
		t.Errorf("inferences: got %d, want 3", preview.Inferences)
	}
	if len(preview.Groups) != 3 {
		t.Fatalf("groups: got %d, want 3", len(preview.Groups))
	}
	if preview.Groups[0].Family != v3.FamilyRewrite {
		t.Errorf("group[0] family: got %q, want %q", preview.Groups[0].Family, v3.FamilyRewrite)
	}
	if preview.Groups[1].Family != v3.FamilyStructure {
		t.Errorf("group[1] family: got %q, want %q", preview.Groups[1].Family, v3.FamilyStructure)
	}
	if preview.Groups[2].Family != v3.FamilySummarize {
		t.Errorf("group[2] family: got %q, want %q", preview.Groups[2].Family, v3.FamilySummarize)
	}
}

func TestActionService_BuildPlanAndPrompts_MergedRewriteGroup(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.proofread.basic"},
			{ActionID: "rewrite.tone.professional"},
		},
		SampleInput: "Test input",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview.Inferences != 1 {
		t.Errorf("merged Rewrite should produce 1 inference group, got %d", preview.Inferences)
	}
	if len(preview.Groups[0].AppliedActions) != 2 {
		t.Errorf("merged group should have 2 applied actions, got %d", len(preview.Groups[0].AppliedActions))
	}
	// Context injected exactly once
	if strings.Count(preview.Groups[0].UserPrompt, "<<<UserText Start>>>") != 1 {
		t.Error("merged Rewrite user prompt should contain context block exactly once")
	}
}

func TestActionService_BuildPlanAndPrompts_InvalidPlan_ExclusivityViolation(t *testing.T) {
	svc := buildTestService(t)
	_, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.tone.professional"},
			{ActionID: "rewrite.tone.friendly"},
		},
	})
	if err == nil {
		t.Fatal("expected error for exclusivity violation, got nil")
	}
}

func TestActionService_BuildPlanAndPrompts_InvalidPlan_CapViolation(t *testing.T) {
	svc := buildTestService(t)
	_, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.proofread.basic"},
			{ActionID: "rewrite.intent.concise"},
			{ActionID: "rewrite.tone.professional"},
			{ActionID: "rewrite.style.formal"},
			{ActionID: "structure.format.bullets"},
			{ActionID: "structure.format.headings"},
		},
	})
	if err == nil {
		t.Fatal("expected error for 6 steps (cap=5), got nil")
	}
}

func TestActionService_BuildPlanAndPrompts_SummaryFormat(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID: "rewrite.proofread.basic",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(preview.Summary, "1 step") {
		t.Errorf("summary should mention step count, got %q", preview.Summary)
	}
	if !strings.Contains(preview.Summary, "1 inference") {
		t.Errorf("summary should mention inference count, got %q", preview.Summary)
	}
}

// ─── Later-group placeholder ─────────────────────────────────────────────────

func TestActionService_BuildPlanAndPrompts_LaterGroupsShowPrevStepPlaceholder(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.proofread.basic"},
			{ActionID: "structure.format.bullets"},
			{ActionID: "summarize.summary"},
		},
		SampleInput: "Hello world",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(preview.Groups) != 3 {
		t.Fatalf("expected 3 groups, got %d", len(preview.Groups))
	}
	if !strings.Contains(preview.Groups[0].UserPrompt, "Hello world") {
		t.Error("group[0] userPrompt should contain sample input")
	}
	for _, idx := range []int{1, 2} {
		g := preview.Groups[idx]
		if strings.Contains(g.UserPrompt, "Hello world") {
			t.Errorf("group[%d] userPrompt must not contain sample input (got %q)", idx, g.UserPrompt)
		}
		if !strings.Contains(g.UserPrompt, "‹output of previous step›") {
			t.Errorf("group[%d] userPrompt should contain prev-step placeholder", idx)
		}
	}
}

func TestActionService_BuildPlanAndPrompts_DefaultPlaceholderWhenNoSampleInput(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID: "rewrite.proofread.basic",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(preview.Groups[0].UserPrompt, "[sample input text]") {
		t.Errorf("group[0] should show default placeholder when SampleInput is empty; got: %q",
			preview.Groups[0].UserPrompt)
	}
}

// ─── Parameters filling ──────────────────────────────────────────────────────

// minimalSettingsService stubs settings.SettingsServiceAPI; only GetSettings is meaningful.
type minimalSettingsService struct {
	cfg *settings.Settings
	err error
}

func (m *minimalSettingsService) GetSettings() (*settings.Settings, error) {
	return m.cfg, m.err
}
func (m *minimalSettingsService) GetAppSettingsMetadata() (*settings.AppSettingsMetadata, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) ResetSettingsToDefault() (*settings.Settings, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetAllProviderConfigs() ([]settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetCurrentProviderConfig() (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetProviderConfig(_ string) (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) CreateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) UpdateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) DeleteProviderConfig(_ string) error {
	panic("not implemented in test")
}
func (m *minimalSettingsService) SetAsCurrentProviderConfig(_ string) (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetInferenceBaseConfig() (*settings.InferenceBaseConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) UpdateInferenceBaseConfig(_ *settings.InferenceBaseConfig) (*settings.InferenceBaseConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetModelConfig() (*settings.ModelConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) UpdateModelConfig(_ *settings.ModelConfig) (*settings.ModelConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetLanguageConfig() (*settings.LanguageConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) SetDefaultInputLanguage(_ string) error {
	panic("not implemented in test")
}
func (m *minimalSettingsService) SetDefaultOutputLanguage(_ string) error {
	panic("not implemented in test")
}
func (m *minimalSettingsService) AddLanguage(_ string) ([]string, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) RemoveLanguage(_ string) ([]string, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) UpdateAppBehaviorConfig(_ *settings.AppBehaviorConfig) (*settings.AppBehaviorConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetUIPreferencesConfig() (*settings.UIPreferencesConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) UpdateUIPreferencesConfig(_ *settings.UIPreferencesConfig) (*settings.UIPreferencesConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) GetLoggingConfig() (*settings.LoggingConfig, error) {
	panic("not implemented in test")
}
func (m *minimalSettingsService) UpdateLoggingConfig(_ *settings.LoggingConfig) (*settings.LoggingConfig, error) {
	panic("not implemented in test")
}

func buildTestServiceWithSettings(t *testing.T, svc settings.SettingsServiceAPI) *ActionService {
	t.Helper()
	catalog := v3.Catalog()
	return &ActionService{
		catalog:         catalog,
		planner:         NewPlanner(catalog),
		composer:        NewComposer(catalog),
		settingsService: svc,
	}
}

func TestActionService_BuildPlanAndPrompts_FillsParametersFromSettings(t *testing.T) {
	temp := 0.7
	mockSvc := &minimalSettingsService{
		cfg: &settings.Settings{
			ModelConfig: settings.ModelConfig{
				Name:               "gpt-4o",
				UseTemperature:     true,
				Temperature:        temp,
				UseLegacyMaxTokens: false,
			},
		},
	}
	svc := buildTestServiceWithSettings(t, mockSvc)

	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID:         "rewrite.proofread.basic",
		UseMarkdown:      true,
		InputLanguageID:  "English",
		OutputLanguageID: "Ukrainian",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(preview.Groups) == 0 {
		t.Fatal("expected at least one group")
	}
	p := preview.Groups[0].Parameters
	if p.Model != "gpt-4o" {
		t.Errorf("Parameters.Model = %q, want %q", p.Model, "gpt-4o")
	}
	if p.Format != "markdown" {
		t.Errorf("Parameters.Format = %q, want %q", p.Format, "markdown")
	}
	if p.TokenParam != "max_completion_tokens" {
		t.Errorf("Parameters.TokenParam = %q, want %q", p.TokenParam, "max_completion_tokens")
	}
	if p.Temperature == nil {
		t.Fatal("Parameters.Temperature should be set when UseTemperature=true")
	}
	if *p.Temperature != temp {
		t.Errorf("Parameters.Temperature = %v, want %v", *p.Temperature, temp)
	}
	if p.InputLang != "English" {
		t.Errorf("Parameters.InputLang = %q, want %q", p.InputLang, "English")
	}
	if p.OutputLang != "Ukrainian" {
		t.Errorf("Parameters.OutputLang = %q, want %q", p.OutputLang, "Ukrainian")
	}
	if p.Stream {
		t.Error("Parameters.Stream should always be false")
	}
}

func TestActionService_BuildPlanAndPrompts_LegacyMaxTokens(t *testing.T) {
	mockSvc := &minimalSettingsService{
		cfg: &settings.Settings{
			ModelConfig: settings.ModelConfig{
				Name:               "claude-3",
				UseTemperature:     false,
				UseLegacyMaxTokens: true,
			},
		},
	}
	svc := buildTestServiceWithSettings(t, mockSvc)

	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID: "rewrite.proofread.basic",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	p := preview.Groups[0].Parameters
	if p.TokenParam != "max_tokens" {
		t.Errorf("Parameters.TokenParam = %q, want %q", p.TokenParam, "max_tokens")
	}
	if p.Temperature != nil {
		t.Errorf("Parameters.Temperature should be nil when UseTemperature=false, got %v", p.Temperature)
	}
}

func TestActionService_BuildPlanAndPrompts_SettingsError_ReturnsError(t *testing.T) {
	mockSvc := &minimalSettingsService{err: fmt.Errorf("db unavailable")}
	svc := buildTestServiceWithSettings(t, mockSvc)

	_, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID: "rewrite.proofread.basic",
	})
	if err == nil {
		t.Fatal("expected error when settingsService fails, got nil")
	}
}
