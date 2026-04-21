import type {
  AvailabilityStatus,
  JsonObject,
  VerificationResult,
} from "../modules/accounts/types.js";

export interface AccountPlatformAccountSnapshot {
  accountId: string;
  platform: string;
  platformAccountUid: string;
  displayName: string;
  platformMetadata: JsonObject;
}

export interface AccountPlatformCredentialSnapshot {
  credentialType: string;
  payload: JsonObject;
  expiresAt: string | null;
}

export interface AccountPlatformAuthorizationStartInput {
  account: AccountPlatformAccountSnapshot;
  authorizationMethod: string;
  expectedCredentialType: string | null;
  payload: JsonObject;
  requestedExpiresAt: string | null;
}

export interface AccountPlatformAuthorizationStartResult {
  expectedCredentialType: string | null;
  attemptPayload: JsonObject;
  expiresAt: string | null;
  challenge: JsonObject | null;
}

export interface AccountPlatformAuthorizationVerifyInput {
  account: AccountPlatformAccountSnapshot;
  authorizationMethod: string;
  expectedCredentialType: string | null;
  attemptPayload: JsonObject;
  verificationPayload: JsonObject;
  activeCredential: AccountPlatformCredentialSnapshot | null;
}

export interface AccountPlatformResolvedIdentity {
  platform: string;
  platformAccountUid: string;
}

export interface AccountPlatformResolvedProfile {
  displayName?: string | null;
  platformMetadata?: JsonObject | null;
}

export interface AccountPlatformResolvedCredential {
  credentialType: string;
  payload: JsonObject;
  expiresAt: string | null;
}

export interface AccountPlatformAuthorizationVerifyResult {
  verificationResult: VerificationResult;
  reason: string | null;
  resolvedIdentity: AccountPlatformResolvedIdentity | null;
  profile: AccountPlatformResolvedProfile | null;
  credential: AccountPlatformResolvedCredential | null;
}

export interface AccountPlatformAvailabilityCheckInput {
  account: AccountPlatformAccountSnapshot;
  activeCredential: AccountPlatformCredentialSnapshot;
}

export interface AccountPlatformAvailabilityCheckResult {
  availabilityStatus: AvailabilityStatus;
  reason: string | null;
}

export interface AccountPlatformPort {
  platformCode: string;
  startAuthorizationAttempt(
    input: AccountPlatformAuthorizationStartInput,
  ): Promise<AccountPlatformAuthorizationStartResult>;
  verifyAuthorizationAttempt(
    input: AccountPlatformAuthorizationVerifyInput,
  ): Promise<AccountPlatformAuthorizationVerifyResult>;
  checkAvailability(
    input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult>;
}
