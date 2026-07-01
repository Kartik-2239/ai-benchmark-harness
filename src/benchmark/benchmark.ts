import { type Config } from '@/types/config.js'
import { type BenchmarkDataset } from '@/types/data.js'
import { type BenchmarkEvent } from '@/types/benchmark-events.js'
import { CacheWrite, FindCacheFile } from './cache.js'
import type { ModelMessage } from 'ai'
import { generate } from '@/benchmark/ai.js'
import { render, type Instance } from 'ink'
import type { CacheFile } from '@/types/cache.js'
import { TableProvider } from '@/tui/tui.js'
import React from 'react'
import dotenv from 'dotenv'
dotenv.config({
    quiet: true
})

/**
 * Orchestrates running a benchmark across configured models and dataset questions,
 * caching results and rendering progress to the terminal.
 */
export class Benchmark<TExpectedAnswer, TSchema> {
    config: Config<TExpectedAnswer, TSchema>
    id: string
    data: BenchmarkDataset<TExpectedAnswer>
    version: string
    private last: Instance | undefined
    private cacheFile: CacheFile<TExpectedAnswer> | undefined

    /**
     * Creates a new benchmark instance.
     * @param config - Benchmark configuration, including models and evaluator.
     * @param id - Unique benchmark identifier.
     * @param data - Benchmark dataset containing questions and expected answers.
     */
    constructor(config: Config<TExpectedAnswer, TSchema>, id: string, data: BenchmarkDataset<TExpectedAnswer>) {
        this.config = config
        this.id = id
        this.data = data
        this.version = data.version
    }
    /**
     * Evaluates a model's answer for a single question.
     * @param context - The conversation context for the question.
     * @param expected_answer - The expected answer.
     * @param model_answer - The parsed model answer.
     * @param tool_calls - Names of tools invoked by the model.
     * @returns A numeric score, or null if no evaluator is configured.
     */
    private async evaluateModelAnswer(context: ModelMessage[], expected_answer: TExpectedAnswer, model_answer: TSchema, tool_calls: string[]): Promise<number | null> {
        if (this.config.evaluator_function) {
            return this.config.evaluator_function(context[context.length-1]?.content as string, expected_answer, model_answer, tool_calls)
        }
        return null
    }
    /**
     * Runs the benchmark to completion and logs any errors emitted by the runner.
     * @returns A promise that resolves when the benchmark finishes.
     */
    async run(): Promise<void> {
        const shutdown = () => {
            if (this.last) {
                this.last.unmount()
            }
            console.log("\nresume benchmark with: pnpm dev --resume " + this.id)
            process.exit(0)
        }
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
        for await (const event of this.runner()) {
            this.render()
            switch (event.type) {
                case "progress":
                    break;
                case "error":
                    console.error(`[${event.model}] ${event.questionId} — error: ${event.message}`);
                    break;
                case "finish":
                    break;
            }
        }
    }
    /**
     * Generator that iterates over every model/question pair, yielding progress,
     * errors, and a final summary event.
     */
    async *runner(): AsyncGenerator<BenchmarkEvent, void, unknown> {
        var final: BenchmarkEvent = {
            type: "finish",
            totalCost: 0,
            avgScore: 0,
            perModel: []
        }
        this.render()
        for (const model of this.config.models) {
            for (const question of this.data.data) {
                if (this.cacheFile && check_exists(this.cacheFile, model.id, question.id)) {
                    continue
                }
                try{
                    const sys_prompt = question.system_prompt ? question.system_prompt : this.config.system_prompt
                    const result = await generate(model.model, question.context, question.tools, this.config.schema, sys_prompt)
                    const score = await this.evaluateModelAnswer(question.context, question.expected_answer, result.schema, result.tools || [])
                    const to_save = CacheWrite<TExpectedAnswer>({
                        id: this.id,
                        dataset_name: this.data.name,
                        dataset_id: this.data.id,
                        dataset_path: "",
                        expected_answer: question.expected_answer,
                        version: this.version,
                        question_id: question.id,
                        question: question.context[question.context.length-1]?.content as string,
                        context: question.context,
                        answer: result.answer,
                        success: true,
                        model: model.id,
                        cost: result.cost,
                        output_tokens: result.output_tokens || 0,
                        time: result.time,
                        score: score ?? 0,
                        tools: result.tools || []
                    }, this.config.models.map(m => m.id))
                    
                    yield {
                        type: "progress",
                        model: model.id,
                        questionId: question.id,
                        score: score ?? 0,
                        cost: result.cost,
                        timeMs: result.time,
                        cached: true
                    }
                    this.cacheFile = to_save
                }catch(e){
                    CacheWrite<TExpectedAnswer>({
                        id: this.id,
                        dataset_name: this.data.name,
                        dataset_id: this.data.id,
                        dataset_path: "",
                        expected_answer: question.expected_answer,
                        version: this.version,
                        question_id: question.id,
                        question: question.context[question.context.length-1]?.content as string,
                        context: question.context,
                        answer: "",
                        success: false,
                        model: model.id,
                        output_tokens: 0,
                        cost: 0,
                        time: 0,
                        score: 0,
                        tools: []
                    }, this.config.models.map(m => m.id))
                    yield {
                        type: "error",
                        model: model.id,
                        questionId: question.id,
                        message: (e as Error).message
                    }
                }
            }
        }
        yield {
            type: "finish",
            totalCost: Math.floor(Math.random() * 100),
            avgScore: Math.floor(Math.random() * 100),
            perModel: this.config.models.map(m => ({
                model: m.id,
                cost: Math.floor(Math.random() * 10),
                avgScore: Math.floor(Math.random() * 100),
                count: this.data.data.length
            }))
        }
    }

    private write_cache() {
        
    }
    /**
     * Renders or re-renders the benchmark progress table in the terminal.
     */
    private render(): void {
        let cacheFile = FindCacheFile<TExpectedAnswer>(this.id)
        if (!this.cacheFile) {
            this.cacheFile = cacheFile ?? {
                id: this.id,
                dataset_name: this.data.name,
                dataset_id: this.data.id,
                dataset_path: "",
                version: this.version,
                models: this.config.models.map(m => m.id),
                answers: []
            }
        }
        if (!this.last) {
            this.last = render(React.createElement(TableProvider, { cacheFile: this.cacheFile, data: this.data }))
        }else {
            this.last.rerender(React.createElement(TableProvider, { cacheFile: this.cacheFile, data: this.data }))
        }
    }
}

function check_exists<TExpectedAnswer>(cacheFile: CacheFile<TExpectedAnswer>, model: string, question_id: string): boolean {
    return cacheFile.answers.some(a => a.model === model && a.question_id === question_id)
}