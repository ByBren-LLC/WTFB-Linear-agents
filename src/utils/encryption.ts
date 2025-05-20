/**
 * Encryption utility for secure token storage
 * 
 * This utility provides functions for encrypting and decrypting sensitive data
 * using AES-256 encryption.
 */
import * as crypto from 'crypto-js';
import * as logger from './logger';

// Get encryption key from environment variable
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    logger.error('ENCRYPTION_KEY environment variable is not set');
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  return key;
};

/**
 * Encrypts a string using AES-256 encryption
 * 
 * @param text The text to encrypt
 * @returns The encrypted text
 */
export const encrypt = (text: string): string => {
  try {
    const key = getEncryptionKey();
    return crypto.AES.encrypt(text, key).toString();
  } catch (error) {
    logger.error('Error encrypting data', { error });
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts an encrypted string
 * 
 * @param encryptedText The encrypted text to decrypt
 * @returns The decrypted text
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const key = getEncryptionKey();
    const bytes = crypto.AES.decrypt(encryptedText, key);
    return bytes.toString(crypto.enc.Utf8);
  } catch (error) {
    logger.error('Error decrypting data', { error });
    throw new Error('Failed to decrypt data');
  }
};
