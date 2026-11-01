# SPEC 12 — Diseño de los modales de usuario y departamento

> **Estado:** implementado
> **Depende de:** SPEC 07, SPEC 08
> **Fecha:** 2026-10-31
> **Objetivo:** Rediseñar los modales de crear y editar usuario y departamento para que se parezcan a `design/userModal.html` y `design/departmentModa.html`, con piezas compartidas y sin cambiar su comportamiento.

## Por qué existe esta spec

SPEC 07 y SPEC 08 implementaron los modales con el `Dialog` de shadcn sin estilo propio. El resultado es estrecho (`sm:max-w-sm`), de una columna, con cabecera plana y fondo casi transparente. Las referencias de Stitch muestran cabecera con icono en recuadro y borde inferior, etiquetas en mayúsculas, inputs con icono, dos columnas y fondo oscuro con desenfoque. Esta spec solo cambia la presentación.

## Alcance

**Dentro:**

- Prop opcional `overlayClassName` en `DialogContent` (`src/components/ui/dialog.tsx`). Sin la prop, el fondo no cambia.
- Componentes compartidos nuevos en `src/shared/components/`: `FormDialogHeader`, `FormFieldLabel` e `IconInput`.
- `UserFormDialog` y `DepartmentFormDialog` usan esas piezas, ancho `sm:max-w-xl`, fondo oscuro y la X propia de la cabecera.
- Modal de usuario a dos columnas desde `sm`, una columna en móvil.
- Badge "Nuevo" o "Edición" junto al título.
- Asterisco rojo en campos obligatorios.
- Opciones de rol con nombre en español: "Requester (Solicitante)", "Approver (Aprobador)", "Admin (Administrador)".
- Recuadro de rol y botones del pie con el estilo de la referencia.

**Fuera de alcance (specs futuras):**

- Campos Código y Descripción del departamento (no existen en la API).
- Estado al crear usuario o departamento.
- `AlertDialog` de eliminar (`DeleteUserButton`, `DeleteDepartmentButton`).
- Modales de solicitudes (`PurchaseRequestFormDialog`) y aprobaciones (`DecisionDialog`).
- Cambiar el fondo por defecto de todos los `Dialog`.
- Textos de la referencia: "Gestionar Usuario", "Corporativo", "(RBAC)", "Activo (Acceso habilitado)".
- Cambios de lógica, validación, peticiones o mensajes de error.

## Modelo de datos

Esta feature no introduce datos nuevos. Reusa los tipos de SPEC 07 y SPEC 08.

### `dialog.tsx`

`DialogContent` acepta `overlayClassName?: string` y lo pasa a `DialogOverlay` con `cn`. Valor por defecto: ninguno.

Fondo de los dos modales: `bg-[#131b2e]/40 supports-backdrop-filter:backdrop-blur-sm`.

### Componentes compartidos

| Archivo | Props | Qué pinta |
| --- | --- | --- |
| `src/shared/components/FormDialogHeader.tsx` | `icon: LucideIcon`, `title: string`, `badge: string`, `description: string`, `onClose: () => void`, `closeDisabled: boolean` | Recuadro 40×40 `rounded-xl` con el icono en `text-secondary`; `DialogTitle` (`font-heading`, 20px, semibold) con badge al lado; `DialogDescription`; botón X (`aria-label="Cerrar"`); borde inferior. |
| `src/shared/components/FormFieldLabel.tsx` | `htmlFor: string`, `required?: boolean`, `children` | `Label` en mayúsculas, 11px, semibold, `tracking-wider`; asterisco `text-destructive` con `aria-hidden` si `required`. |
| `src/shared/components/IconInput.tsx` | `icon: LucideIcon` + props de `Input` | `Input` con icono a la izquierda (`pl-9`), fondo `#eff4ff` y borde `#dce9ff`. |

Para los `Select` con icono, el icono va como hijo de `SelectTrigger`, antes de `SelectValue`, con las mismas clases de fondo y borde.

`DialogContent` de ambos modales:

- `showCloseButton={false}`: la X la pone `FormDialogHeader`.
- Sin padding propio: cabecera `px-6 py-5`, cuerpo `p-6`, pie con borde superior.
- `sm:max-w-xl`, `rounded-2xl`, `max-h-[90vh] overflow-y-auto`.

### Modal de usuario

| Fila | Crear | Editar |
| --- | --- | --- |
| Cabecera | Icono `UserPlus`, "Crear nuevo usuario", badge "Nuevo" | Icono `UserPen`, "Editar usuario", badge "Edición" |
| 1 (completa) | Nombre completo * (`IdCard`) | igual |
| 2 (dos columnas) | Correo electrónico * (`Mail`) \| Contraseña * (`Lock`) | Correo electrónico * (`Mail`) \| Estado |
| 3 (dos columnas) | Departamento * (`Building2`) \| Rol * (`ShieldCheck`) | igual |
| 4 (completa) | — | Nueva contraseña (`Lock`) y ayuda "Déjala vacía para conservar la actual." |
| 5 | Recuadro de rol: fondo `#eff4ff`, borde `#dce9ff`, icono `Info` en `text-secondary`, texto 12px | igual |
| Pie | "Cancelar" (outline) y "Guardar usuario" (primario con `Check`) | igual |

Descripción: "Configura los datos del usuario, su rol y su departamento." (sin cambios).

Etiquetas de rol en el `Select`: se añade `selectLabel` en `USER_ROLE_INFO` (`src/features/users/userRoles.ts`). Tabla y filtros siguen usando `label`.

| Rol | `label` | `selectLabel` |
| --- | --- | --- |
| Requester | Requester | Requester (Solicitante) |
| Approver | Approver | Approver (Aprobador) |
| Admin | Admin | Admin (Administrador) |

