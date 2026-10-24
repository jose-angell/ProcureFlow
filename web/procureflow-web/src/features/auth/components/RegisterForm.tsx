import { useEffect, useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  Building2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getActiveDepartments } from '../api/departments'
import { register } from '../api/register'
import { getRegisterErrorMessage } from '../registerErrors'
import { saveSession } from '../session'
import type { DepartmentOption } from '../types'

const FULL_NAME_MAX_LENGTH = 300
const EMAIL_MAX_LENGTH = 200
const PASSWORD_MIN_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  fullName?: string
  email?: string
  password?: string
  departmentId?: string
  terms?: string
}

type DepartmentsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: DepartmentOption[] }

function validate(
  fullName: string,
  email: string,
  password: string,
  departmentId: string | null,
  acceptedTerms: boolean,
): FieldErrors {
  const errors: FieldErrors = {}

  if (!fullName) {
    errors.fullName = 'El nombre completo es obligatorio.'
  } else if (fullName.length > FULL_NAME_MAX_LENGTH) {
    errors.fullName = 'El nombre no puede tener más de 300 caracteres.'
  }

  if (!email) {
    errors.email = 'El correo electrónico es obligatorio.'
  } else if (email.length > EMAIL_MAX_LENGTH) {
    errors.email = 'El correo no puede tener más de 200 caracteres.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'El formato del correo electrónico no es válido.'
  }

  if (!password) {
    errors.password = 'La contraseña es obligatoria.'
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  }

  if (!departmentId) {
    errors.departmentId = 'Selecciona un departamento.'
  }

  if (!acceptedTerms) {
    errors.terms = 'Debes aceptar los términos para continuar.'
  }

  return errors
}

function RegisterForm() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<DepartmentsState>({
    status: 'loading',
  })

  useEffect(() => {
    let cancelled = false

    getActiveDepartments()
      .then((items) => {
        if (!cancelled) setDepartments({ status: 'ready', items })
      })
      .catch(() => {
        if (!cancelled) setDepartments({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const departmentItems =
    departments.status === 'ready' ? departments.items : []
  const hasNoDepartments =
    departments.status === 'ready' && departmentItems.length === 0
  const canSubmit =
    departments.status === 'ready' && !hasNoDepartments && !isSubmitting

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    const trimmedFullName = fullName.trim()
    const trimmedEmail = email.trim()
    const errors = validate(
      trimmedFullName,
      trimmedEmail,
      password,
      departmentId,
      acceptedTerms,
    )
    setFieldErrors(errors)
    setSubmitError(null)

    if (Object.keys(errors).length > 0 || !departmentId) return

    setIsSubmitting(true)

    try {
      const response = await register({
        fullName: trimmedFullName,
        email: trimmedEmail,
        password,
        departmentId,
      })
      saveSession(response, false)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setSubmitError(getRegisterErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Nombre completo</Label>
        <div className="relative">
          <User
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="ej. Carlos Mendoza"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-invalid={fieldErrors.fullName ? true : undefined}
            aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
            className="h-11 pl-11"
          />
        </div>
        {fieldErrors.fullName && (
          <p id="fullName-error" className="text-xs text-destructive">
            {fieldErrors.fullName}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico corporativo</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ejemplo@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className="h-11 pl-11"
          />
        </div>
        {fieldErrors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña de acceso</Label>
        <div className="relative">
          <KeyRound
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className="h-11 px-11"
          />
          <button
            type="button"
            aria-label="Mostrar u ocultar contraseña"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4.5" />
            ) : (
              <Eye aria-hidden="true" className="size-4.5" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="departmentId">Departamento</Label>
        <div className="relative">
          <Building2
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Select
            name="departmentId"
            items={departmentItems.map((department) => ({
              value: department.id,
              label: department.name,
            }))}
            value={departmentId}
            onValueChange={setDepartmentId}
            disabled={departments.status !== 'ready' || hasNoDepartments}
          >
            <SelectTrigger
              id="departmentId"
              aria-invalid={fieldErrors.departmentId ? true : undefined}
              aria-describedby={
                fieldErrors.departmentId ? 'departmentId-error' : undefined
              }
              className="h-11 w-full pl-11"
            >
              <SelectValue
                placeholder={
                  departments.status === 'loading'
                    ? 'Cargando departamentos...'
                    : 'Selecciona un departamento'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {departmentItems.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {fieldErrors.departmentId && (
          <p id="departmentId-error" className="text-xs text-destructive">
            {fieldErrors.departmentId}
          </p>
        )}
      </div>

      {departments.status === 'error' && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            No se pudieron cargar los departamentos. Recarga la página.
          </AlertDescription>
        </Alert>
      )}

      {hasNoDepartments && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            No hay departamentos disponibles. Contacta al administrador.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label className="cursor-pointer items-start gap-2.5 font-normal text-muted-foreground select-none">
          <Checkbox
            name="terms"
            checked={acceptedTerms}
            onCheckedChange={setAcceptedTerms}
            aria-invalid={fieldErrors.terms ? true : undefined}
            aria-describedby={fieldErrors.terms ? 'terms-error' : undefined}
          />
          <span className="leading-snug">
            Acepto los términos de uso y la política de privacidad aplicables a
            las compras corporativas y gestión de compras de la organización.
          </span>
        </Label>
        {fieldErrors.terms && (
          <p id="terms-error" className="text-xs text-destructive">
            {fieldErrors.terms}
          </p>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit} className="h-11 w-full">
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        {!isSubmitting && <ArrowRight aria-hidden="true" />}
      </Button>

      {submitError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}

export default RegisterForm
