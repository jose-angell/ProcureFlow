# ADR-001 — Comunicación frontend ↔ API y autenticación

> **Estado:** Aceptado (parcialmente implementado)
> **Fecha:** 2026-10-23
> **Origen:** `specs/01-pantalla-login.md` (SPEC 01 — Login)
> **Alcance:** `web/procureflow-web` y `ProcureFlow.Api`

Cada decisión indica si está **Implementada**, **Parcial** o **Pendiente**. Las decisiones marcadas como "MVP" son temporales y deben revisarse antes de producción.

---

## D1. URL de la API por `VITE_API_URL` — Implementada

- **Contexto:** el frontend (Vite, `:5173`) y la API (`:5285`) corren en orígenes distintos.
- **Decisión:** el frontend lee la URL base de `import.meta.env.VITE_API_URL`. Existen `.env.example` y `.env.development` (`http://localhost:5285`); `src/vite-env.d.ts` tipa la variable.
- **Justificación:** funciona igual en desarrollo y producción. Se descartó el proxy de Vite porque solo resuelve desarrollo.
- **Consecuencias:** el cliente HTTP antepone la variable a cada `path`.
- **Limitaciones:** Vite fija el valor al compilar; cada entorno necesita su propio build. En local hay que usar el perfil `http` de `launchSettings.json`, porque `UseHttpsRedirection` redirige y rompe el preflight CORS.

## D2. CORS con política `"Frontend"` y `Cors:AllowedOrigins` — Implementada

- **Contexto:** sin CORS el navegador bloquea las llamadas del frontend.
- **Decisión:** `ProcureFlow.Api/DependencyInjection.cs` lee `Cors:AllowedOrigins` (`string[]`) y registra la política `"Frontend"` (esos orígenes, cualquier header, cualquier método). `Program.cs` llama `UseCors("Frontend")` antes de `UseAuthentication`. `appsettings.json` la deja vacía; `appsettings.Development.json` permite `http://localhost:5173`.
- **Justificación:** sigue el patrón de `Jwt` y `ConnectionStrings` y se puede sobrescribir por variable de entorno (`Cors__AllowedOrigins__0`).
- **Consecuencias:** con la lista vacía ningún origen está permitido.
- **Limitaciones:** no usa credenciales/cookies. Los orígenes de producción no están definidos.

## D3. Cliente HTTP propio sobre `fetch` — Parcial

- **Contexto:** el login necesitaba una llamada JSON sin añadir dependencias.
- **Decisión:** `src/shared/api/httpClient.ts` expone `getJson`, `postJson`, `patch`, `patchJson`, `putJson` y `deleteRequest` (sobre un helper común), `ApiError` (con `status`) para respuestas no 2xx y `NetworkError` cuando `fetch` falla. Todos aceptan `{ token }` opcional y, si se pasa, envían `Authorization: Bearer <token>` (SPEC 03, SPEC 07). El token lo entrega quien llama; `shared` no importa de `features`.
- **Justificación:** suficiente para el alcance actual; sin axios ni librerías de datos.
- **Consecuencias:** las features distinguen "la API respondió con error" de "no hubo conexión".
- **Limitaciones / pendiente:** el cliente solo envía el token si quien llama lo pasa (ver D6). El login y el registro llaman a `postJson` sin token a propósito.

## D4. Errores: mensajes fijos por status — Implementada (solo login)

- **Contexto:** la API devuelve ProblemDetails mapeados por `GlobalExceptionHandler` (400/401/403/404/409/500).
- **Decisión:** `features/auth/loginErrors.ts` traduce el status a un texto fijo en español (400, 401, 403, 5xx/otros, error de red). No se muestra `detail`.
- **Justificación:** el frontend controla el texto y no filtra mensajes internos.
- **Consecuencias:** el frontend depende de los códigos HTTP, no de los textos del backend. Cambiar el tipo de excepción en un use case cambia el mensaje visible.
- **Limitaciones:** el mapeo es específico del login; otras features necesitarán el suyo.

## D5. Autenticación con JWT — Backend implementado, frontend parcial

