---
name: ai-benchmark
description: data curation.
---

## When to use

Use this skill when the user asks to create a benchmark, write a benchmark
script, add a new evaluation dataset, or compare models with this codebase.

**Do NOT use for:** unrelated TypeScript work, editing the benchmark engine
itself (`src/benchmark/*`), or general AI-SDK questions (use the `ai-sdk`
skill for those).

---

## Prerequisites

1. **`OPENROUTER_API_KEY`** in `.env` (or exported in the shell). The default
   `openrouter` provider reads this env var automatically.
2. **`./cache/` directory** must exist at the repo root. `CacheWrite` does
   `fs.writeFileSync("./cache/<id>.json", …)` and will throw if the dir is
   missing. Create it once: `mkdir -p cache`.
3. **Dependencies installed:** `pnpm install` (uses `ai`, `zod`,
   `@openrouter/ai-sdk-provider`, `ink`, `react`, `dotenv`).
4. **Run a script** with the project's tsx runner: `npx tsx examples/<name>.ts`.
   (`pnpm dev` is wired to `src/index.ts`, the barrel — not a runner.)

---

## Architecture (what already exists — do NOT rewrite)

The engine is in `src/`. A benchmark script only *wires together* these pieces:

| Module | Exports you use | Role |
|---|---|---|
| `src/benchmark/benchmark.ts` | `Benchmark<TExpectedAnswer, TSchema>` | Orchestrates model×question pairs, caches results, renders the TUI table. |
| `src/benchmark/ai.ts` | `generate<TSchema>()` | Calls `generateText` with `Output.object({ schema })`, returns parsed answer + cost/time/tools. |
| `src/benchmark/cache.ts` | `CacheWrite`, `FindCacheFile` | Persists answers to `./cache/<id>.json`. |
| `src/tui/tui.tsx` | `TableProvider` | ink table rendered live by `Benchmark.render()`. |
| `src/types/config.ts` | `Config`, `Model` | The config + model shape. |
| `src/types/data.ts` | `BenchmarkDataset`, `BenchmarkQuestion` | The dataset shape. |
| `src/index.ts` | *(barrel)* | Re-exports all of the above — import from here. |

**Key flow:** `Benchmark.run()` iterates `config.models × data.data`, calls
`generate(model, context, tools, schema, system_prompt)` for each, scores the
parsed `result.schema` against `expected_answer` via your `evaluator_function`,
writes every result to the cache, and re-renders the table. You never call
`generate` or `CacheWrite` yourself — the engine does.

---

## The 7 steps to write a script

A script is a single `.ts` file (place it in `examples/`). Follow these steps
in order. Each step shows the exact shape the engine requires.

### Step 1 — Define the `ExpectedAnswer` type generic

`Benchmark<TExpectedAnswer, TSchema>` and `BenchmarkDataset<TExpectedAnswer>`
are generic over what a question's "expected answer" is. Pick the simplest type
that represents your ground truth.

```ts
type ExpectedAnswer = string              // free-text / short-answer
// type ExpectedAnswer = string[]          // multiple acceptable answers
// type ExpectedAnswer = { city: string }  // structured ground truth
```

This type flows into the dataset and the evaluator — keep it consistent
everywhere.

### Step 2 — Define the dataset

A `BenchmarkDataset<ExpectedAnswer>` has metadata plus an array of
`BenchmarkQuestion<ExpectedAnswer>`. Each question is a conversation
(`context: ModelMessage[]`), an `expected_answer`, a unique `id`, and optional
`tools` / per-question `system_prompt`.

```ts
import type { BenchmarkDataset } from "../src/index.js";

const data: BenchmarkDataset<ExpectedAnswer> = {
    id: "capitals-v1",          // unique dataset id
    name: "World Capitals",
    description: "Single-word capital cities.",
    version: "1",               // bump when questions change (cache is keyed on benchmark id, not version)
    data: [
        {
            id: "q-1",
            context: [{ role: "user", content: "What is the capital of Karnataka?" }],
            expected_answer: "Bengaluru",
        },
        {
            id: "q-2",
            context: [{ role: "user", content: "What is the capital of France?" }],
            expected_answer: "Paris",
        },
    ],
};
```

