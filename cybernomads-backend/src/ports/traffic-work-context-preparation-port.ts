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
  strategy: StrategyBindingSummary;
  objectBindings: ObjectBindingItem[];
  context: TrafficWorkContextSnapshot;
}

export interface TrafficWorkContextPreparationPort {
  prepareContext(input: PrepareTrafficWorkContextInput): Promise<void>;
}
