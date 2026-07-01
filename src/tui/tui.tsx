import React from 'react'
import { Box, render, Text } from 'ink'
import type { CacheFile } from '@/types/cache.js'
import type { BenchmarkDataset } from '@/types/data.js'

type Color = 'cyan' | 'green' | 'red' | 'yellow' | 'gray' | 'white'

/**
 * A single table column cell that aligns text and applies an optional color.
 */
const Col = ({ children, width, align, color }: { children: React.ReactNode; width?: number; align?: 'flex-start' | 'center' | 'flex-end'; color?: Color }) => (
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
    byModel.set(model, { model, count: 0, totalCost: 0, totalTime: 0, totalScore: 0 })
  }
  for (const a of cacheFile.answers) {
    let row = byModel.get(a.model)
    if (!row) {
      row = { model: a.model, count: 0, totalCost: 0, totalTime: 0, totalScore: 0 }
      byModel.set(a.model, row)
    }
    row.count++
    row.totalCost += a.cost
    row.totalTime += a.time_taken
    row.totalScore += a.score
  }
  return [...byModel.values()]
}

/**
 * Renders the benchmark progress table for all configured models.
 */
export const TableProvider = <TExpectedAnswer,>({ cacheFile, data }: { cacheFile: CacheFile<TExpectedAnswer>; data: BenchmarkDataset<TExpectedAnswer> }) => {
  const total = data.data.length
  const rows = aggregate(cacheFile)
  const done = rows.filter(r => r.count >= total).length
  const allAnswers = rows.reduce((s, r) => s + r.count, 0)
  const allCost = rows.reduce((s, r) => s + r.totalCost, 0)
  const allTime = rows.reduce((s, r) => s + r.totalTime, 0)

  return (
    <Box flexDirection="column" padding={1}>
      <Box width={64} paddingX={1} marginBottom={1} borderStyle="round" flexDirection="column" borderColor="cyan">
        <Text color="cyan">Ai BenchMark · {cacheFile.dataset_name} · {cacheFile.id}</Text>
        <Text color="yellow">Models: {done}/{rows.length} done · {allAnswers}/{rows.length * total} answers</Text>
      </Box>
      <Box>
        <Col align="flex-start" width={24}>Model</Col>
        <Col width={12}>Progress</Col>
        <Col width={10}>Score</Col>
        <Col width={12}>Cost</Col>
        <Col width={10}>Time</Col>
      </Box>
      <Text dimColor>{'─'.repeat(64)}</Text>
      {rows.map((r) => {
        const complete = r.count >= total
        const avg = r.count ? r.totalScore / r.count : 0
        return (
          <Box key={r.model}>
            <Col align="flex-start" width={24} color={complete ? 'white' : 'yellow'}>{r.model}</Col>
            <Col width={12} color={complete ? 'green' : 'yellow'}>{r.count}/{total}</Col>
            <Col width={10}>{r.totalScore}</Col>
            <Col color="cyan" width={12}>${r.totalCost.toFixed(4)}</Col>
            <Col width={10}>{(r.totalTime / 1000).toFixed(1)}s</Col>
          </Box>
        )
      })}
      <Text dimColor>{'─'.repeat(64)}</Text>
      <Box>
        <Col align="flex-start" width={24} color="cyan">Total</Col>
        {/* <Col width={12}>{allAnswers}/{rows.length * total}</Col>
        <Col width={10}>{allAnswers ? (allScore / allAnswers).toFixed(1) : '0.0'}</Col> */}
        <Col color="cyan" width={12}>-</Col>
        <Col width={10}>-</Col>
        <Col color="cyan" width={12}>${allCost.toFixed(4)}</Col>
        <Col width={10}>{(allTime / 1000).toFixed(1)}s</Col>
      </Box>
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
