import type { TaskPlanDraft } from "../cybernomads-agent-runtime/types.js";

export type TaskDecompositionRunStatus =
  | "running"
  | "waiting_user_confirmation"
  | "committed"
  | "failed"
  | "awaiting_user_feedback";

export type TaskDecompositionRunStage =
  | "context_ready"
  | "planning"
  | "reviewing"
  | "repairing"
  | "reporting"
  | "waiting_user_confirmation"
  | "committing"
  | "prepared"
  | "failed";

export type TaskDecompositionArtifactType =
  | "task_plan_draft"
  | "review_report"
  | "repair_history"
  | "user_feedback"
  | "confirmation_snapshot"
  | "decomposition_report"
  | "execution_feedback";

export interface TaskDecompositionRunRecord {
  decompositionRunId: string;
  trafficWorkId: string;
  status: TaskDecompositionRunStatus;
  stage: TaskDecompositionRunStage;
  taskSetMode: "create" | "replace";
  providerCode: string;
  model: string | null;
  latestSummary: string | null;
  reviewConclusion: string | null;
  repairAttempts: number;
  maxRepairAttempts: number;
  draftArtifactId: string | null;
  reviewArtifactId: string | null;
  reportArtifactId: string | null;
  confirmationSnapshotArtifactId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskDecompositionArtifactRecord {
  artifactId: string;
  decompositionRunId: string;
  trafficWorkId: string;
  artifactType: TaskDecompositionArtifactType;
  summary: string | null;
  contentJson: unknown;
  contentMarkdown: string | null;
  createdAt: string;
}

export interface TaskDecompositionArtifactSummary {
  artifactId: string;
  artifactType: TaskDecompositionArtifactType;
  summary: string | null;
  createdAt: string;
}

export interface TaskDecompositionRunDetail {
  decompositionRunId: string;
  trafficWorkId: string;
  status: TaskDecompositionRunStatus;
  stage: TaskDecompositionRunStage;
  taskSetMode: "create" | "replace";
  providerCode: string;
  model: string | null;
  latestSummary: string | null;
  reviewConclusion: string | null;
  requiresUserConfirmation: boolean;
  artifacts: TaskDecompositionArtifactSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDecompositionReportView {
  decompositionRunId: string;
  trafficWorkId: string;
  markdown: string;
}

export interface StartTaskDecompositionRunInput {
  trafficWorkId: string;
  displayName: string;
  contextMarkdown: string;
  taskSetMode: "create" | "replace";
  priorArtifactsSummary?: string | null;
}

export interface TaskDecompositionFeedbackInput {
  feedback: string;
  taskKey?: string | null;
}

export interface ConfirmedTaskSetSnapshot {
  sourceDraft: TaskPlanDraft;
  confirmedAt: string;
}
