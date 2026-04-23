## REMOVED Requirements

### Requirement: Account token onboarding SHALL manage a pre-account onboarding session
**Reason**: The new model creates the wrapper account first and no longer uses a pre-account onboarding session.
**Migration**: Create the account object through the minimal create page and start a connection attempt from the account detail workspace when token access is needed.

### Requirement: Account token onboarding SHALL resolve platform identity and candidate token before account creation
**Reason**: Platform identity is no longer required before account creation and is no longer the system's primary business identity.
**Migration**: Move candidate-token resolution into account-bound connection attempts and treat resolved platform identity as profile data on the existing account.

### Requirement: Account token onboarding SHALL finalize only from a verified onboarding session
**Reason**: The new model removes the separate finalize phase and applies validated tokens directly to the existing wrapper account.
**Migration**: Replace onboarding-session finalization with connection-attempt validation that writes the current token and refreshes resolved platform profile fields on success.
