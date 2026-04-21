export interface InterventionRecord {
  id: string
  workspaceId: string
  taskId: string
  command: string
  response: string
  actor: string
  createdAt: string
  severity?: 'info' | 'warning'
}
