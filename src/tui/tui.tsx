import React from 'react'
import { Box, render, Text } from 'ink'
import type { CacheFile } from '@/types/cache.js'
import type { Datajson } from '@/types/data.js'

type Color = 'cyan' | 'green' | 'red' | 'yellow' | 'gray' | 'white'

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

function aggregate(cacheFile: CacheFile): ModelRow[] {
  const byModel = new Map<string, ModelRow>()
  for (const a of cacheFile.answers) {
    let row = byModel.get(a.model)
    if (!row) {
      row = { model: a.model, count: 0, totalCost: 0, totalTime: 0, totalScore: 0 }
      byModel.set(a.model, row)
    }
    row.count++
    row.totalCost += a.cost
    row.totalTime += a.time
    row.totalScore += a.score
  }
  return [...byModel.values()]
}

export const TableProvider = <T,>({ cacheFile, data }: { cacheFile: CacheFile; data: Datajson<T> }) => {
  const total = data.data.length
  const rows = aggregate(cacheFile)
  const done = rows.filter(r => r.count >= total).length
  const allAnswers = rows.reduce((s, r) => s + r.count, 0)
  const allCost = rows.reduce((s, r) => s + r.totalCost, 0)
  const allTime = rows.reduce((s, r) => s + r.totalTime, 0)
  const allScore = rows.reduce((s, r) => s + r.totalScore, 0)

  return (
    <Box flexDirection="column" padding={1}>
      <Box width={64} paddingX={1} marginBottom={1} borderStyle="round" flexDirection="column" borderColor="cyan">
        <Text color="cyan">Ai BenchMark · {cacheFile.name}</Text>
        <Text color="yellow">Models: {done}/{rows.length} done · {allAnswers}/{rows.length * total} answers</Text>
      </Box>
      <Box>
        <Col align="flex-start" width={24}>Model</Col>
        <Col width={12}>Progress</Col>
        <Col width={10}>Avg Score</Col>
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
            <Col width={10}>{avg.toFixed(1)}</Col>
            <Col color="cyan" width={12}>${r.totalCost.toFixed(2)}</Col>
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
        <Col color="cyan" width={12}>${allCost.toFixed(2)}</Col>
        <Col width={10}>{(allTime / 1000).toFixed(1)}s</Col>
      </Box>
    </Box>
  )
}

function run<T>(cacheFile: CacheFile, data: Datajson<T>) {
  render(<TableProvider cacheFile={cacheFile} data={data} />)
}

export default run
