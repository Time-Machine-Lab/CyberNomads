import { z } from "zod";

export const taskInputSourceSchema = z.object({
  type: z.enum([
    "upstream_task",
    "user_material",
    "product_content",
    "strategy_content",
    "platform_data",
    "runtime_tool",
    "knowledge_file",
    "external",
  ]),
  description: z.string().min(1),
  acquisition: z.string().min(1),
  missingBehavior: z.enum(["blocking", "degraded", "skip", "ask_user"]),
  sourceTaskKey: z.string().min(1).nullable().optional(),
});

export const taskPlanDraftTaskSchema = z.object({
  taskKey: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().min(1),
  expectedOutputs: z.array(z.string().min(1)).min(1),
  inputSources: z.array(taskInputSourceSchema),
  dependsOn: z.array(z.string().min(1)),
  resourceNeeds: z.array(z.string().min(1)),
  strategyCoverage: z.array(z.string().min(1)),
  skillRefs: z.array(z.string().min(1)),
  instruction: z.string().min(1),
  documentRef: z.string().min(1),
  contextRef: z.string().min(1),
  condition: z.object({
    cron: z.string().min(1).nullable(),
    relyOnTaskKeys: z.array(z.string().min(1)),
  }),
  inputPrompt: z.string(),
});

export const taskPlanDraftSchema = z.object({
  summary: z.string().min(1),
  strategyCoverageSummary: z.string().min(1),
  tasks: z.array(taskPlanDraftTaskSchema).min(1),
  feedbackConsideration: z.string().nullable().optional(),
});

export const reviewIssueSchema = z.object({
  category: z.enum([
    "granularity",
    "duplication",
    "output",
    "strategy_coverage",
    "input_source",
    "dependency",
    "resource_readiness",
    "feasibility",
    "schema",
    "safety",
  ]),
  severity: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  taskKey: z.string().min(1).nullable().optional(),
  evidence: z.string().nullable().optional(),
  suggestion: z.string().nullable().optional(),
  repairable: z.boolean(),
});

export const reviewReportSchema = z.object({
  conclusion: z.enum(["pass", "fix_required", "failed"]),
  summary: z.string().min(1),
  issues: z.array(reviewIssueSchema),
});

export const repairResultSchema = z.object({
  summary: z.string().min(1),
  revisedDraft: taskPlanDraftSchema,
});

export const decompositionReportSchema = z.object({
  summary: z.string().min(1),
  markdown: z.string().min(1),
});
