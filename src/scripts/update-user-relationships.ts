import admin from "../config/firebase.config";
import { ROLES } from "../config/app.config";

interface SchoolData {
  districtId: string;
}

interface TeacherData {
  schoolId: string;
  gradeId: string;
  gradeName: string;
  division: string;
}

interface CustomClaims {
  role?: string;
  district?: string;
  districtId?: string;
  districtName?: string;
  schoolId?: string;
  gradeId?: string;
  gradeName?: string;
  division?: string;
  [key: string]: any;
}

async function updateUserRelationships() {
  try {
    console.log("Starting user relationships update...");
    
    // Get all users
    const { users } = await admin.auth().listUsers();
    
    // Get all schools with their district IDs
    const schoolsSnapshot = await admin.firestore().collection("schools").get();
    const schoolsMap = new Map<string, SchoolData>(
      schoolsSnapshot.docs.map(doc => [
        doc.id,
        { districtId: doc.data().districtId }
      ])
    );

    // Get all teachers with their class info
    const teachersSnapshot = await admin.firestore().collection("classes").get();
    const teachersMap = new Map<string, TeacherData>();
    teachersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.teacherId) {
        teachersMap.set(data.teacherId, {
          schoolId: data.schoolId || '',
          gradeId: data.gradeId || '',
          gradeName: data.gradeName || '',
          division: data.division || ''
        });
      }
    });

    let updatedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of users) {
      const claims = (user.customClaims || {}) as CustomClaims;
      const role = claims.role;
      let newClaims: CustomClaims = { ...claims };

      try {
        switch (role) {
          case ROLES.DISTRICT_ADMIN:
            // Get district info
            if (claims.district && !claims.districtId) {
              const districtDoc = await admin.firestore()
                .collection("districts")
                .doc(claims.district)
                .get();
              
              if (districtDoc.exists) {
                const districtData = districtDoc.data();
                newClaims = {
                  ...newClaims,
                  districtId: claims.district,
                  districtName: districtData?.name || ''
                };
                delete newClaims.district; // Remove old field
              }
            }
            break;

          case ROLES.SCHOOL_ADMIN:
            // Add district ID if missing
            if (claims.schoolId && !claims.districtId) {
              const schoolInfo = schoolsMap.get(claims.schoolId);
              if (schoolInfo) {
                newClaims = {
                  ...newClaims,
                  districtId: schoolInfo.districtId
                };
              }
            }
            break;

          case ROLES.TEACHER:
            // Add district ID and update school info if missing
            if (claims.schoolId && !claims.districtId) {
              const schoolInfo = schoolsMap.get(claims.schoolId);
              if (schoolInfo) {
                newClaims = {
                  ...newClaims,
                  districtId: schoolInfo.districtId
                };
              }
            }
            
            // Update teacher class info if available
            const teacherInfo = teachersMap.get(user.uid);
            if (teacherInfo) {
              newClaims = {
                ...newClaims,
                ...teacherInfo
              };
            }
            break;

          case ROLES.STUDENT:
            // Add district ID if missing
            if (claims.schoolId && !claims.districtId) {
              const schoolInfo = schoolsMap.get(claims.schoolId);
              if (schoolInfo) {
                newClaims = {
                  ...newClaims,
                  districtId: schoolInfo.districtId
                };
              }
            }
            break;
        }

        // Update claims if they changed
        if (JSON.stringify(claims) !== JSON.stringify(newClaims)) {
          await admin.auth().setCustomUserClaims(user.uid, newClaims);
          console.log(`Updated claims for user ${user.email} (${role})`);
          updatedCount++;
        }

      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log(`Finished updating user relationships!`);
    console.log(`Updated ${updatedCount} users`);
    if (errorCount > 0) {
      console.log(`Encountered errors with ${errorCount} users`);
    }
  } catch (error) {
    console.error("Error updating user relationships:", error);
  }
}

// Execute the update
updateUserRelationships().then(() => {
  console.log("Script completed!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
}); 