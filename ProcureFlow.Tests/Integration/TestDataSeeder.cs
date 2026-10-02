using Microsoft.Extensions.DependencyInjection;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Infrastructure.Persistence;

namespace ProcureFlow.Tests.Integration
{
    public static class TestDataSeeder
    {
        public static async Task<SeededUser> CreateUserAsync(
            IServiceProvider services,
            UserRole role,
            string departmentName,
            string email,
            string password = "Password123!")
        {
            using var scope = services.CreateScope();

            var context =
                scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var passwordHasher =
                scope.ServiceProvider.GetRequiredService<IPasswordHashService>();

            var department = new Department(departmentName);

            context.Departments.Add(department);

            var passwordHash = passwordHasher.Hash(password);

            var user = new User(
                $"Test {role}",
                email,
                passwordHash,
                role,
                department.Id);

            context.Users.Add(user);

            await context.SaveChangesAsync();

            return new SeededUser(
                user.Id,
                department.Id,
                email,
                password);
        }

        public static async Task<Guid> CreateSubmittedPurchaseRequestAsync(
            IServiceProvider services,
            SeededUser requester)
        {
            using var scope = services.CreateScope();

            var context =
                scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var purchaseRequest = new PurchaseRequest(
                requester.UserId,
                requester.DepartmentId,
                PurchaseRequestPriority.Medium,
                "Solicitud creada para prueba de integración");

            purchaseRequest.AddItem(
                "Laptop",
                1,
                15000m);

            purchaseRequest.Submit();

            context.PurchaseRequests.Add(purchaseRequest);

            await context.SaveChangesAsync();

            return purchaseRequest.Id;
        }
    }

    public record SeededUser(
        Guid UserId,
        Guid DepartmentId,
        string Email,
        string Password);
}
