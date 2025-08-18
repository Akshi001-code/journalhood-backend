"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
class FortyJournalTestSeeder {
    db = firebase_config_1.default.firestore();
    // Different journal content for the second batch
    journalTemplates = [
        {
            title: "Environmental Awareness Day",
            emotion: "excited",
            content: "Today we learned about protecting our environment! We planted trees in the school garden and learned about recycling. I want to help save our planet by reducing waste and using less plastic. Our teacher showed us how small actions can make a big difference. I'm excited to start composting at home and convince my family to use reusable bags."
        },
        {
            title: "Mathematics Discovery",
            emotion: "happy",
            content: "I finally understood fractions today! The teacher used pizza examples to explain how 1/2 means half a pizza. We did fun activities with fraction blocks and I can now add and subtract fractions. Math is becoming more interesting when I can see how it works in real life. I practiced with my homework and got all the answers correct!"
        },
        {
            title: "Cultural Exchange",
            emotion: "curious",
            content: "A student from another country joined our class today. She shared stories about her homeland, the food they eat, and the festivals they celebrate. We learned about different traditions and languages. It's amazing how diverse our world is! I want to learn more about different cultures and maybe travel to other countries someday."
        },
        {
            title: "School Sports Competition",
            emotion: "excited",
            content: "Our school is having an inter-class sports competition next week! I'm participating in the relay race and long jump. We've been practicing during PE class and I'm getting better at running. My teammates are supportive and we encourage each other. I'm nervous but excited to represent our class and do our best!"
        },
        {
            title: "Creative Writing Workshop",
            emotion: "happy",
            content: "We had a special creative writing workshop today. A real author visited our school and taught us how to create interesting characters and exciting plots. I wrote a short story about a magical forest where animals can talk. Writing stories is so much fun and I discovered I have a good imagination. I want to keep writing more stories!"
        },
        {
            title: "Science Fair Preparation",
            emotion: "excited",
            content: "I'm preparing for the school science fair! My project is about how plants grow in different types of soil. I've been conducting experiments for two weeks and recording the results. The plants in organic soil are growing much taller and healthier. Science experiments are fascinating and I love discovering how things work in nature."
        },
        {
            title: "Community Service Project",
            emotion: "happy",
            content: "Our class visited the local animal shelter to help take care of abandoned pets. We fed the animals, cleaned their spaces, and played with them. The animals were so grateful for our attention and love. It felt wonderful to help creatures that need care. I want to continue volunteering and maybe adopt a pet when I'm older."
        },
        {
            title: "Digital Art Class",
            emotion: "excited",
            content: "We learned how to create digital art using tablets and special drawing software today! I designed a colorful landscape with mountains, rivers, and butterflies. Technology makes art creation so exciting with all the different tools and effects available. I love how I can easily fix mistakes and try different colors. Digital art is definitely something I want to explore more."
        },
        {
            title: "Historical Time Travel",
            emotion: "curious",
            content: "In history class, we learned about ancient civilizations like Egypt and Rome. The teacher showed us pictures of pyramids, gladiators, and ancient artifacts. I imagined what it would be like to live in those times. History helps me understand how people lived before us and how our world has changed. I want to visit museums to see real historical objects!"
        },
        {
            title: "Cooking and Nutrition",
            emotion: "happy",
            content: "We had a special cooking class where we made healthy fruit salads and whole grain sandwiches. I learned about the importance of eating colorful fruits and vegetables for good health. We also discussed portion sizes and balanced meals. Cooking is fun and I enjoyed working with my classmates to prepare nutritious snacks. I'll help my family cook healthier meals at home."
        },
        {
            title: "Drama and Theater",
            emotion: "excited",
            content: "Our class is preparing a short play about friendship and teamwork for the school assembly. I'm playing the role of a brave explorer who helps lost travelers find their way home. Memorizing lines is challenging but fun, and working with costumes and props makes it feel real. Acting helps me express emotions and build confidence speaking in front of others."
        },
        {
            title: "Weather and Climate Study",
            emotion: "curious",
            content: "We're studying different types of weather patterns and how climate affects our daily lives. Today we learned about hurricanes, tornadoes, and how meteorologists predict weather. I started keeping a daily weather journal, recording temperature, wind, and precipitation. Understanding weather helps me appreciate the amazing forces of nature and how they shape our world."
        },
        {
            title: "Robotics and Engineering",
            emotion: "excited",
            content: "We built simple robots using building blocks and motors in our engineering class! My robot can move forward, backward, and turn in circles. Learning about gears, wheels, and programming is fascinating. I love solving problems and figuring out how to make mechanical things work. Maybe I'll become an engineer and design robots that help people."
        },
        {
            title: "Language Learning Adventure",
            emotion: "happy",
            content: "We started learning Spanish in our foreign language class! I can already say basic greetings, count to twenty, and name different colors. The teacher uses songs and games to help us remember new words. Learning a new language opens doors to communicate with more people around the world. I'm excited to practice speaking Spanish with native speakers someday."
        },
        {
            title: "Space Exploration Study",
            emotion: "excited",
            content: "Today we learned about planets, stars, and space exploration! We watched videos of astronauts floating in zero gravity and saw pictures from the International Space Station. I'm amazed by how vast the universe is and how scientists send rockets to explore other planets. Space science makes me dream about becoming an astronaut and discovering new worlds beyond Earth."
        },
        {
            title: "Community Garden Project",
            emotion: "happy",
            content: "Our school started a community garden where we grow vegetables and herbs! I planted tomatoes, lettuce, and basil seeds in my assigned plot. Taking care of plants teaches responsibility and patience as we wait for them to grow. It's exciting to see tiny seeds transform into food we can actually eat. Gardening connects me with nature and helps me understand where food comes from."
        },
        {
            title: "Local History Exploration",
            emotion: "curious",
            content: "We took a field trip to explore the history of our town! We visited old buildings, monuments, and heard stories about the first settlers. Learning about our local heritage helps me feel more connected to my community. I discovered that my school building is over 100 years old! Understanding local history makes me appreciate how our town has grown and changed over time."
        },
        {
            title: "Photography and Visual Arts",
            emotion: "excited",
            content: "We learned basic photography techniques using digital cameras today! I practiced taking pictures of flowers, buildings, and my classmates during recess. Learning about lighting, angles, and composition makes me see the world differently. Photography is like painting with light and I love capturing beautiful moments. I want to create a photo album of my school year memories."
        },
        {
            title: "Economics and Money Management",
            emotion: "curious",
            content: "We learned about saving money, budgeting, and how banks work in our life skills class. I started a pretend savings account and learned how interest helps money grow over time. Understanding economics helps me make smart decisions about spending and saving. I want to save money for college and future goals. Financial literacy is an important skill for becoming a responsible adult."
        },
        {
            title: "Marine Biology Discovery",
            emotion: "excited",
            content: "We studied ocean life and marine ecosystems today! I learned about dolphins, whales, coral reefs, and the importance of protecting our oceans. We watched documentaries showing colorful fish and underwater plants. Marine biology fascinates me because there's so much life beneath the ocean surface that we're still discovering. I want to help protect marine environments from pollution."
        }
    ];
    async run() {
        try {
            console.log('🚀 Starting to add 40 additional test journal entries...');
            // Find available students
            const students = await this.findAvailableStudents();
            if (students.length === 0) {
                console.log('❌ No students found in the system');
                return;
            }
            console.log(`📚 Found ${students.length} students available`);
            // Add exactly 40 journal entries
            await this.add40JournalEntries(students);
            console.log(`✅ Successfully added 40 additional test journal entries!`);
            console.log(`📊 Total entries should now be even higher when analyzed.`);
        }
        catch (error) {
            console.error('❌ Error adding additional test journal entries:', error);
        }
    }
    async findAvailableStudents() {
        const students = [];
        // Get all users from Firebase Auth
        const listUsersResult = await firebase_config_1.default.auth().listUsers();
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
    async add40JournalEntries(students) {
        const totalEntries = 40;
        let entriesAdded = 0;
        console.log(`📝 Adding ${totalEntries} additional journal entries across ${students.length} students...`);
        // Generate entries with different dates (last 45 days to spread them out)
        const now = new Date();
        for (let i = 0; i < totalEntries; i++) {
            // Distribute entries across available students
            const studentIndex = (i + 10) % students.length; // Offset to vary distribution
            const student = students[studentIndex];
            // Random date within last 45 days (different range than first script)
            const daysAgo = Math.floor(Math.random() * 45) + 5; // 5-50 days ago
            const entryDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            // Random template
            const templateIndex = Math.floor(Math.random() * this.journalTemplates.length);
            const template = this.journalTemplates[templateIndex];
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
                // Add to diaryEntriesBackup collection (where analytics looks for data)
                await this.db
                    .collection('diaryEntriesBackup')
                    .doc(student.uid)
                    .collection('entries')
                    .add(entry);
                entriesAdded++;
                // Log progress every 10 entries
                if (entriesAdded % 10 === 0) {
                    console.log(`  📊 Progress: ${entriesAdded}/${totalEntries} additional entries added`);
                }
            }
            catch (error) {
                console.error(`❌ Error adding entry ${i + 1} for ${student.displayName}:`, error);
            }
        }
        console.log(`✅ Successfully added ${entriesAdded} out of ${totalEntries} additional journal entries`);
        // Show distribution
        const distribution = {};
        for (let i = 0; i < totalEntries; i++) {
            const studentIndex = (i + 10) % students.length;
            const student = students[studentIndex];
            distribution[student.displayName] = (distribution[student.displayName] || 0) + 1;
        }
        console.log('\n📈 Additional entry distribution by student:');
        Object.entries(distribution).forEach(([name, count]) => {
            console.log(`  ${name}: ${count} additional entries`);
        });
    }
}
// Run the seeder
if (require.main === module) {
    const seeder = new FortyJournalTestSeeder();
    seeder.run().then(() => {
        console.log('\n🎉 40 additional test journal entries added successfully!');
        console.log('💡 You now have even more data to test analytics accumulation.');
        console.log('📊 Expected total: Previous entries + 30 from first script + 40 from this script');
        console.log('🔬 Go to Super Admin > Analytics and click "Run Comprehensive Analysis"');
        console.log('📈 The historical line graph should show more data points over time!');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Failed to add additional test entries:', error);
        process.exit(1);
    });
}
exports.default = FortyJournalTestSeeder;
//# sourceMappingURL=add-40-test-journals.js.map