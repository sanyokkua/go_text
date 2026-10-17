# Eval case ideas for prompt quality (2026-10-17)

Status: working notes for building the eval dataset of the `improve-llm-text-quality` change
(task group 10). Nothing here is a requirement. It supports
`internal/actions/testdata/eval/cases.jsonl`.

**Anonymization.** Every example below is synthetic. Each one was written to reproduce a mistake
or failure *pattern* seen in real usage. None is a copy of a real message.

| Kind of detail | What the examples use instead |
|---|---|
| People | Invented first names: Priya, Tomas, Lena, Marco, Yusuf, Ines, Grace, Oskar |
| Company and client | The invented "Kestrel Retail" |
| Services | Invented names: `route-planner-api`, `label-print-service`, `stock-sync-lambda` |
| Products | "Orbit Dashboards" |
| Places | "Eastbrook" and "Millford" |
| Links | `example.com` and `example.org` (reserved domains) |
| Ticket keys | `ORB-` |
| Phone numbers | The UK drama range (`01632 960xxx`) |

When you add cases, follow the same rules:
- no real names, companies, clients, products, services, hosts, ticket keys, dates tied to real
  events, or personal circumstances;
- keep only the *shape* of the mistake.

---

## 1. Usage profile (aggregate)

- **Runs.** 629 unique runs (input + action, deduplicated).
  - 92% are the stack "proofread enhanced + humanize" on short work chat messages.
  - 41 are EN → UK translations.
  - A handful are tone, professionalize and email runs.
- **Typical input.** About 60 words, often 2–4 short lines. The author is a non-native English
  speaker, and the message is often a status update, a coordination request or an access
  problem. Some inputs contain lists, links, ticket keys, dates and service names.
- **Author voice.** Openers like "So," / "Basically" / "Just…", softeners like "maybe", "I believe",
  "I would suggest", "seems like", and "please" / "could you". Clauses are joined with " - ".
  The author sometimes uses "…" and ")" emoticons.
- **Heuristic counts of the merged stack's damage** (raw, per run):

| Change in output vs input | Runs |
|---|---|
| "So," opener removed | 160 |
| "would" reduced (mostly turned into "'d", see §4) | 102 |
| Em dash introduced | 91 |
| Fewer lines | 83 |
| "just" reduced | 67 |
| "maybe/perhaps" reduced | 56 |
| Fewer sentences | 50 |
| "I think/believe/suppose" reduced | 21 |
| "seems" reduced | 18 |
| "please" reduced | 17 |
| "could/can you" reduced | 8 |
| Greeting dropped | 8 |

---

## 2. Input mistakes to seed (what proofreading must fix)

These are the error types the author makes. Seeded-error cases should cover each row at least
once. Every example is newly written and has the same shape as the real mistake.

| Error type | Synthetic example → expected fix |
|---|---|
| Future tense in "when/if/after/until" clauses | "when the patch will be released" → "when the patch is released"; "after I will return" → "after I return"; "until the server will be restarted" → "until the server is restarted" |
| Subject–verb agreement | "The report do not include" → "does not include"; "There is three reasons" → "There are three reasons"; "Pipeline have failed" → "The pipeline has failed" |
| Wrong verb form after "didn't" or "have" | "I didn't found" → "I didn't find"; "Lena already have merged" → "Lena has already merged" |
| Missing or wrong article | "I am seeing warning" → "a warning"; "needs approval from owner" → "from the owner"; "a an update" → "an update"; "prepared PR" → "prepared the PR" |
| Prepositions | "attend to demo" → "attend the demo"; "late on the meeting" → "late for the meeting"; "in any time" → "at any time" |
| Word order | "I will try tomorrow finish the review" → "I will try to finish the review tomorrow"; "Where will be they stored" → "Where will they be stored"; "better to all secrets store in the vault" → "better to store all secrets in the vault" |
| Verb pattern | "recommend to restart" → "recommend restarting"; "would like to note, that" → "would like to note that" |
| Missing verb or subject | "Not sure if it a regression" → "if it is a regression"; "But yesterday started getting timeouts" → "But yesterday I started getting timeouts" |
| Typos | Tomorow, recieve, enviroment, seperate, dependancy, wich, ofcourse, "basedon" |
| Unidiomatic word choice | "preferable time" → "preferred time"; "near task" → "related task"; "in other manner" → "in another way" |
| " - " used to join clauses | "Today - no progress on my side" → "Today, no progress on my side" (a comma or period, **never** an em dash) |

