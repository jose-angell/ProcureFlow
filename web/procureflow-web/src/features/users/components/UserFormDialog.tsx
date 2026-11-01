import { useId, useState, type SyntheticEvent } from 'react'
import {
  Building2,
  Check,
  CircleAlert,
  IdCard,
  Info,
  Lock,
  Mail,
  ShieldCheck,
  UserPen,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserRole } from '@/features/auth/types'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import type { Department } from '@/features/departments/types'
import FormDialogHeader from '@/shared/components/FormDialogHeader'
import FormFieldLabel from '@/shared/components/FormFieldLabel'
import IconInput from '@/shared/components/IconInput'
import { activateUser, createUser, deactivateUser, updateUser } from '../api/users'
import {
  getUserCreatedMessage,
  getUserErrorMessage,
  getUserUpdatedMessage,
  type UserOperation,
} from '../userErrors'
import { USER_ROLE_INFO, USER_ROLES_ORDER } from '../userRoles'
import type { User } from '../types'

const FULL_NAME_MAX_LENGTH = 150
const EMAIL_MAX_LENGTH = 200
const PASSWORD_MIN_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ActiveValue = 'active' | 'inactive'

const STATUS_OPTIONS: { value: ActiveValue; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

const ROLE_OPTIONS = USER_ROLES_ORDER.map((role) => ({
  value: String(role),
  label: USER_ROLE_INFO[role].selectLabel,
}))

// Mismo fondo y borde que `IconInput`, para los selectores que llevan icono.
const ICON_SELECT_TRIGGER_CLASS = 'w-full border-[#dce9ff] bg-[#eff4ff]'
const ICON_SELECT_ICON_CLASS = 'size-4 text-muted-foreground'

interface FieldErrors {
  email?: string
  password?: string
}

interface UserFormDialogProps {
  /** Usuario a editar; `null` para crear uno nuevo. */
  user: User | null
  /** Todos los departamentos; el selector muestra solo los activos. */
  departments: Department[]
  /** Error al cargar los departamentos, o `null` si no hubo. */
  departmentsError: unknown
  /** Usuario de la sesión: en su modal Rol y Estado están deshabilitados. */
  currentUserId: string | undefined
  /** Se llama con el mensaje de éxito; el padre cierra el diálogo y recarga. */
  onSaved: (message: string) => void
  /** `hasFailed` indica que hubo un error: la lista pudo cambiar y conviene recargarla. */
  onClose: (hasFailed: boolean) => void
}

/**
 * Modal de crear y editar. Se monta abierto y el padre lo desmonta al cerrarlo,
 * así cada apertura empieza con el formulario limpio.
 */
function UserFormDialog({
  user,
  departments,
  departmentsError,
  currentUserId,
  onSaved,
  onClose,
}: UserFormDialogProps) {
  const fullNameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const statusId = useId()
  const departmentId = useId()
  const roleId = useId()
  const isEditing = user !== null
  const isSelf = isEditing && user.id === currentUserId

  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<ActiveValue>(user?.isActive === false ? 'inactive' : 'active')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(
    user?.departmentId ?? null,
  )
  const [role, setRole] = useState<UserRole>(user?.role ?? UserRole.Requester)
  // Si el PUT sale bien y el PATCH falla, al reintentar no se repite el PUT.
  const [isDataSaved, setIsDataSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [failure, setFailure] = useState<{ error: unknown; operation: UserOperation } | null>(null)

  const trimmedFullName = fullName.trim()
  const trimmedEmail = email.trim()

  // Solo activos; si el usuario está en un departamento inactivo, ese también aparece.
  const departmentOptions = departments
    .filter((department) => department.isActive || department.id === user?.departmentId)
    .map((department) => ({ value: department.id, label: department.name }))

  const fieldErrors: FieldErrors = {}
  if (trimmedEmail !== '' && !EMAIL_PATTERN.test(trimmedEmail)) {
    fieldErrors.email = 'Ingresa un correo válido.'
  }
  if (password !== '' && password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = 'La contraseña debe tener al menos 8 caracteres.'
  }

  const dataChanged =
    isEditing &&
    (trimmedFullName !== user.fullName ||
      trimmedEmail !== user.email ||
      role !== user.role ||
      selectedDepartmentId !== user.departmentId ||
      password !== '')
  const statusChanged = isEditing && status !== (user.isActive ? 'active' : 'inactive')

  const hasRequired =
    trimmedFullName !== '' &&
    trimmedEmail !== '' &&
    selectedDepartmentId !== null &&
    (isEditing || password !== '')
  const canSave =
    hasRequired &&
    departmentsError === null &&
    (!isEditing || dataChanged || statusChanged)

  function handleOpenChange(nextOpen: boolean) {
    // Mientras la petición está en curso el diálogo no se puede cerrar.
    if (!nextOpen && !isSaving) onClose(failure !== null)
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave || isSaving || selectedDepartmentId === null) return

    if (fieldErrors.email || fieldErrors.password) {
      setShowErrors(true)
      return
    }

    setIsSaving(true)
    setFailure(null)
    let operation: UserOperation = 'save'

    try {
      if (!isEditing) {
        await createUser({
          fullName: trimmedFullName,
          email: trimmedEmail,
          password,
          departmentId: selectedDepartmentId,
          role,
        })
        onSaved(getUserCreatedMessage(trimmedFullName))
        return
      }

      if (dataChanged && !isDataSaved) {
        await updateUser(user.id, {
          fullName: trimmedFullName,
          email: trimmedEmail,
          password: password === '' ? null : password,
          departmentId: selectedDepartmentId,
          role,
        })
        setIsDataSaved(true)
      }

      if (statusChanged) {
        operation = 'status'
        await (status === 'active' ? activateUser(user.id) : deactivateUser(user.id))
      }

      onSaved(getUserUpdatedMessage(trimmedFullName))
    } catch (error) {
      setFailure({ error, operation })
    } finally {
      setIsSaving(false)
    }
  }

  // Al crear va en la fila del correo; al editar, en fila completa al final.
  const passwordField = (
    <div className="space-y-1.5">
      <FormFieldLabel htmlFor={passwordId} required={!isEditing}>
        {isEditing ? 'Nueva contraseña' : 'Contraseña'}
      </FormFieldLabel>
      <IconInput
        icon={Lock}
        id={passwordId}
        type="password"
        value={password}
        maxLength={500}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        disabled={isSaving}
        required={!isEditing}
        aria-invalid={showErrors && fieldErrors.password ? true : undefined}
        aria-describedby={
          showErrors && fieldErrors.password
            ? `${passwordId}-error`
            : isEditing
              ? `${passwordId}-help`
              : undefined
        }
        onChange={(event) => setPassword(event.target.value)}
      />
      {isEditing && (
        <p id={`${passwordId}-help`} className="text-xs text-muted-foreground">
          Déjala vacía para conservar la actual.
        </p>
      )}
      {showErrors && fieldErrors.password && (
        <p id={`${passwordId}-error`} className="text-xs text-destructive">
          {fieldErrors.password}
        </p>
      )}
    </div>
  )

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[#131b2e]/40 supports-backdrop-filter:backdrop-blur-sm"
        className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-xl"
      >
        <FormDialogHeader
          icon={isEditing ? UserPen : UserPlus}
          title={isEditing ? 'Editar usuario' : 'Crear nuevo usuario'}
          badge={isEditing ? 'Edición' : 'Nuevo'}
          description="Configura los datos del usuario, su rol y su departamento."
          onClose={() => onClose(failure !== null)}
          closeDisabled={isSaving}
        />

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 p-6">
            {failure && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>
                  {getUserErrorMessage(failure.error, failure.operation)}
                  {isSessionError(failure.error) && (
                    <>
                      {' '}
                      <Link to="/login">Iniciar sesión</Link>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {departmentsError !== null && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>
                  {getUserErrorMessage(departmentsError, 'load')}
                  {isSessionError(departmentsError) && (
                    <>
                      {' '}
                      <Link to="/login">Iniciar sesión</Link>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <FormFieldLabel htmlFor={fullNameId} required>
                Nombre completo
              </FormFieldLabel>
              <IconInput
                icon={IdCard}
                id={fullNameId}
                value={fullName}
                maxLength={FULL_NAME_MAX_LENGTH}
                placeholder="ej. Carlos Mendoza"
                disabled={isSaving}
                autoFocus
                required
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FormFieldLabel htmlFor={emailId} required>
                  Correo electrónico
                </FormFieldLabel>
                <IconInput
                  icon={Mail}
                  id={emailId}
                  type="email"
                  value={email}
                  maxLength={EMAIL_MAX_LENGTH}
                  placeholder="ejemplo@empresa.com"
                  disabled={isSaving}
                  required
                  aria-invalid={showErrors && fieldErrors.email ? true : undefined}
                  aria-describedby={showErrors && fieldErrors.email ? `${emailId}-error` : undefined}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {showErrors && fieldErrors.email && (
                  <p id={`${emailId}-error`} className="text-xs text-destructive">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-1.5">
                  <FormFieldLabel htmlFor={statusId}>Estado</FormFieldLabel>
                  <Select
                    items={STATUS_OPTIONS}
                    value={status}
                    disabled={isSaving || isSelf}
                    onValueChange={(value) => setStatus((value ?? 'active') as ActiveValue)}
                  >
                    <SelectTrigger id={statusId} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                passwordField
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FormFieldLabel htmlFor={departmentId} required>
                  Departamento
                </FormFieldLabel>
                <Select
                  items={departmentOptions}
                  value={selectedDepartmentId}
                  disabled={isSaving}
                  onValueChange={setSelectedDepartmentId}
                >
                  <SelectTrigger id={departmentId} className={ICON_SELECT_TRIGGER_CLASS}>
                    <Building2 aria-hidden="true" className={ICON_SELECT_ICON_CLASS} />
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <FormFieldLabel htmlFor={roleId} required>
                  Rol
                </FormFieldLabel>
                <Select
                  items={ROLE_OPTIONS}
                  value={String(role)}
                  disabled={isSaving || isSelf}
                  onValueChange={(value) => setRole(Number(value ?? UserRole.Requester) as UserRole)}
                >
                  <SelectTrigger id={roleId} className={ICON_SELECT_TRIGGER_CLASS}>
                    <ShieldCheck aria-hidden="true" className={ICON_SELECT_ICON_CLASS} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEditing && passwordField}

            <div
              aria-live="polite"
              className="flex items-start gap-2 rounded-lg border border-[#dce9ff] bg-[#eff4ff] p-3 text-xs text-foreground"
            >
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-secondary" />
              <p>{USER_ROLE_INFO[role].description}</p>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-b-2xl px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onClose(failure !== null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSave || isSaving}>
              <Check aria-hidden="true" />
              {isSaving ? 'Guardando...' : 'Guardar usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UserFormDialog
