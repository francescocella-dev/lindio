# Intake analyzer

## Scope

M5 formalizes the assistance that Lindio applies when an operator pastes a customer request. The current implementation is deliberately **deterministic and local**: it uses explicit rules, regular expressions and keyword matching. It does not call an LLM, does not require an API key and does not send the customer's message to an external AI provider.

The goal is not to market deterministic rules as artificial intelligence. The goal is to make the current capability useful, explainable, testable and replaceable.

## Architecture

The analysis flow is split into three boundaries:

1. `IntakeAnalysisInput` / `IntakeAnalysisResult` define the typed and runtime-validated contract;
2. `IntakeAnalyzer` defines the application interface;
3. `deterministicIntakeAnalyzer` is the default implementation used by the browser.

The UI talks to `intakeAnalysisService.js`, not to the rules directly.

```text
LeadForm
  -> intakeAnalysisService
    -> IntakeAnalyzer
      -> deterministicIntakeAnalyzer
        -> validated IntakeAnalysisResult
```

The core analyzer has no dependency on `window`, timers, React, Supabase or network APIs. It can run in Node tests or in another JavaScript runtime.

## Truthful quality assessment

The previous prototype exposed a numeric `confidence` percentage. That value was produced by a handcrafted formula and was not a calibrated probability, model confidence or empirically validated score.

M5 removes that percentage from the contract. The analyzer now exposes a qualitative assessment:

- `low`
- `medium`
- `high`

The band is still heuristic, but its supporting signals are returned alongside it. Examples include:

- service recognized by explicit rules;
- location detected;
- number of structured details found;
- number of important details still missing;
- contact information detected;
- rule-based value estimate used.

The UI displays these reasons and explicitly says that the quality band is not a statistical probability.

## No invented defaults

When no rule clearly recognizes a service, the analyzer now returns an empty `serviceType`, an `estimatedValue` of `0`, a low assessment and a generic response asking for clarification.

When two service rules obtain the same best match, the result is treated as ambiguous instead of silently selecting the first rule.

This is intentional. A missing suggestion is preferable to a confident-looking but unsupported value that could influence a small business operator.

## Rule-based value estimate

When a service is recognized, Lindio may still calculate an orientative value using static base values, square-meter bands and urgency rules inherited from the prototype.

This is **not a quote** and is not presented as one. The UI labels it as a rule-based orientative value and the analysis signals explicitly describe the limitation.

The operator can always replace the value before saving the lead.

## Privacy

The default M5 implementation executes entirely in the browser. No customer message leaves the client as part of the intake analysis flow.

Persisting the lead to Supabase remains a separate, explicit product action when the operator saves the request. The analyzer itself does not perform persistence.

## Manual control and fallback

Every suggested field remains editable. The analyzer never commits a lead or changes an existing lead by itself.

If analysis fails or the contract rejects an invalid result, the form remains usable for manual entry. Changing the raw customer message invalidates the previous analysis so stale suggestions cannot be applied accidentally.

## Legacy `ai*` persistence names

The existing lead schema contains `aiSummary` / `aiSuggestedReply` application properties and matching database fields inherited from the prototype. M5 keeps those persisted names to avoid a data migration whose only purpose would be cosmetic renaming.

New application boundaries and visible UI terminology use `intake analysis` / `analysis` naming. The old `aiAdapter.js` and `LeadAiPanel.jsx` files are reduced to compatibility facades and should not be used by new code.

A future schema cleanup may rename the persisted fields through an explicit migration if there is enough value to justify it.

## Future LLM extension point

A future implementation can satisfy the same `IntakeAnalyzer` interface, for example:

```text
IntakeAnalyzer
  |- deterministicIntakeAnalyzer   (default today)
  `- serverLlmIntakeAnalyzer       (possible future)
```

An LLM adapter should not run with a provider key in the browser. It would require a server-side boundary with explicit privacy handling, provider configuration, timeouts, retry/rate-limit policy, output validation and deterministic/manual fallback.

Introducing an LLM is therefore a separate product and infrastructure decision, not a prerequisite for calling M5 complete.
