import admin from '../config/firebase.config';

interface StudentData {
  uid: string;
  displayName: string;
  email: string;
  classId: string;
  schoolId: string;
  districtId: string;
}

interface JournalEntry {
  title: string;
  emotion: string;
  content: any[];
  timestamp: FirebaseFirestore.Timestamp;
}

class TestJournalSeeder {
  private db = admin.firestore();
  
  // Sample journal content for testing
  private journalTemplates = [
    {
      title: "My Amazing School Day",
      emotion: "happy",
      content: "Today was fantastic! I learned so much in science class about plants and photosynthesis. The teacher showed us a cool experiment with leaves and iodine. I also made a new friend during lunch who loves reading just like me. We talked about our favorite books and exchanged recommendations. Math class was challenging but I solved all the problems correctly. I feel proud of my progress!"
    },
    {
      title: "Weekend Family Time",
      emotion: "excited",
      content: "This weekend was wonderful! We went to the zoo as a family and I saw elephants, lions, and my favorite - the dolphins! They were so smart and playful. My little sister was scared of the lions but I held her hand. We had ice cream and took lots of photos. Sunday was quieter - I helped mom bake cookies and read my favorite story book three times. I love weekends with family!"
    },
    {
      title: "Learning Something New",
      emotion: "confused",
      content: "English class today was quite challenging. We started learning about metaphors and similes, and I found it a bit confusing at first. The teacher explained that comparing things helps make writing more interesting. I practiced with examples like 'brave as a lion' and 'quiet as a mouse'. After working with my partner, I think I understand better now. I'll keep practicing at home."
    },
    {
      title: "Sports and Fun",
      emotion: "excited",
      content: "PE class was amazing today! We played basketball and I scored my first basket ever. The coach taught us new dribbling techniques and how to pass the ball properly. My teammates cheered when I made the shot, which made me feel really happy. I want to practice more so I can get even better. Maybe I'll join the school basketball team next year!"
    },
    {
      title: "Creative Arts Day",
      emotion: "happy",
      content: "Art class was so much fun today! We learned about mixing colors to create new ones. I painted a beautiful sunset with orange, pink, and purple colors. The teacher said my painting showed good use of warm colors. I also tried watercolors for the first time - they're different from regular paints but create such beautiful effects. I want to practice more painting at home."
    },
    {
      title: "Friendship Adventures",
      emotion: "happy",
      content: "Today during recess, my friends and I played a new game called 'Adventure Quest' where we pretended to be explorers. We searched for hidden treasures around the playground and solved riddles together. Sarah found a shiny rock that we decided was our magical gem. Tom made up funny voices for different characters. It's so much fun having creative friends who love to imagine and play!"
    },
    {
      title: "Library Discovery",
      emotion: "excited",
      content: "I found the most amazing book series in the school library today! It's about a young wizard who goes to a magical school. The librarian recommended it and said it's popular with students my age. I borrowed the first book and I'm already on chapter three. The story is so exciting and I can't wait to see what happens next. Reading makes me feel like I'm part of the adventure!"
    },
    {
      title: "Science Experiment",
      emotion: "happy",
      content: "We did the coolest science experiment today! We made volcanoes using baking soda, vinegar, and food coloring. When we mixed them together, they erupted just like real volcanoes! The teacher explained how real volcanoes work and why they erupt. Science is becoming my favorite subject because we get to discover how things work through experiments. I want to be a scientist when I grow up!"
    },
    {
      title: "Music and Melody",
      emotion: "excited",
      content: "Music class was wonderful today! We learned a new song about friendship and practiced singing in harmony. The teacher taught us how different voices can blend together to create beautiful sounds. I discovered that I really enjoy singing, especially the higher notes. We're preparing for the school concert next month and I'm excited to perform in front of our families!"
    },
    {
      title: "Math Challenge",
      emotion: "confused",
      content: "Math class was tricky today. We started learning multiplication tables and I'm finding the larger numbers challenging to remember. The teacher showed us different tricks to help memorize them, like skip counting and using our fingers. My friend helped me practice during lunch break. I know if I keep practicing every day, I'll get better at it. Math puzzles are actually fun once I understand them!"
    },
    {
      title: "Helping Others",
      emotion: "happy",
      content: "Today I helped a new student who just joined our class. She seemed nervous and didn't know where things were, so I showed her around the school. We went to the cafeteria, library, and playground together. I introduced her to my friends and we all played together at recess. It felt really good to help someone feel welcome. The teacher praised me for being kind and helpful."
    },
    {
      title: "Nature Walk",
      emotion: "excited",
      content: "Our class went on a nature walk today to study different types of leaves and trees. We collected samples and learned how to identify oak, maple, and pine trees. I found a really interesting leaf with unique patterns and the teacher let me share it with the class. We also saw squirrels, birds, and butterflies. Being outdoors and learning about nature made me appreciate the environment more."
    },
    {
      title: "Technology Fun",
      emotion: "excited",
      content: "Computer class was amazing today! We learned how to create simple animations using special software. I made a bouncing ball that changes colors as it moves. The teacher showed us how programmers create video games and websites. Technology is so cool and I'm thinking about learning more about coding. Maybe I can create my own games someday!"
    },
    {
      title: "Geography Adventure",
      emotion: "happy",
      content: "We studied different countries in geography class today. I learned about pyramids in Egypt, kangaroos in Australia, and the Great Wall in China. The teacher showed us pictures and videos of these amazing places. I dream about traveling to see these wonders someday. Geography makes the world seem so big and full of interesting places to explore!"
    },
    {
      title: "Cooking Class",
      emotion: "happy",
      content: "We had a special cooking lesson today where we made healthy sandwiches. I learned about different food groups and how to make balanced meals. We used whole grain bread, fresh vegetables, lean meat, and cheese. My sandwich was delicious! The teacher taught us about nutrition and why eating healthy foods helps our bodies grow strong. I want to help cook dinner at home more often."
    }
  ];

