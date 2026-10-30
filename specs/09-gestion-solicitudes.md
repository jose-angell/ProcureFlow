# SPEC 09 — Gestión de solicitudes de compra

> **Estado:** borrador
> **Depende de:** SPEC 03, SPEC 04, SPEC 06
> **Fecha:** 2026-10-29
> **Objetivo:** Implementar la página `/purchases`, para Requester y Admin, con métricas, listado paginado y filtrable en la API, y un modal para crear y editar borradores con sus ítems, guardarlos o enviarlos a aprobación, según `design/request.html` y `design/requestModal.html`.

## Por qué existe esta spec

`/purchases` es hoy un marcador de posición. La API ya crea, edita, envía y cancela solicitudes, pero ninguna pantalla permite crearlas. `GET /api/purchases/{id}` no devuelve los ítems, así que el modal de edición no puede cargarlos. La API tampoco filtra por prioridad. Esta spec agrega esos dos cambios mínimos de backend y la página. El diseño de Stitch muestra datos que el modelo no tiene (categoría, versión "v2", "Pendiente Finanzas", orden de compra, SLA); quedan fuera.

## Alcance

**Dentro:**

- Backend: `GET /api/purchases/{id}` devuelve los ítems de la solicitud.
- Backend: `GET /api/purchases` acepta el filtro `priority`.
- Tests de Application para ambos cambios.
- `/purchases` solo para Requester y Admin. Si el rol de la sesión es Approver, la página redirige a `/dashboard` con `replace`.
- La opción "Mis solicitudes" del menú se oculta para Approver.
- Cabecera: título "Mis Solicitudes de Compra", descripción "Gestiona, consulta el estado de aprobación y da seguimiento a tus requerimientos de compra." y botón "Nueva solicitud".
- Cuatro tarjetas KPI desde `GET /api/purchases/summary`.
- Barra de filtros: búsqueda por número (se aplica con Enter), Estado, Prioridad y "Limpiar filtros". Filtros y paginación en la API.
- Tabla con columnas por rol y acciones Editar (solo `Draft`) y Cancelar (`Draft` y `Submitted`).
- Paginación: "Filas por pág." (10, 25, 50), "Anterior", página actual, "Siguiente", y pie "Mostrando a–b de N solicitudes".
- Modal crear y editar: prioridad, justificación, ítems (añadir y quitar) y total calculado.
- Botones del modal: "Cancelar", "Guardar como borrador" y "Enviar solicitud para aprobación".
- Guardado orquestado en el frontend con las llamadas existentes de la API.
- Tras guardar, enviar o cancelar: `Alert` sobre la tabla y recarga de tarjetas y tabla.

**Fuera de alcance (specs futuras):**

- "Ver detalles" (ojo) y página de detalle con historial y decisión.
- Borrado real de solicitudes. "Eliminar" del diseño se sustituye por Cancelar.
- Filtro "Categoría" (no existe en el modelo) y filtro de rango de fechas.
- Editar un ítem en línea. Para cambiarlo se quita y se añade de nuevo.
- Crear o editar solicitud e ítems en una sola petición atómica en la API.
- "Descargar reporte CSV", checkboxes y acciones en lote.
- Badge "v2", "Pendiente Finanzas", "Aprobada (OC)", textos de periodo contable y banner "Línea de tiempo de aprobación".
- Contador del menú "Mis solicitudes".
- Conectar el botón "Nueva solicitud" del dashboard (sigue deshabilitado).
- Vista de la página para Approver.
- Corregir que `GetAll` lance 500 con un `status` inválido.

## Modelo de datos

### Backend

Nuevo `ProcureFlow.Application/PurchaseRequests/Dtos/PurchaseRequestDetailDto.cs`:

```csharp
public class PurchaseRequestDetailDto : PurchaseRequestDto
{
    public List<PurchaseRequestItemDto> Items { get; set; } = new();
}
```

