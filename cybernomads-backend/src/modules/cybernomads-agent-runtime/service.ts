import type { AgentAccessService } from "../agent-access/service.js";
import type { ControlledToolRegistryPort } from "../../ports/controlled-tool-registry-port.js";
import type { SkillRegistryPort } from "../../ports/skill-registry-port.js";
import {
  decompositionReportSchema,
  repairResultSchema,
  reviewReportSchema,
  taskPlanDraftSchema,
} from "./schemas.js";
import type {
  AgentRuntimeCallResult,
  DecompositionReport,
  PlanningInput,
  RepairInput,
  RepairResult,
  ReportInput,
  ReviewInput,
  ReviewReport,
  TaskPlanDraft,
} from "./types.js";

export interface CybernomadsAgentRuntimeServiceOptions {
  agentAccessService: Pick<AgentAccessService, "submitTaskPlanningRequest">;
  skillRegistry: SkillRegistryPort;
  toolRegistry: ControlledToolRegistryPort;
}

export class CybernomadsAgentRuntimeService {
  constructor(private readonly options: CybernomadsAgentRuntimeServiceOptions) {}

  async buildSkillRegistrySummary(): Promise<string> {
    const skills = await this.options.skillRegistry.listSkills();

    if (skills.length === 0) {
      return "No Cybernomads Skills are currently registered.";
    }

    return skills
      .map((skill) => `- ${skill.name}: ${skill.summary}`)
      .join("\n");
  }

  async buildToolRegistrySummary(): Promise<string> {
    const tools = await this.options.toolRegistry.listTools();

    return tools
      .map(
        (tool) =>
          `- ${tool.name} [${tool.riskLevel}, caller=${tool.caller}]: ${tool.summary}`,
      )
      .join("\n");
  }

  async planTasks(
    input: PlanningInput,
  ): Promise<AgentRuntimeCallResult<TaskPlanDraft>> {
    const result = await this.options.agentAccessService.submitTaskPlanningRequest({
      title: `cybernomads-agent:planning:${input.trafficWorkId}`,
      context: input.contextMarkdown,
      prompt: buildPlannerPrompt(input),
    });

    return {
      stage: "planning",
      providerCode: result.providerCode,
      model: result.model,
      outputText: result.outputText,
      output: taskPlanDraftSchema.parse(parseJsonFromText(result.outputText)),
    };
  }

  async reviewDraft(
    input: ReviewInput,
  ): Promise<AgentRuntimeCallResult<ReviewReport>> {
    const result = await this.options.agentAccessService.submitTaskPlanningRequest({
      title: `cybernomads-agent:review:${input.trafficWorkId}`,
      context: JSON.stringify(input.draft, null, 2),
      prompt: buildReviewPrompt(input),
    });

    return {
      stage: "review",
      providerCode: result.providerCode,
      model: result.model,
      outputText: result.outputText,
      output: reviewReportSchema.parse(parseJsonFromText(result.outputText)),
    };
  }

  async repairDraft(
    input: RepairInput,
  ): Promise<AgentRuntimeCallResult<RepairResult>> {
    const result = await this.options.agentAccessService.submitTaskPlanningRequest({
      title: `cybernomads-agent:repair:${input.trafficWorkId}:${input.attempt}`,
      context: JSON.stringify(
        {
          draft: input.draft,
          reviewReport: input.reviewReport,
        },
        null,
        2,
      ),
      prompt: buildRepairPrompt(input),
    });

    return {
      stage: "repair",
      providerCode: result.providerCode,
      model: result.model,
      outputText: result.outputText,
      output: repairResultSchema.parse(parseJsonFromText(result.outputText)),
    };
  }

  async renderReport(
    input: ReportInput,
  ): Promise<AgentRuntimeCallResult<DecompositionReport>> {
    const report = renderBackendReport(input);

    return {
      stage: "report",
      providerCode: "backend-renderer",
      model: null,
      outputText: JSON.stringify(report),
      output: decompositionReportSchema.parse(report),
    };
  }
}

