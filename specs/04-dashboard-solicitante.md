# SPEC 04 — Dashboard del solicitante

> **Estado:** implementado
> **Depende de:** SPEC 03
> **Fecha:** 2026-10-25
> **Objetivo:** Mostrar en `/dashboard` una versión para el rol Requester según `design/dashboardRequester.html`, con KPIs propios, importe acumulado, tabla de sus solicitudes con acción de cancelar y menú reducido.

## Por qué existe esta spec

SPEC 03 construyó un único dashboard para todos los roles. Para un Requester muestra columnas inútiles (Solicitante, Departamento) y un widget por departamento que siempre tiene una sola barra. El diseño Stitch del solicitante prioriza sus propias solicitudes y lo que puede hacer con ellas. Esta spec agrega esa variante sin cambiar el dashboard de Approver y Admin.

## Alcance

**Dentro:**

- `DashboardPage` elige la variante por rol de la sesión: Requester → `RequesterDashboard`; Approver y Admin → dashboard actual de SPEC 03 sin cambios visibles.
- Cabecera: título "Mis Solicitudes de Compra", badge "Panel Solicitante" y descripción "Consulta el estado de tus solicitudes, crea nuevas peticiones y gestiona tus borradores en tiempo real."
- Botón "Nueva solicitud" en la cabecera, deshabilitado.
- Cuatro tarjetas KPI propias (tabla en Modelo de datos), con importe acumulado.
- Tabla "Mis solicitudes recientes": columnas Número, Prioridad, Justificación, Fecha, Importe, Estado, Acciones.
- Filtros por número (Enter) y estado, "Limpiar" y paginación de 10, iguales a SPEC 03.
- Acción "Cancelar" en filas `Draft` y `Submitted`, con confirmación en `AlertDialog`.
- Tras cancelar: `Alert` inline sobre la tabla con éxito o error, y recarga de KPIs y tabla.
- Menú lateral: para Requester se ocultan Aprobaciones, Departamentos y Usuarios.
- API: `totalAmount` en `GET /api/purchases/summary`, filtrado por rol.
- `httpClient`: función para `PATCH` sin cuerpo que acepta respuesta 204.
- Test de use case para `totalAmount` por rol.

**Fuera de alcance (specs futuras):**

- Modal de creación, "Continuar a partidas" y widget "Acceso rápido: Nueva solicitud".
- Widget "Últimas actualizaciones de estado".
- Acciones "Completar partidas", "Ver estado", "Ver detalle" y "Subsanar".
- "Exportar informe".
- Filtros por prioridad y departamento, orden configurable y "Vista detallada".
- Selector de filas por página y checkboxes de selección.
- Badge "1 Urgente" (no hay conteo por prioridad).
- Contador del menú "Mis solicitudes".
- Selector de rol activo, "Acme Corp", notificaciones, buscador global, versión y "Sistema operativo".
- Cambios en el dashboard de Approver y Admin.
- Ocultar opciones del menú para Approver o Admin.
- `ProtectedRoute` real, logout y expiración del token.

## Modelo de datos

`PurchaseRequestSummaryDto` agrega:

```csharp
public decimal TotalAmount { get; set; } // suma de TotalAmount con el mismo filtro por rol que Total
```

`PurchaseRequestSummary` en `src/features/purchase-requests/types.ts` agrega:

```ts
totalAmount: number
```

Nuevo en `src/shared/api/httpClient.ts`:

```ts
// PATCH sin cuerpo; no parsea la respuesta (la API responde 204).
export function patch(path: string, options?: GetJsonOptions): Promise<void>
```

Nuevo en `src/features/purchase-requests/api/purchaseRequests.ts`:

```ts
export function cancelPurchaseRequest(id: string): Promise<void> // PATCH /api/purchases/{id}/cancel
```

`NavItem` en `AppSidebar` agrega `restricted?: true`. `AppSidebar` recibe `showRestricted: boolean`. `AppLayout` lo calcula como `getSession()?.user.role !== UserRole.Requester`; sin sesión se muestran todas.

KPIs del solicitante:

| Tarjeta | Valor | Pie (texto) | Pie (badge) |
| --- | --- | --- | --- |
| Mis solicitudes totales | `total` | "Importe acumulado" | `formatCurrency(totalAmount)` |
| Enviadas / Pendientes | `submitted` | "En revisión por aprobador" | "Enviadas" |
| Aprobadas | `approved` | "Listas para adquisición" | "N% tasa" = `round(approved / total * 100)`; "—" si `total = 0` |
| Borradores / Rechazadas | `draft + rejected` | "X borradores · Y rechazadas" | "Requiere acción" si `draft + rejected > 0`; si no, "Al día" |

Acción por fila:

| Estado | Acciones |
| --- | --- |
| Borrador, Enviada | Botón "Cancelar" |
| Aprobada, Rechazada, Cancelada | Ninguna (celda vacía) |

