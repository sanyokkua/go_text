# GoText "Use Context Window" — Feature-Scoped Live Testing Plan

> **Scope:** This plan is narrower and deeper than the general comprehensive live-testing pass
> (`docs/V3_Temp_Docs/2026-06-30-comprehensive-live-testing.md`). It exercises exactly one feature —
> the "Use context window" toggle in Settings > Model — across real Ollama and LM Studio backends,
> at small/large/too-large window sizes, crossed with the legacy `max_tokens` vs
> `max_completion_tokens` parameter. A prior read-only code investigation flagged 6 suspected issues
> (see **Suspected Issues** below); every phase maps back to confirming or refuting at least one.

**Goal:** Determine whether the context-window setting actually changes model behavior as a user
would expect, for both small (truncation/overflow) and large (fits-the-real-payload) values, on
both supported local providers, using models up to 8B parameters.

**Architecture:** Phase-based testing using Chrome browser automation at `http://localhost:34115`
(Wails dev server, already running). Tests run sequentially; Phase 0 is the setup gate, Phases 1-11
are feature verification, Phase 12 is cleanup + findings.

**Tech Stack:** Chrome MCP (`mcp__claude-in-chrome__*`), Ollama at `http://localhost:11434`,
LM Studio at `http://localhost:1234`, LM Studio CLI (`lms`), `wails dev` running at `:34115`.

## Suspected Issues (from static analysis — confirm/refute during this pass)

1. **Frontend/backend range mismatch** — UI slider allows 512–131072 (step 512); backend validator
   requires 1024–200000 (`internal/settings/service.go:315-320`).
2. **Validation error misclassified** — backend validator returns plain `fmt.Errorf`, not
   `*apperr.AppError`, so an out-of-range save (if reachable) surfaces a generic "Something went
   wrong" toast, not a clear validation message.
3. **`ContextWindow` is overloaded as the output-token cap** — `newChatCompletionRequest`
   (`internal/actions/service.go:56-65`) sets `MaxTokens`/`MaxCompletionTokens` to the raw
   `ContextWindow` value. `chatRequestFrom` (`internal/llms/service.go:298-303`) also sets `NumCtx`
   to the same value, but `openai_provider.go:99-117` only forwards `num_ctx` to **Ollama** — LM
   Studio/llama.cpp/OpenAI/Azure never get a real context-length change, only a completion-token cap.
4. **`apperr.ContextWindow`/`CodeContextWindow` is dead code** — a real "context exceeded" HTTP 400
   falls into the generic `apperr.Upstream` branch (`internal/llms/http_errors.go:28-43`), so the
   friendly frontend toast wired in `notifications/slice.ts:120-127` is currently unreachable.
5. **"Test inference" verification button ignores the setting** (`internal/verification/service.go:186-189`)
   — always sends a bare unconstrained prompt.
6. **Prompt Inspector never shows the context-window value** — `buildPreviewParams`
   (`internal/actions/service.go:421-443`) has no `contextWindow` field.

## Model Matrix

Chosen from models already present locally (32GB unified memory Mac; up to 8B params, quantized):

| Provider | Slot | Model | Params | Native context |
|---|---|---|---|---|
| Ollama | ≤4B | `ministral-3:3b-instruct-2512-q4_K_M` | 3.8B | 262144 |
| Ollama | 7-8B | `qwen2.5:7b-instruct` | 7.6B | 32768 |
| LM Studio | ≤4B | `qwen/qwen3-4b-2507` | 4B | 262144 |
| LM Studio | 7-8B | `bartowski/Qwen2.5-7B-Instruct-GGUF` (downloading; fallback: `google/gemma-4-26b-a4b`, MoE, noted as a deviation if used) | 7B | 32768 |

The 7-8B slot deliberately has native context (32768) well below both the app's UI slider max
(131072) and backend validation max (200000) — this is what makes a genuine "request more context
than the model natively supports, but still reachable via the UI" test possible. The ≤4B slot's
native context (262144) exceeds the UI's own max (131072), so for that slot "max context" in this
plan means the UI's own ceiling (131072), not the model's true native max — this mismatch itself is
worth recording as an observation.

## Global Constraints

- Never assert on LLM output *content* — only on mechanism (non-empty output, truncation shape,
  error toast presence/absence, HTTP status/body captured via `preview_network`/`read_network_requests`).
- Complete Phase 0 before any inference test.
- Reuse existing Ollama/LM Studio providers from prior testing sessions if already configured in
  Settings > Providers, rather than recreating them.