---

## 3. Model failure patterns (what the eval must catch)

These are synthetic input/output pairs that show each failure the merged prompt produced. Only
the shape matches real runs. The eval should contain the **input** and check the listed property
on the model's output.

| # | Failure | Synthetic input → bad output of this pattern | Check |
|---|---|---|---|
| F1 | Greeting dropped | "Hello. I will send it tomorrow. Today I was in workshops all day, so tomorrow I will send the summary." → "I was in workshops all day, so I'll send the summary tomorrow." | keep "Hello." |
| F2 | Acknowledgement dropped | "Ok, understood. I have the same error. I will raise it in the channel then" → "I have the same error. I'll raise it in the channel now." | keep "Ok, understood." |
| F3 | Request reworded into an order | "I would propose to move the retro to Thursday. Please add your topics to the board." → "Let's move the retro to Thursday. Add your topics to the board." | keep "I would propose" (or "I'd propose"), keep "Please" |
| F4 | Polite question flattened | "could you please advise how to proceed if…" → "How should I proceed if…" | keep "could you please" |
| F5 | Check question dropped | "do I understand correctly that only the admin can reset it?" → "Can only the admin reset it?" | keep "do I understand correctly" |
| F6 | Hedge removed | "Seems the job is not scheduled on the new cluster" → "The job isn't scheduled on the new cluster" | keep "seems" |
| F7 | Opinion became an instruction | "I think it makes sense to check with Ines first" → "Check with Ines first." | keep "I think"; forbid a bare imperative opener |
| F8 | Suggestion became a decision | "I would postpone the upgrade to next week" → "I'll postpone the upgrade to next week" | keep "would postpone" |
| F9 | Meaning inverted | "I suppose we simply miss this alert" (meaning *missed*) → "I think we should ignore this alert" | forbid "ignore"; expect "missed" |
| F10 | Agent changed | "we can merge it when we will be ready" → "…whenever you're ready" | forbid "you're ready"; expect "when we are ready" |
| F11 | Ambiguous participle "fixed" | "I will review the logs, applied fixes and propose a plan" (= the fixes that were applied) → "…apply fixes…" | forbid "apply fixes"; keep "applied fixes" or "fixes applied" |
| F12 | Typo read as a word | "Yusuf is on the your question, he will reply soon" → "Yusuf is your question…" | forbid "is your question"; expect "on your question" |
| F13 | Abbreviation expanded wrongly | "Please link the RFCs to the epic" (RFC = request for change here) → "Please link the Requests for Comments…" | keep "RFCs" |
| F14 | Framing sentence dropped | "Just to clarify what I meant. The rollout starts only after QA sign-off." → "The rollout starts only after QA sign-off." | keep sentence 1 |
| F15 | Lines merged | three short chat lines → one paragraph | non-empty line count kept |
| F16 | Em dash introduced | "Maybe you are right - the rule is not needed anymore." → "Maybe you're right—the rule isn't needed anymore." | no new "—" |
| F17 | Contractions forced | "I will", "I do not" → "I'll", "I don't" across the message | contraction style kept (voice metric) |
| F18 | Voice openers stripped | "So, …", "Basically - no.", "Just checking…" removed | voice metric |
| F19 | Emoticon removed | "…but who knows?)" → "…but who knows?" | keep ")" |
| F20 | Added words | "as agreed on the sync" → "as agreed in the weekly sync meeting" | edit ratio, no new nouns |
| F21 | Over-rewrite of a correct fragment | "I need to take an unplanned day off tomorrow" → "I need to request unexpected leave on short notice tomorrow" | edit ratio |
| F22 | Corporate tells (professionalize, professional tone) | "Hey Ines, it would help if…" → "Dear Team, I am writing to inform you… to facilitate…"; "when you are back" → "upon your return" | forbid "Dear Team", "I am writing to", "facilitate", "ensure", "upon your return" |
| F23 | Abbreviation expanded (professionalize) | "SLA" → "Service Level Agreement"; "PR" → "pull request" | keep the author's abbreviations |

