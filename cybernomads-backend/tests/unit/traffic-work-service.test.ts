import { describe, expect, it } from "vitest";

import { TrafficWorkService } from "../../src/modules/traffic-works/service.js";
import type { ProductMetadataStore } from "../../src/modules/products/types.js";
import type {
  StrategyMetadataStore,
  StrategyRecord,
} from "../../src/modules/strategies/types.js";
import type { StrategyReferenceStore } from "../../src/ports/strategy-reference-store-port.js";
import type { TrafficWorkContextPreparationPort } from "../../src/ports/traffic-work-context-preparation-port.js";
import type { TrafficWorkContextStore } from "../../src/ports/traffic-work-context-store-port.js";
import type { TrafficWorkStateStore } from "../../src/ports/traffic-work-state-store-port.js";
import type {
  TaskSetWriteInput,
  TaskSetWriteResult,
} from "../../src/modules/tasks/types.js";
import type {
  ProductBindingSummary,
  StrategyBindingSummary,
  TrafficWorkContextSnapshot,
  TrafficWorkRecord,
} from "../../src/modules/traffic-works/types.js";

describe("traffic work service", () => {
  it("creates, starts, pauses, updates, ends, archives, and deletes a traffic work", async () => {
    const stateStore = new InMemoryTrafficWorkStateStore();
    const productStore = new InMemoryProductStore([
      {
        productId: "product-1",
        name: "CyberNomads Product",
      },
    ]);
    const strategyStore = new InMemoryStrategyStore([
      {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
      {
        strategyId: "strategy-2",
        name: "Retention Strategy",
      },
    ]);
    const contextStore = new InMemoryTrafficWorkContextStore();
    const contextPreparation = new FakeTrafficWorkContextPreparation();
    const service = new TrafficWorkService({
      stateStore,
      contextStore,
      contextPreparation,
      productStore: productStore.asMetadataStore(),
      productContentStore: productStore.asContentStore(),
      strategyStore,
      strategyContentStore: strategyStore.asContentStore(),
      taskSetPersistence: new FakeTaskSetPersistence(),
      now: createSequentialNow(),
      createTrafficWorkId: () => "work-1",
    });

    const created = await service.createTrafficWork({
      displayName: "Main Growth Work",
      productId: "product-1",
      strategyId: "strategy-1",
      objectBindings: [
        {
          objectType: "account",
          objectKey: "primary-account",
          resourceId: "account-1",
          resourceLabel: "Main Account",
        },
      ],
      parameterBindings: [
        {
          type: "产品",
          key: "product_name",
          value: "CyberNomads",
        },
        {
          type: "账号",
          key: "max_retry",
          value: "3",
        },
      ],
    });

    expect(created.trafficWorkId).toBe("work-1");
    expect(created.lifecycleStatus).toBe("ready");
    expect(created.contextPreparationStatus).toBe("prepared");
    expect(created.product.name).toBe("CyberNomads Product");
    expect(created.strategy.name).toBe("Growth Strategy");
    expect(contextPreparation.inputs).toHaveLength(1);
    expect(contextPreparation.inputs[0]).toMatchObject({
      productContentMarkdown: expect.stringContaining("# CyberNomads Product"),
      strategyContentMarkdown: expect.stringContaining("# Growth Strategy"),
      parameterBindings: [
        {
          type: "产品",
          key: "product_name",
          value: "CyberNomads",
        },
        {
          type: "账号",
          key: "max_retry",
          value: "3",
        },
      ],
    });
    expect(contextStore.snapshots.get("work-1")?.taskMarkdown).toContain(
      "Main Growth Work",
    );

    const started = await service.startTrafficWork("work-1");
    expect(started.lifecycleStatus).toBe("running");
    expect(started.lastStartedAt).not.toBeNull();

    const paused = await service.pauseTrafficWork("work-1");
    expect(paused.lifecycleStatus).toBe("ready");
    expect(paused.contextPreparationStatus).toBe("prepared");

    const updated = await service.updateTrafficWork("work-1", {
      displayName: "Main Growth Work v2",
      productId: "product-1",
      strategyId: "strategy-2",
      objectBindings: [
        {
          objectType: "account",
          objectKey: "primary-account",
          resourceId: "account-2",
          resourceLabel: "Backup Account",
        },
      ],
      parameterBindings: [
        {
          type: "产品",
          key: "product_name",
          value: "CyberNomads v2",
        },
      ],
    });

    expect(updated.trafficWorkId).toBe("work-1");
    expect(updated.displayName).toBe("Main Growth Work v2");
    expect(updated.strategy.name).toBe("Retention Strategy");
    expect(updated.parameterBindings).toEqual([
      {
        type: "产品",
        key: "product_name",
        value: "CyberNomads v2",
      },
    ]);
    expect(updated.contextPreparationStatus).toBe("prepared");
    expect(contextPreparation.inputs).toHaveLength(2);

    const ended = await service.endTrafficWork("work-1");
    expect(ended.lifecycleStatus).toBe("ended");
    expect(ended.endedAt).not.toBeNull();

    const archived = await service.archiveTrafficWork("work-1");
    expect(archived.lifecycleStatus).toBe("archived");
    expect(archived.archivedAt).not.toBeNull();

    const deleted = await service.deleteTrafficWork("work-1");
    expect(deleted.lifecycleStatus).toBe("deleted");
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("records failed context preparation during create and blocks start", async () => {
    const stateStore = new InMemoryTrafficWorkStateStore();
    const productStore = new InMemoryProductStore([
      {
        productId: "product-1",
        name: "CyberNomads Product",
      },
    ]);
    const strategyStore = new InMemoryStrategyStore([
      {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
    ]);
    const service = new TrafficWorkService({
      stateStore,
      contextStore: new InMemoryTrafficWorkContextStore(),
      contextPreparation: new FakeTrafficWorkContextPreparation(async () => {
        throw new Error("Current agent service is not configured.");
      }),
      productStore: productStore.asMetadataStore(),
      productContentStore: productStore.asContentStore(),
      strategyStore,
      strategyContentStore: strategyStore.asContentStore(),
      taskSetPersistence: new FakeTaskSetPersistence(),
      now: createSequentialNow(),
      createTrafficWorkId: () => "work-1",
    });

    const created = await service.createTrafficWork({
      displayName: "Failing Work",
      productId: "product-1",
      strategyId: "strategy-1",
      objectBindings: [
        {
          objectType: "account",
          objectKey: "primary-account",
          resourceId: "account-1",
          resourceLabel: null,
        },
      ],
      parameterBindings: [],
    });

    expect(created.lifecycleStatus).toBe("ready");
    expect(created.contextPreparationStatus).toBe("failed");
    expect(created.contextPreparationStatusReason).toContain("not configured");

    await expect(service.startTrafficWork("work-1")).rejects.toMatchObject({
      code: "TRAFFIC_WORK_OPERATION_NOT_ALLOWED",
    });

    expect(await stateStore.getTrafficWorkById("work-1")).toMatchObject({
      contextPreparationStatus: "failed",
    });
  });

  it("records failed preparation when task set persistence fails", async () => {
    const stateStore = new InMemoryTrafficWorkStateStore();
    const productStore = new InMemoryProductStore([
      {
        productId: "product-1",
        name: "CyberNomads Product",
      },
    ]);
    const strategyStore = new InMemoryStrategyStore([
      {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
    ]);
    const service = new TrafficWorkService({
      stateStore,
      contextStore: new InMemoryTrafficWorkContextStore(),
      contextPreparation: new FakeTrafficWorkContextPreparation(),
      productStore: productStore.asMetadataStore(),
      productContentStore: productStore.asContentStore(),
      strategyStore,
      strategyContentStore: strategyStore.asContentStore(),
      taskSetPersistence: new FakeTaskSetPersistence(async () => {
        throw new Error("Task set is invalid.");
      }),
      now: createSequentialNow(),
      createTrafficWorkId: () => "work-1",
    });

    const created = await service.createTrafficWork({
      displayName: "Failing Work",
      productId: "product-1",
      strategyId: "strategy-1",
      objectBindings: [
        {
          objectType: "account",
          objectKey: "primary-account",
          resourceId: "account-1",
          resourceLabel: null,
        },
      ],
      parameterBindings: [],
    });

    expect(created.lifecycleStatus).toBe("ready");
    expect(created.contextPreparationStatus).toBe("failed");
    expect(created.contextPreparationStatusReason).toContain(
      "Task set is invalid.",
    );
  });

  it("allows creating a traffic work without object bindings", async () => {
    const stateStore = new InMemoryTrafficWorkStateStore();
    const productStore = new InMemoryProductStore([
      {
        productId: "product-1",
        name: "CyberNomads Product",
      },
    ]);
    const strategyStore = new InMemoryStrategyStore([
      {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
    ]);
    const contextStore = new InMemoryTrafficWorkContextStore();
    const contextPreparation = new FakeTrafficWorkContextPreparation();
    const service = new TrafficWorkService({
      stateStore,
      contextStore,
      contextPreparation,
      productStore: productStore.asMetadataStore(),
      productContentStore: productStore.asContentStore(),
      strategyStore,
      strategyContentStore: strategyStore.asContentStore(),
      taskSetPersistence: new FakeTaskSetPersistence(),
      now: createSequentialNow(),
      createTrafficWorkId: () => "work-1",
    });

    const created = await service.createTrafficWork({
      displayName: "Unbound Work",
      productId: "product-1",
      strategyId: "strategy-1",
      objectBindings: [],
      parameterBindings: [
        {
          type: "产品",
          key: "product_name",
          value: "",
        },
      ],
    });

    expect(created.trafficWorkId).toBe("work-1");
    expect(created.objectBindings).toEqual([]);
    expect(created.parameterBindings).toEqual([
      {
        type: "产品",
        key: "product_name",
        value: "",
      },
    ]);
    expect(created.contextPreparationStatus).toBe("prepared");
    expect(contextPreparation.inputs[0]).toMatchObject({
      objectBindings: [],
    });
    expect(contextStore.snapshots.get("work-1")?.taskMarkdown).toContain(
      "## Object Bindings\n- none",
    );
  });
});

class InMemoryTrafficWorkStateStore implements TrafficWorkStateStore {
  private readonly records = new Map<string, TrafficWorkRecord>();

  async createTrafficWork(record: TrafficWorkRecord): Promise<void> {
    this.records.set(record.trafficWorkId, cloneTrafficWorkRecord(record));
  }

  async saveTrafficWork(record: TrafficWorkRecord): Promise<void> {
    this.records.set(record.trafficWorkId, cloneTrafficWorkRecord(record));
  }

  async getTrafficWorkById(
    trafficWorkId: string,
  ): Promise<TrafficWorkRecord | undefined> {
    const record = this.records.get(trafficWorkId);
    return record ? cloneTrafficWorkRecord(record) : undefined;
  }

  async listTrafficWorks(): Promise<TrafficWorkRecord[]> {
    return Array.from(this.records.values()).map(cloneTrafficWorkRecord);
  }

  close(): void {}
}

class InMemoryTrafficWorkContextStore implements TrafficWorkContextStore {
  readonly snapshots = new Map<string, TrafficWorkContextSnapshot>();

  async writeTaskContext(
    trafficWorkId: string,
    taskMarkdown: string,
  ): Promise<TrafficWorkContextSnapshot> {
    const snapshot: TrafficWorkContextSnapshot = {
      workDirectory: `/tmp/${trafficWorkId}`,
      taskFilePath: `/tmp/${trafficWorkId}/task.md`,
      taskMarkdown,
    };
    this.snapshots.set(trafficWorkId, snapshot);
    return structuredClone(snapshot);
  }
}

class FakeTrafficWorkContextPreparation implements TrafficWorkContextPreparationPort {
  readonly inputs = new Array<unknown>();

  constructor(
    private readonly handler: TrafficWorkContextPreparationPort["prepareContext"] = async () =>
      createTaskSetWriteInput("agent-task"),
  ) {}

  async prepareContext(
    input: Parameters<TrafficWorkContextPreparationPort["prepareContext"]>[0],
  ): ReturnType<TrafficWorkContextPreparationPort["prepareContext"]> {
    this.inputs.push(structuredClone(input));
    return this.handler(input);
  }
}

class InMemoryProductStore {
  private readonly products = new Map<string, ProductBindingSummary>();

  constructor(products: ProductBindingSummary[]) {
    for (const product of products) {
      this.products.set(product.productId, structuredClone(product));
    }
  }

  asMetadataStore(): ProductMetadataStore {
    return {
      createProduct: async () => {},
      updateProduct: async () => {},
      getProductById: async (productId) => {
        const product = this.products.get(productId);
        if (!product) {
          return undefined;
        }

        return {
          productId: product.productId,
          name: product.name,
          contentRef: `${product.productId}.md`,
          createdAt: "2026-04-21T08:00:00.000Z",
          updatedAt: "2026-04-21T08:00:00.000Z",
        };
      },
      listProducts: async () => [],
      deleteProduct: async () => {},
      close: () => {},
    };
  }

  asContentStore() {
    return {
      writeContent: async () => {},
      readContent: async (contentRef: string) => {
        const productId = contentRef.replace(/\.md$/, "");
        const product = this.products.get(productId);
        if (!product) {
          throw new Error(`Product content "${contentRef}" was not found.`);
        }

        return `# ${product.name}\n\nProduct body.`;
      },
      deleteContent: async () => {},
    };
  }
}

class InMemoryStrategyStore
  implements StrategyReferenceStore, StrategyMetadataStore
{
  private readonly strategies = new Map<string, StrategyBindingSummary>();

  constructor(strategies: StrategyBindingSummary[]) {
    for (const strategy of strategies) {
      this.strategies.set(strategy.strategyId, structuredClone(strategy));
    }
  }

  async getStrategyReferenceById(
    strategyId: string,
  ): Promise<StrategyBindingSummary | undefined> {
    const strategy = this.strategies.get(strategyId);
    return strategy ? structuredClone(strategy) : undefined;
  }

  async createStrategy(_record: StrategyRecord): Promise<void> {
    void _record;
  }

  async updateStrategy(
    _strategyId: string,
    _updates: Pick<StrategyRecord, "name" | "summary" | "tags" | "updatedAt">,
  ): Promise<void> {
    void _strategyId;
    void _updates;
  }

  async getStrategyById(
    strategyId: string,
  ): Promise<StrategyRecord | undefined> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return undefined;
    }

    return {
      strategyId: strategy.strategyId,
      name: strategy.name,
      summary: `${strategy.name} summary`,
      tags: [],
      contentRef: `${strategy.strategyId}.md`,
      createdAt: "2026-04-21T08:00:00.000Z",
      updatedAt: "2026-04-21T08:00:00.000Z",
    };
  }

  async listStrategies(): Promise<[]> {
    return [];
  }

  async deleteStrategy(_strategyId: string): Promise<void> {
    void _strategyId;
  }

  close(): void {}

  asContentStore() {
    return {
      writeContent: async () => {},
      readContent: async (contentRef: string) => {
        const strategyId = contentRef.replace(/\.md$/, "");
        const strategy = this.strategies.get(strategyId);
        if (!strategy) {
          throw new Error(`Strategy content "${contentRef}" was not found.`);
        }

        return `# ${strategy.name}\n\nStrategy body.`;
      },
      deleteContent: async () => {},
    };
  }
}

class FakeTaskSetPersistence {
  readonly createInputs: TaskSetWriteInput[] = [];
  readonly replaceInputs: TaskSetWriteInput[] = [];

  constructor(
    private readonly handler: (
      input: TaskSetWriteInput,
    ) => Promise<void> = async () => {},
  ) {}

  async createTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ): Promise<TaskSetWriteResult> {
    this.createInputs.push(structuredClone(input));
    await this.handler(input);
    return toTaskSetWriteResult(trafficWorkId, input);
  }

  async replaceTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ): Promise<TaskSetWriteResult> {
    this.replaceInputs.push(structuredClone(input));
    await this.handler(input);
    return toTaskSetWriteResult(trafficWorkId, input);
  }
}

function createTaskSetWriteInput(taskKey: string): TaskSetWriteInput {
  return {
    source: {
      kind: "agent-decomposition",
    },
    tasks: [
      {
        taskKey,
        name: "Collect candidates",
        instruction: "Collect candidate data.",
        documentRef: `${taskKey}.md`,
        contextRef: `work/work-1/${taskKey}`,
        condition: {
          cron: null,
          relyOnTaskKeys: [],
        },
        inputNeeds: [
          {
            name: "work-context",
            description: "Use the prepared traffic work context.",
            source: "work-context",
          },
        ],
      },
    ],
  };
}

function toTaskSetWriteResult(
  trafficWorkId: string,
  input: TaskSetWriteInput,
): TaskSetWriteResult {
  return {
    trafficWorkId,
    taskCount: input.tasks.length,
    tasks: input.tasks.map((task, index) => ({
      taskKey: task.taskKey,
      taskId: `task-${index + 1}`,
    })),
  };
}

function cloneTrafficWorkRecord(record: TrafficWorkRecord): TrafficWorkRecord {
  return structuredClone(record);
}

function createSequentialNow(): () => Date {
  let tick = 0;

  return () => {
    const date = new Date(Date.UTC(2026, 3, 21, 8, 0, tick));
    tick += 1;
    return date;
  };
}
