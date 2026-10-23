# SPEC 01 — Pantalla de login

> **Estado:** implementado
> **Depende de:** ninguna
> **Fecha:** 2026-10-22
> **Objetivo:** Construir la pantalla `/login` según el diseño Stitch para autenticar contra `POST /api/auth/login` y guardar la sesión en el navegador.

## Por qué existe esta spec

Hoy `LoginPage` es un placeholder y el frontend no puede llamar a la API. La API no tiene CORS. Esta spec habilita la primera llamada real al backend y deja la sesión guardada. La protección de rutas queda para otra spec.

## Alcance

**Dentro:**

- Pantalla `/login` con dos columnas en `lg` o más: panel de marca a la izquierda y formulario a la derecha. En pantallas menores solo se ve el formulario, con cabecera compacta de marca.
- Panel izquierdo con los textos estáticos del diseño: titular, descripción y las dos tarjetas de ejemplo (orden aprobada y métrica de ciclo).
- Formulario con correo, contraseña con botón mostrar/ocultar, checkbox "Recordar sesión" y botón "Iniciar sesión".
- Validación en cliente antes de enviar: correo obligatorio, formato válido, máximo 200 caracteres. Contraseña obligatoria.
- Estado de carga: botón deshabilitado y texto "Iniciando sesión..." mientras la petición está en curso.
- Mensajes de error fijos por código HTTP.
- Guardado de la sesión en `localStorage` o `sessionStorage` según el checkbox.
- Redirección a `/dashboard` tras login exitoso.
- Política CORS en la API configurable con `Cors:AllowedOrigins`.
- URL base de la API por variable `VITE_API_URL`.
- Tokens de marca en `index.css` y tipografías Inter + Plus Jakarta Sans.

**Fuera de alcance (specs futuras):**

- `ProtectedRoute` real: sigue con `isAuthenticated = true`.
- Logout.
- Expiración del token y renovación.
- Redirigir fuera de `/login` si ya hay sesión.
- Enviar el token en otras peticiones (header `Authorization`).
- Recuperación de contraseña, registro y SSO/SAML.
- Insignias SOC-2, SSO, SAML, "Sesión protegida" y pie con versión.
- `JsonStringEnumConverter` en la API.
- Modo oscuro del login.

## Modelo de datos

Contrato HTTP en `src/features/auth/types.ts`:

```ts
export const UserRole = { Admin: 1, Requester: 2, Approver: 3 } as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  userId: string
  fullName: string
  email: string
  role: UserRole
  departmentId: string
  departmentName: string | null
}
```

Sesión guardada en `src/features/auth/session.ts`:

```ts
export interface StoredSession {
  accessToken: string
  user: Omit<AuthResponse, 'accessToken'>
}
```

Convenciones:

- Clave de almacenamiento: `procureflow.session`, valor JSON de `StoredSession`.
- "Recordar sesión" marcado: `localStorage`. Desmarcado: `sessionStorage`.
- Al guardar, se borra la clave en el otro almacenamiento. Nunca hay dos sesiones a la vez.
- `UserRole` es un objeto `as const` y no un `enum`, porque `tsconfig.app.json` usa `erasableSyntaxOnly`.
- Los valores de `UserRole` copian `ProcureFlow.Domain/Enums/UserRole.cs`.

