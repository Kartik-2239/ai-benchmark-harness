

interface CacheFile {
    id: string
    dataset_id: string
    dataset_path: string
    models: string[]
    version: string
    answers: CacheAnswer[]
}

interface CacheAnswer {
    question_id: string
    question: string
    context: string
    answer: string
    model: string
    cost: number
    time: number
    score: number
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
    context: string
    score: number
}

export type { CacheFile, CacheAnswer, CacheWriteParams }
