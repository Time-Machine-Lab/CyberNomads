import { describe, expect, it } from "vitest";

import {
  deriveTaskDecompositionCenterActions,
  deriveTaskDecompositionProgress,
  TaskDecompositionRunService,
} from "../../src/modules/task-decomposition-runs/service.js";
import type { TaskService } from "../../src/modules/tasks/service.js";
import type { TaskSetWriteInput } from "../../src/modules/tasks/types.js";
import type {
  ReviewReport,
  TaskPlanDraft,
} from "../../src/modules/cybernomads-agent-runtime/types.js";
import type {
  TaskDecompositionArtifactRecord,
  TaskDecompositionArtifactType,
  TaskDecompositionRunRecord,
} from "../../src/modules/task-decomposition-runs/types.js";
import type { TrafficWorkRecord } from "../../src/modules/traffic-works/types.js";
import type { TaskDecompositionArchiveStorePort } from "../../src/ports/task-decomposition-archive-store-port.js";
import type { TaskDecompositionRunStorePort } from "../../src/ports/task-decomposition-run-store-port.js";

describe("task decomposition run service", () => {
  it("derives display progress for every decomposition stage", () => {
    const updatedAt = "2026-05-20T08:00:00.000Z";

    expect(
      [
        ["context_ready", "running"],
        ["planning", "running"],
        ["reviewing", "running"],
        ["repairing", "running"],
        ["reporting", "running"],
        ["waiting_user_confirmation", "waiting_user_confirmation"],
        ["committing", "running"],
        ["prepared", "committed"],
        ["failed", "failed"],
      ].map(([stage, status]) =>
        deriveTaskDecompositionProgress({
          stage: stage as TaskDecompositionRunRecord["stage"],
          status: status as TaskDecompositionRunRecord["status"],
          updatedAt,
        }),
      ),
    ).toEqual([
      expect.objectContaining({ percent: 10, label: "Context ready" }),
      expect.objectContaining({ percent: 30, label: "Planning" }),
      expect.objectContaining({ percent: 55, label: "Reviewing" }),
      expect.objectContaining({ percent: 70, label: "Repairing" }),
      expect.objectContaining({ percent: 85, label: "Reporting" }),
      expect.objectContaining({
        percent: 90,
        label: "Waiting for confirmation",
      }),
      expect.objectContaining({ percent: 95, label: "Committing" }),
      expect.objectContaining({ percent: 100, label: "Prepared" }),
      expect.objectContaining({ percent: 100, label: "Failed" }),
    ]);
  });

  it("derives center actions from run status", () => {
    expect(
      deriveTaskDecompositionCenterActions({
        status: "running",
      }),
    ).toEqual({
      confirmPlan: false,
      submitFeedback: false,
      enterExecution: false,
      inspectFailure: false,
    });
    expect(
      deriveTaskDecompositionCenterActions({
        status: "waiting_user_confirmation",
      }),
    ).toEqual({
      confirmPlan: true,
      submitFeedback: true,
      enterExecution: false,
      inspectFailure: false,
    });
    expect(
      deriveTaskDecompositionCenterActions({
        status: "committed",
      }),
    ).toEqual({
      confirmPlan: false,
      submitFeedback: false,
      enterExecution: true,
      inspectFailure: false,
    });
    expect(
      deriveTaskDecompositionCenterActions({
        status: "failed",
      }),
    ).toEqual({
      confirmPlan: false,
      submitFeedback: true,
      enterExecution: false,
      inspectFailure: true,
    });
  });

  it("stages drafts and does not write formal tasks before user confirmation", async () => {
    const runStore = new InMemoryTaskDecompositionRunStore();
    const trafficWorkStore = new InMemoryTrafficWorkStore();
    const taskService = new FakeTaskService();
    const service = new TaskDecompositionRunService({
      runStore,
      trafficWorkStateStore: trafficWorkStore,
      taskService: taskService as unknown as Pick<
        TaskService,
        "createTaskSetForTrafficWork" | "replaceTaskSetForTrafficWork"
      >,
      runtime: new FakeRuntime() as never,
      archiveStore: new InMemoryArchiveStore(),
      now: createSequentialNow(),
      createRunId: () => "run-1",
      createArtifactId: createSequentialId("artifact"),
    });

    const staged = await service.startRun({
      trafficWorkId: "work-1",
      displayName: "Main Growth Work",
      contextMarkdown: "# Context",
      taskSetMode: "create",
    });

    expect(staged.status).toBe("waiting_user_confirmation");
    expect(staged.requiresUserConfirmation).toBe(true);
    expect(taskService.createCalls).toEqual([]);
    expect(
      trafficWorkStore.records.get("work-1")?.contextPreparationStatus,
    ).toBe("pending");

    const confirmed = await service.confirmCurrentRun("work-1");

    expect(confirmed.status).toBe("committed");
    expect(taskService.createCalls).toHaveLength(1);
    expect(taskService.createCalls[0]).toMatchObject({
      trafficWorkId: "work-1",
      input: {
        source: {
          kind: "agent-decomposition",
          requestId: "run-1",
        },
      },
    });
    expect(taskService.createCalls[0]?.input.tasks[0]).toMatchObject({
      taskKey: "collect",
      documentRef: "./collect.md",
      condition: {
        relyOnTaskKeys: [],
      },
    });
    expect(trafficWorkStore.records.get("work-1")).toMatchObject({
      contextPreparationStatus: "prepared",
      contextPreparationStatusReason:
        "Task decomposition confirmed and formal tasks committed.",
    });
  });

  it("repairs fixable review issues before waiting for confirmation", async () => {
    const service = new TaskDecompositionRunService({
      runStore: new InMemoryTaskDecompositionRunStore(),
      trafficWorkStateStore: new InMemoryTrafficWorkStore(),
      taskService: new FakeTaskService() as unknown as Pick<
        TaskService,
        "createTaskSetForTrafficWork" | "replaceTaskSetForTrafficWork"
      >,
      runtime: new FakeRuntime({
        reviewReports: [
          {
            conclusion: "fix_required",
            summary: "Needs input source detail.",
            issues: [
              {
                category: "input_source",
                severity: "error",
                message: "Input source acquisition is unclear.",
                repairable: true,
              },
            ],
          },
          createPassingReview(),
        ],
      }) as never,
      archiveStore: new InMemoryArchiveStore(),
      now: createSequentialNow(),
      createRunId: () => "run-1",
      createArtifactId: createSequentialId("artifact"),
    });

    const run = await service.startRun({
      trafficWorkId: "work-1",
      displayName: "Main Growth Work",
      contextMarkdown: "# Context",
      taskSetMode: "create",
    });

    expect(run.status).toBe("waiting_user_confirmation");
    expect(run.artifacts.map((artifact) => artifact.artifactType)).toContain(
      "repair_history",
    );
  });

  it("projects draft nodes and dependency edges without exposing execution prompts", async () => {
    const service = new TaskDecompositionRunService({
      runStore: new InMemoryTaskDecompositionRunStore(),
      trafficWorkStateStore: new InMemoryTrafficWorkStore(),
      taskService: new FakeTaskService() as unknown as Pick<
        TaskService,
        "createTaskSetForTrafficWork" | "replaceTaskSetForTrafficWork"
      >,
      runtime: new FakeRuntime({
        draft: createDependentDraft(),
      }) as never,
      archiveStore: new InMemoryArchiveStore(),
      now: createSequentialNow(),
      createRunId: () => "run-1",
      createArtifactId: createSequentialId("artifact"),
    });

    await service.startRun({
      trafficWorkId: "work-1",
      displayName: "Main Growth Work",
      contextMarkdown: "# Context",
      taskSetMode: "create",
    });

    const centerView = await service.getCurrentCenterView("work-1");

    expect(centerView.progress).toMatchObject({
      percent: 90,
      label: "Waiting for confirmation",
    });
    expect(centerView.draftGraph.nodes).toHaveLength(2);
    expect(centerView.draftGraph.nodes[1]).toMatchObject({
      taskKey: "publish",
      dependsOn: ["collect"],
      expectedOutputs: ["Published response log"],
    });
    expect(centerView.draftGraph.edges).toEqual([
      {
        edgeId: "collect->publish",
        sourceTaskKey: "collect",
        targetTaskKey: "publish",
        relation: "depends_on",
      },
    ]);
    expect(centerView.draftGraph.nodes[1]).not.toHaveProperty("inputPrompt");
    expect(centerView.draftGraph.nodes[1]).not.toHaveProperty("instruction");
  });
});

