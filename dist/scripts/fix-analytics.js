"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const firebase_config_1 = __importDefault(require("../config/firebase.config"));
class AnalyticsFixerService {
    db = firebase_config_1.default.firestore();
    async fixAnalytics() {
        try {
            console.log('🔧 Starting analytics data fix...');
            // Step 1: Get all users with their hierarchical data
            console.log('👥 Getting all users...');
            const usersSnapshot = await this.db.collection('users').get();
            const users = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Step 2: Get all journal entries
            console.log('📝 Getting all journal entries...');
            const entries = [];
            // Get from diaryEntries (non-encrypted)
            for (const user of users) {
                if (user.role !== 'student')
                    continue;
                const entriesSnapshot = await this.db
                    .collection('diaryEntries')
                    .doc(user.id)
                    .collection('entries')
                    .orderBy('timestamp', 'desc')
                    .get();
                entries.push(...entriesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    studentId: user.id,
                    studentName: user.displayName,
                    classId: user.classId,
                    className: `${user.gradeName} ${user.division}`,
                    schoolId: user.schoolId,
                    schoolName: user.schoolName,
                    districtId: user.districtId,
                    districtName: user.districtName,
                    ...doc.data()
                })));
            }
            console.log(`📊 Found ${entries.length} total entries`);
            // Step 3: Calculate statistics
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const stats = {
                id: new Date().toISOString(),
                timestamp: firebase_config_1.default.firestore.Timestamp.now(),
                totalWords: 0,
                totalEntries: entries.length,
                districtStats: {},
                schoolStats: {},
                classStats: {},
                studentStats: {}
            };
            // Calculate student stats first
            for (const entry of entries) {
                const { studentId, studentName, classId, className, schoolId, schoolName, districtId, districtName, content, emotion, timestamp } = entry;
                // Initialize stats objects if they don't exist
                if (!stats.studentStats[studentId]) {
                    stats.studentStats[studentId] = {
                        studentName,
                        classId,
                        className,
                        schoolId,
                        schoolName,
                        districtId,
                        districtName,
                        totalWords: 0,
                        avgWordsPerEntry: 0,
                        totalEntries: 0,
                        weeklyEntries: 0,
                        monthlyEntries: 0,
                        weeklyAvgWords: 0,
                        monthlyAvgWords: 0,
                        emotionDistribution: {},
                        lastEntryDate: ''
                    };
                }
                if (!stats.classStats[classId]) {
                    stats.classStats[classId] = {
                        className,
                        schoolId,
                        schoolName,
                        districtId,
                        districtName,
                        totalWords: 0,
                        avgWordsPerStudent: 0,
                        totalEntries: 0,
                        activeStudents: 0,
                        weeklyEntries: 0,
                        monthlyEntries: 0,
                        weeklyAvgWords: 0,
                        monthlyAvgWords: 0,
                        emotionDistribution: {}
                    };
                }
                if (!stats.schoolStats[schoolId]) {
                    stats.schoolStats[schoolId] = {
                        schoolName,
                        districtId,
                        districtName,
                        totalWords: 0,
                        avgWordsPerStudent: 0,
                        totalEntries: 0,
                        activeStudents: 0,
                        weeklyEntries: 0,
                        monthlyEntries: 0,
                        weeklyAvgWords: 0,
                        monthlyAvgWords: 0,
                        emotionDistribution: {},
                        classes: []
                    };
                    if (!stats.schoolStats[schoolId].classes.includes(classId)) {
                        stats.schoolStats[schoolId].classes.push(classId);
                    }
                }
                if (!stats.districtStats[districtId]) {
                    stats.districtStats[districtId] = {
                        districtName,
                        totalWords: 0,
                        avgWordsPerStudent: 0,
                        totalEntries: 0,
                        activeStudents: 0,
                        weeklyEntries: 0,
                        monthlyEntries: 0,
                        weeklyAvgWords: 0,
                        monthlyAvgWords: 0,
                        emotionDistribution: {},
                        schools: [],
                        classes: []
                    };
                    if (!stats.districtStats[districtId].schools.includes(schoolId)) {
                        stats.districtStats[districtId].schools.push(schoolId);
                    }
                    if (!stats.districtStats[districtId].classes.includes(classId)) {
                        stats.districtStats[districtId].classes.push(classId);
                    }
                }
                // Calculate word count
                let wordCount = 0;
                if (Array.isArray(content)) {
                    wordCount = content
                        .map(item => (item.insert || '').toString().trim())
                        .join(' ')
                        .split(/\s+/)
                        .filter(word => word.length > 0)
                        .length;
                }
                else if (typeof content === 'string') {
                    wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
                }
                // Update student stats
                const student = stats.studentStats[studentId];
                student.totalWords += wordCount;
                student.totalEntries++;
                student.avgWordsPerEntry = Math.round(student.totalWords / student.totalEntries);
                student.emotionDistribution = student.emotionDistribution || {};
                student.emotionDistribution[emotion] = (student.emotionDistribution[emotion] || 0) + 1;
                student.weeklyEntries = student.weeklyEntries || 0;
                student.monthlyEntries = student.monthlyEntries || 0;
                const entryDate = timestamp.toDate();
                if (!student.lastEntryDate || entryDate > new Date(student.lastEntryDate)) {
                    student.lastEntryDate = entryDate.toISOString();
                }
                if (entryDate > weekAgo) {
                    student.weeklyEntries++;
                    student.weeklyAvgWords = Math.round(wordCount / student.weeklyEntries);
                }
                if (entryDate > monthAgo) {
                    student.monthlyEntries++;
                    student.monthlyAvgWords = Math.round(wordCount / student.monthlyEntries);
                }
                // Update class stats
                const classStats = stats.classStats[classId];
                classStats.totalWords += wordCount;
                classStats.totalEntries++;
                classStats.emotionDistribution = classStats.emotionDistribution || {};
                classStats.emotionDistribution[emotion] = (classStats.emotionDistribution[emotion] || 0) + 1;
                classStats.weeklyEntries = classStats.weeklyEntries || 0;
                classStats.monthlyEntries = classStats.monthlyEntries || 0;
                if (entryDate > weekAgo) {
                    classStats.weeklyEntries++;
                    classStats.weeklyAvgWords = Math.round(wordCount / classStats.weeklyEntries);
                }
                if (entryDate > monthAgo) {
                    classStats.monthlyEntries++;
                    classStats.monthlyAvgWords = Math.round(wordCount / classStats.monthlyEntries);
                }
                // Update school stats
                const schoolStats = stats.schoolStats[schoolId];
                schoolStats.totalWords += wordCount;
                schoolStats.totalEntries++;
                schoolStats.emotionDistribution = schoolStats.emotionDistribution || {};
                schoolStats.emotionDistribution[emotion] = (schoolStats.emotionDistribution[emotion] || 0) + 1;
                schoolStats.weeklyEntries = schoolStats.weeklyEntries || 0;
                schoolStats.monthlyEntries = schoolStats.monthlyEntries || 0;
                if (entryDate > weekAgo) {
                    schoolStats.weeklyEntries++;
                    schoolStats.weeklyAvgWords = Math.round(wordCount / schoolStats.weeklyEntries);
                }
                if (entryDate > monthAgo) {
                    schoolStats.monthlyEntries++;
                    schoolStats.monthlyAvgWords = Math.round(wordCount / schoolStats.monthlyEntries);
                }
                // Update district stats
                const districtStats = stats.districtStats[districtId];
                districtStats.totalWords += wordCount;
                districtStats.totalEntries++;
                districtStats.emotionDistribution = districtStats.emotionDistribution || {};
                districtStats.emotionDistribution[emotion] = (districtStats.emotionDistribution[emotion] || 0) + 1;
                districtStats.weeklyEntries = districtStats.weeklyEntries || 0;
                districtStats.monthlyEntries = districtStats.monthlyEntries || 0;
                if (entryDate > weekAgo) {
                    districtStats.weeklyEntries++;
                    districtStats.weeklyAvgWords = Math.round(wordCount / districtStats.weeklyEntries);
                }
                if (entryDate > monthAgo) {
                    districtStats.monthlyEntries++;
                    districtStats.monthlyAvgWords = Math.round(wordCount / districtStats.monthlyEntries);
                }
                // Update total words
                stats.totalWords += wordCount;
            }
            // Calculate averages and active students
            const activeStudentsByClass = new Set();
            const activeStudentsBySchool = new Set();
            const activeStudentsByDistrict = new Set();
            Object.entries(stats.studentStats).forEach(([studentId, student]) => {
                if (student.totalEntries > 0) {
                    activeStudentsByClass.add(`${student.classId}_${studentId}`);
                    activeStudentsBySchool.add(`${student.schoolId}_${studentId}`);
                    activeStudentsByDistrict.add(`${student.districtId}_${studentId}`);
                }
            });
            // Update class stats
            Object.entries(stats.classStats).forEach(([classId, classStats]) => {
                const activeStudents = Array.from(activeStudentsByClass)
                    .filter(key => key.startsWith(`${classId}_`))
                    .length;
                classStats.activeStudents = activeStudents;
                classStats.avgWordsPerStudent = activeStudents > 0
                    ? Math.round(classStats.totalWords / activeStudents)
                    : 0;
            });
            // Update school stats
            Object.entries(stats.schoolStats).forEach(([schoolId, schoolStats]) => {
                const activeStudents = Array.from(activeStudentsBySchool)
                    .filter(key => key.startsWith(`${schoolId}_`))
                    .length;
                schoolStats.activeStudents = activeStudents;
                schoolStats.avgWordsPerStudent = activeStudents > 0
                    ? Math.round(schoolStats.totalWords / activeStudents)
                    : 0;
            });
            // Update district stats
            Object.entries(stats.districtStats).forEach(([districtId, districtStats]) => {
                const activeStudents = Array.from(activeStudentsByDistrict)
                    .filter(key => key.startsWith(`${districtId}_`))
                    .length;
                districtStats.activeStudents = activeStudents;
                districtStats.avgWordsPerStudent = activeStudents > 0
                    ? Math.round(districtStats.totalWords / activeStudents)
                    : 0;
            });
            // Calculate growth rates
            const previousAnalyticsSnapshot = await this.db
                .collection('analyzedData')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();
            if (!previousAnalyticsSnapshot.empty) {
                const previousAnalytics = previousAnalyticsSnapshot.docs[0].data();
                // Calculate growth for each level
                Object.entries(stats.studentStats).forEach(([studentId, student]) => {
                    const previous = previousAnalytics.studentStats?.[studentId];
                    if (previous) {
                        student.weeklyGrowth = this.calculateGrowthRate(previous.weeklyEntries || 0, student.weeklyEntries || 0);
                        student.monthlyGrowth = this.calculateGrowthRate(previous.monthlyEntries || 0, student.monthlyEntries || 0);
                    }
                });
                Object.entries(stats.classStats).forEach(([classId, classStats]) => {
                    const previous = previousAnalytics.classStats?.[classId];
                    if (previous) {
                        classStats.weeklyGrowth = this.calculateGrowthRate(previous.weeklyEntries || 0, classStats.weeklyEntries || 0);
                        classStats.monthlyGrowth = this.calculateGrowthRate(previous.monthlyEntries || 0, classStats.monthlyEntries || 0);
                    }
                });
                Object.entries(stats.schoolStats).forEach(([schoolId, schoolStats]) => {
                    const previous = previousAnalytics.schoolStats?.[schoolId];
                    if (previous) {
                        schoolStats.weeklyGrowth = this.calculateGrowthRate(previous.weeklyEntries || 0, schoolStats.weeklyEntries || 0);
                        schoolStats.monthlyGrowth = this.calculateGrowthRate(previous.monthlyEntries || 0, schoolStats.monthlyEntries || 0);
                    }
                });
                Object.entries(stats.districtStats).forEach(([districtId, districtStats]) => {
                    const previous = previousAnalytics.districtStats?.[districtId];
                    if (previous) {
                        districtStats.weeklyGrowth = this.calculateGrowthRate(previous.weeklyEntries || 0, districtStats.weeklyEntries || 0);
                        districtStats.monthlyGrowth = this.calculateGrowthRate(previous.monthlyEntries || 0, districtStats.monthlyEntries || 0);
                    }
                });
            }
            // Step 4: Save the analytics data
            console.log('💾 Saving analytics data...');
            await this.db.collection('analyzedData').doc(stats.id).set(stats);
            console.log('✅ Analytics data fix completed successfully!');
            console.log('📊 Summary:');
            console.log(`  - Total entries analyzed: ${stats.totalEntries}`);
            console.log(`  - Total words counted: ${stats.totalWords}`);
            console.log(`  - Districts processed: ${Object.keys(stats.districtStats).length}`);
            console.log(`  - Schools processed: ${Object.keys(stats.schoolStats).length}`);
            console.log(`  - Classes processed: ${Object.keys(stats.classStats).length}`);
            console.log(`  - Students processed: ${Object.keys(stats.studentStats).length}`);
            return stats;
        }
        catch (error) {
            console.error('❌ Error fixing analytics:', error);
            throw error;
        }
    }
    calculateGrowthRate(previous, current) {
        if (previous === 0)
            return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }
}
async function main() {
    const fixer = new AnalyticsFixerService();
    try {
        await fixer.fixAnalytics();
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
//# sourceMappingURL=fix-analytics.js.map