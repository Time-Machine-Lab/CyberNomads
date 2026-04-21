import type { AccountPlatformPort } from "../../ports/account-platform-port.js";

export interface AccountPlatformRegistry {
  resolve(platformCode: string): AccountPlatformPort | undefined;
}

export function createAccountPlatformRegistry(
  platforms: Iterable<AccountPlatformPort>,
): AccountPlatformRegistry {
  const registeredPlatforms = new Map<string, AccountPlatformPort>();

  for (const platform of platforms) {
    registeredPlatforms.set(normalizeCode(platform.platformCode), platform);
  }

  return {
    resolve(platformCode: string): AccountPlatformPort | undefined {
      return registeredPlatforms.get(normalizeCode(platformCode));
    },
  };
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}