`PurchaseRequestUseCase.GetById` devuelve `PurchaseRequestDetailDto` con `Items` mapeados a mano (`Id`, `PurchaseRequestId`, `Description`, `Quantity`, `UnitPrice`). El controlador no cambia de ruta. El listado (`GetAll`) no cambia de DTO.

`PurchaseRequestQuery` agrega:

```csharp
public string? Priority { get; set; } // nombre del enum: Low, Medium, High, Urgent
```

En `GetAll`, si `Priority` llega, se usa `Enum.TryParse<PurchaseRequestPriority>(..., ignoreCase: true)`. Si no es válido, se lanza `DomainException("La prioridad no es válida.")` (400). Si es válido, se filtra por igualdad.

Nuevos tests en `ProcureFlow.Tests/Application/PurchaseRequestUseCaseTests.cs`:

- `GetById_ShouldReturnItems`
- `GetAll_ShouldFilterByPriority`
- `GetAll_ShouldThrowDomainException_WhenPriorityIsInvalid`

### Frontend

`src/shared/api/httpClient.ts` agrega:

```ts
// PUT sin cuerpo; no parsea la respuesta (la API responde 204). Como `patch`.
export function put(path: string, options?: GetJsonOptions): Promise<void>
```

`src/features/purchase-requests/types.ts` agrega:

```ts
// Copia PurchaseRequestItemDto.cs
export interface PurchaseRequestItem {
  id: string
  purchaseRequestId: string
  description: string
  quantity: number
  unitPrice: number
}

// Copia PurchaseRequestDetailDto.cs
export interface PurchaseRequestDetail extends PurchaseRequest {
  items: PurchaseRequestItem[]
}

// Copia CreatePurchaseRequestRequest.cs y UpdatePurchaseRequestRequest.cs
export interface PurchaseRequestBody {
  priority: PurchaseRequestPriority
  justification: string
}

// Copia CreatePurchaseRequestItemRequest.cs
export interface PurchaseRequestItemBody {
  description: string
  quantity: number
  unitPrice: number
}
```

`PurchaseRequestFilters` agrega:

```ts
/** Nombre de la prioridad: la API lo parsea como `PurchaseRequestPriority`. */
priority?: keyof typeof PurchaseRequestPriority
```

`src/features/purchase-requests/api/purchaseRequests.ts` agrega (token de `getSession()` con el `getToken()` existente):

```ts
export function getPurchaseRequest(id: string): Promise<PurchaseRequestDetail>                         // GET   /api/purchases/{id}
export function createPurchaseRequest(body: PurchaseRequestBody): Promise<PurchaseRequest>             // POST  /api/purchases
export function updatePurchaseRequest(id: string, body: PurchaseRequestBody): Promise<void>            // PUT   /api/purchases/{id}
export function addPurchaseRequestItem(id: string, body: PurchaseRequestItemBody): Promise<PurchaseRequestItem> // POST /api/purchases/{id}/add-item
export function deletePurchaseRequestItem(id: string, itemId: string): Promise<void>                   // PUT   /api/purchases/{id}/delete-item/{itemId}
export function submitPurchaseRequest(id: string): Promise<void>                                       // PATCH /api/purchases/{id}/submit
```

`getPurchaseRequests` envía `priority` si viene en los filtros.

Estado del modal (solo en el componente):

```ts
interface DraftItem {
  key: string              // clave local para React
  id: string | null        // null = aún no existe en la API
  description: string
  quantity: number
  unitPrice: number
}

interface FormState {
  requestId: string | null // null = modo crear
  requestNumber: string | null
  priority: PurchaseRequestPriority
  justification: string
  items: DraftItem[]
  removedItemIds: string[] // ítems que existen en la API y el usuario quitó
}
```

Otros cambios:

- `AppSidebar`: "Mis solicitudes" recibe `visibleTo: ['requester', 'admin']`.
- `AppLayout`: `PAGE_TITLES['/purchases']` ya es "Mis solicitudes"; no cambia.
- `router.tsx`: la ruta `purchases` ya existe; no cambia.

Archivos nuevos o reescritos:

