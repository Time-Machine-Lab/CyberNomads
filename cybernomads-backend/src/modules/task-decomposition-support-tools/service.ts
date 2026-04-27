import type { TaskService } from "../tasks/service.js";
import {
  TaskDecompositionSupportToolsBoundaryViolationError,
  TaskDecompositionSupportToolsResourceNotFoundError,
  TaskDecompositionSupportToolsTrafficWorkNotFoundError,
  TaskDecompositionSupportToolsValidationError,
} from "./errors.js";
import type {
  BatchSaveTasksToolInput,
  BatchSaveTasksToolResult,
  CopyRuntimeAgentResourceToolInput,
  CopyRuntimeAgentResourceToolResult,
  ReportTrafficWorkPreparationStatusToolInput,
  ReportTrafficWorkPreparationStatusToolResult,
  TaskDecompositionSupportToolValidationIssue,
} from "./types.js";
import type { RuntimeAgentResourceStorePort } from "../../ports/runtime-agent-resource-store-port.js";
import type { TrafficWorkContextStore } from "../../ports/traffic-work-context-store-port.js";
import type { TrafficWorkStateStore } from "../../ports/traffic-work-state-store-port.js";

export interface TaskDecompositionSupportToolsServiceOptions {
  trafficWorkStateStore: Pick<
    TrafficWorkStateStore,
    "getTrafficWorkById" | "saveTrafficWork"
  >;
  trafficWorkContextStore: TrafficWorkContextStore;
  runtimeAgentResourceStore: RuntimeAgentResourceStorePort;
  taskService: Pick<
    TaskService,
    "createTaskSetForTrafficWork" | "replaceTaskSetForTrafficWork"
  >;
  now?: () => Date;
}

export class TaskDecompositionSupportToolsService {
  private readonly now: () => Date;

  constructor(
    private readonly options: TaskDecompositionSupportToolsServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async copyRuntimeAgentResource(
    input: CopyRuntimeAgentResourceToolInput,
  ): Promise<CopyRuntimeAgentResourceToolResult> {
    const trafficWorkId = normalizeRequiredString(
      input.trafficWorkId,
      "Traffic work ID is required.",
      "trafficWorkId",
    );
    const resourceType = ensureResourceType(input.resourceType);
    const resourcePath = normalizeRequiredString(
      input.resourcePath,
      "Runtime resource path is required.",
      "resourcePath",
    );
    const trafficWork =
      await this.options.trafficWorkStateStore.getTrafficWorkById(
        trafficWorkId,
      );

    if (!trafficWork) {
      throw new TaskDecompositionSupportToolsTrafficWorkNotFoundError(
        trafficWorkId,
      );
    }

    const context =
      await this.options.trafficWorkContextStore.ensureWorkContext(
        trafficWorkId,
      );
    const targetRootDirectory =
      resourceType === "skill"
        ? context.skillsDirectory
        : context.knowledgeDirectory;

    try {
      const result =
        await this.options.runtimeAgentResourceStore.copyRuntimeAgentResource({
          resourceType,
          resourcePath,
          targetRootDirectory,
        });

      return {
        trafficWorkId,
        resourceType,
        sourceAbsolutePath: result.sourceAbsolutePath,
        sourceRuntimeRelativePath: result.sourceRuntimeRelativePath,
        targetAbsolutePath: result.targetAbsolutePath,
        targetRuntimeRelativePath: result.targetRuntimeRelativePath,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("outside the allowed")) {
          throw new TaskDecompositionSupportToolsBoundaryViolationError(
            error.message,
            {
              cause: error,
            },
          );
        }

        if (
          error.message.includes("ENOENT") ||
          error.message.includes("was not found")
        ) {
          throw new TaskDecompositionSupportToolsResourceNotFoundError(
            resourceType,
            resourcePath,
            { cause: error },
          );
        }
      }

      throw error;
    }
  }

