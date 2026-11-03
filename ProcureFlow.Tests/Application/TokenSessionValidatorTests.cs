using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Auth;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Tests.TestSupport;

namespace ProcureFlow.Tests.Application
{
    public class TokenSessionValidatorTests
    {
        private static async Task<(Department Department, User User)> SeedAsync(TestDbContextFactory db)
        {
            var department = new Department("IT");
            var user = new User("Usuario de Prueba", "usuario@test.com", "hash", UserRole.Requester, department.Id);

            using var context = db.CreateContext();
            context.Departments.Add(department);
            context.Users.Add(user);
            await context.SaveChangesAsync();

            return (department, user);
        }

        private static TokenSessionClaims ClaimsOf(User user) =>
            new(user.Id, user.Role.ToString(), user.DepartmentId, user.SecurityStamp);

        private static async Task<bool> ValidateAsync(TestDbContextFactory db, TokenSessionClaims claims)
        {
            using var context = db.CreateContext();
            return await new TokenSessionValidator(context).IsValidAsync(claims);
        }

        [Fact]
        public async Task IsValid_ShouldReturnTrue_WhenNothingChanged()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);

            Assert.True(await ValidateAsync(db, ClaimsOf(user)));
        }

        [Fact]
        public async Task IsValid_ShouldReturnFalse_WhenUserDoesNotExist()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);
            var claims = ClaimsOf(user) with { UserId = Guid.NewGuid() };

            Assert.False(await ValidateAsync(db, claims));
        }

        [Fact]
        public async Task IsValid_ShouldReturnFalse_WhenUserWasDeleted()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);

            using (var context = db.CreateContext())
            {
                context.Users.Remove(await context.Users.FirstAsync(u => u.Id == user.Id));
                await context.SaveChangesAsync();
            }

            Assert.False(await ValidateAsync(db, ClaimsOf(user)));
        }

        [Fact]
        public async Task IsValid_ShouldReturnFalse_WhenUserWasDeactivated()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);

            using (var context = db.CreateContext())
            {
                (await context.Users.FirstAsync(u => u.Id == user.Id)).Deactivate();
                await context.SaveChangesAsync();
            }

            Assert.False(await ValidateAsync(db, ClaimsOf(user)));
        }

        [Fact]
        public async Task IsValid_ShouldReturnFalse_WhenDepartmentWasDeactivated()
        {
            using var db = new TestDbContextFactory();
            var (department, user) = await SeedAsync(db);

            using (var context = db.CreateContext())
            {
                (await context.Departments.FirstAsync(d => d.Id == department.Id)).Deactivate();
                await context.SaveChangesAsync();
            }

            Assert.False(await ValidateAsync(db, ClaimsOf(user)));
        }

        [Fact]
        public async Task IsValid_ShouldReturnFalse_WhenRoleChanged()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);

            using (var context = db.CreateContext())
            {
                var saved = await context.Users.FirstAsync(u => u.Id == user.Id);
                saved.Update(saved.FullName, saved.Email, saved.PasswordHash, UserRole.Approver, saved.DepartmentId);
                await context.SaveChangesAsync();
            }

            Assert.False(await ValidateAsync(db, ClaimsOf(user)));
        }

        [Fact]
        public async Task IsValid_ShouldReturnFalse_WhenDepartmentChanged()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);
            var otherDepartment = new Department("Finanzas");

            using (var context = db.CreateContext())
            {
                context.Departments.Add(otherDepartment);
                (await context.Users.FirstAsync(u => u.Id == user.Id)).ChangeDepartment(otherDepartment.Id);
                await context.SaveChangesAsync();
            }

            Assert.False(await ValidateAsync(db, ClaimsOf(user)));
        }

        [Fact]
        public async Task IsValid_ShouldReturnFalse_WhenPasswordChanged()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);

            using (var context = db.CreateContext())
            {
                var saved = await context.Users.FirstAsync(u => u.Id == user.Id);
                saved.Update(saved.FullName, saved.Email, "otro-hash", saved.Role, saved.DepartmentId);
                await context.SaveChangesAsync();
            }

            Assert.False(await ValidateAsync(db, ClaimsOf(user)));
        }

        [Fact]
        public async Task IsValid_ShouldReturnTrue_WhenOnlyNameAndEmailChanged()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedAsync(db);

            using (var context = db.CreateContext())
            {
                var saved = await context.Users.FirstAsync(u => u.Id == user.Id);
                saved.Update("Nombre Nuevo", "nuevo@test.com", saved.PasswordHash, saved.Role, saved.DepartmentId);
                await context.SaveChangesAsync();
            }

            Assert.True(await ValidateAsync(db, ClaimsOf(user)));
        }
    }
}
