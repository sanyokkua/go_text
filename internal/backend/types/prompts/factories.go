package prompts

func NewPrompt(id string, promptType PromptType, category PromptCategory, value string) Prompt {
	return Prompt{
		ID:       id,
		Type:     promptType,
		Category: category,
		Value:    value,
	}
}

func NewPromptSystem(id string, category PromptCategory, value string) Prompt {
	return NewPrompt(id, PromptTypeSystem, category, value)
}

func NewPromptUser(id string, category PromptCategory, value string) Prompt {
	return NewPrompt(id, PromptTypeUser, category, value)
}
