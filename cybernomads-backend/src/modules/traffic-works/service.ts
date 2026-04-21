import { randomUUID } from "node:crypto";

import type { ProductMetadataStore } from "../products/types.js";
import type { StrategyReferenceStore } from "../../ports/strategy-reference-store-port.js";
import type { TrafficWorkContextPreparationPort } from "../../ports/traffic-work-context-preparation-port.js";
import type { TrafficWorkContextStore } from "../../ports/traffic-work-context-store-port.js";
import type { TrafficWorkStateStore } from "../../ports/traffic-work-state-store-port.js";
import {
  TrafficWorkNotFoundError,
  TrafficWorkOperationConflictError,
  TrafficWorkProductNotFoundError,
  TrafficWorkStrategyNotFoundError,
  TrafficWorkValidationError,
} from "./errors.js";
import type {
  CreateTrafficWorkInput,
  ListTrafficWorksFilters,
  ListTrafficWorksResult,
  ObjectBindingItem,
  ProductBindingSummary,
  StrategyBindingSummary,
  TrafficWorkDetail,
  TrafficWorkLifecycleStatus,
  TrafficWorkRecord,
  TrafficWorkSummary,
  UpdateTrafficWorkInput,
} from "./types.js";

export interface TrafficWorkServiceOptions {
  stateStore: TrafficWorkStateStore;
  contextStore: TrafficWorkContextStore;
  contextPreparation: TrafficWorkContextPreparationPort;
  productStore: ProductMetadataStore;
  strategyStore: StrategyReferenceStore;
  now?: () => Date;
  createTrafficWorkId?: () => string;
}

export class TrafficWorkService {
  private readonly now: () => Date;
  private readonly createTrafficWorkId: () => string;

  constructor(private readonly options: TrafficWorkServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.createTrafficWorkId =
      options.createTrafficWorkId ?? (() => randomUUID());
  }

