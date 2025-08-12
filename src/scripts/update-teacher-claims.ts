import admin from "../config/firebase.config";
import { ROLES } from "../config/app.config";

const updateTeacherClaims = async () => {
  try {
    console.log('Starting teacher claims update...');

    // Get all users
    const users = await admin.auth().listUsers();
    
    // Filter for teachers
    const teachers = users.users.filter(user => 
      user.customClaims?.role === ROLES.TEACHER
    );

    console.log(`Found ${teachers.length} teachers to update`);

    // Update each teacher's claims
    for (const teacher of teachers) {
      try {
        const claims = teacher.customClaims;
        if (!claims) {
          console.log(`Teacher ${teacher.uid} has no claims, skipping...`);
          continue;
        }

        // Only update if teacher has gradeName but no gradeId
        if (claims.gradeName && !claims.gradeId) {
          const gradeNumber = claims.gradeName.match(/\d+/)?.[0];
          if (gradeNumber) {
            const updatedClaims = {
              ...claims,
              gradeId: gradeNumber
            };

            await admin.auth().setCustomUserClaims(teacher.uid, updatedClaims);
            console.log(`Updated claims for teacher ${teacher.uid} (${teacher.email})`);
            console.log('New claims:', updatedClaims);
          } else {
            console.log(`Could not extract grade number from gradeName "${claims.gradeName}" for teacher ${teacher.uid}`);
          }
        } else {
          console.log(`Teacher ${teacher.uid} already has gradeId or no gradeName, skipping...`);
        }
      } catch (error) {
        console.error(`Error updating teacher ${teacher.uid}:`, error);
      }
    }

    console.log('Teacher claims update completed');
    process.exit(0);
  } catch (error) {
    console.error('Error updating teacher claims:', error);
    process.exit(1);
  }
};

updateTeacherClaims(); 