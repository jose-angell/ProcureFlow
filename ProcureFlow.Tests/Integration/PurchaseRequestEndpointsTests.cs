using ProcureFlow.Application.Auth.Dtos;
using ProcureFlow.Application.PurchaseRequests.Dtos;
using ProcureFlow.Domain.Enums;
using System.Net;
using System.Net.Http.Json;

namespace ProcureFlow.Tests.Integration;

public class PurchaseRequestEndpointsTests : IntegrationTestBase
{
    private const string PurchaseRequestsUrl = "/api/purchases";

    public PurchaseRequestEndpointsTests(
        ProcureFlowWebApplicationFactory factory)
        : base(factory)
    {
    }

    [Fact]
    public async Task CreatePurchaseRequest_ShouldReturnUnauthorized_WhenTokenIsMissing()
    {
        var request = new CreatePurchaseRequestRequest
        {
            Priority = PurchaseRequestPriority.Medium,
            Justification = "Compra de equipo"
        };

        var response = await Client.PostAsJsonAsync(
            PurchaseRequestsUrl,
            request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_ShouldReturnToken_WhenCredentialsAreValid()
    {
        var requester = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        var request = new LoginCustomerRequest
        {
            Email = requester.Email,
            Password = requester.Password
        };

        var response = await Client.PostAsJsonAsync(
            "/api/auth/login",
            request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content
            .ReadFromJsonAsync<AuthResponse>();

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
    }

    [Fact]
    public async Task CreatePurchaseRequest_ShouldReturnCreated_WhenRequesterIsAuthenticated()
    {
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

        var response = await Client.PostAsJsonAsync(
            PurchaseRequestsUrl,
            request);

        var body = await response.Content.ReadAsStringAsync();

        Assert.True(
            response.StatusCode == HttpStatusCode.Created,
            $"Expected 201 but received {(int)response.StatusCode}. Body: {body}");

        var result = await response.Content
            .ReadFromJsonAsync<PurchaseRequestDto>();

        Assert.NotNull(result);
        Assert.Equal(PurchaseRequestStatus.Draft, result.Status);
        Assert.Equal(0m, result.TotalAmount);
        Assert.Equal(requester.UserId, result.RequestedByUserId);
        Assert.Equal(requester.DepartmentId, result.DepartmentId);
    }

    [Fact]
    public async Task PurchaseRequest_ShouldReachSubmitted_WhenValidFlowIsCompleted()
    {
        var requester = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        var token = await LoginAsync(
            requester.Email,
            requester.Password);

        Authenticate(token);

        var createResponse = await Client.PostAsJsonAsync(
            PurchaseRequestsUrl,
            new CreatePurchaseRequestRequest
            {
                Priority = PurchaseRequestPriority.Medium,
                Justification = "Compra de monitores"
            });

        var createBody = await createResponse.Content.ReadAsStringAsync();

        Assert.True(
            createResponse.StatusCode == HttpStatusCode.Created,
            $"Create failed. Status: {(int)createResponse.StatusCode}. Body: {createBody}");

        var purchaseRequest = await createResponse.Content
            .ReadFromJsonAsync<PurchaseRequestDto>();

        Assert.NotNull(purchaseRequest);

        var addItemResponse = await Client.PostAsJsonAsync(
            $"{PurchaseRequestsUrl}/{purchaseRequest.Id}/add-item",
            new CreatePurchaseRequestItemRequest
            {
                Description = "Monitor 24 pulgadas",
                Quantity = 2,
                UnitPrice = 3500m
            });

        var addItemBody = await addItemResponse.Content.ReadAsStringAsync();

        Assert.True(
            addItemResponse.IsSuccessStatusCode,
            $"AddItem failed. Status: {(int)addItemResponse.StatusCode}. Body: {addItemBody}");

        var submitResponse = await Client.PatchAsync(
            $"{PurchaseRequestsUrl}/{purchaseRequest.Id}/submit",
            null);

        var submitBody = await submitResponse.Content.ReadAsStringAsync();

        Assert.True(
            submitResponse.StatusCode == HttpStatusCode.NoContent,
            $"Submit failed. Status: {(int)submitResponse.StatusCode}. Body: {submitBody}");

        var getResponse = await Client.GetAsync(
            $"{PurchaseRequestsUrl}/{purchaseRequest.Id}");

        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var result = await getResponse.Content
            .ReadFromJsonAsync<PurchaseRequestDto>();

        Assert.NotNull(result);
        Assert.Equal(PurchaseRequestStatus.Submitted, result.Status);
        Assert.Equal(7000m, result.TotalAmount);
    }

    [Fact]
    public async Task Approve_ShouldReturnForbidden_WhenUserIsRequester()
    {
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

        var decision = new DecisionRequest
        {
            ApproverUserId = requester.UserId,
            Comments = "Intento de aprobación"
        };

        var response = await Client.PatchAsJsonAsync(
            $"{PurchaseRequestsUrl}/{purchaseRequestId}/approve",
            decision);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Approve_ShouldReturnNoContent_WhenApproverBelongsToSameDepartment()
    {
        var requester = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        var approver = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Approver,
            requester.DepartmentId,
            "approver@test.com");

        var purchaseRequestId =
            await TestDataSeeder.CreateSubmittedPurchaseRequestAsync(
                Factory.Services,
                requester);

        var token = await LoginAsync(
            approver.Email,
            approver.Password);

        Authenticate(token);

        var decision = new DecisionRequest
        {
            ApproverUserId = approver.UserId,
            Comments = "Aprobado"
        };

        var response = await Client.PatchAsJsonAsync(
            $"{PurchaseRequestsUrl}/{purchaseRequestId}/approve",
            decision);

        var body = await response.Content.ReadAsStringAsync();

        Assert.True(
            response.StatusCode == HttpStatusCode.NoContent,
            $"Expected 204 but received {(int)response.StatusCode}. Body: {body}");

        var getResponse = await Client.GetAsync(
            $"{PurchaseRequestsUrl}/{purchaseRequestId}");

        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var result = await getResponse.Content
            .ReadFromJsonAsync<PurchaseRequestDto>();

        Assert.NotNull(result);
        Assert.Equal(PurchaseRequestStatus.Approved, result.Status);
    }

    [Fact]
    public async Task Approve_ShouldReturnForbidden_WhenApproverBelongsToDifferentDepartment()
    {
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

        var decision = new DecisionRequest
        {
            ApproverUserId = approver.UserId,
            Comments = "Aprobado"
        };

        var response = await Client.PatchAsJsonAsync(
            $"{PurchaseRequestsUrl}/{purchaseRequestId}/approve",
            decision);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
