# SPEC 03 — Dashboard principal

> **Estado:** implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-24
> **Objetivo:** Construir `/dashboard` según el diseño Stitch con KPIs, solicitudes por departamento, tabla paginada de solicitudes y pendientes de decisión, leyendo datos reales de la API con el token de la sesión.

## Por qué existe esta spec

`DashboardPage` es un placeholder y `AppLayout` es una barra mínima. El frontend guarda el token pero nunca lo lee ni lo envía, así que no puede llamar a `api/purchases`. Además `GET /api/purchases` no devuelve total, nombres de solicitante ni de departamento, y no hay un endpoint de conteos. Esta spec cierra esos huecos solo en lo que el dashboard necesita.

## Alcance

**Dentro:**

- Componente global `src/shared/components/AppSidebar.tsx`, usado por `AppLayout` en todas las rutas protegidas. Usa `NavLink` de React Router y no depende de ninguna feature.
- Opciones del menú, en el orden del diseño:
  - Sección "Principal": Dashboard → `/dashboard`, Mis solicitudes → `/purchases`, Aprobaciones (sin enlace), Departamentos (sin enlace), Usuarios (sin enlace).
  - Parte inferior: Centro de ayuda (sin enlace), Configuración (sin enlace).
- Las opciones sin página se ven atenuadas, no son `<a>` ni reciben foco con Tab, y llevan `aria-disabled="true"`.
- Las opciones se definen en un arreglo `navItems: { label, icon, to? }[]`. Si una opción no tiene `to`, no lleva enlace. Para enlazar una página nueva basta con agregar `to`.
- `AppLayout` mantiene el header (breadcrumb "Inicio › Dashboard" y bloque de usuario con iniciales, nombre, rol en español y departamento, leído de la sesión) y compone `AppSidebar`. Sidebar fija en `lg` o más; bajo `lg`, el mismo componente se muestra como barra superior horizontal con desplazamiento interno (`overflow-x-auto`).
- Cabecera de página: título "Panel de Control de Compras" y descripción.
- Cuatro tarjetas KPI: Solicitudes totales, Pendientes de aprobación, Aprobadas (con tasa), Rechazadas / Canceladas (con desglose).
- Tabla de solicitudes: columnas Número, Solicitante, Departamento, Justificación, Fecha, Importe, Prioridad, Estado.
- Filtros: búsqueda por número (se aplica con Enter) y select de estado. "Limpiar" restablece ambos. Cambiar un filtro vuelve a la página 1.
- Paginación con "Mostrando X a Y de N", Anterior/Siguiente y página actual. Tamaño de página fijo de 10.
- Widget "Solicitudes por departamento": barras con conteo y porcentaje.
- Widget "En espera de tu decisión": solo lectura, hasta 5 solicitudes `Submitted`. Oculto para Requester.
- Estados de carga (skeleton), vacío y error por bloque.
- Lectura de la sesión (`getSession`) y envío de `Authorization: Bearer` en las llamadas del dashboard.
- API: `GET /api/purchases/summary` con conteos por estado y por departamento, filtrados por rol.
- API: `GET /api/purchases` devuelve respuesta paginada, ordenada por `CreatedAt` descendente, con `requestedByName` y `departmentName`.
- API: `GET /api/purchases/pendingApprovals` incluye `requestedByName` y `departmentName`.
- Tests de use case para summary, paginación y nombres.

**Fuera de alcance (specs futuras):**

- Dashboards distintos por rol.
- Botones Aprobar/Rechazar/Decidir/Editar/Ver detalle y diálogo de comentario.
- Botón "Nueva solicitud", modal de creación y "Exportar informe".
- Filtros por departamento, prioridad, solicitante o justificación.
- Selector de filas por página y checkboxes de selección.
- Selector de rol activo, "Acme Corp", notificaciones, buscador global (⌘K), badge "En directo", versión y "Sistema operativo".
- Páginas de Aprobaciones, Departamentos, Usuarios, Centro de ayuda y Configuración.
- Contadores en el menú (12 y 4 del diseño).
- Ocultar opciones del menú según el rol.
- `ProtectedRoute` real, logout, redirección automática a `/login` y expiración del token.
- Actualización en tiempo real.
- Modo oscuro.