- **Contexto:** `POST /api/auth/login` (anónimo) devuelve `AuthResponse` con `accessToken`.
- **Decisión:** token HS256 con claims `NameIdentifier`, `Email`, `Name` y `Role`; vigencia `Jwt:ExpirationMinutes` (60) y `ClockSkew = 0`. Sin refresh token. El contrato del frontend está en `features/auth/types.ts`; `UserRole` es un objeto `as const` numérico (`Admin=1, Requester=2, Approver=3`) que copia `ProcureFlow.Domain/Enums/UserRole.cs`. No se usa `JsonStringEnumConverter`.
- **Justificación:** no cambia el contrato existente de la API ni los tests de integración.
- **Consecuencias:** hay que mantener `UserRole` sincronizado a mano entre dominio y frontend.
- **Limitaciones:** el `role` del JSON es numérico y el claim del token es texto. `register` exige un departamento activo (404 si no existe o está inactivo) y devuelve `departmentId` y `departmentName`, igual que `login` (SPEC 02). El `SecretKey` de `appsettings.json` es solo de desarrollo; en producción debe venir de `Jwt__SecretKey`.

## D6. Sesión en Web Storage — Implementada (MVP)

- **Contexto:** hay que conservar el token tras el login.
- **Decisión:** `features/auth/session.ts` guarda `StoredSession` (`accessToken` + `user`) bajo la clave `procureflow.session`. "Recordar sesión" marcado → `localStorage`; desmarcado → `sessionStorage`. Al guardar se borra la clave del otro almacenamiento.
- **Justificación:** da función real al checkbox del diseño sin añadir dependencias.
- **Consecuencias:** el token es legible desde JavaScript.
- **Limitaciones (decisión temporal de MVP, no definitiva):** cualquier XSS podría robar el token. La mitigación actual es solo no usar `dangerouslySetInnerHTML`. Debe reevaluarse antes de producción en la spec de sesión.
- **Lectura (SPEC 03):** `getSession()` lee `localStorage` y luego `sessionStorage`; devuelve `null` si no hay sesión o el JSON es inválido. Las llamadas del dashboard envían `Authorization: Bearer` mediante `getJson(path, { token })`.
- **Expiración y logout (SPEC 06):** `session.ts` añade `clearSession()` (borra la clave de los dos almacenamientos), `isTokenExpired(token)` (lee `exp` del payload sin validar la firma; un token ilegible o sin `exp` cuenta como vencido) y `getValidSession()`. El logout vive en un `DropdownMenu` de `CurrentUser` y solo borra la sesión en el cliente: la API no tiene logout y el JWT es stateless.
- **401 automático (SPEC 06):** `httpClient` expone `setUnauthorizedHandler`. Se invoca cuando una petición que llevó `Authorization` recibe 401; `app/router.tsx` registra un handler que borra la sesión y navega a `/login` con `state.reason = 'expired'`. Sin token el 401 no lo activa (credenciales incorrectas en el login). El `ApiError(401)` se sigue lanzando, por lo que los mensajes de SPEC 03–05 se mantienen como respaldo.
- **Token en todos los métodos (SPEC 07):** `postJson` y los métodos nuevos `putJson` y `deleteRequest` aceptan `{ token }` igual que `getJson`.

## D7. Separación de responsabilidades — Implementada

- **Decisión:** la API es la autoridad: roles con `[Authorize(Roles=...)]` y autorización contextual en los use cases. El frontend solo ofrece UX (validación previa, textos, redirecciones) y no se considera una barrera de seguridad.
- **Guard (SPEC 06):** `ProtectedRoute` deja pasar solo con sesión guardada y token no vencido; si no, redirige a `/login` con `state.from` (y `reason: 'expired'` si el token venció, borrando la sesión). `GuestRoute` envuelve `/login` y `/register` y redirige a `/dashboard` con sesión válida. Tras el login se vuelve a `state.from` si es una ruta interna (empieza con `/`, no con `//`, y no es `/login` ni `/register`); si no, a `/dashboard`.
- **Consecuencias:** el guard comprueba la sesión al navegar. Si el token vence con la página abierta, la sesión se cierra con el siguiente 401 de la API, no antes.
- **Limitaciones:** el guard lee el `exp` del cliente sin validar la firma, así que no es una barrera de seguridad. No hay guard por rol genérico: `/departments` (SPEC 07) redirige a `/dashboard` desde la propia página si el rol no es Admin.

---

## Pendiente (cada punto requiere su propia spec)

- Renovación del token (refresh) y aviso previo a la expiración. El cierre por expiración ya existe (SPEC 06).
- Sincronizar el logout entre pestañas.
- Guard por rol.
- Revisar dónde se almacena el token (D6) antes de producción.
- Definir `Cors:AllowedOrigins`, `VITE_API_URL` y `Jwt:SecretKey` de producción.
