# SPEC 02 — Pantalla de registro

> **Estado:** aprobados
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-23
> **Objetivo:** Construir la pantalla `/register` según el diseño Stitch para crear una cuenta con `POST /api/auth/register`, iniciar sesión automáticamente y redirigir a `/dashboard`.

## Por qué existe esta spec

El backend ya permite registrarse, pero el frontend no tiene pantalla. `register` exige `departmentId` y un visitante anónimo no puede listar departamentos (`GET /api/departments` requiere token). Además `register` no devuelve `departmentId` ni `departmentName` (ADR-001 D5) y acepta departamentos inactivos.

## Alcance

**Dentro:**

- Ruta pública `/register` con dos columnas en `lg` o más: panel de marca a la izquierda y formulario a la derecha. En pantallas menores solo el formulario con cabecera compacta.
- `RegisterShowcase`: titular, descripción y la tarjeta "Aprovisionamiento Blindado" del diseño. Sin píldora SOC2 ni "256-bit TLS".
- Formulario: nombre completo, correo corporativo, contraseña con mostrar/ocultar, select de departamento, checkbox de términos (texto plano, sin enlaces) y botón "Crear cuenta".
- Validación en cliente antes de enviar (tabla en Modelo de datos).
- Carga de departamentos activos al montar el formulario.
- Estado de carga: botón deshabilitado y texto "Creando cuenta..." durante la petición.
- Mensajes de error fijos por código HTTP.
- Tras éxito: `saveSession(response, false)` (sessionStorage) y `navigate('/dashboard', { replace: true })`.
- Enlace "¿Ya tienes una cuenta? Iniciar sesión" en `/register` y "¿No tienes cuenta? Regístrate" en `/login`.
- API: endpoint anónimo `GET /api/departments/active`.
- API: `register` rechaza departamentos inactivos y devuelve `departmentId` y `departmentName`.

**Fuera de alcance (specs futuras):**

- Medidor de fuerza de contraseña.
- Campo "confirmar contraseña".
- Páginas de términos de uso y política de privacidad.
- Insignias SSO/ERP/SOC2, "SSO Ready" y header fijo del diseño.
- Verificación de correo o de dominio corporativo.
- Reglas de complejidad de contraseña en la API.
- Reintento de carga de departamentos.
- Tests nuevos de backend.
- `ProtectedRoute` real, logout, expiración, header `Authorization`, redirigir si ya hay sesión.

## Modelo de datos

Contrato HTTP en `src/features/auth/types.ts` (se agrega):

```ts
export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  departmentId: string
}

export interface DepartmentOption {
  id: string
  name: string
}
```

La respuesta de `register` reutiliza `AuthResponse` (ya existente).

DTO nuevo en la API, `ProcureFlow.Application/Departments/Dtos/DepartmentOptionDto.cs`:

```csharp
public class DepartmentOptionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
```

Validación en cliente:

| Campo | Regla | Mensaje |
| --- | --- | --- |
| Nombre completo | obligatorio (trim) | "El nombre completo es obligatorio." |
| Nombre completo | máx. 300 | "El nombre no puede tener más de 300 caracteres." |
| Correo | obligatorio, máx. 200, formato | mismos textos que `LoginForm` |
| Contraseña | obligatoria | "La contraseña es obligatoria." |
| Contraseña | mín. 8 | "La contraseña debe tener al menos 8 caracteres." |
| Departamento | obligatorio | "Selecciona un departamento." |
| Términos | marcado | "Debes aceptar los términos para continuar." |

Mensajes de error (`src/features/auth/registerErrors.ts`):

| Situación | Mensaje |
| --- | --- |
| 400 | "Revisa los datos ingresados." |
| 404 | "El departamento seleccionado no está disponible." |
| 409 | "Ya existe una cuenta con este correo." |
| 5xx u otro status | "Ocurrió un error inesperado. Intenta más tarde." |
| Error de red | "No se pudo conectar con el servidor. Intenta de nuevo." |

Estados del select de departamentos:

| Estado | UI |
| --- | --- |
| Cargando | select deshabilitado, "Cargando departamentos..." |
| Error | `Alert` "No se pudieron cargar los departamentos. Recarga la página." |
| Vacío | `Alert` "No hay departamentos disponibles. Contacta al administrador." |

En error o vacío, "Crear cuenta" queda deshabilitado.

## Plan de implementación