## Modelo de datos

DTOs nuevos en la API:

```csharp
// ProcureFlow.Application/Common/PagedResult.cs
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

// ProcureFlow.Application/PurchaseRequests/Dtos/PurchaseRequestSummaryDto.cs
public class PurchaseRequestSummaryDto
{
    public int Total { get; set; }
    public int Draft { get; set; }
    public int Submitted { get; set; }
    public int Approved { get; set; }
    public int Rejected { get; set; }
    public int Cancelled { get; set; }
    public List<DepartmentRequestCountDto> ByDepartment { get; set; } = [];
}

// ProcureFlow.Application/PurchaseRequests/Dtos/DepartmentRequestCountDto.cs
public class DepartmentRequestCountDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int Count { get; set; }
}
```

`PurchaseRequestDto` agrega:

```csharp
public string RequestedByName { get; set; } = string.Empty;
public string DepartmentName { get; set; } = string.Empty;
```

Contratos del frontend en `src/features/purchase-requests/types.ts`:

```ts
// Copian ProcureFlow.Domain/Enums/PurchaseRequestStatus.cs y PurchaseRequestPriority.cs
export const PurchaseRequestStatus = { Draft: 1, Submitted: 2, Approved: 3, Rejected: 4, Cancelled: 5 } as const
export const PurchaseRequestPriority = { Low: 1, Medium: 2, High: 3, Urgent: 4 } as const

export interface PurchaseRequest {
  id: string
  requestNumber: string
  requestedByUserId: string
  requestedByName: string
  departmentId: string
  departmentName: string
  priority: PurchaseRequestPriority
  status: PurchaseRequestStatus
  justification: string
  totalAmount: number
  createdAt: string
  itemsCount: number
}

export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number }

export interface PurchaseRequestFilters {
  requestNumber?: string
  status?: keyof typeof PurchaseRequestStatus // la API parsea el nombre
  page: number
  pageSize: number
}

export interface PurchaseRequestSummary {
  total: number; draft: number; submitted: number; approved: number; rejected: number; cancelled: number
  byDepartment: { departmentId: string; departmentName: string; count: number }[]
}
```

Reglas de filtrado por rol (iguales en `GetAll`, `GetSummary` y `GetPendingApprovals`):

| Rol | Ve |
| --- | --- |
| Admin | todas |
| Approver | las de su departamento |
| Requester | las propias |

Textos de UI:

| Valor | Estado | Prioridad |
| --- | --- | --- |
| 1 | Borrador | Baja |
| 2 | Enviada | Media |
| 3 | Aprobada | Alta |
| 4 | Rechazada | Urgente |
| 5 | Cancelada | — |

Rol en el header: Admin → "Administrador", Requester → "Solicitante", Approver → "Aprobador".

KPIs:

| Tarjeta | Valor | Pie |
| --- | --- | --- |
| Solicitudes totales | `total` | "Registradas en el sistema" |
| Pendientes de aprobación | `submitted` | "Pendientes de revisión de departamento" |
| Aprobadas | `approved` | "N% tasa" = `round(approved / total * 100)`; "—" si `total = 0` |
| Rechazadas / Canceladas | `rejected + cancelled` | "X rechazadas · Y canceladas" |

Formato (`src/shared/lib/format.ts`, con `Intl`):

- Importe: `es-ES`, `USD` → `14.850,00 US$`.
- Fecha: `es-ES`, `{ day: '2-digit', month: 'short', year: 'numeric' }` → `24 oct 2026`.