  async batchSaveTasks(
    input: BatchSaveTasksToolInput,
  ): Promise<BatchSaveTasksToolResult> {
    const trafficWorkId = normalizeRequiredString(
      input.trafficWorkId,
      "Traffic work ID is required.",
      "trafficWorkId",
    );
    const mode = ensureBatchSaveMode(input.mode);

    if (!input.taskSet || typeof input.taskSet !== "object") {
      throw new TaskDecompositionSupportToolsValidationError(
        "Task set is required.",
        {
          issues: [
            {
              path: "taskSet",
              message: "Task set is required.",
            },
          ],
        },
      );
    }

    const result =
      mode === "create"
        ? await this.options.taskService.createTaskSetForTrafficWork(
            trafficWorkId,
            input.taskSet,
          )
        : await this.options.taskService.replaceTaskSetForTrafficWork(
            trafficWorkId,
            input.taskSet,
          );

    return {
      mode,
      trafficWorkId: result.trafficWorkId,
      taskCount: result.taskCount,
      tasks: result.tasks,
    };
  }

  async reportTrafficWorkPreparationStatus(
    input: ReportTrafficWorkPreparationStatusToolInput,
  ): Promise<ReportTrafficWorkPreparationStatusToolResult> {
    const trafficWorkId = normalizeRequiredString(
      input.trafficWorkId,
      "Traffic work ID is required.",
      "trafficWorkId",
    );
    const status = ensurePreparationStatus(input.status);
    const trafficWork =
      await this.options.trafficWorkStateStore.getTrafficWorkById(
        trafficWorkId,
      );

    if (!trafficWork) {
      throw new TaskDecompositionSupportToolsTrafficWorkNotFoundError(
        trafficWorkId,
      );
    }

    const updatedAt = this.now().toISOString();
    const nextRecord = {
      ...trafficWork,
      contextPreparationStatus: status,
      contextPreparationStatusReason:
        status === "prepared"
          ? (normalizeOptionalString(input.reason, "reason") ??
            "Traffic work context prepared by agent.")
          : normalizeRequiredString(
              input.reason,
              "Failure reason is required when reporting failed preparation.",
              "reason",
            ),
      contextPreparedAt: status === "prepared" ? updatedAt : null,
      updatedAt,
    };

    await this.options.trafficWorkStateStore.saveTrafficWork(nextRecord);

    return {
      trafficWorkId,
      status,
      reason: nextRecord.contextPreparationStatusReason,
      contextPreparedAt: nextRecord.contextPreparedAt,
      updatedAt,
    };
  }
}

function normalizeRequiredString(
  value: unknown,
  message: string,
  path: string,
): string {
  if (typeof value !== "string") {
    throw new TaskDecompositionSupportToolsValidationError(message, {
      issues: [
        {
          path,
          message,
        },
      ],
    });
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new TaskDecompositionSupportToolsValidationError(message, {
      issues: [
        {
          path,
          message,
        },
      ],
    });
  }

  return normalizedValue;
}

function ensureResourceType(
  value: unknown,
): CopyRuntimeAgentResourceToolInput["resourceType"] {
  if (value === "skill" || value === "knowledge") {
    return value;
  }

  throw new TaskDecompositionSupportToolsValidationError(
    "Runtime resource type is invalid.",
    {
      issues: [
        {
          path: "resourceType",
          message: 'Runtime resource type must be "skill" or "knowledge".',
        },
      ],
    },
  );
}

function ensureBatchSaveMode(value: unknown): BatchSaveTasksToolInput["mode"] {
  if (value === "create" || value === "replace") {
    return value;
  }

  throw new TaskDecompositionSupportToolsValidationError(
    "Batch task save mode is invalid.",
    {
      issues: [
        {
          path: "mode",
          message: 'Batch task save mode must be "create" or "replace".',
        },
      ],
    },
  );
}

function ensurePreparationStatus(
  value: unknown,
): ReportTrafficWorkPreparationStatusToolInput["status"] {
  if (value === "prepared" || value === "failed") {
    return value;
  }

  throw new TaskDecompositionSupportToolsValidationError(
    "Traffic work preparation status is invalid.",
    {
      issues: [
        {
          path: "status",
          message:
            'Traffic work preparation status must be "prepared" or "failed".',
        },
      ],
    },
  );
}

function normalizeOptionalString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredString(value, "Expected a non-empty string.", path);
}
