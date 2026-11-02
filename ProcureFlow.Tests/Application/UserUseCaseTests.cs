using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Application.Users;
using ProcureFlow.Application.Users.Dtos;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;
using ProcureFlow.Infrastructure.Persistence;
using ProcureFlow.Tests.TestSupport;

namespace ProcureFlow.Tests.Application
{
    public class UserUseCaseTests
    {
        private class FakePasswordHashService : IPasswordHashService
        {
            public string Hash(string password) => $"hash:{password}";
            public bool Verify(string password, string passwordHash) => passwordHash == Hash(password);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task Update_ShouldKeepPasswordHash_WhenPasswordIsEmpty(string? password)
        {
            // Arrange
            using var db = new TestDbContextFactory();

            var department = new Department("IT");
            var user = new User(
                "Usuario de Prueba",
                "usuario@test.com",
                "original-hash",
                UserRole.Requester,
                department.Id);

            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(user);
                await seedContext.SaveChangesAsync();
            }

            using var context = db.CreateContext();
            var useCase = new UserUseCase(context, new FakePasswordHashService(), new FakeCurrentUserService(user.Id, UserRole.Admin));

            var request = new UpdateUserRequest
            {
                FullName = "Usuario Editado",
                Email = "usuario@test.com",
                Password = password,
                DepartmentId = department.Id,
                Role = UserRole.Approver
            };

            // Act
            await useCase.Update(user.Id, request);

            // Assert
            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);

            Assert.Equal("original-hash", saved.PasswordHash);
            Assert.Equal("Usuario Editado", saved.FullName);
            Assert.Equal(UserRole.Approver, saved.Role);
        }

        [Fact]
        public async Task Update_ShouldChangePasswordHash_WhenPasswordIsProvided()
        {
            // Arrange
            using var db = new TestDbContextFactory();

            var department = new Department("IT");
            var user = new User(
                "Usuario de Prueba",
                "usuario@test.com",
                "original-hash",
                UserRole.Requester,
                department.Id);

            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(user);
                await seedContext.SaveChangesAsync();
            }

            using var context = db.CreateContext();
            var useCase = new UserUseCase(context, new FakePasswordHashService(), new FakeCurrentUserService(user.Id, UserRole.Admin));

            var request = new UpdateUserRequest
            {
                FullName = "Usuario de Prueba",
                Email = "usuario@test.com",
                Password = "nueva-clave-123",
                DepartmentId = department.Id,
                Role = UserRole.Requester
            };

            // Act
            await useCase.Update(user.Id, request);

