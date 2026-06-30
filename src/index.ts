import type { Config, Model } from "./types/config.js";
import { Benchmark } from "./benchmark/benchmark.js";
import type { Datajson } from "./types/data.js";
import type { CacheFile } from "./types/cache.js";
import { type LanguageModel, type ToolSet } from "ai";
import { unknown, z } from "zod";
import fs from "fs";
import run from "./tui/tui.js";
import { createOpenRouter, openrouter } from "@openrouter/ai-sdk-provider";

type ExpectedAnswer = string

const schema = z.object({
    answer: z.string(),
})
type Schema = z.infer<typeof schema>;

function evaluatorFunction(question: string, expected_answer: ExpectedAnswer, model_answer: Schema, tool_calls: string[]): number | null {
    if (model_answer.answer.trim() !== "") {
        return 1
    }
    return null
}

function generate_random_model() {
    const s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const num = "0123456789"

    let p1 = ""
    for (let i = 0; i < 5; i++) {
        p1 += s[Math.floor(Math.random() * s.length)] || ""
    }
    const p2 = s[Math.floor(Math.random() * s.length)] || ""

    return p1 + "-" + p2
}

const models: Model[]  = [
    {
        id: "minimax/minimax-m3",
        model: openrouter("minimax/minimax-m3"),
        api_key: process.env.OPENROUTER_API_KEY || ""
    },
    {
        id: "google/gemini-3.1-flash-lite",
        model: openrouter("google/gemini-3.1-flash-lite"),
        api_key: process.env.OPENROUTER_API_KEY || ""
    },
]
// for (let i = 0; i < 10; i++) {
//     models.push({
//         id: generate_random_model(),
//         model: unknown as unknown as LanguageModel,
//         api_key: "placeholder"
//     })
// }

const config: Config<ExpectedAnswer, Schema> = {
    evaluator_models: null,
    evaluator_function: evaluatorFunction,
    schema: schema,
    models: models,
    tools: {} as ToolSet,
}
const data: Datajson<ExpectedAnswer> = {
    id: "test-dataset",
    name: "Test Dataset",
    description: "Placeholder dataset for simulating a benchmark run without AI.",
    version: "1",
    data: ([
        {
            id: "q-1",
            context: [{ role: "user", content: "What is the capital of France?" }],
            expected_answer: "Paris"
        },
        {
            id: "q-2",
            context: [{ role: "user", content: "What is 2 + 2?" }],
            expected_answer: "4"
        },
        {
            id: "q-3",
            context: [{ role: "user", content: "What color is the sky on a clear day?" }],
            expected_answer: "blue"
        },
        {
            id: "q-4",
            context: [{ role: "user", content: "What is 2 + 2?" }],
            expected_answer: "4"
        },
        {
            id: "q-5",
            context: [{ role: "user", content: "What color is the sky on a clear day?" }],
            expected_answer: "blue"
        }
    ])
};
const benchmark = new Benchmark(config, "benchmark-1", data);

for await (const event of benchmark.run()) {
    switch (event.type) {
        case "progress":
            console.log(`[${event.model}] ${event.questionId} — score: ${event.score}, cost: ${event.cost}, time: ${event.timeMs}ms${event.cached ? " (cached)" : ""}`);
            break;
        case "error":
            console.error(`[${event.model}] ${event.questionId} — error: ${event.message}`);
            break;
        case "finish":
            console.log(`\nBenchmark finished. totalCost: ${event.totalCost}, avgScore: ${event.avgScore}`);
            for (const m of event.perModel) {
                console.log(`  ${m.model}: cost=${m.cost}, avgScore=${m.avgScore}, count=${m.count}`);
            }
            break;
    }
}

const cacheFile = JSON.parse(fs.readFileSync("cache/test-dataset-1.json", "utf8")) as CacheFile
run(cacheFile, data)