Rules:
- `id` must be unique within the dataset.
- `context` is an array of AI-SDK `ModelMessage` (`{ role, content }`). The
  **last** message's content is treated as "the question" by the engine and
  passed to your evaluator as the `question` string.
- `tools` and `system_prompt` are optional and override the config-level
  `system_prompt` per question.

### Step 3 — List and pick OpenRouter models

Model IDs are strings in `provider/model` form (e.g. `"openai/gpt-4o"`,
`"anthropic/claude-3.5-sonnet"`). To **discover** available IDs, query the
OpenRouter models endpoint:

```bash
# list model ids + pricing
curl -s https://openrouter.ai/api/v1/models \
  | jq '.data[] | { id, pricing: .pricing.prompt }'
```

Each model is wrapped with the `openrouter` provider into a `Model`
(`{ id, model: LanguageModel }`). The `id` you choose is what shows up in the
TUI table and cache; it should match the OpenRouter model string.

```ts
import type { Model } from "../src/index.js";
import { openrouter } from "@openrouter/ai-sdk-provider";

const models: Model[] = [
    { id: "openai/gpt-4o",                 model: openrouter("openai/gpt-4o") },
    { id: "anthropic/claude-3.5-sonnet",   model: openrouter("anthropic/claude-3.5-sonnet") },
    { id: "google/gemini-2.0-flash",       model: openrouter("google/gemini-2.0-flash") },
];
```

Notes:
- `openrouter(id)` returns a `LanguageModel` — pass it straight through.
- For a custom base URL / API key / headers, use
  `createOpenRouter({ baseURL, apiKey, headers })` instead of the default
  `openrouter` export.
- Free models carry a `:free` suffix (e.g. `"nvidia/nemotron-...:free"`).

### Step 4 — Define the Zod schema

The engine forces structured JSON output: `generate()` uses
`Output.object({ schema })`, so the model's reply is **parsed into an object
matching your schema**. That parsed object (type `TSchema`) is what your
evaluator receives as `model_answer`.

```ts
import { z } from "zod";

const schema = z.object({
    answer: z.string(),          // the single field the model must fill
});
type Schema = z.infer<typeof schema>;   // == { answer: string }
```

The schema can be richer — e.g. `z.object({ answer: z.string(), confidence: z.number() })`
— but every field the model returns must be declared, and `TSchema` is
`z.infer<typeof schema>`.

### Step 5 — Define the evaluator function

`Config.evaluator_function` scores one (expected, model_answer) pair. Its full
type signature is:

```ts
(
    expected_answer: TExpectedAnswer,
    model_answer: TSchema,
    tools_calls: string[],
    question: string
) => number | null
```

Return a numeric score (convention: `100` = fully correct, `0` = wrong) or
`null` if there's nothing to evaluate. Trailing parameters you don't need may
be omitted (TS allows a function with fewer params to satisfy the type).

```ts
function evaluatorFunction(
    expected_answer: ExpectedAnswer,
    model_answer: Schema,
): number {
    return expected_answer.toLowerCase() === model_answer.answer.toLowerCase()
        ? 100
        : 0;
}
```

For structured expected answers, compare the relevant fields:

```ts
function evaluatorFunction(expected: ExpectedAnswer, got: Schema): number {
    return got.answer.trim().toLowerCase() === expected.toLowerCase() ? 100 : 0;
}
```

### Step 6 — Assemble the `Config`

```ts
import type { Config } from "../src/index.js";

const config: Config<ExpectedAnswer, Schema> = {
    evaluator_models: null,            // set null when using evaluator_function
    evaluator_function: evaluatorFunction,
    schema: schema,                    // the Zod schema from Step 4
    models: models,                    // the Model[] from Step 3
    system_prompt: "Respond in JSON. Answer in one word.",
};
```

`Config<TExpectedAnswer, TSchema>` fields:
- `evaluator_models: EvalModel[] | null` — use `null` unless you want an
  LLM-as-judge (then provide judge models and set `evaluator_function` to a
  no-op returning `null`).
- `evaluator_function` — your Step 5 function.
- `schema: z.ZodType<TSchema>` — the Step 4 schema.
- `models: Model[]` — the Step 3 list.
- `system_prompt?: string` — default system prompt; overridden per-question by
  `BenchmarkQuestion.system_prompt`. This is passed as `instructions` to
  `generateText`, so it should instruct JSON output.

### Step 7 — Instantiate `Benchmark` and run

