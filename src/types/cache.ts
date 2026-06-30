import type { ModelMessage } from "ai"


interface CacheFile {
    id: string
    dataset_id: string
    dataset_path: string
    models: string[]
    version: string
    answers: CacheAnswer[]
    // answers: Map<string, CacheAnswer>
}

interface CacheAnswer {
    question_id: string
    question: string
    context: ModelMessage[]
    answer: string
    model: string
    cost: number
    time: number
    score: number
    tools: string[]
}

interface CacheWriteParams {
    id: string
    dataset_id: string
    dataset_path: string
    version: string
    question_id: string
    question: string
    answer: string
    model: string
    cost: number
    time: number
    context: ModelMessage[]
    score: number
    tools?: string[]
}

export type { CacheFile, CacheAnswer, CacheWriteParams }
