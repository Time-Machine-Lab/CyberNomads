import { randomUUID } from "node:crypto";

import type { CybernomadsAgentRuntimeService } from "../cybernomads-agent-runtime/service.js";
import type {
  RepairResult,
  ReviewReport,
  TaskPlanDraft,
} from "../cybernomads-agent-runtime/types.js";
import type { TaskService } from "../tasks/service.js";
import type { TaskSetWriteInput } from "../tasks/types.js";
import type { TrafficWorkStateStore } from "../../ports/traffic-work-state-store-port.js";
import type { TaskDecompositionArchiveStorePort } from "../../ports/task-decomposition-archive-store-port.js";
import type { TaskDecompositionRunStorePort } from "../../ports/task-decomposition-run-store-port.js";
import {
  recordAgentInteractionEvent,
  type AgentInteractionLogRecorderPort,
} from "../../ports/agent-interaction-log-recorder-port.js";
import {
  TaskDecompositionRunNotFoundError,
  TaskDecompositionRunOperationConflictError,
  TaskDecompositionRunValidationError,
} from "./errors.js";
import type {
  ConfirmedTaskSetSnapshot,
  StartTaskDecompositionRunInput,
  TaskDecompositionArtifactRecord,
  TaskDecompositionArtifactSummary,
  TaskDecompositionFeedbackInput,
  TaskDecompositionReportView,
  TaskDecompositionRunDetail,
  TaskDecompositionRunRecord,
} from "./types.js";

const DEFAULT_MAX_REPAIR_ATTEMPTS = 2;

export interface TaskDecompositionRunServiceOptions {
  runStore: TaskDecompositionRunStorePort;
  trafficWorkStateStore: Pick<
    TrafficWorkStateStore,
    "getTrafficWorkById" | "saveTrafficWork"
  >;
  taskService: Pick<
    TaskService,
    "createTaskSetForTrafficWork" | "replaceTaskSetForTrafficWork"
  >;
  runtime: CybernomadsAgentRuntimeService;
  archiveStore: TaskDecompositionArchiveStorePort;
  agentInteractionLogRecorder?: AgentInteractionLogRecorderPort;
  now?: () => Date;
  createRunId?: () => string;
  createArtifactId?: () => string;
}

export class TaskDecompositionRunService {
  private readonly now: () => Date;
  private readonly createRunId: () => string;
  private readonly createArtifactId: () => string;

  constructor(private readonly options: TaskDecompositionRunServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.createRunId = options.createRunId ?? (() => randomUUID());
    this.createArtifactId = options.createArtifactId ?? (() => randomUUID());
  }

