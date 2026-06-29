import { type CacheFile, type CacheWriteParams } from "@/types/cache.js";
import fs from "fs"
// file path at the top
// dataset id
// time
// list of answers where each answer would have the question id
//
//  {
//      dataset_id: string
//      time: string
//      answers: [{
//          question_id: string
//          answer: string
//          cost: number
//      }]
//  }

// params -> dataset_id, dataset_name, version, question_id, answer, cost, time, context
const PATH = "./cache"
export function CacheWrite(cacheWriteParams: CacheWriteParams): void {
    var cacheFile = FindCacheFile(cacheWriteParams.dataset_id, cacheWriteParams.version)
    if (cacheFile === null) {
        cacheFile = {
            id: cacheWriteParams.id,
            dataset_id: cacheWriteParams.dataset_id,
            dataset_path: cacheWriteParams.dataset_path,
            version: cacheWriteParams.version,
            answers: []
        }
    }
    cacheFile.answers = [{
        question_id: cacheWriteParams.question_id,
        question: cacheWriteParams.question,
        context: cacheWriteParams.context,
        answer: cacheWriteParams.answer.answer,
        cost: cacheWriteParams.cost,
        time: cacheWriteParams.time,
        score: cacheWriteParams.score
    }]
    fs.writeFileSync(`${PATH}/${cacheWriteParams.dataset_id}-${cacheWriteParams.version}.json`, JSON.stringify(cacheFile, null, 2))
}

function FindCacheFile(dataset_id: string, version: string): CacheFile | null {
    const filePath = `${PATH}/${dataset_id}-${version}.json`
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        return JSON.parse(fileContent) as CacheFile
    }
    return null
}