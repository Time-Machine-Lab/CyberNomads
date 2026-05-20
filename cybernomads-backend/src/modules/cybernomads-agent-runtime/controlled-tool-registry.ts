import type {
  ControlledToolRegistryEntry,
  ControlledToolRegistryPort,
} from "../../ports/controlled-tool-registry-port.js";

const CONTROLLED_TOOLS: ControlledToolRegistryEntry[] = [
  {
    name: "readTrafficWorkContext",
    riskLevel: "read_only",
    caller: "agent",
    summary: "Read product, strategy, object bindings, prior feedback, and execution failure summaries.",
  },
  {
    name: "listAvailableSkills",
    riskLevel: "read_only",
    caller: "agent",
    summary: "List Cybernomads Skills available to reference in a task plan draft.",
  },
  {
    name: "saveTaskPlanDraft",
    riskLevel: "draft",
    caller: "agent",
    summary: "Persist a structured task plan draft artifact after schema validation.",
  },
  {
    name: "saveReviewReport",
    riskLevel: "draft",
    caller: "agent",
    summary: "Persist a Review report artifact after schema validation.",
  },
  {
    name: "commitConfirmedTaskSet",
    riskLevel: "system_submit",
    caller: "orchestrator",
    summary: "Create or replace formal tasks from a user-confirmed snapshot.",
  },
  {
    name: "markTrafficWorkPrepared",
    riskLevel: "system_submit",
    caller: "orchestrator",
    summary: "Mark traffic work context preparation as prepared after formal task persistence succeeds.",
  },
];

export class StaticControlledToolRegistry implements ControlledToolRegistryPort {
  async listTools(): Promise<ControlledToolRegistryEntry[]> {
    return CONTROLLED_TOOLS.map((tool) => ({ ...tool }));
  }
}
