# ProcureFlow

**ProcureFlow** es un sistema de gestión de **solicitudes internas de compra y aprobaciones**. Permite que los colaboradores de una organización creen solicitudes, administren sus partidas y las envíen a revisión, mientras que los aprobadores toman decisiones según su rol y departamento.

El proyecto tiene un enfoque **full-stack** y vive en un único repositorio con dos aplicaciones independientes:

- **Backend:** API REST con **.NET 10, ASP.NET Core, EF Core y PostgreSQL**, organizada mediante **Clean Architecture pragmática**.
- **Frontend:** aplicación web con **React, TypeScript, Vite y shadcn/ui**, organizada por funcionalidades e integrada con la API.

El objetivo es implementar un flujo empresarial real con reglas de dominio, autorización contextual, persistencia relacional, pruebas automatizadas y una interfaz mantenible, sin introducir complejidad arquitectónica innecesaria.

> **Estado:** la V1 está implementada de extremo a extremo. El backend expone la API con pruebas de dominio, aplicación e integración, y el frontend consume esa API con inicio de sesión, registro, dashboards por rol, solicitudes, aprobaciones, gestión de usuarios y departamentos, y perfil de usuario. Las 15 especificaciones de `specs/` figuran como implementadas.

## 1. Funcionalidad y reglas de negocio

### Flujo de una solicitud

```text
Draft ── Submit ──> Submitted ── Approve ──> Approved
  │                     │
  │                     └──── Reject ────> Rejected
  │
  └── Cancel ──> Cancelled

Submitted ── Cancel ──> Cancelled
```

Una solicitud comienza en estado `Draft`, con justificación, prioridad y un importe inicial de cero. Mientras permanece en ese estado, el solicitante puede agregar, actualizar o quitar partidas. El importe total se calcula a partir de ellas; no lo establece directamente el cliente.

Para enviarse (`Submit`), la solicitud debe contener partidas válidas. Una vez enviada, puede aprobarse o rechazarse según las reglas de acceso. El rechazo exige un comentario. En la **V1**, `Approved`, `Rejected` y `Cancelled` son estados finales.

### Roles

| Rol | Responsabilidades principales |
| --- | --- |
| **Requester** | Crear solicitudes, gestionar sus propios borradores, enviar o cancelar solicitudes cuando el flujo lo permita y consultar las solicitudes a las que tiene acceso. |
| **Approver** | Consultar solicitudes pendientes de su departamento y aprobarlas o rechazarlas cuando esté autorizado. |
| **Admin** | Administrar usuarios y departamentos, consultar solicitudes e intervenir en operaciones permitidas por las reglas administrativas. |

La autorización no depende únicamente del rol: también considera **propiedad de la solicitud, departamento y estado del proceso**. El registro público solo crea usuarios `Requester`; el primer `Admin` se crea al arrancar la API (sección 7.6).

## 2. Tecnologías

| Área | Stack |
| --- | --- |
| Backend | C#, .NET 10, ASP.NET Core Web API |
| Persistencia | Entity Framework Core, Npgsql, PostgreSQL 16 |
| Seguridad | JWT Bearer, hashing de contraseñas, claims, autorización por rol y contexto, revalidación de sesión |
| Pruebas backend | xUnit, SQLite In-Memory, `WebApplicationFactory` |
| Frontend | React 19, TypeScript, Vite, React Router 7 |
| UI | shadcn/ui (sobre Base UI), Tailwind CSS 4, lucide-react |
| Comunicación frontend–API | HTTP/JSON con `fetch` a través de un cliente propio (`src/shared/api/httpClient.ts`) |
| Infraestructura local | Docker Compose (PostgreSQL 16) |
| Desarrollo asistido | Claude Code, skills `/spec` y `/spec-impl`, especificaciones Markdown en `specs/` |

## 3. Arquitectura general y repositorio

ProcureFlow mantiene **backend y frontend independientes dentro del mismo repositorio**. Se comunican a través de contratos HTTP/JSON. No comparten entidades de EF Core ni código de dominio ejecutable entre ambas aplicaciones.

```text
ProcureFlow/
├── README.md
├── CLAUDE.md                          # Guía del repositorio para Claude Code
├── docker-compose.yml                 # PostgreSQL 16 local (lee .env)
├── ProcureFlow.slnx
│
├── ProcureFlow.Domain/
│   ├── Entities/                      # User, Department, PurchaseRequest, PurchaseRequestItem, ApprovalDecision
│   ├── Enums/
│   └── Exceptions/
│
├── ProcureFlow.Application/
│   ├── Abstractions/                  # Persistence, Security
│   ├── Auth/                          # AuthUseCase, TokenSessionValidator
│   ├── Departments/
│   ├── Users/
│   ├── PurchaseRequests/
│   ├── Seeding/                       # AdminSeeder
│   ├── Common/                        # PagedResult
│   └── Exceptions/
│
├── ProcureFlow.Infrastructure/
│   ├── Configurations/                # Fluent API
│   ├── Migrations/
│   ├── Persistence/                   # AppDbContext, DatabaseMigrator
│   └── Security/                      # JwtTokenGenerator, PasswordHashService
│
├── ProcureFlow.Api/
│   ├── Controllers/
│   ├── Authentication/                # CurrentUserService
│   ├── GlobalExceptionHandler.cs
│   └── Program.cs
│
├── ProcureFlow.Tests/
│   ├── Domain/
│   ├── Application/
│   ├── Integration/
│   └── TestSupport/
│
├── docs/decisions/                    # ADR-001: comunicación frontend ↔ API y autenticación
├── specs/                             # Especificaciones 01–15 (una por archivo, con su estado)
├── .claude/skills/                    # Skills spec y spec-impl
│
└── web/
    └── procureflow-web/
        ├── CLAUDE.md                  # Reglas específicas de React/TypeScript
        ├── components.json            # Configuración de shadcn/ui
        ├── package.json
        ├── .env.example
        ├── design/                    # HTML de referencia visual
        └── src/
            ├── app/                   # App, router, ProtectedRoute, GuestRoute
            ├── features/
            │   ├── auth/
            │   ├── dashboard/
            │   ├── purchase-requests/
            │   ├── approvals/
            │   ├── departments/
            │   ├── users/
            │   └── profile/
            ├── components/ui/         # Componentes base de shadcn/ui
            ├── shared/                # api, components, layouts, lib
            ├── lib/
            └── main.tsx
```

---

## 4. Arquitectura del backend

El backend aplica una variante **pragmática de Clean Architecture**, con separación física mediante proyectos `.csproj`. El objetivo es aislar las reglas de negocio de los detalles de HTTP, seguridad y persistencia.

### Dirección de dependencias

```text
ProcureFlow.Api ───────────────┐
    │                          │
    ├──> Application           └──> Infrastructure
    │                              │
    │                              ├──> Application
    ▼                              ▼
  Domain <─────────────────────────┘

Domain no depende de las otras capas.
```

En términos de referencias:

| Proyecto | Puede depender de |
| --- | --- |
| `Domain` | Ningún proyecto de la solución |
| `Application` | `Domain` y abstracciones de EF Core en el enfoque pragmático elegido |
| `Infrastructure` | `Application` y `Domain` |
| `Api` | `Application` e `Infrastructure` (composición) |

Cada capa expone su registro de servicios en un `DependencyInjection.cs` (`AddApplication()`, `AddInfrastructure(config)`, `AddApi(config)`), que `Program.cs` invoca.

### 4.1. Domain — modelo y reglas de negocio

Contiene **entidades, enums, excepciones y comportamientos del dominio**. No depende de ASP.NET Core, controllers, DTOs HTTP, PostgreSQL, JWT ni configuraciones de EF Core. Las entidades tienen setters privados y todo cambio de estado pasa por métodos.

El agregado principal es:

```text
PurchaseRequest  (Aggregate Root)
├── PurchaseRequestItem
└── ApprovalDecision
```

`PurchaseRequest` concentra las operaciones que cambian el estado de la solicitud:

- `AddItem`, `UpdateItem`, `RemoveItem`: modifican partidas cuando la solicitud lo permite y mantienen el total consistente.
- `Submit`: valida que el borrador cumpla las condiciones para enviarse.
- `Approve`, `Reject`: aplican las transiciones válidas y registran la decisión.
- `Cancel`: permite la cancelación desde `Draft` o `Submitted`.

**Invariantes relevantes:**

- Una solicitud enviada debe contener partidas válidas.
- El `TotalAmount` se deriva de las partidas y no se recibe como un valor arbitrario del cliente.
- Las partidas solo pueden editarse mientras la solicitud está en `Draft`.
- Solo una solicitud `Submitted` puede aprobarse o rechazarse, y el rechazo requiere comentario.
- La aprobación o rechazo conserva una `ApprovalDecision` consistente con el estado.
- Los estados finales no se reabren en la V1.
- `RequestNumber` se genera con el formato `PR-{año}-{8 hex}`.

Las violaciones de reglas lanzan `DomainException`. Las reglas que pertenecen a una sola solicitud se concentran aquí, en vez de duplicarse en controllers y servicios.

### 4.2. Application — casos de uso y contexto

Coordina los flujos de negocio mediante **casos de uso explícitos**, una clase `*UseCase` por funcionalidad (`Auth`, `Users`, `Departments`, `PurchaseRequests`), registrada como scoped.

