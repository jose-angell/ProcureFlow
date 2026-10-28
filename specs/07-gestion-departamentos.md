# SPEC 07 — Gestión de departamentos

> **Estado:** aprobado
> **Depende de:** SPEC 03, SPEC 05, SPEC 06
> **Fecha:** 2026-10-27
> **Objetivo:** Crear la página `/departments`, solo para Admin, con el listado de departamentos y las acciones crear, editar (nombre y estado) y eliminar, según `design/department.html` y `design/departmentModa.html`.

## Por qué existe esta spec

La API ya permite gestionar departamentos, pero ninguna pantalla la usa. La opción "Departamentos" del menú está deshabilitada. El diseño de Stitch muestra campos que la API no tiene (Código, Descripción, presupuesto, aprobadores, centro de coste). Esta spec implementa solo lo que la API soporta hoy, sin cambios de backend.

## Alcance

**Dentro:**

- Ruta `/departments` dentro de `AppLayout`. Si el rol de la sesión no es Admin, la página redirige a `/dashboard` con `replace`.
- La opción "Departamentos" del menú pasa a enlazar a `/departments`. Sigue visible solo para Admin.
- Migas de la cabecera: "Inicio > Departamentos".
- Cabecera de la página: título "Gestión de Departamentos", badge "N activos" y descripción "Administra las unidades organizativas de la empresa.". Botón "Agregar departamento".
- Tabla con las columnas Nombre del departamento, Estado y Acciones. Las filas inactivas se ven atenuadas.
- Datos de `GET /api/departments`, ordenados por nombre en el cliente.
- Búsqueda por nombre en vivo, filtro de Estado (Todos, Solo activos, Solo inactivos) y botón "Limpiar". Todo en el cliente.
- Contador "Mostrando X de Y departamentos" en la barra de filtros.
- Paginación en el cliente: selector "Filas por pág." (10, 25, 50), "Anterior", página actual y "Siguiente". Pie "Mostrando a–b de N departamentos".
- Modal de crear: campo Nombre. El departamento nace Activo.
- Modal de editar: campos Nombre y Estado (Activo/Inactivo).
- Eliminar con un `AlertDialog` de confirmación.
- Errores de guardar dentro del modal, que sigue abierto. Éxito y errores de eliminar en un `Alert` sobre la tabla.
- `httpClient`: `Authorization` opcional en `postJson`, más `putJson` y `deleteRequest`.
- Componente shadcn `dialog`.
- Actualizar el `CLAUDE.md` del frontend y ADR-001 sobre `Authorization` en `postJson`.

**Fuera de alcance (specs futuras):**

- Campos Código y Descripción (requieren cambios en Domain, migración y DTOs).
- Tarjetas de métricas (no hay datos de presupuesto ni de aprobadores).
- "Exportar listado".
- Checkboxes de selección y acciones en lote.
- Filtro "Centro de Coste".
- Banner "Sincronización ERP Activa".
- Icono distinto por departamento (todos usan el mismo icono).
- Guard por rol genérico (`AdminRoute` o similar).
- Paginación, orden o búsqueda en la API.
- Página de Usuarios.
- Cambios en la API.

## Modelo de datos

No hay cambios en la API.

Nuevo `src/features/departments/types.ts`:

```ts
// Copia ProcureFlow.Application/Departments/Dtos/DepartmentDto.cs
export interface Department { id: string; name: string; isActive: boolean }

// Copia CreateDepartmentRequest.cs y UpdateDepartmentRequest.cs
export interface DepartmentNameRequest { name: string }

export type DepartmentStatusFilter = 'all' | 'active' | 'inactive'
```

Cambios en `src/shared/api/httpClient.ts`:

```ts
// options es opcional: login y registro siguen igual.
export function postJson<TBody, TResponse>(path: string, body: TBody, options?: GetJsonOptions): Promise<TResponse>

// PUT con cuerpo JSON; no parsea la respuesta (la API responde 204).
export function putJson<TBody>(path: string, body: TBody, options?: GetJsonOptions): Promise<void>

// DELETE sin cuerpo; no parsea la respuesta (la API responde 204).
export function deleteRequest(path: string, options?: GetJsonOptions): Promise<void>
```

Nuevo `src/features/departments/api/departments.ts` (token de `getSession()`; sin sesión lanza `ApiError(401)`, como `purchaseRequests.ts`):

