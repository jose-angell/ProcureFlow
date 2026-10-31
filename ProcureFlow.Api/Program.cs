using ProcureFlow.Api;
using ProcureFlow.Application;
using ProcureFlow.Application.Seeding;
using ProcureFlow.Infrastructure;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddApplication();

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddApi(builder.Configuration);

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

var adminSeed = app.Configuration.GetSection(AdminSeedOptions.SectionName).Get<AdminSeedOptions>() ?? new();
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<AdminSeeder>().SeedAsync(adminSeed);
}

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }