# User-Prompt Templates — PROMPT-ENGINEERING Family (GoText v3)

Family: `prompteng` · System prompts: `system-prompt-engineering.md`
Version (all actions): `v3.0.0`
Class: solo, terminal, standalone. All actions: mergeable=false · terminal=true.

Input is a user description / seed (`{{user_text}}`); output is an optimized,
ready-to-paste generation prompt. Each template ends with the
`<<<UserText Start>>> … <<<UserText End>>>` delimiters and a
`Format: {{user_format}}` footer.

This family has FIVE actions:
- Three text-LLM tools (system: `prompteng.text`).
- ONE parameterized image-prompt builder (system: `prompteng.image`),
  parameters `{{target_model}}` + `{{goal}}`.
- ONE parameterized video-prompt builder (system: `prompteng.video`),
  parameter `{{target_model}}`.

================================================================================
## TEXT-LLM PROMPT TOOLS  (system prompt: prompteng.text)
================================================================================

### prompteng.text.improve — "Improve a text-LLM prompt"
Metadata: family=prompteng · group=text · mergeable=false · terminal=true · requires=none

```
Task: Improve the prompt below for use with any text-based LLM.
- Sharpen clarity, structure, role, instructions, constraints, and success criteria; resolve ambiguity.
- Preserve the original intent, task, and output type. Add no new goals or domain content.
- Keep it provider-agnostic and self-contained — do not reference any tool, file, workflow, or vendor.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### prompteng.text.compress — "Compress a prompt"
Metadata: family=prompteng · group=text · mergeable=false · terminal=true · requires=none

```
Task: Compress the prompt below.
- Remove redundancy and verbosity while keeping every instruction, constraint, edge case, and success criterion intact and functional.
- Do not weaken, drop, or alter required behaviors. Preserve the original intent and output type.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### prompteng.text.expand — "Expand a prompt"
Metadata: family=prompteng · group=text · mergeable=false · terminal=true · requires=none

```
Task: Expand the prompt below into a detailed, well-structured instruction set.
- Elaborate roles, instructions, requirements, and edge cases only where the original intent implies them.
- Preserve the original task, output type, and success criteria. Introduce no new goals or stylistic preferences.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

================================================================================
## IMAGE-PROMPT BUILDER  (ONE parameterized action — system: prompteng.image)
================================================================================

### prompteng.image — "Build an image-edit prompt"
Metadata: family=prompteng · group=image · mergeable=false · terminal=true · requires=target_model,goal

Parameters injected by runtime:
- `{{target_model}}` ∈ { GPT-Image, Gemini / Nano-Banana image, Qwen-Image-Edit,
  FLUX.2, FLUX.2-Klein, Stable Diffusion (SDXL/3.5), JoyAI-Image-Edit }
- `{{goal}}` ∈ { restore-portrait, restore-landscape/city, improve-portrait,
  improve-landscape, restyle-pro-camera, restyle-cinematic, photo→anime,
  anime/cartoon→photo, colorize, all-in-one(restore+colorize+modernize) }

How the parameters select the branch (the system prompt resolves these):
- `{{target_model}}` selects the OUTPUT PARADIGM:
  - GPT-Image, Gemini / Nano-Banana image, FLUX.2, FLUX.2-Klein  -> Paradigm A
    (single natural-language brief, no negative field; FLUX front-loads
    camera/lens; FLUX.2-Klein stays short and literal).
  - Qwen-Image-Edit, JoyAI-Image-Edit  -> Paradigm B (concise imperative
    "Tasks:" list + separate "Negative prompt:" block + optional settings;
    JoyAI negatives prefixed "--neg-prompt").
  - Stable Diffusion (SDXL/3.5)  -> Paradigm C ("Positive prompt:" comma-tags
    for SDXL or a sentence for 3.5 + "Negative prompt:" + "Settings:" with the
    denoise fidelity dial and identity-lock add-ons).
- `{{goal}}` selects the FIDELITY DIAL and content recipe:
  - restore-* and improve-* and colorize and all-in-one  -> FAITHFUL: repair/clean
    only, lock identity/pose/composition, keep natural texture, no beautifying;
    SD denoise low (~0.4–0.55).
  - restyle-* and photo→anime and anime/cartoon→photo  -> CREATIVE-BOUNDED: allow
    lighting/lens/medium/style to change but still pin identity, pose, and
    composition; SD denoise higher.
  - restyle-pro-camera / restyle-cinematic  -> add explicit camera/optics
    vocabulary (body + lens, key/fill light, depth of field, color accuracy).

```
Task: Build ONE optimized image-edit prompt for the model "{{target_model}}", tuned to the goal "{{goal}}", from the description/seed below.
- Resolve "{{target_model}}" to its output paradigm:
  - GPT-Image / Gemini (Nano-Banana) / FLUX.2 / FLUX.2-Klein -> a single natural-language brief, NO negative-prompt field (FLUX front-loads camera/lens language; FLUX.2-Klein stays short and literal).
  - Qwen-Image-Edit / JoyAI-Image-Edit -> concise imperative instructions plus a separate "Negative prompt:" block and an optional short settings note (JoyAI negatives may be prefixed "--neg-prompt").
  - Stable Diffusion (SDXL/3.5) -> a "Positive prompt:" (comma-tags for SDXL or a natural sentence for SD 3.5), a "Negative prompt:" block, and a "Settings:" note (denoise per the fidelity dial, CFG, sampler/steps, identity-lock add-ons).
