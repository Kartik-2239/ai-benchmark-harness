import type { Config, Model } from "./types/config.js";
import { Benchmark } from "./benchmark/benchmark.js";
import type { Datajson } from "./types/data.js";
import type { CacheFile } from "./types/cache.js";
import { type LanguageModel, type ToolSet, tool } from "ai";
import { set, z } from "zod";
import fs from "fs";
import run, { TableProvider } from "./tui/tui.js";
import { createOpenRouter, openrouter } from "@openrouter/ai-sdk-provider";
import { render } from "ink";
import React from "react";
import { FindCacheFile } from "./benchmark/cache.js";



const models: Model[]  = [
    {
        id: "minimax/minimax-m3",
        model: openrouter("minimax/minimax-m3"),
        api_key: process.env.OPENROUTER_API_KEY || ""
    },
    {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        model: openrouter("nvidia/nemotron-3-ultra-550b-a55b:free"),
        api_key: process.env.OPENROUTER_API_KEY || ""
    },
]

const date = new Date()
const data: Datajson<ExpectedAnswer> = {
    id: date.getTime().toString(),
    name: "Test Dataset",
    description: "Placeholder dataset for simulating a benchmark run without AI.",
    version: "1",
    data: ([
        {
            id: "q-1",
            context: [{ role: "user", content: "what is the capital of karanataka?" }],
            expected_answer: "weather in bangalore",
        },
        {
            id: "q-1",
            context: [{ role: "user", content: "what is the capital of delhi?" }],
            expected_answer: "weather in bangalore",
        },
    ])
};



type ExpectedAnswer = string

const schema = z.object({
    answer: z.string(),

})
type Schema = z.infer<typeof schema>;

function evaluatorFunction(
    question: string, 
    expected_answer: ExpectedAnswer, 
    model_answer: Schema, 
    tool_calls: string[]
): number {
    if (tool_calls.length > 0) {
        return 1000
    }
    return 10
}

const config: Config<ExpectedAnswer, Schema> = {
    evaluator_models: null,
    evaluator_function: evaluatorFunction,
    schema: schema,
    models: models
}

const benchmark = new Benchmark(config, "benchmark-1", data);
benchmark.run()

// var last: ReturnType<typeof render> | undefined
// fs.readdirSync("cache").forEach((file, index) => {
//     if (file.endsWith(".json")) {
//         setTimeout(() => {
//             const cacheFile = JSON.parse(fs.readFileSync(`cache/${file}`, "utf8")) as CacheFile<ExpectedAnswer>
//             if (!last) {
//                 last = render(React.createElement(TableProvider, { cacheFile: cacheFile, data: data }))
//             }else {
//                 last.rerender(React.createElement(TableProvider, { cacheFile: cacheFile, data: data }))
//             }
//         }, 1000 * index)
//     }
// })