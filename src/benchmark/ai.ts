import { generateText, tool, type ModelMessage, type UserModelMessage } from "ai";
import { z } from "zod";


const result = await generateText({
    model: "gpt-4o",
    messages: [],
    tools: {
        weather:tool({
            description: "Get the weather in a location",
            inputSchema: z.object({
                location: z.string(),
            })
        })
    }
})