class FakeRuntime {
  private reviewIndex = 0;

  constructor(
    private readonly options: {
      reviewReports?: ReviewReport[];
      draft?: TaskPlanDraft;
      repairedDraft?: TaskPlanDraft;
    } = {},
  ) {}

  async buildSkillRegistrySummary(): Promise<string> {
    return "- cybernomads-task-execution: execute confirmed tasks";
  }

  async buildToolRegistrySummary(): Promise<string> {
    return "- readTrafficWorkContext [read_only]";
  }

  async planTasks() {
    const draft = this.options.draft ?? createDraft();
    return {
      stage: "planning",
      providerCode: "cybernomads-agent",
      model: "gpt-5.5",
      outputText: JSON.stringify(draft),
      output: draft,
    };
  }

  async reviewDraft() {
    const report =
      this.options.reviewReports?.[this.reviewIndex] ?? createPassingReview();
    this.reviewIndex += 1;
    return {
      stage: "review",
      providerCode: "cybernomads-agent",
      model: "gpt-5.5",
      outputText: JSON.stringify(report),
      output: report,
    };
  }

  async repairDraft() {
    const revisedDraft =
      this.options.repairedDraft ??
      createDraft({
        summary: "Repaired draft.",
      });
    return {
      stage: "repair",
      providerCode: "cybernomads-agent",
      model: "gpt-5.5",
      outputText: JSON.stringify({
        summary: "Added input source detail.",
        revisedDraft,
      }),
      output: {
        summary: "Added input source detail.",
        revisedDraft,
      },
    };
  }

