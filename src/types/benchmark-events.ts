type progress = {
    type: "progress"
    model: string
    questionId: string
    score: number
    cost: number
    timeMs: number
    cached: boolean
}

type error = {
    type: "error"
    model: string
    questionId: string
    message: string
}

type finish = {
    type: "finish"
    totalCost: number
    avgScore: number
    perModel: { model: string, cost: number, avgScore: number, count: number }[]
}

type BenchmarkStatus = {
    
}

export type BenchmarkEvent = progress | error | finish