| Archivo | Rol |
| --- | --- |
| `src/features/purchase-requests/purchaseRequestErrors.ts` | Mensajes de éxito y error. |
| `src/features/purchase-requests/components/PurchaseRequestStatsCards.tsx` | Cuatro tarjetas. Reusa `KpiCard` de `features/dashboard`. |
| `src/features/purchase-requests/components/PurchaseRequestsTable.tsx` | Filtros, tabla y paginación. |
| `src/features/purchase-requests/components/PurchaseRequestItemsEditor.tsx` | Fila "Añadir nuevo ítem", tabla de ítems y total. |
| `src/features/purchase-requests/components/PurchaseRequestFormDialog.tsx` | Modal crear y editar, y orquestación del guardado. |
| `src/features/purchase-requests/pages/PurchaseRequestsPage.tsx` | Reescrita: rol, cabecera, carga, `Alert` de resultado. |

Se reusan sin cambios: `StatusBadge`, `PriorityBadge`, `formatCurrency`, `formatDate`, `CancelRequestButton` y `cancelRequestErrors` de `features/dashboard`.

Tarjetas (desde `summary`, que la API ya filtra por rol):

| Tarjeta | Valor | Texto secundario |
| --- | --- | --- |
| Total solicitudes | `total` | "N canceladas" |
| En revisión | `submitted` | "Pendientes de aprobación" |
| Aprobadas | `approved` | "X% del total" (0% si `total` es 0) |
| Rechazadas / Borrador | `rejected + draft` | "N rechazadas • M en borrador" |

Filtros y paginación (API):

- Búsqueda: texto recortado en `requestNumber`. Se aplica con Enter, como SPEC 03.
- Estado: "Todos" y los cinco estados con las etiquetas de `StatusBadge`.
- Prioridad: "Todas" y las cuatro prioridades con las etiquetas de `PriorityBadge`.
- Cambiar búsqueda, filtros o filas por página vuelve a la página 1.
- "Limpiar filtros" vacía búsqueda, Estado y Prioridad. No cambia filas por página.
- "Anterior" deshabilitado en la página 1; "Siguiente" en la última.
- Tras guardar, enviar o cancelar se recargan tabla y tarjetas, y se conservan filtros y página.

Columnas:

| Columna | Requester | Admin | Contenido |
| --- | --- | --- | --- |
| Nº de solicitud | Sí | Sí | `requestNumber` |
| Solicitante | No | Sí | Avatar de iniciales y `requestedByName` |
| Departamento | No | Sí | `departmentName` |
| Prioridad | Sí | Sí | `PriorityBadge` |
| Estado | Sí | Sí | `StatusBadge` |
| Justificación | Sí | Sí | Texto, máximo dos líneas |
| Total | Sí | Sí | `formatCurrency(totalAmount)` |
| Fecha de creación | Sí | Sí | `formatDate(createdAt)` |
| Acciones | Sí | Sí | `Pencil` (`aria-label="Editar {requestNumber}"`) solo en `Draft`; `CancelRequestButton` en `Draft` y `Submitted` |

Modal (`PurchaseRequestFormDialog`, `Dialog` de shadcn):

| Elemento | Crear | Editar |
| --- | --- | --- |
| Título | "Nueva solicitud de compra" | "Editar solicitud" y badge "{requestNumber} (Borrador)" |
| Descripción | "Completa la justificación e introduce las partidas requeridas." | igual |
| Prioridad | Grupo de 4 opciones (Urgente, Alta, Media, Baja) con `input type="radio"` nativo; por defecto Media | valor actual |
| Justificación | `Textarea` obligatoria, mínimo 20 y máximo 1000 caracteres, contador "N/1000" | valor actual |
| Añadir ítem | Descripción (`maxLength={500}`), Cantidad (entero ≥ 1), Precio unitario (≥ 0, paso 0.01), botón "Añadir" | igual |
| Tabla de ítems | Descripción, Cant., Precio Ud., Subtotal y botón quitar (`aria-label="Quitar {description}"`) | ítems actuales |
| Contador | Badge "N artículos añadidos" | igual |
| Total | "Importe total estimado", suma de cantidad × precio | igual |
| Botones | "Cancelar", "Guardar como borrador", "Enviar solicitud para aprobación" | igual |

