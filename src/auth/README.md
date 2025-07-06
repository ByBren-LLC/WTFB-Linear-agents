# Authentication & Security System

## Overview

The SAFe PULSE Linear Agent authentication system provides secure OAuth 2.0 integration with both Linear and Confluence platforms. It handles token management, automatic refresh, secure storage, and session management for web-based OAuth flows.

### Key Features

- **Dual OAuth Support**: Complete OAuth 2.0 flows for Linear and Confluence
- **Automatic Token Refresh**: Seamless token renewal without user intervention
- **Secure Storage**: Encrypted token storage in database with expiration tracking
- **Session Management**: Stateful OAuth flows with secure session handling
- **Error Recovery**: Comprehensive error handling and recovery patterns
- **Enterprise Security**: Production-ready security best practices

### Integration Points

- **Linear API**: Full read/write access with app mentionable capabilities
- **Confluence API**: Content and space access for document synchronization
- **Database Layer**: Secure token persistence with encryption
- **Webhook System**: Authenticated webhook processing
- **Planning APIs**: Secure access to planning and synchronization endpoints

## Architecture

### Component Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OAuth Flow    │    │ Token Manager   │    │ Database Layer  │
│                 │    │                 │    │                 │
│ • Linear OAuth  │◄──►│ • Store Tokens  │◄──►│ • Encrypted     │
│ • Confluence    │    │ • Refresh Logic │    │   Storage       │
│   OAuth         │    │ • Validation    │    │ • Expiration    │
│ • Session Mgmt  │    │ • Error Handling│    │   Tracking      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### OAuth Flow Architecture

**Linear OAuth Flow**:
1. User initiates OAuth at `/auth`
2. Redirect to Linear authorization server
3. Callback handling at `/auth/callback`
4. Token exchange and validation
5. Secure storage with organization mapping

**Confluence OAuth Flow**:
1. User initiates OAuth at `/auth/confluence`
2. Redirect to Atlassian authorization server
3. Callback handling at `/auth/confluence/callback`
4. Resource discovery and site URL resolution
5. Secure storage with organization mapping

### Security Design Patterns

- **State Management**: Session-based OAuth state tracking
- **Token Encryption**: Database-level encryption for sensitive tokens
- **Automatic Refresh**: Proactive token renewal before expiration
- **Error Isolation**: Graceful degradation on authentication failures
- **Audit Logging**: Comprehensive security event logging

## API Reference

### OAuth Initiation

#### `initiateOAuth(req: Request, res: Response)`

Initiates the Linear OAuth flow by redirecting to Linear's authorization page.

**Environment Variables Required**:
- `LINEAR_CLIENT_ID`: Linear OAuth application client ID
- `LINEAR_REDIRECT_URI`: Callback URL for OAuth flow

**OAuth Scopes**: `read write app:assignable app:mentionable`

**Example Usage**:
```typescript
// GET /auth
// Automatically redirects to Linear OAuth
```

#### `initiateConfluenceOAuth(req: Request, res: Response)`

Initiates the Confluence OAuth flow by redirecting to Atlassian's authorization server.

**Environment Variables Required**:
- `CONFLUENCE_CLIENT_ID`: Confluence OAuth application client ID
- `APP_URL`: Base application URL for callback construction

**OAuth Scopes**: 
- `read:confluence-content.summary`
- `read:confluence-space.summary` 
- `read:confluence-content.all`
- `read:confluence-space.all`

### OAuth Callbacks

#### `handleOAuthCallback(req: Request, res: Response)`

Handles the OAuth callback from Linear, exchanges authorization code for access token.

**Process Flow**:
1. Validates authorization code
2. Exchanges code for access token
3. Retrieves organization information
4. Stores tokens securely in database
5. Redirects to success page

**Error Handling**:
- Missing authorization code (400)
- Invalid OAuth credentials (500)
- Token exchange failures (500)
- Organization lookup failures (500)

#### `handleConfluenceCallback(req: Request, res: Response)`

Handles the OAuth callback from Confluence, exchanges authorization code for access token.

**Process Flow**:
1. Validates authorization code and state
2. Exchanges code for access token
3. Discovers accessible Confluence resources
4. Resolves site URL for API access
5. Stores tokens with site information
6. Redirects to success page

### Token Management

#### `storeTokens(organizationId, organizationName, accessToken, refreshToken, appUserId, expiresIn)`

Stores OAuth tokens for a Linear organization with automatic expiration calculation.

**Parameters**:
- `organizationId`: Linear organization identifier
- `organizationName`: Human-readable organization name
- `accessToken`: OAuth access token
- `refreshToken`: OAuth refresh token (nullable)
- `appUserId`: Linear app user identifier
- `expiresIn`: Token expiration time in seconds

**Features**:
- Automatic expiration date calculation
- Upsert operation (insert or update)
- Comprehensive error logging

#### `refreshToken(organizationId: string): Promise<string | null>`

Automatically refreshes an expired access token using the stored refresh token.

**Process Flow**:
1. Retrieves stored token data
2. Validates refresh token availability
3. Exchanges refresh token for new access token
4. Updates stored tokens with new values
5. Returns new access token or null on failure

**Error Handling**:
- Missing refresh token
- Invalid OAuth credentials
- Token exchange failures
- Database update failures

#### `getAccessToken(organizationId: string): Promise<string | null>`

Retrieves a valid access token for an organization, automatically refreshing if expired.

**Smart Token Management**:
- Checks database for valid token
- Automatically triggers refresh if expired
- Returns null if no valid token available
- Comprehensive error logging

