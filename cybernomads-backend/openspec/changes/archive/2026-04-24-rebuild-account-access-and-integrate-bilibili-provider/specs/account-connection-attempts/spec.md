## REMOVED Requirements

### Requirement: Account connection attempts SHALL be bound to an existing wrapper account
**Reason**: The old `connection attempt` language is being replaced by `access session`, which better matches the new account-access workspace semantics and QR polling behavior.
**Migration**: Replace connection-attempt resources, DTOs, routes, and page copy with account-bound `access session` resources.

### Requirement: Account connection attempts SHALL resolve token material before validation
**Reason**: The rebuilt flow distinguishes explicit QR polling from verification instead of relying on a generic resolve step.
**Migration**: Replace generic resolve semantics with `poll` for QR sessions and direct verify semantics for candidate credentials.

### Requirement: Account connection attempts SHALL validate by calling platform profile retrieval and apply the token only on success
**Reason**: This behavior moves into the new access-session capability with connection-centric language and updated provider abstractions.
**Migration**: Re-express the same token-application invariant under `account-access-sessions`.

### Requirement: Account connection attempts SHALL expose current and recent logs through the attempt resource
**Reason**: Session-scoped log behavior remains valid but now belongs to the renamed access-session capability.
**Migration**: Move log-reading semantics into `account-access-sessions`.
