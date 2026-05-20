import type {
  PrepareTrafficWorkContextInput,
  TrafficWorkContextPreparationPort,
} from "../../../ports/traffic-work-context-preparation-port.js";
import type { TaskDecompositionRunService } from "../../../modules/task-decomposition-runs/service.js";

export class CybernomadsAgentTrafficWorkContextPreparationAdapter
  implements TrafficWorkContextPreparationPort
{
  constructor(
    private readonly options: {
      taskDecompositionRunService: Pick<TaskDecompositionRunService, "startRun">;
    },
  ) {}

  async prepareContext(
    input: PrepareTrafficWorkContextInput,
  ): ReturnType<TrafficWorkContextPreparationPort["prepareContext"]> {
    const run = await this.options.taskDecompositionRunService.startRun({
      trafficWorkId: input.trafficWorkId,
      displayName: input.displayName,
      contextMarkdown: input.contextMarkdown,
      taskSetMode: input.taskSetMode,
    });

    return {
      decompositionRunId: run.decompositionRunId,
      status: run.status,
      stage: run.stage,
      summary: run.latestSummary,
    };
  }
}
