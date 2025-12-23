## 1. General objectives for test generation

1. **Full coverage goal:**
    - **Aim** for line coverage close to 100% for the provided code, including:

      \[
      \text{All functions} \Rightarrow \text{All methods} \Rightarrow \text{All logical branches}
      \]

    - Every `if`, `else if`, `else`, `switch` case, error path, and early return must be tested.

2. **Scope of testing:**
    - **Test only the provided Go code**; do not modify production code.
    - If tests would clearly benefit from an interface extraction or refactor, **describe it in comments** but do not change the code.

3. **Unit level only:**
    - Focus on **unit tests**, not integration tests:
        - No real DB, network, filesystem, OS-level operations, or Wails runtime side-effects.
        - Use mocks, stubs, or fakes for external dependencies.

4. **Readability and extensibility:**
    - Tests must be **easy to read, easy to extend, and idiomatic** according to Go testing patterns.
    - Prefer **clear naming and simple logic** over cleverness.

---

## 2. Test file structure and naming

1. **File structure:**
    - Place tests in `*_test.go` files in the **same package** as the code under test (unless there’s a specific reason to use `package xxx_test`).
    - Group tests by the unit under test:
        - One `*_test.go` file per main unit/group (e.g. `service_test.go`, `handler_test.go`, `app_test.go`).

2. **Naming conventions:**
    - Use the `testing` package from the standard library (`testing.T`).
    - Test function names must follow:
        - `func Test<StructName>_<MethodName>(t *testing.T)` for methods.
        - `func Test<FunctionName>(t *testing.T)` for standalone functions.
    - For subtests, use `t.Run("case_name", func(t *testing.T) {...})` with descriptive, snake_case names.

---

## 3. Table-driven tests and subtests

1. **Use table-driven tests whenever applicable:**
    - For functions or methods with multiple input/expected-output combinations, define a test table:
        - A slice of structs representing:
            - **name** (string)
            - **inputs** (parameters)
            - **expected outputs**
            - **expected errors or behaviors**.
    - Example pattern (conceptually):

      ```go
      tests := []struct {
        name    string
        input   SomeType
        want    OtherType
        wantErr bool
      }{
        {name: "valid_case", input: ..., want: ..., wantErr: false},
        {name: "error_case", input: ..., want: ..., wantErr: true},
      }
 
      for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
          got, err := SomeFunc(tt.input)
          // assertions...
        })
      }
      ```

    - This pattern helps readability, coverage, and maintainability.

2. **Use subtests with `t.Run`:**
    - For logically grouped scenarios under the same function/method, use subtests:
        - Different branches (success, error, edge cases).
        - Different combinations of flags, modes, or environment-related conditions.

3. **Focus on edge cases:**
    - Include **boundary conditions** in test tables:
        - Zero values.
        - Empty strings/slices/maps.
        - Min/max values.
        - Nil pointers where relevant.
    - Explicitly include cases that hit **each conditional branch**.

---

## 4. Mocking, dependencies, and isolation

1. **Identify external dependencies:**
    - Treat as external any dependency that:
        - Is passed into a struct via a constructor or fields.
        - Performs IO (DB, HTTP, filesystem, Wails runtime APIs, OS, external services).
        - Has side effects beyond pure computation.

2. **Mock external dependencies:**
    - Do not call real external dependencies in unit tests.
    - When a struct has dependencies passed by constructor (e.g. `NewService(repo Repo, logger Logger)`), generate mock implementations for those interfaces:
        - Define a small mock type in the test file where possible (or reference existing mocks if present).
    - If a dependency is not yet expressed as an interface but obviously should be, **describe the ideal interface in comments**, then:
        - Create a **local mock struct** in tests that matches the current usage of the dependency method set.

3. **Mock behavior:**
    - Mocks should:
        - Record inputs (for assertions).
        - Return controlled outputs or errors to force branches in the code under test.
    - For each logical path:
        - Provide mock behavior that triggers that branch: success, expected error, unexpected error, nil returns, etc.

4. **Wails-specific behavior:**
    - For Wails backend structures (e.g. `type App struct { ... }` with methods exposed to the frontend):
        - Treat any Wails runtime handle or context as an external dependency to be mocked.
        - Do not attempt to start the actual Wails runtime.
        - Test backend logic as plain Go functions/methods with mocked dependencies and inputs.

5. **No mutation of production code:**
    - Do not modify the production source files to make them more testable.
    - If something is hard to test:
        - Document the limitation in comments inside the tests.
        - Suggest refactors such as dependency inversion via interfaces or constructor injection.

---

## 5. Assertions, errors, and behavior checking

1. **Use standard `testing` package assertions:**
    - Prefer the standard library `testing` package first.
    - Use explicit `if` checks and `t.Errorf`/`t.Fatalf` for assertions:
        - `if got != want { t.Errorf("...") }`
    - Only use third-party assertion libraries if they are already part of the project.

2. **Check both results and side effects:**
    - For each test case:
        - Assert returned values.
        - Assert returned errors or lack of errors.
        - If the code changes internal state or calls mocks:
            - Verify mock call counts, parameters, and side effects.

3. **Error handling tests:**
    - For each place in the code that can return an error:
        - Write at least one test where the error path is taken.
    - Assert on:
        - Whether an error is returned or not.
        - Optionally the **type** or **message** of the error, if stable and meaningful.

4. **Panics and recoveries:**
    - If a function can panic, add tests that:
        - Use `defer func() { if r := recover(); r == nil { t.Errorf("expected panic") } }()` to verify that panic occurs or does not occur.

---

