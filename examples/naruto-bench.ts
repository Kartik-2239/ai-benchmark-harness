import type { Config, Model } from "../src/types/config.js";
import { Benchmark } from "../src/benchmark/benchmark.js";
import type { BenchmarkDataset } from "../src/types/data.js";
import { z } from "zod";
import { openrouter } from "@openrouter/ai-sdk-provider";

// 1. ExpectedAnswer type — array of acceptable answers (canonical + aliases/synonyms).
//    The evaluator scores the model's answer against every entry and keeps the best
//    match, so "Konohagakure" / "Hidden Leaf Village" / "Konoha" all count for q-3.
type ExpectedAnswer = string[];

// 2. Dataset — 10 Naruto-trivia questions, each with id / context / expected_answer / max_score.
//    Last context message content is the `question` passed to the evaluator.
const data: BenchmarkDataset<ExpectedAnswer> = {
    id: "naruto-trivia-v1",
    name: "Naruto Trivia",
    description: "Ten canonical Naruto trivia questions; each accepts multiple valid answers (canonical name + aliases/synonyms).",
    version: "1",
    data: ([
        {
            id: "q-1",
            context: [{ role: "user", content: "Who is the main protagonist of the Naruto series?" }],
            expected_answer: ["Naruto Uzumaki", "Naruto"],
            max_score: 100,
        },
        {
            id: "q-2",
            context: [{ role: "user", content: "What is the name of the nine-tailed beast sealed inside Naruto?" }],
            expected_answer: ["Kurama", "Nine-Tails", "Nine-Tailed Fox", "Kyuubi", "Nine-Tailed Demon Fox"],
            max_score: 100,
        },
        {
            id: "q-3",
            context: [{ role: "user", content: "Which hidden village does Naruto belong to?" }],
            expected_answer: ["Hidden Leaf Village", "Konohagakure", "Konoha", "Leaf Village", "Village Hidden in the Leaves"],
            max_score: 100,
        },
        {
            id: "q-4",
            context: [{ role: "user", content: "Who is Naruto's rival and the last surviving Uchiha on Team 7?" }],
            expected_answer: ["Sasuke Uchiha", "Sasuke"],
            max_score: 100,
        },
        {
            id: "q-5",
            context: [{ role: "user", content: "Who is the jonin sensei assigned to lead Team 7?" }],
            expected_answer: ["Kakashi Hatake", "Kakashi"],
            max_score: 100,
        },
        {
            id: "q-6",
            context: [{ role: "user", content: "Which dojutsu (eye technique) is exclusive to the Uchiha clan?" }],
            expected_answer: ["Sharingan"],
            max_score: 100,
        },
        {
            id: "q-7",
            context: [{ role: "user", content: "Who is Naruto's father and the Fourth Hokage of the Hidden Leaf Village?" }],
            expected_answer: ["Minato Namikaze", "Minato", "Fourth Hokage", "Minato Namikaze (Fourth Hokage)"],
            max_score: 100,
        },
        {
            id: "q-8",
            context: [{ role: "user", content: "Who was the First Hokage of the Hidden Leaf Village?" }],
            expected_answer: ["Hashirama Senju", "Hashirama", "First Hokage", "Hashirama Senju (First Hokage)"],
            max_score: 100,
        },
        {
            id: "q-9",
            context: [{ role: "user", content: "What is the collective name of the three legendary ninja trained by the Third Hokage?" }],
            expected_answer: ["Sannin", "Legendary Sannin", "Three Sannin", "The Sannin"],
            max_score: 100,
        },
        {
            id: "q-10",
            context: [{ role: "user", content: "What is the name of Naruto's signature ninjutsu that creates physical clones of himself?" }],
            expected_answer: ["Shadow Clone Jutsu", "Kage Bunshin no Jutsu", "Shadow Clone", "Multi-Shadow Clone Jutsu"],
            max_score: 100,
        },
    ])
};

