interface CleanupProgress {
    authUsersDeleted: number;
    firestoreCollectionsCleared: string[];
    superAdminPreserved: boolean;
    errors: string[];
}
/**
 * Comprehensive database cleanup script
 * Removes all users and data except the super admin account
 */
export declare class DatabaseCleaner {
    private db;
    private auth;
    private progress;
    /**
     * Main cleanup function
     */
    cleanup(): Promise<CleanupProgress>;
    /**
     * Find the super admin user
     */
    private findSuperAdmin;
    /**
     * Delete all Firebase Auth users except super admin
     */
    private cleanupAuthUsers;
    /**
     * Clean up all main Firestore collections
     */
    private cleanupFirestoreCollections;
    /**
     * Clean up diary entries and their subcollections
     */
    private cleanupDiaryEntries;
    /**
     * Delete all documents in a collection
     */
    private deleteCollection;
    /**
     * Print cleanup summary
     */
    private printSummary;
}
/**
 * Main execution function
 */
declare function main(): Promise<void>;
export default main;
