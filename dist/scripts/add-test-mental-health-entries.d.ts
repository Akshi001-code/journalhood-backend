declare class MentalHealthTestSeeder {
    private db;
    private mentalHealthTemplates;
    run(): Promise<void>;
    private findAllStudents;
    private addMentalHealthEntriesForStudent;
}
export default MentalHealthTestSeeder;
