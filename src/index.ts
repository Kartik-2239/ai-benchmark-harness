import type { Config } from "./types/config.js";
import { Benchmark } from "./benchmark/benchmark.js";
import type { Datajson } from "./types/data.js";
import { type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";

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

const config: Config<ExpectedAnswer, Schema> = {
    evaluator_models: null,
    evaluator_function: evaluatorFunction,
    schema: schema,
    models: [
        { id: "openai-gpt-4o", model: null as unknown as LanguageModel, api_key: "placeholder" },
        { id: "anthropic-claude-3.5-sonnet", model: null as unknown as LanguageModel, api_key: "placeholder" },
    ],
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
        },
        {
            id: "q-6",
            context: [{ role: "user", content: "What is 2 + 2?" }],
            expected_answer: "4"
        },
        {
            id: "q-7",
            context: [{ role: "user", content: "What color is the sky on a clear day?" }],
            expected_answer: "blue"
        },
        {
            id: "q-8",
            context: [{ role: "user", content: "What is 2 + 2?" }],
            expected_answer: "4"
        },
        {
            id: "q-9",
            context: [{ role: "user", content: "What color is the sky on a clear day?" }],
            expected_answer: "blue"
        },
        {
            id: "q-10",
            context: [{ role: "user", content: "What is 2 + 2?" }],
            expected_answer: "4"
        },
        {
            id: "q-11",
            context: [{ role: "user", content: "What color is the sky on a clear day?" }],
            expected_answer: "blue"
        },
        {
            id: "q-12",
            context: [{ role: "user", content: "What is 2 + 2?" }],
            expected_answer: "4"
        },
        {
            id: "q-13",
            context: [{ role: "user", content: "What color is the sky on a clear day?" }],
            expected_answer: "blue"
        },
    ])
};
const benchmark = new Benchmark(config, "benchmark-1", data);

for await (const event of benchmark.fakeRun()) {
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