  async renderReport() {
    return {
      stage: "report",
      providerCode: "backend-renderer",
      model: null,
      outputText: "{}",
      output: {
        summary: "Review passed.",
        markdown: "# Report\n\nReady for confirmation.",
      },
    };
  }
}

class FakeTaskService {
  readonly createCalls: Array<{
    trafficWorkId: string;
    input: TaskSetWriteInput;
  }> = [];
  readonly replaceCalls: Array<{
    trafficWorkId: string;
    input: TaskSetWriteInput;
  }> = [];

  async createTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ) {
    this.createCalls.push({ trafficWorkId, input });
    return {
      trafficWorkId,
      taskCount: input.tasks.length,
      tasks: input.tasks.map((task, index) => ({
        taskKey: task.taskKey,
        taskId: `task-${index + 1}`,
      })),
    };
  }

  async replaceTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ) {
    this.replaceCalls.push({ trafficWorkId, input });
    return {
      trafficWorkId,
      taskCount: input.tasks.length,
      tasks: input.tasks.map((task, index) => ({
        taskKey: task.taskKey,
        taskId: `task-${index + 1}`,
      })),
    };
  }
}

class InMemoryTrafficWorkStore {
  readonly records = new Map<string, TrafficWorkRecord>([
    [
      "work-1",
      {
        trafficWorkId: "work-1",
        displayName: "Main Growth Work",
        productId: "product-1",
        strategyId: "strategy-1",
        objectBindings: [],
        lifecycleStatus: "ready",
        lifecycleStatusReason: null,
        contextPreparationStatus: "pending",
        contextPreparationStatusReason: null,
        contextPreparedAt: null,
        lastStartedAt: null,
        endedAt: null,
        archivedAt: null,
        deletedAt: null,
        createdAt: "2026-05-20T08:00:00.000Z",
        updatedAt: "2026-05-20T08:00:00.000Z",
      },
    ],
  ]);

  async getTrafficWorkById(
    trafficWorkId: string,
  ): Promise<TrafficWorkRecord | undefined> {
    const record = this.records.get(trafficWorkId);
    return record ? structuredClone(record) : undefined;
  }

  async saveTrafficWork(record: TrafficWorkRecord): Promise<void> {
    this.records.set(record.trafficWorkId, structuredClone(record));
  }
}

class InMemoryTaskDecompositionRunStore implements TaskDecompositionRunStorePort {
  private readonly runs = new Map<string, TaskDecompositionRunRecord>();
  private readonly artifacts = new Map<
    string,
    TaskDecompositionArtifactRecord
  >();

  async createRun(record: TaskDecompositionRunRecord): Promise<void> {
    this.runs.set(record.decompositionRunId, structuredClone(record));
  }

  async saveRun(record: TaskDecompositionRunRecord): Promise<void> {
    this.runs.set(record.decompositionRunId, structuredClone(record));
  }

  async getRunById(
    decompositionRunId: string,
  ): Promise<TaskDecompositionRunRecord | undefined> {
    const run = this.runs.get(decompositionRunId);
    return run ? structuredClone(run) : undefined;
  }