  async startRun(
    input: StartTaskDecompositionRunInput,
  ): Promise<TaskDecompositionRunDetail> {
    const timestamp = this.now().toISOString();
    let run: TaskDecompositionRunRecord = {
      decompositionRunId: this.createRunId(),
      trafficWorkId: normalizeRequiredString(
        input.trafficWorkId,
        "Traffic work ID is required.",
      ),
      status: "running",
      stage: "context_ready",
      taskSetMode: input.taskSetMode,
      providerCode: "cybernomads-agent",
      model: null,
      latestSummary: null,
      reviewConclusion: null,
      repairAttempts: 0,
      maxRepairAttempts: DEFAULT_MAX_REPAIR_ATTEMPTS,
      draftArtifactId: null,
      reviewArtifactId: null,
      reportArtifactId: null,
      confirmationSnapshotArtifactId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };

    await this.options.runStore.createRun(run);

    try {
      const skillRegistrySummary =
        await this.options.runtime.buildSkillRegistrySummary();
      const toolRegistrySummary =
        await this.options.runtime.buildToolRegistrySummary();
      run = await this.saveRun({
        ...run,
        stage: "planning",
      });
      const planning = await this.options.runtime.planTasks({
        trafficWorkId: run.trafficWorkId,
        displayName: input.displayName,
        contextMarkdown: input.contextMarkdown,
        skillRegistrySummary,
        toolRegistrySummary,
        priorArtifactsSummary: input.priorArtifactsSummary ?? null,
      });
      run = await this.saveDraft(run, planning.output, {
        providerCode: planning.providerCode,
        model: planning.model,
      });

      const repairSummaries: string[] = [];
      let draft = planning.output;
      let reviewReport: ReviewReport | null = null;

      while (run.repairAttempts <= run.maxRepairAttempts) {
        run = await this.saveRun({
          ...run,
          stage: "reviewing",
        });
        const review = await this.options.runtime.reviewDraft({
          trafficWorkId: run.trafficWorkId,
          draft,
        });
        reviewReport = review.output;
        run = await this.saveReview(run, reviewReport);

        if (reviewReport.conclusion === "pass") {
          run = await this.writeReport(run, draft, reviewReport, repairSummaries);
          return this.toDetail(run);
        }

        if (
          reviewReport.conclusion === "failed" ||
          run.repairAttempts >= run.maxRepairAttempts ||
          !reviewReport.issues.some((issue) => issue.repairable)
        ) {
          return this.toDetail(
            await this.saveRun({
              ...run,
              status: "failed",
              stage: "failed",
              latestSummary: reviewReport.summary,
              updatedAt: this.now().toISOString(),
              completedAt: this.now().toISOString(),
            }),
          );
        }

        run = await this.saveRun({
          ...run,
          stage: "repairing",
          repairAttempts: run.repairAttempts + 1,
        });
        const repair = await this.options.runtime.repairDraft({
          trafficWorkId: run.trafficWorkId,
          draft,
          reviewReport,
          attempt: run.repairAttempts,
        });
        draft = repair.output.revisedDraft;
        repairSummaries.push(repair.output.summary);
        run = await this.saveRepair(run, repair.output);
        run = await this.saveDraft(run, draft, {
          providerCode: repair.providerCode,
          model: repair.model,
        });
      }

      return this.toDetail(
        await this.saveRun({
          ...run,
          status: "failed",
          stage: "failed",
          latestSummary: "Repair attempts exhausted.",
          updatedAt: this.now().toISOString(),
          completedAt: this.now().toISOString(),
        }),
      );
    } catch (error) {
      return this.toDetail(
        await this.saveRun({
          ...run,
          status: "failed",
          stage: "failed",
          latestSummary: toErrorMessage(error),
          updatedAt: this.now().toISOString(),
          completedAt: this.now().toISOString(),
        }),
      );
    }
  }

  async getCurrentRunDetail(
    trafficWorkId: string,
  ): Promise<TaskDecompositionRunDetail> {
    return this.toDetail(await this.getLatestRun(trafficWorkId));
  }

  async getCurrentReport(
    trafficWorkId: string,
  ): Promise<TaskDecompositionReportView> {
    const run = await this.getLatestRun(trafficWorkId);

    if (!run.reportArtifactId) {
      throw new TaskDecompositionRunNotFoundError(trafficWorkId);
    }

    const artifact = await this.options.runStore.getArtifactById(
      run.reportArtifactId,
    );

    if (!artifact?.contentMarkdown) {
      throw new TaskDecompositionRunNotFoundError(trafficWorkId);
    }

    return {
      decompositionRunId: run.decompositionRunId,
      trafficWorkId: run.trafficWorkId,
      markdown: artifact.contentMarkdown,
    };
  }

