import { Output, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";
type Model = {
    id: string
    model: LanguageModel
    api_key: string
}

export interface Config<TExpectedAnswer, TSchema, TToolSet> {
    evaluator_models: Model[] | null
    evaluator_function: (
        question: string,
        expected_answer: TExpectedAnswer,
        model_answer: TSchema,
        tools_calls: string[]
    ) => number | null
    schema: z.ZodType<TSchema>
    tools: TToolSet
    models: Model[]
}