export type AgentRuntimeStage = "planning" | "review" | "repair" | "report";

export type TaskInputSourceType =
  | "upstream_task"
  | "user_material"
  | "product_content"
  | "strategy_content"
  | "platform_data"
  | "runtime_tool"
  | "knowledge_file"
  | "external";

export interface TaskPlanInputSource {
  type: TaskInputSourceType;
  description: string;
  acquisition: string;
  missingBehavior: "blocking" | "degraded" | "skip" | "ask_user";
  sourceTaskKey?: string | null;
}

export interface TaskPlanDraftTask {
  taskKey: string;
  name: string;
  goal: string;
  expectedOutputs: string[];
  inputSources: TaskPlanInputSource[];
  dependsOn: string[];
  resourceNeeds: string[];
  strategyCoverage: string[];
  skillRefs: string[];
  instruction: string;
  documentRef: string;
  contextRef: string;
  condition: {
    cron: string | null;
    relyOnTaskKeys: string[];
  };
  inputPrompt: string;
}

export interface TaskPlanDraft {
  summary: string;
  strategyCoverageSummary: string;
  tasks: TaskPlanDraftTask[];
  feedbackConsideration?: string | null;
}

export type ReviewConclusion = "pass" | "fix_required" | "failed";

export interface ReviewIssue {
  category:
    | "granularity"
    | "duplication"
    | "output"
    | "strategy_coverage"
    | "input_source"
    | "dependency"
    | "resource_readiness"
    | "feasibility"
    | "schema"
    | "safety";
  severity: "info" | "warning" | "error";
  message: string;
  taskKey?: string | null;
  evidence?: string | null;
  suggestion?: string | null;
  repairable: boolean;
}

export interface ReviewReport {
  conclusion: ReviewConclusion;
  summary: string;
  issues: ReviewIssue[];
}

export interface RepairResult {
  summary: string;
  revisedDraft: TaskPlanDraft;
}

export interface DecompositionReport {
  summary: string;
  markdown: string;
}

export interface AgentRuntimeCallResult<T> {
  stage: AgentRuntimeStage;
  providerCode: string;
  model: string | null;
  output: T;
  outputText: string;
}

export interface PlanningInput {
  trafficWorkId: string;
  displayName: string;
  contextMarkdown: string;
  skillRegistrySummary: string;
  toolRegistrySummary: string;
  priorArtifactsSummary?: string | null;
}

export interface ReviewInput {
  trafficWorkId: string;
  draft: TaskPlanDraft;
}

export interface RepairInput {
  trafficWorkId: string;
  draft: TaskPlanDraft;
  reviewReport: ReviewReport;
  attempt: number;
}

export interface ReportInput {
  trafficWorkId: string;
  draft: TaskPlanDraft;
  reviewReport: ReviewReport;
  repairSummaries: string[];
}
