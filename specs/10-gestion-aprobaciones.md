# SPEC 10 — Gestión de aprobaciones

> **Estado:** implementado
> **Depende de:** SPEC 05, SPEC 06, SPEC 09
> **Fecha:** 2026-10-30
> **Objetivo:** Implementar la página `/approvals`, para Approver y Admin, con KPIs, pestañas "Pendientes" e "Historial de mis decisiones" filtrables y paginadas en la API, y un modal con partidas para aprobar, rechazar o consultar una decisión, según `design/approver.html` y `design/approverModal.html`.

## Por qué existe esta spec

La opción "Aprobaciones" del menú no tiene ruta. El Approver solo decide desde el dashboard (SPEC 05), sin ver las partidas y sin historial. La API no expone la decisión (comentario, aprobador) en el DTO, no filtra por "decididas por mí" ni por id de departamento. Además, `Approve` responde 403 a un Admin fuera de su departamento, y `Reject` no. Esta spec agrega esos cambios mínimos de backend y la página. El diseño de Stitch muestra datos que el modelo no tiene (proveedor, IVA, PO, SLA, límite delegado, custodia, ERP); quedan fuera.

## Alcance

**Dentro:**

- Backend: `PurchaseRequestDto` agrega `DecidedAt`, `DecisionComment` y `DecidedByName`, en `GetAll` y `GetById`.
- Backend: `PurchaseRequestQuery` agrega `DecidedByMe` y `DepartmentId`.
- Backend: `Approve` deja de exigir el mismo departamento al Admin, igual que `Reject`.
- Tests de Application para los tres cambios.
- Ruta `/approvals` solo para Approver y Admin. Un Requester es redirigido a `/dashboard` con `replace`.
- "Aprobaciones" del menú recibe `to: '/approvals'`. `PAGE_TITLES['/approvals'] = 'Aprobaciones'`.
- Cabecera: título "Gestión de Aprobaciones", badge "Cola activa" y descripción "Revisa, autoriza o rechaza las solicitudes de compra pendientes de tu departamento.".
- Cuatro tarjetas KPI desde `GET /api/purchases/summary`.
- Pestañas "Pendientes" (con contador `summary.submitted`) e "Historial de mis decisiones" (sin contador).
- Filtros: búsqueda por número (Enter), Prioridad, Departamento (solo Admin), Estado (solo Historial) y "Limpiar filtros". Filtros y paginación en la API.
- Tabla con columnas por pestaña. "Decidir" en Pendientes. Ojo "Ver detalles" en Historial.
- Paginación como SPEC 09: 10, 25 y 50 filas, "Anterior", página, "Siguiente" y "Mostrando a–b de N solicitudes".
- Modal `DecisionDialog` con solicitante, departamento, justificación, total, tabla de partidas y comentario. En modo decidir tiene "Cancelar", "Rechazar solicitud" y "Aprobar solicitud". En modo lectura muestra la decisión y solo "Cerrar".
- Tras decidir: `Alert` sobre la tabla y recarga de tarjetas y tabla.
- Dashboard del aprobador: "Revisar pendientes" de `DepartmentApprovals` se habilita y enlaza a `/approvals`.

**Fuera de alcance (specs futuras):**

- Aprobación en lote: checkboxes, banner de selección y "Aprobar lote seleccionado".
- Pestaña "Delegadas / En custodia" y "Gestionar sustituto temporal".
- "Mi Nivel Delegado", límite de firma, banner de gobernanza y Comité Financiero.
- "Sincronizado con ERP SAP", "Actualizado hace 2m" y "Descargar reporte".
- Filtros Importe y Orden. Orden configurable en la API.
- Proveedor, IVA, PO-Prep, SKU, adjuntos, centro de coste y "Contrato Marco".
- "Aprobadas este mes", "+14% vs mes anterior", "Tiempo medio resolución" y SLA.
- Contador en "Historial" y en el menú lateral.
- Cambiar `DecideRequestButton` del dashboard (sigue igual).
- Devolver una solicitud a borrador ("devuelve" del diseño).
- Corregir que `GetAll` responda 500 con un `status` inválido.

## Modelo de datos

### Backend

`ProcureFlow.Application/PurchaseRequests/Dtos/PurchaseRequestDto.cs` agrega:

```csharp
public DateTime? DecidedAt { get; set; }       // ApprovalDecision.DecidedAt
public string? DecisionComment { get; set; }   // ApprovalDecision.Comment
public string? DecidedByName { get; set; }     // ApprovalDecision.ApproverUser.FullName
```

