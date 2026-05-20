export interface TaskDecompositionArchiveStorePort {
  writeTaskDocument(input: {
    trafficWorkId: string;
    documentRef: string;
    content: string;
  }): Promise<string>;
  writeRunArtifact(input: {
    trafficWorkId: string;
    decompositionRunId: string;
    fileName: string;
    content: string;
  }): Promise<string>;
}
