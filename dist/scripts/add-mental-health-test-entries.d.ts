/**
 * Script to add test journal entries with mental health keywords
 * This will help test the flagging system
 */
declare class MentalHealthTestSeeder {
    private db;
    private testEntries;
    findTestStudents(): Promise<import("firebase-admin/auth").UserRecord[]>;
    addTestEntriesForStudent(student: any, issueType: keyof typeof this.testEntries): Promise<number>;
    updateAnalyticsAfterSeeding(): Promise<void>;
    run(): Promise<void>;
}
export default MentalHealthTestSeeder;
