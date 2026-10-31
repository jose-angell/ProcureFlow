# SPEC 11 — Administrador inicial al arrancar la API

> **Estado:** aprobado
> **Depende de:** ninguna
> **Fecha:** 2026-10-31
> **Objetivo:** Crear al arrancar la API, si la sección `AdminSeed` lo habilita y no existe ningún usuario Admin, un administrador inicial con su departamento, a partir de configuración y con la contraseña fuera del repositorio.

## Por qué existe esta spec

`AuthUseCase.RegisterCustomer` siempre crea usuarios `Requester`. Las pantallas de usuarios y departamentos (SPEC 07 y SPEC 08) exigen un Admin. Por eso hoy el primer Admin solo puede crearse editando la base de datos a mano. `User` exige además un `DepartmentId` válido, así que el seed también tiene que garantizar un departamento.

## Alcance

**Dentro:**

- Sección de configuración `AdminSeed` con `Enabled`, `Email`, `FullName`, `DepartmentName` y `Password`.
- `Enabled` es `false` en `appsettings.json` y `true` en `appsettings.Development.json`. En el entorno `Testing` queda `false`.
- La contraseña nunca está en archivos versionados. Llega por `AdminSeed__Password` o por user-secrets.
- `UserSecretsId` en `ProcureFlow.Api.csproj` para poder usar `dotnet user-secrets`.
- Clase `AdminSeeder` en `ProcureFlow.Application/Seeding/`, registrada como scoped en `AddApplication()`.
- `Program.cs` ejecuta el seed después de `builder.Build()` y antes de `app.Run()`.
- El seed solo crea el admin si no hay ningún usuario con `Role == UserRole.Admin`, esté activo o no.
- Busca el departamento por nombre exacto y, si no existe, lo crea activo.
- Si `Enabled` es `true` y la config es inválida, la API no arranca.
- Logs `Information` sin la contraseña.
- Tests de Application del seeder.
- Documentación en `README.md` y `CLAUDE.md`.

**Fuera de alcance (specs futuras):**

- Aplicar migraciones de EF al arrancar (`Database.Migrate()`).
- Actualizar, reactivar o resetear la contraseña de un admin existente.
- Seed de otros datos (departamentos de ejemplo, usuarios de demo, solicitudes).
- Endpoint o comando CLI para crear admins.
- Política de contraseñas en el resto de la API (registro y gestión de usuarios).
- Forzar el cambio de contraseña en el primer login.
- Bloqueo distribuido para varias instancias que arrancan a la vez.

## Modelo de datos

No hay entidades ni migraciones nuevas. Se reusan `User`, `Department` y `UserRole.Admin`.

Nuevo `ProcureFlow.Application/Seeding/AdminSeedOptions.cs`:

```csharp
public class AdminSeedOptions
{
    public const string SectionName = "AdminSeed";

    public bool Enabled { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string FullName { get; set; } = "Administrador";
    public string DepartmentName { get; set; } = "Administración";
}
```

Nuevo `ProcureFlow.Application/Seeding/AdminSeeder.cs`:

```csharp
public class AdminSeeder
{
    // Dependencias: IApplicationDbContext, IPasswordHashService, ILogger<AdminSeeder>
    public Task SeedAsync(AdminSeedOptions options);
}
```

`SeedAsync` recibe las opciones como parámetro, sin `IOptions<T>`, para que el test las pase directamente. `ILogger<T>` llega por la dependencia transitiva de EF Core a `Microsoft.Extensions.Logging.Abstractions`; no se agregan paquetes.

Configuración:

```jsonc
// appsettings.json
"AdminSeed": {
  "Enabled": false,
  "Email": "",
  "FullName": "Administrador",
  "DepartmentName": "Administración"
}

// appsettings.Development.json
"AdminSeed": {
  "Enabled": true,
  "Email": "admin@procureflow.local"
}
```

`Password` no aparece en ningún `appsettings*.json`.

Flujo de `SeedAsync`:

1. Si `Enabled` es `false`: no hace nada y no registra logs.
2. Valida la config (ver tabla). Si falla, lanza `InvalidOperationException` con el mensaje.
3. Si existe algún usuario `Admin`: log `Information` "Ya existe un administrador; se omite la creación del administrador inicial." y termina.
4. Si el email ya lo usa otro usuario (no Admin): lanza `InvalidOperationException`.
5. Busca `Department` con `Name == DepartmentName`. Si no existe, crea `new Department(DepartmentName)`.
6. Crea `new User(FullName, Email, hash, UserRole.Admin, department.Id)` con `IPasswordHashService.Hash(Password)`.
7. `SaveChangesAsync` una sola vez, con el departamento y el usuario juntos.
8. Log `Information` "Administrador inicial creado: {Email}.".

