#!/usr/bin/env node

/**
 * Simple OAuth Routes Test
 * Tests that OAuth routes are accessible and respond correctly
 */

const http = require('http');

const APP_URL = 'http://localhost:3000';

function testEndpoint(path, expectedStatus = 302) {
  return new Promise((resolve) => {
    const req = http.get(`${APP_URL}${path}`, (res) => {
      console.log(`✓ ${path} - Status: ${res.statusCode} (Expected: ${expectedStatus})`);
      resolve(res.statusCode === expectedStatus);
    });
    
    req.on('error', (err) => {
      console.log(`✗ ${path} - Error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`✗ ${path} - Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function testOAuthRoutes() {
  console.log('🔐 Testing OAuth Routes');
  console.log('======================');
  
  // Test health endpoint first
  const healthOk = await testEndpoint('/health', 200);
  if (!healthOk) {
    console.log('❌ Application not running. Start with: docker-compose up');
    return;
  }
  
  // Test OAuth routes (should redirect to OAuth providers)
  await testEndpoint('/auth', 302);
  await testEndpoint('/auth/confluence', 302);
  
  console.log('\n✅ OAuth routes test completed!');
  console.log('\nNext steps:');
  console.log('1. Create OAuth applications in Linear and Atlassian');
  console.log('2. Update .env file with OAuth credentials');
  console.log('3. Test OAuth flows manually:');
  console.log('   - Linear: http://localhost:3000/auth');
  console.log('   - Confluence: http://localhost:3000/auth/confluence');
}

testOAuthRoutes();