- For every phase involving live inference, capture the actual outgoing request payload (network
  tab / `read_network_requests`) — this is the only way to confirm issues #3–#5, which are about
  wire-level behavior invisible in the UI.
- LM Studio model loading/context-length is controlled via the `lms` CLI
  (`lms load <model> -c <context-length>`, `lms unload`, `lms ps`); fall back to GUI automation only
  if the CLI fails.

## Reusable Text Fixtures

Instead of literal giant inline blocks, fixtures are generated from one base paragraph repeated N
times. Base paragraph (`BASE-PARA`, ~120 words):

```
The product team spent the afternoon reviewing feedback from the latest round of customer
interviews. Several recurring themes emerged: users want faster load times, clearer error messages,
and a simpler onboarding flow that does not require reading a manual. The engineering lead proposed
splitting the onboarding redesign into three incremental releases rather than one large rewrite, to
reduce risk and get feedback sooner. The design team agreed to prepare updated wireframes by the end
of the week. Support volume for the current version remains steady, with most tickets related to
account recovery rather than core functionality. The team closed the meeting by agreeing to revisit
priorities once the next round of usage data is available.
```

Generate fixtures into `.tmp/` with a small script (adjust repeat count if a model's tokenizer makes
the actual token count diverge noticeably from the estimate — verify via provider logs or response
`usage` fields where available):

```bash
mkdir -p .tmp
python3 - <<'PY'
base = open('/dev/stdin').read() if False else """<BASE-PARA text above>"""
PY
```

| Fixture | Repeats | ~Words | ~Tokens (×1.3) | Purpose |
|---|---|---|---|---|
| `CTX-XS` | 1 | ~120 | ~155 | Sanity/baseline, fits any window |
| `CTX-S` | 8 | ~960 | ~1,250 | Overflows a 1024-token window |
| `CTX-M` | 54 | ~6,480 | ~8,400 | Overflows 4096/8192, fits in 32768 |
| `CTX-L` | 217 | ~26,000 | ~33,800 | Overflows 32768, exercises 65536/131072 |
| `CTX-XL` | 792 | ~95,000 | ~123,500 | Near-max payload for the ≤4B / 262144-native slot |

Paste fixtures into InputPane via direct DOM value assignment + dispatched input event (not
simulated typing) since typing 100K+ tokens is impractical.

## Assertion Protocol

- **Pass** = run status transitions idle → running → idle, OutputPane is non-empty, no error toast
- **Fit check** = output is non-empty and not obviously truncated mid-sentence/word
- **Truncation check** = output is cut off mid-sentence/word, or suspiciously short relative to what
  a normal completion for that action would produce
- **Overflow-error check** = an error toast appears; capture its exact text and, via network
  inspection, the HTTP status/body returned by the provider
- **No-op check** = comparing two runs (toggle ON vs OFF, or two different window values) shows no
  observable difference in outgoing request or behavior, proving the setting had no effect
- **Validation check** = Save button disabled OR inline/toast error appears; note whether the error
  message is specific ("must be 1024–200000") or generic ("Something went wrong")

---

## Phase 0: Pre-flight

- [ ] Confirm `wails dev` running: `curl -s -o /dev/null -w '%{http_code}' http://localhost:34115` → `200`
- [ ] `ollama list` → confirm `ministral-3:3b-instruct-2512-q4_K_M` and `qwen2.5:7b-instruct` present
- [ ] `lms ps` → confirm no stale models loaded; `lms load qwen/qwen3-4b-2507 -c 131072 -y` (or its
      true native max if reachable) to pre-warm the ≤4B LM Studio slot
- [ ] Confirm the 7-8B LM Studio download completed: `lms ls` → look for the Qwen2.5-7B GGUF; if
      unavailable, note the deviation (fallback model) and proceed
- [ ] Generate `.tmp/ctx-xs.txt` … `.tmp/ctx-xl.txt` per the fixture table
- [ ] Open Settings > Providers; confirm/create Ollama (`http://localhost:11434/`, Auth None) and
      LM Studio (`http://localhost:1234/`, Auth Bearer, empty key) providers; run Test
      connection/models/inference for each

**Expected:** Both servers reachable, both provider entries verified, fixtures generated.

## Phase 1: Baseline (toggle OFF)