Sus responsabilidades incluyen:

- Consultar usuarios, departamentos y solicitudes.
- Validar existencia y condiciones externas al agregado (por ejemplo, un departamento activo).
- Aplicar autorización contextual: **ownership**, rol y pertenencia a departamento.
- Invocar comportamientos del dominio y persistir cambios.
- Definir contratos de entrada y salida (requests, queries y DTOs, mapeados a mano).
- Expresar errores esperados mediante excepciones de aplicación.

El flujo típico de una operación es:

```text
Controller HTTP
    ↓
UseCase (Application)
    ├── consulta persistencia / usuario actual
    ├── valida acceso y datos relacionados
    ├── ejecuta comportamiento del agregado (Domain)
    └── guarda cambios y devuelve DTO
```

Application define abstracciones para sus dependencias externas:

```text
IApplicationDbContext
ICurrentUserService
IPasswordHashService
IJwtTokenGenerator
```

Se utiliza **`IApplicationDbContext`** en lugar de crear un repositorio genérico por entidad. Es una elección deliberada: Application trabaja con las abstracciones de EF Core, **sin conocer `AppDbContext`, Npgsql ni PostgreSQL**. No se usan MediatR ni AutoMapper.

Application contiene además `AdminSeeder` (creación del administrador inicial) y `TokenSessionValidator` (revalidación de sesión, sección 4.6).

### 4.3. Infrastructure — persistencia y servicios técnicos

Implementa los contratos que Application necesita para comunicarse con recursos técnicos:

- **`AppDbContext`** y mapeos de entidades mediante **Fluent API** (`Configurations/`).
- Migraciones de Entity Framework Core (`Migrations/`) y `DatabaseMigrator`, que las aplica al arrancar si se configura (sección 7.5).
- Proveedor **Npgsql** para PostgreSQL.
- Implementación de hashing y verificación de contraseñas.
- Emisión y firma de JWT mediante `JwtTokenGenerator`.
- Registro de dependencias de infraestructura.

La persistencia define, entre otras restricciones, **índices únicos** para email, nombre de departamento y `RequestNumber`; precisión decimal para importes; y comportamientos de eliminación orientados a preservar el historial y la composición del agregado.

La configuración de una relación o índice permanece en Infrastructure. Como los tests crean el esquema con `EnsureCreated` sobre SQLite, las configuraciones deben funcionar tanto en PostgreSQL como en SQLite.

### 4.4. API — interfaz HTTP y composición

Expone los recursos REST y traduce las solicitudes HTTP a casos de uso. Los controllers son delgados y no capturan excepciones.

Sus responsabilidades incluyen:

- Controllers, routing y respuestas HTTP.
- Configuración de **JWT Bearer Authentication** y de la política **CORS `"Frontend"`**.
- Autorización general por rol mediante `[Authorize(Roles = "...")]`.
- `CurrentUserService`, que interpreta los claims del usuario autenticado.
- Registro y composición de servicios en `Program.cs`.

**Manejo de errores.** Los casos de uso lanzan excepciones tipadas y `GlobalExceptionHandler` las traduce a `ProblemDetails`:

| Excepción | HTTP |
| --- | --- |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `DomainException` | 400 |
| Cualquier otra | 500 |

**CORS.** La política `"Frontend"` se alimenta de `Cors:AllowedOrigins` (vacía en `appsettings.json`; `http://localhost:5173` en Development). `UseCors` va antes de `UseAuthentication`.

La API **no contiene las reglas internas del agregado** ni sustituye las validaciones de autorización contextual que pertenecen a Application.

### 4.5. Modelo de datos principal

| Entidad | Propósito | Campos destacados |
| --- | --- | --- |
| `User` | Identidad y rol de un colaborador | `Id`, `FullName`, `Email`, `PasswordHash`, `SecurityStamp`, `Role`, `DepartmentId`, `IsActive` |
| `Department` | Unidad organizacional | `Id`, `Name`, `IsActive` |
| `PurchaseRequest` | Solicitud y estado del flujo | `Id`, `RequestNumber`, `RequestedByUserId`, `DepartmentId`, `Priority`, `Status`, `Justification`, `TotalAmount`, fechas de transición |
| `PurchaseRequestItem` | Partida de una solicitud | `Id`, `Description`, `Quantity`, `UnitPrice`, `PurchaseRequestId` |
| `ApprovalDecision` | Decisión registrada por un aprobador | `Id`, `PurchaseRequestId`, `ApproverUserId`, `Decision`, `Comment`, `DecidedAt` |

El identificador técnico de una solicitud es un `Guid`, mientras que `RequestNumber` sirve como referencia legible para negocio, con un formato similar a `PR-2026-A3F06D21`.