### Security Features

#### Token Encryption

All tokens are encrypted before database storage using the `ENCRYPTION_KEY` environment variable.

**Implementation**:
```typescript
// Tokens are automatically encrypted in database layer
await storeLinearToken(orgId, accessToken, refreshToken, userId, expiresAt);
```

#### Session Security

OAuth flows use secure session management with the following configuration:

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

#### Environment Variable Security

**Required Variables**:
```bash
# Linear OAuth
LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_client_secret
LINEAR_REDIRECT_URI=http://localhost:3000/auth/callback

# Confluence OAuth  
CONFLUENCE_CLIENT_ID=your_confluence_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_client_secret

# Security
ENCRYPTION_KEY=generate_a_strong_random_key_at_least_32_chars
SESSION_SECRET=your_session_secret

# Application
APP_URL=http://localhost:3000
```

## Integration Guide

### Setting Up OAuth Applications

#### Linear OAuth Application

1. Go to Linear Settings → API → OAuth Applications
2. Create new OAuth application
3. Set redirect URI to `{APP_URL}/auth/callback`
4. Copy client ID and secret to environment variables
5. Set scopes: `read write app:assignable app:mentionable`

#### Confluence OAuth Application

1. Go to Atlassian Developer Console
2. Create new OAuth 2.0 (3LO) app
3. Set callback URL to `{APP_URL}/auth/confluence/callback`
4. Add required scopes for Confluence content access
5. Copy client ID and secret to environment variables

### Database Setup

The authentication system requires the following database tables:

```sql
-- Linear tokens table
CREATE TABLE linear_tokens (
  id SERIAL PRIMARY KEY,
  organization_id VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  app_user_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Confluence tokens table  
CREATE TABLE confluence_tokens (
  id SERIAL PRIMARY KEY,
  organization_id VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  site_url VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Express Route Integration

```typescript
import { initiateOAuth, handleOAuthCallback } from './auth/oauth';
import { initiateConfluenceOAuth, handleConfluenceCallback } from './auth/confluence-oauth';

// Linear OAuth routes
app.get('/auth', initiateOAuth);
app.get('/auth/callback', handleOAuthCallback);

// Confluence OAuth routes
app.get('/auth/confluence', initiateConfluenceOAuth);
app.get('/auth/confluence/callback', handleConfluenceCallback);
```

## Examples

### Basic OAuth Flow

```typescript
// User visits /auth to start Linear OAuth
// System redirects to Linear authorization
// User authorizes application
// Linear redirects to /auth/callback with code
// System exchanges code for tokens and stores securely
```

### Token Usage in API Calls

```typescript
import { getAccessToken } from './auth/tokens';

async function makeLinearAPICall(organizationId: string) {
  const token = await getAccessToken(organizationId);
  
  if (!token) {
    throw new Error('No valid token available');
  }
  
  const response = await fetch('https://api.linear.app/graphql', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({ query: '...' })
  });
  
  return response.json();
}
```

### Automatic Token Refresh

```typescript
// Token refresh happens automatically in getAccessToken()
const token = await getAccessToken(organizationId);
// If token was expired, it's automatically refreshed
// Returns null only if refresh fails or no refresh token available
```

## Troubleshooting

### Common Issues

#### "Missing OAuth environment variables"

**Cause**: Required environment variables not set
**Solution**: Verify all required variables are set in `.env` file

```bash
# Check environment variables
echo $LINEAR_CLIENT_ID
echo $LINEAR_CLIENT_SECRET
echo $CONFLUENCE_CLIENT_ID
echo $CONFLUENCE_CLIENT_SECRET
```

#### "Invalid webhook signature" 

**Cause**: Webhook secret mismatch
**Solution**: Verify `WEBHOOK_SECRET` matches Linear webhook configuration

#### "Token expired for organization"

**Cause**: Automatic token refresh failed
**Solution**: Check refresh token validity and OAuth credentials

```typescript
// Manual token refresh
const newToken = await refreshToken(organizationId);
if (!newToken) {
  // Re-authentication required
  console.log('Please re-authenticate at /auth');
}
```

#### "Confluence OAuth callback failed"

**Cause**: Invalid state parameter or session timeout
**Solution**: Restart OAuth flow, check session configuration

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing authorization code` | OAuth callback without code parameter | Restart OAuth flow |
| `Failed to exchange authorization code` | Invalid OAuth credentials | Check client ID/secret |
| `Organization not found` | Invalid Linear organization | Verify organization access |
| `Failed to refresh access token` | Invalid refresh token | Re-authenticate user |
| `Server configuration error` | Missing environment variables | Check `.env` configuration |

### Performance Optimization

#### Token Caching

Tokens are cached in database with expiration tracking to minimize API calls:

```typescript
// Efficient token retrieval with automatic refresh
const token = await getAccessToken(organizationId);
// Only refreshes if token is actually expired
```

#### Connection Pooling

Use database connection pooling for high-throughput token operations:

```typescript
// Database connections are pooled automatically
// No manual connection management required
```

### Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS Only**: Use HTTPS in production for OAuth callbacks
3. **Token Rotation**: Implement regular token refresh cycles
4. **Session Security**: Use secure session configuration
5. **Error Logging**: Log security events without exposing secrets
6. **Database Encryption**: Encrypt tokens at rest
7. **Access Control**: Limit OAuth scope to minimum required permissions

---

**This authentication system provides enterprise-grade security for the SAFe PULSE Linear agent platform, ensuring secure and reliable access to both Linear and Confluence APIs.** 🔐🏛️
