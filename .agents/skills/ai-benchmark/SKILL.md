---
name: ai-benchmark
description: Use this skill for writing ai benchmark scripts and data curation.
---

# Write an ai-benchmark script

Teach an agent how to author a runnable benchmark script: dataset → OpenRouter models → type generics → schema → evaluator → config → run.

## Prereqs

- `OPENROUTER_API_KEY` in `.env` (auto-loaded by `Benchmark` import) or running `export OPENROUTER_API_KEY=sk-...` in the terminal.

## Engine (in `src/`, don't rewrite)

| Module | Exports | Role |
|---|---|---|
| `benchmark/benchmark.ts` | `Benchmark<TExpectedAnswer, TSchema>` | Orchestrates model×question, caches, renders TUI. |
| `benchmark/ai.ts` | `generate()`, `generateEvaluation()` | Structured `generateText`; LLM-judge scoring. |
| `benchmark/cache.ts` | `CacheWrite`, `FindCacheFile` | Writes `./cache/<id>.json`. |
| `types/config.ts` | `Config`, `Model`, `EvalModel` | Config + model shapes. |
| `types/data.ts` | `BenchmarkDataset`, `BenchmarkQuestion` | Dataset shapes. |

`run()` iterates `models × data`, calls `generate(model, context, schema, system_prompt, tools)`, scores via evaluator, caches, re-renders. You never call `generate`/`CacheWrite` directly.

**Two evaluator modes — at least one required or `run()` throws:**
- `evaluator_function` — deterministic function (priority if both set).
- `evaluator_models` — LLM-as-judge; judges run in parallel, scores averaged.

## 7 steps

**1. `ExpectedAnswer` type** — pick the ground-truth type that fits your data; threads through dataset + evaluator. It does NOT have to be `string` — choose whatever shape lets your evaluator judge answers correctly.
```ts
// Simplest: a single canonical answer.
type ExpectedAnswer = string

// Multiple acceptable answers (canonical + aliases/synonyms/translations).
// Use this when a question has several valid phrasings, e.g. a model could
// answer "Konoha", "Konohagakure", or "Hidden Leaf Village" — all correct.
// The evaluator then scores against every entry and keeps the best match.
type ExpectedAnswer = string[]

// Structured answer, e.g. separate first/last name for finer-grained scoring.
type ExpectedAnswer = { first_name: string; last_name: string }
```

**2. Dataset** — `BenchmarkDataset<ExpectedAnswer>`. Each question needs `id`, `context: ModelMessage[]`, `expected_answer`, `max_score` (required).
This is extremely important and ask user for some context for what kind of data to generate, they can give you some sort of information like a website or some docs which you can use to create a dataset in the typescipt file itself.
NEVER ADD SYSTEM PROMPT IN THE CONTEXT, add system prompt in the key separaetly provided.
Tools are the ai sdk toolset

```ts
// Example with ExpectedAnswer = string[] (multiple acceptable answers):
const data: BenchmarkDataset<ExpectedAnswer> = {
    id: "capitals-v1", name: "Capitals", description: "...", version: "1",
    data: [
        // Single canonical answer is fine too — just wrap in an array.
        { id: "q-1", context: [{ role: "user", content: "Capital of Karnataka?" }],
          expected_answer: ["Bengaluru", "Bangalore"], max_score: 100 },
        // A question with only one valid answer:
        { id: "q-2", context: [{ role: "user", content: "Capital of France?" }],
          expected_answer: ["Paris"], max_score: 100 },
    ],
}

// Example with ExpectedAnswer = string (single answer):
const data: BenchmarkDataset<ExpectedAnswer> = {
    id: "capitals-v1", name: "Capitals", description: "...", version: "1",
    data: [
        { id: "q-1", context: [{ role: "user", content: "Capital of Karnataka?" }],
          expected_answer: "Bengaluru", max_score: 100 },
    ],
}

//types
export interface BenchmarkQuestion<TExpectedAnswer> {
    id: string
    context: ModelMessage[]
    expected_answer: TExpectedAnswer
    max_score: number
    tools?: ToolSet
    system_prompt?: string
}

```
Last `context` message content = the `question` passed to your evaluator.

**3. Models** — discover ids: `curl -s https://openrouter.ai/api/v1/models | jq '.data[].id'`. Wrap with `openrouter(id)` (recommended).
```ts
const models: Model[] = [
    { id: "openai/gpt-5.5", model: openrouter("openai/gpt-5.5") },
]
```
Custom config: `createOpenRouter({ baseURL, apiKey, headers })`. Free models end `:free`.
This custom config can be using with some other providers as well aside from openrouter as specified by the user, you can add the ai sdk community providers like anthropic (npm install @ai-sdk/anthropic) or openai (npm install @ai-sdk/openai).


