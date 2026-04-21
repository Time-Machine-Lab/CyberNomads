import { randomUUID } from "node:crypto";

import { StrategyNotFoundError, StrategyValidationError } from "./errors.js";
import {
  parseStrategyPlaceholders,
  replaceStrategyPlaceholdersWithDefaults,
} from "./parser.js";
import type {
  CreateStrategyInput,
  ListStrategiesResult,
  StrategyContentStore,
  StrategyDetail,
  StrategyMetadataStore,
  StrategyPlaceholder,
  StrategyRecord,
  UpdateStrategyInput,
} from "./types.js";

export interface StrategyServiceOptions {
  metadataStore: StrategyMetadataStore;
  contentStore: StrategyContentStore;
  now?: () => Date;
  createStrategyId?: () => string;
}

interface NormalizedStrategyInput {
  name: string;
  summary?: string;
  tags: string[];
  contentMarkdown: string;
}

export class StrategyService {
  private readonly metadataStore: StrategyMetadataStore;
  private readonly contentStore: StrategyContentStore;
  private readonly now: () => Date;
  private readonly createStrategyId: () => string;

  constructor(options: StrategyServiceOptions) {
    this.metadataStore = options.metadataStore;
    this.contentStore = options.contentStore;
    this.now = options.now ?? (() => new Date());
    this.createStrategyId = options.createStrategyId ?? (() => randomUUID());
  }

  async createStrategy(input: CreateStrategyInput): Promise<StrategyDetail> {
    const normalizedInput = normalizeStrategyInput(input);
    const placeholders = parseStrategyPlaceholders(
      normalizedInput.contentMarkdown,
    );
    const summary = resolveStrategySummary(
      normalizedInput.summary,
      normalizedInput.name,
      normalizedInput.contentMarkdown,
    );
    const timestamp = this.now().toISOString();
    const strategyId = this.createStrategyId();
    const contentRef = `${strategyId}.md`;
    const record: StrategyRecord = {
      strategyId,
      name: normalizedInput.name,
      summary,
      tags: normalizedInput.tags,
      contentRef,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.metadataStore.createStrategy(record);

    try {
      await this.contentStore.writeContent(
        contentRef,
        normalizedInput.contentMarkdown,
      );
    } catch (error) {
      await this.metadataStore.deleteStrategy(strategyId);
      throw error;
    }

    return toStrategyDetail(
      record,
      normalizedInput.contentMarkdown,
      placeholders,
    );
  }

  async updateStrategy(
    strategyId: string,
    input: UpdateStrategyInput,
  ): Promise<StrategyDetail> {
    const normalizedInput = normalizeStrategyInput(input);
    const existingRecord = await this.metadataStore.getStrategyById(strategyId);

    if (!existingRecord) {
      throw new StrategyNotFoundError(strategyId);
    }

    const placeholders = parseStrategyPlaceholders(
      normalizedInput.contentMarkdown,
    );
    const updatedAt = this.now().toISOString();
    const summary = resolveStrategySummary(
      normalizedInput.summary,
      normalizedInput.name,
      normalizedInput.contentMarkdown,
    );

    await this.metadataStore.updateStrategy(strategyId, {
      name: normalizedInput.name,
      summary,
      tags: normalizedInput.tags,
      updatedAt,
    });

    try {
      await this.contentStore.writeContent(
        existingRecord.contentRef,
        normalizedInput.contentMarkdown,
      );
    } catch (error) {
      await this.metadataStore.updateStrategy(strategyId, {
        name: existingRecord.name,
        summary: existingRecord.summary,
        tags: existingRecord.tags,
        updatedAt: existingRecord.updatedAt,
      });
      throw error;
    }

    return toStrategyDetail(
      {
        ...existingRecord,
        name: normalizedInput.name,
        summary,
        tags: normalizedInput.tags,
        updatedAt,
      },
      normalizedInput.contentMarkdown,
      placeholders,
    );
  }

  async listStrategies(): Promise<ListStrategiesResult> {
    return {
      items: await this.metadataStore.listStrategies(),
    };
  }

  async getStrategyDetail(strategyId: string): Promise<StrategyDetail> {
    const record = await this.metadataStore.getStrategyById(strategyId);

    if (!record) {
      throw new StrategyNotFoundError(strategyId);
    }

    const contentMarkdown = await this.contentStore.readContent(
      record.contentRef,
    );
    const placeholders = parseStrategyPlaceholders(contentMarkdown);

    return toStrategyDetail(record, contentMarkdown, placeholders);
  }

  close(): void {
    this.metadataStore.close();
  }
}

function normalizeStrategyInput(
  input: CreateStrategyInput | UpdateStrategyInput,
): NormalizedStrategyInput {
  if (typeof input.name !== "string") {
    throw new StrategyValidationError("Strategy name must be a string.");
  }

  if (typeof input.contentMarkdown !== "string") {
    throw new StrategyValidationError(
      "Strategy contentMarkdown must be a string.",
    );
  }

  const name = input.name.trim();

  if (name.length === 0) {
    throw new StrategyValidationError("Strategy name is required.");
  }

  if (input.contentMarkdown.trim().length === 0) {
    throw new StrategyValidationError("Strategy contentMarkdown is required.");
  }

  const summary =
    typeof input.summary === "string" ? input.summary.trim() : undefined;

  return {
    name,
    summary: summary && summary.length > 0 ? summary : undefined,
    tags: normalizeStrategyTags(input.tags),
    contentMarkdown: input.contentMarkdown,
  };
}

function normalizeStrategyTags(tags: string[] | undefined): string[] {
  if (tags === undefined) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new StrategyValidationError("Strategy tags must be an array.");
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    if (typeof tag !== "string") {
      throw new StrategyValidationError("Each strategy tag must be a string.");
    }

    const normalizedTag = tag.trim();

    if (normalizedTag.length === 0 || seenTags.has(normalizedTag)) {
      continue;
    }

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}

function resolveStrategySummary(
  explicitSummary: string | undefined,
  strategyName: string,
  contentMarkdown: string,
): string {
  if (explicitSummary) {
    return truncateSummary(explicitSummary);
  }

  const placeholderRenderedContent =
    replaceStrategyPlaceholdersWithDefaults(contentMarkdown);
  const contentWithoutComments = placeholderRenderedContent.replace(
    /<!--[\s\S]*?-->/g,
    " ",
  );
  const lines = contentWithoutComments.split(/\r?\n/);

  for (const line of lines) {
    const normalizedLine = normalizeMarkdownLineForSummary(line);

    if (normalizedLine.length > 0) {
      return truncateSummary(normalizedLine);
    }
  }

  return truncateSummary(strategyName);
}

function normalizeMarkdownLineForSummary(line: string): string {
  return line
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[#>\-\+\*\d.\s]+/, "")
    .replace(/[`*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSummary(summary: string): string {
  const normalizedSummary = summary.trim();

  if (normalizedSummary.length <= 160) {
    return normalizedSummary;
  }

  return `${normalizedSummary.slice(0, 157)}...`;
}

function toStrategyDetail(
  record: StrategyRecord,
  contentMarkdown: string,
  placeholders: StrategyPlaceholder[],
): StrategyDetail {
  return {
    strategyId: record.strategyId,
    name: record.name,
    summary: record.summary,
    tags: record.tags,
    contentMarkdown,
    placeholders,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
