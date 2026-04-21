export type AccountStatus = 'connected' | 'needs-auth' | 'error'

export interface AccountRecord {
  id: string
  name: string
  platform: string
  owner: string
  uid: string
  avatarUrl?: string
  tags: string[]
  statusLabel?: string
  lastActiveLabel?: string
  status: AccountStatus
  lastSyncedAt: string
}
