import type { TrafficWorkContextSnapshot } from "../modules/traffic-works/types.js";

export interface TrafficWorkContextStore {
  ensureWorkContext(
    trafficWorkId: string,
  ): Promise<TrafficWorkContextSnapshot>;
}
