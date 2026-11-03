using Microsoft.Extensions.DependencyInjection;
using ProcureFlow.Application.Auth;
using ProcureFlow.Application.Departments;
using ProcureFlow.Application.PurchaseRequests;
using ProcureFlow.Application.Seeding;
using ProcureFlow.Application.Users;

namespace ProcureFlow.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplication(
            this IServiceCollection services)
        {
            services.AddScoped<PurchaseRequestUseCase>();
            services.AddScoped<UserUseCase>();
            services.AddScoped<DepartmentUseCase>();
            services.AddScoped<AuthUseCase>();
            services.AddScoped<TokenSessionValidator>();
            services.AddScoped<AdminSeeder>();
            return services;
        }
    }
}