Son `null` si la solicitud no tiene `ApprovalDecision`. `GetAll` los proyecta en el `Select`. `GetById` los mapea a mano, con `Include` de `ApprovalDecision` y `ApproverUser`. `PurchaseRequestDetailDto` los hereda.

`PurchaseRequestQuery` agrega:

```csharp
public bool DecidedByMe { get; set; }      // true: solo solicitudes con ApprovalDecision.ApproverUserId == usuario actual
public Guid? DepartmentId { get; set; }    // igualdad con PurchaseRequest.DepartmentId
```

Los filtros por rol de `GetAll` no cambian: el Approver sigue limitado a su departamento. El filtro `Department` por nombre se mantiene.

`Approve`: la comprobación de departamento pasa a `currentRole != UserRole.Admin && user.DepartmentId != purchaseRequest.DepartmentId`, como en `Reject`.

Nuevos tests en `ProcureFlow.Tests/Application/PurchaseRequestUseCaseTests.cs`:

- `GetAll_ShouldReturnOnlyDecidedByCurrentUser_WhenDecidedByMe`
- `GetAll_ShouldFilterByDepartmentId`
- `GetAll_ShouldMapDecisionFields`
- `GetById_ShouldMapDecisionFields`
- `Approve_ShouldAllowAdmin_FromOtherDepartment`

### Frontend

`src/features/purchase-requests/types.ts`:

```ts
// PurchaseRequest agrega (copia PurchaseRequestDto.cs)
decidedAt: string | null
decisionComment: string | null
decidedByName: string | null

// PurchaseRequestFilters agrega
decidedByMe?: boolean
departmentId?: string
```

`getPurchaseRequests` envía `decidedByMe=true` y `departmentId` si vienen en los filtros. No hay funciones de API nuevas: se reusan `getPurchaseRequests`, `getPurchaseRequestSummary`, `getPurchaseRequest`, `approvePurchaseRequest` y `rejectPurchaseRequest`. El select de Departamento usa `getDepartments` de `features/departments/api/departments.ts`.

Otros cambios:

- `AppSidebar`: "Aprobaciones" recibe `to: '/approvals'`. `visibleTo` no cambia.
- `AppLayout`: `PAGE_TITLES['/approvals'] = 'Aprobaciones'`.
- `router.tsx`: ruta `approvals` dentro de `ProtectedRoute`.
- `DepartmentApprovals`: "Revisar pendientes" pasa a `Link` a `/approvals`.

Archivos nuevos:

| Archivo | Rol |
| --- | --- |
| `src/features/approvals/pages/ApprovalsPage.tsx` | Rol, cabecera, carga de `summary`, pestañas y `Alert` de resultado. |
| `src/features/approvals/components/ApprovalStatsCards.tsx` | Cuatro tarjetas. Reusa `KpiCard`. |
| `src/features/approvals/components/ApprovalsTable.tsx` | Filtros, tabla por pestaña y paginación. |
| `src/features/approvals/components/DecisionDialog.tsx` | Modal decidir y modo lectura. |

Se reusan sin cambios: `KpiCard`, `BlockError`, `decisionErrors.ts` y `isSessionError` de `features/dashboard`. `StatusBadge`, `PriorityBadge`, `formatCurrency` y `formatDate` de `features/purchase-requests`.

Tarjetas (desde `summary`; para Approver es su departamento, para Admin es todo):

| Tarjeta | Valor | Texto secundario |
| --- | --- | --- |
| Pendientes de mi firma | `submitted` | "Esperan tu decisión" |
| Aprobadas | `approved` | "X% del total" (0% si `total` es 0) |
| Rechazadas | `rejected` | "N canceladas" (`cancelled`) |
| Importe gestionado | `formatCurrency(totalAmount)` | "N solicitudes en total" |

Pestañas:

- Botones nativos con `role="tablist"`, `role="tab"` y `aria-selected`. Por defecto "Pendientes".
- "Pendientes" consulta `status=Submitted`.
- "Historial de mis decisiones" consulta `decidedByMe=true`, con Estado opcional "Todos", "Aprobada" o "Rechazada".
- Cambiar de pestaña vacía los filtros y vuelve a la página 1.

Filtros (API):

