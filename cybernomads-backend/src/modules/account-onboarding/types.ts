import type { AccountDetail, JsonObject } from "../accounts/types.js";

export type AccountOnboardingSessionStatus =
  | "pending_resolution"
  | "resolved"
  | "resolution_failed"
  | "expired"
  | "consumed"
  | "canceled";

export type AccountOnboardingFinalDisposition =
  | "created"
  | "restored"
  | "existing";

export interface StartAccountOnboardingSessionInput {
  platform: string;
  authorizationMethod: string;
  expectedCredentialType?: string | null;
  payload?: JsonObject;
  expiresAt?: string | null;
}

export interface ResolveAccountOnboardingSessionInput {
  resolutionPayload?: JsonObject;
}

export interface AccountOnboardingResolvedIdentity {
  platform: string;
  platformAccountUid: string;
}

export interface AccountOnboardingResolvedProfile {
  displayName: string | null;
  platformMetadata: JsonObject;
}

export interface AccountOnboardingSessionDetail {
  sessionId: string;
  platform: string;
  authorizationMethod: string;
  expectedCredentialType: string | null;
  sessionStatus: AccountOnboardingSessionStatus;
  sessionStatusReason: string | null;
  challenge: JsonObject | null;
  resolvedIdentity: AccountOnboardingResolvedIdentity | null;
  resolvedProfile: AccountOnboardingResolvedProfile | null;
  hasCandidateCredential: boolean;
  candidateCredentialType: string | null;
  finalDisposition: AccountOnboardingFinalDisposition | null;
  targetAccountId: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinalizeAccountOnboardingSessionResponse {
  sessionId: string;
  finalDisposition: AccountOnboardingFinalDisposition;
  accountId: string;
  account: AccountDetail;
}

export interface AccountOnboardingSessionRecord {
  sessionId: string;
  platform: string;
  authorizationMethod: string;
  expectedCredentialType: string | null;
  inputPayloadRef: string | null;
  platformSessionPayloadRef: string | null;
  challenge: JsonObject | null;
  sessionStatus: AccountOnboardingSessionStatus;
  sessionStatusReason: string | null;
  resolvedPlatformAccountUid: string | null;
  resolvedDisplayName: string | null;
  resolvedProfile: JsonObject;
  candidateCredentialType: string | null;
  candidateCredentialRef: string | null;
  finalDisposition: AccountOnboardingFinalDisposition | null;
  targetAccountId: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