## 6. Logical branches and coverage strategy

1. **Branch coverage:**
    - Ensure that for each condition (`if`, `switch`, `for` loops with conditional breaks, etc.):
        - There is at least one test case that makes the condition true.
        - And at least one test case that makes it false.
    - For `switch` statements:
        - Test every relevant case label.
        - Test default branch when reachable.

2. **Complex logic:**
    - For functions with complex logic (multiple chained conditions, nested ifs, loops):
        - Use table-driven tests to systematically cover all important combinations.
        - Add comments for complex cases explaining which branch is being covered.

3. **Early returns and guards:**
    - For each early return (e.g. guard clauses, validation failures):
        - At least one test must trigger that early return and confirm that the rest of the function is not effectively executed (usually by checking output or mock call counts).

4. **Code coverage tools:**
    - Tests should be compatible with:

      ```bash
      go test ./... -cover
      go test ./... -coverprofile=coverage.out
      go tool cover -html=coverage.out
      ```

    - The generated tests must compile and run without errors or panics when executed with `go test`.

---

## 7. Setup, teardown, and test organization

1. **Arrange–Act–Assert pattern:**
    - Structure each test logically:
        - **Arrange:** prepare inputs, mocks, and the struct under test.
        - **Act:** call the function or method under test.
        - **Assert:** verify outputs and side effects.

2. **Helper functions:**
    - For repeated setup code, create unexported helper functions in the test file:
        - e.g. `func newTestService(t *testing.T) *Service { ... }`
    - Ensure helpers are small, focused, and keep tests readable.

3. **Avoid global state:**
    - Tests must not rely on global mutable state.
    - If temporarily modifying global variables or package-level configuration:
        - Save old values and restore them at the end of the test.

4. **Parallel tests when safe:**
    - When tests do not share mutable state, use `t.Parallel()` to speed up test execution.
    - Only mark tests parallel if they are truly independent.

---

## 8. Behavior of the AI agent during test generation

1. **Code understanding before testing:**
    - The agent must:
        - Read and understand the provided Go code.
        - Identify responsibilities of each struct, method, and function.
        - Determine which branches and error paths exist.
    - It must not generate tests blindly; tests should be **semantically aligned** with the intended behavior of the code.

2. **No modification of real code:**
    - The agent must treat the source Go code as read-only.
    - It may:
        - Propose refactor ideas in test comments.
        - But not change signatures, exported names, or logic.

3. **Mock creation and use:**
    - Where external dependencies exist, the agent must:
        - Detect them via constructor arguments, fields, or function parameters.
        - Create mock implementations in the test files.
        - Use these mocks to drive different behaviors and branches.
    - The agent must **never** rely on actual external services or side-effects.

4. **Running Go tools (conceptually):**
    - The agent should structure tests so that a developer or CI can run:

      ```bash
      go vet ./...
      go test ./... -race -cover
      ```

    - The code it generates must be syntactically valid and idiomatic so these tools succeed without modification.

5. **Idiomatic Go style:**
    - Respect Go formatting (`gofmt`).
    - Follow naming conventions:
        - Exported identifiers start with uppercase, unexported with lowercase.
        - Test-only helper types and functions remain unexported.
    - Keep tests concise and direct; avoid unnecessary abstraction.

---

## 9. What each test case must contain

For each function or method the agent writes tests for, each test case (especially in table-driven tests) should include:

1. **Descriptive name:**
    - A short but expressive string that communicates the scenario:
        - e.g. `"success"`, `"error_from_repo"`, `"empty_input"`, `"invalid_id"`, `"nil_dependency"`, etc.

2. **Inputs:**
    - All parameters the function/method accepts.
    - Any relevant initial state of the struct under test.
    - Mock configurations, including what the mock should return.

3. **Expected results:**
    - Return values (exact values or properties to check).
    - Whether an error is expected (`wantErr bool`).
    - Any expected side effects (e.g. calls to mocks, changes to fields).

4. **Assertions:**
    - Checks that are **strict enough** to catch regressions but not overly coupled to implementation details that might change harmlessly.

---

## 10. Minimal example of style (conceptual)

When generating tests, the agent should follow a style similar to this (pseudo-example):

```go
func TestService_DoSomething(t *testing.T) {
  type fields struct {
    repo   Repo
    logger Logger
  }
  type args struct {
    input string
  }

  tests := []struct {
    name    string
    fields  fields
    args    args
    want    OutputType
    wantErr bool
  }{
    {
      name: "success",
      fields: fields{
        repo:   &mockRepo{ /* ... */ },
        logger: &mockLogger{},
      },
      args: args{input: "valid"},
      want: OutputType{/* ... */},
      wantErr: false,
    },
    {
      name: "repo_error",
      fields: fields{
        repo:   &mockRepo{err: errors.New("db error")},
        logger: &mockLogger{},
      },
      args:    args{input: "valid"},
      wantErr: true,
    },
    // more cases covering all branches...
  }

  for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
      s := &Service{
        repo:   tt.fields.repo,
        logger: tt.fields.logger,
      }

      got, err := s.DoSomething(tt.args.input)
      if (err != nil) != tt.wantErr {
        t.Errorf("DoSomething() error = %v, wantErr %v", err, tt.wantErr)
        return
      }
      if !reflect.DeepEqual(got, tt.want) {
        t.Errorf("DoSomething() = %v, want %v", got, tt.want)
      }

      // Optional: assert mock calls
    })
  }
}
```

This pattern should be adapted to the actual code, but the spirit—table-driven tests, subtests, mocks, clear assertions—must be preserved.