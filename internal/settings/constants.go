package settings

const AppVersion = "3.0.0-dev"

// ProviderKinds are the supported provider family identifiers (DB CHECK constraint values).
var ProviderKinds = []string{"ollama", "lmstudio", "llamacpp", "openai", "azure"}

// AuthSchemes are the supported authentication schemes (DB CHECK constraint values).
var AuthSchemes = []string{"none", "bearer", "apiKey"}

func isValidKind(kind string) bool {
	for _, k := range ProviderKinds {
		if k == kind {
			return true
		}
	}
	return false
}

func isValidAuthScheme(scheme string) bool {
	for _, s := range AuthSchemes {
		if s == scheme {
			return true
		}
	}
	return false
}
