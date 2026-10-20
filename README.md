# ProcureFlow

**ProcureFlow** es un sistema de gestión de **solicitudes internas de compra y aprobaciones**. Permite que los colaboradores de una organización creen solicitudes, administren sus partidas y las envíen a revisión, mientras que los aprobadores toman decisiones según su rol y departamento.

El proyecto tiene un enfoque **full-stack** y se construye en un único repositorio con dos aplicaciones independientes:

- **Backend:** API REST con **.NET 10, ASP.NET Core, EF Core y PostgreSQL**, organizada mediante **Clean Architecture pragmática**.
- **Frontend:** aplicación web con **React, TypeScript, Vite y shadcn/ui**, organizada por funcionalidades e integrada con la API.

El objetivo es implementar un flujo empresarial real con reglas de dominio, autorización contextual, persistencia relacional, pruebas automatizadas y una interfaz mantenible, sin introducir complejidad arquitectónica innecesaria.

> **Estado:** el backend cuenta con una implementación inicial y pruebas de dominio, aplicación e integración. **El frontend está planificado, pendiente de implementación.** Las carpetas, pantallas y herramientas web descritas en este documento representan la estructura y el proceso de trabajo acordados; no indican funcionalidades ya terminadas.

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

Para enviarse (`Submit`), la solicitud debe contener partidas válidas. Una vez enviada, puede aprobarse o rechazarse según las reglas de acceso. En la **V1**, `Approved`, `Rejected` y `Cancelled` son estados finales.

### Roles

| Rol | Responsabilidades principales |
| --- | --- |
| **Requester** | Crear solicitudes, gestionar sus propios borradores, enviar o cancelar solicitudes cuando el flujo lo permita y consultar las solicitudes a las que tiene acceso. |
| **Approver** | Consultar solicitudes pendientes de su departamento y aprobarlas o rechazarlas cuando esté autorizado. |
| **Admin** | Administrar usuarios y departamentos, consultar solicitudes e intervenir en operaciones permitidas por las reglas administrativas. |

La autorización no depende únicamente del rol: también considera **propiedad de la solicitud, departamento y estado del proceso**.

## 2. Tecnologías

| Área | Stack |
| --- | --- |
| Backend | C#, .NET 10, ASP.NET Core Web API |
| Persistencia | Entity Framework Core, Npgsql, PostgreSQL |
| Seguridad | JWT Bearer, password hashing, claims, autorización por rol y contexto |
| Pruebas backend | xUnit, SQLite In-Memory, `WebApplicationFactory` |
| Frontend **(planificado)** | React, TypeScript, Vite, React Router |
| UI **(planificada)** | shadcn/ui y Tailwind CSS |
| Comunicación frontend–API | HTTP/JSON con Fetch API y contratos tipados |
| Diseño visual y desarrollo asistido **(planificados)** | Google Stitch, Claude Code, especificaciones Markdown |

## 3. Arquitectura general y repositorio

ProcureFlow mantiene **backend y frontend independientes dentro del mismo repositorio**. Se comunican a través de contratos HTTP/JSON. No comparten entidades de EF Core ni código de dominio ejecutable entre ambas aplicaciones.

```text
ProcureFlow/
├── README.md
├── CLAUDE.md                         # Instrucciones generales para Claude (planificado)
│
├── ProcureFlow.Domain/
│   ├── Entities/
│   ├── Enums/
│   └── Exceptions/
│
├── ProcureFlow.Application/
│   ├── Abstractions/
│   ├── Auth/
│   ├── Departments/
│   ├── Users/
│   ├── PurchaseRequests/
│   └── Exceptions/
│
├── ProcureFlow.Infrastructure/
│   ├── Persistence/
│   └── Security/
│
├── ProcureFlow.Api/
│   ├── Controllers/
│   ├── Authentication/
│   └── ExceptionHandling/
│
├── ProcureFlow.Tests/
│   ├── Domain/
│   ├── Application/
│   ├── Integration/
│   └── TestSupport/
│
└── web/
    └── procureflow-web/             # Frontend: estructura objetivo
        ├── CLAUDE.md                # Reglas específicas de React/TypeScript
        ├── components.json          # Configuración de shadcn/ui
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── .env.example
        ├── index.html
        ├── public/
        ├── design/
        │   └── stitch/              # HTML/CSS y recursos de referencia
        ├── specs/
        │   ├── 001-auth/
        │   │   ├── spec.md
        │   │   └── tasks.md
        │   ├── 002-dashboard/
        │   └── 003-purchase-requests/
        └── src/
            ├── app/
            │   ├── App.tsx
            │   └── router.tsx
            ├── features/
            │   ├── auth/
            │   ├── purchase-requests/
            │   ├── departments/
            │   └── users/
            ├── components/
            │   └── ui/              # Componentes base de shadcn/ui
            ├── shared/
            │   ├── api/
            │   ├── components/
            │   ├── layouts/
            │   └── styles/
            ├── lib/
            │   └── utils.ts
            └── main.tsx
```