```ts
export function getDepartments(): Promise<Department[]>                    // GET    /api/departments
export function createDepartment(name: string): Promise<Department>        // POST   /api/departments
export function updateDepartment(id: string, name: string): Promise<void>  // PUT    /api/departments/{id}
export function activateDepartment(id: string): Promise<void>              // PATCH  /api/departments/{id}/activate
export function deactivateDepartment(id: string): Promise<void>            // PATCH  /api/departments/{id}/deactivate
export function deleteDepartment(id: string): Promise<void>                // DELETE /api/departments/{id}
```

`features/auth/api/departments.ts` (departamentos activos del registro) no cambia.

Otros cambios:

- `AppSidebar`: "Departamentos" recibe `to: '/departments'`.
- `AppLayout`: `PAGE_TITLES['/departments'] = 'Departamentos'`.
- `router.tsx`: `{ path: 'departments', element: <DepartmentsPage /> }` dentro de `AppLayout`.

Nuevos archivos:

| Archivo | Rol |
| --- | --- |
| `src/components/ui/dialog.tsx` | Generado con `npx shadcn add dialog`. |
| `src/features/departments/types.ts` | Tipos de la tabla anterior. |
| `src/features/departments/api/departments.ts` | Llamadas a la API. |
| `src/features/departments/departmentErrors.ts` | Mensajes de éxito y error. |
| `src/features/departments/components/DepartmentFormDialog.tsx` | Modal de crear y editar. |
| `src/features/departments/components/DeleteDepartmentButton.tsx` | Botón papelera y `AlertDialog`. |
| `src/features/departments/components/DepartmentsTable.tsx` | Filtros, tabla y paginación. |
| `src/features/departments/pages/DepartmentsPage.tsx` | Página, rol, carga y `Alert` de resultado. |

Filtros y paginación (en el cliente):

- La búsqueda compara el texto recortado con el nombre, sin distinguir mayúsculas ni tildes (`normalize('NFD')`).
- Cambiar la búsqueda, el estado o las filas por página vuelve a la página 1.
- "Limpiar" vacía la búsqueda y pone el estado en Todos. No cambia las filas por página.
- "Anterior" está deshabilitado en la página 1. "Siguiente" está deshabilitado en la última.
- Después de crear, editar o eliminar se recarga la lista y se conservan los filtros.

Fila:

| Columna | Contenido |
| --- | --- |
| Nombre del departamento | Icono `Building2` y nombre. |
| Estado | `Badge` "Activo" o "Inactivo". |
| Acciones | Botón icono `Pencil` (`aria-label="Editar {name}"`) y botón icono `Trash2` (`aria-label="Eliminar {name}"`). |

Modal (`DepartmentFormDialog`, `Dialog` de shadcn):

| Elemento | Crear | Editar |
| --- | --- | --- |
| Título | "Crear nuevo departamento" | "Editar departamento" |
| Descripción | "Registra una nueva unidad organizativa de la empresa." | "Actualiza el nombre o el estado del departamento." |
| Nombre | `Input` vacío, obligatorio, `maxLength={100}` | `Input` con el nombre actual |
| Estado | No se muestra | `Select` Activo/Inactivo con el estado actual |
| Botones | "Cancelar" y "Guardar departamento" | "Cancelar" y "Guardar departamento" |

- El nombre se envía recortado.
- "Guardar departamento" está deshabilitado si el nombre recortado está vacío. En editar, también si nada cambió.
- Editar envía `PUT` solo si el nombre cambió. Después envía `activate` o `deactivate` solo si el estado cambió.
- Mientras guarda, el botón muestra "Guardando...", los dos botones están deshabilitados y el modal no se puede cerrar.
- Si una petición falla, el modal muestra el error en un `Alert` y sigue abierto. Al cerrar el modal después de un error, la lista se recarga.

Eliminar (`DeleteDepartmentButton`, `AlertDialog`):

- Título: "¿Eliminar el departamento {name}?".
- Descripción: "Esta acción no se puede deshacer.".
- Botones: "Cancelar" y "Eliminar" (destructive). Mientras elimina: "Eliminando..." y botones deshabilitados.

