export type RuntimeAgentResourceType = "skill" | "knowledge";

export interface CopyRuntimeAgentResourceInput {
  resourceType: RuntimeAgentResourceType;
  resourcePath: string;
  targetRootDirectory: string;
}

export interface CopyRuntimeAgentResourceResult {
  resourceType: RuntimeAgentResourceType;
  sourceAbsolutePath: string;
  sourceRuntimeRelativePath: string;
  targetAbsolutePath: string;
  targetRuntimeRelativePath: string;
}

export interface RuntimeAgentResourceStorePort {
  copyRuntimeAgentResource(
    input: CopyRuntimeAgentResourceInput,
  ): Promise<CopyRuntimeAgentResourceResult>;
}
