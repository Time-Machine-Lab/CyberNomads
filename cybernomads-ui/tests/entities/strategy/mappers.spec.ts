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
      contentMarkdown: '# 详情策略\n\n使用 {{账号:账号A="默认账号"}}',
      placeholders: [
        {
          type: '账号',
          key: '账号A',
          defaultValue: '默认账号',
        },
      ],
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-22T10:00:00.000Z',
    })

    expect(record.id).toBe('strategy-detail')
    expect(record.placeholders[0]?.declaration).toBe('{{账号:账号A="默认账号"}}')
    expect(record.summary).toBeTruthy()
  })

  it('parses placeholders from markdown', () => {
    const placeholders = parseStrategyPlaceholdersFromMarkdown(
      '# 测试\n\n{{账号:账号A="默认账号"}}\n{{风控时间:冷却时长="5秒"}}\n',
    )

    expect(placeholders).toEqual([
      {
        type: '账号',
        key: '账号A',
        defaultValue: '默认账号',
      },
      {
        type: '风控时间',
        key: '冷却时长',
        defaultValue: '5秒',
      },
    ])
    expect(buildPlaceholderDeclaration(placeholders[0]!)).toBe('{{账号:账号A="默认账号"}}')
  })
})
