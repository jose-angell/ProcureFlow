# SPEC 05 — Dashboard del aprobador

> **Estado:** implementado
> **Depende de:** SPEC 03, SPEC 04
> **Fecha:** 2026-10-25
> **Objetivo:** Mostrar en `/dashboard` una versión para el rol Approver según `design/dashboardApprover.html`, con KPIs de su departamento, tabla con acción "Decidir" (aprobar o rechazar con comentario) y widgets de aprobaciones y de solicitudes por departamento.

## Por qué existe esta spec

Hoy el Approver ve el dashboard genérico de SPEC 03, y ese dashboard no le deja decidir. La API ya expone `approve` y `reject`, pero ninguna pantalla los usa. Esta spec agrega la variante del aprobador con la única acción que su rol necesita. El dashboard de Admin no cambia.

## Alcance

**Dentro:**

- `DashboardPage` elige la variante por rol: Requester → `RequesterDashboard` (SPEC 04); Approver → `ApproverDashboard`; Admin → dashboard de SPEC 03 sin cambios.
- Cabecera: título "Gestión y Aprobación de Compras", badge "Panel Aprobador" y descripción "Supervisa las solicitudes departamentales, revisa partidas presupuestarias y autoriza compras pendientes.".
- Cuatro tarjetas KPI del departamento (tabla en Modelo de datos).
- Tabla "Solicitudes del departamento" con las columnas Número, Solicitante, Justificación, Fecha, Importe, Prioridad, Estado y Acciones.
- Filtros por número (Enter) y estado, "Limpiar" y paginación de 10, como en SPEC 03.
- Botón "Decidir" en las filas `Submitted`. Abre un `AlertDialog` con un resumen de la solicitud, el comentario y los botones "Rechazar" y "Aprobar".
- Comentario opcional al aprobar y obligatorio al rechazar, con un máximo de 1000 caracteres.
- Después de decidir: `Alert` inline sobre la tabla con el éxito o el error, y recarga de KPIs, tabla y widgets.
- Widget "Aprobaciones departamentales": conteo de pendientes, botón "Revisar pendientes" deshabilitado e importe gestionado, todo desde `summary`.
- Widget "Solicitudes por departamento" de SPEC 03, reutilizado.
- Menú lateral: para el Approver se ocultan Departamentos y Usuarios. Aprobaciones y Mis solicitudes siguen visibles.
- `httpClient`: `patchJson` para `PATCH` con cuerpo JSON y respuesta 204.
- Componente shadcn `textarea`.

**Fuera de alcance (specs futuras):**

- Widget "Últimas actualizaciones de estado" (la API no expone historial).
- Botones "Exportar informe" y "Revisión por lote", y checkboxes de selección.
- Acción de "Revisar pendientes" y la página Aprobaciones.
- "Tiempo medio", "Ver límites de gasto" y el badge "1 Urgente".
- Filtros por prioridad y departamento, orden configurable, "Vista detallada" y selector de filas.
- Acciones "Ver estado" y "Ver detalle", y la página de detalle.
- Cambios en el dashboard o el menú de Admin.
- Corregir que `Approve` exija el mismo departamento también a Admin (`Reject` no lo exige).
- `ProtectedRoute` real, logout y expiración del token.

## Modelo de datos

No hay cambios en la API.

Nuevo en `src/shared/api/httpClient.ts`:

```ts
// PATCH con cuerpo JSON; no parsea la respuesta (la API responde 204).
export function patchJson<TBody>(path: string, body: TBody, options?: GetJsonOptions): Promise<void>
```

Nuevo en `src/features/purchase-requests/types.ts`:

```ts
// Copia ProcureFlow.Application/PurchaseRequests/Dtos/DecisionRequest.cs
export interface DecisionRequest { comments: string | null }
```

Nuevo en `src/features/purchase-requests/api/purchaseRequests.ts`:

```ts
export function approvePurchaseRequest(id: string, comments: string | null): Promise<void> // PATCH /api/purchases/{id}/approve
export function rejectPurchaseRequest(id: string, comments: string): Promise<void>         // PATCH /api/purchases/{id}/reject
```

`RecentRequestsTable`: `showOwnerColumns` se reemplaza por `showRequesterColumn` y `showDepartmentColumn`, los dos con `true` por defecto. `RequesterDashboard` pasa los dos en `false`.