// 3. Models — OpenRouter-backed, wrapped with openrouter(id).
const models: Model[] = [
    {
        id: "minimax/minimax-m3",
        model: openrouter("minimax/minimax-m3"),
    },
    {
        id: "minimax/minimax-m2.7",
        model: openrouter("minimax/minimax-m2.7"),
    },
    {
        id: "moonshotai/kimi-k2.6",
        model: openrouter("moonshotai/kimi-k2.6"),
    },
    {
        id: "xiaomi/mimo-v2.5",
        model: openrouter("xiaomi/mimo-v2.5"),
    },
    {
        id: "xiaomi/mimo-v2.5-pro",
        model: openrouter("xiaomi/mimo-v2.5-pro"),
    },
    {
        id: "deepseek/deepseek-v4-flash",
        model: openrouter("deepseek/deepseek-v4-flash"),
    },
    {
        id: "qwen/qwen3.7-plus",
        model: openrouter("qwen/qwen3.7-plus"),
    },
    {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        model: openrouter("nvidia/nemotron-3-ultra-550b-a55b:free"),
    },
    {
        id: "inclusionai/ling-2.6-flash",
        model: openrouter("inclusionai/ling-2.6-flash"),
    },
    {
        id: "google/gemma-4-26b-a4b-it",
        model: openrouter("google/gemma-4-26b-a4b-it"),
    },
    {
        id: "google/gemma-4-31b-it",
        model: openrouter("google/gemma-4-31b-it"),
    },
    {
        id: "z-ai/glm-4.7-flash",
        model: openrouter("z-ai/glm-4.7-flash"),
    },
];

// 4. Schema — enforced via Output.object({ schema }); evaluator receives the parsed object.
const schema = z.object({
    answer: z.string(),
});

type Schema = z.infer<typeof schema>;

// 5. Evaluator function (Mode A) — deterministic answer judge over multiple acceptable answers.
//    expected_answer is an array of valid answers (canonical name + aliases/synonyms).
//    The model's answer is scored against EVERY entry and the best score wins, so
//    "Konohagakure" scores 100 for q-3 even though "Hidden Leaf Village" would score 0.
//    No tools are configured for this benchmark, so tool_calls is ignored.
//
//    Per-candidate scoring:
//      * normalize both sides (case, diacritics, punctuation, whitespace)
//      * full credit when every expected token appears in the answer
//        (order-insensitive, so "Uzumaki Naruto" == "Naruto Uzumaki", and
//         filler words like "the"/"is" around a correct term don't penalize)
//      * partial credit proportional to expected-token recall when at least
//        half the expected tokens match (e.g. "Minato" vs "Minato Namikaze")
//      * zero otherwise — preventing short-substring false positives such as
//        "Ku" matching "Kurama"
function evaluatorFunction(
    expected_answers: ExpectedAnswer,
    model_answer: Schema,
    _tool_calls: string[], // unused — no tools configured for this benchmark
    _question: string // the question asked to the model
): number {
    const normalize = (s: string): string =>
        s.toLowerCase()
            .normalize("NFKD")                   // decompose accented chars
            .replace(/[\u0300-\u036f]/g, "")     // strip combining diacritics
            .replace(/[^\p{L}\p{N}\s]/gu, "")    // drop punctuation, keep letters/numbers/space
            .replace(/\s+/g, " ")
            .trim();

    const answer = normalize(model_answer.answer);
    if (!answer) return 0;

    const tokens = (s: string): string[] => s.split(" ").filter(t => t.length > 0);

    // Score the model answer against a single acceptable answer (order-insensitive token recall).
    const scoreAgainst = (expected: string): number => {
        const expectedNorm = normalize(expected);
        if (!expectedNorm) return 0;
        const expectedTokens = tokens(expectedNorm);
        const answerSet = new Set(tokens(answer));
        // Recall: fraction of expected tokens present in the answer.
        const covered = expectedTokens.filter(t => answerSet.has(t)).length;
        const coverage = covered / expectedTokens.length;
        // Exact normalized match, or every expected token present → full score.
        if (answer === expectedNorm || coverage === 1) return 100;
        // Strong partial credit (>= 50% recall), e.g. given-name-only for a full name.
        if (coverage >= 0.5) return Math.round(coverage * 100);
        return 0;
    };

    // Best match across all acceptable answers wins (handles synonyms/aliases).
    return Math.max(...expected_answers.map(scoreAgainst));
}

// 6. Config — evaluator_function present (priority over evaluator_models).
const config: Config<ExpectedAnswer, Schema> = {
    evaluator_function: evaluatorFunction,
    schema: schema,
    models: models,
    system_prompt: "Respond in JSON. Answer with the specific name or term only, no extra explanation.",
};

// 7. Run — benchmark id naruto-bench → cache file ./cache/naruto-bench.json.
const benchmark = new Benchmark<ExpectedAnswer, Schema>(config, "naruto-bench", data);
benchmark.run();