  async confirmCurrentRun(
    trafficWorkId: string,
  ): Promise<TaskDecompositionRunDetail> {
    const run = await this.getLatestRun(trafficWorkId);

    if (run.status !== "waiting_user_confirmation" || !run.draftArtifactId) {
      throw new TaskDecompositionRunOperationConflictError(
        "Only a decomposition run waiting for user confirmation can be confirmed.",
      );
    }

    const draft = await this.readDraftArtifact(run.draftArtifactId);
    const confirmedAt = this.now().toISOString();
    const snapshot: ConfirmedTaskSetSnapshot = {
      sourceDraft: draft,
      confirmedAt,
    };
    const snapshotArtifact = await this.createArtifact({
      run,
      artifactType: "confirmation_snapshot",
      summary: `Confirmed ${draft.tasks.length} tasks.`,
      contentJson: snapshot,
      contentMarkdown: null,
    });
    const committingRun = await this.saveRun({
      ...run,
      status: "running",
      stage: "committing",
      confirmationSnapshotArtifactId: snapshotArtifact.artifactId,
    });
    const taskSet = toTaskSetWriteInput(draft, committingRun);

    if (committingRun.taskSetMode === "create") {
      await this.options.taskService.createTaskSetForTrafficWork(
        committingRun.trafficWorkId,
        taskSet,
      );
    } else {
      await this.options.taskService.replaceTaskSetForTrafficWork(
        committingRun.trafficWorkId,
        taskSet,
      );
    }

    await this.archiveConfirmedDraft(committingRun, draft);
    await this.markTrafficWorkPrepared(committingRun.trafficWorkId, confirmedAt);
    const preparedRun = await this.saveRun({
      ...committingRun,
      status: "committed",
      stage: "prepared",
      latestSummary: `Committed ${draft.tasks.length} confirmed tasks.`,
      updatedAt: confirmedAt,
      completedAt: confirmedAt,
    });
    recordAgentInteractionEvent(this.options.agentInteractionLogRecorder, {
      scope: {
        kind: "traffic-work",
        trafficWorkId: preparedRun.trafficWorkId,
      },
      eventType: "decomposition-run-confirmed",
      occurredAt: confirmedAt,
      summary: "User confirmed the Cybernomads Agent task plan and the backend committed formal tasks.",
      correlation: {
        trafficWorkId: preparedRun.trafficWorkId,
        decompositionRunId: preparedRun.decompositionRunId,
        taskSetMode: preparedRun.taskSetMode,
      },
      output: {
        taskCount: draft.tasks.length,
      },
    });

    return this.toDetail(preparedRun);
  }

  async replanWithFeedback(
    trafficWorkId: string,
    input: TaskDecompositionFeedbackInput,
  ): Promise<TaskDecompositionRunDetail> {
    const feedback = normalizeRequiredString(input.feedback, "Feedback is required.");
    const previousRun = await this.getLatestRun(trafficWorkId);
    await this.createArtifact({
      run: previousRun,
      artifactType: "user_feedback",
      summary: input.taskKey
        ? `Feedback for task ${input.taskKey}.`
        : "Feedback for the whole task plan.",
      contentJson: {
        feedback,
        taskKey: normalizeOptionalString(input.taskKey),
      },
      contentMarkdown: feedback,
    });

    const trafficWork =
      await this.options.trafficWorkStateStore.getTrafficWorkById(trafficWorkId);

    if (!trafficWork) {
      throw new TaskDecompositionRunNotFoundError(trafficWorkId);
    }

    return this.startRun({
      trafficWorkId,
      displayName: trafficWork.displayName,
      taskSetMode: "replace",
      contextMarkdown: JSON.stringify(trafficWork, null, 2),
      priorArtifactsSummary: await this.buildPriorArtifactsSummary(previousRun),
    });
  }

  async recordExecutionFailure(input: {
    trafficWorkId: string;
    taskId: string;
    reason: string;
  }): Promise<void> {
    const run = await this.options.runStore.getLatestRunByTrafficWorkId(
      input.trafficWorkId,
    );

    if (!run) {
      return;
    }

    await this.createArtifact({
      run,
      artifactType: "execution_feedback",
      summary: `Execution failure from task ${input.taskId}.`,
      contentJson: {
        taskId: input.taskId,
        reason: input.reason,
      },
      contentMarkdown: input.reason,
    });
  }

  close(): void {
    this.options.runStore.close();
  }

  private async saveDraft(
    run: TaskDecompositionRunRecord,
    draft: TaskPlanDraft,
    provider: {
      providerCode: string;
      model: string | null;
    },
  ): Promise<TaskDecompositionRunRecord> {
    const artifact = await this.createArtifact({
      run,
      artifactType: "task_plan_draft",
      summary: draft.summary,
      contentJson: draft,
      contentMarkdown: null,
    });

    return this.saveRun({
      ...run,
      providerCode: provider.providerCode,
      model: provider.model,
      latestSummary: draft.summary,
      draftArtifactId: artifact.artifactId,
    });
  }

  private async saveReview(
    run: TaskDecompositionRunRecord,
    reviewReport: ReviewReport,
  ): Promise<TaskDecompositionRunRecord> {
    const artifact = await this.createArtifact({
      run,
      artifactType: "review_report",
      summary: reviewReport.summary,
      contentJson: reviewReport,
      contentMarkdown: null,
    });

    return this.saveRun({
      ...run,
      latestSummary: reviewReport.summary,
      reviewConclusion: reviewReport.conclusion,
      reviewArtifactId: artifact.artifactId,
    });
  }

