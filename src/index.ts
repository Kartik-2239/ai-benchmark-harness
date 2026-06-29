import type { Config } from "./types/config.js";
import { Benchmark } from "./benchmark/benchmark.js";
import type { Datajson } from "./types/data.js";
import { type Output, type ToolSet, tool } from "ai";
import { z } from "zod";

type ExpectedAnswer = string
const schema = z.object({
    recipe: z.object({
        name: z.string(),
        ingredients: z.array(
            z.object({
            name: z.string(),
            amount: z.string(),
            })
        ),
        steps: z.array(z.string()),
    }),
})
type Schema = z.infer<typeof schema>;

function evaluatorFunction(question: string, expected_answer: ExpectedAnswer, model_answer: Schema, tool_calls: string[]): boolean | null {
    if (model_answer.recipe.name = model_answer.recipe.name.trim()){
        return true
    }else {
        return null
    }
}

let config: Config<ExpectedAnswer, Schema, ToolSet> = {
    evaluator_models: null,
    evaluator_function: evaluatorFunction,
    models: [],
    tools: {
        weather: tool({
            description: "Get the weather in a location",
            inputSchema: z.object({
                location: z.string(),
            })
        })
    }
}
const data: Datajson<ExpectedAnswer> = {
    id: "data-1",
    name: "Sample Data",
    description: "This is a sample dataset for benchmarking.",
    data: [
        {
            id: "question-1",
            context: [{ role: "user", content: "What is the capital of France?" }],
            expected_answer: "Paris"
        },
        {
            id: "question-2",
            context: [{ role: "user", content: "What is 2 + 2?" }],
            expected_answer: "4"
        }
    ]
};
const benchmark = new Benchmark(config, "benchmark-1", data);

for (const event of benchmark.run()) {
    switch (event.type) {
        case "update":
            console.log("Update:", event.data);
            break;
        case "error":
            console.error("Error:", event.message);
            break;
        case "finish":
            console.log("Benchmark finished.");
            break;
    }
}