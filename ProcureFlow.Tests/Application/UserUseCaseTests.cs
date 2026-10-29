using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Users;
using ProcureFlow.Application.Users.Dtos;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
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
            var useCase = new UserUseCase(context, new FakePasswordHashService());

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
            var useCase = new UserUseCase(context, new FakePasswordHashService());

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
    }
}