  async run() {
    try {
      console.log('🚀 Starting to add 30 test journal entries...');

      // Find available students
      const students = await this.findAvailableStudents();
      
      if (students.length === 0) {
        console.log('❌ No students found in the system');
        return;
      }

      console.log(`📚 Found ${students.length} students available`);

      // Add exactly 30 journal entries
      await this.add30JournalEntries(students);

      console.log(`✅ Successfully added 30 test journal entries!`);
      console.log(`📊 These entries can now be analyzed using the analytics system.`);
      
    } catch (error) {
      console.error('❌ Error adding test journal entries:', error);
    }
  }

  private async findAvailableStudents(): Promise<StudentData[]> {
    const students: StudentData[] = [];
    
    // Get all users from Firebase Auth
    const listUsersResult = await admin.auth().listUsers();
    
    for (const user of listUsersResult.users) {
      const claims = user.customClaims;
      
      if (claims && claims.role === 'student') {
        students.push({
          uid: user.uid,
          displayName: user.displayName || `Student ${user.uid.substring(0, 6)}`,
          email: user.email || '',
          classId: claims.classId || 'unknown',
          schoolId: claims.schoolId || 'unknown',
          districtId: claims.districtId || 'unknown'
        });
      }
    }
    
    return students;
  }

  private async add30JournalEntries(students: StudentData[]): Promise<void> {
    const totalEntries = 30;
    let entriesAdded = 0;
    
    console.log(`📝 Adding ${totalEntries} journal entries across ${students.length} students...`);
    
    // Generate entries with different dates (last 60 days)
    const now = new Date();
    
    for (let i = 0; i < totalEntries; i++) {
      // Distribute entries across available students
      const studentIndex = i % students.length;
      const student = students[studentIndex]!;
      
      // Random date within last 60 days
      const daysAgo = Math.floor(Math.random() * 60);
      const entryDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Random template
      const templateIndex = Math.floor(Math.random() * this.journalTemplates.length);
      const template = this.journalTemplates[templateIndex]!;
      
      // Create the journal entry
      const entry: JournalEntry = {
        title: template.title,
        emotion: template.emotion,
        content: [
          {
            insert: template.content + "\\n"
          }
        ],
        timestamp: admin.firestore.Timestamp.fromDate(entryDate)
      };

      try {
        // Add to diaryEntriesBackup collection (where analytics looks for data)
        await this.db
          .collection('diaryEntriesBackup')
          .doc(student.uid)
          .collection('entries')
          .add(entry);
        
        entriesAdded++;
        
        // Log progress every 10 entries
        if (entriesAdded % 10 === 0) {
          console.log(`  📊 Progress: ${entriesAdded}/${totalEntries} entries added`);
        }
        
      } catch (error) {
        console.error(`❌ Error adding entry ${i + 1} for ${student.displayName}:`, error);
      }
    }
    
    console.log(`✅ Successfully added ${entriesAdded} out of ${totalEntries} journal entries`);
    
    // Show distribution
    const distribution: Record<string, number> = {};
    for (let i = 0; i < totalEntries; i++) {
      const studentIndex = i % students.length;
      const student = students[studentIndex]!;
      distribution[student.displayName] = (distribution[student.displayName] || 0) + 1;
    }
    
    console.log('\n📈 Entry distribution by student:');
    Object.entries(distribution).forEach(([name, count]) => {
      console.log(`  ${name}: ${count} entries`);
    });
  }
}

// Run the seeder
if (require.main === module) {
  const seeder = new TestJournalSeeder();
  seeder.run().then(() => {
    console.log('\n🎉 30 test journal entries added successfully!');
    console.log('💡 You can now run the analytics to see the dashboard update.');
    console.log('📊 Go to Super Admin > Analytics and click "Run Comprehensive Analysis"');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Failed to add test entries:', error);
    process.exit(1);
  });
}

export default TestJournalSeeder; 