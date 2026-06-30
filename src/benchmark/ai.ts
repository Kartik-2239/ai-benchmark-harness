import { generateText, Output, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import type { z } from "zod";

export interface GenerateResult<TSchema> {
    answer: string
    schema: TSchema
    cost: number
    time: number
    tools: string[]
}

export async function generate<TSchema>(
    model: LanguageModel,
    messages: ModelMessage[],
    tools: ToolSet,
    schema: z.ZodType<TSchema>,
): Promise<GenerateResult<TSchema>> {
    const start = performance.now()
    const result = await generateText({
        model,
        messages,
        tools,
        output: Output.object({ schema }),
    })
    const time = Math.round(performance.now() - start)
    const cost = (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
    return {
        answer: result.text,
        schema: result.output,
        cost,
        time,
        tools: result.toolCalls.map(tc => tc.toolName),
    }
}
