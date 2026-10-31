namespace ProcureFlow.Application.Seeding
{
    public class AdminSeedOptions
    {
        public const string SectionName = "AdminSeed";

        public bool Enabled { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string FullName { get; set; } = "Administrador";
        public string DepartmentName { get; set; } = "Administración";
    }
}
