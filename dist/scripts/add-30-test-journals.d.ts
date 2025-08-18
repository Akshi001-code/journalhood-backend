declare class TestJournalSeeder {
    private db;
    private journalTemplates;
    run(): Promise<void>;
    private findAvailableStudents;
    private add30JournalEntries;
}
export default TestJournalSeeder;
