"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
async function debugData() {
    console.log("🔍 Debugging database contents...");
    try {
        // Check schools
        console.log("\n📚 SCHOOLS:");
        const schoolsSnapshot = await firebase_config_1.default.firestore().collection('schools').get();
        schoolsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, Name: ${data.name}, DistrictId: ${data.districtId}`);
        });
        // Check classes
        console.log("\n🎓 CLASSES:");
        const classesSnapshot = await firebase_config_1.default.firestore().collection('classes').get();
        classesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, Name: ${data.name}, SchoolId: ${data.schoolId}, Grade: ${data.grade}`);
        });
        // Check specific school's classes
        console.log("\n🔍 CLASSES FOR dis1school1:");
        const dis1school1Classes = await firebase_config_1.default.firestore()
            .collection('classes')
            .where('schoolId', '==', 'dis1school1')
            .get();
        console.log(`Found ${dis1school1Classes.docs.length} classes for dis1school1`);
        dis1school1Classes.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- ${doc.id}: ${data.name} (${data.grade} ${data.division})`);
        });
    }
    catch (error) {
        console.error("Error debugging data:", error);
    }
    process.exit(0);
}
debugData();
//# sourceMappingURL=debug-data.js.map