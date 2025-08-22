package prompts

import (
	"encoding/json"
	"errors"
	"fmt"
)

// ===== PromptType =====

type PromptType byte

const (
	PromptTypeSystem PromptType = iota
	PromptTypeUser
)

var (
	ErrUnknownPromptType = errors.New("unknown prompt type")

	promptTypeToString = map[PromptType]string{
		PromptTypeSystem: "System Prompt",
		PromptTypeUser:   "User Prompt",
	}

	promptTypeFromString = map[string]PromptType{
		"System Prompt": PromptTypeSystem,
		"User Prompt":   PromptTypeUser,
	}
)

func (pt PromptType) String() string {
	if s, ok := promptTypeToString[pt]; ok {
		return s
	}
	return "unknown"
}

func (pt PromptType) MarshalJSON() ([]byte, error) {
	return json.Marshal(pt.String())
}

func (pt *PromptType) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	if val, ok := promptTypeFromString[s]; ok {
		*pt = val
		return nil
	}
	return fmt.Errorf("%w: %q", ErrUnknownPromptType, s)
}

// ===== PromptCategory =====

type PromptCategory byte

const (
	PromptCategoryTranslation PromptCategory = iota
	PromptCategoryProofread
	PromptCategoryRephrase
	PromptCategoryFormat
)

var (
	ErrUnknownPromptCategory = errors.New("unknown prompt category")

	promptCategoryToString = map[PromptCategory]string{
		PromptCategoryTranslation: "Translation",
		PromptCategoryProofread:   "Proofreading",
		PromptCategoryRephrase:    "Rephrasing",
		PromptCategoryFormat:      "Formatting",
	}

	promptCategoryFromString = map[string]PromptCategory{
		"Translation":  PromptCategoryTranslation,
		"Proofreading": PromptCategoryProofread,
		"Rephrasing":   PromptCategoryRephrase,
		"Formatting":   PromptCategoryFormat,
	}
)

func (pc PromptCategory) String() string {
	if s, ok := promptCategoryToString[pc]; ok {
		return s
	}
	return "unknown"
}

func (pc PromptCategory) MarshalJSON() ([]byte, error) {
	return json.Marshal(pc.String())
}

func (pc *PromptCategory) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	if val, ok := promptCategoryFromString[s]; ok {
		*pc = val
		return nil
	}
	return fmt.Errorf("%w: %q", ErrUnknownPromptCategory, s)
}
