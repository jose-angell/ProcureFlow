using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;

namespace ProcureFlow.Application.Seeding
{
    public class AdminSeeder
    {
        private const int MinPasswordLength = 8;

        private readonly IApplicationDbContext _context;
        private readonly IPasswordHashService _passwordHashService;
        private readonly ILogger<AdminSeeder> _logger;

        public AdminSeeder(
            IApplicationDbContext context,
            IPasswordHashService passwordHashService,
            ILogger<AdminSeeder> logger)
        {
            _context = context;
            _passwordHashService = passwordHashService;
            _logger = logger;
        }

        public async Task SeedAsync(AdminSeedOptions options)
        {
            if (!options.Enabled) return;

            var email = options.Email?.Trim();
            var fullName = options.FullName?.Trim();
            var departmentName = options.DepartmentName?.Trim();
            Validate(email, options.Password);

            if (await _context.Users.AnyAsync(u => u.Role == UserRole.Admin))
            {
                _logger.LogInformation("Ya existe un administrador; se omite la creación del administrador inicial.");
                return;
            }

            if (await _context.Users.AnyAsync(u => u.Email == email))
                throw new InvalidOperationException(
                    $"El correo {email} ya pertenece a un usuario que no es administrador.");

            var department = await _context.Departments
                .FirstOrDefaultAsync(d => d.Name == departmentName);
            if (department is null)
            {
                department = new Department(departmentName!);
                await _context.Departments.AddAsync(department);
            }

            var passwordHash = _passwordHashService.Hash(options.Password!);
            var admin = new User(fullName!, email!, passwordHash, UserRole.Admin, department.Id);
            await _context.Users.AddAsync(admin);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Administrador inicial creado: {Email}.", email);
        }

        private static void Validate(string? email, string? password)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new InvalidOperationException(
                    "AdminSeed:Email es obligatorio cuando AdminSeed:Enabled es true.");

            if (!MailAddress.TryCreate(email, out _))
                throw new InvalidOperationException("AdminSeed:Email no tiene un formato válido.");

            if (string.IsNullOrEmpty(password))
                throw new InvalidOperationException(
                    "AdminSeed:Password es obligatorio cuando AdminSeed:Enabled es true. Configúralo con user-secrets o la variable AdminSeed__Password.");

            if (password.Length < MinPasswordLength)
                throw new InvalidOperationException(
                    $"AdminSeed:Password debe tener al menos {MinPasswordLength} caracteres.");
        }
    }
}
