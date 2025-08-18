/**
 * Script to add exactly 50 test journal entries with mental health keywords
 * This will help test the analytics update functionality
 */
declare class Add50EntriesSeeder {
    private db;
    private testEntries;
    findTestStudents(): Promise<import("firebase-admin/auth").UserRecord[]>;
    addEntriesForStudent(student: any, issueType: keyof typeof this.testEntries, numEntries: number): Promise<number>;
    run(): Promise<void>;
}
export default Add50EntriesSeeder;
