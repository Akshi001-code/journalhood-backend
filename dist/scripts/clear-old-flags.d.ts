/**
 * Script to clear old student flags data
 * Run this to ensure fresh, consistent flagged students data
 */
declare class FlagsCleaner {
    private db;
    clearOldFlags(): Promise<void>;
    run(): Promise<void>;
}
export default FlagsCleaner;
