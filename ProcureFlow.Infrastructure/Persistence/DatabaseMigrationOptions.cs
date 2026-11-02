namespace ProcureFlow.Infrastructure.Persistence
{
    public class DatabaseMigrationOptions
    {
        public const string SectionName = "Database";

        public bool MigrateOnStartup { get; set; }
    }
}
