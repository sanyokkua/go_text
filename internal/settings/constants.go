package settings

// AppVersion is the running application version. It is overridden at build time via
// -ldflags "-X go_text/internal/settings.AppVersion=<version>" (see .github/workflows/main.yml);
// "dev" is the fallback for local wails dev / go build without that flag.
var AppVersion = "dev"

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