`Email`, `FullName` y `DepartmentName` se recortan antes de usarse. `Password` no se recorta.

Validación (mensajes de `InvalidOperationException`):

| Condición | Mensaje |
| --- | --- |
| `Email` vacío o solo espacios | "AdminSeed:Email es obligatorio cuando AdminSeed:Enabled es true." |
| `Email` sin formato válido (`MailAddress.TryCreate`) | "AdminSeed:Email no tiene un formato válido." |
| `Password` vacío | "AdminSeed:Password es obligatorio cuando AdminSeed:Enabled es true. Configúralo con user-secrets o la variable AdminSeed__Password." |
| `Password` de menos de 8 caracteres | "AdminSeed:Password debe tener al menos 8 caracteres." |
| Email ya usado por un usuario no Admin | "El correo {Email} ya pertenece a un usuario que no es administrador." |

Las longitudes máximas (nombre 150, correo 200, departamento 100) las valida el dominio con `DomainException`. Como sale del arranque, también detiene la API.

Integración en `Program.cs` (después de `builder.Build()`):

```csharp
var adminSeed = app.Configuration.GetSection(AdminSeedOptions.SectionName).Get<AdminSeedOptions>() ?? new();
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<AdminSeeder>().SeedAsync(adminSeed);
```

Nuevos tests en `ProcureFlow.Tests/Application/AdminSeederTests.cs` (`TestDbContextFactory`, hasher falso como en `UserUseCaseTests` y `NullLogger<AdminSeeder>`):

- `Seed_ShouldDoNothing_WhenDisabled`
- `Seed_ShouldCreateAdminAndDepartment_WhenNoAdminExists`
- `Seed_ShouldReuseExistingDepartment_WhenNameMatches`
- `Seed_ShouldSkip_WhenAnAdminAlreadyExists`
- `Seed_ShouldSkip_WhenOnlyAnInactiveAdminExists`
- `Seed_ShouldBeIdempotent_WhenRunTwice`
- `Seed_ShouldThrow_WhenEmailIsMissing`
- `Seed_ShouldThrow_WhenEmailIsInvalid`
- `Seed_ShouldThrow_WhenPasswordIsMissing`
- `Seed_ShouldThrow_WhenPasswordIsShorterThan8`
- `Seed_ShouldThrow_WhenEmailBelongsToNonAdmin`
- `Seed_ShouldStoreHashedPassword`

## Plan de implementación

1. **Opciones y seeder.** Crear `AdminSeedOptions` y `AdminSeeder` con el flujo completo. Registrar `AdminSeeder` como scoped en `ProcureFlow.Application/DependencyInjection.cs`. Nada lo llama todavía. `dotnet build` pasa.
2. **Tests del seeder.** Crear `AdminSeederTests` con los doce tests. `dotnet test` pasa.
3. **Configuración.** Agregar la sección `AdminSeed` a `appsettings.json` (`Enabled: false`) y a `appsettings.Development.json` (`Enabled: true`, email de desarrollo). Agregar `UserSecretsId` a `ProcureFlow.Api.csproj`. `dotnet build` pasa.
4. **Arranque.** Llamar al seed en `Program.cs`. Prueba manual: `dotnet user-secrets set "AdminSeed:Password" "<clave>" --project ProcureFlow.Api`, `dotnet run --project ProcureFlow.Api` y login con el admin. Los tests de integración siguen pasando porque `Testing` no habilita el seed.
5. **Documentación.** `README.md`: sección "Administrador inicial" con la config, user-secrets y la variable `AdminSeed__Password`. `CLAUDE.md`: línea en "Configuración" sobre `AdminSeed` y que la contraseña nunca se versiona. `dotnet build` y `dotnet test` pasan.

## Criterios de aceptación