```ts
import { Benchmark } from "../src/index.js";

const benchmark = new Benchmark<ExpectedAnswer, Schema>(config, "capitals-bench", data);
benchmark.run();   // returns a Promise<void>; renders the live table
```

- The 2nd argument (`"capitals-bench"`) is the **benchmark id** — it names the
  cache file `./cache/capitals-bench.json`. Re-running with the same id
  **skips already-cached model×question pairs** (resumes). Use a new id to
  start fresh.
- `run()` renders an ink table to the terminal showing per-model progress,
  score, cost, tokens, and time.

---

## Complete reference script

This is `examples/basic.ts` — the canonical, working template. Copy it as the
starting point for any new benchmark.

```ts
import type { Config, Model, BenchmarkDataset } from "../src/index.js";
import { Benchmark } from "../src/index.js";
import { z } from "zod";
import { openrouter } from "@openrouter/ai-sdk-provider";

// Step 1 — expected answer type
type ExpectedAnswer = string;

// Step 2 — dataset
const data: BenchmarkDataset<ExpectedAnswer> = {
    id: "sample-dataset",
    name: "Test Dataset",
    description: "Trivia with one-word answers.",
    version: "1",
    data: [
        { id: "q-1", context: [{ role: "user", content: "What is the capital of Karnataka?" }], expected_answer: "Bengaluru" },
        { id: "q-2", context: [{ role: "user", content: "Who wrote Romeo and Juliet?" }],     expected_answer: "William Shakespeare" },
        { id: "q-3", context: [{ role: "user", content: "Largest planet in our solar system?" }], expected_answer: "Jupiter" },
    ],
};

// Step 3 — models (discover ids via: curl -s https://openrouter.ai/api/v1/models | jq '.data[].id')
const models: Model[] = [
    { id: "openai/gpt-4o",               model: openrouter("openai/gpt-4o") },
    { id: "anthropic/claude-3.5-sonnet", model: openrouter("anthropic/claude-3.5-sonnet") },
];

// Step 4 — schema
const schema = z.object({ answer: z.string() });
type Schema = z.infer<typeof schema>;

// Step 5 — evaluator
function evaluatorFunction(expected_answer: ExpectedAnswer, model_answer: Schema): number {
    return expected_answer.toLowerCase() === model_answer.answer.toLowerCase() ? 100 : 0;
}

// Step 6 — config
const config: Config<ExpectedAnswer, Schema> = {
    evaluator_models: null,
    evaluator_function: evaluatorFunction,
    schema,
    models,
    system_prompt: "Respond in json and answer in one word exactly or name.",
};

// Step 7 — run
const benchmark = new Benchmark<ExpectedAnswer, Schema>(config, "test-bench", data);
benchmark.run();
```

Run it: `npx tsx examples/basic.ts`

---

## Conventions & gotchas

- **Import paths:** use the barrel `../src/index.js` (from `examples/`) or
  `@/index.js` (the `@/*` alias maps to `src/*`). With `verbatimModuleSyntax`
  on, types must be imported with `import type` — the barrel already splits
  value vs type exports, so `import { Benchmark, type Config }` works.
- **`.js` extensions are required** in imports (`module: nodenext`). Always
  write `from "../src/index.js"`, never `from "../src/index"`.
- **Cache resumes by benchmark id.** Same id + same model×question → skipped.
  Change the id (or delete `./cache/<id>.json`) to rerun.
- **`./cache/` must exist** before running, or `CacheWrite` throws.
- **The schema is enforced.** The model must return JSON matching it; the
  parsed object is what your evaluator sees as `model_answer`, **not** raw
  text. `GenerateResult.answer` (raw text) and `GenerateResult.schema`
  (parsed) can differ — evaluate against `schema`.
- **`evaluator_function` return value:** `null` means "no score"; the engine
  coerces `null` to `0` when caching. Return a real number when you can score.
- **Cost tracking** comes from OpenRouter's provider metadata
  (`providerMetadata.openrouter.usage.cost`). Free models report `0`.
- **Don't call `dotenv.config()` yourself** — `src/benchmark/benchmark.ts`
  already loads it with `{ quiet: true }` on import.
- **No TUI in CI / non-TTY:** the ink table needs a terminal. For headless
  runs, consider piping output or running in an interactive shell.