### Modal de departamento

| Fila | Crear | Editar |
| --- | --- | --- |
| Cabecera | Icono `Building2`, "Crear nuevo departamento", badge "Nuevo" | Icono `Building2`, "Editar departamento", badge "Edición" |
| Descripción | "Registra una nueva unidad organizativa de la empresa." | "Actualiza el nombre o el estado del departamento." |
| 1 | Nombre del departamento * (`Building`) | igual |
| 2 | — | Estado |
| Pie | "Cancelar" y "Guardar departamento" | igual |

### Lo que no cambia

- Estado, validaciones, `canSave`, peticiones, `aria-*`, `autoFocus` y mensajes.
- Alerts de error dentro del modal (arriba del cuerpo).
- Mientras guarda, la X también está deshabilitada y Esc no cierra.

## Plan de implementación

1. **Overlay.** Añadir `overlayClassName` a `DialogContent`. Los modales actuales se ven igual.
2. **Piezas compartidas.** Crear `FormDialogHeader`, `FormFieldLabel` e `IconInput`. Nada los usa todavía.
3. **Modal de departamento.** Aplicar cabecera, etiquetas, `IconInput`, ancho, fondo y pie. Comprobar crear y editar.
4. **Etiquetas de rol.** Añadir `selectLabel` a `USER_ROLE_INFO` y usarlo en `ROLE_OPTIONS`.
5. **Modal de usuario.** Aplicar las piezas y la distribución a dos columnas de la tabla anterior.
6. **Verificación.** `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `npm run lint` y `npm run build` pasan.
- [x] Los modales de solicitudes y aprobaciones se ven igual que antes (mismo fondo, ancho y X).
- [x] Ambos modales miden hasta `max-w-xl` y el fondo es azul marino translúcido con desenfoque.
- [x] La cabecera muestra icono en recuadro, título, badge "Nuevo" al crear o "Edición" al editar, descripción, X y borde inferior.
- [x] Hay una sola X por modal; cierra igual que "Cancelar".
- [x] Mientras guarda, la X está deshabilitada.
- [x] Las etiquetas están en mayúsculas y los obligatorios llevan asterisco rojo.
- [x] El asterisco no lo lee el lector de pantalla (`aria-hidden`).
- [x] Nombre, correo, contraseña y nombre de departamento tienen icono a la izquierda.
- [x] Departamento y Rol muestran icono dentro del selector.
- [x] A ≥ 640px, crear usuario muestra Correo | Contraseña y Departamento | Rol en dos columnas.
- [x] A ≥ 640px, editar usuario muestra Correo | Estado, Departamento | Rol y "Nueva contraseña" en fila completa.
- [x] A 375px todos los campos están en una columna y no hay scroll horizontal.
- [x] El selector de rol muestra "Requester (Solicitante)", "Approver (Aprobador)" y "Admin (Administrador)".
- [x] La tabla y el filtro de usuarios siguen mostrando "Requester", "Approver" y "Admin".
- [x] El modal de departamento no tiene Código ni Descripción, y Estado solo aparece al editar.
- [x] Crear y editar usuario y departamento envían las mismas peticiones que antes.
- [x] Los errores de validación y de API se muestran como antes.
- [x] Ambos modales se usan solo con teclado; el foco inicial sigue en el primer campo.
- [x] No hay dependencias npm nuevas.

## Decisiones

- **Sí:** piezas compartidas en `src/shared/components`. Evita duplicar estilos y sirve a futuros modales. Decisión del usuario.
- **No:** cambiar el estilo base de `dialog.tsx`. Afectaría a los modales de solicitudes y aprobaciones.
- **No:** estilos sueltos en cada modal. Duplicación.
- **Sí:** prop opcional `overlayClassName`. Fondo oscuro solo donde se pide. Decisión del usuario.
- **No:** fondo oscuro para todos los `Dialog`. Fuera de alcance.
- **Sí:** dos columnas adaptadas: Contraseña al crear y Estado al editar en la fila del correo. Decisión del usuario.
- **No:** Estado al crear. La API crea activo; dos peticiones podrían quedar a medias (SPEC 08).
- **Sí:** modal de departamento con los mismos campos que hoy. Código y Descripción no existen en la API. Decisión del usuario.
- **Sí:** títulos actuales con badge "Nuevo"/"Edición", asteriscos y roles con nombre en español. Decisión del usuario.
- **No:** copiar textos de la referencia ("Gestionar Usuario", "Corporativo", "(RBAC)").
- **Sí:** `selectLabel` aparte de `label`. La tabla y los filtros conservan las etiquetas cortas.
- **Sí:** iconos `lucide-react`, no Material Symbols. Ya es la librería del proyecto.
- **Sí:** colores de Stitch como valores hex en clases (`#eff4ff`, `#dce9ff`, `#131b2e`), como ya hace el recuadro de rol. Sin tokens nuevos en `index.css`.
- **No:** copiar el HTML de Stitch. Se usan componentes shadcn.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Quitar la X de shadcn y poner otra rompe el cierre o el foco | La X propia llama a `onClose`, como "Cancelar". Criterio de teclado en la verificación. |
| El icono dentro de `SelectTrigger` desalinea el valor | Icono con `shrink-0` antes de `SelectValue`; revisión visual en crear y editar. |
| Las etiquetas en mayúsculas cambian el nombre accesible | `uppercase` es CSS; el texto del `Label` no cambia. |

## Lo que **no** entra en esta spec

- Código y Descripción del departamento.
- Estado al crear.
- `AlertDialog` de eliminar.
- Modales de solicitudes y aprobaciones.
- Cambios de lógica o de API.

Cada uno, si llega, va en su propia spec.
