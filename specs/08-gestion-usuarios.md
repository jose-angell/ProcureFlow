# SPEC 08 — Gestión de usuarios

> **Estado:** implementado
> **Depende de:** SPEC 03, SPEC 06, SPEC 07
> **Fecha:** 2026-10-28
> **Objetivo:** Crear la página `/users`, solo para Admin, con métricas, listado filtrable de usuarios y las acciones crear, editar (datos, rol, departamento, estado y contraseña opcional) y eliminar, según `design/users.html` y `design/userModal.html`.

## Por qué existe esta spec

La API ya gestiona usuarios, pero ninguna pantalla la usa. La opción "Usuarios" del menú está deshabilitada. `PUT /api/users/{id}` exige contraseña y la re-hashea siempre, así que editar sin contraseña es imposible hoy. Esta spec agrega un cambio mínimo de backend (contraseña opcional al editar) y la página. El diseño de Stitch muestra datos que la API no tiene (cargo, foto, ID corto, licencias, SCIM); quedan fuera.

## Alcance

**Dentro:**

- Backend: `UpdateUserRequest.Password` opcional. Si llega vacío o null, el use case conserva el hash actual. Tests de Application para ambos casos.
- Ruta `/users` dentro de `AppLayout`. Si el rol de la sesión no es Admin, la página redirige a `/dashboard` con `replace`.
- La opción "Usuarios" del menú enlaza a `/users`. Sigue visible solo para Admin.
- Migas: "Inicio > Usuarios".
- Cabecera: título "Gestión de Usuarios", badge "N usuarios registrados", descripción "Administra las cuentas de usuario, asignación de roles, departamentos y estados de acceso.". Botón "Agregar usuario".
- Tres tarjetas calculadas en el cliente con la lista cargada: Usuarios totales; Roles asignados (conteo Requester, Approver, Admin); Usuarios activos (activos, inactivos y porcentaje).
- Datos de `GET /api/users?pageSize=100`, ordenados por nombre en el cliente.
- Búsqueda en vivo por nombre o email; filtros Rol (Todos, Admin, Approver, Requester), Depto (Todos + todos los departamentos) y Estado (Todos, Activo, Inactivo); botón "Limpiar filtros". Todo en el cliente.
- Contador "Mostrando X de Y usuarios".
- Paginación en el cliente: "Filas por pág." (10, 25, 50), "Anterior", página actual, "Siguiente". Pie "Mostrando a–b de N usuarios".
- Tabla: Nombre (avatar de iniciales), Email, Departamento, Rol, Estado, Acciones. Filas inactivas atenuadas.
- Modal crear: Nombre completo, Correo, Contraseña, Departamento, Rol. Nace Activo.
- Modal editar: Nombre completo, Correo, Estado, Departamento, Rol y "Nueva contraseña" (opcional).
- Recuadro informativo en el modal con la descripción del rol seleccionado.
- Eliminar con `AlertDialog`.
- Autoprotección en el frontend: en la fila del usuario de la sesión no hay botón Eliminar; en su modal Rol y Estado están deshabilitados.
- Errores de guardar dentro del modal. Éxito y errores de eliminar en un `Alert` sobre la tabla.

**Fuera de alcance (specs futuras):**

- Cargo, foto de perfil e ID corto (USR-001).
- "Exportar listado", menú `more_vert`, checkboxes y acciones en lote.
- Capacidad de licencias, "+N este mes" y tasa de actividad histórica.
- Tarjeta de sincronización SCIM / Azure AD / Okta y "Directorio sincronizado vía SCIM".
- Paginación, filtros o total en la API.
- Bloqueo de autoacciones en la API.
- Uso de `PATCH /api/users/{id}/change-department` (el `PUT` ya cambia el departamento).
- Guard por rol genérico.
- Política de contraseñas en la API.

## Modelo de datos

### Backend

`ProcureFlow.Application/Users/Dtos/UpdateUserRequest.cs`: quitar `[Required]` de `Password`. Mantener `[StringLength(500)]`.

`UserUseCase.Update`:

