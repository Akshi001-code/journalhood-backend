"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
/**
 * Script to clear old student flags data
 * Run this to ensure fresh, consistent flagged students data
 */
class FlagsCleaner {
    db = firebase_config_1.default.firestore();
    async clearOldFlags() {
        try {
            console.log('🗑️ Starting to clear old student flags...');
            const flagsSnapshot = await this.db.collection('studentFlags').get();
            if (flagsSnapshot.empty) {
                console.log('✅ No old flags found to clear');
                return;
            }
            console.log(`🗑️ Found ${flagsSnapshot.docs.length} old flags to clear`);
            // Delete in batches (Firestore limit is 500 operations per batch)
            const batchSize = 500;
            const totalDocs = flagsSnapshot.docs.length;
            let processed = 0;
            while (processed < totalDocs) {
                const batch = this.db.batch();
                const endIndex = Math.min(processed + batchSize, totalDocs);
                for (let i = processed; i < endIndex; i++) {
                    const doc = flagsSnapshot.docs[i];
                    if (doc) {
                        batch.delete(doc.ref);
                    }
                }
                await batch.commit();
                processed = endIndex;
                console.log(`🗑️ Cleared ${processed}/${totalDocs} flags`);
            }
            console.log('✅ Successfully cleared all old student flags');
            console.log('💡 Now run the unified analysis to generate fresh flags');
        }
        catch (error) {
            console.error('❌ Error clearing old flags:', error);
            throw error;
        }
    }
    async run() {
        try {
            await this.clearOldFlags();
            console.log('🎉 Flag clearing completed successfully!');
        }
        catch (error) {
            console.error('💥 Flag clearing failed:', error);
            process.exit(1);
        }
    }
}
// Run the cleaner
if (require.main === module) {
    const cleaner = new FlagsCleaner();
    cleaner.run().then(() => {
        console.log('✅ Done! You can now run the unified analysis for fresh results.');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}
exports.default = FlagsCleaner;
//# sourceMappingURL=clear-old-flags.js.map