  async createTrafficWork(
    input: CreateTrafficWorkInput,
  ): Promise<TrafficWorkDetail> {
    const normalizedInput = normalizeTrafficWorkInput(input);
    const timestamp = this.now().toISOString();
    const product = await this.requireProductReference(
      normalizedInput.productId,
    );
    const strategy = await this.requireStrategyReference(
      normalizedInput.strategyId,
    );
    const record: TrafficWorkRecord = {
      trafficWorkId: this.createTrafficWorkId(),
      displayName: normalizedInput.displayName,
      productId: normalizedInput.productId,
      strategyId: normalizedInput.strategyId,
      objectBindings: normalizedInput.objectBindings,
      lifecycleStatus: "ready",
      lifecycleStatusReason: null,
      contextPreparationStatus: "pending",
      contextPreparationStatusReason: null,
      contextPreparedAt: null,
      lastStartedAt: null,
      endedAt: null,
      archivedAt: null,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.options.stateStore.createTrafficWork(record);

    const preparedRecord = await this.prepareContext(record, product, strategy);
    return toTrafficWorkDetail(preparedRecord, product, strategy);
  }

  async listTrafficWorks(
    filters: ListTrafficWorksFilters = {},
  ): Promise<ListTrafficWorksResult> {
    const normalizedFilters = normalizeListTrafficWorksFilters(filters);
    const records = await this.options.stateStore.listTrafficWorks();
    const items: TrafficWorkSummary[] = [];

    for (const record of records) {
      if (!matchesStateFilters(record, normalizedFilters)) {
        continue;
      }

      const product = await this.resolveProductReference(record.productId);
      const strategy = await this.resolveStrategyReference(record.strategyId);
      const summary = toTrafficWorkSummary(record, product, strategy);

      if (!matchesKeyword(summary, normalizedFilters.keyword)) {
        continue;
      }

      items.push(summary);
    }

    return { items };
  }

  async getTrafficWorkDetail(
    trafficWorkId: string,
  ): Promise<TrafficWorkDetail> {
    const record = await this.getTrafficWorkRecord(trafficWorkId);
    const product = await this.resolveProductReference(record.productId);
    const strategy = await this.resolveStrategyReference(record.strategyId);
    return toTrafficWorkDetail(record, product, strategy);
  }

  async updateTrafficWork(
    trafficWorkId: string,
    input: UpdateTrafficWorkInput,
  ): Promise<TrafficWorkDetail> {
    const normalizedInput = normalizeTrafficWorkInput(input);
    const existingRecord = await this.getTrafficWorkRecord(trafficWorkId);

    ensureLifecycleStatusAllowed(
      existingRecord.lifecycleStatus,
      ["ready"],
      "Only ready traffic works can be updated.",
    );

    const product = await this.requireProductReference(
      normalizedInput.productId,
    );
    const strategy = await this.requireStrategyReference(
      normalizedInput.strategyId,
    );
    const updatedRecord: TrafficWorkRecord = {
      ...existingRecord,
      displayName: normalizedInput.displayName,
      productId: normalizedInput.productId,
      strategyId: normalizedInput.strategyId,
      objectBindings: normalizedInput.objectBindings,
      contextPreparationStatus: "pending",
      contextPreparationStatusReason: null,
      contextPreparedAt: null,
      updatedAt: this.now().toISOString(),
    };

    await this.options.stateStore.saveTrafficWork(updatedRecord);

    const preparedRecord = await this.prepareContext(
      updatedRecord,
      product,
      strategy,
    );
    return toTrafficWorkDetail(preparedRecord, product, strategy);
  }

  async startTrafficWork(trafficWorkId: string): Promise<TrafficWorkDetail> {
    const record = await this.getTrafficWorkRecord(trafficWorkId);

    ensureLifecycleStatusAllowed(
      record.lifecycleStatus,
      ["ready"],
      "Only ready traffic works can be started.",
    );

    if (record.contextPreparationStatus !== "prepared") {
      throw new TrafficWorkOperationConflictError(
        "Traffic work context must be prepared before start.",
      );
    }

    const startedAt = this.now().toISOString();
    const nextRecord: TrafficWorkRecord = {
      ...record,
      lifecycleStatus: "running",
      lifecycleStatusReason: "Traffic work started.",
      lastStartedAt: startedAt,
      updatedAt: startedAt,
    };
    await this.options.stateStore.saveTrafficWork(nextRecord);

    return this.buildDetail(nextRecord);
  }

  async pauseTrafficWork(trafficWorkId: string): Promise<TrafficWorkDetail> {
    const record = await this.getTrafficWorkRecord(trafficWorkId);

    ensureLifecycleStatusAllowed(
      record.lifecycleStatus,
      ["running"],
      "Only running traffic works can be paused.",
    );

    const timestamp = this.now().toISOString();
    const nextRecord: TrafficWorkRecord = {
      ...record,
      lifecycleStatus: "ready",
      lifecycleStatusReason: "Traffic work paused.",
      updatedAt: timestamp,
    };
    await this.options.stateStore.saveTrafficWork(nextRecord);

    return this.buildDetail(nextRecord);
  }

  async endTrafficWork(trafficWorkId: string): Promise<TrafficWorkDetail> {
    const record = await this.getTrafficWorkRecord(trafficWorkId);

    ensureLifecycleStatusAllowed(
      record.lifecycleStatus,
      ["ready", "running"],
      "Only ready or running traffic works can be ended.",
    );

    const timestamp = this.now().toISOString();
    const nextRecord: TrafficWorkRecord = {
      ...record,
      lifecycleStatus: "ended",
      lifecycleStatusReason: "Traffic work ended.",
      endedAt: timestamp,
      updatedAt: timestamp,
    };
    await this.options.stateStore.saveTrafficWork(nextRecord);

    return this.buildDetail(nextRecord);
  }

  async archiveTrafficWork(trafficWorkId: string): Promise<TrafficWorkDetail> {
    const record = await this.getTrafficWorkRecord(trafficWorkId);

    ensureLifecycleStatusAllowed(
      record.lifecycleStatus,
      ["ready", "ended"],
      "Only ready or ended traffic works can be archived.",
    );

    const timestamp = this.now().toISOString();
    const nextRecord: TrafficWorkRecord = {
      ...record,
      lifecycleStatus: "archived",
      lifecycleStatusReason: "Traffic work archived.",
      archivedAt: timestamp,
      updatedAt: timestamp,
    };
    await this.options.stateStore.saveTrafficWork(nextRecord);

    return this.buildDetail(nextRecord);
  }

  async deleteTrafficWork(trafficWorkId: string): Promise<TrafficWorkDetail> {
    const record = await this.getTrafficWorkRecord(trafficWorkId);

    ensureLifecycleStatusAllowed(
      record.lifecycleStatus,
      ["ready", "ended", "archived"],
      "Only ready, ended, or archived traffic works can be deleted.",
    );

    const timestamp = this.now().toISOString();
    const nextRecord: TrafficWorkRecord = {
      ...record,
      lifecycleStatus: "deleted",
      lifecycleStatusReason: "Traffic work deleted.",
      deletedAt: timestamp,
      updatedAt: timestamp,
    };
    await this.options.stateStore.saveTrafficWork(nextRecord);

    return this.buildDetail(nextRecord);
  }

  close(): void {
    this.options.stateStore.close();
  }

  private async prepareContext(
    record: TrafficWorkRecord,
    product: ProductBindingSummary,
    strategy: StrategyBindingSummary,
  ): Promise<TrafficWorkRecord> {
    const contextMarkdown = renderTrafficWorkTaskMarkdown(
      record,
      product,
      strategy,
    );

    try {
      const context = await this.options.contextStore.writeTaskContext(
        record.trafficWorkId,
        contextMarkdown,
      );
      await this.options.contextPreparation.prepareContext({
        trafficWorkId: record.trafficWorkId,
        displayName: record.displayName,
        product,
        strategy,
        objectBindings: record.objectBindings,
        context,
      });
      const preparedAt = this.now().toISOString();
      const nextRecord: TrafficWorkRecord = {
        ...record,
        contextPreparationStatus: "prepared",
        contextPreparationStatusReason: "Traffic work context prepared.",
        contextPreparedAt: preparedAt,
        updatedAt: preparedAt,
      };
      await this.options.stateStore.saveTrafficWork(nextRecord);
      return nextRecord;
    } catch (error) {
      const failedAt = this.now().toISOString();
      const nextRecord: TrafficWorkRecord = {
        ...record,
        contextPreparationStatus: "failed",
        contextPreparationStatusReason: toPreparationFailureReason(error),
        contextPreparedAt: null,
        updatedAt: failedAt,
      };
      await this.options.stateStore.saveTrafficWork(nextRecord);
      return nextRecord;
    }
  }

  private async buildDetail(
    record: TrafficWorkRecord,
  ): Promise<TrafficWorkDetail> {
    const product = await this.resolveProductReference(record.productId);
    const strategy = await this.resolveStrategyReference(record.strategyId);
    return toTrafficWorkDetail(record, product, strategy);
  }

  private async getTrafficWorkRecord(
    trafficWorkId: string,
  ): Promise<TrafficWorkRecord> {
    const normalizedTrafficWorkId = normalizeRequiredString(
      trafficWorkId,
      "Traffic work ID is required.",
    );
    const record = await this.options.stateStore.getTrafficWorkById(
      normalizedTrafficWorkId,
    );

    if (!record) {
      throw new TrafficWorkNotFoundError(normalizedTrafficWorkId);
    }

    return record;
  }

  private async requireProductReference(
    productId: string,
  ): Promise<ProductBindingSummary> {
    const product = await this.options.productStore.getProductById(productId);

    if (!product) {
      throw new TrafficWorkProductNotFoundError(productId);
    }

    return {
      productId: product.productId,
      name: product.name,
    };
  }

  private async resolveProductReference(
    productId: string,
  ): Promise<ProductBindingSummary> {
    const product = await this.options.productStore.getProductById(productId);

    return {
      productId,
      name: product?.name ?? productId,
    };
  }

  private async requireStrategyReference(
    strategyId: string,
  ): Promise<StrategyBindingSummary> {
    const strategy =
      await this.options.strategyStore.getStrategyReferenceById(strategyId);

    if (!strategy) {
      throw new TrafficWorkStrategyNotFoundError(strategyId);
    }

    return strategy;
  }

  private async resolveStrategyReference(
    strategyId: string,
  ): Promise<StrategyBindingSummary> {
    return (
      (await this.options.strategyStore.getStrategyReferenceById(
        strategyId,
      )) ?? {
        strategyId,
        name: strategyId,
      }
    );
  }
}

function normalizeTrafficWorkInput(
  input: CreateTrafficWorkInput | UpdateTrafficWorkInput,
): CreateTrafficWorkInput | UpdateTrafficWorkInput {
  return {
    displayName: normalizeRequiredString(
      input.displayName,
      "Display name is required.",
    ),
    productId: normalizeRequiredString(
      input.productId,
      "Product ID is required.",
    ),
    strategyId: normalizeRequiredString(
      input.strategyId,
      "Strategy ID is required.",
    ),
    objectBindings: normalizeObjectBindings(input.objectBindings),
  };
}

function normalizeListTrafficWorksFilters(
  filters: ListTrafficWorksFilters,
): ListTrafficWorksFilters {
  return {
    productId: normalizeOptionalString(filters.productId) ?? undefined,
    strategyId: normalizeOptionalString(filters.strategyId) ?? undefined,
    keyword: normalizeOptionalString(filters.keyword) ?? undefined,
    lifecycleStatus: filters.lifecycleStatus
      ? ensureLifecycleStatus(filters.lifecycleStatus)
      : undefined,
    contextPreparationStatus: filters.contextPreparationStatus
      ? ensureContextPreparationStatus(filters.contextPreparationStatus)
      : undefined,
  };
}

function normalizeObjectBindings(value: unknown): ObjectBindingItem[] {
  if (!Array.isArray(value)) {
    throw new TrafficWorkValidationError("Object bindings must be an array.");
  }

  if (value.length === 0) {
    throw new TrafficWorkValidationError(
      "At least one object binding is required.",
    );
  }

  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new TrafficWorkValidationError(
        "Each object binding must be an object.",
      );
    }

