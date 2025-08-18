"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
const faker_1 = require("@faker-js/faker");
const encrypt_decrypt_1 = require("../utils/encrypt-decrypt");
const emotions = ['happy', 'sad', 'excited', 'nervous', 'calm', 'angry', 'confused'];
class JournalSeeder {
    db = firebase_config_1.default.firestore();
    async seedJournals(studentId, numEntries) {
        console.log(`📝 Creating ${numEntries} journal entries for student ${studentId}...`);
        try {
            // Create entries
            for (let i = 0; i < numEntries; i++) {
                // Generate random date within last 30 days
                const date = faker_1.faker.date.recent({ days: 30 });
                const timestamp = firebase_config_1.default.firestore.Timestamp.fromDate(date);
                // Generate entry content in Delta format (like QuillJS)
                const contentDelta = [
                    { insert: faker_1.faker.lorem.paragraph(3) + "\n" },
                    { insert: faker_1.faker.lorem.paragraph(2) + "\n" },
                    {
                        insert: "\n",
                        attributes: { align: "left" }
                    }
                ];
                // Create entry data
                const entry = {
                    title: faker_1.faker.lorem.sentence(4),
                    emotion: emotions[Math.floor(Math.random() * emotions.length)] || 'neutral', // Add fallback
                    content: contentDelta,
                    timestamp
                };
                // Create encrypted version for backup
                const encryptedContent = (0, encrypt_decrypt_1.encryptWithUid)(JSON.stringify(contentDelta), studentId);
                const encryptedEntry = {
                    ...entry,
                    content: encryptedContent
                };
                // Save to both collections
                const entryRef = this.db
                    .collection('diaryEntries')
                    .doc(studentId)
                    .collection('entries')
                    .doc();
                const backupRef = this.db
                    .collection('diaryEntriesBackup')
                    .doc(studentId)
                    .collection('entries')
                    .doc(entryRef.id); // Use same ID for both
                // Save both versions
                await Promise.all([
                    entryRef.set(entry),
                    backupRef.set(encryptedEntry)
                ]);
                console.log(`✅ Created entry ${i + 1}/${numEntries} for student ${studentId}`);
            }
            console.log(`✅ Successfully created ${numEntries} journal entries for student ${studentId}`);
        }
        catch (error) {
            console.error(`❌ Error creating journals for student ${studentId}:`, error);
            throw error;
        }
    }
    async seedJournalsForAllStudents(entriesPerStudent = 5) {
        try {
            console.log('🔍 Finding all students...');
            const studentsSnapshot = await this.db
                .collection('users')
                .where('role', '==', 'student')
                .get();
            if (studentsSnapshot.empty) {
                console.log('❌ No students found. Please run the user seeding script first.');
                return;
            }
            console.log(`📚 Found ${studentsSnapshot.size} students. Creating ${entriesPerStudent} entries for each...`);
            for (const studentDoc of studentsSnapshot.docs) {
                await this.seedJournals(studentDoc.id, entriesPerStudent);
            }
            console.log('✅ Successfully created journal entries for all students!');
        }
        catch (error) {
            console.error('❌ Error in seeding journals:', error);
            throw error;
        }
    }
}
async function main() {
    const seeder = new JournalSeeder();
    try {
        await seeder.seedJournalsForAllStudents(5); // 5 entries per student
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
//# sourceMappingURL=add-test-journals.js.map