`AppSidebar`:

```ts
export type NavAudience = 'requester' | 'approver' | 'admin' // definido en shared, sin importar de features
interface NavItem { label; icon; to?; visibleTo?: NavAudience[] } // sin visibleTo → visible para todos
// AppSidebar recibe audience: NavAudience | null; null (sin sesión) → todas visibles
```

| Opción | `visibleTo` |
| --- | --- |
| Dashboard, Mis solicitudes, Centro de ayuda, Configuración | todos |
| Aprobaciones | `approver`, `admin` |
| Departamentos, Usuarios | `admin` |

`AppLayout` traduce `UserRole` a `NavAudience`. `restricted` y `showRestricted` desaparecen.

KPIs del aprobador (`summary`, ya filtrado por departamento):

| Tarjeta | Valor | Pie (texto) | Pie (badge) |
| --- | --- | --- | --- |
| Solicitudes del departamento | `total` | "Importe acumulado" | `formatCurrency(totalAmount)` |
| Pendientes de decisión | `submitted` | "Esperan tu revisión" | "Enviadas" |
| Aprobadas | `approved` | "Listas para adquisición" | "N% tasa" = `round(approved / total * 100)`; "—" si `total = 0` |
| Rechazadas / Canceladas | `rejected + cancelled` | "X rechazadas · Y canceladas" | "Cerradas" |

Widget "Aprobaciones departamentales":

- Badge "N pendientes" con `submitted`. Se oculta si es 0.
- Texto: "Tienes N solicitudes enviadas esperando tu decisión." Si `submitted = 0`: "No tienes solicitudes pendientes de decisión.".
- Botón "Revisar pendientes" deshabilitado.
- Pie: "Importe gestionado: {formatCurrency(totalAmount)}".
- Mientras carga muestra skeleton. Si hay error muestra `BlockError`.

Acción por fila:

| Estado | Acciones |
| --- | --- |
| Enviada | Botón "Decidir" |
| Borrador, Aprobada, Rechazada, Cancelada | Ninguna (celda vacía) |

Diálogo de decisión (`DecideRequestButton`):

- Título: "Decidir sobre la solicitud {requestNumber}".
- Descripción: solicitante, importe (`formatCurrency`) y justificación.
- `Textarea` con la etiqueta "Comentario", `maxLength={1000}` y la ayuda "Opcional al aprobar. Obligatorio al rechazar.".
- Botones: "Volver", "Rechazar" (destructive; deshabilitado si el comentario está vacío o tiene solo espacios) y "Aprobar".
- El comentario se envía recortado. Al aprobar, un comentario vacío se envía como `null`.
- Mientras la petición está en curso, el botón pulsado muestra "Aprobando..." o "Rechazando...", todos los botones están deshabilitados y el diálogo no se puede cerrar.