```csharp
var passwordHash = string.IsNullOrWhiteSpace(request.Password)
    ? user.PasswordHash
    : _passwordHashService.Hash(request.Password);
```

`CreateUserRequest` no cambia. Las demás operaciones no cambian.

Nuevos tests en `ProcureFlow.Tests/Application/UserUseCaseTests.cs`:

- `Update_ShouldKeepPasswordHash_WhenPasswordIsEmpty`
- `Update_ShouldChangePasswordHash_WhenPasswordIsProvided`

### Frontend

Nuevo `src/features/users/types.ts`:

```ts
import type { UserRole } from '@/features/auth/types'

// Copia ProcureFlow.Application/Users/Dtos/UserDto.cs
export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  departmentId: string
  departmentName: string | null
  isActive: boolean
  createdAt: string
}

// Copia CreateUserRequest.cs
export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  departmentId: string
  role: UserRole
}

// Copia UpdateUserRequest.cs (password vacío = no cambia)
export interface UpdateUserRequest {
  fullName: string
  email: string
  password: string | null
  departmentId: string
  role: UserRole
}

export type UserStatusFilter = 'all' | 'active' | 'inactive'
export type UserRoleFilter = 'all' | UserRole
```

Nuevo `src/features/users/api/users.ts` (token de `getSession()`; sin sesión lanza `ApiError(401)`, como `departments.ts`):

```ts
export function getUsers(): Promise<User[]>                                    // GET    /api/users?pageSize=100
export function createUser(body: CreateUserRequest): Promise<User>             // POST   /api/users
export function updateUser(id: string, body: UpdateUserRequest): Promise<void> // PUT    /api/users/{id}
export function activateUser(id: string): Promise<void>                        // PATCH  /api/users/{id}/activate
export function deactivateUser(id: string): Promise<void>                      // PATCH  /api/users/{id}/deactivate
export function deleteUser(id: string): Promise<void>                          // DELETE /api/users/{id}
```

Departamentos: se reusa `getDepartments()` de `features/departments/api/departments.ts`. Modal: solo activos, más el departamento actual del usuario si está inactivo. Filtro Depto: todos.

Otros cambios:

- `AppSidebar`: "Usuarios" recibe `to: '/users'`.
- `AppLayout`: `PAGE_TITLES['/users'] = 'Usuarios'`.
- `router.tsx`: `{ path: 'users', element: <UsersPage /> }` dentro de `AppLayout`.

Nuevos archivos:

| Archivo | Rol |
| --- | --- |
| `src/features/users/types.ts` | Tipos anteriores. |
| `src/features/users/api/users.ts` | Llamadas a la API. |
| `src/features/users/userErrors.ts` | Mensajes de éxito y error. |
| `src/features/users/userRoles.ts` | Etiqueta, variante de `Badge` y descripción por rol. |
| `src/features/users/components/UserStatsCards.tsx` | Tres tarjetas de métricas. |
| `src/features/users/components/UsersTable.tsx` | Filtros, tabla y paginación. |
| `src/features/users/components/UserFormDialog.tsx` | Modal crear y editar. |
| `src/features/users/components/DeleteUserButton.tsx` | Papelera y `AlertDialog`. |
| `src/features/users/pages/UsersPage.tsx` | Página, rol, carga y `Alert` de resultado. |

Filtros y paginación (cliente):

- Búsqueda: texto recortado contra nombre y email, sin distinguir mayúsculas ni tildes (`normalize('NFD')`).
- Filtro Depto compara por `departmentId`.
- Cambiar búsqueda, filtros o filas por página vuelve a la página 1.
- "Limpiar filtros" vacía búsqueda y pone Rol, Depto y Estado en Todos. No cambia filas por página.
- "Anterior" deshabilitado en página 1; "Siguiente" en la última.
- Tras crear, editar o eliminar se recarga la lista y se conservan los filtros.

Tarjetas (sobre la lista completa, no la filtrada):

| Tarjeta | Contenido |
| --- | --- |
| Usuarios totales | Número total. |
| Roles asignados | Conteo Requester, Approver, Admin. |
| Usuarios activos | Número de activos, "N inactivos" y "X% activos" (0% si no hay usuarios). |

