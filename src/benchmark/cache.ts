import { type CacheFile, type CacheAnswer, type CacheWriteParams } from "@/types/cache.js";
import fs from "fs"

const PATH = "./cache"

/**
 * Writes an answer to the cache file for the given dataset and version.
 * Creates the cache file if it does not exist.
 * @param p - The answer data to cache.
 * @param models - The list of models participating in the benchmark.
 * @returns The updated cache file.
 */
export function CacheWrite<TExpectedAnswer>(p: CacheWriteParams<TExpectedAnswer>, models: string[]): CacheFile<TExpectedAnswer> {
    let cacheFile = FindCacheFile(p.id)
    if (cacheFile === null) {
        cacheFile = {
            dataset_name: p.dataset_name,
            id: p.id,
            dataset_id: p.dataset_id,
            dataset_path: p.dataset_path,
            version: p.version,
            models: models,
            answers: []
        }
    }
    cacheFile.answers.push({
        question_id: p.question_id,
        question: p.question,
        context: p.context,
        expected_answer: p.expected_answer,
        answer: p.answer,
        success: p.success,
        model: p.model,
        cost: p.cost,
        time_taken: p.time,
        output_tokens: p.output_tokens || 0,
        time_stamp: Date.now(),
        score: p.score,
        tools: p.tools || []
    })
    fs.writeFileSync(`${PATH}/${p.id}.json`, JSON.stringify(cacheFile, null, 2))
    return cacheFile as CacheFile<TExpectedAnswer>
}

/**
 * Reads a cached answer for a specific model and question.
 * @param dataset_id - The dataset identifier.
 * @param version - The dataset version.
 * @param model - The model identifier.
 * @param question_id - The question identifier.
 * @returns The cached answer, or null if not found.
 */
// export function CacheRead<TExpectedAnswer>(id: string, model: string, question_id: string): CacheAnswer<TExpectedAnswer> | null {
//     const cacheFile = FindCacheFile<TExpectedAnswer>(id)
//     if (cacheFile === null) return null
//     return cacheFile.answers.find(a => a.model === model && a.question_id === question_id) ?? null
// }

/**
 * Loads the cache file for a dataset/version if it exists.
 * @param dataset_id - The dataset identifier.
 * @param version - The dataset version.
 * @returns The parsed cache file, or null if no cache exists.
 */
export function FindCacheFile<TExpectedAnswer>(id: string): CacheFile<TExpectedAnswer> | null {
    const filePath = `${PATH}/${id}.json`
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        return JSON.parse(fileContent) as CacheFile<TExpectedAnswer>
    }
    return null
}
