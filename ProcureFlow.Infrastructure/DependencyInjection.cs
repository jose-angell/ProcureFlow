using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ProcureFlow.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            //services.AddDbContext<AppDbContext>(options =>
            //    options.UseNpgsql(
            //        configuration.GetConnectionString("DefaultConnection")));

            //services.AddScoped<IApplicationDbContext>(provider =>
            //    provider.GetRequiredService<AppDbContext>());

            // services.AddScoped<IPasswordHashService, PasswordHashService>();
            //services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

            return services;
        }
    }
}
