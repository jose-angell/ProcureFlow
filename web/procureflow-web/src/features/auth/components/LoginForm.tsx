import { useState, type SyntheticEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ArrowRight, CircleAlert, Eye, EyeOff, KeyRound, Mail } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '../api/login'
import { getLoginErrorMessage } from '../loginErrors'
import { saveSession } from '../session'
import type { LoginLocationState } from '../types'

const EMAIL_MAX_LENGTH = 200
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  email?: string
  password?: string
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}

  if (!email) {
    errors.email = 'El correo electrónico es obligatorio.'
  } else if (email.length > EMAIL_MAX_LENGTH) {
    errors.email = 'El correo no puede tener más de 200 caracteres.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'El formato del correo electrónico no es válido.'
  }

  if (!password) {
    errors.password = 'La contraseña es obligatoria.'
  }

  return errors
}

const DEFAULT_DESTINATION = '/dashboard'
const AUTH_PATHS = ['/login', '/register']

/** Destino tras el login: `from` solo si es una ruta interna que no sea de autenticación. */
function getDestination(state: LoginLocationState | null): string {
  const from = state?.from
  if (
    !from ||
    typeof from.pathname !== 'string' ||
    !from.pathname.startsWith('/') ||
    from.pathname.startsWith('//') ||
    AUTH_PATHS.includes(from.pathname)
  ) {
    return DEFAULT_DESTINATION
  }

  return from.pathname + (typeof from.search === 'string' ? from.search : '')
}

function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedEmail = email.trim()
    const errors = validate(trimmedEmail, password)
    setFieldErrors(errors)
    setSubmitError(null)

    if (errors.email || errors.password) return

    setIsSubmitting(true)

    try {
      const response = await login({ email: trimmedEmail, password })
      saveSession(response, remember)
      navigate(getDestination(location.state as LoginLocationState | null), {
        replace: true,
      })
    } catch (error) {
      setSubmitError(getLoginErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
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
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <KeyRound
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••••"
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

      <Label className="w-fit cursor-pointer gap-2.5 font-normal text-muted-foreground select-none">
        <Checkbox
          name="remember-me"
          checked={remember}
          onCheckedChange={setRemember}
        />
        Recordar sesión
      </Label>

      <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
        {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
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

export default LoginForm
