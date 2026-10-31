# ProcureFlow Frontend

## Stack
- React + TypeScript
- Vite
- shadcn/ui + Tailwind CSS
- React Router

## Arquitectura
- Organización por funcionalidades.
- Componentes base shadcn en src/components/ui.
- Componentes reutilizables propios en src/shared.
- Lógica específica dentro de src/features.

## TypeScript
- Definir tipos explícitos para contratos HTTP.
- Evitar el uso innecesario de any.
- Utilizar .tsx para componentes React.
- Utilizar .ts para lógica y tipos sin JSX.

## UI
- Usar componentes shadcn antes de crear equivalentes.
- Respetar las referencias visuales de Stitch.
- No copiar HTML estático como implementación final.
- Mantener componentes accesibles y responsive.

## Desarrollo con IA
- Leer la especificación antes de implementar.
- Proponer un plan técnico y esperar aprobación.
- Implementar tareas pequeñas y verificables.
- No agregar dependencias sin justificar su necesidad.
- Ejecutar la verificación de TypeScript y build.

## API y sesión
- La URL base viene de `VITE_API_URL`; las llamadas pasan por `src/shared/api/httpClient.ts` (`ApiError`, `NetworkError`). No usar `fetch` directo en las features.
- Los mensajes de error se fijan por status HTTP en el frontend; no mostrar `detail` del ProblemDetails.
- La sesión se guarda con `features/auth/session.ts` bajo `procureflow.session` (`localStorage` si "Recordar sesión", si no `sessionStorage`) y se lee con `getSession()`.
- Para llamadas autenticadas, la feature obtiene el token de `getSession()` y lo pasa a `getJson(path, { token })`. `shared` no importa de `features`.
- `UserRole` debe coincidir con `ProcureFlow.Domain/Enums/UserRole.cs`.
- `ProtectedRoute` exige sesión con token no vencido (`isTokenExpired`); `GuestRoute` saca de `/login` y `/register` a quien ya tiene sesión. El logout está en el menú de `CurrentUser` (`clearSession()`).
- Una petición con `Authorization` que recibe 401 dispara el handler de `setUnauthorizedHandler` (registrado en `app/router.tsx`): borra la sesión y lleva a `/login` con `state.reason = 'expired'`. El destino tras el login sale de `state.from`.
- Estado actual: `Authorization` se envía en `getJson`, `postJson`, `patch`, `patchJson`, `put`, `putJson` y `deleteRequest` cuando se pasa `token`; login y registro llaman a `postJson` sin token. `/departments` y `/users` solo son para Admin y `/purchases` solo para Requester y Admin, `/approvals` solo para Approver y Admin: la página redirige a `/dashboard` si el rol no corresponde (no hay guard por rol genérico). El almacenamiento en Web Storage es una decisión de MVP, no final.
- Detalle y pendientes: `../../docs/decisions/ADR-001-auth-api.md`.
