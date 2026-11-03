# SPEC 15 — Revalidar la sesión en cada petición autenticada

> **Estado:** aprobado
> **Depende de:** SPEC 06, SPEC 14
> **Fecha:** 2026-11-02
> **Objetivo:** Rechazar con 401 cualquier JWT cuyo usuario se desactivó o se eliminó, cuyo departamento se desactivó, o cuyo rol, departamento o contraseña cambiaron después de emitirse el token, mediante una única comprobación central contra la BD en cada petición.

## Por qué existe esta spec

El JWT dura 60 minutos y `[Authorize(Roles = ...)]` confía en el claim `Role` sin consultar la BD. Un usuario desactivado o degradado sigue operando hasta que vence su token. Las comprobaciones que existen son desiguales:

- `PurchaseRequestUseCase` responde 409 en `Create`, `Approve` y `Reject`.
- `UserUseCase` responde 403 en los endpoints `me`.
- El resto de endpoints no comprueba nada.

Cambiar la contraseña tampoco cierra las sesiones abiertas en otros dispositivos.

## Alcance

**Dentro:**

- Nueva columna `SecurityStamp` (`Guid`) en `User`. Se genera al crear el usuario y el dominio la regenera cuando cambia `PasswordHash`. Requiere la migración `AddUserSecurityStamp`.
- El JWT añade los claims `department_id` y `security_stamp`.
- `TokenSessionValidator` en Application compara los claims del token con la BD.
- `OnTokenValidated` de `AddJwtBearer` llama al validador y hace `context.Fail(...)` si no es válido, lo que da 401.
- Sin caché: una consulta por petición autenticada.
- `PUT api/users/me/password` responde 200 con un `AuthResponse` nuevo en lugar de 204, y el frontend sustituye el token guardado.
- El login rechaza con 403 a un usuario cuyo departamento está inactivo.
- Se quitan de los use cases las comprobaciones de `IsActive` del usuario que llama y de su departamento. Sus tests se adaptan.
- Tests de aplicación del validador y tests de integración de cada motivo de rechazo.
- Se actualizan ADR-001 (D5 y D6), `CLAUDE.md` y `web/procureflow-web/CLAUDE.md`.

**Fuera de alcance (specs futuras):**

- Refresh token y acortar `Jwt:ExpirationMinutes`, que sigue en 60.
- Caché de la validación.
- Mensaje propio de "sesión revocada" en el frontend.
- Endpoint "cerrar todas mis sesiones" o logout en servidor.
- Impedir que un Admin se cambie su propio rol o se quede sin administradores.
- Revalidar al cambiar nombre o correo, que no se comprueban.

## Modelo de datos

### Dominio

En `ProcureFlow.Domain/Entities/User.cs`:

```csharp
public Guid SecurityStamp { get; private set; }

// Constructor: SecurityStamp = Guid.NewGuid();
// Update(...): si passwordHash != PasswordHash → SecurityStamp = Guid.NewGuid();
```

`Activate`, `Deactivate` y `ChangeDepartment` no tocan el sello. Esos cambios se detectan comparando `IsActive` y `DepartmentId` directamente.

### Persistencia

- `UserConfiguration`: `builder.Property(u => u.SecurityStamp).IsRequired();`. No lleva `HasDefaultValueSql`, porque tiene que funcionar también en SQLite.
- Migración `AddUserSecurityStamp`, que se genera con `dotnet ef migrations add`. Se edita a mano para usar `defaultValueSql: "gen_random_uuid()"` en el `AddColumn`, así cada usuario existente recibe un sello distinto. El snapshot no cambia por ese ajuste.

### Claims

Nuevo `ProcureFlow.Application/Abstractions/Security/ProcureFlowClaimTypes.cs`:

```csharp
public static class ProcureFlowClaimTypes
{
    public const string DepartmentId = "department_id";
    public const string SecurityStamp = "security_stamp";
}
```

`JwtTokenGenerator.Generate` añade `department_id` y `security_stamp` a los claims actuales (`NameIdentifier`, `Email`, `Name` y `Role`).

### Validador

Nuevo `ProcureFlow.Application/Auth/TokenSessionValidator.cs`, registrado como scoped en `AddApplication()`:

```csharp
public sealed record TokenSessionClaims(Guid UserId, string Role, Guid DepartmentId, Guid SecurityStamp);

public class TokenSessionValidator
{
    // Dependencia: IApplicationDbContext
    public Task<bool> IsValidAsync(TokenSessionClaims claims);
}
```