- Búsqueda: texto recortado en `requestNumber`. Se aplica con Enter.
- Prioridad: "Todas" y las cuatro prioridades con las etiquetas de `PriorityBadge`.
- Departamento (solo Admin): "Todos" y los departamentos de `getDepartments`. Envía `departmentId`. Si la carga falla, el select se deshabilita y la tabla sigue funcionando.
- Cambiar búsqueda, filtros o filas por página vuelve a la página 1.
- "Limpiar filtros" vacía búsqueda, Prioridad, Departamento y Estado. No cambia filas por página.
- Tras decidir se recargan tabla y tarjetas, y se conservan filtros y página.

Columnas:

| Columna | Pendientes | Historial | Contenido |
| --- | --- | --- | --- |
| Nº de solicitud | Sí | Sí | `requestNumber` |
| Solicitante / Dpto. | Sí | Sí | Avatar de iniciales, `requestedByName` y `departmentName` |
| Justificación | Sí | Sí | Texto en una línea y badge "N partidas" (`itemsCount`) |
| Importe total | Sí | Sí | `formatCurrency(totalAmount)` |
| Fecha de creación | Sí | No | `formatDate(createdAt)` |
| Estado / Fecha de decisión | No | Sí | `StatusBadge` y `formatDate(decidedAt)` |
| Prioridad | Sí | Sí | `PriorityBadge` |
| Comentarios | No | Sí | `decisionComment`, máximo dos líneas; "—" si es null |
| Acciones | "Decidir" | Ojo (`aria-label="Ver detalles de {requestNumber}"`) | Abre `DecisionDialog` |

Modal (`DecisionDialog`, `Dialog` de shadcn):

| Elemento | Decidir | Lectura |
| --- | --- | --- |
| Título | "Decisión de solicitud de compra" | "Detalle de la decisión" |
| Badges | `requestNumber` y `PriorityBadge` | `requestNumber` y `StatusBadge` |
| Descripción | "Revisa los detalles de la solicitud y las partidas antes de registrar tu decisión." | igual |
| Resumen | Solicitante, Departamento, Justificación e "Importe total" | igual |
| Partidas | Tabla Descripción, Cantidad, Precio Ud. y Subtotal; pie "Total" | igual |
| Título de partidas | "Partidas incluidas (N partidas)" | igual |
| Comentario | `Textarea` "Comentarios de la decisión", `maxLength={1000}`, ayuda "Obligatorio si se rechaza • Opcional si se aprueba" | "Decidida por {decidedByName} el {formatDate(decidedAt)}" y el comentario, o "Sin comentario." |
| Botones | "Cancelar", "Rechazar solicitud" (destructive) y "Aprobar solicitud" | "Cerrar" |

Reglas del modal:

- Al abrir llama a `getPurchaseRequest(id)` y muestra `Skeleton` mientras carga. Si falla, `Alert` con `getDecisionErrorMessage` y botones de decisión deshabilitados.
- En modo decidir, si la solicitud cargada no está en `Submitted`: "La solicitud ya no está pendiente de decisión." y botones de decisión deshabilitados.
- "Rechazar solicitud" deshabilitado si el comentario está vacío o tiene solo espacios.
- El comentario se envía recortado. Al aprobar, un comentario vacío se envía como `null`.
- Mientras decide: "Aprobando..." o "Rechazando...", todos los botones deshabilitados, y el modal no se cierra con Esc ni clic fuera.
- Éxito: el modal se cierra, la página muestra `getDecisionSuccessMessage` y recarga.
- Error: el modal se cierra, la página muestra `getDecisionErrorMessage` (con enlace a `/login` si `isSessionError`) y recarga.

Estados de la lista:

| Estado | Qué se ve |
| --- | --- |
| Cargando | Tarjetas y filas `Skeleton`. |
| Error de tarjetas | `BlockError` en lugar de las tarjetas; la tabla sigue funcionando. |
| Error de tabla | `Alert` en lugar de la tabla. |
| Pendientes vacía | "No tienes solicitudes pendientes de decisión." |
| Historial vacío | "Aún no has decidido ninguna solicitud." |
| Sin resultados | "Ninguna solicitud coincide con los filtros." |

## Plan de implementación