- Resolve "{{goal}}" to the fidelity dial and content recipe:
  - Restore / improve / colorize / all-in-one -> stay FAITHFUL: repair and clean only, lock identity, pose, framing, and composition, keep natural skin/scene texture, no beautifying or reshaping; on Stable Diffusion keep denoise low.
  - Restyle / photo->anime / anime-or-cartoon->photo -> allow the rendering medium or art style to change but still pin identity, pose, and composition; on Stable Diffusion raise denoise.
  - Pro-camera / cinematic restyle -> add explicit camera and optics vocabulary (camera body + lens, key/fill lighting, depth of field, color accuracy, crisp focus on the eyes).
- Always state explicitly what must NOT change (face/identity, expression, pose, hairstyle, key objects, composition, aspect ratio) and include a "do not" block (no beautify/slim/reshape, no added/removed people or objects, no recomposition, no plastic/waxy skin, no warped anatomy, no extra fingers, no text/watermark).
- Reconstruct any missing detail conservatively from surrounding context; do not invent a new identity.

Description / seed:
<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Target model: {{target_model}}
Goal: {{goal}}
Format: {{user_format}}
```

================================================================================
## VIDEO-PROMPT BUILDER  (ONE parameterized action — system: prompteng.video)
================================================================================

### prompteng.video — "Build a video-generation prompt"
Metadata: family=prompteng · group=video · mergeable=false · terminal=true · requires=target_model

Parameter injected by runtime:
- `{{target_model}}` ∈ { Wan, Veo, Runway, Kling, Seedance, Hailuo, Luma,
  HunyuanVideo, LTX, Pika, CogVideoX, Mochi }

How the parameter selects the branch (the system prompt resolves it):
- NEGATIVE-FIELD models  -> Wan, Kling, Hailuo, HunyuanVideo, LTX, CogVideoX,
  Mochi, Seedance: emit a separate "Negative prompt:" block (default artifact
  list + seed-specific exclusions); open-weight ones may add a settings note;
  Hailuo expresses camera moves as bracketed `[command]`s.
- NO-NEGATIVE models  -> Runway, Pika, Luma: write only what you DO want; never
  phrase exclusions.
- SEPARATE-PARAMETER model  -> Veo: keep prose free of negation and add a short
  "negative_prompt parameter:" line for the API field.

```
Task: Build ONE optimized video-generation prompt for the model "{{target_model}}" from the description/seed below.
- Use the shot anatomy: Subject + Action + Scene + Camera + Lighting + Style (+ Audio if "{{target_model}}" supports it).
- Keep ONE dominant action; never combine contradictory or multiple simultaneous actions in a single clip.
- Name shot size and camera move in film grammar (static shot, slow dolly-in, pan, tracking, crane, orbit) with motion-speed adverbs; use "static shot" to suppress camera motion.
- If the seed implies image-to-video conditioning, describe ONLY motion and camera — do not re-describe static content already fixed by the image.
- Resolve "{{target_model}}" to its negative-prompt paradigm:
  - Wan / Kling / Hailuo / HunyuanVideo / LTX / CogVideoX / Mochi / Seedance -> append a separate "Negative prompt:" block (artifact list: blurred details, low quality, overexposed, deformed, extra/fused fingers, warped anatomy, flicker, morphing, watermark, subtitles) plus seed-specific exclusions; for open-weight models add a short settings note (guidance/CFG, steps, frames/FPS); for Hailuo write camera moves as bracketed [commands].
  - Runway / Pika / Luma -> write only what you DO want; do NOT phrase any exclusions.
  - Veo -> keep the prose free of negation and add a short "negative_prompt parameter:" line listing exclusions for the API field.
- Do not put duration or resolution in the prose; those are tool/UI parameters.

Description / seed:
<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Target model: {{target_model}}
Format: {{user_format}}
```
