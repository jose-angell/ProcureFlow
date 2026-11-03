using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Auth.Dtos;
using ProcureFlow.Application.Users.Dtos;
using ProcureFlow.Domain.Enums;
using ProcureFlow.Infrastructure.Persistence;
using ProcureFlow.Infrastructure.Security;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;

namespace ProcureFlow.Tests.Integration;

public class SessionRevalidationTests : IntegrationTestBase
{
    private const string MeUrl = "/api/users/me";

    public SessionRevalidationTests(ProcureFlowWebApplicationFactory factory)
        : base(factory)
    {
    }

    /// <summary>Crea un Admin (en otro departamento) y un Requester, y devuelve sus tokens.</summary>
    private async Task<(SeededUser Admin, string AdminToken, SeededUser User, string UserToken)> SeedAdminAndRequesterAsync()
    {
        var admin = await TestDataSeeder.CreateUserAsync(
            Factory.Services, UserRole.Admin, "Compras", "admin@test.com");
        var user = await TestDataSeeder.CreateUserAsync(
            Factory.Services, UserRole.Requester, "IT", "requester@test.com");

        var adminToken = await LoginAsync(admin.Email, admin.Password);
        var userToken = await LoginAsync(user.Email, user.Password);

        return (admin, adminToken, user, userToken);
    }

    private async Task<HttpStatusCode> GetMeAsync(string token)
    {
        Authenticate(token);
        return (await Client.GetAsync(MeUrl)).StatusCode;
    }

    private async Task AsAdminAsync(string adminToken, Func<Task<HttpResponseMessage>> action)
    {
        Authenticate(adminToken);
        var response = await action();
        Assert.True(response.IsSuccessStatusCode, $"La operación de Admin falló con {(int)response.StatusCode}.");
    }

    private async Task MutateDatabaseAsync(Func<AppDbContext, Task> mutation)
    {
        using var scope = Factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await mutation(context);
        await context.SaveChangesAsync();
    }

    private static UpdateUserRequest UpdateRequestFor(SeededUser user, UserRole role, string? password = null) =>
        new()
        {
            FullName = $"Test {UserRole.Requester}",
            Email = user.Email,
            Password = password,
            DepartmentId = user.DepartmentId,
            Role = role
        };

    [Fact]
    public async Task Token_ShouldBeAccepted_WhenNothingChanged()
    {
        var (_, _, _, userToken) = await SeedAdminAndRequesterAsync();

        Assert.Equal(HttpStatusCode.OK, await GetMeAsync(userToken));
    }

    [Fact]
    public async Task Token_ShouldReturnUnauthorized_WhenUserWasDeactivated()
    {
        var (_, adminToken, user, userToken) = await SeedAdminAndRequesterAsync();

        await AsAdminAsync(adminToken, () => Client.PatchAsync($"/api/users/{user.UserId}/deactivate", null));

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(userToken));
    }

    [Fact]
    public async Task CreatePurchase_ShouldReturnUnauthorized_NotConflict_WhenRequesterWasDeactivated()
    {
        var (_, adminToken, user, userToken) = await SeedAdminAndRequesterAsync();

        await AsAdminAsync(adminToken, () => Client.PatchAsync($"/api/users/{user.UserId}/deactivate", null));

        Authenticate(userToken);
        var response = await Client.PostAsJsonAsync("/api/purchases", new { });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Token_ShouldReturnUnauthorized_WhenDepartmentWasDeactivated()
    {
        var (_, _, user, userToken) = await SeedAdminAndRequesterAsync();

        await MutateDatabaseAsync(async context =>
        {
            var department = await context.Departments.FirstAsync(d => d.Id == user.DepartmentId);
            department.Deactivate();
        });

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(userToken));
    }

    [Fact]
    public async Task Token_ShouldReturnUnauthorized_WhenRoleChanged_AndNewLoginUsesNewRole()
    {
        var (_, adminToken, user, userToken) = await SeedAdminAndRequesterAsync();

        await AsAdminAsync(adminToken, () =>
            Client.PutAsJsonAsync($"/api/users/{user.UserId}", UpdateRequestFor(user, UserRole.Approver)));

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(userToken));

        var newToken = await LoginAsync(user.Email, user.Password);
        Authenticate(newToken);
        var profile = await Client.GetFromJsonAsync<UserDto>(MeUrl);

        Assert.NotNull(profile);
        Assert.Equal(UserRole.Approver, profile.Role);
    }

    [Fact]
    public async Task Token_ShouldReturnUnauthorized_WhenDepartmentChanged()
    {
        var (admin, adminToken, user, userToken) = await SeedAdminAndRequesterAsync();

        await AsAdminAsync(adminToken, () =>
            Client.PatchAsync($"/api/users/{user.UserId}/change-department/{admin.DepartmentId}", null));

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(userToken));
    }

    [Fact]
    public async Task Token_ShouldReturnUnauthorized_WhenAdminSetsNewPassword()
    {
        var (_, adminToken, user, userToken) = await SeedAdminAndRequesterAsync();

        await AsAdminAsync(adminToken, () =>
            Client.PutAsJsonAsync(
                $"/api/users/{user.UserId}",
                UpdateRequestFor(user, UserRole.Requester, "OtraClave456!")));

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(userToken));
    }

    [Fact]
    public async Task Token_ShouldStayValid_WhenAdminUpdatesUserWithoutPasswordRoleOrDepartmentChange()
    {
        var (_, adminToken, user, userToken) = await SeedAdminAndRequesterAsync();

        await AsAdminAsync(adminToken, () =>
            Client.PutAsJsonAsync($"/api/users/{user.UserId}", UpdateRequestFor(user, UserRole.Requester)));

        Assert.Equal(HttpStatusCode.OK, await GetMeAsync(userToken));
    }

    [Fact]
    public async Task Token_ShouldReturnUnauthorized_WhenUserWasDeleted()
    {
        var (_, adminToken, user, userToken) = await SeedAdminAndRequesterAsync();

        await AsAdminAsync(adminToken, () => Client.DeleteAsync($"/api/users/{user.UserId}"));

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(userToken));
    }

    [Fact]
    public async Task ChangeMyPassword_ShouldInvalidateOldToken_AndReturnWorkingNewToken()
    {
        var (_, _, user, userToken) = await SeedAdminAndRequesterAsync();

        Authenticate(userToken);
        var response = await Client.PutAsJsonAsync("/api/users/me/password", new ChangeMyPasswordRequest
        {
            CurrentPassword = user.Password,
            NewPassword = "NuevaClave456!"
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(userToken));
        Assert.Equal(HttpStatusCode.OK, await GetMeAsync(body.AccessToken));
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task Token_ShouldReturnUnauthorized_WhenSignedTokenLacksRevalidationClaims(
        bool includeSecurityStamp,
        bool includeDepartmentId)
    {
        var (_, _, user, _) = await SeedAdminAndRequesterAsync();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Role, UserRole.Requester.ToString())
        };
        if (includeDepartmentId)
            claims.Add(new Claim(ProcureFlowClaimTypes.DepartmentId, user.DepartmentId.ToString()));
        if (includeSecurityStamp)
            claims.Add(new Claim(ProcureFlowClaimTypes.SecurityStamp, Guid.NewGuid().ToString()));

        Assert.Equal(HttpStatusCode.Unauthorized, await GetMeAsync(SignToken(claims)));
    }

    private string SignToken(IEnumerable<Claim> claims)
    {
        var options = Factory.Services.GetRequiredService<IOptions<JwtOptions>>().Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SecretKey));

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