Fila:

| Columna | Contenido |
| --- | --- |
| Nombre | Avatar con iniciales (máx. 2 letras) y nombre completo. |
| Email | Email. |
| Departamento | `departmentName`, o "—" si es null. |
| Rol | `Badge` Admin, Approver o Requester. |
| Estado | `Badge` "Activo" o "Inactivo". |
| Acciones | `Pencil` (`aria-label="Editar {fullName}"`) y `Trash2` (`aria-label="Eliminar {fullName}"`). Sin `Trash2` en la fila del usuario de la sesión. |

Modal (`UserFormDialog`, `Dialog` de shadcn):

| Elemento | Crear | Editar |
| --- | --- | --- |
| Título | "Crear nuevo usuario" | "Editar usuario" |
| Descripción | "Configura los datos del usuario, su rol y su departamento." | igual |
| Nombre completo | `Input` obligatorio, `maxLength={150}` | valor actual |
| Correo electrónico | `Input type="email"` obligatorio, `maxLength={200}` | valor actual |
| Contraseña | "Contraseña", obligatoria, mínimo 8 caracteres | "Nueva contraseña", opcional, mínimo 8 si se escribe; ayuda "Déjala vacía para conservar la actual." |
| Estado | No se muestra | `Select` Activo/Inactivo; deshabilitado si es el usuario de la sesión |
| Departamento | `Select` obligatorio, sin valor inicial | valor actual |
| Rol | `Select`, por defecto Requester | valor actual; deshabilitado si es el usuario de la sesión |
| Info de rol | Recuadro con la descripción del rol seleccionado | igual |
| Botones | "Cancelar" y "Guardar usuario" | igual |

- Nombre y correo se envían recortados. La contraseña se envía tal cual.
- "Guardar usuario" deshabilitado si falta un obligatorio. En editar, también si nada cambió.
- Validación en el cliente: correo con formato válido ("Ingresa un correo válido."), contraseña ≥ 8 ("La contraseña debe tener al menos 8 caracteres.").
- Editar envía `PUT` solo si cambió nombre, correo, rol, departamento o se escribió contraseña (`password: null` si vacía). Después envía `activate` o `deactivate` solo si el estado cambió.
- Mientras guarda: botón "Guardando...", botones deshabilitados, modal no se cierra.
- Si una petición falla, `Alert` dentro del modal, que sigue abierto. Al cerrar tras un error, la lista se recarga.

Descripciones de rol (`userRoles.ts`):

| Rol | Descripción |
| --- | --- |
| Requester | "Crea y envía solicitudes de compra de su departamento." |
| Approver | "Aprueba o rechaza las solicitudes enviadas de su departamento." |
| Admin | "Gestiona usuarios y departamentos del sistema." |

Eliminar (`DeleteUserButton`, `AlertDialog`):

- Título "¿Eliminar al usuario {fullName}?". Descripción "Esta acción no se puede deshacer.".
- Botones "Cancelar" y "Eliminar" (destructive). Mientras elimina: "Eliminando..." y botones deshabilitados.

