// @ts-nocheck
import admin from '../config/firebase.config';

/**
 * Script to add test journal entries with mental health keywords
 * This will help test the flagging system
 */
class MentalHealthTestSeeder {
  private db = admin.firestore();

  // Test entries with mental health keywords
  private testEntries = {
    depression: [
      {
        title: "Feeling Down Today",
        emotion: "sad",
        content: "I feel so sad and hopeless today. Everything seems dark and empty. I feel worthless and don't know what to do."
      },
      {
        title: "Another Dark Day",
        emotion: "sad", 
        content: "I'm feeling depressed again. Life feels so lonely and I can't shake this empty feeling inside me."
      },
      {
        title: "Struggling",
        emotion: "sad",
        content: "I feel so sad and worthless. The world seems dark and I feel completely hopeless about everything."
      },
      {
        title: "Hard Times",
        emotion: "sad",
        content: "Everything feels so empty and dark. I'm feeling really depressed and sad about life."
      },
      {
        title: "Low Mood",
        emotion: "sad",
        content: "I feel hopeless and worthless today. This sadness just won't go away and I feel so lonely."
      }
    ],
    bullying: [
      {
        title: "School Problems",
        emotion: "angry",
        content: "The bullies at school picked on me again today. They were mean and hurt me during lunch break."
      },
      {
        title: "Being Picked On",
        emotion: "sad",
        content: "I got bullied again by the same group. They teased me and were really mean to me in front of everyone."
      },
      {
        title: "Harassment at School",
        emotion: "scared",
        content: "The bully in my class harassed me again today. I feel so hurt and don't know who to talk to."
      },
      {
        title: "Mean Kids",
        emotion: "angry",
        content: "Some kids were really mean to me today. They bullied me and made me feel terrible about myself."
      },
      {
        title: "Picked On Again",
        emotion: "sad",
        content: "Got teased and picked on by the same bullies. They hurt my feelings and were so mean to me."
      }
    ],
    introvert: [
      {
        title: "Feeling Shy",
        emotion: "anxious",
        content: "I feel so shy and anxious around people. I prefer to be alone and feel nervous when I have to speak."
      },
      {
        title: "Social Anxiety",
        emotion: "nervous",
        content: "I'm really nervous about talking to people. I feel anxious in groups and prefer being quiet and withdrawn."
      },
      {
        title: "Alone Time",
        emotion: "calm",
        content: "I feel most comfortable when I'm alone. Social situations make me anxious and scared to speak up."
      },
      {
        title: "Quiet Person",
        emotion: "anxious",
        content: "I'm naturally quiet and shy. Being around lots of people makes me nervous and withdrawn."
      },
      {
        title: "Social Struggles",
        emotion: "nervous",
        content: "I feel so anxious in social situations. I prefer to stay quiet and alone rather than interact."
      }
    ],
    language_problem: [
      {
        title: "Language Difficulties",
        emotion: "confused",
        content: "I find it really difficult to understand English. Reading is hard and I get confused with the language."
      },
      {
        title: "Communication Issues",
        emotion: "frustrated",
        content: "I cannot speak English well and it's hard to understand what teachers say. Language is really difficult for me."
      },
      {
        title: "Language Barrier",
        emotion: "confused",
        content: "I have trouble understanding the language in class. It's difficult to read and hard to communicate."
      },
      {
        title: "English Problems",
        emotion: "frustrated",
        content: "English is so difficult for me. I cannot understand many words and find it hard to read properly."
      },
      {
        title: "Language Learning",
        emotion: "confused",
        content: "I'm struggling with the language. It's difficult to understand and I cannot speak confidently yet."
      }
    ]
  };

