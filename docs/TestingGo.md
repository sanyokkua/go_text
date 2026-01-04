# 📘 **Best Practices for Go Testing (Comprehensive Document)**

---

# **Chapter 1 — Foundations of Go Testing**

## 🎯 Why Testing Matters

According to multiple sources, Go testing is essential for:

- Catching regressions early
- Providing confidence during refactoring
- Documenting expected behavior
- Ensuring reliability in production systems

Go’s built‑in `testing` package is intentionally simple and encourages clean, maintainable tests.

---

## 🧱 Core Principles

### **1. Keep Tests Simple and Focused**

- Each test should validate one behavior.
- Avoid overly complex setups.

### **2. Use Table‑Driven Tests**

This is one of the most widely recommended Go testing patterns.

**Example:**

```go
func TestAdd(t *testing.T) {
tests := []struct{
name string
a, b int
want int
}{
{"simple", 1, 2, 3},
{"zero", 0, 5, 5},
{"negative", -1, -1, -2},
}

for _, tt := range tests {
t.Run(tt.name, func (t *testing.T) {
got := Add(tt.a, tt.b)
if got != tt.want {
t.Errorf("Add(%d,%d) = %d; want %d", tt.a, tt.b, got, tt.want)
}
})
}
}
```

### **3. Use Subtests (`t.Run`)**

- Helps isolate scenarios.
- Improves readability and reporting.

### **4. Aim for Meaningful Coverage**

Coverage is not everything, but many teams target **80%+** as a healthy benchmark.

---

### **Do vs Avoid**

| Do                                | Avoid                                  |
|-----------------------------------|----------------------------------------|
| Write small, focused tests        | Testing too many behaviors in one test |
| Use table-driven tests            | Duplicating test logic                 |
| Use subtests                      | Overusing mocks                        |
| Test behavior, not implementation | Testing private/internal details       |

**Sources:**

---

# **Chapter 2 — Test Structure & Naming Conventions**

## 🏗️ Recommended Folder Structure

```
/project
    /pkg
    /internal
    /cmd
    file.go
    file_test.go
```

### **Best Practices**

- Keep test files next to the code they test (`*_test.go`).
- Use the same package name unless you need black‑box testing.

---

## 📝 Naming Conventions

### **Test Function Names**

```
func TestFunctionName_Scenario(t *testing.T)
```

Examples:

```go
TestAdd_Simple
TestHandler_Returns404
TestUserService_CreateUser
```

### **Subtest Names**

Use human‑readable names:

```go
t.Run("empty input", ...)
t.Run("valid user", ...)
```

### **Table Test Case Names**

Use `name` field:

```go
{name: "negative numbers", ...}
```

---

## **Do vs Avoid**

| Do                                | Avoid                              |
|-----------------------------------|------------------------------------|
| Use descriptive names             | Using generic names like `Test1`   |
| Group related tests with subtests | Huge monolithic test functions     |
| Keep test files small             | Mixing unrelated tests in one file |

**Sources:**

---

# **Chapter 3 — Mocking in Go**

Mocking in Go is intentionally minimalistic. Go encourages **interfaces**, not mocking frameworks.

---

## 🧩 Best Practices for Mocking

### **1. Mock via Interfaces (Go’s idiomatic way)**

Instead of mocking concrete types, define interfaces.

**Example:**

```go
type FileReader interface {
ReadFile(path string) ([]byte, error)
}

type OSFileReader struct{}

func (OSFileReader) ReadFile(path string) ([]byte, error) {
return os.ReadFile(path)
}
```

In tests:

```go
type MockFileReader struct {
Data []byte
Err  error
}

func (m MockFileReader) ReadFile(path string) ([]byte, error) {
return m.Data, m.Err
}
```

---

### **2. Use Popular Mocking Tools (Optional)**

- `gomock` (Google) — widely used
- `testify/mock` — simpler, more flexible

