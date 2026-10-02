using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ProcureFlow.Application.Abstractions.Persistence;
using ProcureFlow.Infrastructure.Persistence;

namespace ProcureFlow.Tests.Integration;

public sealed class ProcureFlowWebApplicationFactory
    : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    public ProcureFlowWebApplicationFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((context, configuration) =>
        {
            configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Jwt:Issuer"] = "ProcureFlow.Tests",
                    ["Jwt:Audience"] = "ProcureFlow.Tests",
                    ["Jwt:SecretKey"] =
                        "ProcureFlow-Integration-Tests-Secret-Key-2026!",
                    ["Jwt:ExpirationMinutes"] = "60"
                });
        });

        builder.ConfigureServices(services =>
        {
            // Eliminar completamente la configuración
            // original de AppDbContext/Npgsql.
            services.RemoveAll<
                IDbContextOptionsConfiguration<AppDbContext>>();

            services.RemoveAll<
                DbContextOptions<AppDbContext>>();

            services.RemoveAll<AppDbContext>();

            services.RemoveAll<IApplicationDbContext>();

            // Registrar AppDbContext nuevamente,
            // ahora exclusivamente con SQLite.
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            services.AddScoped<IApplicationDbContext>(provider =>
                provider.GetRequiredService<AppDbContext>());
        });
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();

        var context =
            scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _connection.Dispose();
        }
    }
}