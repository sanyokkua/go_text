package prompts

import "go_text/internal/prompts/categories"

const (
	PromptTypeSystem            = "System Prompt"
	PromptTypeUser              = "User Prompt"
	TemplateParamText           = "{{user_text}}"
	TemplateParamFormat         = "{{user_format}}"
	TemplateParamInputLanguage  = "{{input_language}}"
	TemplateParamOutputLanguage = "{{output_language}}"
	OutputFormatPlainText       = "PlainText"
	OutputFormatMarkdown        = "Markdown"
)

// ApplicationPrompts - All Prompts of the App
var ApplicationPrompts = Prompts{
	PromptGroups: map[string]PromptGroup{
		categories.PromptGroupProofreading: {
			GroupID:      "v2_001",
			GroupName:    categories.PromptGroupProofreading,
			SystemPrompt: Prompt{ID: "systemProofreadV2", Name: "System Proofread", Type: PromptTypeSystem, Category: categories.PromptGroupProofreading, Value: categories.SystemPromptProofreading, Description: categories.SystemPromptProofreadingDescription},
			Prompts: map[string]Prompt{
				"basicProofreading":      {ID: "basicProofreading", Name: "Basic Proofreading", Type: PromptTypeUser, Category: categories.PromptGroupProofreading, Value: categories.UserPromptBasicProofreading, Description: categories.UserPromptBasicProofreadingDescription},
				"enhancedProofreading":   {ID: "enhancedProofreading", Name: "Enhanced Proofreading", Type: PromptTypeUser, Category: categories.PromptGroupProofreading, Value: categories.UserPromptEnhancedProofreading, Description: categories.UserPromptEnhancedProofreadingDescription},
				"styleConsistency":       {ID: "styleConsistency", Name: "Style Consistency", Type: PromptTypeUser, Category: categories.PromptGroupProofreading, Value: categories.UserPromptStyleConsistency, Description: categories.UserPromptStyleConsistencyDescription},
				"readabilityImprovement": {ID: "readabilityImprovement", Name: "Readability Improvement", Type: PromptTypeUser, Category: categories.PromptGroupProofreading, Value: categories.UserPromptReadabilityImprovement, Description: categories.UserPromptReadabilityImprovementDescription},
				"toneAdjustment":         {ID: "toneAdjustment", Name: "Tone Adjustment", Type: PromptTypeUser, Category: categories.PromptGroupProofreading, Value: categories.UserPromptToneAdjustment, Description: categories.UserPromptToneAdjustmentDescription},
			},
		},
		categories.PromptGroupRewriting: {
			GroupID:      "v2_002",
			GroupName:    categories.PromptGroupRewriting,
			SystemPrompt: Prompt{ID: "systemRewritingV2", Name: "System Rewriting", Type: PromptTypeSystem, Category: categories.PromptGroupRewriting, Value: categories.SystemPromptRewriting, Description: categories.SystemPromptRewritingDescription},
			Prompts: map[string]Prompt{
				"conciseRewrite":  {ID: "conciseRewrite", Name: "Concise Rewrite", Type: PromptTypeUser, Category: categories.PromptGroupRewriting, Value: categories.UserPromptConciseRewrite, Description: categories.UserPromptConciseRewriteDescription},
				"expandedRewrite": {ID: "expandedRewrite", Name: "Expanded Rewrite", Type: PromptTypeUser, Category: categories.PromptGroupRewriting, Value: categories.UserPromptExpandedRewrite, Description: categories.UserPromptExpandedRewriteDescription},
			},
		},
		categories.PromptGroupRewritingTone: {
			GroupID:      "v2_003",
			GroupName:    categories.PromptGroupRewritingTone,
			SystemPrompt: Prompt{ID: "systemRewritingToneV2", Name: "System Rewriting (Tone)", Type: PromptTypeSystem, Category: categories.PromptGroupRewritingTone, Value: categories.SystemPromptRewritingTone, Description: categories.SystemPromptRewritingToneDescription},
			Prompts: map[string]Prompt{
				"friendly":                    {ID: "friendly", Name: "Friendly", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptFriendly, Description: categories.UserPromptFriendlyDescription},
				"direct":                      {ID: "direct", Name: "Direct", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptDirect, Description: categories.UserPromptDirectDescription},
				"indirect":                    {ID: "indirect", Name: "Indirect", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptIndirect, Description: categories.UserPromptIndirectDescription},
				"professional":                {ID: "professional", Name: "Professional", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptProfessional, Description: categories.UserPromptProfessionalDescription},
				"enthusiastic":                {ID: "enthusiastic", Name: "Enthusiastic", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptEnthusiastic, Description: categories.UserPromptEnthusiasticDescription},
				"neutral":                     {ID: "neutral", Name: "Neutral", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptNeutral, Description: categories.UserPromptNeutralDescription},
				"conflictSafeRewrite":         {ID: "conflictSafeRewrite", Name: "Conflict-Safe Rewrite", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptConflictSafeRewrite, Description: categories.UserPromptConflictSafeRewriteDescription},
				"politeRequestRewrite":        {ID: "politeRequestRewrite", Name: "Polite Request Rewrite", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptPoliteRequestRewrite, Description: categories.UserPromptPoliteRequestRewriteDescription},
				"apologyMessageRewrite":       {ID: "apologyMessageRewrite", Name: "Apology Message Rewrite", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptApologyMessageRewrite, Description: categories.UserPromptApologyMessageRewriteDescription},
				"clarificationRequestRewrite": {ID: "clarificationRequestRewrite", Name: "Clarification Request Rewrite", Type: PromptTypeUser, Category: categories.PromptGroupRewritingTone, Value: categories.UserPromptClarificationRequestRewrite, Description: categories.UserPromptClarificationRequestRewriteDescription},
			},
		},
		categories.PromptGroupRewritingStyle: {
			GroupID:      "v2_004",
			GroupName:    categories.PromptGroupRewritingStyle,
			SystemPrompt: Prompt{ID: "systemRewritingStyleV2", Name: "System Rewriting (Style)", Type: PromptTypeSystem, Category: categories.PromptGroupRewritingStyle, Value: categories.SystemPromptRewritingStyle, Description: categories.SystemPromptRewritingStyleDescription},
			Prompts: map[string]Prompt{
				"formal":                       {ID: "formal", Name: "Formal", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptFormal, Description: categories.UserPromptFormalDescription},
				"semiFormal":                   {ID: "semiFormal", Name: "Semi-Formal", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptSemiFormal, Description: categories.UserPromptSemiFormalDescription},
				"casual":                       {ID: "casual", Name: "Casual", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptCasual, Description: categories.UserPromptCasualDescription},
				"academic":                     {ID: "academic", Name: "Academic", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptAcademic, Description: categories.UserPromptAcademicDescription},
				"technical":                    {ID: "technical", Name: "Technical", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptTechnical, Description: categories.UserPromptTechnicalDescription},
				"journalistic":                 {ID: "journalistic", Name: "Journalistic", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptJournalistic, Description: categories.UserPromptJournalisticDescription},
				"creative":                     {ID: "creative", Name: "Creative", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptCreative, Description: categories.UserPromptCreativeDescription},
				"marketing":                    {ID: "marketing", Name: "Marketing", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptMarketing, Description: categories.UserPromptMarketingDescription},
				"seoOptimized":                 {ID: "seoOptimized", Name: "SEO-Optimized", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptSEOOptimized, Description: categories.UserPromptSEOOptimizedDescription},
				"riskFreeRewrite":              {ID: "riskFreeRewrite", Name: "Risk-Free Rewrite", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptRiskFreeRewrite, Description: categories.UserPromptRiskFreeRewriteDescription},
				"simplifyForNonNativeSpeakers": {ID: "simplifyForNonNativeSpeakers", Name: "Simplify for Non-Native Speakers", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptSimplifyForNonNativeSpeakers, Description: categories.UserPromptSimplifyForNonNativeSpeakersDescription},
				"rewriteForChildren":           {ID: "rewriteForChildren", Name: "Rewrite for Children", Type: PromptTypeUser, Category: categories.PromptGroupRewritingStyle, Value: categories.UserPromptRewriteForChildren, Description: categories.UserPromptRewriteForChildrenDescription},
			},
		},
		categories.PromptGroupFormatting: {
			GroupID:      "v2_005",
			GroupName:    categories.PromptGroupFormatting,
			SystemPrompt: Prompt{ID: "systemFormattingV2", Name: "System Formatting", Type: PromptTypeSystem, Category: categories.PromptGroupFormatting, Value: categories.SystemPromptFormatting, Description: categories.SystemPromptFormattingDescription},
			Prompts: map[string]Prompt{
				"paragraphStructuring": {ID: "paragraphStructuring", Name: "Paragraph Structuring", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptParagraphStructuring, Description: categories.UserPromptParagraphStructuringDescription},
				"bulletConversion":     {ID: "bulletConversion", Name: "Bullet Conversion", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptBulletConversion, Description: categories.UserPromptBulletConversionDescription},
				"listConversion":       {ID: "listConversion", Name: "List Conversion", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptListConversion, Description: categories.UserPromptListConversionDescription},
				"headlineGenerator":    {ID: "headlineGenerator", Name: "Headline Generator", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptHeadlineGenerator, Description: categories.UserPromptHeadlineGeneratorDescription},
				"emailTemplate":        {ID: "emailTemplate", Name: "Email Template", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptEmailTemplate, Description: categories.UserPromptEmailTemplateDescription},
				"reportTemplate":       {ID: "reportTemplate", Name: "Report Template", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptReportTemplate, Description: categories.UserPromptReportTemplateDescription},
				"socialPostTemplate":   {ID: "socialPostTemplate", Name: "Social Post Template", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptSocialPostTemplate, Description: categories.UserPromptSocialPostTemplateDescription},
				"blogTemplate":         {ID: "blogTemplate", Name: "Blog Template", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptBlogTemplate, Description: categories.UserPromptBlogTemplateDescription},
				"resumeTemplate":       {ID: "resumeTemplate", Name: "Resume Template", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptResumeTemplate, Description: categories.UserPromptResumeTemplateDescription},
				"taglineGenerator":     {ID: "taglineGenerator", Name: "Tagline Generator", Type: PromptTypeUser, Category: categories.PromptGroupFormatting, Value: categories.UserPromptTaglineGenerator, Description: categories.UserPromptTaglineGeneratorDescription},
			},
		},
		categories.PromptGroupEverydayWork: {
			GroupID:      "v2_006",
			GroupName:    categories.PromptGroupEverydayWork,
			SystemPrompt: Prompt{ID: "systemEverydayWorkV2", Name: "System Everyday Work", Type: PromptTypeSystem, Category: categories.PromptGroupEverydayWork, Value: categories.SystemPromptEverydayWork, Description: categories.SystemPromptEverydayWorkDescription},
			Prompts: map[string]Prompt{
				"textToCoworker":         {ID: "textToCoworker", Name: "Text to Coworker", Type: PromptTypeUser, Category: categories.PromptGroupEverydayWork, Value: categories.UserPromptTextToCoworker, Description: categories.UserPromptTextToCoworkerDescription},
				"textToManagement":       {ID: "textToManagement", Name: "Text to Management", Type: PromptTypeUser, Category: categories.PromptGroupEverydayWork, Value: categories.UserPromptTextToManagement, Description: categories.UserPromptTextToManagementDescription},
				"taskProblemExplanation": {ID: "taskProblemExplanation", Name: "Task/Problem Explanation", Type: PromptTypeUser, Category: categories.PromptGroupEverydayWork, Value: categories.UserPromptTaskProblemExplanation, Description: categories.UserPromptTaskProblemExplanationDescription},
			},
		},
		categories.PromptGroupDocumentStructuring: {
			GroupID:      "v2_007",
			GroupName:    categories.PromptGroupDocumentStructuring,
			SystemPrompt: Prompt{ID: "systemDocumentStructuringV2", Name: "System Document Structuring", Type: PromptTypeSystem, Category: categories.PromptGroupDocumentStructuring, Value: categories.SystemPromptDocumentStructuring, Description: categories.SystemPromptDocumentStructuringDescription},
			Prompts: map[string]Prompt{
				"markdownConversion":             {ID: "markdownConversion", Name: "Markdown Conversion", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptMarkdownConversion, Description: categories.UserPromptMarkdownConversionDescription},
				"documentStructuring":            {ID: "documentStructuring", Name: "Document Structuring", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptDocumentStructuring, Description: categories.UserPromptDocumentStructuringDescription},
				"instructionFormatting":          {ID: "instructionFormatting", Name: "Instruction Formatting", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptInstructionFormatting, Description: categories.UserPromptInstructionFormattingDescription},
				"userStoryGeneration":            {ID: "userStoryGeneration", Name: "User Story Generation", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptUserStoryGeneration, Description: categories.UserPromptUserStoryGenerationDescription},
				"faqGeneration":                  {ID: "faqGeneration", Name: "FAQ Generation", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptFAQGeneration, Description: categories.UserPromptFAQGenerationDescription},
				"specificationDocumentGenerator": {ID: "specificationDocumentGenerator", Name: "Specification Document Generator", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptSpecificationDocumentGenerator, Description: categories.UserPromptSpecificationDocumentGeneratorDescription},
				"meetingNotesFormatter":          {ID: "meetingNotesFormatter", Name: "Meeting Notes Formatter", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptMeetingNotesFormatter, Description: categories.UserPromptMeetingNotesFormatterDescription},
				"proposalFormatting":             {ID: "proposalFormatting", Name: "Proposal Formatting", Type: PromptTypeUser, Category: categories.PromptGroupDocumentStructuring, Value: categories.UserPromptProposalFormatting, Description: categories.UserPromptProposalFormattingDescription},
			},
		},
		categories.PromptGroupSummarization: {
			GroupID:      "v2_008",
			GroupName:    categories.PromptGroupSummarization,
			SystemPrompt: Prompt{ID: "systemSummarizationV2", Name: "System Summarization", Type: PromptTypeSystem, Category: categories.PromptGroupSummarization, Value: categories.SystemPromptSummarization, Description: categories.SystemPromptSummarizationDescription},
			Prompts: map[string]Prompt{
				"summary":           {ID: "summary", Name: "Summary", Type: PromptTypeUser, Category: categories.PromptGroupSummarization, Value: categories.UserPromptSummary, Description: categories.UserPromptSummaryDescription},
				"keyPoints":         {ID: "keyPoints", Name: "Key Points", Type: PromptTypeUser, Category: categories.PromptGroupSummarization, Value: categories.UserPromptKeyPoints, Description: categories.UserPromptKeyPointsDescription},
				"hashtagSummary":    {ID: "hashtagSummary", Name: "Hashtag Summary", Type: PromptTypeUser, Category: categories.PromptGroupSummarization, Value: categories.UserPromptHashtagSummary, Description: categories.UserPromptHashtagSummaryDescription},
				"simpleExplanation": {ID: "simpleExplanation", Name: "Simple Explanation", Type: PromptTypeUser, Category: categories.PromptGroupSummarization, Value: categories.UserPromptSimpleExplanation, Description: categories.UserPromptSimpleExplanationDescription},
			},
		},
		categories.PromptGroupTranslation: {
			GroupID:      "v2_009",
			GroupName:    categories.PromptGroupTranslation,
			SystemPrompt: Prompt{ID: "systemTranslationV2", Name: "System Translation", Type: PromptTypeSystem, Category: categories.PromptGroupTranslation, Value: categories.SystemPromptTranslation, Description: categories.SystemPromptTranslationDescription},
			Prompts: map[string]Prompt{
				"translateText":    {ID: "translateText", Name: "Translate Text", Type: PromptTypeUser, Category: categories.PromptGroupTranslation, Value: categories.UserPromptTranslateText, Description: categories.UserPromptTranslateTextDescription},
				"dictionaryTable":  {ID: "dictionaryTable", Name: "Dictionary Table", Type: PromptTypeUser, Category: categories.PromptGroupTranslation, Value: categories.UserPromptDictionaryTable, Description: categories.UserPromptDictionaryTableDescription},
				"exampleSentences": {ID: "exampleSentences", Name: "Example Sentences", Type: PromptTypeUser, Category: categories.PromptGroupTranslation, Value: categories.UserPromptExampleSentences, Description: categories.UserPromptExampleSentencesDescription},
			},
		},
		categories.PromptGroupPromptEngineering: {
			GroupID:      "v2_010",
			GroupName:    categories.PromptGroupPromptEngineering,
			SystemPrompt: Prompt{ID: "systemPromptEngineeringV2", Name: "System Prompt Engineering", Type: PromptTypeSystem, Category: categories.PromptGroupPromptEngineering, Value: categories.SystemPromptPromptEngineering, Description: categories.SystemPromptPromptEngineeringDescription},
			Prompts: map[string]Prompt{
				"promptImprovementTextLLM": {ID: "promptImprovementTextLLM", Name: "Prompt Improvement (Text LLM)", Type: PromptTypeUser, Category: categories.PromptGroupPromptEngineering, Value: categories.UserPromptPromptImprovementTextLLM, Description: categories.UserPromptPromptImprovementTextLLMDescription},
				"promptImprovementImage":   {ID: "promptImprovementImage", Name: "Prompt Improvement (Image)", Type: PromptTypeUser, Category: categories.PromptGroupPromptEngineering, Value: categories.UserPromptPromptImprovementImage, Description: categories.UserPromptPromptImprovementImageDescription},
				"promptImprovementVideo":   {ID: "promptImprovementVideo", Name: "Prompt Improvement (Video)", Type: PromptTypeUser, Category: categories.PromptGroupPromptEngineering, Value: categories.UserPromptPromptImprovementVideo, Description: categories.UserPromptPromptImprovementVideoDescription},
				"promptCompression":        {ID: "promptCompression", Name: "Prompt Compression", Type: PromptTypeUser, Category: categories.PromptGroupPromptEngineering, Value: categories.UserPromptPromptCompression, Description: categories.UserPromptPromptCompressionDescription},
				"promptExpansion":          {ID: "promptExpansion", Name: "Prompt Expansion", Type: PromptTypeUser, Category: categories.PromptGroupPromptEngineering, Value: categories.UserPromptPromptExpansion, Description: categories.UserPromptPromptExpansionDescription},
			},
		},
	},
}
