/**
 * Script to restore journals from analyzedjournals back to diaryEntriesBackup
 * Use this when you need to re-run analysis
 */
declare class JournalRestorer {
    private db;
    restoreJournals(): Promise<void>;
    run(): Promise<void>;
}
export default JournalRestorer;