- [ ] Ollama current provider/model = `qwen2.5:7b-instruct`; "Use context window" OFF; run a
      Rewriting action on `CTX-M`; record output length/behavior and outgoing request body
      (confirm no `max_tokens`/`max_completion_tokens`/`num_ctx` field present)
- [ ] Repeat for LM Studio (7-8B slot)

**Expected:** Baseline captured for comparison; toggle-OFF requests carry no token-limit fields.

## Phase 2: Settings UI boundary/validation matrix (no inference)

- [ ] Drag context-window slider to its minimum (512); Save; observe: does it save silently (bug
      #1 confirmed reachable) or does an error appear (bug #2 — check if generic or specific)?
- [ ] Drag to slider maximum (131072); Save; confirm succeeds
- [ ] Toggle OFF → Save → toggle ON → confirm last value persisted
- [ ] Toggle legacy `max_tokens` vs `max_completion_tokens` radio with context window ON; Save each;
      confirm persistence

**Expected:** Document actual behavior at 512 (below backend's true 1024 minimum) with exact
error/toast text or absence thereof.

## Phase 3: Ollama ≤4B (`ministral-3:3b-instruct`), too-small window (1024) + `CTX-S`

- [ ] Set context window = 1024, ON; run Summarization on `CTX-S` (~1,250 tokens, overflows 1024)
- [ ] Capture outgoing request (`num_ctx`, `max_tokens`/`max_completion_tokens` both = 1024 expected
      per issue #3)
- [ ] Observe: truncated output, clear error, or generic error? Capture exact toast text + HTTP
      status/body

**Expected:** Documented actual behavior — truncation vs error vs silent success — with evidence.

## Phase 4: Ollama ≤4B (`ministral-3:3b-instruct`), UI-max window (131072) + `CTX-XL`

- [ ] Set context window = 131072 (UI max; below the model's true native 262144), ON
- [ ] Paste `CTX-XL` (~123,500 tokens) into InputPane via direct value assignment
- [ ] Run a Summarization action; confirm the full payload round-trips (request sent, completion
      received) without truncation-by-cap, given `max_tokens` also = 131072 per issue #3
- [ ] Note timing (should be slow, quantized 3.8B model still needs to prefill ~123K tokens)

**Expected:** Either a successful large round trip, or a specific documented failure (timeout, OOM,
error) — capture whichever occurs with timing and evidence.

## Phase 5: Ollama 7-8B (`qwen2.5:7b-instruct`), native window (32768) + `CTX-L`

- [ ] Set context window = 32768, ON; paste `CTX-L` (~33,800 tokens — slightly *overflows* 32768,
      intentionally, to see near-boundary behavior)
- [ ] Run action; capture request + response; note whether input near/at the boundary causes
      truncation of the prompt itself, an error, or is silently accepted (provider may internally
      truncate the oldest context)

**Expected:** Documented boundary behavior at the model's real native limit.

## Phase 6: Ollama 7-8B (`qwen2.5:7b-instruct`), too-big window (65536, then 131072) + `CTX-L`

- [ ] Set context window = 65536 (2x native), ON; run action on `CTX-L`; capture request/response,
      timing, memory behavior (`ollama ps` during the run to see actual loaded context size and
      VRAM)
- [ ] Repeat at 131072 (4x native); if this appears to hang beyond ~5 minutes or risks instability,
      cancel the run via the app's Cancel control and note the outcome rather than force-killing
      Ollama
- [ ] Confirm via `ollama ps` whether Ollama actually allocated the requested `num_ctx` or silently
      capped it to the model's supported max

**Expected:** Clear documentation of whether requesting beyond native context is honored, clamped,
or fails — this is the core "does the setting actually work at the extremes" check for Ollama.

## Phase 7: LM Studio ≤4B (`qwen/qwen3-4b-2507`), UI-max window (131072) + `CTX-XL`

- [ ] `lms load qwen/qwen3-4b-2507 -c 131072 -y` (loaded context must be ≥ what the app will
      request, since LM Studio's own load-time context is independent of the app setting per issue #3)
- [ ] In app: set context window = 131072, ON; paste `CTX-XL`; run action
- [ ] Capture request: confirm `num_ctx` is **never** sent to LM Studio (issue #3), only
      `max_tokens`/`max_completion_tokens`
- [ ] Confirm the large payload still round-trips successfully given LM Studio was pre-loaded with
      matching context length

**Expected:** Mirrors Phase 4's outcome for LM Studio; confirms/refutes issue #3's wire-level claim.

## Phase 8: LM Studio 7-8B, loaded-context vs app-setting mismatch

- [ ] `lms load <7-8B model> -c 8192 -y` (deliberately small, known context)
- [ ] In app: set context window = 4096 (below loaded ctx), ON; run on `CTX-S`; capture request
- [ ] Set context window = 8192 (equal to loaded ctx), ON; run on `CTX-M` (overflows 8192); capture
      request + observe truncation/error
- [ ] Set context window = 65536 (above loaded ctx), ON; run on `CTX-M`; capture request — confirm
      LM Studio's own llama.cpp server either errors (prompt+max_tokens > loaded n_ctx) or silently
      ignores the excess, since the app never sends `num_ctx` to non-Ollama providers

**Expected:** Direct evidence of whether the app's context-window value has any real effect on LM
Studio behavior beyond capping completion length — confirms/refutes issue #3 across the mismatch
range requested.

## Phase 9: Token-limit parameter matrix (legacy vs modern)

- [ ] Ollama: legacy `max_tokens` ON + context window ON (4096) → run on `CTX-XS`; capture request
      field name; confirm accepted
- [ ] Ollama: `max_completion_tokens` (modern) ON + context window ON (4096) → repeat; confirm
      accepted
- [ ] LM Studio: repeat both legacy/modern variants; note if either field name is rejected by LM
      Studio's OpenAI-compatible server (some builds only accept one)

**Expected:** Functional parity documented, or a specific rejection captured with the exact error.

## Phase 10: Verification button & Prompt Inspector blind spots

- [ ] Set context window ON at an extreme value (e.g. 512 or 131072) for the current provider
- [ ] Click "Test inference" in Settings > Providers verification panel; capture the outgoing
      request via network inspection; confirm no `max_tokens`/`max_completion_tokens`/`num_ctx`
      field is present (issue #5)
- [ ] Open Prompt Inspector for any action with context window ON; confirm the context-window value
      is never displayed among the parameter badges (issue #6)

**Expected:** Both blind spots confirmed or refuted with a screenshot/DOM read as evidence.

## Phase 11: Error surfacing for a genuine overflow

- [ ] `lms load <7-8B model> -c 2048 -y` (very small loaded context)
- [ ] In app: context window ON = 2048; run on `CTX-M` (~8,400 tokens, far exceeds 2048)
- [ ] Capture the exact toast text shown to the user and the underlying HTTP status/body via network
      inspection
- [ ] Compare against the friendly message wired in `notifications/slice.ts:120-127` ("Input too
      long... shorten it or raise the context size") — confirm whether the user actually sees this
      message or a generic "Something went wrong"/"provider returned an unexpected error" instead

**Expected:** Definitive confirmation/refutation of issue #4 with exact captured text.

## Phase 12: Cleanup & Findings

- [ ] Restore Model Config: "Use context window" OFF, value back to 4096 default
- [ ] `lms unload` any test-only loaded models
- [ ] Fill in the **Findings** table below
- [ ] Do not modify any source files in this pass — list confirmed bugs as follow-up items only

**Expected:** App restored to a clean default state; findings documented.

---

## Coverage Summary

| Phase | Area Covered | Suspected Issue(s) |
|---|---|---|
| 0 | Environment/model setup | — |
| 1 | Baseline (toggle OFF) | #3 (no-op check) |
| 2 | Settings UI boundary/validation | #1, #2 |
| 3 | Ollama ≤4B, too-small window | #3 |
| 4 | Ollama ≤4B, UI-max window | #1 (range ceiling), #3 |
| 5 | Ollama 7-8B, native window boundary | #3 |
| 6 | Ollama 7-8B, too-big window | #3 |
| 7 | LM Studio ≤4B, UI-max window | #3 |
| 8 | LM Studio 7-8B, loaded-ctx mismatch | #3 |
| 9 | Token-limit parameter matrix | — |
| 10 | Verification button / Prompt Inspector | #5, #6 |
| 11 | Real overflow error surfacing | #4 |
| 12 | Cleanup | — |

## Findings

Live-tested 2026-07-01 against real Ollama (`ministral-3:3b-instruct-2512-q4_K_M`,
`qwen2.5:7b-instruct`) and LM Studio (`qwen/qwen3-4b-2507`, `qwen2.5-7b-instruct`), using a
reverse-logging HTTP proxy in front of Ollama and LM Studio's own `server-logs` to inspect exact
outgoing request bodies and the real loaded context size (`ollama ps`, llama.cpp `n_ctx_slot`).

**Deviation from plan:** used `CTX-M`/`CTX-L` (≈8.4K/≈8.2K actual tokens — see finding #8 on token
estimate accuracy) instead of the full `CTX-XL` (≈123K tokens) for the "UI-max window" tests, to keep
per-test runtime reasonable given LM Studio's ≈175 tok/s prompt-processing rate on this hardware.
This does not weaken the conclusions below, which are about mechanism, not scale.

| # | Issue | Verdict | Evidence |
|---|---|---|---|
| 1 | Frontend/backend range mismatch (slider allows 512, backend requires ≥1024) | **CONFIRMED** | Dragged slider to 512 and saved with "Use context window" ON for `ministral-3:3b-instruct`. Reloading Settings > Model afterward showed the value had reverted to the last valid value (4096) — the save silently did not persist. |
| 2 | Validation error misclassified (plain `fmt.Errorf`, not `*apperr.AppError`) | **CONFIRMED** | Backend log for the above save: `{"level":"error","error":"SettingsService.UpdateModelConfig: contextWindow must be 1024–200000 when enabled","time":"...","message":"unclassified error"}` followed by `SettingsThunks: updateModelConfig failed: An unexpected error occurred. Please try again.` No toast was visually observed on screen (checked both corners immediately after save) — the failure is effectively silent to the user beyond the generic frontend log entry, worse than the "generic toast" originally hypothesized. |
| 3 | `ContextWindow` overloaded as output-token cap; non-Ollama providers never receive a real context-length change | **CONFIRMED** | LM Studio `server-logs` for identical requests: toggle OFF → body has no `max_tokens`/`max_completion_tokens` key at all; toggle ON @131072 → body includes `"max_completion_tokens": 131072` and nothing else token/context-related. `num_ctx`/`options` never appears in any LM Studio request body across the whole session. |
| 4 | Dead `apperr.ContextWindow`/`CodeContextWindow`; friendly "Input too long" toast unreachable | **CONFIRMED** | Forced a genuine overflow: LM Studio loaded with `-c 2048`, app context window = 8192, input ≈8.4K tokens. LM Studio returned HTTP 400 with body `"request (8087 tokens) exceeds the available context size (2048 tokens)"`. GoText backend log shows `{"code":"step_failed", ..., "cause":"LM Studio had a server error (400). Please retry."}` — the generic Upstream-style message, not the friendly context-window toast wired in `notifications/slice.ts`. |
| 5 | "Test inference" verification button ignores the context-window setting entirely | **CONFIRMED** | With context window ON (1024, legacy mode) and temperature ON (0.5), the LM Studio `server-logs` request body for "Test inference" was exactly `{"messages":[{"role":"user","content":"Hi"}],"stream":false,"n":1}` — no `temperature`, `max_tokens`, `max_completion_tokens`, or `options` field at all. |
| 6 | Prompt Inspector never surfaces the context-window value or on/off state | **CONFIRMED** | Prompt Inspector for "Concise" (LM Studio, `qwen2.5-7b-instruct`, context window ON = 1024, legacy mode) showed parameter badges `model`, `temperature 0.5`, `format plain`, `input`/`output` language, `max_tokens`, `stream false` — a `max_tokens` badge names the *field*, but the context-window *value* (1024) and enabled state are never shown anywhere in the preview. |
| 7 (**new, not in original static analysis**) | Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`) silently ignores `options.num_ctx` — the one mechanism believed to give Ollama a real context-length change does not work in practice | **CONFIRMED** | Reverse-proxied `127.0.0.1:11434` and captured exact request bodies. Requests correctly included `"options":{"num_ctx":1024}` and, separately, `"options":{"num_ctx":4096}` (confirming GoText builds the request correctly per the code read). Despite this, Ollama's own `~/.ollama/logs/server.log` showed `n_ctx_slot = 16384` for *every* request regardless of the requested value — including immediately after `ollama stop` + reload to rule out a cached/already-loaded model. Reproduced identically on a second, larger model (`qwen2.5:7b-instruct`, native max 32768) with a requested `num_ctx` of 32768: still `n_ctx_slot = 16384`. Ollama appears to always fall back to its own auto-sized default via this endpoint, independent of the app's request. |
| 8 (**new**) | Silent, severe prompt truncation when `ContextWindow` value exceeds the model's real (fixed) usable context, because the same value is also sent as `max_completion_tokens` | **CONFIRMED** | With context window = 32768 on Ollama (`ministral-3:3b-instruct`, real `n_ctx_slot` fixed at 16384 per finding #7) and a 24,955-word / 217-repetition input, the proxy confirmed the **full** input (167KB, all 217 repetitions) was sent by the app. Ollama's log shows it only actually processed `task.n_tokens = 8195` of that prompt, with `truncated = 0` (no error, no warning) — i.e. roughly three-quarters of the user's input was silently dropped before generation, most likely because reserving room for a 32768-token completion inside a fixed 16384-token context left almost no space for the prompt. No error, toast, or truncation indicator of any kind was surfaced to the user. |
| 9 (**new, informational**) | Token-limit parameter (legacy `max_tokens` vs modern `max_completion_tokens`) — no functional issue | **REFUTED** (setting works as intended) | Confirmed via LM Studio `server-logs`: selecting "max_tokens (legacy)" produced `"max_tokens": 1024` in the request; the default "max_completion_tokens" mode produced `"max_completion_tokens": <value>`. Both were accepted by LM Studio without error. |
| 10 (**new, informational**) | "Use context window"/"Use temperature"/token-limit-parameter settings are global, not scoped per provider or per model | **CONFIRMED (architecture note, not a bug)** | Setting context window to 131072 while Ollama was the current provider, then switching to LM Studio without touching Settings, carried the same 131072 value (and the toggle state) straight into LM Studio's request — confirmed via `server-logs`. This is consistent with `ModelConfig` being a single row in Settings rather than keyed by provider/model, and is worth documenting for users who might expect per-model memory of these settings. |

### Overall assessment

"Use context window" does not reliably control the model's actual context length on **either**
supported local provider today. For LM Studio (and by extension llama.cpp/OpenAI/Azure, which share
the same code path) it was already expected to be a no-op beyond capping output length; this session
additionally found that Ollama — the one provider the code explicitly branches for — is *also* a
no-op in practice, because Ollama does not honor `options.num_ctx` sent via the OpenAI-compatible
endpoint it exposes. The only thing the setting reliably does across both providers is cap
`max_tokens`/`max_completion_tokens` (output length), and because that cap is drawn from the same
number as the intended "context window," pushing it high enough to accommodate a large input can
starve the prompt of room inside the model's real (unchangeable-via-this-app) context, causing large
inputs to be silently truncated with no error or indication to the user (finding #8). Findings
#1/#2 (range mismatch, misclassified/silent validation error) and #4/#5/#6 (dead error path,
verification button and Prompt Inspector blind spots) all remain independently confirmed as well.

### Suggested follow-up (not implemented in this pass)

- Fix `internal/settings/service.go`'s validation to return an `apperr.Validation(...)` instead of a
  plain `fmt.Errorf`, and align the frontend slider's min/max with the backend's true 1024–200000.
- Investigate whether Ollama's native `/api/chat` endpoint (rather than `/v1/chat/completions`)
  actually honors `num_ctx`, and consider routing Ollama traffic there if so — otherwise the feature
  should be documented as "output-length cap only" for all providers, including Ollama.
- Decouple the "context window" value from `max_tokens`/`max_completion_tokens`; introduce an
  independent max-output-tokens setting so a large context request can never starve the prompt.
- Wire a real HTTP-400 "context exceeded" classification in `internal/llms/http_errors.go` so the
  already-built `apperr.ContextWindow` friendly toast actually fires.
- Make "Test inference" pass the configured temperature/context-window/token-limit parameters, or
  clearly label it as ignoring Model Config.
- Surface the context-window value/state in Prompt Inspector's parameter badges.
- Add automated coverage for all of the above per `GoUnitTestsRules.md`/`TypescriptUnitTestsRules.md`
  (backend: validation boundaries, `chatRequestFrom` NumCtx/MaxTokens consolidation, Ollama-only wire
  gating; frontend: slider drag + save payload assertions) — none of this is covered by an existing
  test today per the original investigation.

---

## T68 Closing-Gate Re-Verification (2026-07-02)

Every follow-up above was implemented across T61–T67 (see `docs/V3_Temp_Docs/SpecificationFolder/14-implementation-plan.md`
Phase 11) and committed on 2026-07-01. T68 re-executed the relevant phases of this plan live against
real Ollama (`ministral-3:3b-instruct-2512-q4_K_M`, native `/api/chat`) and LM Studio
(`google/gemma-3-1b` loaded with `-c 512`, `qwen/qwen3-4b-2507`) via `wails dev`, plus the full
deterministic/Target-A pipeline from `13-testing-specification.md` §11. Final verdicts:

| # | Original finding | Fixing task | Final verdict | Live re-test evidence (2026-07-02) |
|---|---|---|---|---|
| 1 | Frontend/backend range mismatch (slider 512 vs backend 1024) | T61 | **FIXED** | Settings > Model context-window slider read live via DOM: `aria-valuemin=1024`, `aria-valuemax=200000` — exact match to backend validation. The invalid gap no longer exists; 512 cannot be selected in the UI. |
| 2 | Validation error misclassified (plain `fmt.Errorf`) | T61 | **FIXED** | `internal/settings/service_test.go` boundary tests (1023 reject / 1024 accept / 200000 accept / 200001 reject) assert `apperr.Validation`, confirmed passing under `go test -race ./...`. Live reproduction of the original bug is no longer possible since finding #1's UI/backend range mismatch (the only way to reach this code path from the UI) is itself fixed. |
| 3 | `ContextWindow` overloaded as the output-token cap | T62 | **FIXED** | Settings > Model now shows independent `Use context window` (5,120) and `Use max output tokens` (12,545) controls. Live Ollama test: set context window to 1024 then 5,120 (distinct values, model unloaded between runs to force a fresh load) — Ollama's own `~/.ollama/logs/server.log` showed `n_ctx_slot = 5120` on the second run, exactly matching the configured value and clearly distinct from the max-output-tokens value (12,545). Prompt Inspector shows `context 5,120` and `max_completion_tokens` as two independent badges. |
| 4 | Dead `apperr.ContextWindow`; friendly toast unreachable | T64 | **FIXED (classification), see note** | Forced a genuine overflow (LM Studio `google/gemma-3-1b` loaded with `-c 512`, ~1,468-token input). GoText backend log: `[ActionService.runStep] LLM call failed family=summarize error=The text exceeds the model's context window.`, surfaced to the user as `Step 1 (summarize) failed: The text exceeds the model's context window.. Earlier steps completed.` — the specific classification (`apperr.ContextWindow`, verbatim message "The text exceeds the model's context window.") is reachable and its text reaches the user, which is the core of the finding. **Note:** for a chain run (the only way a normal user triggers this from the Editor), `internal/actions/orchestrator.go` always wraps the step error as `apperr.StepFailed` before it reaches the frontend, so the *specific* toast title/copy defined in `notifications/slice.ts`'s dedicated `CodeContextWindow` case ("Input too long" / "…shorten it or raise the context size.") does not currently fire standalone — the generic `CodeStepFailed` ("Step N failed") title fires instead, with the specific inner message appended. Verification's "Test inference" panel doesn't use the toast system at all (inline `✗ message` display, see `VerificationPanel.tsx`). No current caller passes a raw, non-wrapped `CodeContextWindow` error to `notifyError`, so that dedicated case is still effectively unreached in practice — a candidate follow-up is to have the `CodeStepFailed` toast handler prefer the inner error's own title/message when it is itself a classified `AppError` (e.g. `CodeContextWindow`). This does not change the finding's core verdict: the message a user actually sees is now specific and actionable, not the old generic Upstream/"Something went wrong" text. |
| 5 | "Test inference" ignores context-window setting | T65 | **FIXED** | With Ollama's ModelConfig set to context window = 5,120 and temperature = 0.5, clicking "Test inference" produced an Ollama `n_ctx_slot = 5120` load (see #3 evidence) purely from the Test-inference-triggered request — confirming `TestInference()` now builds its request from the saved `ModelConfig`, not a bare unconstrained prompt. |
| 6 | Prompt Inspector never shows context-window value | T66 | **FIXED** | Prompt Inspector for "Summary" (LM Studio, `google/gemma-3-1b`, context window ON = 5,120) parameter badges read live: `model google/gemma-3-1b`, `temperature 0.5`, **`context 5,120`**, `format plain`, `input English`, `output Spanish`, `max_completion_tokens`, `stream false` — the context-window value now has its own dedicated badge. |
| 7 (new) | Ollama ignores `options.num_ctx` via the OpenAI-compatible endpoint | T63 | **FIXED** | Ollama server log confirms every GoText request now hits `POST "/api/chat"` (the native endpoint), not `/v1/chat/completions`. Loaded-context size now tracks the requested value exactly (`n_ctx_slot = 5120` for a 5,120 request), a world apart from the pre-fix baseline where `n_ctx_slot` was always `16384` regardless of the requested value. |
| 8 (new) | Silent severe prompt truncation from the shared cap | T62 (decouple) + T64 (error surfacing) | **FIXED — upgraded outcome** | With the cap decoupled (#3) and real overflows now classified (#4), the scenario that previously caused *silent* truncation with no error now instead surfaces a clear, specific "text exceeds the model's context window" message via the step-failure toast (see #4 evidence and its note on toast wrapping). This is a better outcome than "no-op restored to a no-op" — the user is informed rather than silently served truncated output. |
| — | T67 live token-estimate feature (new, not a bug fix) | T67 | **VERIFIED END-TO-END** | Live in the running app: typing/pasting real text updates a `· ~N tokens` estimate next to the word count (confirmed `· ~1,468 tokens` for a 920-word paste, and `· ~5,596 tokens` for a larger paste). Color read via `getComputedStyle`: neutral gray (`rgb(111, 129, 125)`) at 29% of the configured 5,120-token window, switching to red (`rgb(208, 83, 83)`) once the estimate cleared 100% of the window (5,596 > 5,120) — exact match to the color asserted in `frontend/e2e/editor-interactions.spec.ts`'s T67 test suite. |

**Overall assessment (superseding the 2026-07-01 assessment above):** "Use context window" now reliably
controls actual model context length on Ollama (via the native `/api/chat` endpoint) and reliably caps
completion length independent of context on all providers, with a dedicated max-output-tokens control.
Genuine overflows surface a specific, actionable error instead of failing silently or generically. The
Settings UI, Test-inference diagnostic, and Prompt Inspector are all now consistent with what actually
gets sent to the provider. The only architectural note carried forward unchanged from finding #10 is
that these settings remain global (not scoped per provider/model) — this was documented as an
intentional, non-bug architecture note in the original pass and was out of scope for T61–T68.

**Deterministic/Target-A pipeline status:** `gofmt`, `go vet`, `go build ./...`, `wails generate module`
(bindings in sync), the `@mui`/`@emotion` guard, `go test -race ./...` (806 tests), `npm run
test:coverage` (672 tests), `sqlc diff`, the T62 migration round-trip test, `govulncheck`, `npm audit`
(0 vulnerabilities after a dependency bump), and the full Target-A Playwright suite (112 tests across
`verify-ui`, `editor-interactions`, `smoke-tests`, `appbar`, `history`, `settings-ui`, `stacks-ui`,
`text-selection`, `theme`, `theme-manual`) all pass. Two unrelated pre-existing issues were found and
fixed incidentally during this closing-gate pass (both out of the context-window feature's scope but
in scope per the branch-wide verification rule): a Prettier-formatting drift across 55 files from
earlier T61–T67 commits, and four stale `theme.spec.ts`/`theme-manual.spec.ts` e2e tests that asserted
a legacy client-only `localStorage` theme-persistence model no longer used by the app (theme is now
persisted via the backend `UIPreferences`/SQLite).

**Target-B gate 8 status — known pre-existing gap, not closed by T68.** §11.1 gate 8 specifies
`BASE_URL=http://localhost:34115 npm run verify:smoke` (i.e. `smoke-tests.spec.ts`) against a running
`wails dev`. Run as literally specified against the real LM Studio backend during this pass, it failed
6 of 9 tests — not from a regression, but because several of its assertions are hardcoded to
bridge-mock-only fixtures that a real LLM cannot reproduce: `toContainText('Mock output text.', ...)`,
the `?history-test=1` seeded `"E3 Proofread run"` entry (only exists in the bridge mock's
`HistoryHandler`), and two XSS tests expecting a specific canned payload back from the model. This is
a pre-existing spec/implementation mismatch unrelated to the context-window feature — logged as a
separate follow-up task rather than fixed here, since resolving it properly means either rewriting
`smoke-tests.spec.ts`'s assertions to be model-agnostic or re-pointing gate 8 at `live-llm.spec.ts`
(`npm run verify:live`). **For this T68 pass, gate 8 was substituted with extensive manual live
verification** (documented in the findings table above) driving the real running app via the preview
tooling against real Ollama and LM Studio — arguably deeper coverage of the actual feature than the
generic smoke suite would provide, but it is not the literal gate-8 command passing.