    return {
      objectType: normalizeRequiredString(
        (item as ObjectBindingItem).objectType,
        "Object binding objectType is required.",
      ),
      objectKey: normalizeRequiredString(
        (item as ObjectBindingItem).objectKey,
        "Object binding objectKey is required.",
      ),
      resourceId: normalizeRequiredString(
        (item as ObjectBindingItem).resourceId,
        "Object binding resourceId is required.",
      ),
      resourceLabel: normalizeOptionalString(
        (item as ObjectBindingItem).resourceLabel,
      ),
    };
  });
}

function normalizeRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new TrafficWorkValidationError(message);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new TrafficWorkValidationError(message);
  }

  return normalizedValue;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredString(value, "Expected a non-empty string.");
}

function ensureLifecycleStatus(value: unknown): TrafficWorkLifecycleStatus {
  if (
    value === "ready" ||
    value === "running" ||
    value === "ended" ||
    value === "archived" ||
    value === "deleted"
  ) {
    return value;
  }

  throw new TrafficWorkValidationError("Lifecycle status filter is invalid.");
}

function ensureContextPreparationStatus(
  value: unknown,
): TrafficWorkRecord["contextPreparationStatus"] {
  if (value === "pending" || value === "prepared" || value === "failed") {
    return value;
  }

  throw new TrafficWorkValidationError(
    "Context preparation status filter is invalid.",
  );
}