Mensajes (`departmentErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| Creado | "Departamento {name} creado." |
| Actualizado | "Departamento {name} actualizado." |
| Eliminado | "Departamento {name} eliminado." |
| 409 al crear o cambiar el nombre | "Ya existe un departamento con ese nombre." |
| 409 al desactivar | "No se puede desactivar un departamento con usuarios asociados." |
| 409 al eliminar | "No se puede eliminar un departamento con usuarios asociados." |
| 400 al guardar | "Revisa el nombre del departamento." |
| 401 | "Tu sesión expiró. Inicia sesión de nuevo." |
| 403 | "No tienes permiso para gestionar departamentos." |
| 404 | "El departamento ya no existe." |
| 5xx u otro status | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Estados de la lista:

| Estado | Qué se ve |
| --- | --- |
| Cargando | Filas `Skeleton` en la tabla. |
| Error de carga | `Alert` con el mensaje de la tabla anterior, en lugar de la tabla. |
| Sin departamentos | "No hay departamentos registrados." |
| Sin resultados con filtros | "Ningún departamento coincide con los filtros." |

## Plan de implementación

1. **httpClient.** Agregar `options` opcional a `postJson` (envía `Authorization` si hay token). Agregar `putJson` y `deleteRequest` con la misma gestión de `NetworkError` y `ApiError`. Login y registro no cambian. `npm run build` pasa.
2. **Componente shadcn.** Ejecutar `npx shadcn add dialog`. No crear un equivalente propio.
3. **Tipos, API y mensajes.** Crear `types.ts`, `api/departments.ts` y `departmentErrors.ts` según el modelo de datos. Nada los usa todavía.
4. **Página y ruta.** Crear `DepartmentsPage` con la redirección por rol, la cabecera, la carga con `getDepartments()` y los estados de la lista. Agregar la ruta en `router.tsx`, el `to` en `AppSidebar` y el título en `AppLayout`.
5. **Tabla.** Crear `DepartmentsTable` con búsqueda, filtro de estado, "Limpiar", contador, filas y paginación. Las acciones de la fila todavía no hacen nada.
6. **Eliminar.** Crear `DeleteDepartmentButton`. Notifica `onDeleted(name)` u `onError(error)`. La página muestra el `Alert` y recarga la lista.
7. **Crear y editar.** Crear `DepartmentFormDialog` en modo crear y editar. Conectar "Agregar departamento" y el botón Editar de la fila. Al guardar con éxito cierra el modal, muestra el `Alert` de éxito y recarga.
8. **Documentación.** `web/procureflow-web/CLAUDE.md`: `postJson` acepta `token`; agregar `putJson` y `deleteRequest`. ADR-001: quitar `Authorization` en `postJson` de la lista Pendiente. Verificar: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] Como Admin, el menú "Departamentos" está habilitado y lleva a `/departments`.
- [ ] Como Requester o Approver, abrir `/departments` por URL redirige a `/dashboard`.
- [ ] Las migas muestran "Inicio > Departamentos".
- [ ] La página muestra "Gestión de Departamentos" y el badge con el número de departamentos activos.
- [ ] La tabla lista todos los departamentos de `GET /api/departments` ordenados por nombre.
- [ ] Los departamentos inactivos muestran el badge "Inactivo" y la fila atenuada.
- [ ] Escribir "tecnologia" encuentra "Tecnología".
- [ ] El filtro "Solo inactivos" muestra solo departamentos inactivos, y el contador se actualiza.
- [ ] "Limpiar" vacía la búsqueda y vuelve el estado a Todos.
- [ ] Con más de 10 departamentos hay 2 páginas; con 25 filas por página hay 1.
- [ ] "Agregar departamento" abre el modal "Crear nuevo departamento" sin el campo Estado.
- [ ] Crear envía `POST /api/departments` con `Authorization: Bearer <token>` y el cuerpo `{"name":"..."}` recortado.
- [ ] Después de crear se ve "Departamento {name} creado." y el departamento aparece Activo en la tabla.
- [ ] Crear con un nombre existente muestra "Ya existe un departamento con ese nombre." dentro del modal, y el modal sigue abierto.
- [ ] El campo Nombre no acepta más de 100 caracteres. Con nombre vacío o solo espacios, "Guardar departamento" está deshabilitado.
- [ ] Editar abre el modal con el nombre y el estado actuales.
- [ ] Editar solo el nombre envía `PUT` y ningún `PATCH`. Editar solo el estado envía un `PATCH` y ningún `PUT`.
- [ ] Desactivar un departamento con usuarios muestra "No se puede desactivar un departamento con usuarios asociados." en el modal.
- [ ] La papelera abre "¿Eliminar el departamento {name}?". "Cancelar" o Esc lo cierran sin peticiones.
- [ ] Eliminar un departamento sin usuarios envía `DELETE`, muestra "Departamento {name} eliminado." y lo quita de la tabla.
- [ ] Eliminar un departamento con usuarios muestra "No se puede eliminar un departamento con usuarios asociados." sobre la tabla.
- [ ] Con la API apagada, cargar la página muestra "No se pudo conectar con el servidor. Intenta de nuevo.".
- [ ] Mientras guarda o elimina, los botones están deshabilitados y el diálogo no se cierra con Esc.
- [ ] El modal y el `AlertDialog` se pueden usar solo con teclado.
- [ ] Login y registro siguen funcionando igual (`postJson` sin token).
- [ ] No hay scroll horizontal de página a 375px (la tabla puede desplazarse dentro de su contenedor).
- [ ] No hay Código, Descripción, tarjetas de métricas, "Exportar listado", checkboxes, filtro de Centro de Coste ni banner ERP.
- [ ] No hay dependencias npm nuevas aparte de los archivos generados por shadcn.

## Decisiones

- **Sí:** solo frontend, con Nombre y Estado. Código y Descripción no existen en la API. Decisión del usuario.
- **No:** columnas Código y Descripción con "—". Muestran campos vacíos que nadie puede llenar.
- **Sí:** Estado en el modal de editar, con `activate`/`deactivate`. Es lo que muestra el diseño. Decisión del usuario.
- **No:** Estado en el modal de crear. La API crea siempre Activo y dos peticiones podrían dejar un estado a medias. Decisión del usuario.
- **Sí:** eliminar con confirmación. `DELETE` es irreversible. Decisión del usuario.
- **No:** tarjetas de métricas. No hay datos de presupuesto ni de aprobadores. Decisión del usuario.
- **Sí:** redirigir a `/dashboard` desde la página si el rol no es Admin. Decisión del usuario; la API sigue siendo la autoridad (403).
- **No:** guard por rol genérico. Hoy solo lo necesita esta página.
- **Sí:** búsqueda, filtro, orden y paginación en el cliente. `GET /api/departments` devuelve todo y los departamentos son pocos. Decisión del usuario.
- **Sí:** selector de filas 10/25/50. Decisión del usuario.
- **No:** filtro de Centro de Coste, checkboxes, banner ERP y "Exportar listado". No hay datos ni endpoints. Decisión del usuario.
- **Sí:** errores de guardar dentro del modal. El usuario corrige el nombre sin volver a escribirlo. Decisión del usuario.
- **Sí:** éxito y errores de eliminar en un `Alert` sobre la tabla, como en SPEC 05.
- **Sí:** mensajes de 409 por operación. El mismo status significa cosas distintas en crear, desactivar y eliminar.
- **Sí:** `Authorization` opcional en `postJson`. `POST /api/departments` exige Admin. Estaba fuera de alcance en SPEC 06.
- **Sí:** `Dialog` de shadcn para el modal. Un formulario no es una confirmación (`AlertDialog`).
- **Sí:** feature nueva `features/departments`. `features/auth/api/departments.ts` sirve al registro y no se mezcla.
- **Sí:** descripción de la cabecera sin centros de coste ni presupuestos. No existen en la app.
- **No:** copiar el HTML de Stitch. Se usan componentes shadcn e iconos `lucide-react`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Editar nombre y estado: el `PUT` funciona y el `PATCH` falla | El modal muestra el error del `PATCH`. Al cerrarlo la lista se recarga y refleja el nombre guardado. |
| Otro Admin elimina el departamento mientras se edita | La API responde 404; se muestra "El departamento ya no existe." y la lista se recarga. |
| Cambiar `postJson` rompe login o registro | `options` es opcional; un criterio verifica login y registro. |
| La sesión dice Admin pero el token no | La API responde 403 y se muestra "No tienes permiso para gestionar departamentos.". |

## Lo que **no** entra en esta spec

- Código, Descripción e iconos por departamento.
- Tarjetas de métricas, exportación, checkboxes, Centro de Coste y banner ERP.
- Guard por rol genérico.
- Paginación o búsqueda en la API.
- Página de Usuarios.
- Cambios en la API.

Cada uno, si llega, va en su propia spec.
