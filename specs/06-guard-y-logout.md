# SPEC 06 — Guard de rutas y cierre de sesión

> **Estado:** aprobado
> **Depende de:** SPEC 01, SPEC 03
> **Fecha:** 2026-10-26
> **Objetivo:** Proteger las rutas privadas con la sesión real, incluida la expiración del JWT, y permitir cerrar sesión desde la cabecera.

## Por qué existe esta spec

`ProtectedRoute` es un placeholder con `isAuthenticated = true`: cualquier visitante entra a `/dashboard`. No existe logout, y un token vencido sigue en Web Storage hasta que la API responde 401. ADR-001 deja estos puntos pendientes (D6, D7). La API sigue siendo la autoridad; esta spec mejora la UX y evita pantallas rotas.

## Alcance

**Dentro:**

- `ProtectedRoute` real: deja pasar solo si hay sesión y el `exp` del JWT no venció.
- Sin sesión: redirige a `/login` con `state.from`.
- Token vencido o ilegible: borra la sesión y redirige a `/login` con `state.from` y `state.reason = 'expired'`.
- Logout desde un `DropdownMenu` de shadcn en `CurrentUser`, con la opción "Cerrar sesión". Sin confirmación.
- Logout borra la sesión de `localStorage` y `sessionStorage` y navega a `/login` con `replace`.
- Logout automático ante 401 en peticiones que llevaron token, mediante un handler registrado en `httpClient`.
- `/login` muestra el `Alert` "Tu sesión expiró. Inicia sesión de nuevo." cuando `state.reason === 'expired'`.
- Después del login se vuelve a `state.from` si es una ruta interna válida; si no, a `/dashboard`.
- `/login` y `/register` redirigen a `/dashboard` si ya hay una sesión válida.
- Actualizar ADR-001 (D6, D7 y Pendiente) y el `CLAUDE.md` del frontend.

**Fuera de alcance (specs futuras):**

- Refresh token y renovación de sesión.
- Timer que expulsa justo al vencer el token, y aviso previo a la expiración.
- Endpoint de logout o revocación en la API (el JWT es stateless).
- Cambiar dónde se guarda el token (Web Storage sigue siendo decisión de MVP).
- Sincronizar el logout entre pestañas (evento `storage`).
- Guard por rol (rutas solo para Admin o Approver).
- `Authorization` en `postJson`.
- Quitar los mensajes "Tu sesión expiró..." y los enlaces a `/login` de SPEC 03–05.
- Cambios en la API.

## Modelo de datos

No hay cambios en la API.

Nuevo en `src/features/auth/session.ts`:

```ts
// Borra procureflow.session de localStorage y sessionStorage.
export function clearSession(): void

// true si el token no tiene `exp` legible o si exp * 1000 <= now.
// Decodifica el payload base64url sin librerías; no valida la firma.
export function isTokenExpired(token: string, now?: number): boolean

// getSession() + isTokenExpired. Devuelve null si no hay sesión o venció.
export function getValidSession(): StoredSession | null
```

Nuevo en `src/shared/api/httpClient.ts`:

```ts
// Se llama cuando una petición con `Authorization` recibe 401. Uno solo; registrarlo de nuevo lo reemplaza.
export function setUnauthorizedHandler(handler: (() => void) | null): void
```

`request` invoca el handler antes de lanzar `ApiError(401)`, solo si la petición llevó el header `Authorization`. El `ApiError` se sigue lanzando.

Estado de navegación hacia `/login` (`src/features/auth/types.ts`):

```ts
export interface LoginLocationState {
  from?: { pathname: string; search?: string }
  reason?: 'expired'
}
```

Reglas de `from`:

- Válido solo si `pathname` empieza con `/`, no empieza con `//` y no es `/login` ni `/register`.
- Destino = `pathname + search`. Si no es válido, `/dashboard`.

Nuevos archivos:

| Archivo | Rol |
| --- | --- |
| `src/app/GuestRoute.tsx` | Envuelve `/login` y `/register`; con sesión válida redirige a `/dashboard`. |
| `src/components/ui/dropdown-menu.tsx` | Generado con `npx shadcn add dropdown-menu`. |

Textos:

| Lugar | Texto |
| --- | --- |
| Opción del menú | "Cerrar sesión" (icono `LogOut`) |
| Trigger del menú | `aria-label="Menú de usuario"` |
| `Alert` en `/login` | "Tu sesión expiró. Inicia sesión de nuevo." |

## Plan de implementación