> El árbol indica **responsabilidades y ubicaciones previstas**, no la obligación de crear todos los directorios desde el inicio. La estructura del frontend se completará conforme aparezcan funcionalidades reales.

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

### 4.1. Domain — modelo y reglas de negocio

Contiene **entidades, enums, excepciones y comportamientos del dominio**. No debería depender de ASP.NET Core, controllers, DTOs HTTP, PostgreSQL, JWT ni configuraciones de EF Core.

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
- `Cancel`: permite la cancelación desde estados autorizados.

**Invariantes relevantes:**

- Una solicitud enviada debe contener partidas válidas.
- El `TotalAmount` se deriva de las partidas y no se recibe como un valor arbitrario del cliente.
- Las partidas solo pueden editarse mientras la solicitud está en `Draft`.
- Solo una solicitud `Submitted` puede aprobarse o rechazarse.
- La aprobación o rechazo debe conservar una `ApprovalDecision` consistente con el estado.
- Los estados finales no se reabren en la V1.

Las reglas que pertenecen a una sola solicitud se concentran aquí, en vez de duplicarse en controllers y servicios.

### 4.2. Application — casos de uso y contexto

Coordina los flujos de negocio mediante **casos de uso explícitos** organizados por funcionalidad (`Auth`, `Users`, `Departments`, `PurchaseRequests`).

Sus responsabilidades incluyen:

- Consultar usuarios, departamentos y solicitudes.
- Validar existencia y condiciones externas al agregado (por ejemplo, un departamento activo).
- Aplicar autorización contextual: **ownership**, rol y pertenencia a departamento.
- Invocar comportamientos del dominio y persistir cambios.
- Definir contratos de entrada y salida (requests, queries y DTOs).
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

Application define abstracciones para sus dependencias externas, por ejemplo:

```text
IApplicationDbContext
ICurrentUserService
IPasswordHashService
IJwtTokenGenerator
```

Se utiliza **`IApplicationDbContext`** en lugar de crear un repositorio genérico por entidad. Es una elección deliberada: Application puede trabajar con las abstracciones de EF Core, **sin conocer `AppDbContext`, Npgsql ni PostgreSQL**. Este acoplamiento acotado a EF Core forma parte de la variante pragmática adoptada.

### 4.3. Infrastructure — persistencia y servicios técnicos

Implementa los contratos que Application necesita para comunicarse con recursos técnicos:

- **`AppDbContext`** y mapeos de entidades mediante **Fluent API**.
- Migraciones de Entity Framework Core.
- Proveedor **Npgsql** para PostgreSQL.
- Implementación de hashing y verificación de contraseñas.
- Emisión y firma de JWT mediante `JwtTokenGenerator`.
- Registro de dependencias de infraestructura.

La persistencia define, entre otras restricciones, **índices únicos** para email, nombre de departamento y `RequestNumber`; precisión decimal para importes; y comportamientos de eliminación orientados a preservar el historial y la composición del agregado.

La configuración de una relación o índice permanece en Infrastructure: no contamina el modelo de dominio con detalles de base de datos.

### 4.4. API — interfaz HTTP y composición

Expone los recursos REST y traduce las solicitudes HTTP a casos de uso.

Sus responsabilidades incluyen:

- Controllers, routing y respuestas HTTP.
- Configuración de **JWT Bearer Authentication**.
- Autorización general por rol mediante `[Authorize]`.
- `CurrentUserService`, que interpreta los claims del usuario autenticado.
- Manejo global de excepciones y respuestas de error.
- Registro y composición de servicios en `Program.cs`.

La API **no debería contener las reglas internas del agregado** ni sustituir las validaciones de autorización contextual que pertenecen a Application.

### 4.5. Modelo de datos principal

| Entidad | Propósito | Campos destacados |
| --- | --- | --- |
| `User` | Identidad y rol de un colaborador | `Id`, `FullName`, `Email`, `PasswordHash`, `Role`, `DepartmentId`, `IsActive` |
| `Department` | Unidad organizacional | `Id`, `Name`, `IsActive` |
| `PurchaseRequest` | Solicitud y estado del flujo | `Id`, `RequestNumber`, `RequestedByUserId`, `DepartmentId`, `Priority`, `Status`, `Justification`, `TotalAmount`, fechas de transición |
| `PurchaseRequestItem` | Partida de una solicitud | `Id`, `Description`, `Quantity`, `UnitPrice`, `PurchaseRequestId` |
| `ApprovalDecision` | Decisión registrada por un aprobador | `Id`, `PurchaseRequestId`, `ApproverUserId`, `Decision`, `Comment`, `DecidedAt` |

