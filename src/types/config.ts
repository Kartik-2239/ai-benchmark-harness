import { Output, type LanguageModel, type ToolSet } from "ai";
import { z } from "zod";
type Model = {
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
    ) => boolean | null
    tools: TToolSet
    models: Model[]
}