But Go experts recommend using them **sparingly** and preferring interfaces.

---

### **3. Avoid Over‑Mocking**

Mocks should be used only when:

- External systems are involved (DB, network, filesystem)
- Behavior must be isolated

---

## **Do vs Avoid**

| Do                             | Avoid                            |
|--------------------------------|----------------------------------|
| Mock via interfaces            | Mocking concrete types           |
| Use gomock/testify when needed | Overusing mocks for simple logic |
| Keep mocks small               | Complex mock setups              |

**Sources:**

---

# **Chapter 4 — Environment Variables in Tests**

## 🌿 Best Practices for Env Vars

### **1. Use `t.Setenv` (Go 1.17+)**

This is the recommended modern approach.

```go
func TestWithEnv(t *testing.T) {
t.Setenv("APP_MODE", "test")
// test logic...
}
```

### **2. Avoid Global State**

Env vars are global — tests must not leak state.

`t.Setenv` automatically restores previous values.

---

### **3. For older Go versions**

Use:

```go
old := os.Getenv("APP_MODE")
os.Setenv("APP_MODE", "test")
t.Cleanup(func () { os.Setenv("APP_MODE", old) })
```

---

### **4. Use `.env.test` files only for integration tests**

Unit tests should not depend on external files.

---

## **Do vs Avoid**

| Do                      | Avoid                                 |
|-------------------------|---------------------------------------|
| Use `t.Setenv`          | Using global env vars without cleanup |
| Keep env usage minimal  | Relying on `.env` files in unit tests |
| Reset env vars per test | Sharing env state across tests        |

**Sources:**

---

# **Chapter 5 — Mocking System/Default Packages (os, strings, time, etc.)**

Go does **not** support monkey‑patching.  
Instead, use **dependency injection via interfaces**.

---

## 🗂️ Mocking `os` package

### **Problem**

You want to mock:

- `os.ReadFile`
- `os.Open`
- `os.Getenv`
- `os.Stat`

### **Solution: Wrap them in your own interface**

```go
type OS interface {
ReadFile(name string) ([]byte, error)
Stat(name string) (os.FileInfo, error)
}

type RealOS struct{}

func (RealOS) ReadFile(name string) ([]byte, error) { return os.ReadFile(name) }
func (RealOS) Stat(name string) (os.FileInfo, error) { return os.Stat(name) }
```

In tests:

```go
type MockOS struct {
Data []byte
Err  error
}

func (m MockOS) ReadFile(name string) ([]byte, error) { return m.Data, m.Err }
func (m MockOS) Stat(name string) (os.FileInfo, error) { return nil, m.Err }
```

---

## 🕒 Mocking `time.Now()`

### **Pattern: Inject a clock function**

```go
var now = time.Now

func GetTimestamp() int64 {
return now().Unix()
}
```

In tests:

```go
func TestGetTimestamp(t *testing.T) {
now = func () time.Time { return time.Unix(1000, 0) }
defer func () { now = time.Now }()
}
```

---

## 🔤 Mocking `strings` or other pure functions

You **should not mock** pure functions like:

- `strings.TrimSpace`
- `strings.Split`
- `fmt.Sprintf`

These are deterministic and safe.

---

## 🌐 Mocking external packages (HTTP, DB, Redis, etc.)

### **HTTP**

Use `httptest`:

```go
server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
w.Write([]byte(`{"ok":true}`))
}))
```

### **Database**

Use:

- `sqlmock`
- `testcontainers-go` (integration)

### **Redis**

- `miniredis`

---

## **Do vs Avoid**

| Do                               | Avoid                                |
|----------------------------------|--------------------------------------|
| Wrap system calls in interfaces  | Monkey‑patching (not supported)      |
| Mock time via injected functions | Mocking pure functions               |
| Use httptest for HTTP            | Making real HTTP calls in unit tests |

**Sources:**

---

