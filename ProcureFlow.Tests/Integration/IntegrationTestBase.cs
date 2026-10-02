using ProcureFlow.Application.Auth.Dtos;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace ProcureFlow.Tests.Integration
{
    public abstract class IntegrationTestBase
    : IClassFixture<ProcureFlowWebApplicationFactory>,
      IAsyncLifetime
    {
        protected readonly ProcureFlowWebApplicationFactory Factory;
        protected HttpClient Client = null!;

        protected IntegrationTestBase(
            ProcureFlowWebApplicationFactory factory)
        {
            Factory = factory;
        }

        public async Task InitializeAsync()
        {
            Client = Factory.CreateClient();

            await Factory.ResetDatabaseAsync();
        }

        public Task DisposeAsync()
        {
            Client.Dispose();

            return Task.CompletedTask;
        }

        protected async Task<string> LoginAsync(
            string email,
            string password)
        {
            var request = new LoginCustomerRequest
            {
                Email = email,
                Password = password
            };

            var response = await Client.PostAsJsonAsync(
                "/api/auth/login",
                request);

            response.EnsureSuccessStatusCode();

            var result =
                await response.Content.ReadFromJsonAsync<AuthResponse>();

            Assert.NotNull(result);
            Assert.False(
                string.IsNullOrWhiteSpace(result.AccessToken));

            return result.AccessToken;
        }

        protected void Authenticate(string token)
        {
            Client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    token);
        }
    }
}