### 4.6. Autenticación y autorización

Al iniciar sesión correctamente, la API genera un JWT con los claims `NameIdentifier`, `Role`, `department_id` y `security_stamp`. Los casos de uso utilizan `ICurrentUserService` para consultar al usuario actual.

```text
Login
  ↓
JwtTokenGenerator (Infrastructure)
  ↓
JWT
  ↓
Authorization: Bearer <token>
  ↓
JwtBearer (API) ── OnTokenValidated ──> TokenSessionValidator (Application)
  ↓
HttpContext.User / CurrentUserService
  ↓
UseCase (Application)
```

Se distinguen dos niveles:

- **Autorización por rol:** por ejemplo, permitir operaciones de aprobación a `Approver` o `Admin`.
- **Autorización contextual:** comprobar que un solicitante sea propietario de la solicitud o que un aprobador pertenezca al departamento correspondiente.

**Revalidación de sesión.** En cada petición autenticada, `TokenSessionValidator` compara los claims del token con la base de datos, sin caché. Responde 401 si:

- el usuario no existe o está inactivo;
- el departamento del usuario está inactivo;
- cambió su rol o su departamento;
- cambió su `SecurityStamp`, que se regenera solo cuando cambia el `PasswordHash`.

Por eso los cambios administrativos y el cambio de contraseña invalidan los tokens ya emitidos. `PUT api/users/me/password` devuelve un `AuthResponse` nuevo con un token vigente. Todo punto que emita un token debe usar `JwtTokenGenerator.Generate`, para que incluya estos claims.

Una pantalla React puede adaptar sus controles según el rol, pero **la API sigue siendo la autoridad final para permitir o denegar operaciones**.

---

## 5. Arquitectura del frontend

El frontend está hecho con **React + TypeScript mediante Vite** y utiliza **shadcn/ui + Tailwind CSS**. Sigue una **Feature-Based Architecture**: cada módulo organiza juntos sus páginas, componentes, tipos y llamadas HTTP, sin replicar las capas del backend.

### 5.1. Organización por funcionalidades

Ejemplo del módulo de solicitudes:

```text
src/features/purchase-requests/
├── api/
│   └── purchaseRequests.ts
├── components/
│   ├── PurchaseRequestFormDialog.tsx
│   ├── PurchaseRequestItemsEditor.tsx
│   ├── PurchaseRequestsTable.tsx
│   ├── PurchaseRequestStatsCards.tsx
│   ├── PriorityBadge.tsx
│   └── StatusBadge.tsx
├── pages/
│   └── PurchaseRequestsPage.tsx
├── purchaseRequestErrors.ts
├── purchaseRequestItems.ts
└── types.ts
```

| Ubicación | Responsabilidad |
| --- | --- |
| `src/app/` | Composición de la app, router y guards de rutas. |
| `src/features/` | Código de una funcionalidad: autenticación, dashboard, solicitudes, aprobaciones, departamentos, usuarios y perfil. |
| `src/components/ui/` | Componentes base incorporados por **shadcn/ui**. |
| `src/shared/components/` | Componentes propios reutilizados entre funcionalidades (`AppSidebar`, `NotFoundPage`, piezas de formularios modales). |
| `src/shared/layouts/` | Estructura visual común (`AppLayout`). |
| `src/shared/api/` | Cliente HTTP y errores comunes. |
| `src/lib/` | Utilidades técnicas compartidas. |
| `web/procureflow-web/design/` | HTML de referencia visual, separado de `src/`. |

Los componentes no se extraen a `shared` por anticipado: primero viven dentro de una feature y se mueven solo cuando hay reutilización real.

### 5.2. Pantallas y rutas

| Ruta | Pantalla | Acceso |
| --- | --- | --- |
| `/login` | Inicio de sesión | Público (`GuestRoute`) |
| `/register` | Registro de solicitantes | Público (`GuestRoute`) |
| `/dashboard` | Dashboard, con vista según el rol (solicitante, aprobador o resumen general) | Autenticado |
| `/purchases` | Gestión de solicitudes: listado, creación, edición de partidas, envío y cancelación | Autenticado |
| `/approvals` | Bandeja de aprobaciones: aprobar y rechazar | Autenticado |
| `/departments` | Gestión de departamentos | Autenticado |
| `/users` | Gestión de usuarios | Autenticado |
| `/profile` | Perfil y cambio de contraseña | Autenticado |
| `*` | Página 404 | Todos |

Las rutas autenticadas pasan por `ProtectedRoute`, que exige una sesión con token no vencido, y se renderizan dentro de `AppLayout` (barra lateral con menú de usuario y cierre de sesión). Las operaciones de cada pantalla las autoriza el backend según el rol.