function buildPlannerPrompt(input: PlanningInput): string {
  return [
    "你是 Cybernomads Task Planner。请只输出 JSON，不要输出 Markdown。",
    "目标：为一个引流工作生成结构化任务方案草案。草案不是正式任务，不允许直接落库。",
    "每个任务必须包含 taskKey、name、goal、expectedOutputs、inputSources、dependsOn、resourceNeeds、strategyCoverage、skillRefs、instruction、documentRef、contextRef、condition、inputPrompt。",
    "inputSources 可以来自上游任务、用户材料、产品内容、策略内容、平台数据、运行时工具、知识文件或外部来源，但必须声明 type、description、acquisition 和 missingBehavior。",
    "documentRef 必须形如 ./<taskKey>.md，contextRef 可使用 ./。",
    "",
    "请按这个 JSON shape 输出：",
    '{"summary":"","strategyCoverageSummary":"","feedbackConsideration":null,"tasks":[{"taskKey":"","name":"","goal":"","expectedOutputs":[""],"inputSources":[{"type":"product_content","description":"","acquisition":"","missingBehavior":"blocking","sourceTaskKey":null}],"dependsOn":[],"resourceNeeds":[""],"strategyCoverage":[""],"skillRefs":[""],"instruction":"","documentRef":"./task-key.md","contextRef":"./","condition":{"cron":null,"relyOnTaskKeys":[]},"inputPrompt":""}]}',
    "",
    "可用 Skills:",
    input.skillRegistrySummary,
    "",
    "受控工具边界:",
    input.toolRegistrySummary,
    "",
    input.priorArtifactsSummary
      ? `历史产物和反馈:\n${input.priorArtifactsSummary}`
      : "历史产物和反馈: none",
  ].join("\n");
}

function buildReviewPrompt(input: ReviewInput): string {
  void input;

  return [
    "你是 Cybernomads Review Agent。请只输出 JSON，不要输出 Markdown。",
    "请审查任务方案草案的任务粒度、重复、明确产出、策略目标覆盖、输入来源、依赖关系、资源准备和可运行性。",
    "输入来源不必全部来自上游任务，但必须显式声明来源类型、获取方式、缺失时行为和是否阻塞。",
    "结论只能是 pass、fix_required 或 failed。",
    "请按这个 JSON shape 输出：",
    '{"conclusion":"pass","summary":"","issues":[{"category":"granularity","severity":"warning","message":"","taskKey":null,"evidence":null,"suggestion":null,"repairable":true}]}',
  ].join("\n");
}

function buildRepairPrompt(input: RepairInput): string {
  return [
    "你是 Cybernomads Repair Agent。请只输出 JSON，不要输出 Markdown。",
    `这是第 ${input.attempt} 轮修正。请根据 Review issues 修正任务方案，保持任务 key 稳定，除非问题要求拆分或合并。`,
    "请按这个 JSON shape 输出：",
    '{"summary":"","revisedDraft":{"summary":"","strategyCoverageSummary":"","feedbackConsideration":null,"tasks":[]}}',
  ].join("\n");
}

function renderBackendReport(input: ReportInput): DecompositionReport {
  const taskLines = input.draft.tasks.map((task, index) =>
    [
      `${index + 1}. ${task.name} (${task.taskKey})`,
      `   - Goal: ${task.goal}`,
      `   - Outputs: ${task.expectedOutputs.join(", ")}`,
      `   - Inputs: ${task.inputSources
        .map((source) => `${source.type}:${source.description}`)
        .join("; ")}`,
      `   - Skills: ${task.skillRefs.join(", ") || "none"}`,
    ].join("\n"),
  );
  const repairText =
    input.repairSummaries.length > 0
      ? input.repairSummaries.map((summary) => `- ${summary}`).join("\n")
      : "- none";
  const markdown = [
    `# Task Decomposition Report`,
    ``,
    `Traffic Work: ${input.trafficWorkId}`,
    ``,
    `## Summary`,
    input.draft.summary,
    ``,
    `## Strategy Coverage`,
    input.draft.strategyCoverageSummary,
    ``,
    `## Review`,
    `Conclusion: ${input.reviewReport.conclusion}`,
    input.reviewReport.summary,
    ``,
    `## Repair History`,
    repairText,
    ``,
    `## Tasks`,
    taskLines.join("\n\n"),
  ].join("\n");

  return {
    summary: input.reviewReport.summary,
    markdown,
  };
}

function parseJsonFromText(text: string): unknown {
  const normalizedText = text.trim();

  try {
    return JSON.parse(normalizedText) as unknown;
  } catch {
    const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(normalizedText);

    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]) as unknown;
    }

    const firstBrace = normalizedText.indexOf("{");
    const lastBrace = normalizedText.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(normalizedText.slice(firstBrace, lastBrace + 1)) as unknown;
    }

    throw new Error("Agent response did not contain valid JSON.");
  }
}
