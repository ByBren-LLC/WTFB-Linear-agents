/**
 * Token management utility for Linear OAuth tokens
 * 
 * Note: This is a placeholder implementation. In a production environment,
 * tokens should be stored securely in a database with encryption.
 */

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

/**
 * Stores OAuth tokens for a Linear organization
 */
export const storeTokens = (
  organizationId: string,
  accessToken: string,
  refreshToken: string,
  appUserId: string,
  expiresIn: number
) => {
  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
  
  // Store tokens
  tokenStore[organizationId] = {
    accessToken,
    refreshToken,
    appUserId,
    expiresAt
  };
  
  console.log(`Tokens stored for organization ${organizationId}`);
};

/**
 * Retrieves the access token for a Linear organization
 */
export const getAccessToken = (organizationId: string): string | null => {
  const tokenData = tokenStore[organizationId];
  
  if (!tokenData) {
    console.error(`No tokens found for organization ${organizationId}`);
    return null;
  }
  
  // Check if token is expired
  if (new Date() > tokenData.expiresAt) {
    console.error(`Token expired for organization ${organizationId}`);
    // TODO: Implement token refresh
    return null;
  }
  
  return tokenData.accessToken;
};

/**
 * Retrieves the app user ID for a Linear organization
 */
export const getAppUserId = (organizationId: string): string | null => {
  const tokenData = tokenStore[organizationId];
  
  if (!tokenData) {
    console.error(`No tokens found for organization ${organizationId}`);
    return null;
  }
  
  return tokenData.appUserId;
};
