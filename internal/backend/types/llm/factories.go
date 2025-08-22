package llm

func NewMessage(role, content string) Message {
	return Message{
		Role:    role,
		Content: content,
	}
}

func NewMessageSystem(content string) Message {
	return NewMessage("system", content)
}

func NewMessageUser(content string) Message {
	return NewMessage("user", content)
}

func NewOptions(temperature float64) Options {
	return Options{
		Temperature: temperature,
	}
}

func NewChatCompletionRequest(model string, messages []Message, temperature float64) ChatCompletionRequest {
	return ChatCompletionRequest{
		Model:       model,
		Messages:    messages,
		Temperature: temperature,
		Options:     NewOptions(temperature),
		Stream:      false,
		N:           1,
	}
}

func NewChatCompletionRequestWithMsgs(model string, system, user string, temperature float64) ChatCompletionRequest {
	systemMsg := NewMessageSystem(system)
	userMsg := NewMessageUser(user)
	msgs := []Message{systemMsg, userMsg}
	return NewChatCompletionRequest(model, msgs, temperature)
}