What worked and must stay working (negative checks):
- URLs, ticket keys, numbers, dates, list items and service names were preserved.
- There was no preface, code fence or `<think>` leak.
- An em dash that was already in the input stayed.

---

## 4. Guard calibration notes (avoid false positives)

The real outputs show where naive counting misfires. The `textguard` design should handle these
cases, and its unit tests should encode them.

1. **Expand contractions before counting markers.** "I would like" → "I'd like" is not a lost
   hedge. Most "would reduced" hits were exactly this. Treat `'d` as would/had and `'ll` as will
   for modal checks, but flag "would" → "will" (e.g. "I would postpone" → "I will postpone").
2. **Hedges form families.** maybe, perhaps, might, probably, possibly are one family. I think, I
   believe, I suppose, I guess are another. seems, looks like, appears are a third. A swap inside
   a family ("Maybe Grace can…" → "Grace might be able to…") is not a loss. A family count
   dropping is.
3. **Count non-empty lines.** Collapsing several blank lines into one, or dropping trailing
   newlines, is not a line loss.
4. **Sentence counting.** Do not split on periods inside URLs, versions (`2.4.1`), decimals or
   ellipses "…". Treat a list item as one sentence. "?)" ends a sentence.
5. **Greeting detection** covers: Hello, Hi, Hey, Dear, Good morning/afternoon/evening, "Hello
   all/everyone", "Hi <Name>", with or without a following comma or period, and lowercase "hey
   all". "Ok, understood." and "Thanks…" count as acknowledgement and courtesy (politeness
   family).
6. **Tells are introduced only if the output count is greater than the input count.** An em dash,
   ellipsis or markdown already in the input never fires.
7. **Protected tokens:** URLs, `ORB-123`-style keys, numbers including dates like `7/11` and
   `14 Oct 2026`, `@mentions`, back-ticked code, and kebab-case service names.
8. **Translate is exempt from the dash tell.** A Ukrainian em dash is correct, so translate cases
   check structure, numbers, names and "please", not dashes.

---

## 5. Synthetic case catalog (seed for `cases.jsonl`)

**Field meanings:**
- `keep`: substrings that must survive (case-insensitive). Alternatives are separated by `|`.
- `forbid`: substrings that must not appear.
- `fixes`: `wrong ⇒ right` pairs for seeded recall. Alternatives on the right are separated by `|`.

Unless an `actions` field is given, the action is `rewrite.proofread.basic`. Run every proofread
case with `.enhanced` too.

### 5.1 Failure cases (voice, politeness, meaning)

