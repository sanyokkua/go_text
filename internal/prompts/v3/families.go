package v3

// Family name constants match the ActionMeta.Family field values.
const (
	FamilyRewrite   = "rewrite"
	FamilyStructure = "structure"
	FamilySummarize = "summarize"
	FamilyTranslate = "translate"
	FamilyPromptEng = "prompteng"
)

// Category constants used in ActionMeta.Category for UI grouping.
const (
	CatProofread    = "Proofreading"
	CatRewrite      = "Rewriting"
	CatTone         = "Tone"
	CatStyle        = "Style"
	CatFormat       = "Format"
	CatDocStructure = "Document Structure"
	CatSummarize    = "Summarization"
	CatTranslate    = "Translation"
	CatPromptEng    = "Prompt Engineering"
)

// Exclusivity group constants — actions sharing a group are mutually exclusive (one per stack).
// Empty string means no exclusivity (composable — multiple from the group may coexist).
const (
	ExclProofread     = "proofread"
	ExclRewriteIntent = "rewrite-intent"
	ExclTone          = "tone"
	ExclStyle         = "style"
	ExclDocStructure  = "doc-structure"
	ExclSummarize     = "summarize"
	ExclTranslate     = "translate"
	ExclPromptEng     = "prompteng"
	// structure.format actions use ExclusivityGroup = "" (composable, per templates-structure.md:9).
)

// Requires token name constants — runtime parameters injected by the composer.
const (
	ReqInputLang   = "input_language"
	ReqOutputLang  = "output_language"
	ReqTargetModel = "target_model"
	ReqGoal        = "goal"
)
