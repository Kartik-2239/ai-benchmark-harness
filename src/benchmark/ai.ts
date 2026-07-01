import { generateText, Output, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import type { z } from "zod";

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
    tools: ToolSet | undefined,
    schema: z.ZodType<TSchema>,
    system_prompt?: string
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
