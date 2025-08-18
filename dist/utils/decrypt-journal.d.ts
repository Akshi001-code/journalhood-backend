/**
 * Decrypt journal entries that were encrypted by the mobile app
 * Uses the same AES-256-CBC encryption with SHA-256 key derivation
 */
export declare function decryptJournalEntry(encryptedHex: string, uid: string): string;
/**
 * Check if a string is likely encrypted (hex format)
 */
export declare function isEncrypted(content: any): boolean;
/**
 * Try to decrypt content if it's encrypted, otherwise return as-is
 */
export declare function tryDecryptContent(content: any, uid: string): string;
