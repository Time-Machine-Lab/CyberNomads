import { access } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import type { AgentAccessService } from "../../modules/agent-access/service.js";
import type {
  PrepareTrafficWorkContextInput,
  TrafficWorkContextPreparationPort,
} from "../../ports/traffic-work-context-preparation-port.js";
import { CYBERNOMADS_TASK_DECOMPOSITION_SKILL } from "../../shared/agent-task-skill-instructions.js";
import {
  resolveRuntimeInstalledKnowledgeFile,
  resolveRuntimeInstalledSkillFile,
} from "../skill/local/runtime-skill-assets.js";

const TRAFFIC_TASK_DOCUMENT_TEMPLATE_FILE = "引流任务文档模板.md";

export class AgentAccessTrafficWorkContextPreparationAdapter implements TrafficWorkContextPreparationPort {
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
    const runtimeKnowledgeDirectory = resolve(
      runtimeRootDirectory,
      "agent",
      "knowledge",
    );
    const taskDocumentTemplateFile = await resolveRuntimeInstalledKnowledgeFile(
      runtimeKnowledgeDirectory,
      TRAFFIC_TASK_DOCUMENT_TEMPLATE_FILE,
    );
    await ensurePathExists(
      taskDecompositionSkillFile,
      "task decomposition Skill file",
    );
    await ensurePathExists(
      taskDocumentTemplateFile,
      "traffic task document template file",
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
    const taskDocumentTemplateRelativePath = toRuntimeRelativePath(
      runtimeRootDirectory,
      taskDocumentTemplateFile,
      "traffic task document template file",
    );

    return this.options.agentAccessService.submitTaskDecompositionRequest({
      title: `traffic-work:${input.trafficWorkId}`,
      context: input.contextMarkdown,
      prompt: buildTaskDecompositionPrompt({
        input,
        runtimeRootDirectory,
        trafficWorkDirectoryRelativePath,
        taskDecompositionSkillRelativePath,
        taskDocumentTemplateRelativePath,
      }),
    });
  }
}

function buildTaskDecompositionPrompt(input: {
  input: PrepareTrafficWorkContextInput;
  runtimeRootDirectory: string;
  trafficWorkDirectoryRelativePath: string;
  taskDecompositionSkillRelativePath: string;
  taskDocumentTemplateRelativePath: string;
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
    `[任务文档模板信息]`,
    `任务文档模板位置: ${input.taskDocumentTemplateRelativePath}`,
    ``,
    `说明:`,
    `- “任务文档模板位置”是本次任务 Markdown 文档的全局结构模板。`,
    `- 你需要先理解该模板中要求的必要模块，再整理 taskSet 和后续任务文档内容。`,
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
    `3. 请再读取“任务文档模板位置”，并按模板要求理解每个任务文档必须具备的模块结构。`,
    `4. 你不需要等待后端创建任务或创建任务文档，这两部分都由你在 Skill 流程中自行完成。`,
    `5. 你必须先使用受控工具把任务元数据保存到 task 表；只有保存成功后，才能继续创建任务文档。`,
    `6. 每个任务的 documentRef 必须是 ./<taskKey>.md，且任务文档必须位于当前引流工作目录根目录。`,
    `7. 任务文档中出现的 Skill、Tools、Knowledge、Data 资源路径，必须采用以当前引流工作目录为根的相对路径。`,
    `8. 当任务元数据、任务文档、资源准备和自检全部完成后，你必须通过受控工具回写当前引流工作的 contextPreparationStatus。`,
  ].join("\n");
}

function renderObjectBindings(input: PrepareTrafficWorkContextInput): string {
  if (input.objectBindings.length === 0) {
    return `- none`;
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