El identificador técnico de una solicitud es un `Guid`, mientras que `RequestNumber` sirve como referencia legible para negocio, con un formato similar a `PR-2026-A3F06D21`.

### 4.6. Autenticación y autorización

Al iniciar sesión correctamente, la API genera un JWT con datos de identidad y rol. La validación de los tokens se realiza en la capa HTTP; los casos de uso utilizan `ICurrentUserService` para consultar al usuario actual.

```text
Login
  ↓
JwtTokenGenerator (Infrastructure)
  ↓
JWT
  ↓
Authorization: Bearer <token>
  ↓
JwtBearer (API)
  ↓
HttpContext.User / CurrentUserService
  ↓
UseCase (Application)
```

Se distinguen dos niveles:

- **Autorización por rol:** por ejemplo, permitir operaciones de aprobación a `Approver` o `Admin`.
- **Autorización contextual:** comprobar que un solicitante sea propietario de la solicitud o que un aprobador pertenezca al departamento correspondiente.

Una pantalla React puede adaptar sus controles según el rol, pero **la API sigue siendo la autoridad final para permitir o denegar operaciones**.

---

## 5. Arquitectura del frontend (planificada)

El frontend se creará con **React + TypeScript mediante Vite** y utilizará **shadcn/ui + Tailwind CSS** para construir la interfaz a partir de los diseños de Google Stitch.

La estructura seguirá el criterio **Feature-Based Architecture**: cada módulo organiza juntos sus páginas, componentes particulares, tipos y llamadas HTTP, sin replicar las capas del backend.

### 5.1. Organización por funcionalidades

Ejemplo del módulo principal:

```text
src/features/purchase-requests/
├── api/
│   └── purchaseRequestsApi.ts
├── components/
│   ├── PurchaseRequestForm.tsx
│   └── PurchaseRequestItemsTable.tsx
├── pages/
│   ├── PurchaseRequestsPage.tsx
│   └── PurchaseRequestDetailsPage.tsx
└── types.ts
```

Los directorios tienen responsabilidades diferenciadas:

| Ubicación | Responsabilidad |
| --- | --- |
| `src/app/` | Composición de la app, router y configuración general. |
| `src/features/` | Código de una funcionalidad concreta: autenticación, solicitudes, usuarios o departamentos. |
| `src/components/ui/` | Componentes base incorporados por **shadcn/ui** (`Button`, `Input`, `Dialog`, `Table`, etc.). |
| `src/shared/components/` | Componentes creados por el proyecto y reutilizados entre varias funcionalidades. |
| `src/shared/layouts/` | Estructura visual común: navegación, encabezado y layout. |
| `src/shared/api/` | Cliente HTTP y manejo común de respuestas/errores. |
| `src/lib/` | Utilidades técnicas realmente compartidas. |
| `design/stitch/` | Referencias visuales originales exportadas desde Stitch. |
| `specs/` | Requisitos y tareas por funcionalidad para el desarrollo asistido por IA. |

Los componentes **no se extraerán a `shared` por anticipado**: primero vivirán dentro de una feature y solo se moverán cuando haya una reutilización real.

### 5.2. Integración con la API

El frontend consumirá los endpoints existentes mediante **Fetch API**, con tipos TypeScript alineados con los JSON que devuelve la API. Los contratos reales del backend serán la referencia; **no se inventarán endpoints ni propiedades** a partir del HTML de Stitch.

Se priorizarán:

- Estado local para formularios, filtros y modales.
- Un mecanismo sencillo y acotado para la sesión del usuario.
- Manejo centralizado de la URL base y de los errores HTTP comunes.
- Componentes y vistas que distingan entre presentación y acceso a datos.

No se agregarán desde el inicio Redux, un cliente HTTP alternativo ni capas genéricas sin una necesidad concreta. La estrategia para persistir la sesión JWT se decidirá considerando sus implicaciones de seguridad; **no se incluirán secretos en variables `VITE_*`**, ya que estas forman parte del bundle del navegador.

### 5.3. Google Stitch y referencia visual

**Google Stitch** se utilizará para diseñar pantallas y producir HTML/CSS estático de referencia. Los recursos exportados permanecerán en `design/stitch/`, separados de `src/`.