  private async saveRepair(
    run: TaskDecompositionRunRecord,
    repair: RepairResult,
  ): Promise<TaskDecompositionRunRecord> {
    await this.createArtifact({
      run,
      artifactType: "repair_history",
      summary: repair.summary,
      contentJson: repair,
      contentMarkdown: null,
    });

    return this.saveRun({
      ...run,
      latestSummary: repair.summary,
    });
  }

  private async writeReport(
    run: TaskDecompositionRunRecord,
    draft: TaskPlanDraft,
    reviewReport: ReviewReport,
    repairSummaries: string[],
  ): Promise<TaskDecompositionRunRecord> {
    const report = await this.options.runtime.renderReport({
      trafficWorkId: run.trafficWorkId,
      draft,
      reviewReport,
      repairSummaries,
    });
    const artifact = await this.createArtifact({
      run,
      artifactType: "decomposition_report",
      summary: report.output.summary,
      contentJson: report.output,
      contentMarkdown: report.output.markdown,
    });
    await this.options.archiveStore.writeRunArtifact({
      trafficWorkId: run.trafficWorkId,
      decompositionRunId: run.decompositionRunId,
      fileName: "decomposition-report.md",
      content: report.output.markdown,
    });

    return this.saveRun({
      ...run,
      status: "waiting_user_confirmation",
      stage: "waiting_user_confirmation",
      latestSummary: report.output.summary,
      reportArtifactId: artifact.artifactId,
    });
  }

  private async archiveConfirmedDraft(
    run: TaskDecompositionRunRecord,
    draft: TaskPlanDraft,
  ): Promise<void> {
    for (const task of draft.tasks) {
      await this.options.archiveStore.writeTaskDocument({
        trafficWorkId: run.trafficWorkId,
        documentRef: task.documentRef,
        content: renderTaskDocument(task),
      });
    }

    await this.options.archiveStore.writeRunArtifact({
      trafficWorkId: run.trafficWorkId,
      decompositionRunId: run.decompositionRunId,
      fileName: "confirmed-task-plan.json",
      content: JSON.stringify(draft, null, 2),
    });
  }

  private async markTrafficWorkPrepared(
    trafficWorkId: string,
    preparedAt: string,
  ): Promise<void> {
    const trafficWork =
      await this.options.trafficWorkStateStore.getTrafficWorkById(trafficWorkId);

    if (!trafficWork) {
      throw new TaskDecompositionRunNotFoundError(trafficWorkId);
    }

    await this.options.trafficWorkStateStore.saveTrafficWork({
      ...trafficWork,
      contextPreparationStatus: "prepared",
      contextPreparationStatusReason:
        "Task decomposition confirmed and formal tasks committed.",
      contextPreparedAt: preparedAt,
      updatedAt: preparedAt,
    });
  }

  private async readDraftArtifact(artifactId: string): Promise<TaskPlanDraft> {
    const artifact = await this.options.runStore.getArtifactById(artifactId);

    if (!artifact || artifact.artifactType !== "task_plan_draft") {
      throw new TaskDecompositionRunOperationConflictError(
        "The latest task plan draft artifact is missing.",
      );
    }

    return artifact.contentJson as TaskPlanDraft;
  }

  private async getLatestRun(
    trafficWorkId: string,
  ): Promise<TaskDecompositionRunRecord> {
    const run = await this.options.runStore.getLatestRunByTrafficWorkId(
      normalizeRequiredString(trafficWorkId, "Traffic work ID is required."),
    );

    if (!run) {
      throw new TaskDecompositionRunNotFoundError(trafficWorkId);
    }

    return run;
  }

