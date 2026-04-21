export type StrategyPlaceholderType = "string" | "int";

export interface StringStrategyPlaceholder {
  type: "string";
  key: string;
  defaultValue: string;
}

export interface IntStrategyPlaceholder {
  type: "int";
  key: string;
  defaultValue: number;
}

export type StrategyPlaceholder =
  | StringStrategyPlaceholder
  | IntStrategyPlaceholder;

export interface StrategyRecord {
  strategyId: string;
  name: string;
  summary: string;
  tags: string[];
  contentRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategySummary {
  strategyId: string;
  name: string;
  summary: string;
  tags: string[];
  updatedAt: string;
}

export interface StrategyDetail {
  strategyId: string;
  name: string;
  summary: string;
  tags: string[];
  contentMarkdown: string;
  placeholders: StrategyPlaceholder[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyInput {
  name: string;
  summary?: string;
  tags?: string[];
  contentMarkdown: string;
}

export interface UpdateStrategyInput {
  name: string;
  summary?: string;
  tags?: string[];
  contentMarkdown: string;
}

export interface ListStrategiesResult {
  items: StrategySummary[];
}

export interface StrategyMetadataStore {
  createStrategy(record: StrategyRecord): Promise<void>;
  updateStrategy(
    strategyId: string,
    updates: Pick<StrategyRecord, "name" | "summary" | "tags" | "updatedAt">,
  ): Promise<void>;
  getStrategyById(strategyId: string): Promise<StrategyRecord | undefined>;
  listStrategies(): Promise<StrategySummary[]>;
  deleteStrategy(strategyId: string): Promise<void>;
  close(): void;
}

export interface StrategyContentStore {
  writeContent(contentRef: string, contentMarkdown: string): Promise<void>;
  readContent(contentRef: string): Promise<string>;
  deleteContent(contentRef: string): Promise<void>;
}
