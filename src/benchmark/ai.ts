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
    tools: ToolSet | undefined,
    schema: z.ZodType<TSchema>,
): Promise<GenerateResult<TSchema>> {
    const start = performance.now()
    if (tools === undefined) {
        tools = {} as ToolSet
    }

    const result = await generateText({
        model,
        messages,
        tools: tools,
        output: Output.object({ schema }),
    })

    const time = Math.round(performance.now() - start)
    const dollars = (result.finalStep.providerMetadata?.openrouter?.usage as any)?.cost
    const cost = (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
    return {
        answer: result.text ? result.text : "",
        schema: result.output,
        cost: dollars ? parseFloat(dollars) : cost,
        time,
        tools: result.toolCalls.map(tc => tc.toolName),
    }

   
}