  private async toDetail(
    run: TaskDecompositionRunRecord,
  ): Promise<TaskDecompositionRunDetail> {
    const artifacts = await this.options.runStore.listArtifactsForRun(
      run.decompositionRunId,
    );

    return {
      decompositionRunId: run.decompositionRunId,
      trafficWorkId: run.trafficWorkId,
      status: run.status,
      stage: run.stage,
      taskSetMode: run.taskSetMode,
      providerCode: run.providerCode,
      model: run.model,
      latestSummary: run.latestSummary,
      reviewConclusion: run.reviewConclusion,
      requiresUserConfirmation: run.status === "waiting_user_confirmation",
      artifacts: artifacts.map(toArtifactSummary),
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }

  private async createArtifact(input: {
    run: TaskDecompositionRunRecord;
    artifactType: TaskDecompositionArtifactRecord["artifactType"];
    summary: string | null;
    contentJson: unknown;
    contentMarkdown: string | null;
  }): Promise<TaskDecompositionArtifactRecord> {
    const artifact: TaskDecompositionArtifactRecord = {
      artifactId: this.createArtifactId(),
      decompositionRunId: input.run.decompositionRunId,
      trafficWorkId: input.run.trafficWorkId,
      artifactType: input.artifactType,
      summary: input.summary,
      contentJson: input.contentJson,
      contentMarkdown: input.contentMarkdown,
      createdAt: this.now().toISOString(),
    };
    await this.options.runStore.createArtifact(artifact);
    return artifact;
  }

  private async saveRun(
    run: TaskDecompositionRunRecord,
  ): Promise<TaskDecompositionRunRecord> {
    const nextRun = {
      ...run,
      updatedAt: this.now().toISOString(),
    };
    await this.options.runStore.saveRun(nextRun);
    return nextRun;
  }

  private async buildPriorArtifactsSummary(
    previousRun: TaskDecompositionRunRecord,
  ): Promise<string> {
    const artifacts = await this.options.runStore.listArtifactsForRun(
      previousRun.decompositionRunId,
    );

    return artifacts
      .map((artifact) => summarizePriorArtifactForPlanning(artifact))
      .join("\n");
  }
}

function toTaskSetWriteInput(
  draft: TaskPlanDraft,
  run: TaskDecompositionRunRecord,
): TaskSetWriteInput {
  const taskKeys = new Set(draft.tasks.map((task) => task.taskKey));

  return {
    source: {
      kind: "agent-decomposition",
      requestId: run.decompositionRunId,
      description:
        "Committed from a user-confirmed Cybernomads Agent task plan draft.",
    },
    tasks: draft.tasks.map((task) => ({
      taskKey: task.taskKey,
      name: task.name,
      instruction: task.instruction,
      documentRef: task.documentRef,
      contextRef: task.contextRef,
      condition: {
        cron: task.condition.cron,
        relyOnTaskKeys: task.dependsOn.filter((taskKey) => taskKeys.has(taskKey)),
      },
      inputPrompt: task.inputPrompt,
    })),
  };
}

function renderTaskDocument(task: TaskPlanDraft["tasks"][number]): string {
  return [
    `# ${task.name}`,
    ``,
    `Task Key: ${task.taskKey}`,
    ``,
    `## Goal`,
    task.goal,
    ``,
    `## Expected Outputs`,
    ...task.expectedOutputs.map((output) => `- ${output}`),
    ``,
    `## Input Sources`,
    ...task.inputSources.map(
      (source) =>
        `- ${source.type}: ${source.description}; acquisition=${source.acquisition}; missing=${source.missingBehavior}`,
    ),
    ``,
    `## Dependencies`,
    task.dependsOn.length > 0 ? task.dependsOn.join(", ") : "none",
    ``,
    `## Resources`,
    ...task.resourceNeeds.map((resource) => `- ${resource}`),
    ``,
    `## Instruction`,
    task.instruction,
  ].join("\n");
}

function toArtifactSummary(
  artifact: TaskDecompositionArtifactRecord,
): TaskDecompositionArtifactSummary {
  return {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    summary: artifact.summary,
    createdAt: artifact.createdAt,
  };
}

function normalizeRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new TaskDecompositionRunValidationError(message);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new TaskDecompositionRunValidationError(message);
  }

  return normalizedValue;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredString(value, "Expected a non-empty string.");
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Task decomposition run failed.";
}

function summarizePriorArtifactForPlanning(
  artifact: TaskDecompositionArtifactRecord,
): string {
  const content = artifact.contentMarkdown ?? toPlanningJson(artifact.contentJson);

  return [
    `[${artifact.artifactType}] ${artifact.summary ?? "no summary"}`,
    truncateForPlanning(content),
  ]
    .filter((value) => value.length > 0)
    .join("\n");
}

function toPlanningJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function truncateForPlanning(value: string): string {
  const normalizedValue = value.trim();
  const maxLength = 4000;

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength)}\n[truncated]`;
}
