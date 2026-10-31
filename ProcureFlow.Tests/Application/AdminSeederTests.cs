using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Seeding;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Infrastructure.Persistence;
using ProcureFlow.Tests.TestSupport;

namespace ProcureFlow.Tests.Application
{
    public class AdminSeederTests
    {
        private class FakePasswordHashService : IPasswordHashService
        {
            public string Hash(string password) => $"hash:{password}";
            public bool Verify(string password, string passwordHash) => passwordHash == Hash(password);
        }

        private static AdminSeedOptions ValidOptions() => new()
        {
            Enabled = true,
            Email = "admin@test.com",
            Password = "Password123"
        };

        private static AdminSeeder CreateSeeder(AppDbContext context) =>
            new(context, new FakePasswordHashService(), NullLogger<AdminSeeder>.Instance);

        private static async Task SeedAsync(TestDbContextFactory db, AdminSeedOptions options)
        {
            using var context = db.CreateContext();
            await CreateSeeder(context).SeedAsync(options);
        }

        [Fact]
        public async Task Seed_ShouldDoNothing_WhenDisabled()
        {
            using var db = new TestDbContextFactory();
            var options = ValidOptions();
            options.Enabled = false;
            options.Email = null;
            options.Password = null;

            await SeedAsync(db, options);

            using var context = db.CreateContext();
            Assert.Empty(await context.Users.ToListAsync());
            Assert.Empty(await context.Departments.ToListAsync());
        }

        [Fact]
        public async Task Seed_ShouldCreateAdminAndDepartment_WhenNoAdminExists()
        {
            using var db = new TestDbContextFactory();

            await SeedAsync(db, ValidOptions());

            using var context = db.CreateContext();
            var admin = await context.Users.SingleAsync();
            var department = await context.Departments.SingleAsync();
            Assert.Equal(UserRole.Admin, admin.Role);
            Assert.True(admin.IsActive);
            Assert.Equal("admin@test.com", admin.Email);
            Assert.Equal("Administrador", admin.FullName);
            Assert.Equal("Administración", department.Name);
            Assert.True(department.IsActive);
            Assert.Equal(department.Id, admin.DepartmentId);
        }

        [Fact]
        public async Task Seed_ShouldReuseExistingDepartment_WhenNameMatches()
        {
            using var db = new TestDbContextFactory();
            var existing = new Department("Administración");
            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(existing);
                await seedContext.SaveChangesAsync();
            }

            await SeedAsync(db, ValidOptions());

            using var context = db.CreateContext();
            var department = await context.Departments.SingleAsync();
            var admin = await context.Users.SingleAsync();
            Assert.Equal(existing.Id, department.Id);
            Assert.Equal(existing.Id, admin.DepartmentId);
        }

        [Fact]
        public async Task Seed_ShouldSkip_WhenAnAdminAlreadyExists()
        {
            using var db = new TestDbContextFactory();
            var department = new Department("IT");
            var existingAdmin = new User("Otro Admin", "otro@test.com", "hash", UserRole.Admin, department.Id);
            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(existingAdmin);
                await seedContext.SaveChangesAsync();
            }

            await SeedAsync(db, ValidOptions());

            using var context = db.CreateContext();
            var user = await context.Users.SingleAsync();
            Assert.Equal(existingAdmin.Id, user.Id);
            Assert.Single(await context.Departments.ToListAsync());
        }

        [Fact]
        public async Task Seed_ShouldSkip_WhenOnlyAnInactiveAdminExists()
        {
            using var db = new TestDbContextFactory();
            var department = new Department("IT");
            var inactiveAdmin = new User("Admin Inactivo", "inactivo@test.com", "hash", UserRole.Admin, department.Id);
            inactiveAdmin.Deactivate();
            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(inactiveAdmin);
                await seedContext.SaveChangesAsync();
            }

            await SeedAsync(db, ValidOptions());

            using var context = db.CreateContext();
            var user = await context.Users.SingleAsync();
            Assert.Equal(inactiveAdmin.Id, user.Id);
            Assert.False(user.IsActive);
        }

        [Fact]
        public async Task Seed_ShouldBeIdempotent_WhenRunTwice()
        {
            using var db = new TestDbContextFactory();

            await SeedAsync(db, ValidOptions());
            await SeedAsync(db, ValidOptions());

            using var context = db.CreateContext();
            Assert.Single(await context.Users.ToListAsync());
            Assert.Single(await context.Departments.ToListAsync());
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task Seed_ShouldThrow_WhenEmailIsMissing(string? email)
        {
            using var db = new TestDbContextFactory();
            var options = ValidOptions();
            options.Email = email;

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => SeedAsync(db, options));

            Assert.Equal("AdminSeed:Email es obligatorio cuando AdminSeed:Enabled es true.", exception.Message);
        }

        [Fact]
        public async Task Seed_ShouldThrow_WhenEmailIsInvalid()
        {
            using var db = new TestDbContextFactory();
            var options = ValidOptions();
            options.Email = "no-es-un-correo";

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => SeedAsync(db, options));

            Assert.Equal("AdminSeed:Email no tiene un formato válido.", exception.Message);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        public async Task Seed_ShouldThrow_WhenPasswordIsMissing(string? password)
        {
            using var db = new TestDbContextFactory();
            var options = ValidOptions();
            options.Password = password;

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => SeedAsync(db, options));

            Assert.Contains("AdminSeed:Password es obligatorio", exception.Message);
        }

        [Fact]
        public async Task Seed_ShouldThrow_WhenPasswordIsShorterThan8()
        {
            using var db = new TestDbContextFactory();
            var options = ValidOptions();
            options.Password = "1234567";

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => SeedAsync(db, options));

            Assert.Equal("AdminSeed:Password debe tener al menos 8 caracteres.", exception.Message);
            using var context = db.CreateContext();
            Assert.Empty(await context.Users.ToListAsync());
        }

        [Fact]
        public async Task Seed_ShouldThrow_WhenEmailBelongsToNonAdmin()
        {
            using var db = new TestDbContextFactory();
            var department = new Department("IT");
            var requester = new User("Solicitante", "admin@test.com", "original-hash", UserRole.Requester, department.Id);
            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(requester);
                await seedContext.SaveChangesAsync();
            }

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => SeedAsync(db, ValidOptions()));

            Assert.Equal(
                "El correo admin@test.com ya pertenece a un usuario que no es administrador.",
                exception.Message);
            using var context = db.CreateContext();
            var user = await context.Users.SingleAsync();
            Assert.Equal(UserRole.Requester, user.Role);
            Assert.Equal("original-hash", user.PasswordHash);
        }

        [Fact]
        public async Task Seed_ShouldStoreHashedPassword()
        {
            using var db = new TestDbContextFactory();
            var options = ValidOptions();

            await SeedAsync(db, options);

            using var context = db.CreateContext();
            var admin = await context.Users.SingleAsync();
            Assert.NotEqual(options.Password, admin.PasswordHash);
            Assert.True(new FakePasswordHashService().Verify(options.Password!, admin.PasswordHash));
        }
    }
}
