import { type ModelMessage, type ToolSet } from "ai"

export interface BenchmarkDataset<TExpectedAnswer> {
    id: string
    name: string
    description: string
    version: string
    data: BenchmarkQuestion<TExpectedAnswer>[]
}


interface BenchmarkQuestion<TExpectedAnswer> {
    id: string
    context: ModelMessage[]
    expected_answer: TExpectedAnswer
    tools?: ToolSet
    system_prompt?: string
}
