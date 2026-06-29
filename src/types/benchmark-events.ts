
type error = {
    type: "error"
    message: string
}

type update = {
    type: "update"
    data: string[]
}

type finish = {
    type: "finish"
}

export type BenchmarkEvent = error | update | finish