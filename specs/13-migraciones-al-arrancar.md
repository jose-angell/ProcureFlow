# SPEC 13 — Migraciones automáticas al arrancar la API

> **Estado:** implementado
> **Depende de:** SPEC 11
> **Fecha:** 2026-11-01
> **Objetivo:** Aplicar al arrancar la API las migraciones de EF Core pendientes, cuando `Database:MigrateOnStartup` lo habilita, antes del seed del administrador inicial.

## Por qué existe esta spec

Hoy hay que ejecutar `dotnet ef database update` a mano antes del primer arranque. Si se olvida, `AdminSeeder` (SPEC 11) falla porque las tablas no existen. Con esta spec, en Development basta con `docker compose up -d` y `dotnet run`.

## Alcance

**Dentro:**

- Sección de configuración `Database` con `MigrateOnStartup`.
- `MigrateOnStartup` vale `false` en `appsettings.json` y `true` en `appsettings.Development.json`. En `Testing` queda `false`.
- Clase `DatabaseMigrator` en `ProcureFlow.Infrastructure/Persistence/`, registrada como scoped en `AddInfrastructure()`.
- `Program.cs` migra después de `builder.Build()` y antes de llamar a `AdminSeeder`.
- Se aplican siempre todas las migraciones pendientes, no solo con la BD vacía.
- Si la BD no responde o una migración falla, se registra un log `Error`, se relanza la excepción y la API no arranca. No hay reintentos.
- Logs `Information` con la lista de migraciones pendientes.
- Documentación en `README.md` (sección 7.4, nota de la 7.5 y corrección de `--output-dir`) y en `CLAUDE.md`.

**Fuera de alcance (specs futuras):**

- Reintentos o espera a que Postgres esté disponible.
- Detectar "primera vez" y migrar solo con la BD vacía.
- Tests automáticos de la migración real (por ejemplo con Testcontainers).
- Bloqueo distribuido entre varias instancias que arrancan a la vez.
- Rollback o migración a una versión concreta.
- Quitar `AdminSeed:Password` de `appsettings.Development.json`, que hoy está versionado y contradice la SPEC 11.
- Bundles de migraciones (`dotnet ef migrations bundle`) o scripts SQL para producción.

## Modelo de datos

No hay entidades ni migraciones nuevas.

Nuevo `ProcureFlow.Infrastructure/Persistence/DatabaseMigrationOptions.cs`:

```csharp
public class DatabaseMigrationOptions
{
    public const string SectionName = "Database";

    public bool MigrateOnStartup { get; set; }
}
```

Nuevo `ProcureFlow.Infrastructure/Persistence/DatabaseMigrator.cs`:

```csharp
public class DatabaseMigrator
{
    // Dependencias: AppDbContext, ILogger<DatabaseMigrator>
    public Task MigrateAsync(DatabaseMigrationOptions options);
}
```

Las opciones llegan como parámetro, igual que en `AdminSeeder.SeedAsync`.

Configuración:

```jsonc
// appsettings.json
"Database": {
  "MigrateOnStartup": false
}

// appsettings.Development.json
"Database": {
  "MigrateOnStartup": true
}
```

Se puede sobrescribir con `Database__MigrateOnStartup`.

Flujo de `MigrateAsync`:

1. Si `MigrateOnStartup` es `false`, no hace nada: no toca la BD y no registra logs.
2. Obtiene `Database.GetPendingMigrationsAsync()`.
3. Si no hay pendientes, registra el log `Information` "La base de datos está al día; no hay migraciones pendientes." y termina.
4. Si hay pendientes, registra el log `Information` "Aplicando {Count} migraciones pendientes: {Migrations}." con los nombres separados por comas.
5. Llama a `Database.MigrateAsync()`.
6. Registra el log `Information` "Migraciones aplicadas correctamente.".
7. Si cualquier paso del 2 al 5 lanza una excepción, registra el log `Error` "No se pudieron aplicar las migraciones de la base de datos." con la excepción y la relanza.

Integración en `Program.cs`, después de `builder.Build()` y antes del bloque de `AdminSeeder`:

```csharp
var dbOptions = app.Configuration.GetSection(DatabaseMigrationOptions.SectionName).Get<DatabaseMigrationOptions>() ?? new();
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<DatabaseMigrator>().MigrateAsync(dbOptions);
```

## Plan de implementación

1. **Opciones y migrador.** Crear `DatabaseMigrationOptions` y `DatabaseMigrator` con el flujo completo. Registrar `DatabaseMigrator` como scoped en `ProcureFlow.Infrastructure/DependencyInjection.cs`. Nada lo llama todavía. `dotnet build` pasa.
2. **Configuración.** Agregar la sección `Database` a `appsettings.json` (`MigrateOnStartup: false`) y a `appsettings.Development.json` (`MigrateOnStartup: true`). `dotnet build` pasa.
3. **Arranque.** Llamar al migrador en `Program.cs` antes del seed. Prueba manual: `docker compose down -v`, `docker compose up -d`, `dotnet run --project ProcureFlow.Api`, y comprobar que existen las tablas y el admin inicial. `dotnet test` pasa, porque `Testing` no habilita la migración.
4. **Documentación.** En `README.md` sección 7.4: explicar `Database:MigrateOnStartup` y que `dotnet ef database update` pasa a ser opcional en Development. Cambiar `--output-dir Persistence/Migrations` por `--output-dir Migrations`. En la sección 7.5: reemplazar "No aplica migraciones: ejecuta antes `dotnet ef database update`" por una nota que diga que las migraciones se aplican antes si `Database:MigrateOnStartup` es `true`. En `CLAUDE.md`: una línea en Configuración sobre `Database:MigrateOnStartup`, y quitar la nota de que el README usa `Persistence/Migrations`. `dotnet build` y `dotnet test` pasan.

