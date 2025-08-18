"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
/**
 * Script to add exactly 50 test journal entries with mental health keywords
 * This will help test the analytics update functionality
 */
class Add50EntriesSeeder {
    db = firebase_config_1.default.firestore();
    // Test entries with mental health keywords (shorter list for 50 entries)
    testEntries = {
        depression: [
            {
                title: "Feeling Down Today",
                emotion: "sad",
                content: "I've been feeling really depressed lately. Everything seems hopeless and I can't shake this sadness. Depression is taking over my life and I don't know how to cope."
            },
            {
                title: "Dark Thoughts",
                emotion: "sad",
                content: "Having another depressed day. The depression feels overwhelming and I'm struggling to find any joy. These depressing thoughts won't leave me alone."
            },
            {
                title: "No Energy",
                emotion: "tired",
                content: "Depression has drained all my energy. I feel so depressed that getting out of bed is a challenge. This depressed mood is affecting everything I do."
            }
        ],
        bullying: [
            {
                title: "School Problems",
                emotion: "angry",
                content: "The bullying at school continues. Today the bullies targeted me again in front of everyone. This bullying situation is making me not want to go to school."
            },
            {
                title: "Mean Kids",
                emotion: "sad",
                content: "More bullying incidents today. The bully in my class won't stop harassing me. I'm tired of being bullied every single day."
            },
            {
                title: "Afraid to Speak",
                emotion: "scared",
                content: "The bullying has gotten worse. I'm scared to tell anyone about the bully because it might get worse. This bullying needs to stop."
            }
        ],
        introvert: [
            {
                title: "Social Anxiety",
                emotion: "anxious",
                content: "My introvert nature makes social situations difficult. Being an introvert means I prefer being alone. Sometimes I wish I wasn't such an introvert."
            },
            {
                title: "Quiet in Class",
                emotion: "neutral",
                content: "As an introvert, I find it hard to participate in class discussions. My introvert personality makes me uncomfortable in groups. Being introvert has its challenges."
            },
            {
                title: "Prefer Solitude",
                emotion: "calm",
                content: "My introvert tendencies mean I enjoy quiet time alone. Sometimes being an introvert feels lonely, but it's who I am. Introvert life suits me most days."
            }
        ],
        language_problem: [
            {
                title: "English Struggles",
                emotion: "frustrated",
                content: "Having language problems in English class again. My language problem makes it hard to express myself. These language problems are affecting my grades."
            },
            {
                title: "Communication Issues",
                emotion: "sad",
                content: "My language problem makes it difficult to communicate with classmates. This language problem is causing misunderstandings. I wish I didn't have this language problem."
            },
            {
                title: "Speaking Difficulties",
                emotion: "anxious",
                content: "The language problem affects my confidence when speaking. My language problem makes presentations scary. These language problems are holding me back."
            }
        ]
    };
    async findTestStudents() {
        console.log('👥 Finding students for 50-entry test...');
        // Get students from Firebase Auth (more reliable)
        const listUsersResult = await firebase_config_1.default.auth().listUsers();
        const students = listUsersResult.users.filter(user => {
            const claims = user.customClaims;
            return claims && claims.role === 'student';
        });
        console.log(`👥 Found ${students.length} total students`);
        // Take first 13 students (50 entries / 4 issue types ≈ 12.5, so 13 students with ~4 entries each)
        const selectedStudents = students.slice(0, 13);
        console.log(`✅ Selected ${selectedStudents.length} students for testing`);
        return selectedStudents;
    }
    async addEntriesForStudent(student, issueType, numEntries) {
        console.log(`📝 Adding ${numEntries} ${issueType} entries for ${student.displayName}...`);
        const entries = this.testEntries[issueType];
        let entriesAdded = 0;
        for (let i = 0; i < numEntries; i++) {
            const entry = entries[i % entries.length]; // Cycle through available entries
            if (!entry) {
                console.error(`❌ No entry template found for ${issueType} at index ${i % entries.length}`);
                continue;
            }
            // Create entry with timestamp from 1-10 days ago
            const daysAgo = Math.floor(Math.random() * 10) + 1;
            const entryDate = new Date();
            entryDate.setDate(entryDate.getDate() - daysAgo);
            const journalEntry = {
                title: `${entry.title} ${i + 1}`, // Add number to make unique
                emotion: entry.emotion,
                content: [{ insert: entry.content + "\n" }],
                timestamp: firebase_config_1.default.firestore.Timestamp.fromDate(entryDate)
            };
            try {
                // Add to diaryEntriesBackup (for unified analysis)
                await this.db
                    .collection('diaryEntriesBackup')
                    .doc(student.uid)
                    .collection('entries')
                    .add(journalEntry);
                // Also add to user's individual journalEntries collection (for incremental analytics)
                await this.db
                    .collection('users')
                    .doc(student.uid)
                    .collection('journalEntries')
                    .add(journalEntry);
                entriesAdded++;
            }
            catch (error) {
                console.error(`❌ Error adding entry for ${student.displayName}:`, error);
            }
        }
        console.log(`  ✅ Added ${entriesAdded} ${issueType} entries for ${student.displayName}`);
        return entriesAdded;
    }
    async run() {
        try {
            console.log('🎯 Starting 50-entry mental health test data seeding...');
            const students = await this.findTestStudents();
            if (students.length === 0) {
                console.log('❌ No students found for testing');
                return;
            }
            const issueTypes = Object.keys(this.testEntries);
            let totalEntries = 0;
            let targetEntries = 50;
            // Distribute 50 entries across students and issue types
            const entriesPerStudent = Math.ceil(targetEntries / students.length);
            console.log(`📊 Plan: ${targetEntries} total entries, ~${entriesPerStudent} per student across ${students.length} students`);
            for (let i = 0; i < students.length && totalEntries < targetEntries; i++) {
                const student = students[i];
                const issueType = issueTypes[i % issueTypes.length]; // Cycle through issue types
                if (!student || !issueType) {
                    console.error(`❌ Invalid student or issue type at index ${i}`);
                    continue;
                }
                // Calculate how many entries to add for this student
                const remainingEntries = targetEntries - totalEntries;
                const entriesToAdd = Math.min(entriesPerStudent, remainingEntries);
                if (entriesToAdd > 0) {
                    const entriesAdded = await this.addEntriesForStudent(student, issueType, entriesToAdd);
                    totalEntries += entriesAdded;
                    console.log(`🎯 ${student.displayName} (${issueType}): ${entriesAdded} entries [Total: ${totalEntries}/${targetEntries}]`);
                }
            }
            console.log(`\n✅ Mental health 50-entry test seeding completed!`);
            console.log(`📊 Summary:`);
            console.log(`  - Target entries: ${targetEntries}`);
            console.log(`  - Actual entries added: ${totalEntries}`);
            console.log(`  - Students with test data: ${Math.min(students.length, Math.ceil(totalEntries / entriesPerStudent))}`);
            console.log(`  - Issue types used: ${issueTypes.join(', ')}`);
            console.log(`\n💡 Next steps:`);
            console.log(`  1. Run incremental analytics update to include these entries in word counts`);
            console.log(`  2. Check analytics dashboard - word counts should increase`);
            console.log(`  3. Run mental health analysis to flag students`);
            console.log(`  4. Verify that flagged students appear in issue students page`);
        }
        catch (error) {
            console.error('❌ Mental health 50-entry test seeding failed:', error);
            throw error;
        }
    }
}
// Run the seeder
if (require.main === module) {
    const seeder = new Add50EntriesSeeder();
    seeder.run().then(() => {
        console.log('🎉 50-entry test data seeding completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Seeding failed:', error);
        process.exit(1);
    });
}
exports.default = Add50EntriesSeeder;
//# sourceMappingURL=add-50-mental-health-entries.js.map