import * as crypto from 'crypto';

/**
 * Decrypt journal entries that were encrypted by the mobile app
 * Uses the same AES-256-CBC encryption with SHA-256 key derivation
 */
export function decryptJournalEntry(encryptedHex: string, uid: string): string {
  try {
    // Derive the same 32-byte key from the UID (SHA-256)
    const key = crypto.createHash('sha256').update(uid).digest();
    
    // Decode the hex string to bytes
    const combined = Buffer.from(encryptedHex, 'hex');
    
    // Extract the IV (first 16 bytes)
    const iv = combined.subarray(0, 16);
    
    // Extract the encrypted data
    const encryptedData = combined.subarray(16);
    
    // Create AES CBC decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(true);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error(`Failed to decrypt journal entry: ${error}`);
  }
}

/**
 * Check if a string is likely encrypted (hex format)
 */
export function isEncrypted(content: any): boolean {
  if (typeof content !== 'string') return false;
  
  // Check if it's a hex string (even length, only hex characters)
  const hexRegex = /^[0-9a-fA-F]+$/;
  return content.length % 2 === 0 && hexRegex.test(content);
}

/**
 * Try to decrypt content if it's encrypted, otherwise return as-is
 */
export function tryDecryptContent(content: any, uid: string): string {
  if (isEncrypted(content)) {
    try {
      return decryptJournalEntry(content, uid);
    } catch (error) {
      console.error('❌ Failed to decrypt content:', error);
      return content; // Return original if decryption fails
    }
  }
  return content;
} 