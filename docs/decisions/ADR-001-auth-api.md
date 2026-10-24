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
- **Decisión:** `src/shared/api/httpClient.ts` expone `getJson` y `postJson` (sobre un helper común), `ApiError` (con `status`) para respuestas no 2xx y `NetworkError` cuando `fetch` falla. `getJson` acepta `{ token }` opcional y, si se pasa, envía `Authorization: Bearer <token>` (SPEC 03). El token lo entrega quien llama; `shared` no importa de `features`.
- **Justificación:** suficiente para el alcance actual; sin axios ni librerías de datos.
- **Consecuencias:** las features distinguen "la API respondió con error" de "no hubo conexión".
- **Limitaciones / pendiente:** solo existen `getJson` y `postJson`. Faltan otros métodos. `postJson` aún no envía el token y `getJson` solo lo envía si quien llama lo pasa (ver D6).

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

## D6. Sesión en Web Storage — Guardado implementado; resto pendiente (MVP)

- **Contexto:** hay que conservar el token tras el login.
- **Decisión:** `features/auth/session.ts` guarda `StoredSession` (`accessToken` + `user`) bajo la clave `procureflow.session`. "Recordar sesión" marcado → `localStorage`; desmarcado → `sessionStorage`. Al guardar se borra la clave del otro almacenamiento.
- **Justificación:** da función real al checkbox del diseño sin añadir dependencias.
- **Consecuencias:** el token es legible desde JavaScript.
- **Limitaciones (decisión temporal de MVP, no definitiva):** cualquier XSS podría robar el token. La mitigación actual es solo no usar `dangerouslySetInnerHTML`. Debe reevaluarse antes de producción en la spec de sesión.
- **Lectura (SPEC 03):** `getSession()` lee `localStorage` y luego `sessionStorage`; devuelve `null` si no hay sesión o el JSON es inválido. Las llamadas del dashboard envían `Authorization: Bearer` mediante `getJson(path, { token })`.
- **Pendiente:** enviar el token en otros métodos (`postJson`), detectar expiración, logout.

## D7. Separación de responsabilidades — Implementada como principio

- **Decisión:** la API es la autoridad: roles con `[Authorize(Roles=...)]` y autorización contextual en los use cases. El frontend solo ofrece UX (validación previa, textos, redirección fija a `/dashboard`) y no se considera una barrera de seguridad.
- **Consecuencias:** `ProtectedRoute` sigue siendo un placeholder (`isAuthenticated = true`); hoy cualquier visitante accede a las rutas protegidas del frontend. La API sigue validando cada petición.
- **Limitaciones:** hasta implementar el guard real, no hay protección de rutas en cliente.

---

## Pendiente (cada punto requiere su propia spec)

- `ProtectedRoute` real leyendo la sesión.
- Logout.
- Expiración y renovación del token.
- Header `Authorization` en `postJson` y métodos HTTP adicionales (`getJson` ya lo admite).
- Redirigir fuera de `/login` si ya hay sesión.
- Revisar dónde se almacena el token (D6) antes de producción.
- Definir `Cors:AllowedOrigins`, `VITE_API_URL` y `Jwt:SecretKey` de producción.
