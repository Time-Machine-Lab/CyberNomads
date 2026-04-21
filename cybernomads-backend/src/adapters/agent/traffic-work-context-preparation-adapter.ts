import type { AgentAccessService } from "../../modules/agent-access/service.js";
import type {
  PrepareTrafficWorkContextInput,
  TrafficWorkContextPreparationPort,
} from "../../ports/traffic-work-context-preparation-port.js";

export class AgentAccessTrafficWorkContextPreparationAdapter implements TrafficWorkContextPreparationPort {
  constructor(private readonly agentAccessService: AgentAccessService) {}

  async prepareContext(input: PrepareTrafficWorkContextInput): Promise<void> {
    const objectBindings = input.objectBindings
      .map(
        (item) =>
          `- ${item.objectType}:${item.objectKey} -> ${item.resourceId}${
            item.resourceLabel ? ` (${item.resourceLabel})` : ""
          }`,
      )
      .join("\n");

    await this.agentAccessService.submitTaskPlanningRequest({
      title: `traffic-work:${input.trafficWorkId}`,
      context: input.context.taskMarkdown,
      prompt: [
        `Prepare the work-level context for a Cybernomads traffic work.`,
        `Traffic work ID: ${input.trafficWorkId}`,
        `Display name: ${input.displayName}`,
        `Product: ${input.product.productId} (${input.product.name})`,
        `Strategy: ${input.strategy.strategyId} (${input.strategy.name})`,
        `Context directory: ${input.context.workDirectory}`,
        `Task file: ${input.context.taskFilePath}`,
        `Object bindings:`,
        objectBindings,
        `Stay within work-level context preparation. Do not design task scheduling, task execution, log structures, or platform script internals.`,
      ].join("\n"),
    });
  }
}