| id | input | keep | forbid | fixes |
|---|---|---|---|---|
| f-greet-1 | `Hello. I will send it tomorrow. Today I was in workshops all day, so tomorrow I will send the summary. I will ping you when the summary will be uploaded.` | `Hello.` | | `will be uploaded ⇒ is uploaded` |
| f-greet-2 | `Hi, I will try tomorrow finish the review of the design that you sent me.` | `Hi` | | `try tomorrow finish ⇒ try to finish` |
| f-greet-3 | `Hey, my laptop is in repair. As agreed on the sync - below is the updated checklist for the migration.` | `Hey` | `—` | |
| f-ack-1 | `Ok, understood. Thanks for clarification. Then I will confirm with Lena which steps are already done.` | `Ok, understood` ; `Thanks` ; `Lena` | | `for clarification ⇒ for the clarification` |
| f-ack-2 | `Ok, understood. I have the same error. I will raise it in the channel then` | `Ok, understood` ; `then` | | |
| f-greet-4 | `Good afternoon. Not sure who else from the team uses the test tablets. But yesterday started getting timeouts on login. If someone has one, can you check if you see the same behaviour?` | `Good afternoon` ; `can you check` | | `yesterday started ⇒ yesterday I started` |
| f-pol-1 | `Hello team. I Just would like to clarify, do I understand correctly that only the hotline "01632 960 418" can unlock the account?`<br>`(blank line)`<br>`Also, could you please advise how to proceed if the hotline is not reachable from abroad? Is there any other channels to get help?` | `Hello team` ; `do I understand correctly` ; `could you please` ; `01632 960 418` | | `Is there any other channels ⇒ Are there any other channels` |
| f-pol-2 | `Since half of us are at the vendor workshop, I would propose to move the retro to Thursday. Please add your topics to the board before that.` | `would propose\|'d propose` ; `Please` | `Let's move` | `propose to move ⇒ propose moving\|propose that we move` |
| f-pol-3 | `So, please, once you are free - have a look at both drafts.` | `So,` ; `please` | `—` | |
| f-pol-4 | `Hey Marco. Could you please tell from which dashboard did you take this number?` | `Hey Marco` ; `Could you please` | | `did you take ⇒ you took` |
| f-hedge-1 | `Seems the job is not scheduled on the new cluster. Maybe the cron entry was not migrated.` | `seem` ; `maybe\|might\|perhaps` | | (none; checks the hedges only) |
| f-hedge-2 | `I think it makes sense first to check with Ines about the limits. Maybe she has the numbers. And I would recommend to involve Tomas as he did the previous version.` | `I think` ; `would recommend\|'d recommend` | `You should` | `recommend to involve ⇒ recommend involving` |
| f-hedge-3 | `I would postpone the upgrade to next week, as the freeze starts tomorrow.` | `would postpone\|'d postpone` | `I'll postpone` ; `I will postpone` | |
| f-hedge-4 | `Theoretically we can add cache here, but not convinced it will help.` | `Theoretically` ; `not convinced` | | `add cache ⇒ add a cache\|add caching` |
| f-hedge-5 | `I suppose if the migration would break something - we would see it in the smoke tests.` | `I suppose` | `—` | `would break ⇒ broke\|had broken` |
| f-hedge-6 | `About the archived boards - for some reason I can't restore board. Maybe my role is too low. Maybe Grace will be able to restore it.` | `maybe\|might` ; `Grace` | | `restore board ⇒ restore the board` |
| f-hedge-7 | `Maybe the label is confusing and people misread it, the outage is possible, but unlikely.` | `maybe\|might\|perhaps` ; `unlikely` | `because` | |
| f-mean-1 | `I suppose we simply miss this alert, it was firing during the night only.` | `I suppose\|I think` ; `night` | `ignore` | `simply miss ⇒ simply missed` |
| f-mean-2 | `We can merge the branch when we will be ready with the tests.` | `when we are ready\|when we're ready` | `you're ready` ; `you are ready` | `when we will be ready ⇒ when we are ready` |
| f-mean-3 | `I will review the logs, applied fixes and propose a plan.` | `applied fixes\|fixes applied\|fixes that were applied` | `apply fixes` | |
| f-mean-4 | `Yusuf is on the your question, he will reply soon.` | `Yusuf` ; `soon` | `is your question` | `on the your question ⇒ on your question` |
| f-mean-5 | `Please link the RFCs to the epic before the board review.` | `RFCs` | `Request for Comments` ; `Requests for Comments` | |
| f-mean-6 | `She is not the owner, we need to find the owner ourselves.` | `not the owner` ; `ourselves` | | |
| f-frame-1 | `Just to clarify what I meant. The rollout starts only after QA sign-off.` | `Just to clarify what I meant` ; `QA sign-off` | | |
| f-voice-1 | `Basically - no. The scope is unchanged. As there should not be schema change - we only need a quick smoke test.` | `Basically` | `—` | `schema change ⇒ a schema change\|schema changes` |
| f-voice-2 | `To be honest… I forgot what we decided about the cache. Not sure if it a regression - but who knows?)` | `…` ; `?)` | | `if it a regression ⇒ if it is a regression\|if it's a regression` |

### 5.2 Structure cases (lines, lists, protected tokens)

