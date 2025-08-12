import admin from '../config/firebase.config';

interface StudentData {
  uid: string;
  displayName: string;
  email: string;
  classId: string;
}

interface JournalEntry {
  title: string;
  emotion: string;
  content: any[];
  timestamp: FirebaseFirestore.Timestamp;
}

class JournalEntriesSeeder {
  private db = admin.firestore();
  
  // Sample journal titles and content
  private journalTemplates = [
    {
      title: "My School Day",
      emotions: ['happy', 'excited', 'confused'],
      content: [
        "Today was a great day at school! I learned about fractions in math class.",
        "I made a new friend during lunch break. We played together during recess.",
        "The science experiment was really cool. We made a volcano with baking soda!"
      ]
    },
    {
      title: "Weekend Adventures",
      emotions: ['excited', 'happy', 'sad'],
      content: [
        "This weekend I went to the park with my family. We had a picnic.",
        "I played soccer with my cousins and scored two goals!",
        "Sunday was quiet. I read my favorite book and drew some pictures."
      ]
    },
    {
      title: "Learning New Things",
      emotions: ['confused', 'excited', 'happy'],
      content: [
        "English class was challenging today. We learned about adjectives.",
        "I'm getting better at spelling difficult words. Practice makes perfect!",
        "My teacher said I'm improving in reading. I feel proud of myself."
      ]
    },
    {
      title: "Friendship Stories",
      emotions: ['happy', 'sad', 'excited'],
      content: [
        "My best friend and I worked on a project together. We make a great team!",
        "Sometimes I feel left out when others play games I don't know.",
        "I helped a classmate who was struggling with homework. It felt good to help."
      ]
    },
    {
      title: "Creative Time",
      emotions: ['excited', 'happy', 'confused'],
      content: [
        "In art class, I painted a beautiful landscape with mountains and trees.",
        "I wrote a short story about a magical adventure. Writing is fun!",
        "Music class was interesting. I'm learning to play the recorder."
      ]
    },
    {
      title: "Family Moments",
      emotions: ['happy', 'excited', 'lonely'],
      content: [
        "I helped my mom cook dinner today. We made my favorite pasta.",
        "My little brother can be annoying, but I love him anyway.",
        "Grandpa told me stories about when he was young. They're so interesting!"
      ]
    },
    {
      title: "School Events",
      emotions: ['excited', 'anxious', 'happy'],
      content: [
        "We have a school performance next week. I'm nervous but excited!",
        "Sports day is coming up. I'm practicing for the running race.",
        "The school fair was amazing! There were so many fun activities."
      ]
    },
    {
      title: "Daily Reflections",
      emotions: ['happy', 'confused', 'sad'],
      content: [
        "I'm grateful for my teachers who help me learn new things every day.",
        "Sometimes school work feels hard, but I know I can do it if I try.",
        "I wonder what I want to be when I grow up. There are so many choices!"
      ]
    }
  ];

  async run() {
    try {
      console.log('🚀 Starting journal entries seeding for DIS1SCHOOL1TEACHER1 class...');

      // Find students in DIS1SCHOOL1TEACHER1 class
      const students = await this.findStudentsInClass();
      
      if (students.length === 0) {
        console.log('❌ No students found in DIS1SCHOOL1TEACHER1 class');
        return;
      }

      console.log(`📚 Found ${students.length} students in the class`);

      // Add journal entries for each student
      let totalEntries = 0;
      for (const student of students) {
        const entriesAdded = await this.addJournalEntriesForStudent(student);
        totalEntries += entriesAdded;
      }

      console.log(`✅ Successfully added ${totalEntries} journal entries for ${students.length} students!`);
      
    } catch (error) {
      console.error('❌ Error seeding journal entries:', error);
    }
  }

  private async findStudentsInClass(): Promise<StudentData[]> {
    const students: StudentData[] = [];
    
    // Get all users from Firebase Auth
    const listUsersResult = await admin.auth().listUsers();
    
    for (const user of listUsersResult.users) {
      const claims = user.customClaims;
      
      if (claims && 
          claims.role === 'student' && 
          claims.teacherName === 'DIS1SCHOOL1TEACHER1') {
        
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

  private async addJournalEntriesForStudent(student: StudentData): Promise<number> {
    console.log(`📝 Adding journal entries for ${student.displayName}...`);
    
    let entriesAdded = 0;
    const numEntries = Math.floor(Math.random() * 5) + 3; // 3-7 entries per student
    
    // Generate entries with different dates (last 30 days)
    const now = new Date();
    
    for (let i = 0; i < numEntries; i++) {
      // Random date within last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const entryDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Random template
      const templateIndex = Math.floor(Math.random() * this.journalTemplates.length);
      const template = this.journalTemplates[templateIndex]!; // Non-null assertion since we know the array is not empty
      
      // Random emotion from template's suitable emotions
      const emotionIndex = Math.floor(Math.random() * template.emotions.length);
      const emotion = template.emotions[emotionIndex]!; // Non-null assertion
      
      // Random content from template
      const contentIndex = Math.floor(Math.random() * template.content.length);
      const contentText = template.content[contentIndex]!; // Non-null assertion
      
      // Create the journal entry
      const entry: JournalEntry = {
        title: template.title,
        emotion: emotion,
        content: [
          {
            insert: contentText + "\\n"
          }
        ],
        timestamp: admin.firestore.Timestamp.fromDate(entryDate)
      };

      try {
        // Add to Firestore
        await this.db
          .collection('diaryEntriesBackup')
          .doc(student.uid)
          .collection('entries')
          .add(entry);
        
        entriesAdded++;
      } catch (error) {
        console.error(`❌ Error adding entry for ${student.displayName}:`, error);
      }
    }
    
    console.log(`  ✅ Added ${entriesAdded} entries for ${student.displayName}`);
    return entriesAdded;
  }
}

// Run the seeder
if (require.main === module) {
  const seeder = new JournalEntriesSeeder();
  seeder.run().then(() => {
    console.log('🎉 Journal entries seeding completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
}

export default JournalEntriesSeeder; 