Claude Code los analizará para identificar layouts, patrones visuales y posibles componentes reutilizables, pero el código React final deberá:

- Respetar el diseño sin copiar indiscriminadamente el HTML estático.
- Utilizar los componentes disponibles de **shadcn/ui** cuando sean adecuados.
- Adaptarse a los datos, estados y reglas reales de la API.
- Mantener accesibilidad y comportamiento responsive.

### 5.4. Desarrollo asistido por IA: SDD ligero

Se utilizará **Spec-Driven Development** de forma ligera, sin adoptar de inicio una herramienta o proceso documental complejo.

```text
Diseño en Stitch + contrato de la API
                  ↓
            specs/<feature>/spec.md
                  ↓
       Plan técnico propuesto por Claude
                  ↓
      Revisión / aprobación humana
                  ↓
            specs/<feature>/tasks.md
                  ↓
      Implementación por tareas pequeñas
                  ↓
        Verificación y aceptación
```

El contenido de cada artefacto será distinto:

- **`spec.md`:** objetivo, alcance, comportamiento, restricciones y criterios de aceptación.
- **`tasks.md`:** secuencia de trabajo pequeña y verificable, derivada de la especificación aprobada.
- **`CLAUDE.md`:** convenciones persistentes del repositorio y límites de actuación del agente.

Se mantendrán **dos niveles de contexto**:

1. **`ProcureFlow/CLAUDE.md`**: descripción global, arquitectura, contratos, límites entre backend y frontend y reglas de cambios.
2. **`web/procureflow-web/CLAUDE.md`**: convenciones de React, TypeScript, shadcn/ui, Feature-Based Architecture y trabajo con Stitch.

No se necesita inicialmente un tercer `CLAUDE.md` para la API; las reglas generales del backend pueden documentarse en el archivo raíz y ampliarse cuando el flujo de trabajo lo requiera.

### 5.5. Fases previstas

| Fase | Entregable |
| --- | --- |
| **0. Fundación** | Inicializar React + TypeScript con Vite, configurar Tailwind, shadcn/ui, estructura y `CLAUDE.md`. |
| **1. Diseño visual** | Definir referencias Stitch, layout, estilos base y navegación. |
| **2. Autenticación** | Login, sesión y rutas protegidas. |
| **3. Dashboard** | Estructura principal y visualización de información. |
| **4. Solicitudes** | Listado, detalle, borradores, partidas, envío y cancelación. |
| **5. Aprobaciones** | Bandeja de pendientes, aprobar y rechazar. |
| **6. Administración** | Interfaces esenciales para usuarios y departamentos. |
| **7. Validación** | Integración con API, comportamiento responsive, revisión visual y build. |

---

## 6. Pruebas automatizadas del backend

El backend concentra sus pruebas en **un único proyecto `ProcureFlow.Tests`**, organizado por carpetas según el nivel probado:

| Tipo | Qué valida | Herramientas |
| --- | --- | --- |
| **Domain** | Invariantes del agregado y transiciones sin infraestructura. | xUnit |
| **Application** | Casos de uso, ownership, permisos y consultas con dependencias controladas. | xUnit, SQLite In-Memory, fakes |
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

Integration
  Login válido → JWT
  Sin token → 401
  Requester autenticado → Create Draft
  Create → AddItem → Submit
  Requester intenta aprobar → 403
  Aprobador autorizado / departamento no permitido
```

Las pruebas de integración utilizan **SQLite en memoria** para reemplazar PostgreSQL durante la ejecución; esto permite verificar el recorrido HTTP sin modificar la base de datos de desarrollo. SQLite no sustituye completamente a PostgreSQL en la validación de comportamientos específicos de proveedor.

Ejecutar desde la raíz del repositorio:

```bash
dotnet test
```

---

## 7. Configuración y ejecución del backend

### Requisitos

- **.NET 10 SDK**.
- **PostgreSQL** para ejecutar la aplicación en desarrollo.
- Herramienta **`dotnet-ef`** para trabajar con migraciones (opcional si no vas a administrarlas).

### 7.1. Configurar PostgreSQL

Definir `ConnectionStrings:DefaultConnection` mediante una variable de entorno o secretos de desarrollo.

**PowerShell (Windows):**

```powershell
$Env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=procureflow;Username=postgres;Password=YOUR_PASSWORD"
```

**Linux / macOS:**

```bash
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=procureflow;Username=postgres;Password=YOUR_PASSWORD"
```

### 7.2. Configurar JWT

Además de los valores de emisor, audiencia y expiración, configura una **clave secreta robusta** mediante una fuente segura.

**PowerShell:**

```powershell
$Env:Jwt__Issuer="ProcureFlow.Api"
$Env:Jwt__Audience="ProcureFlow.Web"
$Env:Jwt__SecretKey="REPLACE_WITH_A_LONG_RANDOM_SECRET"
$Env:Jwt__ExpirationMinutes="60"
```

Los separadores `__` de las variables de entorno corresponden a secciones de configuración de ASP.NET Core, por ejemplo `Jwt__SecretKey` → `Jwt:SecretKey`.

> **Seguridad:** no subas a Git contraseñas reales, claves JWT, archivos `.env` con secretos ni connection strings sensibles.

### 7.3. Compilar y ejecutar

Desde la raíz del repositorio:

```bash
dotnet restore
dotnet build
dotnet run --project ProcureFlow.Api
```

### 7.4. Migraciones

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
dotnet ef migrations add MigrationName --project ProcureFlow.Infrastructure --startup-project ProcureFlow.Api --output-dir Persistence/Migrations
```

