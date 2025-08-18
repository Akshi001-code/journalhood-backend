"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptJournalEntry = decryptJournalEntry;
exports.isEncrypted = isEncrypted;
exports.tryDecryptContent = tryDecryptContent;
const crypto = __importStar(require("crypto"));
/**
 * Decrypt journal entries that were encrypted by the mobile app
 * Uses the same AES-256-CBC encryption with SHA-256 key derivation
 */
function decryptJournalEntry(encryptedHex, uid) {
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
    }
    catch (error) {
        console.error('❌ Decryption failed:', error);
        throw new Error(`Failed to decrypt journal entry: ${error}`);
    }
}
/**
 * Check if a string is likely encrypted (hex format)
 */
function isEncrypted(content) {
    if (typeof content !== 'string')
        return false;
    // Check if it's a hex string (even length, only hex characters)
    const hexRegex = /^[0-9a-fA-F]+$/;
    return content.length % 2 === 0 && hexRegex.test(content);
}
/**
 * Try to decrypt content if it's encrypted, otherwise return as-is
 */
function tryDecryptContent(content, uid) {
    if (isEncrypted(content)) {
        try {
            return decryptJournalEntry(content, uid);
        }
        catch (error) {
            console.error('❌ Failed to decrypt content:', error);
            return content; // Return original if decryption fails
        }
    }
    return content;
}
//# sourceMappingURL=decrypt-journal.js.map