`IsValidAsync` hace una sola consulta `AsNoTracking` con proyección: `Role`, `DepartmentId`, `IsActive`, `SecurityStamp` y `Department.IsActive`. Devuelve `false` si se cumple cualquiera de estas condiciones:

| Condición | Ejemplo |
| --- | --- |
| El usuario no existe | Usuario eliminado |
| `!user.IsActive` | Admin lo desactivó |
| `!department.IsActive` | Admin desactivó su departamento |
| `user.Role.ToString() != claims.Role` | Admin le cambió el rol |
| `user.DepartmentId != claims.DepartmentId` | Admin lo cambió de departamento |
| `user.SecurityStamp != claims.SecurityStamp` | Cambió la contraseña (propia o la puso el Admin) |

### API

En `ProcureFlow.Api/DependencyInjection.cs`, dentro de `AddJwtBearer`:

```csharp
options.Events = new JwtBearerEvents
{
    OnTokenValidated = async context =>
    {
        // Leer NameIdentifier, Role, department_id y security_stamp de context.Principal.
        // Si falta un claim o no se puede parsear → context.Fail("La sesión ya no es válida.").
        // Resolver TokenSessionValidator de context.HttpContext.RequestServices.
        // Si IsValidAsync devuelve false → context.Fail("La sesión ya no es válida.").
    }
};
```

`context.Fail` hace que el challenge de JwtBearer responda 401 sin cuerpo, igual que un token vencido. No pasa por `GlobalExceptionHandler`.

### Cambio de contraseña

| Antes (SPEC 14) | Ahora |
| --- | --- |
| `Task ChangeMyPassword(...)` | `Task<AuthResponse> ChangeMyPassword(...)` |
| `PUT api/users/me/password` → 204 | → 200 `AuthResponse` (token nuevo, con el sello nuevo) |

`UserUseCase` recibe `IJwtTokenGenerator` y carga `Department` para rellenar `DepartmentName`.

### Login

En `AuthUseCase.Login`, después de comprobar `user.IsActive`: si `user.Department` está inactivo, lanza `ForbiddenException("El departamento del usuario está inactivo.")` (403). Sin esto, el login emitiría un token que el validador rechazaría en la primera petición.

### Comprobaciones que se quitan

| Lugar | Comprobación | Motivo |
| --- | --- | --- |
| `PurchaseRequestUseCase.Create` | `!user.IsActive` → 409 y `!userDepartment.IsActive` → 409 | El validador ya lo garantiza |
| `PurchaseRequestUseCase.Approve` / `Reject` | `!user.IsActive` → 409 | Ídem |
| `UserUseCase.EnsureUserIsActive` | `!user.IsActive` → 403 | Ídem. Se mantiene el `null` → 404 |

Las comprobaciones de `null` se mantienen. Las que validan a terceros, como el departamento de destino en `register`, no cambian.

### Frontend

- `src/shared/api/httpClient.ts`: nuevo `putJsonWithResponse<TBody, TResponse>(path, body, options)` sobre `requestJson`, equivalente a `postJson` con `PUT`.
- `src/features/auth/session.ts`: nuevo `replaceSessionToken(response: AuthResponse)`. Reescribe `accessToken` y `user` en el mismo almacenamiento donde está la sesión (no cambia "Recordar sesión") y emite `SESSION_UPDATED_EVENT`. Sin sesión no hace nada. Reusa la búsqueda de almacenamiento de `updateSessionUser`, extraída a un helper privado.
- `src/features/profile/api/profile.ts`: `changeMyPassword` devuelve `Promise<AuthResponse>` usando `putJsonWithResponse`.
- `ChangePasswordCard`: tras el 200 llama a `replaceSessionToken(response)` antes de limpiar los campos. El comentario "la sesión sigue activa" sigue siendo válido.

## Plan de implementación