# **Chapter 6 — Additional Best Practices**

## 🧪 Use `testing.T.Cleanup`

Ensures cleanup runs even if test fails.

```go
t.Cleanup(func () { os.Remove("tempfile") })
```

---

## 🧵 Avoid Shared State

- No global variables
- No shared caches
- No shared DB connections

---

## 🧹 Keep Tests Deterministic

- No randomness (unless seeded)
- No time‑dependent logic
- No network calls

---

## 🧰 Use Benchmarks & Examples

Go supports:

- `BenchmarkXxx`
- `ExampleXxx`

Examples also appear in documentation.

---

# **Chapter 7 — Summary Table**

| Area              | Best Practice                | Avoid               |
|-------------------|------------------------------|---------------------|
| Test structure    | Table-driven tests, subtests | Huge test functions |
| Naming            | Descriptive names            | Generic names       |
| Mocking           | Interfaces, gomock/testify   | Over‑mocking        |
| Env vars          | `t.Setenv`                   | Global env state    |
| System packages   | Wrap in interfaces           | Monkey‑patching     |
| HTTP              | `httptest`                   | Real HTTP calls     |
| Time              | Inject clock                 | Using real time     |
| External services | sqlmock, miniredis           | Real DB/Redis       |

---

# Rules

### Rules for an AI Agent Generating Go Tests

Below is a **specification** for how an AI agent must write Go tests.
Use this as a contract: if a rule conflicts with another, **your explicit rules win**.

---

## 1. Core philosophy and goals

1. **Primary goal:**  
   **Rule 1.1** — Write tests that validate real behavior, not implementation details, using idiomatic Go testing patterns (`testing` package, table‑driven tests, subtests).

2. **No production changes:**  
   **Rule 1.2** — Never modify production code (non‑`*_test.go` files) to make testing “easier”. If something seems untestable, use wrappers, interfaces, or environment‑based techniques in tests only, or ask the user.

3. **Maximize coverage (≥ 90%):**  
   **Rule 1.3** — Aim for at least **90% line and branch coverage** across the tested package. Prefer additional tests over weakening assertions to reach this.

4. **Prefer real implementations over mocks:**  
   **Rule 1.4** — Whenever a function can be tested using the **real implementation** (no external side effects or unsafe interactions), **never** introduce mocks.

5. **Platform independence:**  
   **Rule 1.5** — All tests must run correctly on **Linux, Windows, and macOS**. Avoid hard‑coded OS‑specific paths, shell commands, or assumptions about line endings.

6. **Bug detection rule (stop condition):**  
   **Rule 1.6** — If the agent detects a likely bug (e.g., failing test that appears logically valid, obvious panic case, inconsistent behavior) it must:
    - Stop generating further tests.
    - Clearly explain what looks wrong.
    - Ask the user how to proceed (e.g., “Should I adjust tests or do you want to fix the code?”).

---

## 2. Test structure, naming, and style

1. **File structure:**  
   **Rule 2.1** — Place tests in `*_test.go` files near the code they test, following standard Go conventions.

2. **Test function naming:**  
   **Rule 2.2** — Test function names must:
    - Start with `Test`.
    - Include the function/type name under test.
    - Include a brief scenario/case description.

   Examples:
   ```go
   TestAdd_PositiveNumbers
   TestAdd_ZeroAndNegative
   TestUserService_CreateUser_Success
   TestUserService_CreateUser_InvalidEmail
   ```

3. **Subtests and table‑driven style:**  
   **Rule 2.3** — Prefer **table‑driven tests with subtests (`t.Run`)** for multiple related scenarios of the same function.

   Example pattern:
   ```go
   func TestAdd(t *testing.T) {
       tests := []struct {
           name string
           a, b int
           want int
       }{
           {name: "both_positive", a: 1, b: 2, want: 3},
           {name: "zero_and_positive", a: 0, b: 5, want: 5},
           {name: "both_negative", a: -1, b: -1, want: -2},
       }

       for _, tt := range tests {
           t.Run(tt.name, func(t *testing.T) {
               got := Add(tt.a, tt.b)
               if got != tt.want {
                   t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
               }
           })
       }
   }
   ```

