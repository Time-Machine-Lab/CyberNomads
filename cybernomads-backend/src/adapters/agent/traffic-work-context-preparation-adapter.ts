import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

import type { AgentAccessService } from "../../modules/agent-access/service.js";
import type { TaskSetWriteInput } from "../../modules/tasks/types.js";
import type {
  PrepareTrafficWorkContextInput,
  TrafficWorkContextPreparationPort,
} from "../../ports/traffic-work-context-preparation-port.js";
import { CYBERNOMADS_TASK_DECOMPOSITION_SKILL } from "../../shared/agent-task-skill-instructions.js";
import { resolveRuntimeInstalledSkillFile } from "../skill/local/runtime-skill-assets.js";

export class AgentAccessTrafficWorkContextPreparationAdapter
  implements TrafficWorkContextPreparationPort
{
  constructor(
    private readonly options: {
      agentAccessService: AgentAccessService;
      runtimeRootDirectory: string;
      runtimeSkillsDirectory: string;
    },
  ) {}

  async prepareContext(
    input: PrepareTrafficWorkContextInput,
  ): ReturnType<TrafficWorkContextPreparationPort["prepareContext"]> {
    const runtimeRootDirectory = resolveRequiredRuntimeDirectory(
      this.options.runtimeRootDirectory,
      "Cybernomads root directory",
    );
    const workDirectory = resolveRequiredRuntimeDirectory(
      input.context.workDirectory,
      "traffic work directory",
    );

    await ensurePathExists(runtimeRootDirectory, "Cybernomads root directory");
    await ensurePathExists(workDirectory, "traffic work directory");

    const taskDecompositionSkillFile = await resolveRuntimeInstalledSkillFile(
      this.options.runtimeSkillsDirectory,
      CYBERNOMADS_TASK_DECOMPOSITION_SKILL,
    );
    await ensurePathExists(
      taskDecompositionSkillFile,
      "task decomposition Skill file",
    );

    const trafficWorkDirectoryRelativePath = toRuntimeRelativePath(
      runtimeRootDirectory,
      workDirectory,
      "traffic work directory",
    );
    const taskDecompositionSkillRelativePath = toRuntimeRelativePath(
      runtimeRootDirectory,
      taskDecompositionSkillFile,
      "task decomposition Skill file",
    );

    const result =
      await this.options.agentAccessService.submitTaskDecompositionRequest({
        title: `traffic-work:${input.trafficWorkId}`,
        context: input.contextMarkdown,
        prompt: buildTaskDecompositionPrompt({
          input,
          runtimeRootDirectory,
          trafficWorkDirectoryRelativePath,
          taskDecompositionSkillRelativePath,
        }),
      });

    await materializeTaskDocuments(input.context.workDirectory, result.taskSet);

    return result.taskSet;
  }
}

function buildTaskDecompositionPrompt(input: {
  input: PrepareTrafficWorkContextInput;
  runtimeRootDirectory: string;
  trafficWorkDirectoryRelativePath: string;
  taskDecompositionSkillRelativePath: string;
}): string {
  const { input: request } = input;
  const objectBindings = renderObjectBindings(request);

  return [
    `请基于以下信息，理解当前 Cybernomads 引流工作，并使用指定的任务拆分 Skill 完成后续任务拆分。`,
    ``,
    `[引流工作信息]`,
    `引流工作ID: ${request.trafficWorkId}`,
    `引流工作名称: ${request.displayName}`,
    `产品ID: ${request.product.productId}`,
    `产品名称: ${request.product.name}`,
    `策略ID: ${request.strategy.strategyId}`,
    `策略名称: ${request.strategy.name}`,
    `对象绑定:`,
    objectBindings,
    ``,
    `说明:`,
    `- 这一部分用于标识当前正在处理的是哪一个引流工作。`,
    `- 产品ID、产品名称、策略ID 和策略名称用于标识本次引流工作绑定的业务对象。`,
    `- 对象绑定用于说明当前策略执行时可引用的具体资源对象。`,
    ``,
    `[产品信息]`,
    request.productContentMarkdown,
    ``,
    `说明:`,
    `- 这一部分是当前产品的完整介绍内容。`,
    `- 你需要基于这部分内容理解该产品是什么、面向谁、核心价值是什么。`,
    ``,
    `[策略信息]`,
    request.strategyContentMarkdown,
    ``,
    `说明:`,
    `- 这一部分是当前引流工作绑定的策略内容。`,
    `- 你需要基于这部分内容理解本次引流工作的宣传方式、执行方向和总体方法。`,
    ``,
    `[任务拆分Skill信息]`,
    `任务拆分Skill位置: ${input.taskDecompositionSkillRelativePath}`,
    ``,
    `说明:`,
    `- “任务拆分Skill位置”是本次任务拆分必须使用的 Skill 文件位置。`,
    `- 任务拆分的具体规则、输出要求和执行约束以该 Skill 为准。`,
    ``,
    `[基础路径信息]`,
    `Cybernomads目录绝对路径: ${input.runtimeRootDirectory}`,
    `引流工作目录: ${input.trafficWorkDirectoryRelativePath}`,
    ``,
    `说明:`,
    `- “Cybernomads目录绝对路径”是本次所有相对路径的解析基准。`,
    `- “引流工作目录”是当前引流工作的实际工作目录，相关任务文档、上下文内容和运行产物都归属于该目录。`,
    ``,
    `[规则]`,
    `1. 请基于“Cybernomads目录绝对路径”解析本提示词中的所有相对路径。`,
    `2. 请先访问“任务拆分Skill位置”并读取其中内容。`,
    `3. 在理解 Skill 内容后，再开始当前引流工作的任务拆分。`,
  ].join("\n");
}