| id | input (`\n` = line break) | keep | fixes |
|---|---|---|---|
| s-lines-1 | `Hi. Maybe you are right, if nobody reads the report - it makes no sense to generate it daily.\nWe can switch it to weekly and thats it.\nI think we should mention it at the retro` | 3 non-empty lines; `Maybe`; `I think` | `thats ⇒ that's\|that is` |
| s-list-1 | `Hey, I can't close these tasks in the tracker. I am seeing warning that it needs reviewer, and there is no reviewer like "stock-sync-lambda team" in the list.\n\n- https://tracker.example.com/browse/ORB-1104\n- https://tracker.example.com/browse/ORB-1107\n- https://tracker.example.com/browse/ORB-1112` | `Hey`; all 3 URLs; `stock-sync-lambda`; 3 list lines | `seeing warning ⇒ seeing a warning`; `needs reviewer ⇒ needs a reviewer` |
| s-list-2 | `Hi all. As I will be at a conference, from Monday till Wednesday I will be offline.\n\nSo, before I will leave, just checking that the cutover plan is still valid.\n\nCutover plan:\n- Region: West\n- Store IDs: 12, 58\n- Freeze: 3 Nov 2026\n- Cutover: 4 Nov 2026\n- Ticket: https://tracker.example.com/browse/ORB-3015\n- Grace will run the cutover on 4 Nov 2026\n\nPlease tell me if something changed and the plan needs an update.` | `Hi all`; `So,`; `just checking`; `Please`; every list line; `12, 58` | `before I will leave ⇒ before I leave` |
| s-blank-1 | `Yes, most parts of the platform already migrated. Only route-planner-api and label-print-service remain.\n\n\n\nThis week I will prepare the change request for phase 2.` | both service names; `phase 2` (blank-line collapse allowed) | `platform already migrated ⇒ platform are already migrated\|platform have already migrated` |
| s-md-1 | `## Rollout notes\n\n**Owner:** Ines\n- Step 1 - disable the old job\n- Step 2 - enable the new one` | `##`; `**Owner:**`; 2 list lines | (clean apart from dash style) |
| s-dash-1 | `Today - no progress on my side, I expected the vendor to answer before lunch - but still silence.` | `Today` | (forbid `—`) |
| s-code-1 | `Please set CACHE_TTL=600 in the config, see https://docs.example.org/config#cache. It is reducing the load.` | `CACHE_TTL=600`; the URL | `It is reducing ⇒ It reduces\|It will reduce` |

### 5.3 Clean controls (expected output = input)

- `c-1` `Hello. Which region should the new bucket be created in?`
- `c-2` `Good morning. Since the demo moved to 11:00, let's skip today's standup.`
- `c-3` `Thanks, Lena. I will look at it after lunch and get back to you.`
- `c-4` `The tests are green, but the deploy job hasn't started yet.`
- `c-5` `Hi all,\nthe migration is finished. Please check your dashboards when you have a minute.\nThanks!`
- `c-6` `Maybe we should wait for Tomas. I think he knows this module better than I do.`
- `c-7` `So, the order stays the same: backup first, then the upgrade.`
- `c-8` `I'm out on Friday. Grace will cover the support rota.` (contractions kept)
- `c-9` `I am not sure this is a bug. Could you please attach the screenshot?` (full forms kept)
- `c-10` `Can you look at ORB-3307 today? It blocks the release.`
- `c-11` `Please set CACHE_TTL=600 in the config, see https://docs.example.org/config#cache.`
- `c-12` `Hey Priya, just checking: is the workshop still on Friday at 10:00?`

### 5.4 Seeded-error cases (recall)

| id | input | fixes |
|---|---|---|
| e-1 | `Tomorow I will have a dentist appointment, so I can be late on the planning.` | `Tomorow ⇒ Tomorrow`; `late on ⇒ late for` |
| e-2 | `Pipeline have failed again, and the alert still not triggered.` | `Pipeline have ⇒ The pipeline has`; `still not triggered ⇒ still hasn't triggered\|still has not triggered` |
| e-3 | `The report do not include the weekend data.` | `report do not ⇒ report does not\|report doesn't` |
| e-4 | `When the patch will be released, I will update the runbook.` | `will be released ⇒ is released` |
| e-5 | `Are you going to attend to demo on Thursday?` | `attend to demo ⇒ attend the demo` |
| e-6 | `There is three reasons for this delay.` | `There is three ⇒ There are three` |
| e-7 | `I didn't found the config file in the repo.` | `didn't found ⇒ didn't find` |
| e-8 | `It is better to all secrets store in the vault.` | `to all secrets store ⇒ to store all secrets` |
| e-9 | `Please, ping me in any time if the import fails.` | `in any time ⇒ at any time` |
| e-10 | `Everything else - works fine.` | `else - works ⇒ else works` |
| e-11 | `Lena already have merged ORB-1519.` | `already have merged ⇒ has already merged` |
| e-12 | `I have prepared PR. What is preferable time for the review?` | `prepared PR ⇒ prepared the PR\|prepared a PR`; `preferable time ⇒ preferred time` |
| e-13 | `I posted a an update in the channel.` | `a an ⇒ an` |
| e-14 | `I did not recieve the invite for the seperate session.` | `recieve ⇒ receive`; `seperate ⇒ separate` |
| e-15 | `Where will be they stored after the migration?` | `will be they ⇒ will they be` |
| e-16 | `I would like to note, that the certificate expires soon.` | `note, that ⇒ note that` |

