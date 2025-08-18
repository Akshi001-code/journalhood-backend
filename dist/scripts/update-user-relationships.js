"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
const app_config_1 = require("../config/app.config");
async function updateUserRelationships() {
    try {
        console.log("Starting user relationships update...");
        // Get all users
        const { users } = await firebase_config_1.default.auth().listUsers();
        // Get all schools with their district IDs
        const schoolsSnapshot = await firebase_config_1.default.firestore().collection("schools").get();
        const schoolsMap = new Map(schoolsSnapshot.docs.map(doc => [
            doc.id,
            { districtId: doc.data().districtId }
        ]));
        // Get all teachers with their class info
        const teachersSnapshot = await firebase_config_1.default.firestore().collection("classes").get();
        const teachersMap = new Map();
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
            const claims = (user.customClaims || {});
            const role = claims.role;
            let newClaims = { ...claims };
            try {
                switch (role) {
                    case app_config_1.ROLES.DISTRICT_ADMIN:
                        // Get district info
                        if (claims.district && !claims.districtId) {
                            const districtDoc = await firebase_config_1.default.firestore()
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
                    case app_config_1.ROLES.SCHOOL_ADMIN:
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
                    case app_config_1.ROLES.TEACHER:
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
                    case app_config_1.ROLES.STUDENT:
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
                    await firebase_config_1.default.auth().setCustomUserClaims(user.uid, newClaims);
                    console.log(`Updated claims for user ${user.email} (${role})`);
                    updatedCount++;
                }
            }
            catch (error) {
                console.error(`Error processing user ${user.email}:`, error);
                errorCount++;
            }
        }
        console.log(`Finished updating user relationships!`);
        console.log(`Updated ${updatedCount} users`);
        if (errorCount > 0) {
            console.log(`Encountered errors with ${errorCount} users`);
        }
    }
    catch (error) {
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
//# sourceMappingURL=update-user-relationships.js.map