# ProcureFlow

**ProcureFlow** es una API REST para gestionar solicitudes internas de compra y su flujo de aprobación dentro de una organización.

El proyecto fue desarrollado como una práctica de arquitectura backend con **ASP.NET Core**, aplicando una separación clara entre dominio, casos de uso, infraestructura y API.

El sistema permite que usuarios de distintos departamentos creen solicitudes de compra, agreguen productos o servicios, las envíen a aprobación y sean posteriormente aprobadas o rechazadas por usuarios autorizados.

---

## Objetivo del proyecto

ProcureFlow modela un flujo empresarial común:

```text
Draft
  ↓
Submitted
  ├── Approved
  └── Rejected

Draft / Submitted
  ↓
Cancelled
```

Una solicitud comienza como borrador y puede contener múltiples partidas.

Mientras se encuentra en estado `Draft`, el solicitante puede:

- modificar la prioridad y justificación;
- agregar partidas;
- modificar partidas;
- eliminar partidas.

Una solicitud solo puede enviarse cuando contiene información válida.

Una vez enviada, un usuario con rol de aprobación puede aprobarla o rechazarla según las reglas de autorización del sistema.

---

## Roles

### Requester

Responsable de crear y administrar sus propias solicitudes.

Puede:

- crear solicitudes;
- consultar sus solicitudes;
- agregar, editar y eliminar partidas mientras estén en `Draft`;
- enviar solicitudes;
- cancelar solicitudes permitidas por el flujo.

### Approver

Responsable de revisar solicitudes de su departamento.

Puede:

- consultar solicitudes pendientes de aprobación;
- aprobar solicitudes;
- rechazar solicitudes.

La aplicación valida que el aprobador pertenezca al departamento correspondiente.

### Admin

Tiene acceso administrativo al sistema.

Puede:

- gestionar usuarios;
- gestionar departamentos;
- consultar solicitudes;
- intervenir en operaciones administrativas permitidas.

---

## Arquitectura

El backend utiliza una variante pragmática de **Clean Architecture** dentro de un monolito modular.

```text
ProcureFlow
│
├── ProcureFlow.Domain
│   ├── Entities
│   ├── Enums
│   └── Exceptions
│
├── ProcureFlow.Application
│   ├── Abstractions
│   ├── Auth
│   ├── Departments
│   ├── Users
│   ├── PurchaseRequests
│   └── Exceptions
│
├── ProcureFlow.Infrastructure
│   ├── Persistence
│   └── Security
│
├── ProcureFlow.Api
│   ├── Controllers
│   ├── Authentication
│   └── ExceptionHandling
│
└── ProcureFlow.Tests
    ├── Domain
    ├── Application
    ├── Integration
    └── TestSupport
```

### Domain

Contiene las reglas de negocio independientes de infraestructura.

El agregado principal es:

```text
PurchaseRequest
├── PurchaseRequestItem
└── ApprovalDecision
```

`PurchaseRequest` actúa como **Aggregate Root** y controla operaciones como:

- `AddItem`
- `UpdateItem`
- `RemoveItem`
- `Submit`
- `Approve`
- `Reject`
- `Cancel`

Esto permite mantener dentro del dominio invariantes como:

- una solicitud enviada debe contener partidas;
- una solicitud solo puede aprobarse desde `Submitted`;
- una solicitud rechazada debe registrar una decisión;
- el importe total se deriva de sus partidas;
- los estados finales no pueden modificarse libremente.

### Application

Contiene los casos de uso y reglas que requieren contexto externo.

Ejemplos:

- validar que un usuario exista;
- comprobar que un departamento esté activo;
- comprobar ownership de una solicitud;
- validar que un aprobador pertenezca al departamento correcto;
- consultar y persistir información;
- coordinar Domain + Persistence + Security.

Application depende de abstracciones como:

```text
IApplicationDbContext
ICurrentUserService
IPasswordHashService
IJwtTokenGenerator
```

y no conoce implementaciones concretas de PostgreSQL o ASP.NET Core.

### Infrastructure

Implementa las dependencias técnicas utilizadas por Application.

Actualmente incluye:

- Entity Framework Core;
- PostgreSQL mediante Npgsql;
- `AppDbContext`;
- configuraciones Fluent API;
- migraciones;
- password hashing;
- generación de JWT.