4. **Test naming must highlight the case:**  
   **Rule 2.4** — Subtest names and table entries must clearly indicate the scenario being tested (e.g. `"empty_string"`, `"max_int"`, `"nil_context"`, `"invalid_id_format"`).

5. **No redundant tests:**  
   **Rule 2.5** — Do not create multiple tests that cover exactly the same behavior with different meaningless names. Each test scenario must have a distinct purpose.

---

## 3. Mocking, remote calls, and external dependencies

### 3.1 General mocking rules

1. **Interfaces over concrete mocks:**  
   **Rule 3.1.1** — When mocking is necessary, mock **interfaces** instead of concrete types, in line with Go best practices.

2. **No mock testing:**  
   **Rule 3.1.2** — Never write tests that “test the mock” itself.
    - Do not write tests that only check that a mock returns predefined values.
    - Mocks are purely helpers to test **real code**, not entities to be validated as production logic.

3. **Avoid over‑mocking:**  
   **Rule 3.1.3** — Do not introduce mocks:
    - When real behavior is cheap, deterministic, and side‑effect free.
    - For standard library pure functions (e.g., `strings.TrimSpace`, `fmt.Sprintf`).

4. **Use standard tools when needed:**  
   **Rule 3.1.4** — If mocking external services is necessary, prefer common tooling (e.g., `httptest` for HTTP) instead of custom fragile hacks.

---

### 3.2 HTTP / remote calls

1. **Always use `httptest` for HTTP calls:**  
   **Rule 3.2.1** — When testing code that performs HTTP requests or handles HTTP responses, create a **mock HTTP server** using `httptest.NewServer`. Never call real external HTTP services.

2. **Pattern to follow (your example style):**  
   **Rule 3.2.2** — In tests for remote calls, the agent must:

   ```go
   server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
       if r.Method != http.MethodGet {
           t.Errorf("Expected GET request, got %s", r.Method)
       }
       if r.URL.Path != "/v1/models" {
           t.Errorf("Expected path /v1/models, got %s", r.URL.Path)
       }

       w.Header().Set("Content-Type", "application/json")
       w.WriteHeader(http.StatusOK)

       modelName1 := "Model One"
       modelName2 := "Model Two"
       response := llm2.LlmModelListResponse{
           Data: []llm2.LlmModel{
               {ID: "model1", Name: &modelName1},
               {ID: "model2", Name: &modelName2},
           },
       }
       json.NewEncoder(w).Encode(response)
   }))
   defer server.Close()
   ```

    - Then use `server.URL` in the code under test (e.g. configure client/base URL).
    - No real network dependency.

3. **No real external calls in unit tests:**  
   **Rule 3.2.3** — Unit tests must not depend on live network services. If this is required, such tests must be clearly marked as integration tests and optionally skipped by default.

---

### 3.3 Logging

1. **Do not test logging calls:**  
   **Rule 3.3.1** — The agent must **not** assert:
    - That `logger.Warning`/`logger.Error`/`logger.Debug` was called.
    - How many times a logger method was called.
    - The exact logged message.

2. **Exception:**  
   **Rule 3.3.2** — Only if logging is part of a strict business requirement (explicitly stated by the user) may tests check logging output; otherwise, ignore logging completely.

---

### 3.4 Preference for env‑based configuration over mocks

1. **Prefer env replacement over complex mocks where possible:**  
   **Rule 3.4.1** — If mocking is hard or brittle, but the behavior can be controlled via environment variables (e.g., config directories, home path), **prefer using env variables** and temporary directories over complex mocking.