  async getLatestRunByTrafficWorkId(
    trafficWorkId: string,
  ): Promise<TaskDecompositionRunRecord | undefined> {
    return Array.from(this.runs.values())
      .filter((run) => run.trafficWorkId === trafficWorkId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((run) => structuredClone(run))[0];
  }

  async createArtifact(record: TaskDecompositionArtifactRecord): Promise<void> {
    this.artifacts.set(record.artifactId, structuredClone(record));
  }

  async getArtifactById(
    artifactId: string,
  ): Promise<TaskDecompositionArtifactRecord | undefined> {
    const artifact = this.artifacts.get(artifactId);
    return artifact ? structuredClone(artifact) : undefined;
  }

  async getLatestArtifact(
    trafficWorkId: string,
    artifactType: TaskDecompositionArtifactType,
  ): Promise<TaskDecompositionArtifactRecord | undefined> {
    return Array.from(this.artifacts.values())
      .filter(
        (artifact) =>
          artifact.trafficWorkId === trafficWorkId &&
          artifact.artifactType === artifactType,
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((artifact) => structuredClone(artifact))[0];
  }

  async listArtifactsForRun(
    decompositionRunId: string,
  ): Promise<TaskDecompositionArtifactRecord[]> {
    return Array.from(this.artifacts.values())
      .filter((artifact) => artifact.decompositionRunId === decompositionRunId)
      .map((artifact) => structuredClone(artifact));
  }

  close(): void {}
}

class InMemoryArchiveStore implements TaskDecompositionArchiveStorePort {
  async writeTaskDocument(input: {
    trafficWorkId: string;
    documentRef: string;
    content: string;
  }): Promise<string> {
    return `${input.trafficWorkId}:${input.documentRef}`;
  }

  async writeRunArtifact(input: {
    trafficWorkId: string;
    decompositionRunId: string;
    fileName: string;
    content: string;
  }): Promise<string> {
    return `${input.trafficWorkId}:${input.decompositionRunId}:${input.fileName}`;
  }
}

function createDraft(overrides: Partial<TaskPlanDraft> = {}): TaskPlanDraft {
  return {
    summary: "Drafted one task.",
    strategyCoverageSummary: "Covers the growth strategy.",
    tasks: [
      {
        taskKey: "collect",
        name: "Collect candidates",
        goal: "Collect candidate traffic targets.",
        expectedOutputs: ["Candidate target list"],
        inputSources: [
          {
            type: "product_content",
            description: "Product value proposition.",
            acquisition: "Read product context snapshot.",
            missingBehavior: "blocking",
          },
        ],
        dependsOn: [],
        resourceNeeds: ["bilibili-web-api skill"],
        strategyCoverage: ["awareness"],
        skillRefs: ["cybernomads-task-execution"],
        instruction: "Collect candidate traffic targets.",
        documentRef: "./collect.md",
        contextRef: "./",
        condition: {
          cron: null,
          relyOnTaskKeys: [],
        },
        inputPrompt: "Read product context before execution.",
      },
    ],
    feedbackConsideration: null,
    ...overrides,
  };
}

function createDependentDraft(): TaskPlanDraft {
  const draft = createDraft({
    summary: "Drafted dependent tasks.",
  });

  return {
    ...draft,
    tasks: [
      draft.tasks[0],
      {
        taskKey: "publish",
        name: "Publish outreach",
        goal: "Publish outreach based on collected candidates.",
        expectedOutputs: ["Published response log"],
        inputSources: [
          {
            type: "upstream_task",
            description: "Candidate list from collection.",
            acquisition: "Read the collect task output.",
            missingBehavior: "blocking",
            sourceTaskKey: "collect",
          },
        ],
        dependsOn: ["collect"],
        resourceNeeds: ["bilibili-web-api skill"],
        strategyCoverage: ["activation"],
        skillRefs: ["cybernomads-task-execution"],
        instruction: "Publish outreach based on the candidate list.",
        documentRef: "./publish.md",
        contextRef: "./",
        condition: {
          cron: null,
          relyOnTaskKeys: ["collect"],
        },
        inputPrompt: "Use the collect task output as the candidate source.",
      },
    ],
  };
}

function createPassingReview(): ReviewReport {
  return {
    conclusion: "pass",
    summary: "Review passed.",
    issues: [],
  };
}

function createSequentialNow(): () => Date {
  let tick = 0;

  return () => {
    const date = new Date(Date.UTC(2026, 4, 20, 8, 0, tick));
    tick += 1;
    return date;
  };
}

function createSequentialId(prefix: string): () => string {
  let tick = 0;

  return () => {
    tick += 1;
    return `${prefix}-${tick}`;
  };
}
