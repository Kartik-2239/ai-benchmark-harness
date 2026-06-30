import { type Config } from '@/types/config.js'
import { type Datajson } from '@/types/data.js'
import { type BenchmarkEvent } from '@/types/benchmark-events.js'
import { CacheWrite } from './cache.js'
import type { ModelMessage } from 'ai'
import { generate } from '@/benchmark/ai.js'
import { render } from 'ink'
import type { CacheFile } from '@/types/cache.js'
import { TableProvider } from '@/tui/tui.js'
import React from 'react'

export class Benchmark<TExpectedAnswer, TSchema> {
    config: Config<TExpectedAnswer, TSchema>
    id: string
    data: Datajson<TExpectedAnswer>
    version: string
    private last: ReturnType<typeof render> | undefined
    private cacheFile: CacheFile<TExpectedAnswer> | undefined
    constructor(config: Config<TExpectedAnswer, TSchema>, id: string, data: Datajson<TExpectedAnswer>) {
        this.config = config
        this.id = id
        this.data = data
        this.version = data.version
    }
    private async evaluateModelAnswer(context: ModelMessage[], expected_answer: TExpectedAnswer, model_answer: TSchema, tool_calls: string[]): Promise<number | null> {
        if (this.config.evaluator_function) {
            return this.config.evaluator_function(context[context.length-1]?.content as string, expected_answer, model_answer, tool_calls)
        }
        return null
    }
    async run(): Promise<void> {
        for await (const event of this.runner()) {
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
                const result = await generate(model.model, question.context, question.tools, this.config.schema)
                const score = await this.evaluateModelAnswer(question.context, question.expected_answer, result.schema, result.tools || [])
                const to_save = CacheWrite<TExpectedAnswer>({
                    id: this.id,
                    name: this.data.name,
                    dataset_id: this.data.id,
                    dataset_path: "",
                    expected_answer: question.expected_answer,
                    version: this.version,
                    question_id: question.id,
                    question: question.context[question.context.length-1]?.content as string,
                    context: question.context,
                    answer: result.answer,
                    model: model.id,
                    cost: result.cost,
                    time: result.time,
                    score: score ?? 0,
                    tools: result.tools || []
                }, this.config.models.map(m => m.id))

                final.totalCost += result.cost
                const model_data = final.perModel.find(m => m.model === model.id)
                final.avgScore += (score ?? 0) / (this.data.data.length * this.config.models.length)
                if (model_data) {
                    model_data.cost += result.cost
                    model_data.avgScore += score ?? 0
                    model_data.count++
                    final.perModel = final.perModel.map(m => m.model === model.id ? model_data : m)
                }else {
                    final.perModel.push({
                        model: model.id,
                        cost: result.cost,
                        avgScore: score ?? 0,
                        count: 1
                    })
                }
                
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
                this.render()
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
    private render(): void {
        if (!this.cacheFile) {
            this.cacheFile = {
                id: this.data.id,
                name: this.data.name,
                dataset_id: this.data.id,
                dataset_path: "",
                version: this.data.version,
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