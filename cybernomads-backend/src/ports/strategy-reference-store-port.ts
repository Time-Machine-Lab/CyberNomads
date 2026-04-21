import type { StrategyBindingSummary } from "../modules/traffic-works/types.js";

export interface StrategyReferenceStore {
  getStrategyReferenceById(
    strategyId: string,
  ): Promise<StrategyBindingSummary | undefined>;
}