### 5.3. Integración con la API

El frontend consume los endpoints mediante `fetch`, con tipos TypeScript alineados con los JSON de la API. Los contratos reales del backend son la referencia: no se inventan endpoints ni propiedades a partir del HTML de diseño.

- **URL base:** `VITE_API_URL`. Las llamadas pasan por `src/shared/api/httpClient.ts` (`ApiError`, `NetworkError`); las features no usan `fetch` directo.
- **Errores:** los mensajes se fijan por código HTTP en el frontend (400/401/403…); no se muestra el `detail` del `ProblemDetails`. Por eso cambiar el tipo de excepción que lanza un caso de uso cambia lo que ve el usuario.
- **Sesión:** se guarda bajo `procureflow.session` en `localStorage` si el usuario marca "Recordar sesión" y en `sessionStorage` si no. Es una decisión de MVP, no definitiva (ver `docs/decisions/ADR-001-auth-api.md`).
- **401:** una petición con token que recibe 401 cierra la sesión y lleva a `/login`, conservando la ruta de origen.
- **Cambio de contraseña:** la API responde con un token nuevo y el cliente reemplaza el guardado, porque el anterior deja de ser válido.
- **Roles:** `UserRole` viaja como número en el JSON y la copia del frontend debe coincidir con `ProcureFlow.Domain/Enums/UserRole.cs`.
- **Secretos:** no se incluyen secretos en variables `VITE_*`, que forman parte del bundle del navegador.

### 5.4. Referencia visual

Las pantallas se diseñaron en Google Stitch y su HTML de referencia está en `web/procureflow-web/design/`. El código React respeta el diseño sin copiar el HTML estático, usa componentes de shadcn/ui cuando son adecuados y se adapta a los datos y reglas reales de la API.

### 5.5. Desarrollo asistido por IA: Spec-Driven Development

El proyecto usa **Spec-Driven Development** ligero con Claude Code:

```text
Diseño de referencia + contrato de la API
                  ↓
        /spec  →  specs/NN-nombre.md
                  ↓
        Revisión / aprobación humana
                  ↓
   /spec-impl  →  rama spec-NN-nombre, implementación y verificación
                  ↓
        Estado de la spec: implementado
```

- **`specs/NN-nombre.md`:** una especificación por archivo, con su estado, alcance, comportamiento y criterios de aceptación.
- **`CLAUDE.md`:** convenciones persistentes. Hay dos niveles: `ProcureFlow/CLAUDE.md` (arquitectura, contratos y límites entre backend y frontend) y `web/procureflow-web/CLAUDE.md` (React, TypeScript, shadcn/ui y sesión).
- **`docs/decisions/`:** decisiones arquitectónicas (ADR). Las nuevas decisiones se documentan ahí.

### 5.6. Especificaciones implementadas

| Spec | Funcionalidad | Estado |
| --- | --- | --- |
| 01 | Pantalla de login | Implementada |
| 02 | Pantalla de registro | Implementada |
| 03 | Dashboard principal | Implementada |
| 04 | Dashboard del solicitante | Implementada |
| 05 | Dashboard del aprobador | Implementada |
| 06 | Guard de rutas y logout | Implementada |
| 07 | Gestión de departamentos | Implementada |
| 08 | Gestión de usuarios | Implementada |
| 09 | Gestión de solicitudes | Implementada |
| 10 | Gestión de aprobaciones | Implementada |
| 11 | Administrador inicial al arrancar | Implementada |
| 12 | Diseño de modales de usuarios y departamentos | Implementada |
| 13 | Migraciones al arrancar | Implementada |
| 14 | Pantalla de perfil de usuario | Implementada |
| 15 | Revalidar la sesión en cada petición | Implementada |

---

## 6. Pruebas automatizadas del backend

El backend concentra sus pruebas en **un único proyecto `ProcureFlow.Tests`**, organizado por carpetas según el nivel probado:

| Tipo | Qué valida | Herramientas |
| --- | --- | --- |
| **Domain** | Invariantes de `PurchaseRequest` y `User`, y transiciones, sin infraestructura. | xUnit |
| **Application** | Casos de uso, ownership, permisos, consultas, `AdminSeeder` y `TokenSessionValidator`, con dependencias controladas. | xUnit, SQLite In-Memory, `TestDbContextFactory`, `FakeCurrentUserService` |
| **Integration** | Flujo HTTP real a través de middleware JWT, controllers, Application y EF Core. | xUnit, `WebApplicationFactory`, SQLite In-Memory |

Escenarios representativos:

