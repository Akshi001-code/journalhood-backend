import admin from "firebase-admin";

// Try to use environment variables first (more secure for production)
// If they don't exist, fall back to the JSON file (for development)
let credential;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  // Use environment variables (recommended for production)
  credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  });
} else {
  // Fall back to JSON file (for development)
  try {
    const serviceAccount = require("../serviceAccount.json");
    credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
  } catch (error) {
    console.error("Firebase service account file not found. Please add serviceAccount.json or set environment variables.");
    process.exit(1);
  }
}

admin.initializeApp({
  credential: credential,
});

export default admin;
