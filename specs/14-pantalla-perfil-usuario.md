# SPEC 14 — Pantalla de perfil del usuario

> **Estado:** implementado
> **Depende de:** SPEC 06, SPEC 08
> **Fecha:** 2026-11-01
> **Objetivo:** Permitir que cualquier usuario con sesión activa vea y edite su nombre y correo y cambie su contraseña desde `/profile`, siguiendo `design/userConfig.html`.

## Por qué existe esta spec

`api/users` es solo para Admin (SPEC 08). Un Requester o un Approver no puede corregir su nombre, su correo ni cambiar su contraseña. La opción "Configuración" del sidebar está deshabilitada porque no tiene página.

## Alcance

**Dentro:**

- Backend: `GET api/users/me`, `PUT api/users/me` y `PUT api/users/me/password`, para cualquier rol autenticado.
- `UsersController` pasa a `[Authorize]` a nivel de clase y `[Authorize(Roles = "Admin")]` en cada acción existente.
- `UserUseCase` recibe `ICurrentUserService` y añade `GetMe`, `UpdateMe` y `ChangeMyPassword`.
- DTOs nuevos `UpdateMyProfileRequest` y `ChangeMyPasswordRequest`.
- Tests de aplicación (`UserUseCaseTests`) e integración (`UserProfileEndpointsTests`).
- Frontend: feature `src/features/profile/` con la página `ProfilePage` en la ruta protegida `/profile`.
- Tarjeta "Datos personales": avatar de iniciales, nombre, correo, departamento y rol en solo lectura, formulario de nombre y correo con "Descartar" y "Guardar cambios".
- Tarjeta "Actualizar contraseña": actual, nueva (con medidor de fuerza) y confirmación, con mostrar u ocultar en cada una.
- `updateSessionUser` en `session.ts` y refresco de `CurrentUser` al guardar.
- "Configuración" del sidebar apunta a `/profile`; "Mi perfil" en el menú de `CurrentUser`; breadcrumb "Mi perfil".

**Fuera de alcance (specs futuras):**

- Columna derecha de la referencia: nivel de seguridad, 2FA, firma criptográfica, llaves de respaldo, sesiones activas y nota de auditoría.
- Foto de perfil ("Subir foto", "Eliminar"), "Último acceso" e "ID: #PRF-…".
- "¿Olvidaste tu contraseña?" y recuperación por correo.
- Selector "Rol activo", buscador global, "Acme Corp" y notificaciones del header.
- Pestañas adicionales de configuración (solo existe "Mi perfil").
- Cambiar departamento o rol desde el perfil (lo hace el Admin).
- Reemitir el JWT al cambiar nombre o correo, o invalidar tokens al cambiar la contraseña.
- Reglas de contraseña más estrictas (números, símbolos) o aplicarlas al registro.

## Modelo de datos

No hay entidades ni migraciones nuevas. `User.Update(...)` ya permite cambiar nombre, correo y hash; se reusa pasando el rol y el departamento actuales.

### Backend

`ProcureFlow.Application/Users/Dtos/UpdateMyProfileRequest.cs`:

```csharp
public class UpdateMyProfileRequest
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(150, ErrorMessage = "El nombre no puede tener mas de 150 caracteres")]
    public string? FullName { get; set; }

    [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
    [StringLength(200, ErrorMessage = "El correo no puede tener mas de 200 caracteres")]
    [EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
    public string? Email { get; set; }
}
```

`ProcureFlow.Application/Users/Dtos/ChangeMyPasswordRequest.cs`:

```csharp
public class ChangeMyPasswordRequest
{
    [Required(ErrorMessage = "La contraseña actual es obligatoria.")]
    public string? CurrentPassword { get; set; }

    [Required(ErrorMessage = "La nueva contraseña es obligatoria.")]
    [StringLength(500, MinimumLength = 8, ErrorMessage = "La nueva contraseña debe tener entre 8 y 500 caracteres.")]
    public string? NewPassword { get; set; }
}
```