```text
Domain
  Submit sin partidas → error
  Modificar partidas → recalcula TotalAmount
  Approve → registra ApprovalDecision
  Reject sin comentario → error

Application
  Requester no modifica solicitudes ajenas
  Approver solo opera solicitudes de su departamento
  AdminSeeder solo crea el admin si no existe ninguno
  TokenSessionValidator rechaza tokens con claims desactualizados

Integration
  Login válido → JWT
  Sin token → 401
  Create → AddItem → Submit
  Requester intenta aprobar → 403
  Perfil: actualizar datos y cambiar contraseña
  Revalidación de sesión: usuario desactivado, rol cambiado o contraseña cambiada → 401
```

Las pruebas de integración reemplazan PostgreSQL por una conexión SQLite en memoria compartida y la base se reinicia antes de cada prueba. No hace falta tener Postgres para ejecutarlas. SQLite no sustituye por completo a PostgreSQL en comportamientos específicos del proveedor.

```bash
dotnet test                                                         # todas las pruebas
dotnet test --filter "FullyQualifiedName~PurchaseRequestTests"      # una clase
```

---

## 7. Configuración y ejecución del backend

### Requisitos

- **.NET 10 SDK**.
- **PostgreSQL 16**, por ejemplo con el `docker-compose.yml` incluido (requiere Docker).
- Herramienta **`dotnet-ef`** para trabajar con migraciones (opcional).

### 7.1. Configurar PostgreSQL

**Con Docker Compose.** Crea un archivo `.env` en la raíz (ignorado por Git) con:

```dotenv
DB_NAME=procureflow
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_PORT=5437
```

y levanta la base:

```bash
docker compose up -d
```

La connection string debe coincidir con esos valores. Define `ConnectionStrings:DefaultConnection` mediante variable de entorno o secretos de desarrollo.

**PowerShell (Windows):**

```powershell
$Env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5437;Database=procureflow;Username=tu_usuario;Password=tu_contraseña"
```

**Linux / macOS:**

```bash
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5437;Database=procureflow;Username=tu_usuario;Password=tu_contraseña"
```

### 7.2. Configurar JWT

Configura la sección `Jwt` (`Issuer`, `Audience`, `SecretKey`, `ExpirationMinutes`). Usa una **clave secreta robusta** desde una fuente segura.

**PowerShell:**

```powershell
$Env:Jwt__Issuer="ProcureFlow.Api"
$Env:Jwt__Audience="ProcureFlow.Web"
$Env:Jwt__SecretKey="REPLACE_WITH_A_LONG_RANDOM_SECRET"
$Env:Jwt__ExpirationMinutes="60"
```

Los separadores `__` de las variables de entorno corresponden a secciones de configuración de ASP.NET Core, por ejemplo `Jwt__SecretKey` → `Jwt:SecretKey`.

> **Seguridad:** no subas a Git contraseñas reales, claves JWT, archivos `.env` con secretos ni connection strings sensibles.

### 7.3. Configurar CORS

La política `"Frontend"` permite los orígenes de `Cors:AllowedOrigins`. En `appsettings.json` está vacía, así que ningún origen queda permitido; `appsettings.Development.json` permite `http://localhost:5173`. Para otros entornos:

```powershell
$Env:Cors__AllowedOrigins__0="https://tu-frontend.example.com"
```

### 7.4. Compilar y ejecutar

Desde la raíz del repositorio:

```bash
dotnet restore
dotnet build
dotnet run --project ProcureFlow.Api
```

En local usa el perfil `http` de `launchSettings.json` (`http://localhost:5285`): `UseHttpsRedirection` redirige las peticiones y rompe el preflight de CORS del frontend.

### 7.5. Migraciones

Instalar la herramienta de EF Core, si hace falta:

```bash
dotnet tool install --global dotnet-ef
```

Aplicar migraciones existentes:

```bash
dotnet ef database update --project ProcureFlow.Infrastructure --startup-project ProcureFlow.Api
```

Crear una migración:

```bash
dotnet ef migrations add MigrationName --project ProcureFlow.Infrastructure --startup-project ProcureFlow.Api --output-dir Migrations
```

**Migraciones automáticas al arrancar.** La API puede aplicar las migraciones pendientes al iniciar, antes de crear el administrador inicial (sección 7.6). Se controla con la clave `Database:MigrateOnStartup`:

| Entorno | Valor | Efecto |
| --- | --- | --- |
| `appsettings.json` (por defecto) | `false` | No migra. Ejecuta `dotnet ef database update` a mano. |
| `appsettings.Development.json` | `true` | Aplica las migraciones pendientes en cada arranque. |
| `Testing` | `false` | Los tests usan SQLite con `EnsureCreated`. |

