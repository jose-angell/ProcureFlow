using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ProcureFlow.Api.Authentication;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Infrastructure.Security;
using System.Security.Claims;
using System.Text;

namespace ProcureFlow.Api
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApi(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            services.AddControllers();

            services.AddHttpContextAccessor();

            services.AddScoped<ICurrentUserService, CurrentUserService>();

            var jwtOptions = configuration
            .GetSection("Jwt")
            .Get<JwtOptions>()
            ?? throw new InvalidOperationException(
                "La configuración JWT no existe.");

            services
            .AddAuthentication(
                JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters =
                    new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = jwtOptions.Issuer,

                        ValidateAudience = true,
                        ValidAudience = jwtOptions.Audience,

                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey =
                            new SymmetricSecurityKey(
                                Encoding.UTF8.GetBytes(
                                    jwtOptions.SecretKey)),

                        ValidateLifetime = true,

                        ClockSkew = TimeSpan.Zero,

                        NameClaimType =
                            ClaimTypes.NameIdentifier,

                        RoleClaimType =
                            ClaimTypes.Role
                    };
            });

            services.AddAuthorization();

            return services;
        }
    }
}
