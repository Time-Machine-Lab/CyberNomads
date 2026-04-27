export type TaskStatus = "ready" | "running" | "completed" | "failed";

export interface TaskCondition {
  cron: string | null;
  relyOnTaskIds: string[];
}

export interface TaskDraftCondition {
  cron: string | null;
  relyOnTaskKeys: string[];
}

export interface TaskRecord {
  taskId: string;
  trafficWorkId: string;
  taskKey: string | null;
  name: string;
  instruction: string;
  documentRef: string | null;
  contextRef: string;
  condition: TaskCondition;
  inputPrompt: string;
  status: TaskStatus;
  statusReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  taskId: string;
  trafficWorkId: string;
  name: string;
  status: TaskStatus;
  condition: TaskCondition;
  inputPrompt: string;
  updatedAt: string;
}

export interface TaskDetail {
  taskId: string;
  trafficWorkId: string;
  name: string;
  instruction: string;
  documentRef: string | null;
  contextRef: string;
  condition: TaskCondition;
  inputPrompt: string;
  status: TaskStatus;
  statusReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  taskKey: string;
  name: string;
  instruction: string;
  documentRef?: string | null;
  contextRef: string;
  condition: TaskDraftCondition;
  inputPrompt: string;
}

export interface TaskSetSource {
  kind: "agent-decomposition";
  requestId?: string | null;
  description?: string | null;
}

export interface TaskSetWriteInput {
  source: TaskSetSource;
  tasks: TaskDraft[];
}

export interface TaskSetTaskResult {
  taskKey: string;
  taskId: string;
}

export interface TaskSetWriteResult {
  trafficWorkId: string;
  taskCount: number;
  tasks: TaskSetTaskResult[];
}

export interface ListTasksFilters {
  trafficWorkId?: string;
  status?: TaskStatus;
  keyword?: string;
}

export interface ListTasksResult {
  items: TaskSummary[];
}

export interface UpdateTaskStatusInput {
  status: TaskStatus;
  statusReason?: string | null;
}

export interface CreateTaskOutputRecordInput {
  description: string;
  dataLocation: string;
}

export interface TaskOutputRecord {
  outputRecordId: string;
  taskId: string;
  description: string;
  dataLocation: string;
  createdAt: string;
}

export interface ListTaskOutputRecordsResult {
  items: TaskOutputRecord[];
}
