using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.PurchaseRequests;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Tests.TestSupport;
using System;
using System.Collections.Generic;
using System.Text;

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
    }
}
