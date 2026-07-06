package db

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestProviderPresets_CanonicalCatalog asserts the five canonical provider
// presets expose the correct Kind/BaseURL/AuthScheme, and that exactly two
// (Ollama + LM Studio) carry SeedDefault==true.
func TestProviderPresets_CanonicalCatalog(t *testing.T) {
	t.Parallel()

	presets := ProviderPresets()
	require.Len(t, presets, 5, "expected 5 canonical provider presets")

	byName := make(map[string]ProviderPreset, len(presets))
	for _, p := range presets {
		byName[p.Name] = p
	}

	tests := []struct {
		name        string
		wantKind    string
		wantBaseURL string
		wantAuth    string
		wantSeed    bool
	}{
		{name: "Ollama", wantKind: "ollama", wantBaseURL: "http://127.0.0.1:11434/", wantAuth: "none", wantSeed: true},
		{name: "LM Studio", wantKind: "lmstudio", wantBaseURL: "http://127.0.0.1:1234/", wantAuth: "none", wantSeed: true},
		{name: "Llama.cpp", wantKind: "llamacpp", wantBaseURL: "http://127.0.0.1:8080/", wantAuth: "none", wantSeed: false},
		{name: "OpenAI", wantKind: "openai", wantBaseURL: "https://api.openai.com/", wantAuth: "bearer", wantSeed: false},
		{name: "OpenRouter.ai", wantKind: "openai", wantBaseURL: "https://openrouter.ai/api/", wantAuth: "bearer", wantSeed: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			p, ok := byName[tt.name]
			require.Truef(t, ok, "preset %q missing from catalog", tt.name)
			assert.Equal(t, tt.wantKind, p.Kind)
			assert.Equal(t, tt.wantBaseURL, p.BaseURL)
			assert.Equal(t, tt.wantAuth, p.AuthScheme)
			assert.Equal(t, tt.wantSeed, p.SeedDefault)
		})
	}
}

// TestProviderPresets_ExactlyTwoSeedDefaults asserts only Ollama and LM Studio
// are inserted on a fresh database.
func TestProviderPresets_ExactlyTwoSeedDefaults(t *testing.T) {
	t.Parallel()

	var seeded []string
	for _, p := range ProviderPresets() {
		if p.SeedDefault {
			seeded = append(seeded, p.Kind)
		}
	}

	require.Len(t, seeded, 2, "exactly two presets must be seed defaults")
	assert.Contains(t, seeded, "ollama")
	assert.Contains(t, seeded, "lmstudio")
}

// TestProviderPresets_ReturnsDefensiveCopy verifies callers cannot mutate the
// canonical preset list through the returned slice.
func TestProviderPresets_ReturnsDefensiveCopy(t *testing.T) {
	t.Parallel()

	first := ProviderPresets()
	require.NotEmpty(t, first)
	first[0].Name = "mutated"

	second := ProviderPresets()
	assert.NotEqual(t, "mutated", second[0].Name, "ProviderPresets must return a defensive copy")
}

// TestStarterStackRecipes_NonEmptyFields asserts every starter recipe carries a
// name, an icon, and at least one action ID.
func TestStarterStackRecipes_NonEmptyFields(t *testing.T) {
	t.Parallel()

	recipes := StarterStackRecipes()
	require.NotEmpty(t, recipes, "expected at least one starter recipe")
	require.Len(t, recipes, 17, "expected 17 starter recipes")

	for _, r := range recipes {
		t.Run(r.Name, func(t *testing.T) {
			t.Parallel()
			assert.NotEmpty(t, r.Name, "recipe name must be non-empty")
			assert.NotEmpty(t, r.Icon, "recipe icon must be non-empty")
			assert.NotEmpty(t, r.Actions, "recipe actions must be non-empty")
		})
	}
}

// TestStarterStackRecipes_ReturnsDefensiveCopy verifies the recipe slice and its
// nested action slices cannot be mutated through the returned value.
func TestStarterStackRecipes_ReturnsDefensiveCopy(t *testing.T) {
	t.Parallel()

	first := StarterStackRecipes()
	require.NotEmpty(t, first)
	require.NotEmpty(t, first[0].Actions)
	first[0].Actions[0] = "tampered"

	second := StarterStackRecipes()
	assert.NotEqual(t, "tampered", second[0].Actions[0],
		"StarterStackRecipes must return a defensive copy of action slices")
}

// TestStarterStackActions_MatchesRecipes asserts the icon-free action map and the
// recipe list agree on names and ordered action IDs (single source of truth).
func TestStarterStackActions_MatchesRecipes(t *testing.T) {
	t.Parallel()

	actionsByName := StarterStackActions()
	recipes := StarterStackRecipes()
	require.Len(t, actionsByName, len(recipes))

	for _, r := range recipes {
		got, ok := actionsByName[r.Name]
		require.Truef(t, ok, "recipe %q absent from StarterStackActions", r.Name)
		assert.Equalf(t, r.Actions, got, "action IDs disagree for %q", r.Name)
	}
}