1. **Backend: decisión en el DTO.** Agregar los tres campos a `PurchaseRequestDto` y mapearlos en `GetAll` y `GetById`. Tests `GetAll_ShouldMapDecisionFields` y `GetById_ShouldMapDecisionFields`. `dotnet test` pasa.
2. **Backend: filtros.** Agregar `DecidedByMe` y `DepartmentId` a `PurchaseRequestQuery` y a `GetAll`. Dos tests. `dotnet test` pasa.
3. **Backend: Approve para Admin.** Cambiar la comprobación de departamento. Test `Approve_ShouldAllowAdmin_FromOtherDepartment`. `dotnet test` pasa.
4. **Tipos y API frontend.** Campos nuevos en `PurchaseRequest` y `PurchaseRequestFilters`. `getPurchaseRequests` envía `decidedByMe` y `departmentId`. `npm run build` pasa.
5. **Ruta, menú y página.** Crear `ApprovalsPage` con redirección del Requester, cabecera y pestañas vacías. Ruta en `router.tsx`, `to` en `AppSidebar` y `PAGE_TITLES`.
6. **Tarjetas.** Crear `ApprovalStatsCards` con `KpiCard` y `summary`. Contador de "Pendientes" desde el mismo `summary`.
7. **Tabla.** Crear `ApprovalsTable` con filtros, columnas por pestaña y paginación. "Decidir" y el ojo aún sin efecto.
8. **Modal decidir.** Crear `DecisionDialog` en modo decidir con carga de partidas, comentario y llamadas a `approve` y `reject`. Conectar "Decidir" y el `Alert` de resultado.
9. **Modal lectura.** Modo lectura con la decisión. Conectar el ojo del Historial.
10. **Dashboard.** "Revisar pendientes" pasa a `Link` a `/approvals`.
11. **Documentación.** `web/procureflow-web/CLAUDE.md`: `/approvals` solo para Approver y Admin. `npm run lint`, `npm run build` y `dotnet test` pasan.

## Criterios de aceptación

- [x] `dotnet build`, `dotnet test`, `npm run lint` y `npm run build` pasan.
- [x] `GET /api/purchases` y `GET /api/purchases/{id}` devuelven `decidedAt`, `decisionComment` y `decidedByName`; son `null` sin decisión.
- [x] `GET /api/purchases?decidedByMe=true` devuelve solo solicitudes decididas por el usuario actual.
- [x] `GET /api/purchases?departmentId={id}` devuelve solo solicitudes de ese departamento.
- [x] Un Admin aprueba una solicitud de otro departamento y la API responde 204.
- [x] Como Requester, abrir `/approvals` redirige a `/dashboard` y "Aprobaciones" no aparece en el menú.
- [x] Como Approver y como Admin, "Aprobaciones" del menú abre `/approvals` y se marca activa.
- [x] Las cuatro tarjetas muestran valores de `summary`; el contador de "Pendientes" coincide con "Pendientes de mi firma".
- [x] "Pendientes" solo muestra solicitudes `Submitted`. Como Approver, solo de su departamento.
- [x] "Historial de mis decisiones" solo muestra solicitudes decididas por el usuario, con estado, fecha de decisión y comentario.
- [x] Buscar un número con Enter filtra la tabla, y Prioridad se combina con la búsqueda.
- [x] El select Departamento solo aparece para Admin y filtra por `departmentId`.
- [x] Estado solo aparece en Historial y filtra entre Aprobada y Rechazada.
- [x] "Limpiar filtros" y cambiar de pestaña vuelven los filtros a su valor inicial.
- [x] Con 11 pendientes y 10 filas hay 2 páginas; con 25 filas hay 1.
- [x] "Decidir" abre el modal con solicitante, departamento, justificación, total y las partidas con su subtotal.
- [x] "Rechazar solicitud" está deshabilitado con el comentario vacío o solo con espacios. "Aprobar solicitud" está habilitado sin comentario.
- [x] El comentario no acepta más de 1000 caracteres.
- [x] Aprobar envía `PATCH /api/purchases/{id}/approve` con `Authorization: Bearer <token>` y `{"comments":null}` o el comentario recortado.
- [x] Tras aprobar se ve "Solicitud {número} aprobada.", la fila sale de "Pendientes" y aparece en "Historial".
- [x] Tras rechazar se ve "Solicitud {número} rechazada." y el comentario aparece en "Historial".
- [x] Si la solicitud ya se decidió en otra pestaña, se ve "La solicitud ya no está pendiente de decisión." y se recarga.
- [x] El ojo de Historial abre el modal sin botones de decisión, con "Decidida por {nombre} el {fecha}" y el comentario.
- [x] Mientras decide, los botones están deshabilitados y el modal no se cierra con Esc.
- [x] Con la API apagada, la página muestra "No se pudo conectar con el servidor. Intenta de nuevo.".
- [x] "Revisar pendientes" del dashboard del aprobador lleva a `/approvals`.
- [x] El dashboard del aprobador y su botón "Decidir" funcionan como en SPEC 05.
- [x] Pestañas y modal usables solo con teclado.
- [x] Sin scroll horizontal de página a 375px (la tabla puede desplazarse en su contenedor).
- [x] No hay checkboxes, lote, "Delegadas", límite delegado, ERP, CSV, filtros Importe ni Orden.
- [x] No hay dependencias npm nuevas.

