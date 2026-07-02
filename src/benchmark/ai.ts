import type { BenchmarkQuestion } from "@/types/data.js";
import { generateText, Output, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";

export interface GenerateResult<TSchema> {
    answer: string
    schema: TSchema
    cost: number
    output_tokens: number
    time: number
    tools: string[]
}

/**
 * Generates a structured response from a language model.
 * @param model - The language model to use.
 * @param messages - The conversation messages to send.
 * @param tools - Optional tools available to the model.
 * @param schema - The Zod schema the output must conform to.
 * @returns The generated answer, parsed schema, cost, time, and tool calls.
 */
export async function generate<TSchema>(
    model: LanguageModel,
    messages: ModelMessage[],    
    schema: z.ZodType<TSchema>,
    system_prompt?: string,
    tools?: ToolSet,
): Promise<GenerateResult<TSchema>> {
    const start = performance.now()
    if (tools === undefined) {
        tools = {} as ToolSet
    }

    const result = await generateText({
        model,
        instructions: system_prompt ? system_prompt : "Please respond in JSON format.",
        messages: messages,
        tools: tools,
        output: Output.object({ schema }),
    })

    const time = Math.round(performance.now() - start)
    const cost = (result.finalStep.providerMetadata?.openrouter?.usage as any)?.cost
    const output_tokens = result.usage.outputTokens ? result.usage.outputTokens : 0
    return {
        answer: result.text ? result.text : "",
        schema: result.output,
        cost: cost ? parseFloat(cost) : 0,
        output_tokens,
        time,
        tools: result.toolCalls.map(tc => tc.toolName),
    }
}

export async function generateEvaluation<TExpectedAnswer, TSchema>(
    model: LanguageModel,
    answer: TSchema,
    question: BenchmarkQuestion<TExpectedAnswer>,
    max_score: number,
    system_prompt?: string
): Promise<{score: number}> {
    if (!system_prompt) {
        system_prompt = `You are an expert evaluator. You are given a question
                         and an answer, The question contains an expected answer 
                         which you would have to compare the generated answer 
                         with. You will evaluate the answer and return a 
                         score between 0 and ${max_score}. You will 
                         return your response in JSON format with a single key 
                         'score'.
                        `
    }
    const schema = z.object({
        score: z.number().min(0).max(max_score)
    })
    const response = await generate(model, [
        { role: "user", content: JSON.stringify({ answer, question }) }
    ], schema, system_prompt)
    return { score: response.schema.score }
}