### API

Es la capa de entrada HTTP.

Sus responsabilidades incluyen:

- controllers;
- autenticación JWT Bearer;
- autorización por roles;
- lectura de claims mediante `CurrentUserService`;
- manejo global de excepciones;
- composición de dependencias.

---

## Tecnologías

### Backend

- .NET 10
- ASP.NET Core Web API
- C#
- Entity Framework Core
- PostgreSQL
- Npgsql

### Seguridad

- JWT Bearer Authentication
- Role-based Authorization
- Password Hashing
- Claims
- Ownership y autorización contextual por departamento

### Testing

- xUnit
- SQLite In-Memory
- `WebApplicationFactory`
- pruebas de Domain
- pruebas de Application
- pruebas de integración HTTP

---

## Autenticación y autorización

Después de iniciar sesión correctamente, la API genera un JWT que contiene claims como:

```text
UserId
Email
Name
Role
```

El flujo es:

```text
Login
  ↓
JwtTokenGenerator
  ↓
Access Token
  ↓
JwtBearer
  ↓
HttpContext.User
  ↓
CurrentUserService
  ↓
Application
```

La autorización se divide en dos niveles.

### Autorización por rol

ASP.NET Core controla reglas generales mediante `[Authorize]`.

Ejemplo conceptual:

```text
Requester
→ crear solicitudes

Approver
→ aprobar/rechazar

Admin
→ operaciones administrativas
```

### Autorización contextual

Application valida reglas que no pueden resolverse únicamente con el rol.

Ejemplos:

```text
¿La solicitud pertenece al Requester?

¿El Approver pertenece al mismo departamento?

¿El usuario actual puede modificar esta solicitud?
```

---

## Modelo principal

### PurchaseRequest

Una solicitud contiene información como:

```text
Id
RequestNumber
RequestedByUserId
DepartmentId
Priority
Status
Justification
TotalAmount
CreatedAt
SubmittedAt
ApprovedAt
RejectedAt
CancelledAt
```

Cada solicitud recibe además un identificador de negocio similar a:

```text
PR-2026-A3F06D21
```

El `Id` interno continúa siendo un `Guid`.

### PurchaseRequestItem

Representa una partida dentro de la solicitud.

```text
Description
Quantity
UnitPrice
```

El total de la solicitud se calcula a partir de sus partidas.

### ApprovalDecision

Representa la decisión final tomada por un aprobador.

```text
ApproverUserId
Decision
Comment
DecidedAt
```

---

## Persistencia

La persistencia utiliza **Entity Framework Core** con PostgreSQL.

Entre las restricciones implementadas se encuentran:

- email de usuario único;
- nombre de departamento único;
- `RequestNumber` único;
- precisión decimal para importes;
- relaciones configuradas mediante Fluent API;
- restricciones de eliminación para preservar información histórica.

---

## Pruebas

El proyecto incluye pruebas en diferentes niveles.

### Domain Tests

Validan reglas sin utilizar infraestructura.

Ejemplos:

```text
Submit sin partidas → error

AddItem → recalcula TotalAmount

Approve → cambia estado y genera ApprovalDecision

Reject sin comentario → error

Cancel sobre estado final → error
```

### Application Tests

Validan reglas que requieren contexto.

Ejemplos:

```text
Requester solo modifica sus solicitudes

Approver solo trabaja con solicitudes permitidas

Usuario y departamento deben existir

Autorización contextual por departamento
```

Para estas pruebas se utiliza **SQLite In-Memory** en lugar de PostgreSQL.

### Integration Tests

Levantan la API mediante `WebApplicationFactory` y recorren el flujo HTTP real.

Incluyen escenarios como:

```text
Login válido → JWT

Endpoint protegido sin token → 401

Requester autenticado → crea Draft

Create → AddItem → Submit

Requester intenta aprobar → 403

Approver del mismo departamento → aprobación exitosa

Approver de otro departamento → 403
```

Estas pruebas integran:

```text
HTTP
↓
JWT Bearer
↓
Controllers
↓
Application
↓
Domain
↓
EF Core
↓
SQLite
```

---

## Configuración

### Requisitos

- .NET 10 SDK
- PostgreSQL
- Entity Framework CLI, opcional para manejar migraciones

