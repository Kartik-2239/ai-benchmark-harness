import { type Config } from '@/types/config.js'
import { type Datajson } from '@/types/data.js'
import { type BenchmarkEvent } from '@/types/benchmark-events.js'
import { CacheRead, CacheWrite } from './cache.js'

export class Benchmark<TExpectedAnswer, TSchema, TToolSet> {
    config: Config<TExpectedAnswer, TSchema, TToolSet>
    id: string
    data: Datajson<TExpectedAnswer>
    constructor(config: Config<TExpectedAnswer, TSchema, TToolSet>, id: string, data: Datajson<TExpectedAnswer>) {
        this.config = config
        this.id = id
        this.data = data
    }
    test() {
        console.log("Running benchmark with id:", this.id)
        console.log(this.data)
        console.log(this.config)
        console.log(this.config.tools)
    }
    async *run(): AsyncGenerator<BenchmarkEvent, void, unknown> {
        let totalCost = 0
        let totalScore = 0
        let count = 0
        const perModel: { model: string, cost: number, avgScore: number, count: number }[] = []
        for (const model of this.config.models) {
            let modelCost = 0
            let modelScore = 0
            let modelCount = 0
            for (const dataset of this.data.data) {
                const cached = CacheRead(this.data.id, this.data.version, model.id, dataset.id)
                if (cached !== null) {
                    var score = cached.score
                    modelCost += cached.cost
                    modelScore += score
                    modelCount++
                    totalCost += cached.cost
                    totalScore += score
                    count++
                    yield { type: "progress", model: model.id, questionId: dataset.id, score, cost: cached.cost, timeMs: cached.time, cached: true }
                    continue
                }
                const cost = 0.001
                const timeMs = 100
                var score = 10
                const context = JSON.stringify(dataset.context)
                const question = dataset.context.find(m => m.role === "user")?.content?.toString() ?? ""
                CacheWrite({
                    id: this.id,
                    dataset_id: this.data.id,
                    dataset_path: this.data.id,
                    version: this.data.version,
                    question_id: dataset.id,
                    question,
                    answer: "placeholder",
                    model: model.id,
                    cost,
                    time: timeMs,
                    context,
                    score,
                }, this.config.models.map(m => m.id))
                modelCost += cost
                modelScore += score
                modelCount++
                totalCost += cost
                totalScore += score
                count++
                yield { type: "progress", model: model.id, questionId: dataset.id, score, cost, timeMs, cached: false }
            }
            perModel.push({ model: model.id, cost: modelCost, avgScore: modelCount ? modelScore / modelCount : 0, count: modelCount })
        }
        yield { type: "finish", totalCost, avgScore: count ? totalScore / count : 0, perModel }
    }
}