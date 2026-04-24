import { describe, expect, it } from "vitest";

import { StrategyService } from "../../src/modules/strategies/service.js";
import {
  StrategyNotFoundError,
  StrategyValidationError,
} from "../../src/modules/strategies/errors.js";
import type {
  StrategyContentStore,
  StrategyMetadataStore,
  StrategyRecord,
  StrategySummary,
} from "../../src/modules/strategies/types.js";

describe("strategy service", () => {
  it("creates, lists, updates, and reads strategy details with derived summary and placeholder declarations", async () => {
    const metadataStore = new InMemoryStrategyMetadataStore();
    const contentStore = new InMemoryStrategyContentStore();
    const service = new StrategyService({
      metadataStore,
      contentStore,
      now: createSequentialNow(),
      createStrategyId: () => "strategy-1",
    });

    const createdStrategy = await service.createStrategy({
      name: "首版策略",
      tags: ["growth", "growth", "mvp"],
      contentMarkdown: [
        "<!-- s:seed-1 -->",
        '# {{string:title="默认标题"}}',
        "重试：{{int:max_retry=3}}",
      ].join("\n"),
    });

    expect(createdStrategy).toEqual({
      strategyId: "strategy-1",
      name: "首版策略",
      summary: "默认标题",
      tags: ["growth", "mvp"],
      contentMarkdown: [
        "<!-- s:seed-1 -->",
        '# {{string:title="默认标题"}}',
        "重试：{{int:max_retry=3}}",
      ].join("\n"),
      placeholders: [
        {
          type: "string",
          key: "title",
          defaultValue: "默认标题",
        },
        {
          type: "int",
          key: "max_retry",
          defaultValue: 3,
        },
      ],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z",
    });

    expect(await service.listStrategies()).toEqual({
      items: [
        {
          strategyId: "strategy-1",
          name: "首版策略",
          summary: "默认标题",
          tags: ["growth", "mvp"],
          updatedAt: "2026-04-21T00:00:00.000Z",
        },
      ],
    });

    const updatedStrategy = await service.updateStrategy("strategy-1", {
      name: "升级策略",
      summary: "显式摘要",
      tags: ["stable"],
      contentMarkdown: [
        '# {{string:title="升级标题"}}',
        '按钮：{{string:cta_text="立即开始"}}',
        '按钮重复：{{string:cta_text="立即开始"}}',
      ].join("\n"),
    });

    expect(updatedStrategy).toEqual({
      strategyId: "strategy-1",
      name: "升级策略",
      summary: "显式摘要",
      tags: ["stable"],
      contentMarkdown: [
        '# {{string:title="升级标题"}}',
        '按钮：{{string:cta_text="立即开始"}}',
        '按钮重复：{{string:cta_text="立即开始"}}',
      ].join("\n"),
      placeholders: [
        {
          type: "string",
          key: "title",
          defaultValue: "升级标题",
        },
        {
          type: "string",
          key: "cta_text",
          defaultValue: "立即开始",
        },
      ],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:01:00.000Z",
    });

    await expect(service.getStrategyDetail("strategy-1")).resolves.toEqual(
      updatedStrategy,
    );
  });

  it("rejects invalid placeholder declarations and missing strategies", async () => {
    const service = new StrategyService({
      metadataStore: new InMemoryStrategyMetadataStore(),
      contentStore: new InMemoryStrategyContentStore(),
      createStrategyId: () => "strategy-1",
    });

    await expect(
      service.createStrategy({
        name: "无效策略",
        contentMarkdown: '{{string:title="A"}} {{int:title=2}}',
      }),
    ).rejects.toBeInstanceOf(StrategyValidationError);

    await expect(
      service.getStrategyDetail("missing-strategy"),
    ).rejects.toBeInstanceOf(StrategyNotFoundError);

    await expect(
      service.updateStrategy("missing-strategy", {
        name: "missing",
        contentMarkdown: '# {{string:title="A"}}',
      }),
    ).rejects.toBeInstanceOf(StrategyNotFoundError);
  });

  it("generates compact 8-character strategy ids by default", async () => {
    const service = new StrategyService({
      metadataStore: new InMemoryStrategyMetadataStore(),
      contentStore: new InMemoryStrategyContentStore(),
    });

    const createdStrategy = await service.createStrategy({
      name: "短 ID 策略",
      contentMarkdown: "# 内容",
    });

    expect(createdStrategy.strategyId).toMatch(/^[0-9a-f]{8}$/);
  });

  it("retries when a generated short strategy id already exists", async () => {
    const metadataStore = new InMemoryStrategyMetadataStore();
    const contentStore = new InMemoryStrategyContentStore();
    const service = new StrategyService({
      metadataStore,
      contentStore,
      createStrategyId: (() => {
        const ids = ["abcd1234", "abcd1234", "f0e1d2c3"];
        let index = 0;
        return () => ids[Math.min(index++, ids.length - 1)];
      })(),
    });

    await service.createStrategy({
      name: "已有策略",
      contentMarkdown: "# 首条",
    });

    const createdStrategy = await service.createStrategy({
      name: "重试策略",
      contentMarkdown: "# 第二条",
    });

    expect(createdStrategy.strategyId).toBe("f0e1d2c3");
  });

  it("deletes strategy metadata and markdown content", async () => {
    const metadataStore = new InMemoryStrategyMetadataStore();
    const contentStore = new InMemoryStrategyContentStore();
    const service = new StrategyService({
      metadataStore,
      contentStore,
      createStrategyId: () => "deadbeef",
    });

    await service.createStrategy({
      name: "待删除策略",
      contentMarkdown: "# 待删除",
    });

    await service.deleteStrategy("deadbeef");

    await expect(
      service.getStrategyDetail("deadbeef"),
    ).rejects.toBeInstanceOf(StrategyNotFoundError);
    await expect(contentStore.readContent("deadbeef.md")).rejects.toThrow(
      "Missing content for deadbeef.md",
    );
  });
});

