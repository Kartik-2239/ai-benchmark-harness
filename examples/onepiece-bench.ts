import type { Config, Model } from "../src/types/config.js";
import { Benchmark } from "../src/benchmark/benchmark.js";
import type { BenchmarkDataset } from "../src/types/data.js";
import { z } from "zod";
import { openrouter } from "@openrouter/ai-sdk-provider";

// 1. ExpectedAnswer type — array of acceptable names for one Devil Fruit.
//    Every Devil Fruit has BOTH a Japanese romanized name ("Gomu Gomu no Mi")
//    and an official English translation ("Gum-Gum Fruit"), plus the bare
//    onomatopoeia root ("Gomu Gomu"). The evaluator scores the model's answer
//    against every entry and keeps the best, so any of these phrasings counts.
type ExpectedAnswer = string[];

// 2. Dataset — 12 One Piece Devil Fruit identification questions.
//    Each question describes the fruit's powers (and usually its wielder) and
//    asks for the fruit's name. Spread across all three classes: 6 Logia, 5
//    Paramecia, 1 Zoan. Last context message content is the `question` passed
//    to the evaluator.
const data: BenchmarkDataset<ExpectedAnswer> = {
    id: "onepiece-devil-fruits-v1",
    name: "One Piece Devil Fruits",
    description: "Twelve Devil Fruit identification questions — a power/user description is given, the model names the fruit. Accepts the romanized name, the English translation, or the bare root.",
    version: "1",
    data: ([
        {
            id: "q-1",
            context: [{ role: "user", content: "This Devil Fruit turns the user's body into rubber, letting them stretch, inflate, and resist blunt impact. It was eaten by the captain of the Straw Hat Pirates, and was later revealed to actually be a Mythical Zoan: the Hito Hito no Mi, Model: Nika. What is the name of this Devil Fruit?" }],
            expected_answer: ["Gomu Gomu no Mi", "Gomu Gomu", "Gum-Gum Fruit", "Gum Gum Fruit", "Gum-Gum", "Hito Hito no Mi, Model: Nika", "Hito Hito no Mi Model Nika", "Nika"],
            max_score: 100,
        },
        {
            id: "q-2",
            context: [{ role: "user", content: "This Logia-type Devil Fruit grants the power to create, control, and transform into fire. It was first eaten by Portgas D. Ace and later won and eaten by Sabo. What is its name?" }],
            expected_answer: ["Mera Mera no Mi", "Mera Mera", "Flame-Flame Fruit", "Flame Flame Fruit", "Flame-Flame", "Flame Flame"],
            max_score: 100,
        },
        {
            id: "q-3",
            context: [{ role: "user", content: "This Logia-type Devil Fruit lets the user create, control, and become ice, even freezing the sea itself. It was eaten by the former Marine admiral Aokiji (Kuzan). Name this fruit." }],
            expected_answer: ["Hie Hie no Mi", "Hie Hie", "Ice-Ice Fruit", "Ice Ice Fruit", "Chilly-Chilly Fruit", "Chilly Chilly Fruit", "Ice-Ice", "Ice Ice"],
            max_score: 100,
        },
        {
            id: "q-4",
            context: [{ role: "user", content: "This Paramecia-type Devil Fruit, eaten by Whitebeard (Edward Newgate), grants the power to create powerful vibrations and earthquakes so destructive it was said the user could destroy the world. What is it called?" }],
            expected_answer: ["Gura Gura no Mi", "Gura Gura", "Tremor-Tremor Fruit", "Tremor Tremor Fruit", "Quake-Quake Fruit", "Quake Quake Fruit", "Tremor-Tremor", "Quake-Quake"],
            max_score: 100,
        },
        {
            id: "q-5",
            context: [{ role: "user", content: "This unique Logia-type Devil Fruit, eaten by Blackbeard (Marshall D. Teach), lets the user control darkness and — unlike any other fruit — nullify the powers of other Devil Fruit users on touch. Name this fruit." }],
            expected_answer: ["Yami Yami no Mi", "Yami Yami", "Dark-Dark Fruit", "Dark Dark Fruit", "Dark-Dark", "Dark Dark"],
            max_score: 100,
        },
        {
            id: "q-6",
            context: [{ role: "user", content: "This Paramecia-type Devil Fruit, eaten by Trafalgar D. Water Law, creates a spherical 'ROOM' within which the user can surgically slice, rearrange, and teleport people and objects without killing them. What is its name?" }],
            expected_answer: ["Ope Ope no Mi", "Ope Ope", "Op-Op Fruit", "Op Op Fruit", "Op-Op", "Op Op"],
            max_score: 100,
        },
        {
            id: "q-7",
            context: [{ role: "user", content: "This Paramecia-type Devil Fruit, eaten by Nico Robin, lets the user sprout copies of their own body parts — arms, legs, eyes, ears — on any nearby surface. Name it." }],
            expected_answer: ["Hana Hana no Mi", "Hana Hana", "Flower-Flower Fruit", "Flower Flower Fruit", "Bloom-Bloom Fruit", "Bloom Bloom Fruit", "Flower-Flower", "Flower Flower"],
            max_score: 100,
        },
        {
            id: "q-8",
            context: [{ role: "user", content: "This Logia-type Devil Fruit, eaten by Crocodile, grants the power to create, control, and become sand, and also lets the user drain the moisture out of anything they touch. What is it called?" }],
            expected_answer: ["Suna Suna no Mi", "Suna Suna", "Sand-Sand Fruit", "Sand Sand Fruit", "Sand-Sand", "Sand Sand"],
            max_score: 100,
        },
        {
            id: "q-9",
            context: [{ role: "user", content: "This Logia-type Devil Fruit, eaten by the sky ruler Enel, grants the power to create, control, and transform into lightning, and lets the user move at the speed of electricity. What is its name?" }],
            expected_answer: ["Goro Goro no Mi", "Goro Goro", "Rumble-Rumble Fruit", "Rumble Rumble Fruit", "Rumble-Rumble", "Rumble Rumble"],
            max_score: 100,
        },
        {
            id: "q-10",
            context: [{ role: "user", content: "This Logia-type Devil Fruit, eaten by Marine fleet admiral Akainu (Sakazuki), grants the power to create, control, and become magma, hot enough to burn fire itself. Name this fruit." }],
            expected_answer: ["Magu Magu no Mi", "Magu Magu", "Mag-Mag Fruit", "Mag Mag Fruit", "Magma-Magma Fruit", "Magma Magma Fruit", "Mag-Mag", "Magma-Magma"],
            max_score: 100,
        },
        {
            id: "q-11",
            context: [{ role: "user", content: "This Paramecia-type Devil Fruit, eaten by Buggy the Clown, lets the user split their body into floating pieces and reassemble it at will, making them completely immune to slashing attacks. What is it called?" }],
            expected_answer: ["Bara Bara no Mi", "Bara Bara", "Chop-Chop Fruit", "Chop Chop Fruit", "Chop-Chop", "Chop Chop"],
            max_score: 100,
        },
        {
            id: "q-12",
            context: [{ role: "user", content: "This Zoan-type Devil Fruit, eaten by the reindeer doctor Tony Tony Chopper, grants an animal the intelligence and form of a human. What is it called?" }],
            expected_answer: ["Hito Hito no Mi", "Hito Hito", "Human-Human Fruit", "Human Human Fruit", "Human-Human", "Human Human"],
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
        id: "deepseek/deepseek-v4-flash",
        model: openrouter("deepseek/deepseek-v4-flash"),
    },
    {
        id: "moonshotai/kimi-k2.6",
        model: openrouter("moonshotai/kimi-k2.6"),
    },
];

// 4. Schema — enforced via Output.object({ schema }); evaluator receives the parsed object.
const schema = z.object({
    answer: z.string(),
});

type Schema = z.infer<typeof schema>;

// 5. Evaluator function (Mode A) — deterministic Devil Fruit name judge.
//    expected_answer is an array of valid names (romanized + English + bare root).
//    The model's answer is scored against EVERY entry and the best score wins, so
//    "Gum-Gum Fruit" scores 100 even though "Gomu Gomu no Mi" would score 0 against it.
//    No tools are configured for this benchmark, so tool_calls is ignored.
//
//    Why this differs from a plain token-recall judge:
//    Devil Fruit names share STRUCTURAL tokens across ALL fruits — "no", "mi", and
//    the English word "Fruit". Naive recall would give "Mera Mera no Mi" a 50% match
//    against "Gomu Gomu no Mi" (both contain "no" + "mi") — a cross-fruit false
//    positive. So structural tokens are stripped from BOTH sides before recall.
//
//    Per-candidate scoring (after stopword removal):
//      * normalize both sides (case, diacritics, punctuation, whitespace)
//      * full credit on exact normalized match, or when every expected token
//        appears in the answer (order-insensitive, filler-tolerant — "The fruit
//        is Gomu Gomu no Mi, eaten by Luffy" still scores 100)
//      * partial credit proportional to recall when >= 50% of expected tokens
//        match (e.g. "Hito Hito no Mi" vs "Hito Hito no Mi, Model: Nika" -> 67)
//      * zero otherwise — the unique onomatopoeia/English root must be present,
//        preventing any cross-fruit confusion
function evaluatorFunction(
    expected_answers: ExpectedAnswer,
    model_answer: Schema,
    _tool_calls: string[], // unused — no tools configured for this benchmark
    _question: string // the question asked to the model
): number {
    // Structural tokens shared by every Devil Fruit name — must NOT count toward recall.
    const STOP = new Set(["no", "mi", "fruit", "model", "the", "of", "a"]);

    const normalize = (s: string): string =>
        s.toLowerCase()
            .normalize("NFKD")                   // decompose accented chars
            .replace(/[\u0300-\u036f]/g, "")     // strip combining diacritics
            .replace(/[^\p{L}\p{N}\s]/gu, " ")   // punctuation -> space, keep letters/numbers/space
            .replace(/\s+/g, " ")
            .trim();

    const answer = normalize(model_answer.answer);
    if (!answer) return 0;

    const tokens = (s: string): string[] =>
        s.split(" ").filter(t => t.length > 0).filter(t => !STOP.has(t));

    const answerSet = new Set(tokens(answer));

    // Score the model answer against a single acceptable name (order-insensitive recall).
    const scoreAgainst = (expected: string): number => {
        const expNorm = normalize(expected);
        if (!expNorm) return 0;
        // Exact normalized full-string match (incl. structural tokens) -> full credit.
        if (answer === expNorm) return 100;
        const expTokens = tokens(expNorm);
        if (expTokens.length === 0) return 0;
        const covered = expTokens.filter(t => answerSet.has(t)).length;
        const coverage = covered / expTokens.length;
        // Every meaningful token present -> full score.
        if (coverage === 1) return 100;
        // Strong partial credit (>= 50% recall), e.g. the family name without the model.
        if (coverage >= 0.5) return Math.round(coverage * 100);
        return 0;
    };

    // Best match across all acceptable names wins (handles romanized/English/root aliases).
    return Math.max(0, ...expected_answers.map(scoreAgainst));
}

// 6. Config — evaluator_function present (priority over evaluator_models).
const config: Config<ExpectedAnswer, Schema> = {
    evaluator_function: evaluatorFunction,
    schema: schema,
    models: models,
    system_prompt: "Respond in JSON. Answer with the name of the Devil Fruit only — the Japanese romanized name or the English translation. No extra explanation.",
};

// 7. Run — benchmark id onepiece-bench -> cache file ./cache/onepiece-bench.json.
const benchmark = new Benchmark<ExpectedAnswer, Schema>(config, "onepiece-bench", data);
benchmark.run();