Mensajes de error (`src/features/auth/loginErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| 400 | "Revisa los datos ingresados." |
| 401 | "Correo o contraseña incorrectos." |
| 403 | "Tu usuario está inactivo. Contacta al administrador." |
| 5xx u otro status | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Configuración nueva en la API:

```json
"Cors": { "AllowedOrigins": [ "http://localhost:5173" ] }
```

## Plan de implementación

1. **CORS en la API.** En `ProcureFlow.Api/DependencyInjection.cs`, leer `Cors:AllowedOrigins` como `string[]` y registrar la política `"Frontend"` con esos orígenes, cualquier header y cualquier método. En `Program.cs`, llamar `app.UseCors("Frontend")` antes de `UseAuthentication`. Agregar `"Cors": { "AllowedOrigins": [] }` en `appsettings.json` y `["http://localhost:5173"]` en `appsettings.Development.json`. Verificar: `dotnet build` y `dotnet test` pasan.
2. **Variable de entorno.** Crear `web/procureflow-web/.env.example` y `.env.development` con `VITE_API_URL=http://localhost:5285`. Crear `src/vite-env.d.ts` que tipa `VITE_API_URL`. Verificar: `npm run build` pasa.
3. **Cliente HTTP.** Crear `src/shared/api/httpClient.ts` con `postJson<TBody, TResponse>(path, body)` sobre `fetch`. Lanza `ApiError` con `status` si la respuesta no es 2xx. Lanza `NetworkError` si `fetch` falla. Sin dependencias nuevas.
4. **Contrato y llamada.** Crear `src/features/auth/types.ts` y `src/features/auth/api/login.ts` con `login(request): Promise<AuthResponse>`.
5. **Sesión y errores.** Crear `src/features/auth/session.ts` con `saveSession(response, remember)`. Crear `src/features/auth/loginErrors.ts` con `getLoginErrorMessage(error)` según la tabla.
6. **Tema y fuentes.** Instalar `@fontsource-variable/inter` y `@fontsource-variable/plus-jakarta-sans`. Quitar `@fontsource-variable/geist`. En `index.css`: `--font-sans` usa Inter, `--font-heading` usa Plus Jakarta Sans. Ajustar `--primary`, `--secondary`, `--ring` y `--destructive` a la paleta del diseño (navy `#131b2e`, azul `#0051d5`, error `#ba1a1a`). Agregar el token `--brand-panel` para el panel izquierdo.
7. **Componentes shadcn.** Ejecutar `npx shadcn add input label checkbox alert`. No crear equivalentes propios.
8. **Panel de marca.** Crear `src/features/auth/components/LoginShowcase.tsx` con los textos estáticos e iconos `lucide-react`. Visible solo desde `lg`.
9. **Formulario.** Crear `src/features/auth/components/LoginForm.tsx` con `useState`, validación en cliente, toggle de contraseña, checkbox, estado de carga y `Alert` de error. En éxito: `saveSession` y `navigate('/dashboard', { replace: true })`.
10. **Página.** Reescribir `src/features/auth/pages/LoginPage.tsx` para componer `LoginShowcase` y `LoginForm`, con cabecera compacta en móvil. Verificar: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `dotnet build` y `dotnet test` pasan.
- [x] `npm run lint` y `npm run build` pasan sin errores.
- [x] Con la API corriendo en `http://localhost:5285`, el login desde `http://localhost:5173` no da error CORS en consola.
- [x] Credenciales válidas redirigen a `/dashboard`.
- [x] Con "Recordar sesión" marcado, `localStorage['procureflow.session']` tiene el token y `sessionStorage` no tiene la clave.
- [x] Con "Recordar sesión" desmarcado, `sessionStorage['procureflow.session']` tiene el token y `localStorage` no tiene la clave.
- [x] Contraseña incorrecta muestra "Correo o contraseña incorrectos." y no guarda sesión.
- [x] Usuario inactivo muestra "Tu usuario está inactivo. Contacta al administrador.".
- [x] Con la API apagada, se muestra "No se pudo conectar con el servidor. Intenta de nuevo.".
- [x] Enviar con correo vacío o mal formado muestra error bajo el campo y no llama a la API.
- [x] El botón queda deshabilitado mientras la petición está en curso.
- [x] El botón de ojo alterna el `type` del input entre `password` y `text`, y tiene `aria-label`.
- [x] Cada input tiene un `label` asociado por `htmlFor`.
- [x] Con ancho menor a 1024px, el panel izquierdo no se ve y no hay scroll horizontal a 375px.
- [x] No hay enlaces "¿Olvidaste tu contraseña?" ni "Regístrate" en la pantalla.

## Decisiones

- **Sí:** CORS con `Cors:AllowedOrigins` + `VITE_API_URL`. Sirve igual en producción. Sigue el patrón de `Jwt` y `ConnectionStrings`.
- **No:** proxy de Vite. Solo resuelve desarrollo.
- **Sí:** checkbox decide entre `localStorage` y `sessionStorage`. Da función real al control del diseño.
- **Sí:** spec limitada a la pantalla de login. Guard, logout y expiración van en otra spec.
- **Sí:** redirección fija a `/dashboard`. Sin guard real, `state.from` nunca llega.
- **Sí:** `UserRole` numérico en TS (`Admin = 1`, `Requester = 2`, `Approver = 3`). No cambia el contrato de la API.
- **No:** `JsonStringEnumConverter`. Cambia todas las respuestas y puede romper tests de integración.
- **Sí:** estado React nativo para el formulario. Dos campos no justifican dependencias.
- **No:** react-hook-form + zod.
- **Sí:** mensajes fijos por status. El frontend controla el texto.
- **No:** mostrar `detail` del ProblemDetails.
- **Sí:** Inter + Plus Jakarta Sans vía `@fontsource-variable`. Fieles al diseño. Reemplazan a Geist.
- **Sí:** iconos `lucide-react` en lugar de Material Symbols. Ya está instalado.
- **Sí:** se conserva el panel visual. Se quitan enlaces e insignias que prometen funciones inexistentes.
- **No:** copiar el HTML de Stitch. Se rehace con componentes shadcn.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Token en `localStorage` expuesto ante XSS | React escapa el contenido. Sin `dangerouslySetInnerHTML`. Revisar en la spec de sesión. |
| `UseHttpsRedirection` redirige a HTTPS y rompe el preflight CORS | Usar el perfil `http` de `launchSettings.json`. `VITE_API_URL` apunta a `http://localhost:5285`. |
| `UserRole` del frontend se desalinea del enum del dominio | Comentario en `types.ts` que apunta a `ProcureFlow.Domain/Enums/UserRole.cs`. |
| Cambiar tokens de `index.css` altera `Button` y otras pantallas | Solo se ajustan `--primary`, `--secondary`, `--ring`, `--destructive`. Revisar `/dashboard` tras el cambio. |
| No hay usuarios semilla para probar | Crear un usuario con `POST /api/auth/register` antes de la prueba manual. |

## Lo que **no** entra en esta spec

- `ProtectedRoute` real, logout y expiración de sesión.
- Header `Authorization` en otras peticiones.
- Recuperación de contraseña, registro y SSO.
- Insignias de cumplimiento y pie corporativo.
- Cambio de serialización de enums en la API.

Cada uno, si llega, va en su propia spec.