class InMemoryStrategyMetadataStore implements StrategyMetadataStore {
  private readonly records = new Map<string, StrategyRecord>();

  async createStrategy(record: StrategyRecord): Promise<void> {
    this.records.set(record.strategyId, structuredClone(record));
  }

  async updateStrategy(
    strategyId: string,
    updates: Pick<StrategyRecord, "name" | "summary" | "tags" | "updatedAt">,
  ): Promise<void> {
    const existingRecord = this.records.get(strategyId);

    if (!existingRecord) {
      return;
    }

    this.records.set(strategyId, {
      ...existingRecord,
      ...structuredClone(updates),
    });
  }

  async getStrategyById(
    strategyId: string,
  ): Promise<StrategyRecord | undefined> {
    const record = this.records.get(strategyId);
    return record ? structuredClone(record) : undefined;
  }

  async listStrategies(): Promise<StrategySummary[]> {
    return [...this.records.values()]
      .sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) ||
          right.strategyId.localeCompare(left.strategyId),
      )
      .map((record) => ({
        strategyId: record.strategyId,
        name: record.name,
        summary: record.summary,
        tags: structuredClone(record.tags),
        updatedAt: record.updatedAt,
      }));
  }

  async deleteStrategy(strategyId: string): Promise<void> {
    this.records.delete(strategyId);
  }

  close(): void {}
}

class InMemoryStrategyContentStore implements StrategyContentStore {
  private readonly content = new Map<string, string>();

  async writeContent(
    contentRef: string,
    contentMarkdown: string,
  ): Promise<void> {
    this.content.set(contentRef, contentMarkdown);
  }

  async readContent(contentRef: string): Promise<string> {
    const contentMarkdown = this.content.get(contentRef);

    if (contentMarkdown === undefined) {
      throw new Error(`Missing content for ${contentRef}`);
    }

    return contentMarkdown;
  }

  async deleteContent(contentRef: string): Promise<void> {
    this.content.delete(contentRef);
  }
}

function createSequentialNow(): () => Date {
  const timestamps = [
    "2026-04-21T00:00:00.000Z",
    "2026-04-21T00:01:00.000Z",
    "2026-04-21T00:02:00.000Z",
  ];
  let index = 0;

  return () => {
    const timestamp = timestamps[Math.min(index, timestamps.length - 1)];
    index += 1;
    return new Date(timestamp);
  };
}