1. **Departamentos activos en la API.** Crear `DepartmentOptionDto`. Agregar `DepartmentUseCase.GetActive()` que devuelve solo `IsActive`, ordenados por nombre. En `DepartmentsController`, `[HttpGet("active")]` con `[AllowAnonymous]`. Verificar: `dotnet build` y `dotnet test` pasan.
2. **Register en la API.** En `AuthUseCase.RegisterCustomer`, buscar el departamento activo (`NotFoundException` si no existe o está inactivo) y llenar `DepartmentId` y `DepartmentName` en la respuesta. Actualizar ADR-001 D5 (se quita la limitación de `register`). Verificar: `dotnet test` pasa.
3. **Cliente HTTP.** Agregar `getJson<TResponse>(path)` en `src/shared/api/httpClient.ts`, con el mismo manejo de `ApiError` y `NetworkError`. Actualizar ADR-001 D3.
4. **Contratos y llamadas.** Agregar `RegisterRequest` y `DepartmentOption` en `types.ts`. Crear `src/features/auth/api/register.ts` (`register(request)`) y `src/features/auth/api/departments.ts` (`getActiveDepartments()`).
5. **Errores.** Crear `src/features/auth/registerErrors.ts` con `getRegisterErrorMessage(error)` según la tabla.
6. **Componente select.** Ejecutar `npx shadcn add select`. No crear equivalente propio.
7. **Panel de marca.** Crear `src/features/auth/components/RegisterShowcase.tsx` con iconos `lucide-react`. Visible solo desde `lg`.
8. **Formulario.** Crear `src/features/auth/components/RegisterForm.tsx` con `useState`, siguiendo el patrón de `LoginForm` (validación, toggle, `Alert`, estado de carga). Carga departamentos en `useEffect`.
9. **Página y ruta.** Crear `src/features/auth/pages/RegisterPage.tsx` que compone panel y formulario con cabecera compacta en móvil y enlace a `/login`. Registrar `/register` como ruta pública en `src/app/router.tsx`.
10. **Enlace en login.** Agregar "¿No tienes cuenta? Regístrate" en `LoginPage.tsx` con `Link` de React Router. Verificar: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `dotnet build` y `dotnet test` pasan.
- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] `GET /api/departments/active` sin token responde 200 y solo incluye departamentos activos con `id` y `name`.
- [ ] `GET /api/departments` sin token sigue respondiendo 401.
- [ ] `POST /api/auth/register` con un departamento inactivo responde 404.
- [ ] La respuesta de `register` incluye `departmentId` y `departmentName`.
- [ ] El select muestra los departamentos activos.
- [ ] Registro válido redirige a `/dashboard` y `sessionStorage['procureflow.session']` tiene el token con `departmentName`; `localStorage` no tiene la clave.
- [ ] Correo ya registrado muestra "Ya existe una cuenta con este correo." y no guarda sesión.
- [ ] Con la API apagada, se muestra el mensaje de error de red y "Crear cuenta" queda deshabilitado.
- [ ] Enviar con cualquier campo inválido muestra el error bajo ese campo y no llama a la API.
- [ ] Contraseña de 7 caracteres muestra "La contraseña debe tener al menos 8 caracteres.".
- [ ] Sin marcar términos no se envía el formulario.
- [ ] El botón queda deshabilitado mientras la petición está en curso.
- [ ] El botón de ojo alterna el `type` entre `password` y `text` y tiene `aria-label`.
- [ ] Cada campo tiene `label` asociado y los errores se enlazan con `aria-describedby`.
- [ ] `/login` enlaza a `/register` y `/register` enlaza a `/login`.
- [ ] Con ancho menor a 1024px el panel no se ve y no hay scroll horizontal a 375px.
- [ ] No hay medidor de fuerza, enlaces de términos ni insignias SSO/ERP/SOC2.

## Decisiones

- **Sí:** select de departamento. La API lo exige.
- **Sí:** endpoint nuevo `GET /api/departments/active` anónimo con `{ id, name }`. No expone inactivos ni cambia la seguridad del `GET` existente.
- **No:** `[AllowAnonymous]` en `GET /api/departments`. Expone todo, incluido `isActive`.
- **No:** `departmentId` opcional con valor por defecto. Cambia la regla de negocio.
- **Sí:** `register` rechaza departamentos inactivos con 404. Evita cuentas en departamentos dados de baja.
- **Sí:** auto-login tras registrarse y redirección a `/dashboard`.
- **Sí:** `register` devuelve `departmentId` y `departmentName`. La sesión queda igual que la del login.
- **Sí:** sesión en `sessionStorage`. No hay "Recordar sesión" en el registro.
- **Sí:** mínimo 8 caracteres solo en cliente.
- **No:** medidor de fuerza ni reglas de complejidad en la API.
- **Sí:** checkbox de términos obligatorio, sin enlaces. No existen páginas de términos.
- **No:** campo "confirmar contraseña". El diseño no lo tiene; el toggle de visibilidad cubre el error de tipeo.
- **Sí:** enlaces en ambos sentidos entre login y registro. Reemplaza el criterio de SPEC 01 que prohibía "Regístrate".
- **Sí:** error de carga de departamentos sin reintento.
- **Sí:** `RegisterShowcase` propio sin SOC2 ni TLS. Coherente con el login.
- **Sí:** estado React nativo y `getJson` propio. Sin dependencias nuevas salvo el componente shadcn `select`.
- **No:** tests nuevos de backend. Decisión del usuario; se verifica a mano.
- **No:** copiar el HTML de Stitch.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Endpoint anónimo revela nombres de departamentos | Solo `id` y `name` de activos. Aceptable para un portal interno. |
| `register` abierto permite crear cuentas Requester a cualquiera | Ya existe hoy. Revisar en una spec de verificación de dominio. |
| Sin tests, la regla de departamento inactivo puede romperse sin aviso | Criterios de aceptación manuales; candidata a test en spec futura. |
| Tests de integración existentes registran con departamento inactivo | Ejecutar `dotnet test` en el paso 2 y ajustar el seed si falla. |
| Ruta `active` choca con `{id:guid}` | La restricción `guid` evita el conflicto. |

## Lo que **no** entra en esta spec

- Medidor de fuerza, confirmar contraseña y reglas de complejidad.
- Términos de uso y privacidad.
- Verificación de correo o dominio.
- Guard de rutas, logout, expiración y header `Authorization`.
- Tests de backend nuevos.

Cada uno, si llega, va en su propia spec.
