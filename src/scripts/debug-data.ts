import admin from "../config/firebase.config";

async function debugData() {
  console.log("🔍 Debugging database contents...");
  
  try {
    // Check schools
    console.log("\n📚 SCHOOLS:");
    const schoolsSnapshot = await admin.firestore().collection('schools').get();
    schoolsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}, Name: ${data.name}, DistrictId: ${data.districtId}`);
    });

    // Check classes
    console.log("\n🎓 CLASSES:");
    const classesSnapshot = await admin.firestore().collection('classes').get();
    classesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}, Name: ${data.name}, SchoolId: ${data.schoolId}, Grade: ${data.grade}`);
    });

    // Check specific school's classes
    console.log("\n🔍 CLASSES FOR dis1school1:");
    const dis1school1Classes = await admin.firestore()
      .collection('classes')
      .where('schoolId', '==', 'dis1school1')
      .get();
    
    console.log(`Found ${dis1school1Classes.docs.length} classes for dis1school1`);
    dis1school1Classes.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.name} (${data.grade} ${data.division})`);
    });

  } catch (error) {
    console.error("Error debugging data:", error);
  }
  
  process.exit(0);
}

debugData(); 