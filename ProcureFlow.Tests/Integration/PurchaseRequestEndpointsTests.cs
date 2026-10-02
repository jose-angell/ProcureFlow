using Microsoft.AspNetCore.Identity.Data;
using ProcureFlow.Application.Auth.Dtos;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using ProcureFlow.Domain.Enums;
using System.Net;
using System.Net.Http.Json;

namespace ProcureFlow.Tests.Integration
{
    public class PurchaseRequestEndpointsTests
    : IntegrationTestBase
    {
        public PurchaseRequestEndpointsTests(
            ProcureFlowWebApplicationFactory factory)
            : base(factory)
        {
        }

        [Fact]
        public async Task CreatePurchaseRequest_ShouldReturnUnauthorized_WhenTokenIsMissing()
        {
            // Arrange
            var request = new CreatePurchaseRequestRequest
            {
                Priority = PurchaseRequestPriority.Medium,
                Justification = "Compra de equipo"
            };

            // Act
            var response = await Client.PostAsJsonAsync(
                "/api/purchase-requests",
                request);

            // Assert
            Assert.Equal(
                HttpStatusCode.Unauthorized,
                response.StatusCode);
        }

        [Fact]
        public async Task Login_ShouldReturnToken_WhenCredentialsAreValid()
        {
            // Arrange
            var requester = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Requester,
                "IT",
                "requester@test.com");

            var request = new LoginRequest
            {
                Email = requester.Email,
                Password = requester.Password
            };

            // Act
            var response = await Client.PostAsJsonAsync(
                "/api/auth/login",
                request);

            // Assert
            Assert.Equal(
                HttpStatusCode.OK,
                response.StatusCode);

            var result = await response.Content
                .ReadFromJsonAsync<AuthResponse>();

            Assert.NotNull(result);
            Assert.False(
                string.IsNullOrWhiteSpace(result.AccessToken));
        }

        [Fact]
        public async Task CreatePurchaseRequest_ShouldReturnCreated_WhenRequesterIsAuthenticated()
        {
            // Arrange
            var requester = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Requester,
                "IT",
                "requester@test.com");

            var token = await LoginAsync(
                requester.Email,
                requester.Password);

            Authenticate(token);

            var request = new CreatePurchaseRequestRequest
            {
                Priority = PurchaseRequestPriority.High,
                Justification = "Compra de laptops"
            };

            // Act
            var response = await Client.PostAsJsonAsync(
                "/api/purchase-requests",
                request);

            // Assert
            Assert.Equal(
                HttpStatusCode.Created,
                response.StatusCode);

            var result = await response.Content
                .ReadFromJsonAsync<PurchaseRequestDto>();

            Assert.NotNull(result);

            Assert.Equal(
                PurchaseRequestStatus.Draft,
                result.Status);

            Assert.Equal(
                0m,
                result.TotalAmount);

            Assert.Equal(
                requester.UserId,
                result.RequestedByUserId);

            Assert.Equal(
                requester.DepartmentId,
                result.DepartmentId);
        }

        [Fact]
        public async Task PurchaseRequest_ShouldReachSubmitted_WhenValidFlowIsCompleted()
        {
            // Arrange
            var requester = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Requester,
                "IT",
                "requester@test.com");

            var token = await LoginAsync(
                requester.Email,
                requester.Password);

            Authenticate(token);

            // Create
            var createResponse = await Client.PostAsJsonAsync(
                "/api/purchase-requests",
                new CreatePurchaseRequestRequest
                {
                    Priority = PurchaseRequestPriority.Medium,
                    Justification = "Compra de monitores"
                });

            Assert.Equal(
                HttpStatusCode.Created,
                createResponse.StatusCode);

            var purchaseRequest =
                await createResponse.Content
                    .ReadFromJsonAsync<PurchaseRequestDto>();

            Assert.NotNull(purchaseRequest);

            // Add item
            var addItemResponse = await Client.PostAsJsonAsync(
                $"/api/purchase-requests/{purchaseRequest.Id}/items",
                new CreatePurchaseRequestItemRequest
                {
                    Description = "Monitor 24 pulgadas",
                    Quantity = 2,
                    UnitPrice = 3500m
                });

            Assert.True(addItemResponse.IsSuccessStatusCode);

            // Submit
            var submitResponse = await Client.PatchAsync(
                $"/api/purchase-requests/{purchaseRequest.Id}/submit",
                null);

            Assert.Equal(
                HttpStatusCode.NoContent,
                submitResponse.StatusCode);

            // Verify through API
            var getResponse = await Client.GetAsync(
                $"/api/purchase-requests/{purchaseRequest.Id}");

            Assert.Equal(
                HttpStatusCode.OK,
                getResponse.StatusCode);

            var result = await getResponse.Content
                .ReadFromJsonAsync<PurchaseRequestDto>();

            Assert.NotNull(result);

            Assert.Equal(
                PurchaseRequestStatus.Submitted,
                result.Status);

            Assert.Equal(
                7000m,
                result.TotalAmount);
        }

        [Fact]
        public async Task Approve_ShouldReturnForbidden_WhenUserIsRequester()
        {
            // Arrange
            var requester = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Requester,
                "IT",
                "requester@test.com");

            var purchaseRequestId =
                await TestDataSeeder.CreateSubmittedPurchaseRequestAsync(
                    Factory.Services,
                    requester);

            var token = await LoginAsync(
                requester.Email,
                requester.Password);

            Authenticate(token);

            // Act
            var response = await Client.PatchAsync(
                $"/api/purchase-requests/{purchaseRequestId}/approve",
                null);

            // Assert
            Assert.Equal(
                HttpStatusCode.Forbidden,
                response.StatusCode);
        }

        [Fact]
        public async Task Approve_ShouldReturnNoContent_WhenApproverBelongsToSameDepartment()
        {
            // Arrange
            var requester = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Requester,
                "IT",
                "requester@test.com");

            var approver = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Approver,
                "IT",
                "approver@test.com");

            var purchaseRequestId =
                await TestDataSeeder.CreateSubmittedPurchaseRequestAsync(
                    Factory.Services,
                    requester);

            var token = await LoginAsync(
                approver.Email,
                approver.Password);

            Authenticate(token);

            // Act
            var response = await Client.PatchAsync(
                $"/api/purchase-requests/{purchaseRequestId}/approve",
                null);

            // Assert
            Assert.Equal(
                HttpStatusCode.NoContent,
                response.StatusCode);

            // Optional:
            // hacer GET y verificar Status == Approved
        }

        [Fact]
        public async Task Approve_ShouldReturnForbidden_WhenApproverBelongsToDifferentDepartment()
        {
            // Arrange
            var requester = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Requester,
                "IT",
                "requester@test.com");

            var approver = await TestDataSeeder.CreateUserAsync(
                Factory.Services,
                UserRole.Approver,
                "Finance",
                "approver@test.com");

            var purchaseRequestId =
                await TestDataSeeder.CreateSubmittedPurchaseRequestAsync(
                    Factory.Services,
                    requester);

            var token = await LoginAsync(
                approver.Email,
                approver.Password);

            Authenticate(token);

            // Act
            var response = await Client.PatchAsync(
                $"/api/purchase-requests/{purchaseRequestId}/approve",
                null);

            // Assert
            Assert.Equal(
                HttpStatusCode.Forbidden,
                response.StatusCode);
        }
    }
}