Mensajes de error (`src/features/dashboard/dashboardErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| Sin sesión o 401 | "Tu sesión expiró. Inicia sesión de nuevo." + enlace a `/login` |
| 403 | "No tienes permiso para ver esta información." |
| 400 | "Revisa los filtros aplicados." |
| 5xx u otro status | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Estados vacíos:

| Bloque | Mensaje |
| --- | --- |
| Tabla sin filtros | "Aún no hay solicitudes de compra." |
| Tabla con filtros | "Ninguna solicitud coincide con los filtros." |
| Por departamento | "Sin datos por departamento." |
| En espera de tu decisión | "No tienes solicitudes pendientes de decisión." |

## Plan de implementación

1. **Nombres y paginación en la API.** Crear `Application/Common/PagedResult.cs`. Agregar `RequestedByName` y `DepartmentName` a `PurchaseRequestDto` y llenarlos en `GetAll`, `GetById` y `GetPendingApprovals` (proyección por navegación `RequestedByUser.FullName` y `Department.Name`). `GetAll` ordena por `CreatedAt` descendente, calcula `TotalCount` antes de `Skip/Take` y devuelve `PagedResult<PurchaseRequestDto>`. Verificar: `dotnet build` y `dotnet test` pasan.
2. **Summary en la API.** Crear `PurchaseRequestSummaryDto` y `DepartmentRequestCountDto`. Agregar `PurchaseRequestUseCase.GetSummary()` con el mismo filtro por rol que `GetAll`; `ByDepartment` ordenado por `Count` descendente. En `PurchaseRequestController`, `[HttpGet("summary")]` sin restricción de rol extra. Verificar: `dotnet build` pasa.
3. **Tests de use case.** En `ProcureFlow.Tests/Application/PurchaseRequestUseCaseTests.cs`: summary por rol (Requester solo propias, Approver solo su departamento, Admin todas), conteo por estado y por departamento, `GetAll` con `TotalCount` y orden descendente, y nombres en el DTO. Verificar: `dotnet test` pasa.
4. **Sesión y token.** En `features/auth/session.ts` agregar `getSession(): StoredSession | null` (lee `localStorage` y luego `sessionStorage`; JSON inválido → `null`). En `httpClient.ts`, `getJson(path, options?: { token?: string })` agrega `Authorization: Bearer` cuando hay token. `shared` no importa de `features`. Actualizar ADR-001 D3 y D6, y el `CLAUDE.md` del frontend.
5. **Contratos y llamadas.** Crear `src/features/purchase-requests/types.ts` y `src/features/purchase-requests/api/purchaseRequests.ts` con `getPurchaseRequests(filters)`, `getPurchaseRequestSummary()` y `getPendingApprovals()`. Cada una toma el token de `getSession()`; sin sesión lanza `ApiError(401)`.
6. **Formato y errores.** Crear `src/shared/lib/format.ts` (`formatCurrency`, `formatDate`) y `src/features/dashboard/dashboardErrors.ts` (`getDashboardErrorMessage(error)`) según las tablas.
7. **Componentes shadcn.** Ejecutar `npx shadcn add card table badge skeleton`. No crear equivalentes propios.
8. **Badges.** Crear `src/features/purchase-requests/components/StatusBadge.tsx` y `PriorityBadge.tsx` sobre `Badge`, con los textos de la tabla y colores del diseño.
9. **Menú lateral global.** Crear `src/shared/components/AppSidebar.tsx` con `navItems` e iconos `lucide-react` (`LayoutGrid`, `ReceiptText`, `BadgeCheck`, `Building2`, `Users`, `CircleHelp`, `Settings`). Las opciones con `to` usan `NavLink`; las que no lo tienen se renderizan como `<span aria-disabled="true">`.
10. **Layout.** Reescribir `src/shared/layouts/AppLayout.tsx` para componer `AppSidebar`, el header y `<Outlet />`. Si no hay sesión, el bloque de usuario no se muestra.
11. **KPIs y departamentos.** Crear `src/features/dashboard/components/SummaryCards.tsx` y `RequestsByDepartment.tsx`. Ambos reciben el resultado de una sola llamada a `getPurchaseRequestSummary()` hecha en la página.
12. **Tabla.** Crear `src/features/dashboard/components/RecentRequestsTable.tsx` con filtros, tabla y paginación. Hace su propia carga al cambiar filtros o página.
13. **Pendientes.** Crear `src/features/dashboard/components/PendingDecisions.tsx`. Solo se monta si el rol de la sesión no es Requester.
14. **Página.** Reescribir `src/features/dashboard/pages/DashboardPage.tsx`: cabecera y composición en grilla (KPIs 1/2/4 columnas; widgets 1/2 columnas). Sin sesión muestra solo el `Alert` de sesión y no llama a la API. Verificar: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `dotnet build` y `dotnet test` pasan, incluidos los tests nuevos.
- [x] `npm run lint` y `npm run build` pasan sin errores.
- [x] `GET /api/purchases/summary` sin token responde 401.
- [x] `GET /api/purchases/summary` como Requester cuenta solo sus solicitudes; como Approver solo las de su departamento; como Admin todas.
- [x] `GET /api/purchases?page=2&pageSize=10` devuelve `items`, `totalCount`, `page` y `pageSize`, ordenados por `createdAt` descendente.
- [x] Cada elemento de `GET /api/purchases` y `pendingApprovals` incluye `requestedByName` y `departmentName`.
- [x] Con sesión iniciada, las peticiones del dashboard llevan `Authorization: Bearer <token>` (pestaña Network).
- [x] Las tarjetas KPI muestran los mismos números que `summary`.
- [x] La tasa de aprobadas muestra "—" cuando no hay solicitudes.
- [x] La suma de los conteos de "Solicitudes por departamento" es igual al total.
- [x] La tabla muestra 10 filas como máximo y "Mostrando 1 a 10 de N".
- [x] "Anterior" está deshabilitado en la página 1 y "Siguiente" en la última.
- [x] Buscar un número existente y pulsar Enter deja solo esa solicitud.
- [x] Elegir un estado muestra solo solicitudes con ese estado y vuelve a la página 1.
- [x] "Limpiar" restablece búsqueda y estado.
- [x] Los importes se ven como `14.850,00 US$` y las fechas como `24 oct 2026`.
- [x] Como Requester no se ve el widget "En espera de tu decisión" y no se llama a `pendingApprovals`.
- [x] Como Approver el widget lista solo solicitudes `Submitted` de su departamento, sin botones de acción.
- [x] Sin sesión guardada se ve "Tu sesión expiró. Inicia sesión de nuevo." con enlace a `/login` y no hay peticiones a la API.
- [x] Con la API apagada cada bloque muestra "No se pudo conectar con el servidor. Intenta de nuevo.".
- [x] Mientras carga, cada bloque muestra skeleton.
- [x] El header muestra nombre, rol en español y departamento del usuario de la sesión.
- [x] El menú lateral es `src/shared/components/AppSidebar.tsx` y se ve también en `/purchases`.
- [x] El menú muestra Dashboard, Mis solicitudes, Aprobaciones, Departamentos, Usuarios, Centro de ayuda y Configuración.
- [x] Solo Dashboard y Mis solicitudes son enlaces; la opción de la ruta actual tiene `aria-current="page"`.
- [x] Aprobaciones, Departamentos, Usuarios, Centro de ayuda y Configuración no son enlaces, no reciben foco con Tab y tienen `aria-disabled="true"`.
- [x] Con ancho menor a 1024px la sidebar no se ve, la navegación está en la barra superior y no hay scroll horizontal de página a 375px (la tabla puede desplazarse dentro de su contenedor).
- [x] La tabla usa `<th>` con `scope="col"` y los filtros tienen `label` asociado.
- [x] No hay botones Nueva solicitud, Exportar, Aprobar, Rechazar ni Decidir, ni selector de rol, notificaciones o buscador global.

## Decisiones

- **Sí:** datos reales de la API. Un dashboard con mock no valida el contrato.
- **No:** datos mock estáticos.
- **Sí:** endpoint `GET /api/purchases/summary`. Una llamada exacta para KPIs y departamentos.
- **No:** contar en el cliente con `pageSize` grande. Escala mal y depende de un tope arbitrario.
- **Sí:** `GetAll` devuelve `PagedResult`. Permite "de N" y deshabilitar "Siguiente". Ningún test actual depende del formato anterior.
- **No:** paginación sin total.
- **Sí:** `requestedByName` y `departmentName` en `PurchaseRequestDto`. Las columnas del diseño los necesitan; evita llamadas extra a `api/users`, que es solo Admin.
- **Sí:** orden por `CreatedAt` descendente. "Recientes" no tiene sentido sin orden y hoy no hay ninguno.
- **Sí:** filtros solo por número y estado. La API ya los soporta.
- **No:** filtros por prioridad, departamento, solicitante o justificación. Requieren backend extra.
- **Sí:** tamaño de página fijo de 10. Es el valor por defecto de la API.
- **Sí:** widget de pendientes solo lectura y oculto a Requester. La API le responde 403. Las acciones necesitan diálogo de comentario y van en su propia spec.
- **Sí:** misma página para todos los roles. Solo cambia lo que la API filtra y la visibilidad del widget de pendientes.
- **Sí:** USD con formato `es-ES`. Decisión del usuario.
- **Sí:** `getJson` recibe el token por parámetro. `shared` no depende de `features`.
- **Sí:** sin sesión o 401 se muestra un `Alert` con enlace a `/login`. No borra la sesión ni redirige; guard y logout tienen su propia spec.
- **Sí:** `AppSidebar` como componente global en `src/shared/components`. Lo usa cualquier página protegida, según la regla de `shared` del `CLAUDE.md` del frontend.
- **Sí:** todas las opciones del diseño en el menú; las que no tienen página van sin enlace. Muestra la navegación final sin llevar a páginas vacías. Decisión del usuario.
- **No:** páginas placeholder para las opciones sin ruta. Agregarían rutas vacías.
- **No:** ocultar opciones por rol. La spec es la misma para todos los roles.
- **Sí:** tests de use case nuevos. El filtro por rol del summary es fácil de romper sin aviso.
- **Sí:** componentes shadcn `card`, `table`, `badge` y `skeleton`. Sin otras dependencias.
- **Sí:** iconos `lucide-react` en lugar de Material Symbols, igual que SPEC 01.
- **No:** copiar el HTML de Stitch.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `Status` inválido en la query hace que `Enum.Parse` lance y responda 500 | El frontend solo envía nombres válidos del select. Validar en la API en una spec futura. |
| `GroupBy` por departamento no traduce igual en SQLite y Postgres | Agrupar por `DepartmentId` y `Department.Name` con proyección simple; los tests corren en SQLite. |
| Token vencido muestra errores en todos los bloques | Mensaje de sesión con enlace a `/login`. El manejo global va en la spec de sesión. |
| `PurchaseRequestStatus` y `PurchaseRequestPriority` del frontend se desalinean del dominio | Comentario en `types.ts` que apunta a los enums de `ProcureFlow.Domain/Enums`. |
| Cambiar `GET /api/purchases` rompe a otros consumidores | Solo lo usa este frontend; `PurchaseRequestsPage` es placeholder. |
| No hay datos semilla para probar | Crear solicitudes con la API (Requester) y enviarlas antes de la prueba manual. |

## Lo que **no** entra en esta spec

- Acciones sobre solicitudes (aprobar, rechazar, editar, crear, exportar).
- Dashboards por rol.
- Filtros por prioridad, departamento, solicitante o justificación.
- Guard de rutas, logout, expiración y redirección automática.
- Selector de rol, notificaciones, buscador global, contadores del menú y páginas de Aprobaciones, Departamentos, Usuarios, ayuda y configuración.

Cada uno, si llega, va en su propia spec.
