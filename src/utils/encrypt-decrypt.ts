import * as crypto from 'crypto';

/**
 * Encrypts data using AES-256-CBC with a key derived from the user's UID
 */
export function encryptWithUid(data: string, uid: string): string {
  try {
    // Use first 32 chars of UID as key (if UID is shorter, it will be padded)
    const key = Buffer.from(uid.padEnd(32, '0')).slice(0, 32);
    
    // Generate random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Combine IV and encrypted data
    return iv.toString('base64') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES-256-CBC with a key derived from the user's UID
 */
export function decryptWithUid(encryptedData: string, uid: string): string {
  try {
    // Split IV and data
    const [ivString, encryptedString] = encryptedData.split(':');
    if (!ivString || !encryptedString) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Use first 32 chars of UID as key (if UID is shorter, it will be padded)
    const key = Buffer.from(uid.padEnd(32, '0')).slice(0, 32);
    
    // Convert IV from base64
    const iv = Buffer.from(ivString, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt
    let decrypted = decipher.update(encryptedString, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
} 