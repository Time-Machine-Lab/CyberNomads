import type { TaskSetTaskResult, TaskSetWriteInput } from "../tasks/types.js";
import type { RuntimeAgentResourceType } from "../../ports/runtime-agent-resource-store-port.js";

export interface CopyRuntimeAgentResourceToolInput {
  trafficWorkId: string;
  resourceType: RuntimeAgentResourceType;
  resourcePath: string;
}

export interface CopyRuntimeAgentResourceToolResult {
  trafficWorkId: string;
  resourceType: RuntimeAgentResourceType;
  sourceAbsolutePath: string;
  sourceRuntimeRelativePath: string;
  targetAbsolutePath: string;
  targetRuntimeRelativePath: string;
}

export interface BatchSaveTasksToolInput {
  trafficWorkId: string;
  mode: "create" | "replace";
  taskSet: TaskSetWriteInput;
}

export interface BatchSaveTasksToolResult {
  mode: "create" | "replace";
  trafficWorkId: string;
  taskCount: number;
  tasks: TaskSetTaskResult[];
}

export interface TaskDecompositionSupportToolValidationIssue {
  path: string;
  message: string;
}