2. **Pattern to follow (your example):**  
   **Rule 3.4.2** — The agent should reuse or mirror this pattern when appropriate:

   ```go
   func setupTestEnv(t *testing.T) (string, func()) {
       tmpDir, err := os.MkdirTemp("", "go_text_test_*")
       require.NoError(t, err)

       originalHome := os.Getenv("HOME")
       originalXDGConfig := os.Getenv("XDG_CONFIG_HOME")
       originalAppData := os.Getenv("APPDATA")
       originalLocalAppData := os.Getenv("LOCALAPPDATA")

       cleanup := func() {
           os.Setenv("HOME", originalHome)
           os.Setenv("XDG_CONFIG_HOME", originalXDGConfig)
           os.Setenv("APPDATA", originalAppData)
           os.Setenv("LOCALAPPDATA", originalLocalAppData)
           os.RemoveAll(tmpDir)
       }

       os.Setenv("HOME", tmpDir)
       os.Setenv("XDG_CONFIG_HOME", filepath.Join(tmpDir, ".config"))
       os.Setenv("APPDATA", filepath.Join(tmpDir, "AppData", "Roaming"))
       os.Setenv("LOCALAPPDATA", filepath.Join(tmpDir, "AppData", "Local"))

       return tmpDir, cleanup
   }
   ```

3. **Environment restoration requirement:**  
   **Rule 3.4.3** — After tests modify environment variables (e.g., `HOME`, `APPDATA`, custom configs), they must be restored to original values using a cleanup function (`t.Cleanup`, `defer cleanup()`, or equivalent).

4. **Cross‑platform env handling:**  
   **Rule 3.4.4** — When dealing with env vars that differ by platform:
    - Use `HOME` and `XDG_CONFIG_HOME` for POSIX.
    - Use `APPDATA` / `LOCALAPPDATA` appropriately on Windows.
    - Keep logic flexible enough to work on all platforms.

---

## 4. Environment variables and global state

1. **Use `t.Setenv` when available:**  
   **Rule 4.1** — If Go version allows, prefer `t.Setenv(key, value)` for changing environment variables in tests, which automatically restores previous values at the end of the test.

2. **Manual restore pattern when needed:**  
   **Rule 4.2** — If `t.Setenv` is not available or incompatible, follow:

   ```go
   old := os.Getenv("KEY")
   err := os.Setenv("KEY", "value")
   require.NoError(t, err)

   t.Cleanup(func() {
       os.Setenv("KEY", old)
   })
   ```

3. **No leaking global state:**  
   **Rule 4.3** — Tests must not leave modified global or package‑level state behind. Any temporary changes to:
    - Globals
    - Env vars
    - Working directory
      must be reverted in cleanup.

---

## 5. Edge cases, inputs, and strict typing

### 5.1 Strict typing behavior

1. **Do not test impossible states:**  
   **Rule 5.1.1** — Never write tests that rely on type states that cannot occur in Go:
    - Do not test passing `nil` for arguments that are not nullable (e.g., a value type `int`, `bool`, `struct`).
    - Do not try to pass incompatible types via unsafe tricks.

2. **Respect function signatures:**  
   **Rule 5.1.2** — Use only values valid according to the function signature (no reflection to bypass types just for tests).

---

### 5.2 Edge case coverage

1. **Numerical edge cases:**  
   **Rule 5.2.1** — For numeric inputs where meaningful, tests should cover:
    - Minimal value (where relevant, e.g. `math.MinInt`, `0`, or domain-specific lower bound).
    - Maximal value (e.g. `math.MaxInt` or domain-specific upper bound).
    - Zero value.
    - Typical “normal” values (positive, negative where relevant).

2. **Boolean edge cases:**  
   **Rule 5.2.2** — For boolean parameters, both `true` and `false` combinations must be tested in relevant contexts.

