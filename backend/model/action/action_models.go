package action

type Action struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type Group struct {
	GroupID      string   `json:"groupID"`
	GroupName    string   `json:"groupName"`
	GroupActions []Action `json:"groupActions"`
}

type Actions struct {
	ActionGroups []Group `json:"actionGroups"`
}

type ActionRequest struct {
	ID string `json:"id"`

	InputText  string `json:"inputText"`
	OutputText string `json:"outputText,omitempty"`

	InputLanguageID  string `json:"inputLanguageId,omitempty"`
	OutputLanguageID string `json:"outputLanguageId,omitempty"`
}
