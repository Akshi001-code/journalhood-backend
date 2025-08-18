/**
 * Encrypts data using AES-256-CBC with a key derived from the user's UID
 */
export declare function encryptWithUid(data: string, uid: string): string;
/**
 * Decrypts data using AES-256-CBC with a key derived from the user's UID
 */
export declare function decryptWithUid(encryptedData: string, uid: string): string;
