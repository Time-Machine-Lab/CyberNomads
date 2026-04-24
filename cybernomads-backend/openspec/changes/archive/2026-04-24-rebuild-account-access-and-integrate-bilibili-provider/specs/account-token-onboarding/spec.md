## REMOVED Requirements

### Requirement: Account token onboarding SHALL manage a pre-account onboarding session
**Reason**: The rebuilt model eliminates both pre-account onboarding and the residual onboarding-centered language, replacing them with account-bound access sessions.
**Migration**: Create the wrapper account first, then run token or QR access through `account-access-sessions`.

### Requirement: Account token onboarding SHALL resolve platform identity and candidate token before account creation
**Reason**: Resolved platform identity is not part of account creation in the rebuilt model.
**Migration**: Move all credential resolution and verification into access sessions attached to an already created account.

### Requirement: Account token onboarding SHALL finalize only from a verified onboarding session
**Reason**: The rebuilt model writes verified credentials directly onto the existing wrapper account from an access session.
**Migration**: Replace onboarding finalization with access-session verification and apply-on-success behavior.