Mensajes (`userErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| Creado | "Usuario {fullName} creado." |
| Actualizado | "Usuario {fullName} actualizado." |
| Eliminado | "Usuario {fullName} eliminado." |
| 409 al crear o editar | "Ya existe un usuario con ese correo." |
| 409 al eliminar | "No se puede eliminar un usuario con solicitudes o decisiones de aprobación." |
| 404 al crear o editar | "El usuario o el departamento ya no existe." |
| 404 al eliminar o cambiar estado | "El usuario ya no existe." |
| 400 al guardar | "Revisa los datos del usuario." |
| 401 | "Tu sesión expiró. Inicia sesión de nuevo." |
| 403 | "No tienes permiso para gestionar usuarios." |
| 5xx u otro | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Estados de la lista:

| Estado | Qué se ve |
| --- | --- |
| Cargando | Tarjetas y filas `Skeleton`. |
| Error de carga | `Alert` con el mensaje, en lugar de tarjetas y tabla. |
| Sin usuarios | "No hay usuarios registrados." |
| Sin resultados | "Ningún usuario coincide con los filtros." |
| Error al cargar departamentos | Filtro Depto solo con "Todos"; el modal muestra el error y deshabilita "Guardar usuario". |

## Plan de implementación

1. **Backend.** `Password` opcional en `UpdateUserRequest`; `UserUseCase.Update` conserva el hash si llega vacío. Crear `UserUseCaseTests` con los dos tests. `dotnet build` y `dotnet test` pasan.
2. **Tipos, API, roles y mensajes.** Crear `types.ts`, `api/users.ts`, `userRoles.ts` y `userErrors.ts`. Nada los usa todavía.
3. **Página y ruta.** Crear `UsersPage` con redirección por rol, cabecera, carga de usuarios y departamentos y estados de la lista. Ruta en `router.tsx`, `to` en `AppSidebar`, título en `AppLayout`.
4. **Tarjetas.** Crear `UserStatsCards` con los cálculos.
5. **Tabla.** Crear `UsersTable` con búsqueda, tres filtros, "Limpiar filtros", contador, filas y paginación. Acciones aún sin efecto.
6. **Eliminar.** Crear `DeleteUserButton`. Notifica `onDeleted(fullName)` u `onError(error)`. Página muestra `Alert` y recarga. Ocultar en la fila propia.
7. **Crear y editar.** Crear `UserFormDialog`. Conectar "Agregar usuario" y el lápiz. Rol y Estado deshabilitados para el usuario de la sesión.
8. **Documentación y verificación.** `web/procureflow-web/CLAUDE.md`: `/users` solo Admin, misma redirección que `/departments`. `npm run lint`, `npm run build`, `dotnet test` pasan.

## Criterios de aceptación

- [x] `dotnet build`, `dotnet test`, `npm run lint` y `npm run build` pasan.
- [x] `PUT /api/users/{id}` sin `password` (o vacío) responde 204 y el usuario sigue entrando con su contraseña anterior.
- [x] `PUT /api/users/{id}` con `password` cambia la contraseña.
- [x] Como Admin, "Usuarios" del menú está habilitado y lleva a `/users`.
- [x] Como Requester o Approver, abrir `/users` por URL redirige a `/dashboard`.
- [x] Las migas muestran "Inicio > Usuarios".
- [x] La cabecera muestra "Gestión de Usuarios" y "N usuarios registrados".
- [x] Las tarjetas muestran total, conteo por rol y activos/inactivos correctos para la lista cargada.
- [x] La tabla lista los usuarios de `GET /api/users?pageSize=100` ordenados por nombre.
- [x] Usuarios inactivos muestran "Inactivo" y fila atenuada.
- [x] Escribir "gomez" encuentra "Gómez"; escribir parte de un email lo encuentra.
- [x] Filtros Rol, Depto y Estado se combinan, y el contador se actualiza.
- [x] "Limpiar filtros" vuelve búsqueda y los tres filtros a su valor inicial.
- [x] Con más de 10 usuarios hay 2 páginas; con 25 filas por página hay 1 (si hay ≤ 25).
- [x] "Agregar usuario" abre "Crear nuevo usuario" con Contraseña y sin Estado.
- [x] El selector Departamento del modal solo lista departamentos activos.
- [x] Crear envía `POST /api/users` con `Authorization: Bearer <token>` y `role` numérico; el usuario aparece Activo.
- [x] Crear con un correo existente muestra "Ya existe un usuario con ese correo." en el modal abierto.
- [x] Contraseña de menos de 8 caracteres o correo inválido muestran su mensaje y no envían petición.
- [x] Editar abre el modal con los valores actuales y "Nueva contraseña" vacía.
- [x] Editar solo el estado envía un `PATCH` y ningún `PUT`. Editar solo el nombre envía `PUT` con `password: null` y ningún `PATCH`.
- [x] Cambiar el rol muestra la descripción del rol nuevo en el recuadro.
- [x] En la fila del Admin de la sesión no hay papelera; en su modal Rol y Estado están deshabilitados.
- [x] La papelera abre "¿Eliminar al usuario {fullName}?". "Cancelar" o Esc cierran sin peticiones.
- [x] Eliminar un usuario sin solicitudes envía `DELETE`, muestra "Usuario {fullName} eliminado." y lo quita.
- [x] Eliminar un usuario con solicitudes muestra "No se puede eliminar un usuario con solicitudes o decisiones de aprobación." sobre la tabla.
- [x] Con la API apagada, la página muestra "No se pudo conectar con el servidor. Intenta de nuevo.".
- [x] Mientras guarda o elimina, botones deshabilitados y el diálogo no se cierra con Esc.
- [x] Modal y `AlertDialog` usables solo con teclado.
- [x] Sin scroll horizontal de página a 375px (la tabla puede desplazarse en su contenedor).
- [x] No hay cargo, foto, ID corto, licencias, "Exportar listado", `more_vert`, checkboxes ni tarjeta SCIM.
- [x] No hay dependencias npm nuevas.

## Decisiones

- **Sí:** `Password` opcional en `PUT` con hash conservado. Sin esto editar exige resetear la contraseña. Decisión del usuario.
- **No:** editar solo vía `change-department` y activate/deactivate. Deja nombre, correo y rol sin editar.
- **Sí:** contraseña obligatoria al crear y "Nueva contraseña" opcional al editar, aunque el diseño no la muestra. La API la exige al crear.
- **Sí:** mínimo 8 caracteres en el cliente, como el registro (SPEC 02).
- **Sí:** filtros, orden y paginación en el cliente con `pageSize=100`. Igual que SPEC 07. Decisión del usuario.
- **No:** paginación y total en la API. Más trabajo; el volumen actual no lo pide.
- **Sí:** tres tarjetas simplificadas calculadas en el cliente. Decisión del usuario.
- **No:** licencias, "+N este mes" y tasa histórica. No hay datos.
- **Sí:** autoprotección solo en frontend (sin eliminar propio, Rol y Estado deshabilitados). Decisión del usuario; la API no lo bloquea.
- **Sí:** acciones Editar + Eliminar; estado se cambia en el modal. Como SPEC 07. Decisión del usuario.
- **No:** botones distintos por estado (Suspender/Reactivar) del diseño.
- **Sí:** Estado solo en editar. La API crea Activo; dos peticiones podrían quedar a medias. Decisión del usuario.
- **Sí:** modal con departamentos activos; filtro con todos. Decisión del usuario.
- **Sí:** columnas Nombre, Email, Departamento, Rol, Estado, Acciones con avatar de iniciales. Decisión del usuario.
- **No:** columna ID, cargo y foto. No existen o no aportan.
- **Sí:** reusar `getDepartments()` de `features/departments`. Evita duplicar llamadas.
- **No:** usar `change-department`. El `PUT` ya incluye el departamento.
- **Sí:** mensajes por operación para 409 y 404. El mismo status significa cosas distintas.
- **No:** copiar el HTML de Stitch. Se usan componentes shadcn e iconos `lucide-react`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Más de 100 usuarios: los demás no se ven | Documentado; spec futura para paginación en la API. |
| `PUT` funciona y `PATCH` de estado falla | El modal muestra el error; al cerrar se recarga la lista. |
| Admin se quita el rol o se desactiva vía API directa | Fuera de alcance; solo el frontend lo impide. |
| Desactivar a un usuario con sesión abierta | Su token sigue válido hasta expirar. |
| Comparación de correo distingue mayúsculas en la API | Se envía recortado; normalizar mayúsculas queda fuera. |
| La sesión dice Admin pero el token no | La API responde 403 y se muestra "No tienes permiso para gestionar usuarios.". |

## Lo que **no** entra en esta spec

- Cargo, foto, ID corto.
- Exportación, `more_vert`, checkboxes, licencias, SCIM.
- Paginación, filtros o total en la API.
- Bloqueo de autoacciones en la API.
- Guard por rol genérico.

Cada uno, si llega, va en su propia spec.