function ensureLifecycleStatusAllowed(
  status: TrafficWorkLifecycleStatus,
  allowedStatuses: TrafficWorkLifecycleStatus[],
  message: string,
): void {
  if (!allowedStatuses.includes(status)) {
    throw new TrafficWorkOperationConflictError(message);
  }
}

function matchesStateFilters(
  record: TrafficWorkRecord,
  filters: ListTrafficWorksFilters,
): boolean {
  if (filters.productId && record.productId !== filters.productId) {
    return false;
  }

  if (filters.strategyId && record.strategyId !== filters.strategyId) {
    return false;
  }

  if (
    filters.lifecycleStatus &&
    record.lifecycleStatus !== filters.lifecycleStatus
  ) {
    return false;
  }

  if (
    filters.contextPreparationStatus &&
    record.contextPreparationStatus !== filters.contextPreparationStatus
  ) {
    return false;
  }

  return true;
}

function matchesKeyword(
  summary: TrafficWorkSummary,
  keyword: string | undefined,
): boolean {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = keyword.toLowerCase();

  return [
    summary.displayName,
    summary.product.name,
    summary.product.productId,
    summary.strategy.name,
    summary.strategy.strategyId,
  ].some((value) => value.toLowerCase().includes(normalizedKeyword));
}

function toTrafficWorkSummary(
  record: TrafficWorkRecord,
  product: ProductBindingSummary,
  strategy: StrategyBindingSummary,
): TrafficWorkSummary {
  return {
    trafficWorkId: record.trafficWorkId,
    displayName: record.displayName,
    product,
    strategy,
    objectBindingCount: record.objectBindings.length,
    lifecycleStatus: record.lifecycleStatus,
    contextPreparationStatus: record.contextPreparationStatus,
    updatedAt: record.updatedAt,
  };
}

