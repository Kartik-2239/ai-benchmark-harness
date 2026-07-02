import { Output, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";

export type Model = {
    id: string
    model: LanguageModel
}

export type EvalModel = {
    id: string
    model: LanguageModel
    prompt?: string
}

export interface Config<TExpectedAnswer, TSchema> {
    evaluator_models?: EvalModel[]
    evaluator_function?: (
        expected_answer: TExpectedAnswer,
        model_answer: TSchema,
        tools_calls: string[],
        question: string
    ) => number | null
    schema: z.ZodType<TSchema>
    models: Model[]
    system_prompt?: string
}