Endpoints (en `UsersController`, todos `[Authorize]` sin roles):

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET api/users/me` | — | 200 `UserDto` (con `DepartmentId` y `DepartmentName`) |
| `PUT api/users/me` | `UpdateMyProfileRequest` | 204 |
| `PUT api/users/me/password` | `ChangeMyPasswordRequest` | 204 |

`me` no choca con `{id:guid}` por la restricción de tipo.

Flujo en `UserUseCase` (el id sale de `ICurrentUserService.UserId`):

| Método | Reglas | Excepción → status |
| --- | --- | --- |
| `GetMe` | Usuario no existe | `NotFoundException("El usuario no esta en el sistema.")` → 404 |
| | Usuario inactivo | `ForbiddenException("El usuario está inactivo.")` → 403 |
| `UpdateMe` | Mismas que `GetMe` | 404 / 403 |
| | Correo usado por otro usuario | `ConflictException("El correo no esta disponible.")` → 409 |
| | Llama a `user.Update(fullName, email, user.PasswordHash, user.Role, user.DepartmentId)` | — |
| `ChangeMyPassword` | Mismas que `GetMe` | 404 / 403 |
| | `CurrentPassword` no verifica | `DomainException("La contraseña actual no es correcta.")` → 400 |
| | `NewPassword` igual a la actual | `DomainException("La nueva contraseña debe ser distinta de la actual.")` → 400 |
| | Llama a `user.Update(...)` con el nuevo hash | — |

Nombre y correo se guardan sin espacios al inicio ni al final (`Trim()`).

### Frontend

`src/features/profile/types.ts`:

```ts
import type { UserRole } from '@/features/auth/types'

export interface MyProfile {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  departmentId: string
  departmentName: string | null
  createdAt: string
}

export interface UpdateMyProfileRequest {
  fullName: string
  email: string
}

