import type {
  AvailabilityStatus,
  ConnectionMethod,
  JsonObject,
  ResolvedPlatformProfile,
  ValidationResult,
} from "../modules/accounts/types.js";
import type { ConnectionAttemptLogEntry } from "../modules/account-connection-attempts/types.js";

export interface AccountPlatformAccountSnapshot {
  accountId: string;
  platform: string;
  internalDisplayName: string;
  platformMetadata: JsonObject;
  resolvedPlatformProfile: ResolvedPlatformProfile;
}

export interface AccountPlatformStartConnectionAttemptInput {
  account: AccountPlatformAccountSnapshot;
  connectionMethod: ConnectionMethod;
  tokenValue: string | null;
  context: JsonObject;
  requestedExpiresAt: string | null;
}

export interface AccountPlatformStartConnectionAttemptResult {
  challenge: JsonObject | null;
  platformSession: JsonObject | null;
  candidateToken: JsonObject | null;
  expiresAt: string | null;
  logs: ConnectionAttemptLogEntry[];
}

export interface AccountPlatformResolveConnectionAttemptInput {
  account: AccountPlatformAccountSnapshot;
  connectionMethod: ConnectionMethod;
  context: JsonObject;
  platformSession: JsonObject;
  resolutionPayload: JsonObject;
}

export interface AccountPlatformResolveConnectionAttemptResult {
  platformSession: JsonObject | null;
  candidateToken: JsonObject | null;
  reason: string | null;
  expiresAt: string | null;
  logs: ConnectionAttemptLogEntry[];
}

export interface AccountPlatformValidateConnectionAttemptInput {
  account: AccountPlatformAccountSnapshot;
  connectionMethod: ConnectionMethod;
  candidateToken: JsonObject;
  context: JsonObject;
  validationPayload: JsonObject;
}

export interface AccountPlatformValidateConnectionAttemptResult {
  validationResult: ValidationResult;
  reason: string | null;
  resolvedPlatformProfile: ResolvedPlatformProfile | null;
  token: JsonObject | null;
  tokenExpiresAt: string | null;
  logs: ConnectionAttemptLogEntry[];
}

export interface AccountPlatformAvailabilityCheckInput {
  account: AccountPlatformAccountSnapshot;
  activeToken: JsonObject;
}

export interface AccountPlatformAvailabilityCheckResult {
  availabilityStatus: AvailabilityStatus;
  reason: string | null;
}

export interface AccountPlatformPort {
  platformCode: string;
  startConnectionAttempt(
    input: AccountPlatformStartConnectionAttemptInput,
  ): Promise<AccountPlatformStartConnectionAttemptResult>;
  resolveConnectionAttempt(
    input: AccountPlatformResolveConnectionAttemptInput,
  ): Promise<AccountPlatformResolveConnectionAttemptResult>;
  validateConnectionAttempt(
    input: AccountPlatformValidateConnectionAttemptInput,
  ): Promise<AccountPlatformValidateConnectionAttemptResult>;
  checkAvailability(
    input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult>;
}
