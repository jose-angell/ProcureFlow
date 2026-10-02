using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Application.PurchaseRequests;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Tests.TestSupport;

namespace ProcureFlow.Tests.Application
{
    public class PurchaseRequestUseCaseTests
    {
        [Fact]
        public async Task Create_ShouldCreateDraft_ForCurrentRequester()
        {
            // Arrange
            using var db = new TestDbContextFactory();

            var department = new Department("IT");

            var user = new User(
                "José Gallardo",
                "jose@test.com",
                "hashed-password",
                UserRole.Requester,
                department.Id);

            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(user);

                await seedContext.SaveChangesAsync();
            }

            var currentUserService = new FakeCurrentUserService(
                user.Id,
                UserRole.Requester);

            using var context = db.CreateContext();

            var useCase = new PurchaseRequestUseCase(
                context,
                currentUserService);

            var request = new CreatePurchaseRequestRequest
            {
                Priority = PurchaseRequestPriority.Medium,
                Justification = "Equipo para nuevo colaborador"
            };

            // Act
            var result = await useCase.Create(request);

            // Assert
            Assert.Equal(user.Id, result.RequestedByUserId);
            Assert.Equal(department.Id, result.DepartmentId);
            Assert.Equal(PurchaseRequestStatus.Draft, result.Status);
            Assert.Equal(0m, result.TotalAmount);

            using var verifyContext = db.CreateContext();

            var savedRequest = await verifyContext.PurchaseRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(pr => pr.Id == result.Id);

            Assert.NotNull(savedRequest);
            Assert.Equal(user.Id, savedRequest.RequestedByUserId);
        }
        [Fact]
        public async Task AddItem_ShouldThrowForbidden_WhenUserIsNotOwner()
        {
            // Arrange
            using var db = new TestDbContextFactory();

            var department = new Department("IT");

            var user = new User(
                "José Gallardo",
                "jose@test.com",
                "hashed-password",
                UserRole.Requester,
                department.Id);

            var user2 = new User(
               "tests user",
               "testsUser@test.com",
               "hashed-password",
               UserRole.Requester,
               department.Id);

            var request = new PurchaseRequest(user.Id, department.Id, PurchaseRequestPriority.High, "Equipo para nuevo colaborador");

            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(user);
                seedContext.Users.Add(user2);
                seedContext.PurchaseRequests.Add(request);

                await seedContext.SaveChangesAsync();
            }

            var currentUserService = new FakeCurrentUserService(
                user2.Id,
                UserRole.Requester);

            using var context = db.CreateContext();

            var useCase = new PurchaseRequestUseCase(
                context,
                currentUserService);

            var requestItem = new CreatePurchaseRequestItemRequest
            {
                Description = "description tests",
                Quantity = 1,
                UnitPrice = 1244m
            };

            // Act
            Func<Task> act = () => useCase.AddItem(request.Id, requestItem);

            // Assert
            await Assert.ThrowsAsync<ForbiddenException>(act);
        }
        [Fact]
        public async Task Submit_ShouldThrowForbidden_WhenUserIsNotOwner()
        {
            // Arrange
            using var db = new TestDbContextFactory();

            var department = new Department("IT");

            var user = new User(
                "José Gallardo",
                "jose@test.com",
                "hashed-password",
                UserRole.Requester,
                department.Id);

            var user2 = new User(
               "tests user",
               "testsUser@test.com",
               "hashed-password",
               UserRole.Requester,
               department.Id);

            var request = new PurchaseRequest(user.Id, department.Id, PurchaseRequestPriority.High, "Equipo para nuevo colaborador");
            var item = new PurchaseRequestItem(request.Id, "description Tests", 1, 1340m);
            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(user);
                seedContext.Users.Add(user2);
                seedContext.PurchaseRequests.Add(request);
                seedContext.PurchaseRequestItems.Add(item);

                await seedContext.SaveChangesAsync();
            }

            var currentUserService = new FakeCurrentUserService(
                user2.Id,
                UserRole.Requester);

            using var context = db.CreateContext();

            var useCase = new PurchaseRequestUseCase(
                context,
                currentUserService);


            // Act
            Func<Task> act = () => useCase.Submit(request.Id);

            // Assert
            await Assert.ThrowsAsync<ForbiddenException>(act);
        }
    }
}
