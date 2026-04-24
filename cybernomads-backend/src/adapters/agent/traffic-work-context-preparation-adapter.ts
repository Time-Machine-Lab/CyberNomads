import type { AgentAccessService } from "../../modules/agent-access/service.js";
import type {
  PrepareTrafficWorkContextInput,
  TrafficWorkContextPreparationPort,
} from "../../ports/traffic-work-context-preparation-port.js";

export class AgentAccessTrafficWorkContextPreparationAdapter implements TrafficWorkContextPreparationPort {
  constructor(private readonly agentAccessService: AgentAccessService) {}

  async prepareContext(
    input: PrepareTrafficWorkContextInput,
  ): ReturnType<TrafficWorkContextPreparationPort["prepareContext"]> {
    const objectBindings =
      input.objectBindings.length > 0
        ? input.objectBindings
            .map(
              (item) =>
                `- ${item.objectType}:${item.objectKey} -> ${item.resourceId}${
                  item.resourceLabel ? ` (${item.resourceLabel})` : ""
                }`,
            )
            .join("\n")
        : "- none";

    const result = await this.agentAccessService.submitTaskDecompositionRequest(
      {
        title: `traffic-work:${input.trafficWorkId}`,
        context: input.context.taskMarkdown,
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
          `Context directory: ${input.context.workDirectory}`,
          `Task file: ${input.context.taskFilePath}`,
          `Object bindings:`,
          objectBindings,
          `Use $cybernomads-task-decomposition when decomposing this traffic work into tasks.`,
          `Return a task set with source.kind = "agent-decomposition" and task drafts that include taskKey, name, instruction, documentRef, contextRef, condition, and inputNeeds.`,
          `Stay within work-level context preparation. Do not design task scheduling, task execution, log structures, or platform script internals.`,
        ].join("\n"),
      },
    );

    return result.taskSet;
  }
}