## Criterios de aceptación

- [x] `dotnet build` y `dotnet test` pasan, y los tests existentes no cambian.
- [x] Con un volumen de Postgres nuevo (`docker compose down -v` + `up -d`) y el entorno Development, `dotnet run --project ProcureFlow.Api` arranca sin ejecutar `dotnet ef database update`.
- [x] Después de ese arranque, la tabla `__EFMigrationsHistory` contiene `20260920062417_craciondeTablas`.
- [x] Después de ese arranque, `POST /api/auth/login` con el admin del seed responde 200.
- [x] El log del primer arranque contiene "Aplicando 1 migraciones pendientes: 20260920062417_craciondeTablas.".
- [x] En un segundo arranque, el log contiene "La base de datos está al día; no hay migraciones pendientes." y no se aplica nada.
- [x] Con `Database__MigrateOnStartup=false`, no aparece ningún log del migrador.
- [x] Con Postgres detenido y `MigrateOnStartup: true`, la API no arranca y el log contiene "No se pudieron aplicar las migraciones de la base de datos.".
- [x] `appsettings.json` tiene `Database:MigrateOnStartup` en `false`, y `appsettings.Development.json` lo tiene en `true`.
- [x] La migración se ejecuta antes que `AdminSeeder` en `Program.cs`.
- [x] El README ya no contiene `Persistence/Migrations` ni la frase "No aplica migraciones".
- [x] `README.md` y `CLAUDE.md` documentan `Database:MigrateOnStartup`.
- [x] No hay paquetes NuGet nuevos ni migraciones nuevas.

## Decisiones

- **Sí:** aplicar siempre las pendientes. Lo decidió el usuario. `Migrate()` es idempotente y también cubre las migraciones posteriores.
- **No:** migrar solo con la BD vacía. Exige detectar "primera vez", y las migraciones nuevas seguirían siendo manuales.
- **Sí:** flag `Database:MigrateOnStartup`, `false` por defecto y `true` en Development. Lo decidió el usuario y sigue el patrón de `AdminSeed`.
- **No:** decidir con `IsDevelopment()`. No se podría activar en otros entornos.
- **No:** activarlo siempre salvo en Testing. Producción cambiaría su esquema sin opt-in.
- **Sí:** `Testing` queda en `false`. Los tests usan SQLite con `EnsureCreated`, y las migraciones de Npgsql fallarían ahí.
- **Sí:** `DatabaseMigrator` en Infrastructure. Lo decidió el usuario. Infrastructure ya conoce `AppDbContext`, y ni Application ni Api dependen de él.
- **No:** código inline en `Program.cs`. Acoplaría Api a `AppDbContext`.
- **No:** `IHostedService`. Mismo motivo que en la SPEC 11: un fallo ahí es menos explícito.
- **Sí:** fallar de inmediato si la BD no responde. Lo decidió el usuario. Es simple y coherente con `AdminSeeder`.
- **No:** reintentos con espera. Agregan configuración y lógica; quedan para otra spec si hacen falta.
- **Sí:** migrar antes del seed. El seed necesita las tablas.
- **Sí:** logs con la lista de pendientes. Lo decidió el usuario.
- **No:** tests nuevos. Lo decidió el usuario. `Migrate()` no se puede probar con SQLite, y Testcontainers agregaría Docker y un paquete NuGet a los tests.
- **No:** corregir `AdminSeed:Password` en `appsettings.Development.json`. Lo decidió el usuario; queda fuera de esta spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El modelo cambió sin crear la migración | EF Core 9+ lanza un error por cambios de modelo pendientes. La API no arranca y el log `Error` lo muestra. Hay que crear la migración. |
| Postgres todavía está levantando con `docker compose up -d` | La API no arranca. Se vuelve a ejecutar `dotnet run`. Los reintentos quedan fuera. |
| Alguien activa `MigrateOnStartup` en producción sin revisar las migraciones | Está en `false` por defecto. Activarlo es una decisión explícita del despliegue. |
| Dos instancias migran a la vez | Se espera una sola instancia. El bloqueo distribuido queda fuera. |
| Una migración falla a medias | La API no arranca y el log `Error` lo indica. La corrección se hace a mano en la BD. |
| `AdminSeed:Password` sigue versionado en `appsettings.Development.json` | Queda registrado aquí y fuera de alcance, para una spec propia. |

## Lo que **no** entra en esta spec

- Reintentos a la espera de Postgres.
- Migrar solo con la BD vacía.
- Tests automáticos de migración.
- Bloqueo entre instancias.
- Rollback o migración a una versión concreta.
- Bundles de migraciones o scripts SQL para producción.
- Quitar la contraseña versionada de `appsettings.Development.json`.

Cada uno, si llega, va en su propia spec.
