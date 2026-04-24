import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import type { AgentAccessService } from "../../modules/agent-access/service.js";
import type { TaskSetWriteInput } from "../../modules/tasks/types.js";
import type {
  PrepareTrafficWorkContextInput,
  TrafficWorkContextPreparationPort,
} from "../../ports/traffic-work-context-preparation-port.js";

export class AgentAccessTrafficWorkContextPreparationAdapter implements TrafficWorkContextPreparationPort {
  constructor(private readonly agentAccessService: AgentAccessService) {}

  async prepareContext(
    input: PrepareTrafficWorkContextInput,
  ): ReturnType<TrafficWorkContextPreparationPort["prepareContext"]> {
    const objectBindings = input.objectBindings
      .map(
        (item) =>
          `- ${item.objectType}:${item.objectKey} -> ${item.resourceId}${
            item.resourceLabel ? ` (${item.resourceLabel})` : ""
          }`,
      )
      .join("\n");

    const result = await this.agentAccessService.submitTaskDecompositionRequest(
      {
        title: `traffic-work:${input.trafficWorkId}`,
        context: input.contextMarkdown,
        prompt: [
          `Decompose this Cybernomads traffic work into an atomic task set.`,
          `Traffic work ID: ${input.trafficWorkId}`,
          `Display name: ${input.displayName}`,
          `Product: ${input.product.productId} (${input.product.name})`,
          `Product content:`,
          input.productContentMarkdown,
          `Strategy: ${input.strategy.strategyId} (${input.strategy.name})`,
          `Strategy content:`,
          input.strategyContentMarkdown,
          `Work context root: ${input.context.workDirectory}`,
          `Work skills directory: ${input.context.skillsDirectory}`,
          `Work tools directory: ${input.context.toolsDirectory}`,
          `Work knowledge directory: ${input.context.knowledgeDirectory}`,
          `Work data directory: ${input.context.dataDirectory}`,
          `Object bindings:`,
          objectBindings,
          `Use $cybernomads-task-decomposition when decomposing this traffic work into tasks.`,
          `Return a task set with source.kind = "agent-decomposition" and task drafts that include taskKey, name, instruction, documentRef, contextRef, condition, and inputNeeds.`,
          `Stay within work-level context preparation. Do not design task scheduling, task execution, log structures, or platform script internals.`,
        ].join("\n"),
      },
    );

    await materializeTaskDocuments(input.context.workDirectory, result.taskSet);

    return result.taskSet;
  }
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
