import type {
  ListTasksFilters,
  TaskOutputRecord,
  TaskRecord,
} from "../modules/tasks/types.js";

export type TaskTrafficWorkLifecycleStatus =
  | "ready"
  | "running"
  | "ended"
  | "archived"
  | "deleted";

export interface TaskTrafficWorkState {
  trafficWorkId: string;
  lifecycleStatus: TaskTrafficWorkLifecycleStatus;
}

export interface TaskStorePort {
  getTrafficWorkState(
    trafficWorkId: string,
  ): Promise<TaskTrafficWorkState | undefined>;
  listTasks(filters?: ListTasksFilters): Promise<TaskRecord[]>;
  getTaskById(taskId: string): Promise<TaskRecord | undefined>;
  countTasksByTrafficWorkId(trafficWorkId: string): Promise<number>;
  createTasks(records: TaskRecord[]): Promise<void>;
  replaceTasksForTrafficWork(
    trafficWorkId: string,
    records: TaskRecord[],
  ): Promise<void>;
  saveTask(record: TaskRecord): Promise<void>;
  createTaskOutputRecord(record: TaskOutputRecord): Promise<void>;
  listTaskOutputRecords(taskId: string): Promise<TaskOutputRecord[]>;
  close(): void;
}