- [ ] `dotnet build` y `dotnet test` pasan, incluidos los tests de integración existentes sin cambios.
- [ ] Con BD vacía, `Enabled: true`, email válido y contraseña de 8 o más caracteres, al arrancar existe un usuario `Admin` activo en el departamento "Administración".
- [ ] `POST /api/auth/login` con ese email y contraseña responde 200 y `role` es `2` (`Admin`).
- [ ] Al arrancar una segunda vez no se crea otro usuario ni otro departamento.
- [ ] Si ya existe un departamento "Administración", el admin se asigna a él y no se crea otro.
- [ ] Si ya existe cualquier Admin, activo o inactivo, no se crea ninguno y el log dice "Ya existe un administrador; se omite la creación del administrador inicial.".
- [ ] Con `Enabled: true` y sin `Password`, la API no arranca y el error muestra el mensaje de la tabla.
- [ ] Con una contraseña de 7 caracteres, la API no arranca.
- [ ] Si el email lo usa un Requester y no hay Admin, la API no arranca y el usuario existente no cambia.
- [ ] Con `Enabled: false` (por defecto en `appsettings.json`), no se lee la BD para el seed y no hay logs del seed.
- [ ] `PasswordHash` del admin creado no es la contraseña en claro y `PasswordHashService.Verify` lo valida.
- [ ] Ningún `appsettings*.json` ni archivo versionado contiene `Password` dentro de `AdminSeed`.
- [ ] Ningún log contiene la contraseña.
- [ ] `README.md` y `CLAUDE.md` documentan `AdminSeed`, user-secrets y `AdminSeed__Password`.
- [ ] No hay paquetes NuGet nuevos ni migraciones nuevas.

## Decisiones

- **Sí:** crear solo si no existe ningún Admin. Decisión del usuario; nunca sobrescribe datos.
- **No:** crear o actualizar (upsert) el admin configurado. Resetear contraseñas al arrancar es peligroso.
- **No:** crear si no existe el email aunque haya otros Admin. Generaría admins de más en cada cambio de config.
- **Sí:** un Admin inactivo también cuenta como existente. Reactivarlo sería modificar datos, y eso está fuera.
- **Sí:** sección `AdminSeed` en appsettings y contraseña solo por user-secrets o `AdminSeed__Password`. Decisión del usuario; el secreto no se versiona.
- **No:** credenciales en `.env` ni en `appsettings.Development.json`. Quedarían en el repositorio.
- **Sí:** buscar el departamento por nombre o crearlo. Decisión del usuario; funciona con una BD vacía.
- **No:** exigir un `DepartmentId` en la config. Obliga a crear el departamento por otro medio antes.
- **Sí:** config inválida con `Enabled: true` detiene el arranque. Decisión del usuario; evita creer que hay admin cuando no lo hay.
- **Sí:** `InvalidOperationException` y no `DomainException`. Es un error de configuración, no una regla de negocio, y no pasa por `GlobalExceptionHandler`.
- **Sí:** email ocupado por un no Admin detiene el arranque. Se deriva de "nunca sobrescribir" y de "fallar si es inválido".
- **Sí:** desactivado por defecto y activado solo en Development. Decisión del usuario; Testing y producción no cambian sin opt-in.
- **No:** migraciones al arrancar. Decisión del usuario; va en otra spec.
- **Sí:** `AdminSeeder` en Application y llamada explícita en `Program.cs`. Decisión del usuario; sigue el patrón de use cases y se testea con `TestDbContextFactory`.
- **No:** `IHostedService` en Infrastructure. Es más difícil de testear y su fallo es menos explícito.
- **Sí:** opciones como parámetro de `SeedAsync`, sin `IOptions<T>`. Evita agregar paquetes a Application.
- **Sí:** contraseña mínima de 8 caracteres solo en el seed. Decisión del usuario; el resto de la API no cambia.
- **Sí:** logs `Information` sin la contraseña. Decisión del usuario.
- **Sí:** `UserSecretsId` en el proyecto Api. Sin él `dotnet user-secrets` no funciona.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las tablas no existen porque no se aplicaron migraciones | EF lanza un error y la API no arranca. El README indica ejecutar `dotnet ef database update` antes. |
| Un admin queda inactivo y nadie puede entrar | El seed no lo reactiva por diseño. Se resuelve en BD o en otra spec. |
| Dos instancias arrancan a la vez sobre una BD vacía | Volumen esperado de una instancia. El índice único de email impide el segundo usuario con el mismo correo; el bloqueo distribuido queda fuera. |
| Alguien escribe la contraseña en `appsettings.Development.json` | El README y `CLAUDE.md` lo prohíben; el criterio de aceptación lo verifica. |
| `Enabled: true` en producción sin contraseña bloquea el despliegue | Es el comportamiento elegido; el mensaje indica cómo configurarla. |
| La contraseña del admin queda igual para siempre | El seed solo actúa una vez. El cambio de contraseña se hace con la gestión de usuarios (SPEC 08). |

## Lo que **no** entra en esta spec

- Migraciones automáticas al arrancar.
- Actualizar, reactivar o resetear admins existentes.
- Seed de otros datos de ejemplo.
- Política de contraseñas para el resto de la API.
- Cambio de contraseña forzado en el primer login.
- Bloqueo para varias instancias.

Cada uno, si llega, va en su propia spec.