1. **Dominio y persistencia.** Añadir `SecurityStamp` a `User`: se genera en el constructor y se regenera en `Update` si cambia el hash. Configurarlo en `UserConfiguration`. Generar la migración `AddUserSecurityStamp` y ajustar `defaultValueSql`. Tests de dominio: el sello existe al crear, cambia con un hash nuevo y no cambia con el mismo hash. `dotnet build` y `dotnet test` pasan.
2. **Claims.** Crear `ProcureFlowClaimTypes` y añadir los dos claims en `JwtTokenGenerator`. `dotnet test` pasa.
3. **Validador.** Crear `TokenSessionValidator` y `TokenSessionClaims` y registrarlos en `AddApplication()`. Tests de aplicación (`TokenSessionValidatorTests`): un caso válido y un caso por cada fila de la tabla de rechazo. Nada lo llama todavía. `dotnet test` pasa.
4. **Integración en JwtBearer.** Añadir `OnTokenValidated` en `AddApi()`. `dotnet test` pasa: los tokens de los tests se emiten con el login, así que llevan los claims nuevos.
5. **Login con departamento inactivo.** Añadir el 403 en `AuthUseCase.Login` con su test.
6. **Contraseña con token nuevo.** `ChangeMyPassword` devuelve `AuthResponse`, `UsersController` responde `Ok(...)`, y se ajustan los `new UserUseCase(...)` de los tests con un generador real o falso. Ajustar el test de SPEC 14 que espera 204.
7. **Quitar comprobaciones redundantes.** Borrar las de la tabla "Comprobaciones que se quitan". Eliminar `ProfileMethods_ShouldThrowForbidden_WhenUserIsInactive` y los tests de aplicación equivalentes de 409; su cobertura pasa a integración (paso 8). `dotnet test` pasa.
8. **Tests de integración** (nuevo `Integration/SessionRevalidationTests.cs`). Login, cambio hecho por un Admin o directo en la BD, y luego `GET api/users/me` con el token viejo, que debe dar 401, en estos casos:
   - Usuario desactivado.
   - Departamento desactivado.
   - Rol cambiado.
   - Departamento cambiado.
   - Contraseña cambiada por el Admin.
   - Usuario eliminado.

   Además:
   - El token sin cambios responde 200.
   - Tras `PUT me/password`, el token viejo da 401 y el nuevo da 200.
   - Un token sin `security_stamp`, firmado con la clave de test, da 401.
   - `POST api/purchases` con el token de un Requester desactivado da 401, no 409.