            // Assert
            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);

            Assert.Equal("hash:nueva-clave-123", saved.PasswordHash);
        }

        private const string CurrentPassword = "Password123!";

        private static async Task<(Department Department, User User)> SeedUserAsync(
            TestDbContextFactory db,
            string email = "usuario@test.com",
            bool isActive = true)
        {
            var department = new Department("IT");
            var user = new User(
                "Usuario de Prueba",
                email,
                $"hash:{CurrentPassword}",
                UserRole.Requester,
                department.Id);

            if (!isActive) user.Deactivate();

            using var seedContext = db.CreateContext();
            seedContext.Departments.Add(department);
            seedContext.Users.Add(user);
            await seedContext.SaveChangesAsync();

            return (department, user);
        }

        private static UserUseCase CreateUseCase(AppDbContext context, Guid currentUserId) =>
            new(context, new FakePasswordHashService(), new FakeCurrentUserService(currentUserId, UserRole.Requester));

        [Fact]
        public async Task GetMe_ShouldReturnCurrentUserWithDepartmentName()
        {
            using var db = new TestDbContextFactory();
            var (department, user) = await SeedUserAsync(db);

            using var context = db.CreateContext();
            var result = await CreateUseCase(context, user.Id).GetMe();

            Assert.Equal(user.Id, result.Id);
            Assert.Equal("usuario@test.com", result.Email);
            Assert.Equal(department.Id, result.DepartmentId);
            Assert.Equal("IT", result.DepartmentName);
            Assert.Equal(UserRole.Requester, result.Role);
        }

        [Fact]
        public async Task GetMe_ShouldThrowNotFound_WhenUserDoesNotExist()
        {
            using var db = new TestDbContextFactory();

            using var context = db.CreateContext();
            var useCase = CreateUseCase(context, Guid.NewGuid());

            await Assert.ThrowsAsync<NotFoundException>(() => useCase.GetMe());
        }

        [Fact]
        public async Task UpdateMe_ShouldTrimNameAndEmail_AndKeepRoleDepartmentAndPassword()
        {
            using var db = new TestDbContextFactory();
            var (department, user) = await SeedUserAsync(db);

            using (var context = db.CreateContext())
            {
                await CreateUseCase(context, user.Id).UpdateMe(new UpdateMyProfileRequest
                {
                    FullName = "  Nombre Nuevo  ",
                    Email = "  nuevo@test.com "
                });
            }

            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);

            Assert.Equal("Nombre Nuevo", saved.FullName);
            Assert.Equal("nuevo@test.com", saved.Email);
            Assert.Equal(UserRole.Requester, saved.Role);
            Assert.Equal(department.Id, saved.DepartmentId);
            Assert.True(saved.IsActive);
            Assert.Equal($"hash:{CurrentPassword}", saved.PasswordHash);
        }

        [Fact]
        public async Task UpdateMe_ShouldThrowConflict_WhenEmailBelongsToAnotherUser_AndChangeNothing()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedUserAsync(db);

            using (var seedContext = db.CreateContext())
            {
                var otherDepartment = new Department("Compras");
                seedContext.Departments.Add(otherDepartment);
                seedContext.Users.Add(new User("Otro", "otro@test.com", "hash:x", UserRole.Approver, otherDepartment.Id));
                await seedContext.SaveChangesAsync();
            }

            using (var context = db.CreateContext())
            {
                var useCase = CreateUseCase(context, user.Id);

                await Assert.ThrowsAsync<ConflictException>(() => useCase.UpdateMe(new UpdateMyProfileRequest
                {
                    FullName = "Nombre Nuevo",
                    Email = "otro@test.com"
                }));
            }

            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);

            Assert.Equal("Usuario de Prueba", saved.FullName);
            Assert.Equal("usuario@test.com", saved.Email);
        }

        [Fact]
        public async Task UpdateMe_ShouldAllowKeepingOwnEmail()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedUserAsync(db);

            using var context = db.CreateContext();
            await CreateUseCase(context, user.Id).UpdateMe(new UpdateMyProfileRequest
            {
                FullName = "Nombre Nuevo",
                Email = "usuario@test.com"
            });

            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);
            Assert.Equal("Nombre Nuevo", saved.FullName);
        }

        [Fact]
        public async Task ChangeMyPassword_ShouldStoreNewHash_WhenCurrentPasswordIsCorrect()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedUserAsync(db);

            using (var context = db.CreateContext())
            {
                await CreateUseCase(context, user.Id).ChangeMyPassword(new ChangeMyPasswordRequest
                {
                    CurrentPassword = CurrentPassword,
                    NewPassword = "OtraClave456!"
                });
            }

            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);

            Assert.Equal("hash:OtraClave456!", saved.PasswordHash);
            Assert.Equal("usuario@test.com", saved.Email);
        }

        [Fact]
        public async Task ChangeMyPassword_ShouldThrowDomainException_WhenCurrentPasswordIsWrong()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedUserAsync(db);

            using (var context = db.CreateContext())
            {
                var useCase = CreateUseCase(context, user.Id);

                var exception = await Assert.ThrowsAsync<DomainException>(() => useCase.ChangeMyPassword(new ChangeMyPasswordRequest
                {
                    CurrentPassword = "incorrecta",
                    NewPassword = "OtraClave456!"
                }));

                Assert.Equal("La contraseña actual no es correcta.", exception.Message);
            }

            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == user.Id);
            Assert.Equal($"hash:{CurrentPassword}", saved.PasswordHash);
        }

        [Fact]
        public async Task ChangeMyPassword_ShouldThrowDomainException_WhenNewPasswordEqualsCurrent()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedUserAsync(db);

            using var context = db.CreateContext();
            var useCase = CreateUseCase(context, user.Id);

            var exception = await Assert.ThrowsAsync<DomainException>(() => useCase.ChangeMyPassword(new ChangeMyPasswordRequest
            {
                CurrentPassword = CurrentPassword,
                NewPassword = CurrentPassword
            }));

            Assert.Equal("La nueva contraseña debe ser distinta de la actual.", exception.Message);
        }

        [Fact]
        public async Task ProfileMethods_ShouldThrowForbidden_WhenUserIsInactive()
        {
            using var db = new TestDbContextFactory();
            var (_, user) = await SeedUserAsync(db, isActive: false);

            using var context = db.CreateContext();
            var useCase = CreateUseCase(context, user.Id);

            await Assert.ThrowsAsync<ForbiddenException>(() => useCase.GetMe());
            await Assert.ThrowsAsync<ForbiddenException>(() => useCase.UpdateMe(new UpdateMyProfileRequest
            {
                FullName = "Nombre Nuevo",
                Email = "nuevo@test.com"
            }));
            await Assert.ThrowsAsync<ForbiddenException>(() => useCase.ChangeMyPassword(new ChangeMyPasswordRequest
            {
                CurrentPassword = CurrentPassword,
                NewPassword = "OtraClave456!"
            }));
        }
    }
}
