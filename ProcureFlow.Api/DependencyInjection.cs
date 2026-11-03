using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ProcureFlow.Api.Authentication;
using ProcureFlow.Application.Abstractions.Security;
using ProcureFlow.Application.Auth;
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

                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        const string failureMessage = "La sesión ya no es válida.";

                        var principal = context.Principal;
                        var userIdValue = principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                        var role = principal?.FindFirstValue(ClaimTypes.Role);
                        var departmentIdValue = principal?.FindFirstValue(ProcureFlowClaimTypes.DepartmentId);
                        var securityStampValue = principal?.FindFirstValue(ProcureFlowClaimTypes.SecurityStamp);

                        if (!Guid.TryParse(userIdValue, out var userId)
                            || string.IsNullOrEmpty(role)
                            || !Guid.TryParse(departmentIdValue, out var departmentId)
                            || !Guid.TryParse(securityStampValue, out var securityStamp))
                        {
                            context.Fail(failureMessage);
                            return;
                        }

                        var validator = context.HttpContext.RequestServices
                            .GetRequiredService<TokenSessionValidator>();

                        var isValid = await validator.IsValidAsync(
                            new TokenSessionClaims(userId, role, departmentId, securityStamp));

                        if (!isValid) context.Fail(failureMessage);
                    }
                };
            });

            services.AddAuthorization();

            var allowedOrigins = configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>() ?? [];

            services.AddCors(options =>
            {
                options.AddPolicy("Frontend", policy =>
                    policy
                        .WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod());
            });

            return services;
        }
    }
}
