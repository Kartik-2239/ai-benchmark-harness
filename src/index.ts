// Barrel file — re-exports the public API of `src`.
// Note: the runnable entry point lives in `index-do-not-remove.ts` (it has
// side effects at module load), so it is intentionally not re-exported here.

// --- Benchmark runner ---
export { Benchmark } from '@/benchmark/benchmark.js'

// --- Benchmark cache ---
export { CacheWrite, FindCacheFile } from '@/benchmark/cache.js'

// --- AI generation ---
export { generate } from '@/benchmark/ai.js'
export type { GenerateResult } from '@/benchmark/ai.js'

// --- Terminal UI ---
export { TableProvider } from '@/tui/tui.js'
export { default as run } from '@/tui/tui.js'

// --- Types ---
export type { Model, Config } from '@/types/config.js'
export type { CacheFile, CacheAnswer, CacheWriteParams } from '@/types/cache.js'
export type { BenchmarkDataset, BenchmarkQuestion } from '@/types/data.js'
export type { BenchmarkEvent } from '@/types/benchmark-events.js'
