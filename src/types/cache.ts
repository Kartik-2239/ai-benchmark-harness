

interface CacheFile {
    id: string
    dataset_id: string
    dataset_path: string
    version: string
    answers: CacheAnswer[]
}

interface CacheAnswer {
    question_id: string
    question: string
    context: string
    answer: string
    cost: number
    time: string
    score: number
}

interface CacheWriteParams {
    id: string
    dataset_id: string
    dataset_path: string
    version: string
    question_id: string
    question: string
    answer: CacheAnswer
    cost: number
    time: string
    context: string
    score: number
}

export type { CacheFile, CacheWriteParams }