// Test file to verify OAuth imports work correctly
import session from 'express-session';
import { initiateConfluenceOAuth, handleConfluenceCallback } from './src/auth/confluence-oauth';

console.log('✓ express-session imported:', typeof session);
console.log('✓ initiateConfluenceOAuth imported:', typeof initiateConfluenceOAuth);
console.log('✓ handleConfluenceCallback imported:', typeof handleConfluenceCallback);
