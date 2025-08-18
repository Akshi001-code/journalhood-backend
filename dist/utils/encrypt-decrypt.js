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
exports.encryptWithUid = encryptWithUid;
exports.decryptWithUid = decryptWithUid;
const crypto = __importStar(require("crypto"));
/**
 * Encrypts data using AES-256-CBC with a key derived from the user's UID
 */
function encryptWithUid(data, uid) {
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
    }
    catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}
/**
 * Decrypts data using AES-256-CBC with a key derived from the user's UID
 */
function decryptWithUid(encryptedData, uid) {
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
    }
    catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}
//# sourceMappingURL=encrypt-decrypt.js.map