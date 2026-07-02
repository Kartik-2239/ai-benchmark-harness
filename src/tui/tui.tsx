import React from 'react'
import { Box, render, Text } from 'ink'
import type { CacheFile } from '@/types/cache.js'
import type { BenchmarkDataset } from '@/types/data.js'

type Color = 'cyan' | 'green' | 'red' | 'yellow' | 'gray' | 'lightgray' | 'white'

/**
 * A single table column cell that aligns text and applies an optional color.
 */
const Col = ({ children, width, align, color }: { children: React.ReactNode; width: number | undefined; align?: 'flex-start' | 'center' | 'flex-end'; color: Color | undefined }) => (
  <Box width={width} flexGrow={width ? 0 : 1} paddingRight={2} justifyContent={align ?? 'center'}>
    <Text wrap="truncate-end" color={color ?? 'white'}>{children}</Text>
  </Box>
)


interface ModelRow {
  model: string
  count: number
  totalCost: number
  totalTime: number
  totalScore: number
  totalOutputTokens: number
  errors?: number
}

interface Column {
  name: string
  align: 'flex-start' | 'center' | 'flex-end'
  format: (r: ModelRow, total: number) => string
  color?: (r: ModelRow, complete: boolean) => Color
}

const PAD = 2

const COLUMNS: Column[] = [
  { name: 'Model', align: 'flex-start', format: r => r.model, color: (r, c) => c ? 'green' : r.count === 0 && (r.errors ?? 0) === 0 ? 'lightgray' : 'yellow' },
  { name: 'Progress', align: 'flex-start', format: (r, t) => `${Math.max(r.count - (r.errors ?? 0), 0)}/${t}`, color: (r, c) => c ? 'green' : r.count === 0 && (r.errors ?? 0) === 0 ? 'lightgray' : 'yellow' },
  { name: 'Score', align: 'flex-start', format: r => r.count === 0 && (r.errors ?? 0) === 0 ? '-' : String(r.totalScore) },
  { name: 'Error', align: 'flex-start', format: r => (r.errors ?? 0) > 0 ? String(r.errors ?? 0) : '-', color: r => (r.errors ?? 0) > 0 ? 'red' : 'lightgray' },
  { name: 'Cost', align: 'flex-start', format: r => r.count === 0 && (r.errors ?? 0) === 0 ? '-' : `$${r.totalCost.toFixed(4)}`, color: r => r.count === 0 && (r.errors ?? 0) === 0 ? 'lightgray' : 'white' },
  { name: 'Tokens', align: 'flex-start', format: r => r.count === 0 && (r.errors ?? 0) === 0 ? '-' : String(r.totalOutputTokens) },
  { name: 'Time', align: 'flex-start', format: r => r.count === 0 && (r.errors ?? 0) === 0 ? '-' : `${(r.totalTime / 1000).toFixed(1)}s` },
]

function colWidths(rows: ModelRow[], total: number): number[] {
  return COLUMNS.map((col, i) =>
    Math.max(col.name.length, ...rows.map(r => col.format(r, total).length)) + PAD
  )
}

/**
 * Aggregates per-model progress, cost, time, and score from the cache file.
 * Models with no answers are included with zeroed values.
 * @param cacheFile - The cache file containing answers and model list.
 * @returns An array of rows, one per model.
 */
function aggregate<TExpectedAnswer>(cacheFile: CacheFile<TExpectedAnswer>): ModelRow[] {
  const byModel = new Map<string, ModelRow>()
  for (const model of cacheFile.models) {
    byModel.set(model, { model, count: 0, totalCost: 0, totalTime: 0, totalScore: 0, totalOutputTokens: 0, errors: 0 })
  }
  for (const a of cacheFile.answers) {
    let row = byModel.get(a.model)
    if (!row) {
      row = { model: a.model, count: 0, totalCost: 0, totalTime: 0, totalScore: 0, totalOutputTokens: 0, errors: 0 }
      byModel.set(a.model, row)
    }
    row.count++
    row.totalCost += a.cost
    row.totalTime += a.time_taken
    row.totalScore += a.score
    row.totalOutputTokens += a.output_tokens
    if (!a.success) {
      row.errors!++
    }
  }
  return [...byModel.values()]
}

/**
 * Renders the benchmark progress table for all configured models.
 */
export const TableProvider = <TExpectedAnswer,>({ cacheFile, data }: { cacheFile: CacheFile<TExpectedAnswer>; data: BenchmarkDataset<TExpectedAnswer> }) => {
  const total = data.data.length
  const rows = aggregate(cacheFile)
  const widths = colWidths(rows, total)
  const tableWidth = widths.reduce((a, w) => a + w, 0)

  return (
    <Box flexDirection="column" padding={0}>
      <Box width={tableWidth} paddingX={0} marginBottom={1} flexDirection="column" borderColor="cyan">
        <Text></Text>
        <Text>Benchmark <Text color="cyan">{cacheFile.id}</Text> • Dataset <Text color="cyan">{cacheFile.dataset_name}</Text></Text>
      </Box>
      <Box borderLeft={false} width={tableWidth} borderDimColor borderRight={false} borderTop={false} borderStyle="single">
        {COLUMNS.map((c, i) => (
          <Col key={c.name} align={c.align} width={widths[i]} color={undefined}>{c.name}</Col>
        ))}
      </Box>
      {rows.map((r) => {
        const complete = r.count >= total
        return (
          <Box key={r.model}>
            {COLUMNS.map((c, i) => (
              <Col key={c.name} align={c.align} width={widths[i]} color={c.color?.(r, complete)}>
                {c.format(r, total)}
              </Col>
            ))}
          </Box>
        )
      })}
    </Box>
  )
}

/**
 * Renders the benchmark TUI for the given cache file and dataset.
 * @param cacheFile - The cache file to display.
 * @param data - The dataset used to compute progress totals.
 */
function run<TExpectedAnswer>(cacheFile: CacheFile<TExpectedAnswer>, data: BenchmarkDataset<TExpectedAnswer>) {
  render(<TableProvider cacheFile={cacheFile} data={data} />)
}
export default run
