"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseCleaner = void 0;
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
const app_config_1 = require("../config/app.config");
/**
 * Comprehensive database cleanup script
 * Removes all users and data except the super admin account
 */
class DatabaseCleaner {
    db = firebase_config_1.default.firestore();
    auth = firebase_config_1.default.auth();
    progress = {
        authUsersDeleted: 0,
        firestoreCollectionsCleared: [],
        superAdminPreserved: false,
        errors: []
    };
    /**
     * Main cleanup function
     */
    async cleanup() {
        console.log("🧹 Starting comprehensive database cleanup...");
        console.log("⚠️  WARNING: This will delete ALL users and data except the super admin!");
        try {
            // Step 1: Find and preserve super admin
            const superAdmin = await this.findSuperAdmin();
            if (!superAdmin) {
                throw new Error("Super admin not found! Cannot proceed with cleanup.");
            }
            console.log(`✅ Super admin found: ${superAdmin.email} (${superAdmin.uid})`);
            this.progress.superAdminPreserved = true;
            // Step 2: Delete all Firebase Auth users except super admin
            await this.cleanupAuthUsers(superAdmin.uid);
            // Step 3: Clean up all Firestore collections
            await this.cleanupFirestoreCollections();
            // Step 4: Clean up diary entries (with subcollections)
            await this.cleanupDiaryEntries();
            console.log("✅ Database cleanup completed successfully!");
            this.printSummary();
            return this.progress;
        }
        catch (error) {
            const errorMessage = `Fatal error during cleanup: ${error}`;
            console.error("❌", errorMessage);
            this.progress.errors.push(errorMessage);
            return this.progress;
        }
    }
    /**
     * Find the super admin user
     */
    async findSuperAdmin() {
        try {
            // First try to find by email
            const adminEmail = process.env.ADMIN_EMAIL || "admin@journalhood.com";
            try {
                const user = await this.auth.getUserByEmail(adminEmail);
                if (user.customClaims?.role === app_config_1.ROLES.SUPER_ADMIN) {
                    return user;
                }
            }
            catch (error) {
                console.log(`Super admin not found by email ${adminEmail}, searching all users...`);
            }
            // If not found by email, search through all users
            let pageToken;
            do {
                const listUsersResult = await this.auth.listUsers(1000, pageToken);
                for (const user of listUsersResult.users) {
                    if (user.customClaims?.role === app_config_1.ROLES.SUPER_ADMIN) {
                        return user;
                    }
                }
                pageToken = listUsersResult.pageToken;
            } while (pageToken);
            return null;
        }
        catch (error) {
            console.error("Error finding super admin:", error);
            return null;
        }
    }
    /**
     * Delete all Firebase Auth users except super admin
     */
    async cleanupAuthUsers(superAdminUid) {
        console.log("🔥 Cleaning up Firebase Auth users...");
        try {
            let pageToken;
            const usersToDelete = [];
            // Collect all user UIDs except super admin
            do {
                const listUsersResult = await this.auth.listUsers(1000, pageToken);
                for (const user of listUsersResult.users) {
                    if (user.uid !== superAdminUid) {
                        usersToDelete.push(user.uid);
                    }
                }
                pageToken = listUsersResult.pageToken;
            } while (pageToken);
            console.log(`Found ${usersToDelete.length} users to delete`);
            // Delete users in batches of 100 (Firebase limit)
            const batchSize = 100;
            for (let i = 0; i < usersToDelete.length; i += batchSize) {
                const batch = usersToDelete.slice(i, i + batchSize);
                try {
                    await this.auth.deleteUsers(batch);
                    this.progress.authUsersDeleted += batch.length;
                    console.log(`Deleted ${batch.length} users (${this.progress.authUsersDeleted}/${usersToDelete.length})`);
                }
                catch (error) {
                    console.error(`Error deleting user batch:`, error);
                    this.progress.errors.push(`Failed to delete user batch: ${error}`);
                }
            }
            console.log(`✅ Deleted ${this.progress.authUsersDeleted} Firebase Auth users`);
        }
        catch (error) {
            const errorMessage = `Error cleaning up auth users: ${error}`;
            console.error("❌", errorMessage);
            this.progress.errors.push(errorMessage);
        }
    }
    /**
     * Clean up all main Firestore collections
     */
    async cleanupFirestoreCollections() {
        console.log("🔥 Cleaning up Firestore collections...");
        const collections = [
            'users',
            'districts',
            'schools',
            'classes',
            'analyzedData'
        ];
        for (const collectionName of collections) {
            try {
                await this.deleteCollection(collectionName);
                this.progress.firestoreCollectionsCleared.push(collectionName);
                console.log(`✅ Cleared collection: ${collectionName}`);
            }
            catch (error) {
                const errorMessage = `Failed to clear collection ${collectionName}: ${error}`;
                console.error("❌", errorMessage);
                this.progress.errors.push(errorMessage);
            }
        }
    }
    /**
     * Clean up diary entries and their subcollections
     */
    async cleanupDiaryEntries() {
        console.log("🔥 Cleaning up diary entries...");
        try {
            const diaryBackupRef = this.db.collection('diaryEntriesBackup');
            const diarySnapshot = await diaryBackupRef.get();
            if (diarySnapshot.empty) {
                console.log("No diary entries found to clean up");
                return;
            }
            console.log(`Found ${diarySnapshot.docs.length} diary backup documents`);
            // Delete each user's diary entries (with subcollections)
            for (const userDoc of diarySnapshot.docs) {
                try {
                    // Delete the entries subcollection first
                    const entriesRef = userDoc.ref.collection('entries');
                    await this.deleteCollection(entriesRef);
                    // Delete the user document
                    await userDoc.ref.delete();
                }
                catch (error) {
                    console.error(`Error deleting diary for user ${userDoc.id}:`, error);
                    this.progress.errors.push(`Failed to delete diary for user ${userDoc.id}: ${error}`);
                }
            }
            this.progress.firestoreCollectionsCleared.push('diaryEntriesBackup');
            console.log("✅ Cleared diary entries and subcollections");
        }
        catch (error) {
            const errorMessage = `Error cleaning up diary entries: ${error}`;
            console.error("❌", errorMessage);
            this.progress.errors.push(errorMessage);
        }
    }
    /**
     * Delete all documents in a collection
     */
    async deleteCollection(collectionRef, batchSize = 100) {
        const collectionName = typeof collectionRef === 'string' ? collectionRef : collectionRef.path;
        if (typeof collectionRef === 'string') {
            collectionRef = this.db.collection(collectionRef);
        }
        let deletedCount = 0;
        let query = collectionRef.limit(batchSize);
        while (true) {
            const snapshot = await query.get();
            if (snapshot.empty) {
                break;
            }
            // Delete documents in batch
            const batch = this.db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            deletedCount += snapshot.docs.length;
            console.log(`Deleted ${snapshot.docs.length} documents from ${collectionName} (total: ${deletedCount})`);
        }
    }
    /**
     * Print cleanup summary
     */
    printSummary() {
        console.log("\n📊 CLEANUP SUMMARY");
        console.log("==================");
        console.log(`🗑️  Firebase Auth users deleted: ${this.progress.authUsersDeleted}`);
        console.log(`🗃️  Firestore collections cleared: ${this.progress.firestoreCollectionsCleared.length}`);
        if (this.progress.firestoreCollectionsCleared.length > 0) {
            console.log(`   - ${this.progress.firestoreCollectionsCleared.join(', ')}`);
        }
        console.log(`👤 Super admin preserved: ${this.progress.superAdminPreserved ? '✅' : '❌'}`);
        if (this.progress.errors.length > 0) {
            console.log(`\n⚠️  ERRORS (${this.progress.errors.length}):`);
            this.progress.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        console.log("\n🎉 Cleanup completed!");
    }
}
exports.DatabaseCleaner = DatabaseCleaner;
/**
 * Main execution function
 */
async function main() {
    const cleaner = new DatabaseCleaner();
    // Add confirmation prompt in development
    if (process.env.NODE_ENV !== 'production') {
        console.log("🚨 DEVELOPMENT MODE - This will delete ALL user data except super admin!");
        console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    try {
        await cleaner.cleanup();
        process.exit(0);
    }
    catch (error) {
        console.error("Script failed:", error);
        process.exit(1);
    }
}
// Execute if run directly
if (require.main === module) {
    main().catch((error) => {
        console.error("Unhandled error:", error);
        process.exit(1);
    });
}
exports.default = main;
//# sourceMappingURL=cleanup-all-data.js.map