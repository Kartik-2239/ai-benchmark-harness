import { type ModelMessage } from "ai"

export interface Datajson<TExpectedAnswer> {
    id: string
    name: string
    description: string
    version: string
    data: Dataset<TExpectedAnswer>[]
}


interface Dataset<TExpectedAnswer> {
    id: string
    context: ModelMessage[]
    expected_answer: TExpectedAnswer
}