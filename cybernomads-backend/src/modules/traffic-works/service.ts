import { randomUUID } from "node:crypto";

import type {
  ProductContentStore,
  ProductMetadataStore,
} from "../products/types.js";
import type {
  StrategyContentStore,
  StrategyMetadataStore,
} from "../strategies/types.js";
import type { TaskSetWriteInput, TaskSetWriteResult } from "../tasks/types.js";
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
  StrategyParameterBinding,
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
  productContentStore: ProductContentStore;
  strategyStore: StrategyReferenceStore & StrategyMetadataStore;
  strategyContentStore: StrategyContentStore;
  taskSetPersistence: TrafficWorkTaskSetPersistence;
  now?: () => Date;
  createTrafficWorkId?: () => string;
}

export interface TrafficWorkTaskSetPersistence {
  createTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ): Promise<TaskSetWriteResult>;
  replaceTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ): Promise<TaskSetWriteResult>;
}

interface TrafficWorkProductSnapshot {
  summary: ProductBindingSummary;
  contentMarkdown: string;
}

interface TrafficWorkStrategySnapshot {
  summary: StrategyBindingSummary;
  contentMarkdown: string;
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
    const product = await this.requireProductSnapshot(
      normalizedInput.productId,
    );
    const strategy = await this.requireStrategySnapshot(
      normalizedInput.strategyId,
    );
    const record: TrafficWorkRecord = {
      trafficWorkId: this.createTrafficWorkId(),
      displayName: normalizedInput.displayName,
      productId: normalizedInput.productId,
      strategyId: normalizedInput.strategyId,
      objectBindings: normalizedInput.objectBindings,
      parameterBindings: normalizedInput.parameterBindings,
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
    return toTrafficWorkDetail(
      preparedRecord,
      product.summary,
      strategy.summary,
    );
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

    ensureLifecycleStatusNotRunning(existingRecord.lifecycleStatus);

    const product = await this.requireProductSnapshot(
      normalizedInput.productId,
    );
    const strategy = await this.requireStrategySnapshot(
      normalizedInput.strategyId,
    );
    const updatedRecord: TrafficWorkRecord = {
      ...existingRecord,
      displayName: normalizedInput.displayName,
      productId: normalizedInput.productId,
      strategyId: normalizedInput.strategyId,
      objectBindings: normalizedInput.objectBindings,
      parameterBindings: normalizedInput.parameterBindings,
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
      "replace",
    );
    return toTrafficWorkDetail(
      preparedRecord,
      product.summary,
      strategy.summary,
    );
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
    product: TrafficWorkProductSnapshot,
    strategy: TrafficWorkStrategySnapshot,
    taskSetMode: "create" | "replace" = "create",
  ): Promise<TrafficWorkRecord> {
    const contextMarkdown = renderTrafficWorkTaskMarkdown(
      record,
      product.summary,
      strategy.summary,
      product.contentMarkdown,
      strategy.contentMarkdown,
    );

    try {
      const context = await this.options.contextStore.writeTaskContext(
        record.trafficWorkId,
        contextMarkdown,
      );
      const taskSet = await this.options.contextPreparation.prepareContext({
        trafficWorkId: record.trafficWorkId,
        displayName: record.displayName,
        product: product.summary,
        productContentMarkdown: product.contentMarkdown,
        strategy: strategy.summary,
        strategyContentMarkdown: strategy.contentMarkdown,
        objectBindings: record.objectBindings,
        parameterBindings: record.parameterBindings,
        context,
      });

      if (taskSetMode === "create") {
        await this.options.taskSetPersistence.createTaskSetForTrafficWork(
          record.trafficWorkId,
          taskSet,
        );
      } else {
        await this.options.taskSetPersistence.replaceTaskSetForTrafficWork(
          record.trafficWorkId,
          taskSet,
        );
      }

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

  private async requireProductSnapshot(
    productId: string,
  ): Promise<TrafficWorkProductSnapshot> {
    const product = await this.options.productStore.getProductById(productId);

    if (!product) {
      throw new TrafficWorkProductNotFoundError(productId);
    }

    return {
      summary: {
        productId: product.productId,
        name: product.name,
      },
      contentMarkdown: await this.options.productContentStore.readContent(
        product.contentRef,
      ),
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

  private async requireStrategySnapshot(
    strategyId: string,
  ): Promise<TrafficWorkStrategySnapshot> {
    const strategy =
      await this.options.strategyStore.getStrategyById(strategyId);

    if (!strategy) {
      throw new TrafficWorkStrategyNotFoundError(strategyId);
    }

    return {
      summary: {
        strategyId: strategy.strategyId,
        name: strategy.name,
      },
      contentMarkdown: await this.options.strategyContentStore.readContent(
        strategy.contentRef,
      ),
    };
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
    parameterBindings: normalizeParameterBindings(input.parameterBindings),
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

function normalizeParameterBindings(value: unknown): StrategyParameterBinding[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new TrafficWorkValidationError(
      "Parameter bindings must be an array.",
    );
  }

  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new TrafficWorkValidationError(
        "Each parameter binding must be an object.",
      );
    }

    const key = normalizeRequiredString(
      (item as StrategyParameterBinding).key,
      "Parameter binding key is required.",
    );
    const type = normalizeRequiredString(
      (item as StrategyParameterBinding).type,
      "Parameter binding type is required.",
    );
    const rawValue = (item as StrategyParameterBinding).value;

    if (typeof rawValue !== "string" && typeof rawValue !== "number") {
      throw new TrafficWorkValidationError(
        "Parameter binding value must be a string-compatible value.",
      );
    }

    return {
      type,
      key,
      value: String(rawValue),
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

function ensureLifecycleStatusNotRunning(
  status: TrafficWorkLifecycleStatus,
): void {
  if (status === "running") {
    throw new TrafficWorkOperationConflictError(
      "Running traffic works cannot be updated.",
    );
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
    parameterBindings: record.parameterBindings.map(cloneParameterBinding),
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

function cloneParameterBinding(
  item: StrategyParameterBinding,
): StrategyParameterBinding {
  return {
    type: item.type,
    key: item.key,
    value: item.value,
  };
}

function renderTrafficWorkTaskMarkdown(
  record: TrafficWorkRecord,
  product: ProductBindingSummary,
  strategy: StrategyBindingSummary,
  productContentMarkdown: string,
  strategyContentMarkdown: string,
): string {
  const objectBindings =
    record.objectBindings.length > 0
      ? record.objectBindings
          .map(
            (item) =>
              `- ${item.objectType}:${item.objectKey} -> ${item.resourceId}${
                item.resourceLabel ? ` (${item.resourceLabel})` : ""
              }`,
            )
          .join("\n")
      : "- none";
  const parameterBindings =
    record.parameterBindings.length > 0
      ? record.parameterBindings
          .map((item) => `- ${item.key} (${item.type}) = ${String(item.value)}`)
          .join("\n")
      : "- none";

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
    `## Strategy Parameter Bindings`,
    parameterBindings,
    ``,
    `## Product Content Snapshot`,
    productContentMarkdown,
    ``,
    `## Strategy Content Snapshot`,
    strategyContentMarkdown,
    ``,
    `## Preparation Goal`,
    `Prepare the stable work-level context and task decomposition input for this traffic work without expanding into task execution internals.`,
    ``,
  ].join("\n");
}

function toPreparationFailureReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Traffic work context preparation failed.";
}