Instalar `dotnet-ef`:

```bash
dotnet tool install --global dotnet-ef
```

---

## Base de datos

Configura la cadena mediante una variable de entorno.

### PowerShell

```powershell
$Env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=procureflow;Username=postgres;Password=YOUR_PASSWORD"
```

### Linux / macOS

```bash
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=procureflow;Username=postgres;Password=YOUR_PASSWORD"
```

No se recomienda versionar credenciales reales dentro de `appsettings.json`.

---

## Configuración JWT

Los valores sensibles también pueden configurarse mediante variables de entorno.

### PowerShell

```powershell
$Env:Jwt__SecretKey="YOUR_SECURE_SECRET_KEY"
$Env:Jwt__Issuer="ProcureFlow.Api"
$Env:Jwt__Audience="ProcureFlow.Web"
$Env:Jwt__ExpirationMinutes="60"
```

Los nombres siguen el sistema de configuración de ASP.NET Core:

```text
Jwt__SecretKey
        ↓
Jwt:SecretKey
```

---

## Migraciones

Aplicar las migraciones existentes:

```bash
dotnet ef database update \
  --project ProcureFlow.Infrastructure \
  --startup-project ProcureFlow.Api
```

Crear una nueva migración:

```bash
dotnet ef migrations add MigrationName \
  --project ProcureFlow.Infrastructure \
  --startup-project ProcureFlow.Api \
  --output-dir Persistence/Migrations
```

---

## Ejecutar el proyecto

Desde la raíz:

```bash
dotnet restore
dotnet build
```

Ejecutar la API:

```bash
dotnet run --project ProcureFlow.Api
```

---

## Ejecutar pruebas

```bash
dotnet test
```

Las pruebas de integración reemplazan PostgreSQL por SQLite In-Memory, por lo que no necesitan modificar la base de datos de desarrollo.

---

## Endpoints principales

La API está organizada alrededor de los siguientes recursos:

```text
/api/auth
/api/departments
/api/users
/api/purchases
```

Entre las operaciones principales se encuentran:

```text
Authentication
├── Login
└── Registro

Departments
├── Crear
├── Consultar
├── Actualizar
├── Activar
└── Desactivar

Users
├── Crear
├── Consultar
├── Actualizar
├── Activar
└── Desactivar

Purchase Requests
├── Crear Draft
├── Consultar solicitudes
├── Agregar partidas
├── Actualizar partidas
├── Eliminar partidas
├── Submit
├── Cancel
├── Approve
└── Reject
```

---

## Decisiones de diseño

El proyecto evita intencionalmente introducir abstracciones que no aportan valor al alcance actual.

Por ejemplo, no utiliza:

- Generic Repository;
- Unit of Work personalizado;
- MediatR;
- CQRS completo;
- AutoMapper;
- Event Bus;
- microservicios.

En su lugar se priorizó:

- encapsulación del dominio;
- inversión de dependencias;
- casos de uso explícitos;
- autorización contextual;
- persistencia relacional;
- pruebas automatizadas;
- una arquitectura suficientemente limpia sin añadir complejidad innecesaria.

---

## Alcance actual

La primera versión está enfocada en el ciclo de solicitud y aprobación.

Quedan fuera de este alcance:

- proveedores;
- cotizaciones;
- órdenes de compra;
- presupuestos;
- archivos adjuntos;
- notificaciones;
- aprobaciones multinivel;
- refresh tokens;
- OAuth/OpenID Connect;
- microservicios.

Una evolución futura podría extender el flujo hacia:

```text
Approved
   ↓
Quoted
   ↓
Ordered
   ↓
Received
   ↓
Closed
```

incorporando conceptos como proveedores, cotizaciones y órdenes de compra.

---

## Objetivo de aprendizaje

ProcureFlow fue desarrollado para practicar y demostrar conceptos de backend moderno como:

- ASP.NET Core;
- Clean Architecture;
- Domain Modeling;
- Entity Framework Core;
- autenticación y autorización;
- Dependency Injection;
- manejo global de errores;
- testing unitario e integración;
- diseño de APIs empresariales.

El objetivo principal no es únicamente implementar endpoints CRUD, sino modelar correctamente las responsabilidades y reglas de un flujo empresarial real.