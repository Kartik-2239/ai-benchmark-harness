import type { ModelMessage } from "ai"


interface CacheFile<TExpectedAnswer> {
    id: string
    dataset_name: string
    dataset_id: string
    dataset_path: string
    models: string[]
    version: string
    answers: CacheAnswer<TExpectedAnswer>[]
    // answers: Map<string, CacheAnswer>
}

interface CacheAnswer<TExpectedAnswer> {
    question_id: string
    question: string
    context: ModelMessage[]
    expected_answer: TExpectedAnswer
    answer: string
    model: string
    cost: number
    time_taken: number
    time_stamp: number
    score: number
    tools: string[]
}

interface CacheWriteParams<TExpectedAnswer> {
    id: string // cache benchmark id
    dataset_id: string // questions/data id
    dataset_name: string
    dataset_path: string
    version: string
    question_id: string
    question: string
    expected_answer: TExpectedAnswer
    answer: string
    model: string
    cost: number
    time: number
    context: ModelMessage[]
    score: number
    tools?: string[]
}

export type { CacheFile, CacheAnswer, CacheWriteParams }
