import { type CacheFile, type CacheAnswer, type CacheWriteParams } from "@/types/cache.js";
import fs from "fs"

const PATH = "./cache"

export function CacheWrite<TExpectedAnswer>(p: CacheWriteParams<TExpectedAnswer>, models: string[]): CacheFile<TExpectedAnswer> {
    let cacheFile = FindCacheFile(p.dataset_id, p.version)
    if (cacheFile === null) {
        cacheFile = {
            name: p.name,
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
        model: p.model,
        cost: p.cost,
        time: p.time,
        score: p.score,
        tools: p.tools || []
    })
    fs.writeFileSync(`${PATH}/${p.dataset_id}-${p.version}.json`, JSON.stringify(cacheFile, null, 2))
    return cacheFile as CacheFile<TExpectedAnswer>
}

export function CacheRead<TExpectedAnswer>(dataset_id: string, version: string, model: string, question_id: string): CacheAnswer<TExpectedAnswer> | null {
    const cacheFile = FindCacheFile<TExpectedAnswer>(dataset_id, version)
    if (cacheFile === null) return null
    return cacheFile.answers.find(a => a.model === model && a.question_id === question_id) ?? null
}

export function FindCacheFile<TExpectedAnswer>(dataset_id: string, version: string): CacheFile<TExpectedAnswer> | null {
    const filePath = `${PATH}/${dataset_id}-${version}.json`
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        return JSON.parse(fileContent) as CacheFile<TExpectedAnswer>
    }
    return null
}