Se puede sobrescribir con la variable de entorno `Database__MigrateOnStartup`. Con ella en `true`, `dotnet ef database update` pasa a ser opcional.

Si Postgres no responde o una migración falla, se registra un log de error y la API no arranca. No hay reintentos.

### 7.6. Administrador inicial

El registro público solo crea usuarios `Requester`. Para tener un primer `Admin`, la API puede crearlo al arrancar a partir de la sección `AdminSeed`.

| Clave | Descripción |
| --- | --- |
| `AdminSeed:Enabled` | `false` en `appsettings.json`, `true` en `appsettings.Development.json`. |
| `AdminSeed:Email` | Correo del administrador. Obligatorio si `Enabled` es `true`. |
| `AdminSeed:Password` | Contraseña de al menos 8 caracteres. Obligatoria si `Enabled` es `true`. **Nunca va en un archivo versionado.** |
| `AdminSeed:FullName` | Nombre completo. Por defecto `Administrador`. |
| `AdminSeed:DepartmentName` | Departamento del admin; se crea si no existe. Por defecto `Administración`. |

Reglas:

- Solo crea el administrador si no existe ningún usuario `Admin`, esté activo o no. Nunca modifica ni reactiva usuarios existentes.
- Si `Enabled` es `true` y la configuración es inválida, la API no arranca. Eso incluye una contraseña ausente o corta, y un correo que ya usa un usuario que no es administrador.
- Necesita que las tablas existan. Si `Database:MigrateOnStartup` es `true`, las migraciones se aplican antes del seed; si no, ejecuta antes `dotnet ef database update` (sección 7.5).

La contraseña se pasa con secretos de desarrollo o con una variable de entorno.

**Secretos de desarrollo:**

```bash
dotnet user-secrets set "AdminSeed:Password" "TU_CLAVE_SEGURA" --project ProcureFlow.Api
```

**Variable de entorno (PowerShell), por ejemplo en producción:**

```powershell
$Env:AdminSeed__Enabled="true"
$Env:AdminSeed__Email="admin@tu-dominio.com"
$Env:AdminSeed__Password="TU_CLAVE_SEGURA"
```

> **Seguridad:** no escribas `AdminSeed:Password` en ningún `appsettings*.json`. La validación corre en cada arranque, así que mientras `Enabled` sea `true` la contraseña debe seguir configurada. Cuando el admin ya existe, puedes poner `Enabled` en `false`.

---

## 8. Configuración y ejecución del frontend

Requiere **Node.js** compatible con la versión de Vite del proyecto y npm.

### 8.1. Variables de entorno

Copia `web/procureflow-web/.env.example` a `.env.local` (o ajusta `.env.development`) y apunta a la API:

```dotenv
VITE_API_URL=http://localhost:5285
```

Vite fija este valor al compilar, así que cada entorno necesita su propio build. **No incluyas secretos en `VITE_*`.** Si el frontend y la API usan orígenes distintos, la API debe permitir el origen del frontend (sección 7.3).

### 8.2. Servidor de desarrollo y comandos

```bash
cd web/procureflow-web
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint       # ESLint
```

### 8.3. Puesta en marcha rápida

1. `docker compose up -d` para levantar PostgreSQL (con el `.env` de la sección 7.1).
2. `dotnet run --project ProcureFlow.Api`. En Development aplica las migraciones y crea el administrador inicial (configura `AdminSeed:Password` con `user-secrets`).
3. `cd web/procureflow-web && npm install && npm run dev`.
4. Abre `http://localhost:5173` e inicia sesión con el administrador del seed. Desde `/departments` y `/users` puedes crear departamentos y usuarios `Approver`; los `Requester` también pueden registrarse en `/register`.

---

## 9. Recursos principales de la API

Todas las rutas cuelgan de `/api`. Salvo `register` y `login`, requieren `Authorization: Bearer <token>`.

### `/api/auth`

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| POST | `/register` | Anónimo | Registra un usuario `Requester`. |
| POST | `/login` | Anónimo | Inicia sesión y devuelve un `AuthResponse` con el JWT. |

### `/api/departments`

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/` | Autenticado | Lista departamentos. |
| GET | `/active` | Autenticado | Lista departamentos activos. |
| GET | `/{id}` | Autenticado | Detalle de un departamento. |
| POST | `/` | Admin | Crea un departamento. |
| PUT | `/{id}` | Admin | Actualiza un departamento. |
| DELETE | `/{id}` | Admin | Elimina un departamento. |
| PATCH | `/{id}/activate` · `/{id}/deactivate` | Admin | Activa o desactiva un departamento. |

### `/api/users`

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/me` | Autenticado | Datos del usuario actual. |
| PUT | `/me` | Autenticado | Actualiza el perfil propio. |
| PUT | `/me/password` | Autenticado | Cambia la contraseña y devuelve un `AuthResponse` nuevo. |
| GET | `/` | Admin | Lista usuarios con filtros y paginación. |
| GET | `/{id}` | Admin | Detalle de un usuario. |
| POST | `/` | Admin | Crea un usuario. |
| PUT | `/{id}` | Admin | Actualiza un usuario. |
| DELETE | `/{id}` | Admin | Elimina un usuario. |
| PATCH | `/{id}/activate` · `/{id}/deactivate` | Admin | Activa o desactiva un usuario. |
| PATCH | `/{id}/change-department/{departmentId}` | Admin | Cambia el departamento de un usuario. |