export interface ChangeMyPasswordRequest {
  currentPassword: string
  newPassword: string
}
```

`src/features/profile/api/profile.ts`: `getMyProfile(token)`, `updateMyProfile(body, token)` y `changeMyPassword(body, token)`, sobre `getJson` y `putJson` de `httpClient` (sin cambiar `httpClient`). Tras el 204 de `updateMyProfile`, la página guarda en la sesión los valores enviados (ya con `trim`).

`src/features/auth/session.ts`:

- `updateSessionUser(changes: Pick<StoredSession['user'], 'fullName' | 'email'>)`: reescribe la sesión en el mismo almacenamiento donde está (no cambia "Recordar sesión") y emite el evento `procureflow.session-updated` en `window`. Sin sesión no hace nada.
- `CurrentUser` escucha ese evento y se vuelve a renderizar.

`src/features/profile/profileErrors.ts` (`ProfileOperation = 'load' | 'save' | 'password'`):

| Status | `load` | `save` | `password` |
| --- | --- | --- | --- |
| Red | No se pudo conectar con el servidor. Intenta de nuevo. | igual | igual |
| 400 | inesperado | Revisa tus datos. | La contraseña actual no es correcta o la nueva no cumple los requisitos. |
| 401 | Tu sesión expiró. Inicia sesión de nuevo. | igual | igual |
| 403 | Tu usuario está inactivo. | igual | igual |
| 404 | Tu usuario ya no existe. | igual | igual |
| 409 | inesperado | Ya existe un usuario con ese correo. | inesperado |
| Otro | Ocurrió un error inesperado. Intenta más tarde. | igual | igual |

### Pantalla `/profile`

| Zona | Contenido |
| --- | --- |
| Cabecera | "Configuración de la cuenta" y "Gestiona tu información personal, correo electrónico y credenciales de acceso a ProcureFlow." |
| Pestaña | Una sola pestaña "Mi perfil" (icono `CircleUser`), activa. |
| Columna | Ancho máximo `max-w-3xl`, una columna; las tarjetas en vertical. |
| Tarjeta 1 | Título "Datos personales", descripción "Actualiza tu nombre y el correo vinculado a tu cuenta." Recuadro con avatar de iniciales (64px), nombre, correo y rol. Campos "Nombre completo *" (`IdCard`) y "Correo electrónico *" (`Mail`) a dos columnas desde `md`. Recuadros de solo lectura "Departamento asignado" (`Building2` + candado) y "Rol" (badge con `USER_ROLE_INFO`). Pie: "Descartar" (vuelve a los valores cargados) y "Guardar cambios". |
| Tarjeta 2 | Título "Actualizar contraseña" (icono `Shield`), descripción "Usa una contraseña de al menos 8 caracteres." Campo "Contraseña actual" (`KeyRound`) y, a dos columnas desde `md`, "Nueva contraseña" (`Lock`) con medidor y "Confirmar nueva contraseña" (`BadgeCheck`). Botón "Actualizar contraseña" (`RotateCcwKey` o `LockKeyhole`). |

Estados:

- **Cargando:** esqueleto o texto "Cargando perfil…" en lugar de las tarjetas.
- **Error al cargar:** `Alert` con el mensaje de `load` y botón "Reintentar".
- **Guardando:** botón deshabilitado con "Guardando…" o "Actualizando…"; campos deshabilitados.
- **Éxito al guardar datos:** mensaje "Cambios guardados correctamente." junto al pie; se actualiza la sesión y el header.
- **Éxito al cambiar contraseña:** mensaje "Contraseña actualizada correctamente."; se limpian los tres campos y el medidor.
- **Error de API:** `Alert` dentro de la tarjeta afectada, sin perder lo escrito.

Validación en el cliente:

- Datos: nombre y correo obligatorios tras `trim`; correo con formato válido; "Guardar cambios" deshabilitado si no hay cambios.
- Contraseña: los tres campos obligatorios; nueva ≥ 8 caracteres; confirmación igual a la nueva ("Las contraseñas no coinciden."); nueva distinta de la actual.

Medidor de fuerza (`PasswordStrengthMeter`, solo por longitud, como la referencia): vacío → "Ingresa tu nueva contraseña"; < 8 → 1 barra roja, "Contraseña débil"; 8–11 → 2 barras, "Contraseña moderada"; ≥ 12 → 3 barras verdes, "Contraseña segura". Texto con `aria-live="polite"`.

Mostrar u ocultar contraseña: botón con `aria-label` "Mostrar contraseña"/"Ocultar contraseña" y `Eye`/`EyeOff`, como en `LoginForm`.

## Plan de implementación

1. **Autorización del controller.** `UsersController` pasa a `[Authorize]` de clase y `[Authorize(Roles = "Admin")]` en cada acción existente. `dotnet build` y `dotnet test` pasan; nada cambia para el Admin.
2. **Use case y DTOs.** Crear `UpdateMyProfileRequest` y `ChangeMyPasswordRequest`. Inyectar `ICurrentUserService` en `UserUseCase` y añadir `GetMe`, `UpdateMe` y `ChangeMyPassword`. Ajustar los `new UserUseCase(...)` de `UserUseCaseTests` con `FakeCurrentUserService`. `dotnet build` pasa.
3. **Endpoints.** Añadir `GET me`, `PUT me` y `PUT me/password` a `UsersController`.
4. **Tests backend.** En `UserUseCaseTests`: obtener, actualizar, correo en uso (409), contraseña actual incorrecta (400), nueva igual a la actual (400), usuario inactivo (403). Nuevo `Integration/UserProfileEndpointsTests.cs`: un Requester obtiene (200) y actualiza (204) su perfil, cambia su contraseña (204) y luego entra con la nueva; sin token → 401; un Requester sigue recibiendo 403 en `GET api/users`. `dotnet test` pasa.
5. **Sesión.** Añadir `updateSessionUser` y el evento en `session.ts`; `CurrentUser` lo escucha. `npm run build` pasa.
6. **Feature profile: datos.** `types.ts`, `api/profile.ts`, `profileErrors.ts`, `ProfilePage` con la tarjeta de datos personales (`ProfileDetailsCard`). Ruta `/profile` en `router.tsx` y `'/profile': 'Mi perfil'` en `PAGE_TITLES`.
7. **Feature profile: contraseña.** `ChangePasswordCard` y `PasswordStrengthMeter`.
8. **Navegación.** `to: '/profile'` en "Configuración" del sidebar; "Mi perfil" (`CircleUser`) en el menú de `CurrentUser`, encima de "Cerrar sesión".
9. **Verificación.** `dotnet build`, `dotnet test`, `npm run lint` y `npm run build` pasan; prueba manual con los tres roles. Actualizar `web/procureflow-web/CLAUDE.md` (`/profile` para todos los roles, `updateSessionUser`).

## Criterios de aceptación

- [x] `dotnet build`, `dotnet test`, `npm run lint` y `npm run build` pasan.
- [x] `GET api/users/me` con token de Requester, Approver o Admin responde 200 con sus propios datos y `departmentName`.
- [x] `GET api/users/me` sin token responde 401.
- [x] `GET api/users`, `POST`, `PUT {id}`, `DELETE {id}` y los `PATCH` siguen respondiendo 403 a un Requester y 2xx a un Admin.
- [x] `PUT api/users/me` con un correo de otro usuario responde 409 y no cambia nada.
- [x] `PUT api/users/me` no cambia rol, departamento, estado ni contraseña.
- [x] `PUT api/users/me/password` con la contraseña actual incorrecta responde 400 y no cierra la sesión en el frontend.
- [x] `PUT api/users/me/password` con una nueva de menos de 8 caracteres responde 400.
- [x] Tras cambiar la contraseña, el login con la anterior responde 401 y con la nueva 200.
- [x] Un usuario inactivo con token aún vigente recibe 403 en los tres endpoints.
- [x] Cualquier rol llega a `/profile` desde "Configuración" del sidebar y desde "Mi perfil" del menú de usuario.
- [x] El breadcrumb muestra "Inicio > Mi perfil".
- [x] Departamento y rol se muestran y no se pueden editar.
- [x] Tras guardar nombre o correo, el header muestra los nuevos valores sin recargar, y siguen ahí tras recargar.
- [x] La sesión actualizada queda en el mismo almacenamiento (localStorage o sessionStorage) que antes.
- [x] "Descartar" devuelve los valores cargados; "Guardar cambios" está deshabilitado sin cambios.
- [x] Con confirmación distinta, nueva < 8 o nueva igual a la actual, no se envía la petición y se muestra el error junto al campo.
- [x] Tras cambiar la contraseña, la sesión sigue activa y los tres campos quedan vacíos.
- [x] El medidor muestra 0, 1, 2 o 3 barras según la longitud y su texto se anuncia con `aria-live`.
- [x] Cada campo de contraseña tiene un botón accesible de mostrar u ocultar.
- [x] A 375px todo está en una columna y no hay scroll horizontal.
- [x] La pantalla se usa solo con teclado.
- [x] No aparecen la columna derecha, foto de perfil, "Último acceso" ni "¿Olvidaste tu contraseña?".
- [x] No hay paquetes npm o NuGet nuevos ni migraciones nuevas.

## Decisiones

- **Sí:** solo las tarjetas de datos personales y contraseña. Lo decidió el usuario. Lo demás de la referencia no existe en la API.
- **Sí:** nombre y correo editables. Lo decidió el usuario. Departamento y rol los gestiona el Admin.
- **Sí:** rutas `api/users/me` en `UsersController`. Lo decidió el usuario.
- **No:** `api/profile` con controller propio. Descartado por el usuario.
- **Sí:** mover `Roles = "Admin"` de la clase a cada acción. En ASP.NET Core los `[Authorize]` de clase y acción se suman, y `[AllowAnonymous]` saltaría toda la autorización.
- **Sí:** lógica en `UserUseCase` con `ICurrentUserService`. Lo decidió el usuario. El id sale del token, no de la URL, así nadie edita a otro.
- **Sí:** reusar `User.Update(...)` sin métodos de dominio nuevos. Ya valida nombre, correo y hash.
- **Sí:** contraseña actual incorrecta → 400 (`DomainException`). Lo decidió el usuario. Un 401 dispararía el handler global que cierra la sesión.
- **No:** 403 o 409 para la contraseña incorrecta. Semánticamente menos exactos.
- **Sí:** mínimo 8 caracteres en API y cliente, con medidor por longitud. Lo decidió el usuario. El registro no cambia.
- **Sí:** mantener la sesión tras cambiar la contraseña. Lo decidió el usuario. El JWT sigue vigente hasta que expire.
- **Sí:** actualizar la sesión guardada con un evento para refrescar `CurrentUser`. Lo decidió el usuario. Sin el evento el header mostraría el nombre viejo hasta recargar.
- **No:** reemitir el JWT al cambiar el correo. La API solo lee `NameIdentifier` y `Role` del token; los claims de nombre y correo quedan desactualizados hasta el próximo login.
- **Sí:** `PUT me` responde 204, como `PUT api/users/{id}`. `putJson` no parsea respuesta; el frontend guarda en la sesión los valores enviados, que la API guarda tal cual tras `Trim()`.
- **No:** devolver el `UserDto` en `PUT me`. Obligaría a añadir una variante de `putJson` con respuesta.
- **Sí:** acceso desde sidebar y menú de usuario. Lo decidió el usuario.
- **Sí:** feature propia `src/features/profile/`. Sigue la organización por funcionalidades.
- **Sí:** iconos `lucide-react` y colores de Stitch como hex en clases, como en la SPEC 12. Se reusan `FormFieldLabel` e `IconInput`.
- **No:** copiar el HTML de Stitch. Se usan componentes shadcn.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Al mover `Roles = "Admin"` a cada acción se olvida una y queda abierta | Test de integración: un Requester recibe 403 en las rutas de Admin. Revisión del diff del controller. |
| Cambiar el correo deja el claim `Email` del JWT desactualizado | Ningún código lee ese claim hoy. Queda registrado aquí. |
| El JWT sigue válido tras cambiar la contraseña | Decisión de MVP, igual que el Web Storage (ADR-001). |
| Un usuario desactivado con token vigente sigue usando la app | Los endpoints de perfil responden 403. El resto de la app no cambia en esta spec. |
| Añadir `ICurrentUserService` al constructor rompe los tests existentes | Paso 2 ajusta los `new UserUseCase(...)` con `FakeCurrentUserService`. |

## Lo que **no** entra en esta spec

- Columna derecha de seguridad, sesiones y auditoría.
- Foto de perfil, "Último acceso" e ID de perfil.
- Recuperación de contraseña.
- Reemitir o invalidar el JWT.
- Cambiar departamento o rol desde el perfil.
- Reglas de contraseña más estrictas.

Cada uno, si llega, va en su propia spec.
