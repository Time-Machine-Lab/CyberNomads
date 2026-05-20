import type {
  ObjectBindingItem,
  ProductBindingSummary,
  StrategyBindingSummary,
  TrafficWorkContextSnapshot,
} from "../modules/traffic-works/types.js";

export interface PrepareTrafficWorkContextInput {
  trafficWorkId: string;
  displayName: string;
  product: ProductBindingSummary;
  productContentMarkdown: string;
  strategy: StrategyBindingSummary;
  strategyContentMarkdown: string;
  objectBindings: ObjectBindingItem[];
  contextMarkdown: string;
  context: TrafficWorkContextSnapshot;
  taskSetMode: "create" | "replace";
}

export interface TrafficWorkContextPreparationPort {
  prepareContext(input: PrepareTrafficWorkContextInput): Promise<{
    decompositionRunId: string;
    status: "running" | "waiting_user_confirmation" | "committed" | "failed" | "awaiting_user_feedback";
    stage: string;
    summary: string | null;
  }>;
}
