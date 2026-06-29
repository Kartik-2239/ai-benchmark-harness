import { type Config } from '@/types/config.js'
import { type Datajson } from '@/types/data.js'
import { type BenchmarkEvent } from '@/types/benchmark-events.js'

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
    *run(): Generator<BenchmarkEvent, void, unknown> {
        yield { type: "update", data: ["Benchmark started"] }
        for (const dataset of this.data.data) {
            yield { type: "update", data: [`Running question: ${dataset.id}`] }
            yield { type: "update", data: [`Finished question: ${dataset.id}`] }    
        }
        yield { type: "finish" }
    }
}