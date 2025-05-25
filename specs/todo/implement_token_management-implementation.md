# User Story Implementation: Implement Token Management

## Story Information
- **Story ID**: US-2
- **Parent Feature**: OAuth Authentication and Authorization
- **Story Points**: 3
- **Priority**: High

## Story Description
As a developer, I want to implement token management, so that tokens are securely stored and refreshed when needed.

## Acceptance Criteria
- [ ] Tokens are stored securely in the database with encryption
- [ ] Token refresh works when access token expires
- [ ] Error handling for failed token refresh
- [ ] Token revocation is handled correctly

## Technical Context
### Existing Codebase Analysis
The current implementation has a placeholder token management system in `src/auth/tokens.ts` that uses an in-memory store. The OAuth flow is implemented in `src/auth/oauth.ts` but currently doesn't store tokens in a database. The database connection is set up in `src/db/connection.ts` using PostgreSQL.

Key files:
- `src/auth/tokens.ts`: Contains placeholder token management functions
- `src/auth/oauth.ts`: Implements the OAuth flow but doesn't store tokens in a database
- `src/db/connection.ts`: Sets up the database connection
- `src/db/models.ts`: Should contain database models but may need to be updated

The current token storage is in-memory only:
```typescript
// In-memory token storage (for development only)
// In production, use a database with proper encryption
const tokenStore: {
  [organizationId: string]: {
    accessToken: string;
    refreshToken: string;
    appUserId: string;
    expiresAt: Date;
  }
} = {};
```

The OAuth callback currently logs tokens but doesn't store them:
```typescript
// TODO: Store the tokens securely in the database
console.log('Access token obtained:', access_token);
```

### Dependencies
- Database connection must be properly set up
- OAuth flow must be implemented correctly
- Environment variables for database connection must be configured

### Technical Constraints
- Tokens must be encrypted at rest
- Token refresh must be automatic and transparent to the user
- Database operations should be efficient and properly error-handled

## Implementation Plan
### Files to Create/Modify
- `src/auth/tokens.ts`: Replace in-memory storage with database storage
- `src/db/models.ts`: Add or update token model
- `src/auth/oauth.ts`: Update to store tokens in the database

### Key Components/Functions
1. **Token Model**: Create a database model for storing tokens
2. **Token Storage**: Implement functions to store tokens in the database
3. **Token Retrieval**: Implement functions to retrieve tokens from the database
4. **Token Refresh**: Implement automatic token refresh when tokens expire
5. **Token Revocation**: Implement token revocation functionality

### Algorithm/Logic Description
1. **Token Storage**:
   - Encrypt the access token and refresh token
   - Store the encrypted tokens in the database along with organization ID, app user ID, and expiration time
   - Return success/failure status

2. **Token Retrieval**:
   - Query the database for tokens associated with the organization ID
   - If tokens are found, decrypt them
   - Check if the access token is expired
   - If expired, attempt to refresh the token
   - Return the valid access token or null if not available

3. **Token Refresh**:
   - Use the refresh token to obtain a new access token from Linear
   - Update the stored tokens with the new access token and expiration time
   - Return the new access token or throw an error if refresh fails

4. **Token Revocation**:
   - Delete the tokens from the database
   - Optionally call Linear's token revocation endpoint

### Data Model Changes
Add a new table `linear_tokens` with the following schema:
```sql
CREATE TABLE linear_tokens (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  app_user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Testing Approach
### Unit Tests
1. **Token Storage Test**:
   - Test storing tokens in the database
   - Verify that tokens are encrypted
   - Verify that all required fields are stored

2. **Token Retrieval Test**:
   - Test retrieving tokens from the database
   - Verify that tokens are decrypted correctly
   - Verify that expired tokens trigger a refresh

3. **Token Refresh Test**:
   - Mock the Linear API to simulate token refresh
   - Verify that tokens are updated in the database
   - Verify error handling for failed refreshes

4. **Token Revocation Test**:
   - Test revoking tokens
   - Verify that tokens are removed from the database

### Integration Tests
1. **OAuth Flow Integration Test**:
   - Test the complete OAuth flow from authorization to token storage
   - Verify that tokens are correctly stored in the database

2. **Token Usage Integration Test**:
   - Test using stored tokens to make API calls
   - Verify that expired tokens are automatically refreshed

### Test Data Requirements
- Mock Linear API responses for token refresh
- Test database with appropriate schema

## Implementation Steps
1. Update the database schema to include the `linear_tokens` table
2. Implement token encryption and decryption functions
3. Update `storeTokens` function to store tokens in the database
4. Update `getAccessToken` function to retrieve tokens from the database
5. Implement token refresh functionality
6. Update `handleOAuthCallback` in `oauth.ts` to use the new token storage
7. Implement token revocation functionality
8. Write unit tests for all token management functions
9. Write integration tests for the complete OAuth flow

## SAFe Considerations
- This implementation supports the SAFe principle of "Build incrementally with fast, integrated learning cycles" by implementing a critical component that enables the agent to interact with Linear.
- The token management system is a foundational component that other features will depend on, making it a high-priority implementation.

## Security Considerations
- Tokens must be encrypted at rest using a strong encryption algorithm (e.g., AES-256)
- Encryption keys should be stored securely, not in the codebase
- Database access should be restricted to authorized users only
- Error messages should not expose sensitive information

## Performance Considerations
- Database queries should be optimized for performance
- Token refresh should be efficient and not block other operations
- Consider caching frequently used tokens in memory for faster access

## Documentation Requirements
- Document the token management API for other developers
- Include examples of how to use the token management functions
- Document the database schema and encryption approach
- Add inline code comments explaining complex logic

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Code follows project coding standards
- [ ] Unit tests are written and passing
- [ ] Integration tests are written and passing
- [ ] Code is reviewed and approved
- [ ] Documentation is updated
- [ ] No new technical debt is introduced (or it is documented)
- [ ] Performance requirements are met
- [ ] Security requirements are met

## Notes for Implementation
- The current implementation uses an in-memory store, which is not suitable for production. Replace it with database storage.
- Be careful with error handling, especially for database operations and API calls.
- Consider using a library like `crypto-js` or Node.js's built-in `crypto` module for encryption.
- Make sure to handle edge cases like token refresh failures gracefully.
- The Linear API documentation for token refresh can be found at: https://developers.linear.app/docs/oauth/token-refresh
