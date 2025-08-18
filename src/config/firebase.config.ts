import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { configDotenv } from "dotenv";

// Load environment variables as early as possible so Firebase sees them
configDotenv();

// Initialize Firebase Admin without ever reading JSON from the repo.
// Prefer env vars; otherwise use Application Default Credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS).

function initFirebaseAdmin() {
  const hasEnvCreds = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  );

  if (hasEnvCreds) {
    const credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    });
    admin.initializeApp({ credential });
    return;
  }

  // Fallback 1: Local JSON (only for local dev). Looks for server/src/serviceAccount.json
  const localJsonPath = path.resolve(__dirname, "../serviceAccount.json");
  if (fs.existsSync(localJsonPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(localJsonPath);
      const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
      admin.initializeApp({ credential });
      return;
    } catch (e) {
      console.error("Found local serviceAccount.json but failed to initialize:", e);
    }
  }

  // Fallback 2: Application Default Credentials if neither env nor local JSON
  try {
    const credential = admin.credential.applicationDefault();
    admin.initializeApp({ credential });
    return;
  } catch (e) {
    console.error(
      "Firebase Admin initialization failed. Provide env vars (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path outside the repo."
    );
    process.exit(1);
  }
}

initFirebaseAdmin();

export default admin;


