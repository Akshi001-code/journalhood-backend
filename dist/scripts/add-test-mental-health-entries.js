"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
class MentalHealthTestSeeder {
    db = firebase_config_1.default.firestore();
    // Test journal entries designed to trigger mental health flags
    mentalHealthTemplates = {
        depression: [
            {
                title: "Feeling Down Today",
                emotion: "sad",
                content: "I've been feeling really sad lately. Everything seems hopeless and I don't know what to do. Sometimes I feel so worthless and empty inside. It's like there's this dark cloud over me all the time."
            },
            {
                title: "Hard Times",
                emotion: "sad",
                content: "I feel depressed today. Nothing matters anymore and I just want to give up. I don't see the point in trying because everything feels so hopeless. I feel completely worthless."
            },
            {
                title: "Dark Thoughts",
                emotion: "sad",
                content: "Today was another dark day. I feel so empty and sad. Everyone else seems happy but I just feel hopeless about everything. I don't understand why I feel so worthless all the time."
            },
            {
                title: "Lost and Sad",
                emotion: "sad",
                content: "I'm feeling really depressed again. Nothing seems to matter and I feel like giving up. The sadness is overwhelming and I feel so hopeless about my future. Everything feels dark and empty."
            },
            {
                title: "Can't Shake This Feeling",
                emotion: "sad",
                content: "I've been sad for weeks now. I feel so worthless and nothing seems to help. Sometimes I think what's the point of anything? I feel so hopeless and empty inside. This dark feeling won't go away."
            }
        ],
        bullying: [
            {
                title: "Bad Day at School",
                emotion: "angry",
                content: "Some kids were bullying me again today. They called me names and made fun of my clothes. I felt really hurt and excluded from the group. Nobody likes me and everyone just laughs at me."
            },
            {
                title: "Being Picked On",
                emotion: "sad",
                content: "I got bullied during lunch break. The bigger kids picked on me and threatened to hurt me if I told anyone. They always tease me and make me feel terrible. I'm being ignored by everyone."
            },
            {
                title: "Mean Kids",
                emotion: "angry",
                content: "Today some mean students bullied me in the hallway. They pushed me and called me names. I feel like nobody likes me and everyone hates me. They excluded me from their games and laughed at me."
            },
            {
                title: "Feeling Excluded",
                emotion: "sad",
                content: "I was bullied again today. The other kids teased me about my accent and made fun of how I talk. They threatened to hurt me if I don't stay away. I feel like everyone ignores me and picks on me."
            },
            {
                title: "Another Tough Day",
                emotion: "angry",
                content: "The bullying continues every day. Kids are so mean to me, they called me names again and laughed at my mistakes. I got pushed around and threatened. Nobody likes me here and everyone just excludes me."
            }
        ],
        introvert: [
            {
                title: "Social Struggles",
                emotion: "anxious",
                content: "I'm very shy and quiet in class. I don't like talking to other people and it's hard to make friends. I prefer to be alone during lunch and sit by myself. I feel nervous around people and have social anxiety."
            },
            {
                title: "Staying Quiet",
                emotion: "confused",
                content: "I don't speak up in class because I'm too shy. I keep to myself most of the time and feel awkward around other students. I'd rather read than play with others. I stay in the background and don't join group activities."
            },
            {
                title: "Lunch Alone",
                emotion: "lonely",
                content: "I eat lunch alone every day because I'm too quiet and shy. I'm afraid to talk to other kids and feel uncomfortable in groups. I prefer to be alone and keep to myself. Social situations make me nervous."
            },
            {
                title: "Hard to Connect",
                emotion: "sad",
                content: "It's really hard to make friends when you're shy like me. I don't like talking and prefer to stay quiet. I feel awkward in social situations and would rather sit by myself. I have social anxiety around groups of people."
            },
            {
                title: "My Quiet World",
                emotion: "confused",
                content: "I'm a very quiet person and don't speak up much. I feel nervous around people and prefer to be alone. I stay in the background during activities and sit by myself. Making friends is hard when you're this shy."
            }
        ],
        language_problem: [
            {
                title: "English is Hard",
                emotion: "confused",
                content: "I don't understand many things in class because English is hard for me. I can't express my thoughts properly and struggle with words. The difficult words confuse me and I have communication problems."
            },
            {
                title: "Language Struggles",
                emotion: "frustrated",
                content: "It's hard to read the textbooks because my English is bad. I don't understand what the teacher says sometimes. I struggle with words and feel confused in class. Translation helps but I can't always use it."
            },
            {
                title: "Communication Problems",
                emotion: "sad",
                content: "I have trouble expressing myself because of language problems. English is really hard and I don't understand many words. I feel confused in class and can't speak properly. My English is bad compared to others."
            },
            {
                title: "Lost in Translation",
                emotion: "confused",
                content: "I don't understand the lessons because English is so difficult for me. I struggle with words and can't express what I want to say. The teacher speaks too fast and I get confused in class. I have communication problems."
            },
            {
                title: "Word Struggles",
                emotion: "frustrated",
                content: "Reading is hard because I don't understand many English words. It's difficult to express my ideas and I struggle with communication. My English is bad and I feel confused when others speak quickly. Language problems make school tough."
            }
        ]
    };
    async run() {
        try {
            console.log('🧠 Starting mental health test journal entries seeding...');
            // Find all students 
            const students = await this.findAllStudents();
            if (students.length === 0) {
                console.log('❌ No students found');
                return;
            }
            console.log(`👥 Found ${students.length} students`);
            // Assign different mental health issues to different students
            const studentsPerIssue = Math.ceil(students.length / 4);
            const issueTypes = ['depression', 'bullying', 'introvert', 'language_problem'];
            let totalEntries = 0;
            let studentIndex = 0;
            for (let i = 0; i < issueTypes.length && studentIndex < students.length; i++) {
                const issueType = issueTypes[i];
                const studentsForThisIssue = students.slice(studentIndex, studentIndex + studentsPerIssue);
                console.log(`📝 Adding ${issueType} entries for ${studentsForThisIssue.length} students...`);
                for (const student of studentsForThisIssue) {
                    const entriesAdded = await this.addMentalHealthEntriesForStudent(student, issueType);
                    totalEntries += entriesAdded;
                }
                studentIndex += studentsPerIssue;
            }
            console.log(`✅ Successfully added ${totalEntries} mental health test entries!`);
            console.log('🚩 These entries should trigger flags when mental health analysis is run');
        }
        catch (error) {
            console.error('❌ Error seeding mental health test entries:', error);
        }
    }
    async findAllStudents() {
        const students = [];
        // Get all users from Firebase Auth
        const listUsersResult = await firebase_config_1.default.auth().listUsers();
        for (const user of listUsersResult.users) {
            const claims = user.customClaims;
            if (claims && claims.role === 'student') {
                students.push({
                    uid: user.uid,
                    displayName: user.displayName || 'Unknown Student',
                    email: user.email || '',
                    classId: claims.classId || ''
                });
            }
        }
        return students;
    }
    async addMentalHealthEntriesForStudent(student, issueType) {
        console.log(`🧠 Adding ${issueType} entries for ${student.displayName}...`);
        let entriesAdded = 0;
        const templates = this.mentalHealthTemplates[issueType];
        // Add all templates for this issue type to ensure 4+ flags
        const now = new Date();
        for (let i = 0; i < templates.length; i++) {
            const template = templates[i];
            if (!template) {
                console.warn(`⚠️ Template at index ${i} is undefined for ${issueType}`);
                continue;
            }
            // Spread entries over the last 20 days
            const daysAgo = Math.floor(Math.random() * 20) + 1;
            const entryDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            // Create the journal entry
            const entry = {
                title: template.title,
                emotion: template.emotion,
                content: [
                    {
                        insert: template.content + "\\n"
                    }
                ],
                timestamp: firebase_config_1.default.firestore.Timestamp.fromDate(entryDate)
            };
            try {
                // Add to the correct Firestore path
                await this.db
                    .collection('users')
                    .doc(student.uid)
                    .collection('journalEntries')
                    .add(entry);
                entriesAdded++;
            }
            catch (error) {
                console.error(`❌ Error adding ${issueType} entry for ${student.displayName}:`, error);
            }
        }
        console.log(`  ✅ Added ${entriesAdded} ${issueType} entries for ${student.displayName}`);
        return entriesAdded;
    }
}
// Run the seeder
if (require.main === module) {
    const seeder = new MentalHealthTestSeeder();
    seeder.run().then(() => {
        console.log('🎉 Mental health test entries seeding completed!');
        console.log('🧠 Run the mental health analysis in Super Admin to see flags!');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Mental health seeding failed:', error);
        process.exit(1);
    });
}
exports.default = MentalHealthTestSeeder;
//# sourceMappingURL=add-test-mental-health-entries.js.map