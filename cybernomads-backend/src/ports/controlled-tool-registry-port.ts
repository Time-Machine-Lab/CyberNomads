export type ControlledToolRiskLevel = "read_only" | "draft" | "system_submit";

export interface ControlledToolRegistryEntry {
  name: string;
  riskLevel: ControlledToolRiskLevel;
  caller: "agent" | "orchestrator";
  summary: string;
}

export interface ControlledToolRegistryPort {
  listTools(): Promise<ControlledToolRegistryEntry[]>;
}
