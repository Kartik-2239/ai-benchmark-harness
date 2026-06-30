import type { Config, Model } from "./types/config.js";
import { Benchmark } from "./benchmark/benchmark.js";
import type { Datajson } from "./types/data.js";
import type { CacheFile } from "./types/cache.js";
import { type LanguageModel, type ToolSet, tool } from "ai";
import { z } from "zod";
import fs from "fs";
import run, { TableProvider } from "./tui/tui.js";
import { createOpenRouter, openrouter } from "@openrouter/ai-sdk-provider";
import { render } from "ink";
import React from "react";
type ExpectedAnswer = string

const schema = z.object({
    answer: z.string(),
})
type Schema = z.infer<typeof schema>;

function evaluatorFunction(question: string, expected_answer: ExpectedAnswer, model_answer: Schema, tool_calls: string[]): number {
    console.log(tool_calls)
    if (tool_calls.length > 0) {
        return 1000
    }
    return 10
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
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        model: openrouter("nvidia/nemotron-3-ultra-550b-a55b:free"),
        api_key: process.env.OPENROUTER_API_KEY || ""
    },
]

const config: Config<ExpectedAnswer, Schema> = {
    evaluator_models: null,
    evaluator_function: evaluatorFunction,
    schema: schema,
    models: models
}
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
const benchmark = new Benchmark(config, "benchmark-1", data);

// for await (const event of benchmark.run()) {
//     switch (event.type) {
//         case "progress":
//             console.log(`[${event.model}] ${event.questionId} — score: ${event.score}, cost: ${event.cost}, time: ${event.timeMs}ms${event.cached ? " (cached)" : ""}`);
//             break;
//         case "error":
//             console.error(`[${event.model}] ${event.questionId} — error: ${event.message}`);
//             break;
//         case "finish":
//             console.log(`\nBenchmark finished. totalCost: ${event.totalCost}, avgScore: ${event.avgScore}`);
//             for (const m of event.perModel) {
//                 console.log(`  ${m.model}: cost=${m.cost}, avgScore=${m.avgScore}, count=${m.count}`);
//             }
//             break;
//     }
// }

var last: ReturnType<typeof render> | undefined
fs.readdirSync("cache").slice(0,1).forEach(file => {
    
    if (file.endsWith(".json")) {
        const cacheFile = JSON.parse(fs.readFileSync(`cache/${file}`, "utf8")) as CacheFile
        if (last) {
            last.unmount()
        }
        last = render(React.createElement(TableProvider, { cacheFile: cacheFile, data: data }))
    }
})