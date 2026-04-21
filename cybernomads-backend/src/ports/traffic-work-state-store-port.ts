import type { TrafficWorkRecord } from "../modules/traffic-works/types.js";

export interface TrafficWorkStateStore {
  createTrafficWork(record: TrafficWorkRecord): Promise<void>;
  saveTrafficWork(record: TrafficWorkRecord): Promise<void>;
  getTrafficWorkById(
    trafficWorkId: string,
  ): Promise<TrafficWorkRecord | undefined>;
  listTrafficWorks(): Promise<TrafficWorkRecord[]>;
  close(): void;
}