Diálogo de confirmación:

- Título: "¿Cancelar la solicitud {requestNumber}?"
- Descripción: "Esta acción no se puede deshacer. La solicitud pasará a estado Cancelada."
- Botones: "Volver" y "Cancelar solicitud". Mientras la petición está en curso, el segundo muestra "Cancelando..." y ambos están deshabilitados.

Mensajes tras cancelar (`src/features/dashboard/cancelRequestErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| Éxito | "Solicitud {requestNumber} cancelada." |
| Sin sesión o 401 | "Tu sesión expiró. Inicia sesión de nuevo." + enlace a `/login` |
| 400 | "La solicitud ya no se puede cancelar." |
| 403 | "No tienes permiso para cancelar esta solicitud." |
| 404 | "La solicitud ya no existe." |
| 5xx u otro status | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Estados vacíos y errores de carga: los de SPEC 03.

## Plan de implementación

1. **Importe en summary.** Agregar `TotalAmount` a `PurchaseRequestSummaryDto`. En `PurchaseRequestUseCase.GetSummary()` calcularlo sobre la misma `query` filtrada por rol: proyectar `TotalAmount` a lista y sumar en memoria. Verificar: `dotnet build` pasa.
2. **Test.** En `ProcureFlow.Tests/Application/PurchaseRequestUseCaseTests.cs`: Requester suma solo sus importes; Approver solo su departamento; Admin todas. Verificar: `dotnet test` pasa.
3. **PATCH en el cliente.** Agregar `patch(path, options)` en `httpClient.ts` (misma gestión de `NetworkError` y `ApiError`, sin `response.json()`). Agregar `cancelPurchaseRequest(id)` en `purchaseRequests.ts`, con token de `getSession()`; sin sesión lanza `ApiError(401)`. Agregar `totalAmount` al tipo.
4. **Componente shadcn.** Ejecutar `npx shadcn add alert-dialog`. No crear equivalente propio.
5. **Mensajes.** Crear `src/features/dashboard/cancelRequestErrors.ts` con `getCancelRequestErrorMessage(error)` según la tabla.
6. **Menú por rol.** Marcar Aprobaciones, Departamentos y Usuarios con `restricted: true` en `AppSidebar`. Filtrarlas cuando `showRestricted` es `false`. `AppLayout` pasa la prop.
7. **KpiCard compartida.** Mover `KpiCard` de `SummaryCards.tsx` a `src/features/dashboard/components/KpiCard.tsx`. `SummaryCards` la importa sin cambio visual.
8. **KPIs del solicitante.** Crear `src/features/dashboard/components/RequesterSummaryCards.tsx` con la tabla de KPIs, skeleton y `BlockError`.
9. **Tabla parametrizable.** `RecentRequestsTable` recibe props opcionales: `title`, `showOwnerColumns` (por defecto `true`; oculta Solicitante y Departamento si es `false`), `renderActions?: (request) => ReactNode` (agrega la columna Acciones) y `reloadKey` (forma parte de la clave de petición). Sin props se comporta como en SPEC 03.
10. **Cancelar.** Crear `src/features/dashboard/components/CancelRequestButton.tsx`: botón "Cancelar", `AlertDialog` y llamada a `cancelPurchaseRequest`. Notifica `onCancelled(requestNumber)` u `onError(error)`.
11. **Dashboard del solicitante.** Crear `src/features/dashboard/components/RequesterDashboard.tsx`: cabecera con badge y botón deshabilitado, `RequesterSummaryCards`, `Alert` de resultado y `RecentRequestsTable` con `title="Mis solicitudes recientes"`, `showOwnerColumns={false}` y `renderActions`. Mantiene `reloadKey`; tras éxito lo incrementa y recarga summary y tabla.
12. **Rama por rol.** En `DashboardPage`, si el rol de la sesión es Requester renderizar `RequesterDashboard`; si no, el contenido actual. Verificar: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `dotnet build` y `dotnet test` pasan, incluido el test nuevo.
- [x] `npm run lint` y `npm run build` pasan sin errores.
- [x] `GET /api/purchases/summary` incluye `totalAmount`; como Requester es la suma de sus solicitudes, como Approver la de su departamento y como Admin la de todas.
- [x] Como Requester, `/dashboard` muestra "Mis Solicitudes de Compra" y el badge "Panel Solicitante".
- [x] Como Approver o Admin, `/dashboard` se ve igual que en SPEC 03.
- [x] El botón "Nueva solicitud" está deshabilitado y no dispara peticiones.
- [x] Las cuatro tarjetas muestran los valores de la tabla de KPIs calculados desde `summary`.
- [x] El importe acumulado se ve con formato `14.850,00 US$`.
- [x] La tasa de aprobadas muestra "—" cuando no hay solicitudes.
- [x] La tabla del Requester no tiene columnas Solicitante ni Departamento y sí tiene Acciones.
- [x] Solo las filas Borrador y Enviada muestran el botón "Cancelar".
- [x] Pulsar "Cancelar" abre el diálogo; "Volver" o Esc lo cierran sin peticiones.
- [x] Confirmar envía `PATCH /api/purchases/{id}/cancel` con `Authorization: Bearer <token>`.
- [x] Tras éxito se ve "Solicitud {número} cancelada.", la fila pasa a Cancelada y los KPIs se actualizan.
- [x] Con la API apagada, confirmar muestra "No se pudo conectar con el servidor. Intenta de nuevo." sobre la tabla.
- [x] Como Requester no se hace ninguna petición a `pendingApprovals`.
- [x] Como Requester el menú muestra Dashboard, Mis solicitudes, Centro de ayuda y Configuración, y no muestra Aprobaciones, Departamentos ni Usuarios.
- [x] Como Approver o Admin el menú es igual que en SPEC 03.
- [x] Filtros, "Limpiar" y paginación funcionan como en SPEC 03.
- [x] No hay scroll horizontal de página a 375px (la tabla puede desplazarse en su contenedor).
- [x] No hay modal de creación, "Exportar informe", widget de acceso rápido ni widget de actualizaciones.

## Decisiones

- **Sí:** misma ruta `/dashboard` con rama por rol. Evita redirecciones y rutas duplicadas. Decisión del usuario.
- **No:** ruta nueva ni reemplazar el dashboard para todos los roles.
- **Sí:** botón "Nueva solicitud" visible y deshabilitado. Decisión del usuario; la creación va en su propia spec.
- **No:** modal de creación de borrador. No hay pantalla de partidas para continuar.
- **Sí:** acción "Cancelar" en Borrador y Enviada. Es la única acción real que la API permite hoy al Requester. Decisión del usuario.
- **No:** botones "Completar partidas", "Ver estado", "Ver detalle" y "Subsanar". No existe página de detalle ni edición.
- **Sí:** `AlertDialog` de shadcn para confirmar. Accesible y coherente con la UI. Única dependencia nueva.
- **No:** `window.confirm`. Rompe el estilo.
- **Sí:** `Alert` inline sobre la tabla para el resultado. Reusa un componente existente.
- **No:** toasts con `sonner`. Dependencia y `Toaster` global nuevos.
- **Sí:** `totalAmount` en `summary`. Una sola llamada para todos los KPIs. Decisión del usuario.
- **Sí:** `totalAmount` suma todas las solicitudes visibles, igual que `total`. Mantiene la tarjeta coherente con su número.
- **Sí:** suma en memoria. SQLite no traduce `Sum` sobre `decimal` y los tests corren en SQLite.
- **Sí:** solo badges derivables de `summary`. "1 Urgente" requiere conteo por prioridad.
- **No:** widget "Últimas actualizaciones de estado". Decisión del usuario.
- **No:** widget "Acceso rápido". Solo contendría otro botón deshabilitado.
- **Sí:** ocultar Aprobaciones, Departamentos y Usuarios al Requester. Decisión del usuario; revierte para este rol la decisión de SPEC 03.
- **Sí:** `AppSidebar` recibe `showRestricted` por prop. `shared` no importa de `features`; `AppLayout` ya lee la sesión.
- **Sí:** `RecentRequestsTable` parametrizable en lugar de una tabla nueva. Reusa filtros, carga y paginación.
- **Sí:** mismos filtros número y estado. La API no filtra por prioridad y el departamento no aplica al Requester.
- **Sí:** `patch` en `httpClient` sin parseo de respuesta. `requestJson` falla con 204.
- **No:** copiar el HTML de Stitch. Iconos `lucide-react`, igual que SPEC 01 y 03.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `Sum` sobre `decimal` falla en SQLite | Proyectar `TotalAmount` a lista y sumar en memoria. Test en SQLite lo cubre. |
| Suma en memoria escala mal con muchas solicitudes | Aceptable en MVP; mover a `Sum` en SQL cuando los tests usen Postgres. |
| La solicitud cambia de estado entre carga y confirmación | La API responde 400 y se muestra "La solicitud ya no se puede cancelar."; la tabla se recarga. |
| Rol de la sesión desactualizado respecto al token | La API sigue filtrando por el token; solo cambia la variante visual. Sesión real va en su propia spec. |
| Parametrizar `RecentRequestsTable` cambia el dashboard de SPEC 03 | Props opcionales con valores por defecto iguales al comportamiento actual; criterio de aceptación lo verifica. |

## Lo que **no** entra en esta spec

- Crear solicitudes, partidas, detalle, edición y "Subsanar".
- Widgets de acceso rápido y de actualizaciones de estado.
- Exportar, filtros por prioridad o departamento, selector de filas y checkboxes.
- Cambios en el dashboard o menú de Approver y Admin.
- Guard de rutas, logout y expiración.

Cada uno, si llega, va en su propia spec.
