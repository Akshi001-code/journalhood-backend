"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
/**
 * Script to restore journals from analyzedjournals back to diaryEntriesBackup
 * Use this when you need to re-run analysis
 */
class JournalRestorer {
    db = firebase_config_1.default.firestore();
    async restoreJournals() {
        try {
            console.log('📦 Starting to restore journals from analyzedjournals to diaryEntriesBackup...');
            const analyzedJournalsSnapshot = await this.db.collection('analyzedjournals').get();
            if (analyzedJournalsSnapshot.empty) {
                console.log('❌ No analyzed journals found to restore');
                return;
            }
            console.log(`📦 Found ${analyzedJournalsSnapshot.docs.length} analyzed journals to restore`);
            let restored = 0;
            const batchSize = 500;
            for (let i = 0; i < analyzedJournalsSnapshot.docs.length; i += batchSize) {
                const batch = this.db.batch();
                const endIndex = Math.min(i + batchSize, analyzedJournalsSnapshot.docs.length);
                for (let j = i; j < endIndex; j++) {
                    const doc = analyzedJournalsSnapshot.docs[j];
                    if (doc) {
                        const data = doc.data();
                        // Restore to original location: diaryEntriesBackup/{studentId}/entries/{originalId}
                        const restoreRef = this.db
                            .collection('diaryEntriesBackup')
                            .doc(data.studentId)
                            .collection('entries')
                            .doc(data.originalId);
                        // Remove analysis metadata and restore original data
                        const originalData = { ...data };
                        delete originalData.analyzedAt;
                        delete originalData.analysisMethod;
                        delete originalData.analyzedBy;
                        delete originalData.originalId;
                        delete originalData.originalPath;
                        delete originalData.studentId;
                        batch.set(restoreRef, originalData);
                        // Delete from analyzedjournals
                        batch.delete(doc.ref);
                    }
                }
                await batch.commit();
                restored += (endIndex - i);
                console.log(`📦 Restored ${restored}/${analyzedJournalsSnapshot.docs.length} journals`);
            }
            console.log('✅ Successfully restored all journals to diaryEntriesBackup');
            console.log('💡 You can now run the unified analysis again');
        }
        catch (error) {
            console.error('❌ Error restoring journals:', error);
            throw error;
        }
    }
    async run() {
        try {
            await this.restoreJournals();
            console.log('🎉 Journal restoration completed successfully!');
        }
        catch (error) {
            console.error('💥 Journal restoration failed:', error);
            process.exit(1);
        }
    }
}
// Run the restorer
if (require.main === module) {
    const restorer = new JournalRestorer();
    restorer.run().then(() => {
        console.log('✅ Done! Journals are back in diaryEntriesBackup for re-analysis.');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}
exports.default = JournalRestorer;
//# sourceMappingURL=restore-journals.js.map