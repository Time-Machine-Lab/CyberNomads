import type {
  ObjectBindingItem,
  ProductBindingSummary,
  StrategyBindingSummary,
  TrafficWorkContextSnapshot,
} from "../modules/traffic-works/types.js";
import type { TaskSetWriteInput } from "../modules/tasks/types.js";

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
}

export interface TrafficWorkContextPreparationPort {
  prepareContext(
    input: PrepareTrafficWorkContextInput,
  ): Promise<TaskSetWriteInput>;
}
