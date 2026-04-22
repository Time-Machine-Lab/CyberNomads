import type { TrafficWorkContextSnapshot } from "../modules/traffic-works/types.js";

export interface TrafficWorkContextStore {
  writeTaskContext(
    trafficWorkId: string,
    taskMarkdown: string,
  ): Promise<TrafficWorkContextSnapshot>;
}