1. **Sesión.** Agregar `clearSession`, `isTokenExpired` y `getValidSession` en `session.ts`. Agregar `LoginLocationState` en `types.ts`. Nada los usa todavía; `npm run build` pasa.
2. **Guard real.** `ProtectedRoute` usa `getSession()` e `isTokenExpired`. Sin sesión: `Navigate` a `/login` con `{ from }`. Vencida: `clearSession()` y `Navigate` con `{ from, reason: 'expired' }`. Quitar el comentario de placeholder.
3. **Volver a `from`.** `LoginForm` lee `location.state` como `LoginLocationState` y, tras el login, navega al destino según las reglas de `from`. `RegisterForm` no cambia.
4. **Aviso de expiración.** `LoginPage` muestra el `Alert` sobre `LoginForm` si `state.reason === 'expired'`.
5. **GuestRoute.** Crear `src/app/GuestRoute.tsx` con `getValidSession()`. En `router.tsx`, envolver `/login` y `/register`.
6. **Handler 401.** En `httpClient` agregar `setUnauthorizedHandler` y la llamada en `request`. En `router.tsx`, después de `createBrowserRouter`, registrar un handler que: si la ruta actual no es `/login`, llama `clearSession()` y `router.navigate('/login', { replace: true, state: { from, reason: 'expired' } })`.
7. **Menú de usuario.** Ejecutar `npx shadcn add dropdown-menu`. En `CurrentUser`, el avatar y el nombre pasan a ser el trigger. El menú tiene "Cerrar sesión", que llama `clearSession()` y `navigate('/login', { replace: true })`.
8. **Documentación.** ADR-001: D6 y D7 pasan a Implementada para guard, logout y expiración; actualizar la lista Pendiente. `web/procureflow-web/CLAUDE.md`: actualizar "Estado actual". Verificar: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] Sin sesión, abrir `/dashboard` redirige a `/login` sin el aviso de expiración.
- [ ] Sin sesión, abrir `/purchases` y luego iniciar sesión lleva a `/purchases`.
- [ ] Iniciar sesión entrando directo a `/login` lleva a `/dashboard`.
- [ ] Con un `state.from` de `/login` o `//evil.com`, el login lleva a `/dashboard`.
- [ ] Con un token cuyo `exp` ya pasó, abrir `/dashboard` borra `procureflow.session` de los dos almacenamientos y muestra `/login` con "Tu sesión expiró. Inicia sesión de nuevo.".
- [ ] Con un token ilegible (no es JWT), abrir `/dashboard` se comporta igual que con un token vencido.
- [ ] Recargar `/login` después del aviso ya no muestra el aviso.
- [ ] Con sesión válida, abrir `/login` o `/register` redirige a `/dashboard`.
- [ ] Hacer clic en el avatar o nombre de la cabecera abre un menú con "Cerrar sesión".
- [ ] El menú se abre con teclado (Enter/Espacio) y se cierra con Esc.
- [ ] "Cerrar sesión" borra la clave de `localStorage` y de `sessionStorage` y muestra `/login` sin aviso.
- [ ] Después de cerrar sesión, el botón Atrás del navegador no vuelve a mostrar el dashboard.
- [ ] Si la API responde 401 a una petición con token (por ejemplo, token manipulado en storage), se borra la sesión y se muestra `/login` con el aviso.
- [ ] Credenciales incorrectas en `/login` siguen mostrando el mensaje de SPEC 01 y no activan el handler 401.
- [ ] Varios 401 simultáneos en el dashboard producen una sola navegación a `/login`.
- [ ] Los dashboards de Requester, Approver y Admin se ven igual que en SPEC 03–05.
- [ ] No hay dependencias npm nuevas aparte de los archivos generados por shadcn.

## Decisiones

- **Sí:** el guard revisa la sesión y el `exp` del JWT. Evita entrar con un token muerto. Decisión del usuario.
- **Sí:** decodificar el payload sin librería. Solo se lee `exp`; la firma la valida la API.
- **Sí:** un token sin `exp` legible cuenta como vencido. Un token roto no sirve para la API.
- **No:** timer hasta `exp`. Más código y casos borde (pestañas, suspensión); el 401 cubre el resto. Decisión del usuario.
- **Sí:** logout en un `DropdownMenu` de `CurrentUser`. Patrón estándar; shadcn antes de componentes propios. Decisión del usuario.
- **No:** ítem en el sidebar o botón suelto en la cabecera.
- **No:** confirmación al cerrar sesión. Es reversible iniciando sesión de nuevo. Decisión del usuario.
- **Sí:** logout solo en el cliente. La API no tiene logout y el JWT es stateless.
- **Sí:** handler 401 en `httpClient` registrado desde `app/`. Un solo punto; `shared` no importa de `features`. Decisión del usuario.
- **Sí:** el handler solo actúa si la petición llevó `Authorization`. El 401 de credenciales incorrectas en el login no es una sesión vencida.
- **No:** manejar el 401 en cada feature. Repite código en dashboard, decidir y cancelar.
- **Sí:** el motivo viaja en el router state. URL limpia; el aviso desaparece al recargar. Decisión del usuario.
- **No:** query string `?expired=1`.
- **Sí:** volver a `state.from` tras el login, validado como ruta interna. Evita open redirect. Decisión del usuario.
- **Sí:** `GuestRoute` para `/login` y `/register`. Pendiente de ADR-001. Decisión del usuario.
- **Sí:** mantener los mensajes "Tu sesión expiró..." de SPEC 03–05. Respaldo si el handler no navega; cero cambios en specs anteriores. Decisión del usuario.
- **No:** sincronizar el logout entre pestañas. La otra pestaña se expulsa con el próximo 401 o al navegar.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Reloj del cliente desfasado: token válido marcado como vencido o al revés | La API (`ClockSkew = 0`) es la autoridad; el 401 corrige el caso "parece válido". |
| Varios 401 a la vez disparan varias navegaciones | El handler no hace nada si la ruta actual ya es `/login`. |
| `state.from` manipulado para redirigir fuera de la app | Reglas de `from`: solo rutas que empiezan con `/` y no con `//`. |
| El handler 401 se dispara durante el login | Solo actúa si la petición llevó `Authorization`; `postJson` no lo envía. |
| Cambiar `CurrentUser` rompe la cabecera en móvil | El trigger mantiene el mismo contenido; criterio de dashboards sin cambios. |

## Lo que **no** entra en esta spec

- Refresh token, timer de expiración y aviso previo.
- Logout en la API y revocación de tokens.
- Cambiar el almacenamiento del token.
- Logout sincronizado entre pestañas.
- Guard por rol.
- `Authorization` en `postJson`.
- Quitar los mensajes de sesión de SPEC 03–05.

Cada uno, si llega, va en su propia spec.