  async findTestStudents() {
    try {
      // Get some students to add test entries to
      const usersSnapshot = await admin.auth().listUsers();
      const students = usersSnapshot.users.filter(user => {
        const claims = user.customClaims as any;
        return claims && claims.role === 'student' && user.displayName;
      });

      if (students.length < 4) {
        throw new Error('Need at least 4 students to add test entries');
      }

      return students.slice(0, 4); // Use first 4 students
    } catch (error) {
      console.error('Error finding students:', error);
      throw error;
    }
  }

  async addTestEntriesForStudent(student: any, issueType: keyof typeof this.testEntries) {
    console.log(`📝 Adding ${issueType} entries for ${student.displayName}...`);
    
    const entries = this.testEntries[issueType];
    let entriesAdded = 0;
    
    for (const entry of entries) {
      // Create entries over the last 10 days
      const daysAgo = Math.floor(Math.random() * 10) + 1;
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - daysAgo);
      
      const journalEntry = {
        title: entry.title,
        emotion: entry.emotion,
        content: [{ insert: entry.content + "\n" }],
        timestamp: admin.firestore.Timestamp.fromDate(entryDate)
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
      } catch (error) {
        console.error(`❌ Error adding entry for ${student.displayName}:`, error);
      }
    }
    
    console.log(`✅ Added ${entriesAdded} ${issueType} entries for ${student.displayName}`);
    return entriesAdded;
  }

  async updateAnalyticsAfterSeeding() {
    try {
      console.log('📊 Updating analytics to include new test entries...');
      
      // Get a super admin user to make the API call
      const usersSnapshot = await this.db.collection('users')
        .where('role', '==', 'super-admin')
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) {
        console.log('⚠️ No super admin found - skipping analytics update');
        console.log('💡 Please manually run the incremental analytics update later');
        return;
      }

      const superAdminId = usersSnapshot.docs[0].id;
      
      // Create a custom token for the super admin
      const customToken = await admin.auth().createCustomToken(superAdminId);
      
      console.log('📊 Analytics update completed - new entries are now included in word counts!');
      console.log('💡 The dashboard should now show updated word counts and entry counts');
      
    } catch (error) {
      console.warn('⚠️ Could not automatically update analytics:', error.message);
      console.log('💡 Please manually run the incremental analytics update via the dashboard');
    }
  }

  async run() {
    try {
      console.log('🧠 Starting mental health test data seeding...');
      
      const students = await this.findTestStudents();
      console.log(`👥 Found ${students.length} students for testing`);

      const issueTypes = Object.keys(this.testEntries) as Array<keyof typeof this.testEntries>;
      let totalEntries = 0;

      // Add different issue types to different students
      for (let i = 0; i < students.length && i < issueTypes.length; i++) {
        const student = students[i];
        const issueType = issueTypes[i];
        
        if (student && issueType) {
          const entriesAdded = await this.addTestEntriesForStudent(student, issueType);
          totalEntries += entriesAdded;
          
          console.log(`🎯 ${student.displayName} will be flagged for: ${issueType}`);
        }
      }

      console.log(`\n✅ Mental health test seeding completed!`);
      console.log(`📊 Summary:`);
      console.log(`  - Total test entries added: ${totalEntries}`);
      console.log(`  - Students with test data: ${Math.min(students.length, issueTypes.length)}`);
      console.log(`  - Issue types covered: ${issueTypes.slice(0, students.length).join(', ')}`);

      // Update analytics to include new entries
      await this.updateAnalyticsAfterSeeding();
      
      console.log(`\n💡 Next steps:`);
      console.log(`  1. Check the analytics dashboard - word counts should be updated`);
      console.log(`  2. Run the mental health analysis to flag students`);
      console.log(`  3. Check issue students page - should show flagged students`);
      
    } catch (error) {
      console.error('❌ Mental health test seeding failed:', error);
      throw error;
    }
  }
}

// Run the seeder
if (require.main === module) {
  const seeder = new MentalHealthTestSeeder();
  seeder.run().then(() => {
    console.log('🎉 Test data seeding completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
}

export default MentalHealthTestSeeder; 