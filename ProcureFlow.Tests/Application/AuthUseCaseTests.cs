using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Auth;
using ProcureFlow.Application.Auth.Dtos;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Tests.TestSupport;

namespace ProcureFlow.Tests.Application
{
    public class AuthUseCaseTests
    {
        private const string Password = "Password123!";

        private class FakePasswordHashService : IPasswordHashService
        {
            public string Hash(string password) => $"hash:{password}";
            public bool Verify(string password, string passwordHash) => passwordHash == Hash(password);
        }

        private class FakeJwtTokenGenerator : IJwtTokenGenerator
        {
            public string Generate(User user) => $"token:{user.Id}";
        }

        private static async Task<User> SeedAsync(TestDbContextFactory db, bool departmentActive = true)
        {
            var department = new Department("IT");
            if (!departmentActive) department.Deactivate();

            var user = new User("Usuario de Prueba", "usuario@test.com", $"hash:{Password}", UserRole.Requester, department.Id);

            using var context = db.CreateContext();
            context.Departments.Add(department);
            context.Users.Add(user);
            await context.SaveChangesAsync();

            return user;
        }

        private static AuthUseCase CreateUseCase(Infrastructure.Persistence.AppDbContext context) =>
            new(context, new FakePasswordHashService(), new FakeJwtTokenGenerator());

        [Fact]
        public async Task Login_ShouldThrowForbidden_WhenDepartmentIsInactive()
        {
            using var db = new TestDbContextFactory();
            var user = await SeedAsync(db, departmentActive: false);

            using var context = db.CreateContext();
            var useCase = CreateUseCase(context);

            await Assert.ThrowsAsync<ForbiddenException>(() =>
                useCase.Login(new LoginCustomerRequest { Email = user.Email, Password = Password }));
        }

        [Fact]
        public async Task Login_ShouldReturnToken_WhenUserAndDepartmentAreActive()
        {
            using var db = new TestDbContextFactory();
            var user = await SeedAsync(db);

            using var context = db.CreateContext();
            var result = await CreateUseCase(context)
                .Login(new LoginCustomerRequest { Email = user.Email, Password = Password });

            Assert.Equal($"token:{user.Id}", result.AccessToken);
            Assert.Equal("IT", result.DepartmentName);
        }
    }
}