3. **String edge cases:**  
   **Rule 5.2.3** — For string inputs, include:
    - Empty string `""`.
    - String with only whitespace (e.g. `"   "`).
    - Typical “normal” strings.
    - Optional: long strings or strings with special characters if relevant (UTF‑8, newlines, etc.).

4. **Collection edge cases:**  
   **Rule 5.2.4** — For slices/maps:
    - `nil` slice/map (if allowed).
    - Empty slice/map.
    - Single element.
    - Several elements, including boundary cases.

5. **Error handling:**  
   **Rule 5.2.5** — For functions that can return errors:
    - Test at least one “no error” scenario.
    - Test each distinct error path or category.
    - Verify error content or type when important to behavior.

---

### 5.3 Combinations of arguments

1. **Coverage across argument combinations:**  
   **Rule 5.3.1** — When a function has multiple inputs, tests must cover combinations of edge values for these arguments, not just isolated edge cases.

   Example: if a function takes `(int, bool)`:
    - `(0, false)`, `(0, true)`
    - `(max, false)`, `(max, true)`
    - Possibly more scenarios if logic branches on combinations.

2. **Table‑driven combinations:**  
   **Rule 5.3.2** — Use table‑driven tests to structure combinations to keep tests readable and maintainable.

---

## 6. What not to test and what to avoid

1. **No logging assertions (repeated):**  
   **Rule 6.1** — Do not assert on logging calls unless explicitly required by the user.

2. **Do not test mocks as units:**  
   **Rule 6.2** — Never create tests whose main purpose is proving that mocks themselves work. Mocks are helpers only.

3. **No reliance on timing or randomness:**  
   **Rule 6.3** — Avoid tests that:
    - Depend on real time delays (`time.Sleep` with long windows).
    - Depend on randomness without a fixed seed.

   If necessary, inject time or random generators as dependencies and control them in tests.

4. **No unstable external dependencies:**  
   **Rule 6.4** — Do not rely on:
    - Network availability.
    - External APIs.
    - File system layouts outside temporary/test directories.

5. **No flaky tests:**  
   **Rule 6.5** — If a test could intermittently fail due to non‑determinism, the agent must redesign it to be deterministic or clearly mark it as an integration test and ask the user.

---

## 7. Test ergonomics, readability, and tooling

1. **Use clear assertions:**  
   **Rule 7.1** — Prefer clear, explicit error messages in tests:
   ```go
   if got != want {
       t.Errorf("Add(%d, %d) = %d; want %d", a, b, got, want)
   }
   ```

2. **Use helper functions when useful:**  
   **Rule 7.2** — Extract repetitive setup/teardown logic into helper functions (e.g., `setupTestEnv`, `newTestServer`) but do not over‑abstract.

3. **Use `t.Helper()` for helpers:**  
   **Rule 7.3** — Mark helper functions with `t.Helper()` so failures point to the correct call site.

4. **Use `t.Parallel()` when safe:**  
   **Rule 7.4** — When tests are independent and do not share mutable global state, call `t.Parallel()` to allow parallel execution and faster test suites.

5. **Benchmarks and examples (optional):**  
   **Rule 7.5** — When asked, the agent may also generate:
    - `BenchmarkXxx` for performance.
    - `ExampleXxx` functions as executable documentation.

---

## 8. Interaction-specific rules for the AI agent

1. **Explain when blocking:**  
   **Rule 8.1** — If the agent detects a bug (Rule 1.6), it must:
    - Show the failing test.
    - Explain why this likely indicates a bug.
    - Ask: “Do you want me to adjust tests, or will you fix the code and then we continue?”

2. **Clarify ambiguous behavior:**  
   **Rule 8.2** — If behavior is unclear or multiple interpretations are plausible, the agent should:
    - Propose a default interpretation.
    - Ask the user to confirm before finalizing tests.

3. **Respect user overrides:**  
   **Rule 8.3** — If the user later adds new rules or overrides (e.g., “in this package, I do want log calls checked”), those rules take precedence over the generalized best practices.

---