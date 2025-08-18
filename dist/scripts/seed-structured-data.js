"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
const app_config_1 = require("../config/app.config");
const faker_1 = require("@faker-js/faker");
const encrypt_decrypt_1 = require("../utils/encrypt-decrypt");
const emotions = ['happy', 'sad', 'excited', 'nervous', 'calm', 'angry', 'confused'];
class DataSeeder {
    db = firebase_config_1.default.firestore();
    auth = firebase_config_1.default.auth();
    progress = {
        districtsCreated: 0,
        districtAdminsCreated: 0,
        schoolsCreated: 0,
        schoolAdminsCreated: 0,
        classesCreated: 0,
        teachersCreated: 0,
        studentsCreated: 0,
        journalsCreated: 0
    };
    async seedData() {
        try {
            console.log("🌱 Starting data seeding process...");
            console.log("📊 Structure: 2 Districts → 4 Schools → 8 Classes → 8 Teachers → 40 Students");
            // Create districts and their admins
            for (let i = 1; i <= 2; i++) {
                const districtName = `District ${i}`;
                const districtId = await this.createDistrict(districtName);
                await this.createDistrictAdmin(districtName, districtId);
                // Create schools for this district (2 schools per district)
                for (let j = 1; j <= 2; j++) {
                    const schoolName = `${districtName} School ${j}`;
                    const schoolId = await this.createSchool(schoolName, districtId, districtName);
                    await this.createSchoolAdmin(schoolName, schoolId, districtId);
                    // Create classes for this school (2 classes per school)
                    await this.createClassesForSchool(schoolId, schoolName, districtId, districtName);
                }
            }
            this.printSummary();
        }
        catch (error) {
            console.error("❌ Error in data seeding:", error);
            throw error;
        }
    }
    async createDistrict(name) {
        console.log(`🏢 Creating district: ${name}`);
        const districtRef = this.db.collection("districts").doc();
        await districtRef.set({
            name,
            status: "active",
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        this.progress.districtsCreated++;
        return districtRef.id;
    }
    async createDistrictAdmin(districtName, districtId) {
        console.log(`👤 Creating district admin for: ${districtName}`);
        const email = `district.admin.${districtId}@example.com`;
        const password = app_config_1.DEFAULT_PASSWORDS.DISTRICT_ADMIN;
        const userRecord = await this.auth.createUser({
            email,
            password,
            displayName: `${districtName} Admin`,
            emailVerified: true,
        });
        // Set custom claims
        await this.auth.setCustomUserClaims(userRecord.uid, {
            role: app_config_1.ROLES.DISTRICT_ADMIN,
            districtId,
            districtName,
        });
        // Create user document
        await this.db.collection("users").doc(userRecord.uid).set({
            email,
            displayName: `${districtName} Admin`,
            role: app_config_1.ROLES.DISTRICT_ADMIN,
            status: "active",
            districtId,
            districtName,
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        this.progress.districtAdminsCreated++;
        return userRecord.uid;
    }
    async createSchool(name, districtId, districtName) {
        console.log(`🏫 Creating school: ${name}`);
        const schoolRef = this.db.collection("schools").doc();
        await schoolRef.set({
            name,
            districtId,
            districtName,
            status: "active",
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        this.progress.schoolsCreated++;
        return schoolRef.id;
    }
    async createSchoolAdmin(schoolName, schoolId, districtId) {
        console.log(`👤 Creating school admin for: ${schoolName}`);
        const email = `school.admin.${schoolId}@example.com`;
        const password = app_config_1.DEFAULT_PASSWORDS.SCHOOL_ADMIN;
        const userRecord = await this.auth.createUser({
            email,
            password,
            displayName: `${schoolName} Admin`,
            emailVerified: true,
        });
        // Set custom claims
        await this.auth.setCustomUserClaims(userRecord.uid, {
            role: app_config_1.ROLES.SCHOOL_ADMIN,
            schoolId,
            schoolName,
            districtId,
        });
        // Create user document
        await this.db.collection("users").doc(userRecord.uid).set({
            email,
            displayName: `${schoolName} Admin`,
            role: app_config_1.ROLES.SCHOOL_ADMIN,
            status: "active",
            schoolId,
            schoolName,
            districtId,
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        this.progress.schoolAdminsCreated++;
        return userRecord.uid;
    }
    async createClassesForSchool(schoolId, schoolName, districtId, districtName) {
        console.log(`📚 Creating classes for ${schoolName}...`);
        const grades = ["Grade 6", "Grade 7"];
        const divisions = ["A", "B"];
        for (const grade of grades) {
            for (const division of divisions) {
                // Create class
                const classId = await this.createClass(grade, division, schoolId, schoolName);
                // Create teacher for this class
                await this.createTeacher(grade, division, classId, schoolId, schoolName, districtId);
                // Create students for this class
                await this.createStudentsForClass(classId, grade, division, schoolId, schoolName, districtId, districtName);
            }
        }
    }
    async createClass(gradeName, division, schoolId, schoolName) {
        const classRef = this.db.collection("classes").doc();
        await classRef.set({
            gradeName,
            division,
            schoolId,
            schoolName,
            maxStudents: 30,
            studentCount: 0,
            status: "active",
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        this.progress.classesCreated++;
        return classRef.id;
    }
    async createTeacher(gradeName, division, classId, schoolId, schoolName, districtId) {
        const teacherName = faker_1.faker.person.fullName();
        const email = `teacher.${classId}@example.com`;
        const password = app_config_1.DEFAULT_PASSWORDS.TEACHER;
        const userRecord = await this.auth.createUser({
            email,
            password,
            displayName: teacherName,
            emailVerified: true,
        });
        // Set custom claims
        await this.auth.setCustomUserClaims(userRecord.uid, {
            role: app_config_1.ROLES.TEACHER,
            schoolId,
            schoolName,
            districtId,
            classId,
            gradeName,
            division,
        });
        // Create user document
        await this.db.collection("users").doc(userRecord.uid).set({
            email,
            displayName: teacherName,
            role: app_config_1.ROLES.TEACHER,
            status: "active",
            schoolId,
            schoolName,
            districtId,
            classId,
            gradeName,
            division,
            createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
        });
        // Update class with teacher info
        await this.db.collection("classes").doc(classId).update({
            teacherId: userRecord.uid,
            teacherName,
        });
        this.progress.teachersCreated++;
        return userRecord.uid;
    }
    async createStudentsForClass(classId, gradeName, division, schoolId, schoolName, districtId, districtName) {
        console.log(`👥 Creating students for ${gradeName} ${division}`);
        // Create 5 students per class
        for (let i = 1; i <= 5; i++) {
            const studentName = faker_1.faker.person.fullName();
            const email = `student.${classId}.${i}@example.com`;
            const password = app_config_1.DEFAULT_PASSWORDS.STUDENT;
            // Create student user
            const userRecord = await this.auth.createUser({
                email,
                password,
                displayName: studentName,
                emailVerified: true,
            });
            // Set custom claims
            await this.auth.setCustomUserClaims(userRecord.uid, {
                role: app_config_1.ROLES.STUDENT,
                schoolId,
                schoolName,
                districtId,
                districtName,
                classId,
                gradeName,
                division,
            });
            // Create user document
            await this.db.collection("users").doc(userRecord.uid).set({
                email,
                displayName: studentName,
                role: app_config_1.ROLES.STUDENT,
                status: "active",
                schoolId,
                schoolName,
                districtId,
                districtName,
                classId,
                gradeName,
                division,
                createdAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase_config_1.default.firestore.FieldValue.serverTimestamp(),
            });
            // Update class student count
            await this.db.collection("classes").doc(classId).update({
                studentCount: firebase_config_1.default.firestore.FieldValue.increment(1),
            });
            // Create journal entries for this student
            await this.createJournalEntriesForStudent(userRecord.uid, studentName);
            this.progress.studentsCreated++;
        }
    }
    async createJournalEntriesForStudent(studentId, studentName) {
        // Create 3-7 random entries per student
        const numEntries = faker_1.faker.number.int({ min: 3, max: 7 });
        for (let i = 0; i < numEntries; i++) {
            // Generate random date within last 30 days
            const date = faker_1.faker.date.recent({ days: 30 });
            const timestamp = firebase_config_1.default.firestore.Timestamp.fromDate(date);
            // Generate entry content in Delta format (like QuillJS)
            const contentDelta = [
                { insert: faker_1.faker.lorem.paragraph(3) + "\n" },
                { insert: faker_1.faker.lorem.paragraph(2) + "\n" },
                {
                    insert: "\n",
                    attributes: { align: "left" }
                }
            ];
            // Create entry data
            const entry = {
                title: faker_1.faker.lorem.sentence(4),
                emotion: emotions[Math.floor(Math.random() * emotions.length)] || 'neutral',
                content: contentDelta,
                timestamp,
                studentId,
                studentName,
            };
            // Create encrypted version for backup
            const encryptedContent = (0, encrypt_decrypt_1.encryptWithUid)(JSON.stringify(contentDelta), studentId);
            const encryptedEntry = {
                ...entry,
                content: encryptedContent
            };
            // Save to both collections
            const entryRef = this.db
                .collection('diaryEntries')
                .doc(studentId)
                .collection('entries')
                .doc();
            const backupRef = this.db
                .collection('diaryEntriesBackup')
                .doc(studentId)
                .collection('entries')
                .doc(entryRef.id); // Use same ID for both
            // Save both versions
            await Promise.all([
                entryRef.set(entry),
                backupRef.set(encryptedEntry)
            ]);
            this.progress.journalsCreated++;
        }
    }
    printSummary() {
        console.log("\n📊 SEEDING SUMMARY");
        console.log("=================");
        console.log(`🏢 Districts created: ${this.progress.districtsCreated}`);
        console.log(`👤 District admins created: ${this.progress.districtAdminsCreated}`);
        console.log(`🏫 Schools created: ${this.progress.schoolsCreated}`);
        console.log(`👤 School admins created: ${this.progress.schoolAdminsCreated}`);
        console.log(`📚 Classes created: ${this.progress.classesCreated}`);
        console.log(`👨‍🏫 Teachers created: ${this.progress.teachersCreated}`);
        console.log(`👥 Students created: ${this.progress.studentsCreated}`);
        console.log(`📝 Journal entries created: ${this.progress.journalsCreated}`);
        console.log("\n✅ Data seeding completed successfully!");
    }
}
async function main() {
    const seeder = new DataSeeder();
    try {
        await seeder.seedData();
        process.exit(0);
    }
    catch (error) {
        console.error("Script failed:", error);
        process.exit(1);
    }
}
// Execute if run directly
if (require.main === module) {
    main().catch((error) => {
        console.error("Unhandled error:", error);
        process.exit(1);
    });
}
exports.default = main;
//# sourceMappingURL=seed-structured-data.js.map