## 8. Configuración y ejecución del frontend (planificadas)

La app web aún no está terminada. Se creará con **Node.js compatible con la versión elegida de Vite** y npm.

### 8.1. Inicialización manual

Desde `ProcureFlow/web/`:

```bash
npm create vite@latest procureflow-web -- --template react-ts
cd procureflow-web
npm install
```

A continuación se configurarán **Tailwind CSS**, el alias `@/` a `src/` y **shadcn/ui**, siguiendo su guía oficial para Vite. Se agregarán únicamente los componentes necesarios para cada pantalla.

### 8.2. Variables de entorno

Ejemplo de `.env.example` (URL ilustrativa; sustituir por la dirección real de la API):

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

**No incluir secretos en `VITE_*`**. Si el frontend y la API utilizan orígenes distintos, configurar los orígenes permitidos mediante **CORS** en la API.

### 8.3. Servidor de desarrollo

Una vez creado el frontend:

```bash
cd web/procureflow-web
npm install
npm run dev
```

La verificación de compilación se realizará con:

```bash
npm run build
```

---

## 9. Recursos principales de la API

```text
/api/auth
/api/departments
/api/users
/api/purchases
```

Las operaciones están enfocadas en autenticación; administración de usuarios y departamentos; creación, consulta y modificación de solicitudes; administración de partidas; y transiciones `Submit`, `Cancel`, `Approve` y `Reject`.

Los paths HTTP concretos, verbos y DTOs deben consultarse en los controllers de la versión correspondiente antes de integrar una pantalla. **La referencia de Stitch no define el contrato de la API.**

## 10. Decisiones arquitectónicas

El proyecto prioriza **claridad, encapsulación y crecimiento gradual**:

- En el **backend** se eligió Clean Architecture pragmática, un agregado de dominio, casos de uso explícitos e `IApplicationDbContext`. No se añadieron Generic Repository, Unit of Work personalizado, MediatR, CQRS completo, Event Bus ni microservicios.
- En el **frontend** se eligió una organización por funcionalidades, con componentes base shadcn/ui y reutilización justificada por casos reales, en lugar de trasladar automáticamente la arquitectura del backend a React.
- Para **desarrollo con IA**, las especificaciones contienen los requisitos, `CLAUDE.md` contiene las reglas persistentes y las decisiones arquitectónicas permanecen sujetas a revisión humana.
- El **backend** es la fuente de verdad de reglas y permisos; el frontend ofrece la experiencia de usuario y consume los contratos publicados por la API.

## 11. Alcance y evolución

La **V1** se enfoca en autenticación, usuarios, departamentos, solicitudes con partidas y un flujo de aprobación de un nivel, acompañado de una interfaz web mínima.

Quedan fuera del MVP: proveedores, cotizaciones, órdenes de compra, presupuestos, adjuntos, notificaciones, aprobaciones multinivel, refresh tokens, OAuth/OpenID Connect y microservicios.

Una futura evolución del dominio podría ampliar el flujo:

```text
Approved → Quoted → Ordered → Received → Closed
```

con gestión de proveedores, cotizaciones y órdenes de compra. Esa evolución **no es requisito para finalizar la interfaz web de la V1**.

## 12. Objetivo técnico

ProcureFlow busca demostrar la capacidad de **analizar reglas empresariales, modelar un dominio, diseñar límites entre componentes, implementar seguridad contextual y verificar el sistema mediante pruebas**. El frontend complementará esa base con React/TypeScript, una interfaz basada en diseño y un proceso de desarrollo asistido por IA con **Spec-Driven Development y Context Engineering**.