**4. Schema** — enforced via `Output.object({ schema })`; evaluator receives the parsed object as `model_answer`, not raw text.
This schema can change according to situations — design it to give your evaluator the structure it needs to judge well. A single `answer` string is the simplest case, but structured fields let you score partial credit or validate sub-parts independently.
```ts
// Simplest: one free-text answer.
const schema = z.object({ answer: z.string() })
type Schema = z.infer<typeof schema>

// Structured: separate first/last name so the evaluator can give partial credit
// (e.g. correct last name only → 50) and avoid ordering/reordering ambiguity.
const schema = z.object({ first_name: z.string(), last_name: z.string() })
type Schema = z.infer<typeof schema>

// Multiple fields, each independently checkable.
const schema = z.object({ village: z.string(), rank: z.string(), element: z.string() })
type Schema = z.infer<typeof schema>
```

**5. Evaluator (pick one)**

Mode A — function:
Use this when the answers can be predictable such as finding keywords or specific answers. You can access the types and schemas you made earlier, that is `ExpectedAnswer` and the response `Schema`.
The params contain: expected answer with that type, `model_answer` with `Schema`, `tool_calls` (list of tool names used), and the `question` string asked to the model.

**Write a real evaluator, not a toy exact-match.** The `expected_answer.toLowerCase() === model_answer.answer.toLowerCase() ? 100 : 0` pattern is strictly a minimal example — it fails on case noise, reordered names ("Uzumaki Naruto" vs "Naruto Uzumaki"), filler words around a correct term, and synonyms. Design the evaluator to judge the way a human would:
- Normalize both sides (case, diacritics, punctuation, whitespace).
- Use order-insensitive token recall, not substring `includes()` (which gives false positives like "Ku" matching "Kurama").
- Give partial credit for partially-correct answers (e.g. given name only for a full name → 50).
- If `ExpectedAnswer` is an array, score against every entry and keep the best.
- If no tools are configured, `tool_calls` is always empty — don't award bonus points for "no tools used".

```ts
// Example 1: ExpectedAnswer = string[], schema = { answer: string }
// Scores the model answer against every acceptable answer and keeps the best.
function evaluatorFunction(expected_answer: ExpectedAnswer, model_answer: Schema, tool_calls: string[], question: string): number {
    const normalize = (s: string) => s.toLowerCase().normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
    const answer = normalize(model_answer.answer);
    if (!answer) return 0;
    const scoreOne = (expected: string): number => {
        const exp = normalize(expected);
        const expTokens = exp.split(" ").filter(t => t.length > 0);
        const answerSet = new Set(answer.split(" ").filter(t => t.length > 0));
        const coverage = expTokens.filter(t => answerSet.has(t)).length / expTokens.length;
        if (answer === exp || coverage === 1) return 100;
        if (coverage >= 0.5) return Math.round(coverage * 100);
        return 0;
    };
    return Math.max(...expected_answer.map(scoreOne));
}

// Example 2: ExpectedAnswer = { first_name, last_name }, schema = { first_name, last_name }
// Structured fields let you score each part independently for finer-grained partial credit.
function evaluatorFunction(expected_answer: ExpectedAnswer, model_answer: Schema, tool_calls: string[], question: string): number {
    const eq = (a: string, b: string) => a.toLowerCase().trim() === b.toLowerCase().trim();
    let score = 0;
    if (eq(model_answer.first_name, expected_answer.first_name)) score += 50;
    if (eq(model_answer.last_name, expected_answer.last_name)) score += 50;
    return score;
}
```
Mode B — LLM as evaluator:
you can add multiple models in evaluators and average of those scores will be the final score.
```ts
const evaluatorModels: EvalModel[] = [
    { id: "z-ai/glm-4.7-flash", model: openrouter("z-ai/glm-4.7-flash") },
]
// or with prompt to add how strict it should be or how should the evaluation be done, but it might not be good practice to use different prompts for each model.
const evaluatorModels: EvalModel[] = [
    { id: "z-ai/glm-4.7-flash", model: openrouter("z-ai/glm-4.7-flash"), prompt: "respond in json score" },
]
```

**6. Config**
Only use one of evaluator function or models, if funtion is present it will get priority.
```ts
const config: Config<ExpectedAnswer, Schema> = {
    evaluator_function: evaluatorFunction,   // OR evaluator_models: evaluatorModels
    schema, models,
    system_prompt: "Respond in JSON. Answer in one word.",
}

//types

export type Model = {
    id: string
    model: LanguageModel
}
export type EvalModel = {
    id: string
    model: LanguageModel
    prompt?: string
}
export interface Config<TExpectedAnswer, TSchema> {
    evaluator_models?: EvalModel[]
    evaluator_function?: (
        expected_answer: TExpectedAnswer,
        model_answer: TSchema,
        tools_calls: string[],
        question: string
    ) => number | null
    schema: z.ZodType<TSchema>
    models: Model[]
    system_prompt?: string
}
```

**7. Run**
This runs the actual benchmark with the tui rendering.
```ts
const benchmark = new Benchmark<ExpectedAnswer, Schema>(config, "capitals-bench", data)
benchmark.run()
```
2nd arg = benchmark id → cache file `./cache/capitals-bench.json`. Same id resumes (skips cached pairs); new id starts fresh.

**8. Add script in package.json**
Add a script with relevant name in the script so use could run it with just `pnpm <script-name>`