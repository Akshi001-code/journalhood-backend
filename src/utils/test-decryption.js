const crypto = require('crypto');

/**
 * Test the decryption utility with a sample encrypted content
 */
function testDecryption() {
  console.log('🧪 Testing decryption utility...');
  
  // Sample UID (student ID)
  const uid = '58ldfxyKcjafn57hbheEaz1Oq5z2';
  
  // Sample encrypted content (this would be from the mobile app)
  const sampleEncryptedContent = 'encrypted_hex_string_here';
  
  try {
    // Test the decryption function
    const decrypted = decryptJournalEntry(sampleEncryptedContent, uid);
    console.log('✅ Decryption successful:', decrypted);
  } catch (error) {
    console.log('❌ Decryption failed:', error.message);
  }
}

/**
 * Decrypt journal entries that were encrypted by the mobile app
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
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error(`Failed to decrypt journal entry: ${error}`);
  }
}

// Run the test
testDecryption(); 