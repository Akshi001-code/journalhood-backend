declare class JournalEntriesSeeder {
    private db;
    private journalTemplates;
    run(): Promise<void>;
    private findStudentsInClass;
    private addJournalEntriesForStudent;
}
export default JournalEntriesSeeder;