function renderObjectBindings(input: PrepareTrafficWorkContextInput): string {
  if (input.objectBindings.length === 0) {
    return `- 无`;
  }

  return input.objectBindings
    .map(
      (item) =>
        `- ${item.objectType}:${item.objectKey} -> ${item.resourceId}${
          item.resourceLabel ? ` (${item.resourceLabel})` : ""
        }`,
    )
    .join("\n");
}

function resolveRequiredRuntimeDirectory(value: string, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${label}.`);
  }

  return resolve(value);
}

async function ensurePathExists(path: string, label: string): Promise<void> {
  try {
    await access(path);
  } catch (error) {
    throw new Error(`Missing ${label}.`, { cause: error });
  }
}

function toRuntimeRelativePath(
  runtimeRootDirectory: string,
  targetPath: string,
  label: string,
): string {
  const normalizedRoot = resolve(runtimeRootDirectory);
  const normalizedTarget = resolve(targetPath);
  const relativePath = relative(normalizedRoot, normalizedTarget);

  if (
    relativePath.length === 0 ||
    relativePath.startsWith("..") ||
    relativePath.includes("..\\") ||
    relativePath.includes("../")
  ) {
    throw new Error(
      `${label} must stay within the Cybernomads root directory.`,
    );
  }

  return `./${relativePath.split(sep).join("/")}`;
}

async function materializeTaskDocuments(
  workDirectory: string,
  taskSet: TaskSetWriteInput,
): Promise<void> {
  for (const task of taskSet.tasks) {
    const taskDocumentRef = normalizeTaskDocumentRef(task);
    const taskFilePath = resolve(workDirectory, taskDocumentRef);

    ensurePathWithinDirectory(workDirectory, taskFilePath);
    await mkdir(dirname(taskFilePath), { recursive: true });
    await writeFile(taskFilePath, renderTaskDocument(task), "utf8");
  }
}

function normalizeTaskDocumentRef(
  task: TaskSetWriteInput["tasks"][number],
): string {
  const documentRef = task.documentRef?.trim();

  if (documentRef) {
    return documentRef;
  }

  return `task-${task.taskKey}.md`;
}

function ensurePathWithinDirectory(
  rootDirectory: string,
  targetPath: string,
): void {
  const normalizedRoot = resolve(rootDirectory);
  const normalizedTarget = resolve(targetPath);
  const relativePath = relative(normalizedRoot, normalizedTarget);

  if (
    relativePath.startsWith("..") ||
    relativePath.includes("..\\") ||
    relativePath.includes("../")
  ) {
    throw new Error("Task documentRef must stay within the work context.");
  }
}

function renderTaskDocument(task: TaskSetWriteInput["tasks"][number]): string {
  const relyOnTaskKeys =
    task.condition.relyOnTaskKeys.length > 0
      ? task.condition.relyOnTaskKeys.join(", ")
      : "none";
  const inputNeeds =
    task.inputNeeds.length > 0
      ? task.inputNeeds
          .map(
            (inputNeed) =>
              `- ${inputNeed.name}: ${inputNeed.description} (${inputNeed.source})`,
          )
          .join("\n")
      : "- none";

  return [
    `# ${task.name}`,
    ``,
    `- Task Key: ${task.taskKey}`,
    `- Context Ref: ${task.contextRef}`,
    `- Cron: ${task.condition.cron ?? "none"}`,
    `- Rely On: ${relyOnTaskKeys}`,
    ``,
    `## Instruction`,
    task.instruction,
    ``,
    `## Input Needs`,
    inputNeeds,
    ``,
  ].join("\n");
}
