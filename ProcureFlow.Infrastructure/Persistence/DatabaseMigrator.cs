using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ProcureFlow.Infrastructure.Persistence
{
    public class DatabaseMigrator
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DatabaseMigrator> _logger;

        public DatabaseMigrator(AppDbContext context, ILogger<DatabaseMigrator> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task MigrateAsync(DatabaseMigrationOptions options)
        {
            if (!options.MigrateOnStartup)
                return;

            try
            {
                var pending = (await _context.Database.GetPendingMigrationsAsync()).ToList();

                if (pending.Count == 0)
                {
                    _logger.LogInformation("La base de datos está al día; no hay migraciones pendientes.");
                    return;
                }

                _logger.LogInformation(
                    "Aplicando {Count} migraciones pendientes: {Migrations}.",
                    pending.Count,
                    string.Join(", ", pending));

                await _context.Database.MigrateAsync();

                _logger.LogInformation("Migraciones aplicadas correctamente.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudieron aplicar las migraciones de la base de datos.");
                throw;
            }
        }
    }
}
