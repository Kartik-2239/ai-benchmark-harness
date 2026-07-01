import { Output, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";

export type Model = {
    id: string
    model: LanguageModel
}

type EvalModel = {
    id: string
    model: LanguageModel
    prompt: string
}

export interface Config<TExpectedAnswer, TSchema> {
    evaluator_models: EvalModel[] | null
    evaluator_function: (
        question: string,
        expected_answer: TExpectedAnswer,
        model_answer: TSchema,
        tools_calls: string[]
    ) => number | null
    schema: z.ZodType<TSchema>
    // tools: ToolSet
    models: Model[]
}