9. **Frontend.** Añadir `putJsonWithResponse`, `replaceSessionToken`, el nuevo `changeMyPassword` y el ajuste de `ChangePasswordCard`. `npm run lint` y `npm run build` pasan.
10. **Documentación y verificación.** ADR-001:
    - D5: claims nuevos y revalidación por petición.
    - D6: el token se sustituye al cambiar la contraseña.
    - Quitar de "Pendiente" lo que ya quede resuelto.

    `CLAUDE.md`: una línea en Architecture sobre `TokenSessionValidator` y `OnTokenValidated`. `web/procureflow-web/CLAUDE.md`: `replaceSessionToken` y `putJsonWithResponse`. Prueba manual con dos navegadores (Admin y Requester). `dotnet build`, `dotnet test`, `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `dotnet build`, `dotnet test`, `npm run lint` y `npm run build` pasan.
- [ ] Un usuario desactivado con token vigente recibe 401 en cualquier endpoint autenticado, incluidos `api/purchases`, `api/users/me` y `api/departments`.
- [ ] Un usuario cuyo departamento se desactiva recibe 401 con su token vigente.
- [ ] Un usuario al que el Admin le cambia el rol recibe 401 con su token viejo, y tras volver a entrar opera con el rol nuevo.
- [ ] Un usuario al que el Admin le cambia el departamento recibe 401 con su token viejo.
- [ ] Un usuario eliminado recibe 401 con su token vigente.
- [ ] Tras `PUT api/users/{id}` con contraseña nueva hecho por el Admin, el token anterior de ese usuario recibe 401.
- [ ] Tras `PUT api/users/{id}` sin contraseña, sin cambiar rol ni departamento, el token del usuario sigue respondiendo 200.
- [ ] `PUT api/users/me/password` responde 200 con un `AuthResponse`. El token anterior recibe 401 y el nuevo 200.
- [ ] En `/profile`, tras cambiar la contraseña la sesión sigue activa sin volver a entrar, y la sesión guardada tiene el token nuevo en el mismo almacenamiento.
- [ ] Un token sin `department_id` o sin `security_stamp`, aunque esté bien firmado, recibe 401.
- [ ] El login de un usuario activo con departamento inactivo responde 403.
- [ ] En el frontend, un 401 por revalidación borra la sesión y lleva a `/login` con `reason: 'expired'`, igual que un token vencido.
- [ ] Ningún use case comprueba ya `IsActive` del usuario que llama ni de su departamento.
- [ ] `Jwt:ExpirationMinutes` sigue en 60.
- [ ] Existe exactamente una migración nueva (`AddUserSecurityStamp`) y no hay paquetes NuGet ni npm nuevos.

## Decisiones

- **Sí:** revalidar en `OnTokenValidated` contra la BD. Lo decidió el usuario. Es un único punto central y cubre todos los endpoints, incluidos los que solo tienen `[Authorize(Roles)]`.
- **No:** solo acortar el token. Reduce la ventana, pero no la cierra.
- **Sí:** lógica en `TokenSessionValidator` (Application) y solo el cableado en Api. Mantiene `Api → Application`, y se prueba con SQLite como el resto de use cases.
- **Sí:** cambio de rol → 401, no sustituir el rol. Lo decidió el usuario. Sustituirlo dejaría la sesión del frontend con el rol viejo.
- **Sí:** usuario inactivo → 401 en todos los endpoints. Lo decidió el usuario. El handler de 401 del frontend cierra la sesión sin código nuevo.
- **No:** 403 para el usuario inactivo. Dejaría al usuario dentro de una app inutilizable.
- **Sí:** mantener 60 minutos. Lo decidió el usuario. El refresh token va en su propia spec.
- **Sí:** también invalidan el token el departamento inactivo, el cambio de departamento y el cambio de contraseña. Lo decidió el usuario.
- **Sí:** columna `SecurityStamp` para la contraseña. Lo decidió el usuario. Es convencional, no expone nada derivado del hash y servirá para "cerrar todas las sesiones".
- **No:** huella del `PasswordHash` en el token. Es menos convencional y pone en el token información derivada del hash.
- **Sí:** el sello solo cambia con la contraseña. Rol, departamento y estado ya se comparan directamente, así que regenerarlo también ahí sería redundante.
- **Sí:** `PUT me/password` devuelve un token nuevo. Lo decidió el usuario. Conserva la UX de la SPEC 14 (la sesión sigue activa) y cierra las demás sesiones. Revierte la decisión de la SPEC 14 de responder 204 y la de no reemitir el JWT.
- **No:** cerrar la sesión tras cambiar la contraseña. Contradiría el criterio de la SPEC 14.
- **Sí:** quitar las comprobaciones de `IsActive` del usuario que llama en los use cases. Lo decidió el usuario. Ya no se pueden alcanzar por HTTP y daban status distintos (403 y 409).
- **Sí:** sin caché. Lo decidió el usuario. El efecto es inmediato y no hay invalidación que mantener. Una consulta proyectada por petición es asumible en una app interna.
- **Sí:** mismo mensaje que la expiración en el frontend. Lo decidió el usuario. Sin cambios en el router ni en el login.
- **Sí:** sin trato especial al Admin que se cambia a sí mismo. Lo decidió el usuario. Su siguiente petición da 401 y vuelve a entrar.
- **Sí:** el login rechaza con 403 un departamento inactivo. Es consecuencia directa de la regla: si no, el login emitiría un token que nunca sirve. El frontend muestra el texto fijo de 403 del login ("Tu usuario está inactivo. Contacta al administrador.").
- **Sí:** `defaultValueSql: "gen_random_uuid()"` solo en la migración. Da un sello distinto a cada usuario existente, y la configuración Fluent queda compatible con SQLite.
- **Sí:** `putJsonWithResponse` nuevo en `httpClient`. `putJson` no parsea la respuesta, y cambiar su firma afectaría a todas las features.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Al desplegar, todos los tokens emitidos antes no llevan `security_stamp` y reciben 401 | Es esperado: cada usuario vuelve a entrar una vez. El frontend lo trata como expiración. |
| Una consulta extra por petición autenticada | Consulta `AsNoTracking` por clave primaria con proyección. La caché queda fuera; se revisa si aparece carga. |
| Olvidar el claim nuevo en algún punto que emita tokens (register, login, cambio de contraseña) | Todos pasan por `JwtTokenGenerator.Generate`. Hay tests de integración tras el registro y tras cambiar la contraseña. |
| Comparar el rol como texto falla si cambia el nombre de un valor de `UserRole` | El claim ya se emite con `Role.ToString()`. Renombrar un rol invalidaría las sesiones, lo cual es aceptable. |
| La migración con `gen_random_uuid()` no funciona en SQLite | Los tests usan `EnsureCreated` y no ejecutan migraciones. Postgres 16 incluye `gen_random_uuid()`. |
| Un Admin se quita su propio rol y nadie más es Admin | Fuera de alcance; queda registrado para su propia spec. |
| El texto de 403 del login dice "usuario inactivo" cuando el inactivo es el departamento | Es aceptable para el MVP. Un mensaje propio queda fuera. |

## Lo que **no** entra en esta spec

- Refresh token y reducir la duración del JWT.
- Caché de la validación.
- Mensaje de "sesión revocada" distinto de la expiración.
- "Cerrar todas mis sesiones" o logout en servidor.
- Proteger al último Admin.

Cada uno, si llega, va en su propia spec.