Reglas del modal:

- "Añadir" deshabilitado si la descripción está vacía, la cantidad no es entero ≥ 1 o el precio es < 0. Tras añadir, la fila se vacía.
- Justificación de menos de 20 caracteres: "La justificación debe tener al menos 20 caracteres." y no se envía nada.
- "Guardar como borrador" permite 0 ítems.
- "Enviar solicitud para aprobación" exige al menos un ítem y total > 0. Si no: "Agrega al menos un ítem con importe mayor a cero para enviar." y no se envía nada.
- Justificación y descripciones se envían recortadas.
- Editar abre el modal, llama a `getPurchaseRequest(id)` y muestra `Skeleton` mientras carga. Si falla, `Alert` en el modal y botones de guardar deshabilitados.
- Si la solicitud cargada no está en `Draft`: "Solo se pueden editar solicitudes en borrador." y botones de guardar deshabilitados.
- Mientras guarda: "Guardando..." o "Enviando...", todos los botones deshabilitados, el modal no se cierra con Esc ni clic fuera.

Orquestación del guardado (peticiones en secuencia):

1. Si `requestId` es null: `createPurchaseRequest`. Guardar `id` y `requestNumber` en el estado; el modal pasa a modo editar.
2. Si `requestId` existía y cambió prioridad o justificación: `updatePurchaseRequest`.
3. Por cada id en `removedItemIds`: `deletePurchaseRequestItem`. Al terminar cada uno, se quita de la lista.
4. Por cada ítem con `id` null: `addPurchaseRequestItem`. Al terminar, el ítem guarda el `id` devuelto.
5. Si el botón fue "Enviar": `submitPurchaseRequest`.
6. Éxito: el modal se cierra y la página muestra el mensaje y recarga.

Si una petición falla, el modal sigue abierto con un `Alert` y conserva lo ya guardado. Reintentar solo repite los pasos pendientes y no duplica la solicitud ni los ítems. Al cerrar el modal tras un error, la página recarga tabla y tarjetas.