### `/api/purchases`

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/` | Autenticado | Lista solicitudes según el alcance del usuario. |
| GET | `/summary` | Autenticado | Resumen para los dashboards. |
| GET | `/{id}` | Autenticado | Detalle de una solicitud. |
| GET | `/item/{id}` | Autenticado | Detalle de una partida. |
| POST | `/` | Requester, Admin | Crea una solicitud en `Draft`. |
| PUT | `/{id}` | Requester, Admin | Actualiza una solicitud. |
| POST | `/{id}/add-item` | Requester, Admin | Agrega una partida. |
| PUT | `/{id}/update-item/{itemId}` | Requester, Admin | Actualiza una partida. |
| PUT | `/{id}/delete-item/{itemId}` | Requester, Admin | Quita una partida. |
| PATCH | `/{id}/submit` | Autenticado | Envía la solicitud a revisión. |
| PATCH | `/{id}/cancel` | Autenticado | Cancela la solicitud. |
| GET | `/pendingApprovals` | Approver, Admin | Solicitudes pendientes de decisión. |
| PATCH | `/{id}/approve` · `/{id}/reject` | Approver, Admin | Aprueba o rechaza (el rechazo exige comentario). |

Además del rol, los casos de uso aplican autorización contextual (propiedad de la solicitud, departamento del aprobador, estado). Los verbos, rutas y DTOs exactos están en `ProcureFlow.Api/Controllers/`, y `ProcureFlow.Api/ProcureFlow.Api.http` incluye ejemplos de peticiones. `UserRole` se serializa como número.

## 10. Decisiones arquitectónicas

El proyecto prioriza **claridad, encapsulación y crecimiento gradual**:

- En el **backend** se eligió Clean Architecture pragmática, un agregado de dominio, casos de uso explícitos e `IApplicationDbContext`. No se añadieron Generic Repository, Unit of Work personalizado, MediatR, AutoMapper, CQRS completo, Event Bus ni microservicios.
- La **sesión se revalida en cada petición** contra la base de datos, sin caché, para que desactivar a un usuario o cambiar su rol, departamento o contraseña surta efecto de inmediato (spec 15).
- En el **frontend** se eligió una organización por funcionalidades, con componentes base shadcn/ui y reutilización justificada por casos reales, en lugar de trasladar automáticamente la arquitectura del backend a React.
- El **backend** es la fuente de verdad de reglas y permisos; el frontend ofrece la experiencia de usuario y consume los contratos publicados por la API.
- Para **desarrollo con IA**, las especificaciones contienen los requisitos, `CLAUDE.md` contiene las reglas persistentes y las decisiones arquitectónicas quedan sujetas a revisión humana.

El detalle y las decisiones pendientes de la comunicación frontend ↔ API y la autenticación (guardado del JWT, expiración, cabecera `Authorization`) están en [`docs/decisions/ADR-001-auth-api.md`](docs/decisions/ADR-001-auth-api.md).

## 11. Alcance y evolución

La **V1** cubre autenticación, usuarios, departamentos, solicitudes con partidas y un flujo de aprobación de un nivel, con la interfaz web que lo acompaña.

Quedan fuera del MVP: proveedores, cotizaciones, órdenes de compra, presupuestos, adjuntos, notificaciones, aprobaciones multinivel, refresh tokens, OAuth/OpenID Connect y microservicios. El almacenamiento del JWT en Web Storage es una decisión de MVP que debe revisarse antes de producción.

Una futura evolución del dominio podría ampliar el flujo:

```text
Approved → Quoted → Ordered → Received → Closed
```

con gestión de proveedores, cotizaciones y órdenes de compra.

## 12. Objetivo técnico

ProcureFlow busca demostrar la capacidad de **analizar reglas empresariales, modelar un dominio, diseñar límites entre componentes, implementar seguridad contextual y verificar el sistema mediante pruebas**. El frontend complementa esa base con React/TypeScript, una interfaz basada en diseño y un proceso de desarrollo asistido por IA con **Spec-Driven Development y Context Engineering**.
