#!/usr/bin/env node

/**
 * OAuth Token Validation Script
 * 
 * This script validates stored OAuth tokens by making test API calls
 * to both Linear and Confluence APIs.
 */

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/linear_agent'
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Get Linear tokens from database
 */
async function getLinearTokens() {
  try {
    const result = await pool.query(`
      SELECT organization_id, access_token, refresh_token, expires_at, app_user_id
      FROM linear_tokens
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    return result.rows[0] || null;
  } catch (error) {
    logError(`Failed to get Linear tokens: ${error.message}`);
    return null;
  }
}

/**
 * Get Confluence tokens from database
 */
async function getConfluenceTokens() {
  try {
    const result = await pool.query(`
      SELECT organization_id, access_token, refresh_token, expires_at, site_url
      FROM confluence_tokens
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    return result.rows[0] || null;
  } catch (error) {
    logError(`Failed to get Confluence tokens: ${error.message}`);
    return null;
  }
}

/**
 * Test Linear API with stored token
 */
async function testLinearAPI(token) {
  try {
    logInfo('Testing Linear API...');
    
    const response = await axios.post('https://api.linear.app/graphql', {
      query: `
        query Me {
          viewer {
            id
            name
            email
            organization {
              id
              name
            }
          }
        }
      `
    }, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.data.errors) {
      logError(`Linear API errors: ${JSON.stringify(response.data.errors)}`);
      return false;
    }
    
    const viewer = response.data.data.viewer;
    logSuccess(`Linear API test successful`);
    logInfo(`  User: ${viewer.name} (${viewer.email})`);
    logInfo(`  Organization: ${viewer.organization.name}`);
    logInfo(`  Token expires: ${new Date(token.expires_at).toLocaleString()}`);
    
    return true;
  } catch (error) {
    logError(`Linear API test failed: ${error.message}`);
    if (error.response) {
      logError(`  Status: ${error.response.status}`);
      logError(`  Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Test Confluence API with stored token
 */
async function testConfluenceAPI(token) {
  try {
    logInfo('Testing Confluence API...');
    
    // First, get accessible resources
    const resourceResponse = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (!resourceResponse.data || resourceResponse.data.length === 0) {
      logError('No accessible Confluence sites found');
      return false;
    }
    
    const site = resourceResponse.data[0];
    logInfo(`  Site: ${site.name} (${site.url})`);
    
    // Test Confluence API call
    const confluenceResponse = await axios.get(`https://api.atlassian.com/ex/confluence/${site.id}/rest/api/user/current`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    const user = confluenceResponse.data;
    logSuccess(`Confluence API test successful`);
    logInfo(`  User: ${user.displayName} (${user.email || 'no email'})`);
    logInfo(`  Site URL: ${token.site_url}`);
    logInfo(`  Token expires: ${new Date(token.expires_at).toLocaleString()}`);
    
    return true;
  } catch (error) {
    logError(`Confluence API test failed: ${error.message}`);
    if (error.response) {
      logError(`  Status: ${error.response.status}`);
      logError(`  Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Check token expiration
 */
function checkTokenExpiration(token, serviceName) {
  const now = new Date();
  const expiresAt = new Date(token.expires_at);
  const timeUntilExpiry = expiresAt - now;
  
  if (timeUntilExpiry <= 0) {
    logWarning(`${serviceName} token has expired`);
    return false;
  } else if (timeUntilExpiry < 24 * 60 * 60 * 1000) { // Less than 24 hours
    logWarning(`${serviceName} token expires soon: ${expiresAt.toLocaleString()}`);
    return true;
  } else {
    logSuccess(`${serviceName} token is valid until: ${expiresAt.toLocaleString()}`);
    return true;
  }
}

/**
 * Main validation function
 */
async function validateTokens() {
  log('\n🔐 OAuth Token Validation', 'cyan');
  log('================================', 'cyan');
  
  try {
    // Test database connection
    logInfo('Testing database connection...');
    await pool.query('SELECT 1');
    logSuccess('Database connection successful');
    
    // Get and validate Linear tokens
    log('\n📊 Linear Token Validation', 'magenta');
    log('----------------------------', 'magenta');
    
    const linearToken = await getLinearTokens();
    if (!linearToken) {
      logError('No Linear tokens found in database');
      logInfo('Please complete the Linear OAuth flow first: http://localhost:3000/auth');
    } else {
      logSuccess('Linear token found in database');
      checkTokenExpiration(linearToken, 'Linear');
      await testLinearAPI(linearToken);
    }
    
    // Get and validate Confluence tokens
    log('\n🌐 Confluence Token Validation', 'magenta');
    log('--------------------------------', 'magenta');
    
    const confluenceToken = await getConfluenceTokens();
    if (!confluenceToken) {
      logError('No Confluence tokens found in database');
      logInfo('Please complete the Confluence OAuth flow first: http://localhost:3000/auth/confluence');
    } else {
      logSuccess('Confluence token found in database');
      checkTokenExpiration(confluenceToken, 'Confluence');
      await testConfluenceAPI(confluenceToken);
    }
    
    // Summary
    log('\n📋 Validation Summary', 'cyan');
    log('====================', 'cyan');
    
    const hasLinear = linearToken !== null;
    const hasConfluence = confluenceToken !== null;
    
    if (hasLinear && hasConfluence) {
      logSuccess('Both Linear and Confluence tokens are available');
      logSuccess('OAuth setup is complete and functional');
    } else if (hasLinear) {
      logWarning('Only Linear token is available');
      logInfo('Complete Confluence OAuth to enable full functionality');
    } else if (hasConfluence) {
      logWarning('Only Confluence token is available');
      logInfo('Complete Linear OAuth to enable full functionality');
    } else {
      logError('No OAuth tokens found');
      logInfo('Complete both OAuth flows to enable functionality');
    }
    
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Show help information
 */
function showHelp() {
  log('\nOAuth Token Validation Script', 'cyan');
  log('============================', 'cyan');
  log('\nThis script validates stored OAuth tokens by making test API calls.');
  log('\nUsage:');
  log('  node validate-oauth-tokens.js [--help]');
  log('\nEnvironment Variables:');
  log('  DATABASE_URL - PostgreSQL connection string');
  log('\nOAuth Flows:');
  log('  Linear:     http://localhost:3000/auth');
  log('  Confluence: http://localhost:3000/auth/confluence');
  log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run validation
validateTokens().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
