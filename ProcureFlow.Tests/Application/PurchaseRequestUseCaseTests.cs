using Microsoft.EntityFrameworkCore;
using ProcureFlow.Application.Exceptions;
using ProcureFlow.Application.PurchaseRequests;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using ProcureFlow.Domain.Entities;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Domain.Exceptions;
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
        [Fact]
        public async Task GetSummary_ShouldCountOnlyOwnRequests_ForRequester()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.RequesterIt.Id, UserRole.Requester));

            // Act
            var result = await useCase.GetSummary();

            // Assert
            Assert.Equal(3, result.Total);
            Assert.Equal(2, result.Draft);
            Assert.Equal(1, result.Submitted);
            Assert.Equal(0, result.Approved);
            Assert.Equal(0, result.Rejected);
            Assert.Equal(0, result.Cancelled);
            // Solo la solicitud Submitted propia tiene una partida de 100.
            Assert.Equal(100m, result.TotalAmount);
            var department = Assert.Single(result.ByDepartment);
            Assert.Equal(seed.It.Id, department.DepartmentId);
            Assert.Equal(3, department.Count);
        }
        [Fact]
        public async Task GetSummary_ShouldCountDepartmentRequests_ForApprover()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.ApproverIt.Id, UserRole.Approver));

            // Act
            var result = await useCase.GetSummary();

            // Assert
            Assert.Equal(4, result.Total);
            Assert.Equal(2, result.Draft);
            Assert.Equal(1, result.Submitted);
            Assert.Equal(1, result.Approved);
            Assert.Equal(0, result.Rejected);
            Assert.Equal(0, result.Cancelled);
            // IT: Submitted + Approved, 100 cada una.
            Assert.Equal(200m, result.TotalAmount);
            var department = Assert.Single(result.ByDepartment);
            Assert.Equal(seed.It.Id, department.DepartmentId);
            Assert.Equal(4, department.Count);
        }
        [Fact]
        public async Task GetSummary_ShouldCountAllRequests_ForAdmin()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            var result = await useCase.GetSummary();

            // Assert
            Assert.Equal(7, result.Total);
            Assert.Equal(3, result.Draft);
            Assert.Equal(1, result.Submitted);
            Assert.Equal(1, result.Approved);
            Assert.Equal(1, result.Rejected);
            Assert.Equal(1, result.Cancelled);
            // Submitted + Approved + Rejected, 100 cada una.
            Assert.Equal(300m, result.TotalAmount);
            Assert.Equal(2, result.ByDepartment.Count);
            Assert.Equal("IT", result.ByDepartment[0].DepartmentName);
            Assert.Equal(4, result.ByDepartment[0].Count);
            Assert.Equal("RRHH", result.ByDepartment[1].DepartmentName);
            Assert.Equal(3, result.ByDepartment[1].Count);
        }
        [Fact]
        public async Task GetAll_ShouldReturnPagedResultOrderedByCreatedAtDescending_WithNames()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            var firstPage = await useCase.GetAll(new PurchaseRequestQuery { Page = 1, PageSize = 3 });
            var lastPage = await useCase.GetAll(new PurchaseRequestQuery { Page = 3, PageSize = 3 });

            // Assert
            Assert.Equal(7, firstPage.TotalCount);
            Assert.Equal(1, firstPage.Page);
            Assert.Equal(3, firstPage.PageSize);
            Assert.Equal(3, firstPage.Items.Count);
            Assert.Equal(
                firstPage.Items.OrderByDescending(i => i.CreatedAt).Select(i => i.Id),
                firstPage.Items.Select(i => i.Id));

            var newest = seed.Requests[^1];
            Assert.Equal(newest.Id, firstPage.Items[0].Id);
            Assert.Equal(seed.RequesterIt.FullName, firstPage.Items[0].RequestedByName);
            Assert.Equal("IT", firstPage.Items[0].DepartmentName);

            var oldest = Assert.Single(lastPage.Items);
            Assert.Equal(seed.Requests[0].Id, oldest.Id);
            Assert.Equal(7, lastPage.TotalCount);
        }

        [Fact]
        public async Task GetById_ShouldReturnItems()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var department = new Department("IT");
            var user = new User("Solicitante IT", "req-it@test.com", "hashed-password", UserRole.Requester, department.Id);
            var request = new PurchaseRequest(user.Id, department.Id, PurchaseRequestPriority.High, "Equipo para nuevo colaborador");
            var laptop = request.AddItem("Laptop", 2, 1500m);
            var mouse = request.AddItem("Mouse", 3, 20m);

            using (var seedContext = db.CreateContext())
            {
                seedContext.Departments.Add(department);
                seedContext.Users.Add(user);
                seedContext.PurchaseRequests.Add(request);
                await seedContext.SaveChangesAsync();
            }

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(context, new FakeCurrentUserService(user.Id, UserRole.Requester));

            // Act
            var result = await useCase.GetById(request.Id);

            // Assert
            Assert.Equal(2, result.Items.Count);
            Assert.Equal(2, result.ItemsCount);
            var laptopDto = Assert.Single(result.Items, i => i.Id == laptop.Id);
            Assert.Equal(request.Id, laptopDto.PurchaseRequestId);
            Assert.Equal("Laptop", laptopDto.Description);
            Assert.Equal(2, laptopDto.Quantity);
            Assert.Equal(1500m, laptopDto.UnitPrice);
            Assert.Contains(result.Items, i => i.Id == mouse.Id && i.Description == "Mouse");
        }

        [Fact]
        public async Task GetAll_ShouldFilterByPriority()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using (var seedContext = db.CreateContext())
            {
                seedContext.PurchaseRequests.Add(new PurchaseRequest(
                    seed.RequesterIt.Id,
                    seed.It.Id,
                    PurchaseRequestPriority.High,
                    "Solicitud de prioridad alta"));
                await seedContext.SaveChangesAsync();
            }

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            var high = await useCase.GetAll(new PurchaseRequestQuery { Priority = "high" });
            var medium = await useCase.GetAll(new PurchaseRequestQuery { Priority = "Medium" });

            // Assert
            Assert.Equal(1, high.TotalCount);
            Assert.All(high.Items, i => Assert.Equal(PurchaseRequestPriority.High, i.Priority));
            Assert.Equal(7, medium.TotalCount);
        }

        [Fact]
        public async Task GetAll_ShouldThrowDomainException_WhenPriorityIsInvalid()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act & Assert
            var exception = await Assert.ThrowsAsync<DomainException>(
                () => useCase.GetAll(new PurchaseRequestQuery { Priority = "foo" }));
            Assert.Equal("La prioridad no es válida.", exception.Message);
        }

        [Fact]
        public async Task GetAll_ShouldMapDecisionFields()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            var result = await useCase.GetAll(new PurchaseRequestQuery { Page = 1, PageSize = 50 });

            // Assert
            var rejected = Assert.Single(result.Items, i => i.Status == PurchaseRequestStatus.Rejected);
            Assert.NotNull(rejected.DecidedAt);
            Assert.Equal("Sin presupuesto", rejected.DecisionComment);
            Assert.Equal(seed.ApproverIt.FullName, rejected.DecidedByName);

            var approved = Assert.Single(result.Items, i => i.Status == PurchaseRequestStatus.Approved);
            Assert.NotNull(approved.DecidedAt);
            Assert.Null(approved.DecisionComment);
            Assert.Equal(seed.ApproverIt.FullName, approved.DecidedByName);

            Assert.All(
                result.Items.Where(i => i.Status != PurchaseRequestStatus.Approved && i.Status != PurchaseRequestStatus.Rejected),
                i =>
                {
                    Assert.Null(i.DecidedAt);
                    Assert.Null(i.DecisionComment);
                    Assert.Null(i.DecidedByName);
                });
        }

        [Fact]
        public async Task GetById_ShouldMapDecisionFields()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);
            var rejectedId = seed.Requests.Single(r => r.Status == PurchaseRequestStatus.Rejected).Id;
            var draftId = seed.Requests.First(r => r.Status == PurchaseRequestStatus.Draft).Id;

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            var rejected = await useCase.GetById(rejectedId);
            var draft = await useCase.GetById(draftId);

            // Assert
            Assert.NotNull(rejected.DecidedAt);
            Assert.Equal("Sin presupuesto", rejected.DecisionComment);
            Assert.Equal(seed.ApproverIt.FullName, rejected.DecidedByName);
            Assert.Null(draft.DecidedAt);
            Assert.Null(draft.DecisionComment);
            Assert.Null(draft.DecidedByName);
        }

        [Fact]
        public async Task GetAll_ShouldReturnOnlyDecidedByCurrentUser_WhenDecidedByMe()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);
            var decidedByAdmin = CreateRequestInStatus(seed.RequesterIt, seed.It, PurchaseRequestStatus.Approved, seed.Admin);

            using (var seedContext = db.CreateContext())
            {
                seedContext.PurchaseRequests.Add(decidedByAdmin);
                await seedContext.SaveChangesAsync();
            }

            using var approverContext = db.CreateContext();
            var approverUseCase = new PurchaseRequestUseCase(
                approverContext,
                new FakeCurrentUserService(seed.ApproverIt.Id, UserRole.Approver));
            using var adminContext = db.CreateContext();
            var adminUseCase = new PurchaseRequestUseCase(
                adminContext,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            var approverResult = await approverUseCase.GetAll(new PurchaseRequestQuery { DecidedByMe = true });
            var adminResult = await adminUseCase.GetAll(new PurchaseRequestQuery { DecidedByMe = true });
            var adminAll = await adminUseCase.GetAll(new PurchaseRequestQuery { DecidedByMe = false });

            // Assert
            // El Approver solo ve su departamento (IT): la decisión suya en RRHH queda fuera.
            var approverItem = Assert.Single(approverResult.Items);
            Assert.Equal(seed.ApproverIt.FullName, approverItem.DecidedByName);
            var adminItem = Assert.Single(adminResult.Items);
            Assert.Equal(decidedByAdmin.Id, adminItem.Id);
            Assert.Equal(seed.Admin.FullName, adminItem.DecidedByName);
            Assert.Equal(8, adminAll.TotalCount);
        }

        [Fact]
        public async Task GetAll_ShouldFilterByDepartmentId()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            var it = await useCase.GetAll(new PurchaseRequestQuery { DepartmentId = seed.It.Id });
            var hr = await useCase.GetAll(new PurchaseRequestQuery { DepartmentId = seed.Hr.Id });
            var none = await useCase.GetAll(new PurchaseRequestQuery { DepartmentId = Guid.NewGuid() });

            // Assert
            Assert.Equal(4, it.TotalCount);
            Assert.All(it.Items, i => Assert.Equal(seed.It.Id, i.DepartmentId));
            Assert.Equal(3, hr.TotalCount);
            Assert.All(hr.Items, i => Assert.Equal(seed.Hr.Id, i.DepartmentId));
            Assert.Equal(0, none.TotalCount);
        }

        [Fact]
        public async Task Approve_ShouldAllowAdmin_FromOtherDepartment()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);
            // El Admin del seed pertenece a IT; la solicitud es de RRHH.
            var hrRequest = CreateRequestInStatus(seed.RequesterIt, seed.Hr, PurchaseRequestStatus.Submitted, seed.ApproverIt);

            using (var seedContext = db.CreateContext())
            {
                seedContext.PurchaseRequests.Add(hrRequest);
                await seedContext.SaveChangesAsync();
            }

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.Admin.Id, UserRole.Admin));

            // Act
            await useCase.Approve(hrRequest.Id, new DecisionRequest { Comments = "Autorizada por administración" });

            // Assert
            using var verifyContext = db.CreateContext();
            var saved = await verifyContext.PurchaseRequests
                .Include(pr => pr.ApprovalDecision)
                .SingleAsync(pr => pr.Id == hrRequest.Id);
            Assert.Equal(PurchaseRequestStatus.Approved, saved.Status);
            Assert.Equal(seed.Admin.Id, saved.ApprovalDecision!.ApproverUserId);
        }

        [Fact]
        public async Task Approve_ShouldThrowForbidden_WhenApproverIsFromOtherDepartment()
        {
            // Arrange
            using var db = new TestDbContextFactory();
            var seed = await SeedSummaryDataAsync(db);
            var hrRequest = CreateRequestInStatus(seed.RequesterIt, seed.Hr, PurchaseRequestStatus.Submitted, seed.ApproverIt);

            using (var seedContext = db.CreateContext())
            {
                seedContext.PurchaseRequests.Add(hrRequest);
                await seedContext.SaveChangesAsync();
            }

            using var context = db.CreateContext();
            var useCase = new PurchaseRequestUseCase(
                context,
                new FakeCurrentUserService(seed.ApproverIt.Id, UserRole.Approver));

            // Act & Assert
            await Assert.ThrowsAsync<ForbiddenException>(
                () => useCase.Approve(hrRequest.Id, new DecisionRequest { Comments = null }));
        }

        private sealed class SummarySeed
        {
            public Department It { get; init; } = null!;
            public Department Hr { get; init; } = null!;
            public User RequesterIt { get; init; } = null!;
            public User ApproverIt { get; init; } = null!;
            public User Admin { get; init; } = null!;
            // Ordenadas de la más antigua a la más reciente.
            public List<PurchaseRequest> Requests { get; init; } = [];
        }

        /// <summary>
        /// IT: 4 solicitudes (3 de RequesterIt: Draft, Submitted, Draft; 1 de otro solicitante: Approved).
        /// RRHH: 3 solicitudes (Rejected, Cancelled, Draft).
        /// </summary>
        private static async Task<SummarySeed> SeedSummaryDataAsync(TestDbContextFactory db)
        {
            var it = new Department("IT");
            var hr = new Department("RRHH");

            var requesterIt = new User("Solicitante IT", "req-it@test.com", "hashed-password", UserRole.Requester, it.Id);
            var otherRequesterIt = new User("Otro Solicitante IT", "req2-it@test.com", "hashed-password", UserRole.Requester, it.Id);
            var requesterHr = new User("Solicitante RRHH", "req-hr@test.com", "hashed-password", UserRole.Requester, hr.Id);
            var approverIt = new User("Aprobador IT", "approver-it@test.com", "hashed-password", UserRole.Approver, it.Id);
            var admin = new User("Administrador", "admin@test.com", "hashed-password", UserRole.Admin, it.Id);

            var plan = new (User Owner, Department Department, PurchaseRequestStatus Status)[]
            {
                (requesterHr, hr, PurchaseRequestStatus.Rejected),
                (requesterHr, hr, PurchaseRequestStatus.Cancelled),
                (requesterHr, hr, PurchaseRequestStatus.Draft),
                (otherRequesterIt, it, PurchaseRequestStatus.Approved),
                (requesterIt, it, PurchaseRequestStatus.Draft),
                (requesterIt, it, PurchaseRequestStatus.Submitted),
                (requesterIt, it, PurchaseRequestStatus.Draft),
            };

            var requests = new List<PurchaseRequest>();
            foreach (var (owner, department, status) in plan)
            {
                // CreatedAt usa UtcNow: la pausa garantiza un orden estricto.
                await Task.Delay(5);
                requests.Add(CreateRequestInStatus(owner, department, status, approverIt));
            }

            using var seedContext = db.CreateContext();
            seedContext.Departments.AddRange(it, hr);
            seedContext.Users.AddRange(requesterIt, otherRequesterIt, requesterHr, approverIt, admin);
            seedContext.PurchaseRequests.AddRange(requests);
            await seedContext.SaveChangesAsync();

            return new SummarySeed
            {
                It = it,
                Hr = hr,
                RequesterIt = requesterIt,
                ApproverIt = approverIt,
                Admin = admin,
                Requests = requests
            };
        }

        private static PurchaseRequest CreateRequestInStatus(
            User owner,
            Department department,
            PurchaseRequestStatus status,
            User approver)
        {
            var request = new PurchaseRequest(
                owner.Id,
                department.Id,
                PurchaseRequestPriority.Medium,
                "Justificación de prueba");

            switch (status)
            {
                case PurchaseRequestStatus.Cancelled:
                    request.Cancel();
                    break;
                case PurchaseRequestStatus.Submitted:
                case PurchaseRequestStatus.Approved:
                case PurchaseRequestStatus.Rejected:
                    request.AddItem("Item de prueba", 1, 100m);
                    request.Submit();
                    if (status == PurchaseRequestStatus.Approved) request.Approve(approver.Id, null);
                    if (status == PurchaseRequestStatus.Rejected) request.Reject(approver.Id, "Sin presupuesto");
                    break;
            }

            return request;
        }
    }
}