Mensajes (`purchaseRequestErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| Guardado como borrador | "Solicitud {requestNumber} guardada como borrador." |
| Enviada | "Solicitud {requestNumber} enviada para aprobación." |
| 400 al guardar o enviar | "Revisa los datos de la solicitud." |
| 401 | "Tu sesión expiró. Inicia sesión de nuevo." |
| 403 | "No tienes permiso para gestionar esta solicitud." |
| 404 | "La solicitud ya no existe." |
| 409 al crear | "Tu usuario o tu departamento está inactivo. No puedes crear solicitudes." |
| 5xx u otro | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Cancelar usa los mensajes de `cancelRequestErrors.ts` sin cambios.

Estados de la lista:

| Estado | Qué se ve |
| --- | --- |
| Cargando | Tarjetas y filas `Skeleton`. |
| Error de tarjetas | `Alert` en lugar de las tarjetas; la tabla sigue funcionando. |
| Error de tabla | `Alert` en lugar de la tabla. |
| Sin solicitudes | "Aún no tienes solicitudes. Crea la primera con «Nueva solicitud»." |
| Sin resultados | "Ninguna solicitud coincide con los filtros." |

## Plan de implementación

1. **Backend.** Crear `PurchaseRequestDetailDto`; `GetById` devuelve ítems. Agregar `Priority` a `PurchaseRequestQuery` y el filtro en `GetAll`. Tres tests nuevos. `dotnet build` y `dotnet test` pasan.
2. **Cliente HTTP, tipos y API.** Agregar `put` a `httpClient.ts`. Agregar tipos, `priority` en filtros y las seis funciones de API. Crear `purchaseRequestErrors.ts`. Nada los usa todavía.
3. **Página, rol y menú.** Reescribir `PurchaseRequestsPage` con redirección de Approver, cabecera y `Alert` de resultado. `visibleTo` en `AppSidebar`.
4. **Tarjetas.** Crear `PurchaseRequestStatsCards` con `KpiCard` y `getPurchaseRequestSummary`.
5. **Tabla.** Crear `PurchaseRequestsTable` con búsqueda, filtros, columnas por rol, paginación y `CancelRequestButton`. Editar aún sin efecto.
6. **Editor de ítems.** Crear `PurchaseRequestItemsEditor` (añadir, quitar, total). Sin uso todavía.
7. **Modal crear.** Crear `PurchaseRequestFormDialog` en modo crear con validaciones, los dos botones y la orquestación. Conectar "Nueva solicitud".
8. **Modal editar.** Carga con `getPurchaseRequest`, `removedItemIds`, `PUT` solo si cambió la cabecera. Conectar el lápiz.
9. **Documentación y verificación.** `web/procureflow-web/CLAUDE.md`: `/purchases` solo Requester y Admin, `put` en la lista de funciones de `httpClient`. `npm run lint`, `npm run build` y `dotnet test` pasan.

## Criterios de aceptación

- [ ] `dotnet build`, `dotnet test`, `npm run lint` y `npm run build` pasan.
- [ ] `GET /api/purchases/{id}` devuelve `items` con id, descripción, cantidad y precio.
- [ ] `GET /api/purchases?priority=High` devuelve solo solicitudes de prioridad alta; `priority=foo` responde 400.
- [ ] Como Approver, "Mis solicitudes" no aparece en el menú y abrir `/purchases` redirige a `/dashboard`.
- [ ] Como Requester, la tabla no muestra Solicitante ni Departamento. Como Admin, sí.
- [ ] Las cuatro tarjetas muestran valores de `summary` coherentes con la tabla sin filtros.
- [ ] Buscar un número y pulsar Enter filtra la tabla. Estado y Prioridad se combinan con la búsqueda.
- [ ] "Limpiar filtros" vuelve búsqueda, Estado y Prioridad a su valor inicial.
- [ ] Con 11 solicitudes y 10 filas por página hay 2 páginas; con 25 hay 1.
- [ ] El lápiz solo aparece en filas `Draft`. Cancelar solo en `Draft` y `Submitted`.
- [ ] "Nueva solicitud" abre el modal con prioridad Media, justificación vacía y sin ítems.
- [ ] Añadir dos ítems muestra "2 artículos añadidos" y el total correcto.
- [ ] Quitar un ítem actualiza contador y total.
- [ ] Justificación de 19 caracteres muestra su mensaje y no envía peticiones.
- [ ] "Enviar" sin ítems muestra su mensaje y no envía peticiones.
- [ ] "Guardar como borrador" crea la solicitud en `Draft` con sus ítems y muestra "Solicitud {requestNumber} guardada como borrador.".
- [ ] "Enviar solicitud para aprobación" deja la solicitud en `Submitted` y muestra "Solicitud {requestNumber} enviada para aprobación.".
- [ ] Todas las peticiones llevan `Authorization: Bearer <token>`; `priority` viaja numérica en el cuerpo.
- [ ] Si falla `add-item` tras crear, el modal pasa a "Editar solicitud" con el número; reintentar no crea otra solicitud ni duplica ítems.
- [ ] Editar abre el modal con prioridad, justificación e ítems actuales.
- [ ] Editar solo los ítems no envía `PUT /api/purchases/{id}`.
- [ ] Quitar un ítem existente y guardar envía `PUT .../delete-item/{itemId}`.
- [ ] Cancelar desde la tabla funciona como en SPEC 04 y recarga tarjetas y tabla.
- [ ] Con la API apagada, la página muestra "No se pudo conectar con el servidor. Intenta de nuevo.".
- [ ] Mientras guarda, los botones están deshabilitados y el modal no se cierra con Esc.
- [ ] Modal usable solo con teclado, incluido el grupo de prioridad.
- [ ] Sin scroll horizontal de página a 375px (la tabla puede desplazarse en su contenedor).
- [ ] No hay categoría, rango de fechas, CSV, checkboxes, "Ver detalles", badge "v2" ni banner de SLA.
- [ ] No hay dependencias npm nuevas.

## Decisiones

- **Sí:** guardado orquestado en el frontend con las llamadas existentes. Decisión del usuario; evita cambiar el contrato de creación.
- **No:** crear solicitud con ítems en una sola petición. Más cambio de API; queda para otra spec.
- **Sí:** al fallar tras crear, el modal pasa a modo editar. Decisión del usuario; evita borradores duplicados.
- **Sí:** ítems en `GET /api/purchases/{id}` con un DTO de detalle que hereda de `PurchaseRequestDto`. Decisión del usuario; el listado no carga ítems.
- **No:** endpoint `GET /{id}/items` separado. Una petición más sin beneficio.
- **Sí:** "Eliminar" del diseño se convierte en Cancelar, reusando `CancelRequestButton`. Decisión del usuario; la API no borra solicitudes.
- **Sí:** filtros y paginación en la API, con `priority` nuevo. Decisión del usuario; escala mejor que `pageSize=100`.
- **No:** filtro Categoría ni rango de fechas. Categoría no existe; fechas descartadas por el usuario.
- **Sí:** página solo para Requester y Admin; Approver redirigido y sin opción de menú. Decisión del usuario; Approver no puede crear ni editar.
- **No:** "Ver detalles". Decisión del usuario; va en una spec propia.
- **Sí:** "Guardar como borrador" y "Enviar solicitud para aprobación" en crear y editar. Decisión del usuario.
- **Sí:** cuatro tarjetas desde `summary` con textos sin datos inventados. Decisión del usuario.
- **Sí:** columnas por rol. Decisión del usuario; Solicitante y Departamento no aportan al Requester.
- **Sí:** justificación mínima de 20 caracteres solo en el cliente. Decisión del usuario; la API no cambia.
- **Sí:** ítems se añaden y quitan; no se editan en línea. El diseño solo muestra quitar y simplifica la orquestación (no se usa `update-item`).
- **Sí:** prioridad por defecto Media. El diseño marca una opción; Media es la neutra.
- **Sí:** `input type="radio"` nativo para la prioridad. No hay `RadioGroup` de shadcn instalado y no se agregan dependencias.
- **Sí:** `put` sin cuerpo en `httpClient`. `delete-item` es un `PUT` sin cuerpo; espeja a `patch`.
- **Sí:** reusar `KpiCard` y `CancelRequestButton` de `features/dashboard`. Ya hay precedente de una feature que importa de otra (`users` usa `departments`).
- **No:** copiar el HTML de Stitch. Se usan componentes shadcn e iconos `lucide-react`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Falla una petición a mitad del guardado | El modal conserva lo guardado y reintenta solo lo pendiente; al cerrar se recarga la lista. |
| `Update` y otros use cases lanzan `UnauthorizedException` (401) a un no dueño, lo que cierra la sesión | El Requester solo ve sus solicitudes y el Admin pasa la comprobación; corregir el tipo de excepción queda fuera. |
| Muchos ítems vuelven lento el guardado secuencial | Volumen esperado bajo; la petición atómica queda para otra spec. |
| La solicitud deja de estar en `Draft` mientras se edita | La API responde 400 y se muestra "Revisa los datos de la solicitud."; la lista se recarga al cerrar. |
| Usuario o departamento inactivo al crear | La API responde 409 y se muestra su mensaje. |
| `status` inválido en la URL de la API responde 500 | El frontend solo envía nombres válidos; corregirlo queda fuera. |

## Lo que **no** entra en esta spec

- "Ver detalles" y página de detalle.
- Borrado real de solicitudes.
- Categoría, rango de fechas, CSV, checkboxes, banner de SLA.
- Edición de ítems en línea y guardado atómico en la API.
- Vista para Approver y botón "Nueva solicitud" del dashboard.

Cada uno, si llega, va en su propia spec.