### 5.5 Other actions

| id | actions | input | checks |
|---|---|---|---|
| o-tone-1 | `rewrite.tone.professional` | `hey, the staging db is down again, can someone check? I'm blocked` | keep the ask and "staging"; forbid `—`, `I hope this message finds you well`, `facilitate`, `ensure` |
| o-prof-1 | `rewrite.intent.professionalize` | `Hey Ines, Marco. It would help if the runbook gets the new failover steps, so support has one place to look.` | keep `Ines`, `Marco`, `runbook`; forbid `Dear Team`, `I am writing to`, `facilitate`, `—` |
| o-prof-2 | `rewrite.intent.professionalize` | `The SLA report is late again, the PR with the fix is waiting for review.` | keep `SLA`, `PR`; forbid `Service Level Agreement`, `pull request`, `—` |
| o-tone-2 | `rewrite.tone.diplomatic` | `Next time - please send the agenda before the call. We spent 50 minutes just to find out what the topic is.` | keep `50 minutes`, the request itself, `please`; forbid `—` |
| o-email-1 | `structure.doc.email` | `Honestly… I lost track of where we ended with the pricing page. Do you remember what we agreed about Orbit Dashboards?` | keep `Orbit Dashboards`; allow `Subject:` and a sign-off; forbid `[Your Name]`, `—` |
| o-hum-1 | `rewrite.intent.humanize` | `It's worth noting that the migration — which plays a pivotal role in our roadmap — is on track. Additionally, we will ensure a seamless handover, highlighting our commitment to quality.` | forbid `worth noting`, `pivotal`, `seamless`, `highlighting`, `Additionally`; output has fewer `—` than input; keep `migration`, `on track`, `handover` |
| o-hum-2 | `rewrite.intent.humanize` | `Hello Marco. Maybe we can move the demo to Friday? Please let me know.` | keep all 3 sentences, `Hello Marco`, `Maybe`, `Please`; edit ratio ≤ 0.2 |
| o-stack-1 | `rewrite.proofread.enhanced`, `rewrite.intent.humanize` | reuse f-pol-1, f-hedge-2 and s-list-2 | same keep and forbid checks as the proofread cases (the old damage path) |
| o-sum-1 | `summarize.summary` | a 150-word synthetic status update about the `route-planner-api` release | forbid openers `Overall,`, `In summary,`, `In conclusion,`; keep the service name and dates |
| o-tr-1 | `translate.text` (EN → UK) | `hi all, sorry for late notice - Eastbrook opening moved by one week, now 7/11 together with Millford` | keep `7/11`; place names transliterated, not translated; lowercase register kept |
| o-tr-2 | `translate.text` (EN → UK) | `Please send the slides to Priya by Friday.` | output contains `будь ласка`; keep the name |
| o-tr-3 | `translate.text` (EN → UK) | `Orbit Dashboards will be updated tonight, so please do not use them after 20:00.` | product name not translated as a common noun (no `орбіт`); keep `20:00`; keep `будь ласка` |

---

## 6. Growing the set

- **Mutation recipe.** Start from a clean control. Inject one error type from §2, and add one voice
  element from §3: a greeting, a hedge, "please" or a " - " join. This gives a seeded case with
  known `fixes` and `keep`. One mutation per case keeps failures attributable.
- **Balance.** About 40% failure cases, 20% clean controls, 30% seeded errors and 10% other
  actions. Include several multi-line inputs and at least five list or URL inputs.
- **Private cases.** Real messages may be kept only in the git-ignored `.tmp/eval/cases/`, which
  the harness loads if present. Anything committed must pass the anonymization rules at the top.
- **Guard unit tests.** The §4 calibration notes double as `textguard` unit-test rows. Each note
  should have one row showing it does **not** fire and one showing it does.
