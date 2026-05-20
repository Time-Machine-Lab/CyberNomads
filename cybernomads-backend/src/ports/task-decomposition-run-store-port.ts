import type {
  TaskDecompositionArtifactRecord,
  TaskDecompositionArtifactType,
  TaskDecompositionRunRecord,
} from "../modules/task-decomposition-runs/types.js";

export interface TaskDecompositionRunStorePort {
  createRun(record: TaskDecompositionRunRecord): Promise<void>;
  saveRun(record: TaskDecompositionRunRecord): Promise<void>;
  getRunById(
    decompositionRunId: string,
  ): Promise<TaskDecompositionRunRecord | undefined>;
  getLatestRunByTrafficWorkId(
    trafficWorkId: string,
  ): Promise<TaskDecompositionRunRecord | undefined>;
  createArtifact(record: TaskDecompositionArtifactRecord): Promise<void>;
  getArtifactById(
    artifactId: string,
  ): Promise<TaskDecompositionArtifactRecord | undefined>;
  getLatestArtifact(
    trafficWorkId: string,
    artifactType: TaskDecompositionArtifactType,
  ): Promise<TaskDecompositionArtifactRecord | undefined>;
  listArtifactsForRun(
    decompositionRunId: string,
  ): Promise<TaskDecompositionArtifactRecord[]>;
  close(): void;
}
