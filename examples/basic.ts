import type { Config, Model } from "../src/types/config.js";
import { Benchmark } from "../src/benchmark/benchmark.js";
import type { BenchmarkDataset } from "../src/types/data.js";
import { z } from "zod";
import { openrouter } from "@openrouter/ai-sdk-provider";

const data: BenchmarkDataset<ExpectedAnswer> = {
    id: "sample-dataset",
    name: "Test Dataset",
    description: "Placeholder dataset for simulating a benchmark run without AI.",
    version: "1",
    data: ([
        {
            id: "q-1",
            context: [{ role: "user", content: "What is the capital of Karnataka?" }],
            expected_answer: "Bengaluru",
        },
        {
            id: "q-2",
            context: [{ role: "user", content: "Who wrote Romeo and Juliet?" }],
            expected_answer: "William Shakespeare",
        },
        {
            id: "q-3",
            context: [{ role: "user", content: "What is the largest planet in our solar system?" }],
            expected_answer: "Jupiter",
        },
        {
            id: "q-4",
            context: [{ role: "user", content: "What is the boiling point of water in Celsius?" }],
            expected_answer: "100",
        },
        {
            id: "q-5",
            context: [{ role: "user", content: "Which continent is Egypt in?" }],
            expected_answer: "Africa",
        },
    ])
};

const models: Model[]  = [
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
]

type ExpectedAnswer = string

const schema = z.object({
    answer: z.string(),
})

type Schema = z.infer<typeof schema>;

function evaluatorFunction(
    expected_answer: ExpectedAnswer, 
    model_answer: Schema
): number {
    let score = 0
    if (expected_answer.toLowerCase() === model_answer.answer.toLowerCase()) {
        score += 100
    }
    return score
}

const config: Config<ExpectedAnswer, Schema> = {
    evaluator_models: null,
    evaluator_function: evaluatorFunction,
    schema: schema,
    models: models,
    system_prompt: "Respond in json and answer in one word exactly or name."
}

const benchmark = new Benchmark(config, "test-bench", data);
benchmark.run()
