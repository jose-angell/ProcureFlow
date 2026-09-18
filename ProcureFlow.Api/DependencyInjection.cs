namespace ProcureFlow.Api
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApi(
            this IServiceCollection services)
        {
            services.AddControllers();

            services.AddHttpContextAccessor();

            //services.AddScoped<ICurrentUserService, CurrentUserService>();

            return services;
        }
    }
}
