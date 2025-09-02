package settings

type Settings struct {
	BaseUrl               string
	Headers               map[string]string
	ModelName             string
	Temperature           float64
	DefaultInputLanguage  string
	DefaultOutputLanguage string
	Languages             []string
	UseMarkdownForOutput  bool
}