Mensajes después de decidir (`src/features/dashboard/decisionErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| Aprobada | "Solicitud {requestNumber} aprobada." |
| Rechazada | "Solicitud {requestNumber} rechazada." |
| Sin sesión o 401 | "Tu sesión expiró. Inicia sesión de nuevo." + enlace a `/login` |
| 400 | "La solicitud ya no está pendiente de decisión." |
| 403 | "No tienes permiso para decidir sobre esta solicitud." |
| 404 | "La solicitud ya no existe." |
| 409 | "Tu usuario está inactivo y no puede decidir solicitudes." |
| 5xx u otro status | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Los estados vacíos y los errores de carga son los de SPEC 03.

## Plan de implementación

1. **PATCH con cuerpo.** Agregar `patchJson` en `httpClient.ts`, con `Content-Type: application/json`, `Authorization` si hay token y la misma gestión de `NetworkError` y `ApiError`, sin `response.json()`. Agregar `DecisionRequest`, `approvePurchaseRequest` y `rejectPurchaseRequest` (token de `getSession()`; sin sesión lanzan `ApiError(401)`).
2. **Componente shadcn.** Ejecutar `npx shadcn add textarea`. No crear un equivalente propio.
3. **Mensajes.** Crear `src/features/dashboard/decisionErrors.ts` con `getDecisionSuccessMessage(requestNumber, decision)` y `getDecisionErrorMessage(error)` según la tabla. Reusar `isSessionError` de `dashboardErrors.ts`.
4. **Menú por audiencia.** En `AppSidebar` reemplazar `restricted`/`showRestricted` por `visibleTo`/`audience` según la tabla. `AppLayout` traduce el rol de la sesión. Verificar que el menú del Requester y el de Admin no cambian.
5. **Columnas separadas.** En `RecentRequestsTable` reemplazar `showOwnerColumns` por `showRequesterColumn` y `showDepartmentColumn`. Actualizar `RequesterDashboard`. Sin props se comporta como en SPEC 03.
6. **KPIs del aprobador.** Crear `src/features/dashboard/components/ApproverSummaryCards.tsx` sobre `KpiCard`, con skeleton y `BlockError`.
7. **Widget de aprobaciones.** Crear `src/features/dashboard/components/DepartmentApprovals.tsx` según la especificación del widget. Recibe `summary`, `isLoading` y `error`.
8. **Decidir.** Crear `src/features/dashboard/components/DecideRequestButton.tsx` con el botón "Decidir", el `AlertDialog`, el `Textarea` y las llamadas a `approve` y `reject`. Notifica `onDecided(requestNumber, 'approved' | 'rejected')` u `onError(error)`.
9. **Dashboard del aprobador.** Crear `src/features/dashboard/components/ApproverDashboard.tsx` con la cabecera y el badge, `ApproverSummaryCards`, el `Alert` de resultado, `RecentRequestsTable` (`title="Solicitudes del departamento"`, `showDepartmentColumn={false}`, `renderActions`, `reloadKey`) y una grilla de 2 columnas con `DepartmentApprovals` y `RequestsByDepartment`. Hace una sola llamada a `summary` por `reloadKey`. Después de decidir, con éxito o con error, incrementa `reloadKey`.
10. **Rama por rol.** En `DashboardPage`, si el rol de la sesión es Approver renderizar `ApproverDashboard`. Verificar: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` pasan sin errores.
- [x] Como Approver, `/dashboard` muestra "Gestión y Aprobación de Compras" y el badge "Panel Aprobador".
- [x] Como Admin, `/dashboard` se ve igual que en SPEC 03. Como Requester, igual que en SPEC 04.
- [x] Las cuatro tarjetas muestran los valores de la tabla de KPIs calculados desde `summary`. La tasa muestra "—" si no hay solicitudes.
- [x] La tabla del Approver tiene la columna Solicitante, no tiene Departamento y tiene Acciones.
- [x] Solo las filas Enviada muestran "Decidir".
- [x] "Decidir" abre el diálogo con el número, el solicitante, el importe y la justificación. "Volver" o Esc lo cierran sin hacer peticiones.
- [x] "Rechazar" está deshabilitado mientras el comentario está vacío o tiene solo espacios. "Aprobar" está habilitado sin comentario.
- [x] El `Textarea` no acepta más de 1000 caracteres.
- [x] Aprobar envía `PATCH /api/purchases/{id}/approve` con `Authorization: Bearer <token>` y el cuerpo `{"comments":null}` o con el comentario recortado.
- [x] Rechazar envía `PATCH /api/purchases/{id}/reject` con el comentario recortado.
- [x] Después de aprobar se ve "Solicitud {número} aprobada.", la fila pasa a Aprobada y se actualizan los KPIs y el widget.
- [x] Después de rechazar se ve "Solicitud {número} rechazada." y la fila pasa a Rechazada.
- [x] Si la solicitud ya fue decidida en otra pestaña, se ve "La solicitud ya no está pendiente de decisión." y la tabla se recarga.
- [x] Con la API apagada, decidir muestra "No se pudo conectar con el servidor. Intenta de nuevo.".
- [x] El widget "Aprobaciones departamentales" muestra el mismo número que la tarjeta "Pendientes de decisión", y "Revisar pendientes" está deshabilitado.
- [x] El widget "Solicitudes por departamento" se muestra con los datos de `summary`.
- [x] Como Approver no se llama a `pendingApprovals`.
- [x] Como Approver el menú muestra Dashboard, Mis solicitudes, Aprobaciones, Centro de ayuda y Configuración, y no muestra Departamentos ni Usuarios.
- [x] Como Requester el menú es igual que en SPEC 04. Como Admin, igual que en SPEC 03.
- [x] Filtros, "Limpiar" y paginación funcionan como en SPEC 03.
- [x] No hay scroll horizontal de página a 375px (la tabla puede desplazarse dentro de su contenedor).
- [x] No hay "Exportar informe", "Revisión por lote", checkboxes ni widget de actualizaciones.

## Decisiones

- **Sí:** misma ruta `/dashboard` con una rama por rol. Es el patrón de SPEC 04.
- **Sí:** el nuevo dashboard es solo para Approver; Admin sigue con SPEC 03. Decisión del usuario. Además, `Approve` responde 403 a un Admin fuera de su departamento.
- **No:** corregir ahora esa diferencia entre `Approve` y `Reject`. Es un cambio de backend con su propia spec.
- **Sí:** aprobar y rechazar desde el dashboard. Es la acción central del rol y la API ya la soporta. Decisión del usuario.
- **Sí:** un único botón "Decidir" con un diálogo que tiene los dos botones. Ocupa una sola columna y muestra el contexto antes de decidir. Decisión del usuario.
- **No:** dos botones por fila. Duplica diálogos y ensancha la tabla.
- **Sí:** comentario opcional al aprobar y obligatorio al rechazar, con un máximo de 1000. Coincide con el dominio y con `DecisionRequest`. Decisión del usuario.
- **Sí:** `AlertDialog` y `Textarea` de shadcn. `textarea` es el único componente nuevo; no hay dependencias npm nuevas.
- **Sí:** KPIs con textos de departamento. El diseño copia los textos del solicitante y el Approver no puede crear solicitudes. Decisión del usuario.
- **Sí:** el widget de aprobaciones sale de `summary`. Así no hay una llamada extra a `pendingApprovals`.
- **Sí:** "Revisar pendientes" visible y deshabilitado. Decisión del usuario; su destino es la página Aprobaciones.
- **No:** "Tiempo medio" y "Ver límites de gasto". No hay datos.
- **Sí:** reutilizar "Solicitudes por departamento". Decisión del usuario, aunque para un Approver muestre una sola barra.
- **No:** el widget "Últimas actualizaciones de estado". Necesita un endpoint de historial. Decisión del usuario.
- **No:** "Exportar informe" ni "Revisión por lote". No hay endpoint de exportación, y el lote necesita selección múltiple. Decisión del usuario.
- **Sí:** columna Solicitante sin Departamento. Al aprobador le importa quién pide; el departamento siempre es el suyo. Decisión del usuario.
- **Sí:** mantener el orden de columnas de `RecentRequestsTable` (Prioridad después de Importe). Así se reutiliza la tabla sin reordenarla para un solo rol.
- **Sí:** separar `showOwnerColumns` en dos props. Es necesario para mostrar Solicitante sin Departamento.
- **Sí:** ocultar solo Departamentos y Usuarios al Approver. Decisión del usuario; son endpoints de Admin.
- **Sí:** `visibleTo` por audiencia en lugar de `restricted`. Un booleano no expresa tres roles. `NavAudience` vive en `shared` para no importar de `features`.
- **Sí:** `patchJson` en `httpClient`. `patch` no envía cuerpo, y `approve`/`reject` exigen `[FromBody]`.
- **Sí:** recargar todo también después de un error. El estado pudo cambiar, como en SPEC 04.
- **No:** copiar el HTML de Stitch. Se usan iconos `lucide-react`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La solicitud se decide o se cancela entre la carga y la confirmación | La API responde 400; se muestra "La solicitud ya no está pendiente de decisión." y se recarga. |
| Cambiar `showOwnerColumns` o `AppSidebar` rompe SPEC 03 o SPEC 04 | Valores por defecto iguales a los actuales; los criterios de aceptación verifican los menús y tablas de los otros roles. |
| Approve con cuerpo vacío o `null` no llega a enlazar `[FromBody]` | Enviar siempre el objeto `{"comments": ...}` con `Content-Type: application/json`. |
| Rol de la sesión desactualizado respecto al token | La API valida el rol y el departamento; un 403 muestra su mensaje. La sesión real va en su propia spec. |

## Lo que **no** entra en esta spec

- Widget de actualizaciones de estado e historial de decisiones.
- Exportar, revisión por lote, checkboxes y selector de filas.
- La página Aprobaciones, la acción de "Revisar pendientes" y la página de detalle.
- Cambios en el dashboard o el menú de Admin, y la corrección de `Approve` para Admin.
- Guard de rutas, logout y expiración.

Cada uno, si llega, va en su propia spec.
