export type TrafficWorkLifecycleStatus =
  | "ready"
  | "running"
  | "ended"
  | "archived"
  | "deleted";

export type TrafficWorkContextPreparationStatus =
  | "pending"
  | "prepared"
  | "failed";

export interface ObjectBindingItem {
  objectType: string;
  objectKey: string;
  resourceId: string;
  resourceLabel: string | null;
}

export type StrategyParameterBindingType = string;

export interface StrategyParameterBinding {
  type: StrategyParameterBindingType;
  key: string;
  value: string;
}

export interface ProductBindingSummary {
  productId: string;
  name: string;
}

export interface StrategyBindingSummary {
  strategyId: string;
  name: string;
}

export interface TrafficWorkRecord {
  trafficWorkId: string;
  displayName: string;
  productId: string;
  strategyId: string;
  objectBindings: ObjectBindingItem[];
  parameterBindings: StrategyParameterBinding[];
  lifecycleStatus: TrafficWorkLifecycleStatus;
  lifecycleStatusReason: string | null;
  contextPreparationStatus: TrafficWorkContextPreparationStatus;
  contextPreparationStatusReason: string | null;
  contextPreparedAt: string | null;
  lastStartedAt: string | null;
  endedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrafficWorkSummary {
  trafficWorkId: string;
  displayName: string;
  product: ProductBindingSummary;
  strategy: StrategyBindingSummary;
  objectBindingCount: number;
  lifecycleStatus: TrafficWorkLifecycleStatus;
  contextPreparationStatus: TrafficWorkContextPreparationStatus;
  updatedAt: string;
}

export interface TrafficWorkDetail {
  trafficWorkId: string;
  displayName: string;
  product: ProductBindingSummary;
  strategy: StrategyBindingSummary;
  objectBindings: ObjectBindingItem[];
  parameterBindings: StrategyParameterBinding[];
  lifecycleStatus: TrafficWorkLifecycleStatus;
  lifecycleStatusReason: string | null;
  contextPreparationStatus: TrafficWorkContextPreparationStatus;
  contextPreparationStatusReason: string | null;
  contextPreparedAt: string | null;
  lastStartedAt: string | null;
  endedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrafficWorkInput {
  displayName: string;
  productId: string;
  strategyId: string;
  objectBindings: ObjectBindingItem[];
  parameterBindings: StrategyParameterBinding[];
}

export interface UpdateTrafficWorkInput {
  displayName: string;
  productId: string;
  strategyId: string;
  objectBindings: ObjectBindingItem[];
  parameterBindings: StrategyParameterBinding[];
}

export interface ListTrafficWorksFilters {
  productId?: string;
  strategyId?: string;
  keyword?: string;
  lifecycleStatus?: TrafficWorkLifecycleStatus;
  contextPreparationStatus?: TrafficWorkContextPreparationStatus;
}

export interface ListTrafficWorksResult {
  items: TrafficWorkSummary[];
}

export interface TrafficWorkContextSnapshot {
  workDirectory: string;
  taskFilePath: string;
  taskMarkdown: string;
}
