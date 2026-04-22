import { describe, expect, it } from 'vitest'

import {
  buildPlaceholderDeclaration,
  mapStrategyDetailDtoToRecord,
  mapStrategySummaryDtoToRecord,
  parseStrategyPlaceholdersFromMarkdown,
} from '@/entities/strategy/model/mappers'

describe('strategy mappers', () => {
  it('maps strategy summary dto to record', () => {
    const record = mapStrategySummaryDtoToRecord({
      strategyId: 'strategy-demo',
      name: '演示策略',
      summary: '用于验证摘要映射。',
      tags: ['演示', '测试'],
      updatedAt: '2026-04-22T10:00:00.000Z',
    })

    expect(record.id).toBe('strategy-demo')
    expect(record.name).toBe('演示策略')
    expect(record.tags).toEqual(['演示', '测试'])
    expect(record.updatedAtLabel).toBeTruthy()
  })

  it('maps strategy detail dto and placeholder declarations', () => {
    const record = mapStrategyDetailDtoToRecord({
      strategyId: 'strategy-detail',
      name: '详情策略',
      summary: '',
      tags: ['详情'],
      contentMarkdown: '# 详情策略\n\n使用 {{string:title="默认标题"}}',
      placeholders: [
        {
          type: 'string',
          key: 'title',
          defaultValue: '默认标题',
        },
      ],
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-22T10:00:00.000Z',
    })

    expect(record.id).toBe('strategy-detail')
    expect(record.placeholders[0]?.declaration).toBe('{{string:title="默认标题"}}')
    expect(record.summary).toBeTruthy()
  })

  it('parses placeholders from markdown', () => {
    const placeholders = parseStrategyPlaceholdersFromMarkdown(
      '# 测试\n\n{{string:title="默认标题"}}\n{{int:max_retry=3}}\n',
    )

    expect(placeholders).toEqual([
      {
        type: 'string',
        key: 'title',
        defaultValue: '默认标题',
      },
      {
        type: 'int',
        key: 'max_retry',
        defaultValue: 3,
      },
    ])
    expect(buildPlaceholderDeclaration(placeholders[0]!)).toBe('{{string:title="默认标题"}}')
  })
})