## Decisiones

- **Sí:** pestañas "Pendientes" e "Historial de mis decisiones". Decisión del usuario.
- **No:** "Delegadas / En custodia". No existe en el modelo.
- **Sí:** historial con el filtro `decidedByMe` en `GET /api/purchases` y campos de decisión en el DTO. Decisión del usuario; reusa paginación y filtros.
- **No:** endpoint `my-decisions` separado. Más código y otra ruta sin beneficio.
- **No:** aprobación en lote. Decisión del usuario; va en otra spec.
- **Sí:** página para Approver y Admin, y `Approve` sin exigir departamento al Admin. Decisión del usuario; iguala `Approve` con `Reject`.
- **Sí:** modal nuevo `DecisionDialog` con partidas solo en `/approvals`; el dashboard no cambia. Decisión del usuario.
- **No:** reemplazar `DecideRequestButton`. Fuera del alcance pedido; el dashboard funciona.
- **Sí:** "Revisar pendientes" enlaza a `/approvals`. SPEC 05 lo dejó deshabilitado a la espera de esta página.
- **Sí:** cuatro tarjetas desde `summary`, con "Importe gestionado" en lugar de "Tiempo medio". Decisión del usuario; no hay datos por mes ni de tiempos.
- **Sí:** filtros Número, Prioridad y Departamento solo para Admin. Decisión del usuario; el Approver solo ve su departamento.
- **Sí:** nuevo `departmentId` con igualdad. Decisión del usuario; el filtro por nombre con `Contains` devuelve filas de más.
- **No:** filtros Importe y Orden. La API no los soporta.
- **Sí:** contador solo en "Pendientes", desde `summary.submitted`. Decisión del usuario; evita una petición extra.
- **Sí:** columnas por pestaña. Decisión del usuario; Comentarios y fecha de decisión no aplican a pendientes.
- **Sí:** ojo solo en Historial, con el mismo modal en modo lectura. Decisión del usuario.
- **Sí:** feature nueva `src/features/approvals`. La página es de otro dominio que `purchase-requests` y `dashboard`; ya hay precedente de features que importan de otras.
- **Sí:** pestañas con botones nativos y roles ARIA. No hay `Tabs` de shadcn instalado y no se agregan dependencias.
- **Sí:** reusar `decisionErrors.ts`. Mismos mensajes que SPEC 05.
- **Sí:** tras un error de decisión, el modal se cierra y la página recarga. El estado pudo cambiar, como en SPEC 05.
- **No:** copiar el HTML de Stitch. Se usan componentes shadcn e iconos `lucide-react`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Agregar campos a `PurchaseRequestDto` rompe pantallas existentes | Son campos nuevos y anulables; el frontend existente los ignora. |
| La proyección de `ApprovalDecision` falla en SQLite o Postgres | Tests de Application con SQLite cubren la proyección; EF genera un `LEFT JOIN`. |
| Un Approver que cambió de departamento pierde decisiones del historial | El filtro por departamento de `GetAll` no cambia; aceptado para esta spec. |
| La solicitud se decide o cancela entre la carga y la confirmación | La API responde 400 y se muestra "La solicitud ya no está pendiente de decisión."; la página recarga. |
| Un Admin decide solicitudes de cualquier departamento | Es el comportamiento pedido; `Reject` ya lo permitía. |
| `Reject` lanza `UnauthorizedException` (401) por rol inválido y cierra la sesión | Solo Approver y Admin llegan por `[Authorize(Roles)]`; corregirlo queda fuera. |

## Lo que **no** entra en esta spec

- Aprobación en lote y checkboxes.
- "Delegadas / En custodia", límite delegado y sustituto temporal.
- ERP, CSV, filtros Importe y Orden, SLA y métricas por mes.
- Cambios al `DecideRequestButton` del dashboard.
- Devolver una solicitud a borrador.

Cada uno, si llega, va en su propia spec.