function toTrafficWorkDetail(
  record: TrafficWorkRecord,
  product: ProductBindingSummary,
  strategy: StrategyBindingSummary,
): TrafficWorkDetail {
  return {
    trafficWorkId: record.trafficWorkId,
    displayName: record.displayName,
    product,
    strategy,
    objectBindings: record.objectBindings.map(cloneObjectBinding),
    lifecycleStatus: record.lifecycleStatus,
    lifecycleStatusReason: record.lifecycleStatusReason,
    contextPreparationStatus: record.contextPreparationStatus,
    contextPreparationStatusReason: record.contextPreparationStatusReason,
    contextPreparedAt: record.contextPreparedAt,
    lastStartedAt: record.lastStartedAt,
    endedAt: record.endedAt,
    archivedAt: record.archivedAt,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function cloneObjectBinding(item: ObjectBindingItem): ObjectBindingItem {
  return {
    objectType: item.objectType,
    objectKey: item.objectKey,
    resourceId: item.resourceId,
    resourceLabel: item.resourceLabel,
  };
}

function renderTrafficWorkTaskMarkdown(
  record: TrafficWorkRecord,
  product: ProductBindingSummary,
  strategy: StrategyBindingSummary,
): string {
  const objectBindings = record.objectBindings
    .map(
      (item) =>
        `- ${item.objectType}:${item.objectKey} -> ${item.resourceId}${
          item.resourceLabel ? ` (${item.resourceLabel})` : ""
        }`,
    )
    .join("\n");

  return [
    `# Traffic Work Context`,
    ``,
    `- Traffic Work ID: ${record.trafficWorkId}`,
    `- Display Name: ${record.displayName}`,
    `- Product: ${product.productId} (${product.name})`,
    `- Strategy: ${strategy.strategyId} (${strategy.name})`,
    `- Lifecycle Status: ${record.lifecycleStatus}`,
    `- Context Preparation Status: ${record.contextPreparationStatus}`,
    ``,
    `## Object Bindings`,
    objectBindings,
    ``,
    `## Preparation Goal`,
    `Prepare the stable work-level context for this traffic work without expanding into task scheduling or execution internals.`,
    ``,
  ].join("\n");
}

function toPreparationFailureReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Traffic work context preparation failed.";
}
