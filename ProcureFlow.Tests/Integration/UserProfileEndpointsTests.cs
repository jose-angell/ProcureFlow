using ProcureFlow.Application.Auth.Dtos;
using ProcureFlow.Application.Users.Dtos;
using ProcureFlow.Domain.Enums;
using System.Net;
using System.Net.Http.Json;

namespace ProcureFlow.Tests.Integration;

public class UserProfileEndpointsTests : IntegrationTestBase
{
    private const string MeUrl = "/api/users/me";
    private const string MyPasswordUrl = "/api/users/me/password";

    public UserProfileEndpointsTests(
        ProcureFlowWebApplicationFactory factory)
        : base(factory)
    {
    }

    [Fact]
    public async Task GetMe_ShouldReturnUnauthorized_WhenTokenIsMissing()
    {
        var response = await Client.GetAsync(MeUrl);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(UserRole.Requester)]
    [InlineData(UserRole.Approver)]
    [InlineData(UserRole.Admin)]
    public async Task GetMe_ShouldReturnOwnProfile_ForAnyRole(UserRole role)
    {
        var user = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            role,
            "IT",
            $"{role}@test.com".ToLowerInvariant());

        Authenticate(await LoginAsync(user.Email, user.Password));

        var response = await Client.GetAsync(MeUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var profile = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(profile);
        Assert.Equal(user.UserId, profile.Id);
        Assert.Equal(user.Email, profile.Email);
        Assert.Equal(role, profile.Role);
        Assert.Equal("IT", profile.DepartmentName);
    }

    [Fact]
    public async Task UpdateMe_ShouldReturnNoContent_AndPersistChanges()
    {
        var user = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        Authenticate(await LoginAsync(user.Email, user.Password));

        var response = await Client.PutAsJsonAsync(MeUrl, new UpdateMyProfileRequest
        {
            FullName = "Nombre Nuevo",
            Email = "nuevo@test.com"
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var profile = await Client.GetFromJsonAsync<UserDto>(MeUrl);
        Assert.NotNull(profile);
        Assert.Equal("Nombre Nuevo", profile.FullName);
        Assert.Equal("nuevo@test.com", profile.Email);
        Assert.Equal(UserRole.Requester, profile.Role);
        Assert.Equal(user.DepartmentId, profile.DepartmentId);
    }

    [Fact]
    public async Task UpdateMe_ShouldReturnConflict_WhenEmailBelongsToAnotherUser()
    {
        var user = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Approver,
            user.DepartmentId,
            "approver@test.com");

        Authenticate(await LoginAsync(user.Email, user.Password));

        var response = await Client.PutAsJsonAsync(MeUrl, new UpdateMyProfileRequest
        {
            FullName = "Nombre Nuevo",
            Email = "approver@test.com"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var profile = await Client.GetFromJsonAsync<UserDto>(MeUrl);
        Assert.NotNull(profile);
        Assert.Equal("requester@test.com", profile.Email);
    }

    [Fact]
    public async Task ChangeMyPassword_ShouldAllowLoginWithNewPassword_AndRejectOldOne()
    {
        var user = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        Authenticate(await LoginAsync(user.Email, user.Password));

        var response = await Client.PutAsJsonAsync(MyPasswordUrl, new ChangeMyPasswordRequest
        {
            CurrentPassword = user.Password,
            NewPassword = "NuevaClave456!"
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var oldLogin = await Client.PostAsJsonAsync("/api/auth/login", new LoginCustomerRequest
        {
            Email = user.Email,
            Password = user.Password
        });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newToken = await LoginAsync(user.Email, "NuevaClave456!");
        Assert.False(string.IsNullOrWhiteSpace(newToken));
    }

    [Fact]
    public async Task ChangeMyPassword_ShouldReturnBadRequest_WhenCurrentPasswordIsWrong()
    {
        var user = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        Authenticate(await LoginAsync(user.Email, user.Password));

        var response = await Client.PutAsJsonAsync(MyPasswordUrl, new ChangeMyPasswordRequest
        {
            CurrentPassword = "incorrecta",
            NewPassword = "NuevaClave456!"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ChangeMyPassword_ShouldReturnBadRequest_WhenNewPasswordIsTooShort()
    {
        var user = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        Authenticate(await LoginAsync(user.Email, user.Password));

        var response = await Client.PutAsJsonAsync(MyPasswordUrl, new ChangeMyPasswordRequest
        {
            CurrentPassword = user.Password,
            NewPassword = "corta"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoints_ShouldReturnForbidden_ForRequester_AndOk_ForAdmin()
    {
        var requester = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Requester,
            "IT",
            "requester@test.com");

        var admin = await TestDataSeeder.CreateUserAsync(
            Factory.Services,
            UserRole.Admin,
            requester.DepartmentId,
            "admin@test.com");

        Authenticate(await LoginAsync(requester.Email, requester.Password));

        Assert.Equal(HttpStatusCode.Forbidden, (await Client.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Client.GetAsync($"/api/users/{admin.UserId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Client.DeleteAsync($"/api/users/{admin.UserId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Client.PatchAsync($"/api/users/{admin.UserId}/deactivate", null)).StatusCode);

        Authenticate(await LoginAsync(admin.Email, admin.Password));

        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/users/{requester.UserId}")).StatusCode);
    }
}
