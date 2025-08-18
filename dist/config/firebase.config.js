"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
// Load environment variables as early as possible so Firebase sees them
(0, dotenv_1.configDotenv)();
// Initialize Firebase Admin without ever reading JSON from the repo.
// Prefer env vars; otherwise use Application Default Credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS).
function initFirebaseAdmin() {
    const hasEnvCreds = !!(process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL);
    if (hasEnvCreds) {
        const credential = firebase_admin_1.default.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        });
        firebase_admin_1.default.initializeApp({ credential });
        return;
    }
    // Fallback 1: Local JSON (only for local dev). Looks for server/src/serviceAccount.json
    const localJsonPath = path_1.default.resolve(__dirname, "../serviceAccount.json");
    if (fs_1.default.existsSync(localJsonPath)) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const serviceAccount = require(localJsonPath);
            const credential = firebase_admin_1.default.credential.cert(serviceAccount);
            firebase_admin_1.default.initializeApp({ credential });
            return;
        }
        catch (e) {
            console.error("Found local serviceAccount.json but failed to initialize:", e);
        }
    }
    // Fallback 2: Application Default Credentials if neither env nor local JSON
    try {
        const credential = firebase_admin_1.default.credential.applicationDefault();
        firebase_admin_1.default.initializeApp({ credential });
        return;
    }
    catch (e) {
        console.error("Firebase Admin initialization failed. Provide env vars (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path outside the repo.");
        process.exit(1);
    }
}
initFirebaseAdmin();
exports.default = firebase_admin_1.default;
//# sourceMappingURL=firebase.config.js.map