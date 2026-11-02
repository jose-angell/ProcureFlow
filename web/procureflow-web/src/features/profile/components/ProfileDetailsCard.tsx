import { useId, useState, type SyntheticEvent } from 'react'
import { Building2, CircleAlert, CircleCheck, IdCard, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateSessionUser } from '@/features/auth/session'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { USER_ROLE_INFO } from '@/features/users/userRoles'
import FormFieldLabel from '@/shared/components/FormFieldLabel'
import IconInput from '@/shared/components/IconInput'
import { updateMyProfile } from '../api/profile'
import { getProfileErrorMessage, PROFILE_SAVED_MESSAGE } from '../profileErrors'
import type { MyProfile } from '../types'

const FULL_NAME_MAX_LENGTH = 150
const EMAIL_MAX_LENGTH = 200
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

interface ProfileDetailsCardProps {
  /** Valores guardados en la API; "Descartar" vuelve a ellos. */
  profile: MyProfile
  /** Se llama con los valores ya guardados (sin espacios sobrantes). */
  onSaved: (changes: { fullName: string; email: string }) => void
}

/** Tarjeta "Datos personales": nombre y correo editables; departamento y rol de solo lectura. */
function ProfileDetailsCard({ profile, onSaved }: ProfileDetailsCardProps) {
  const fullNameId = useId()
  const emailId = useId()
  const fullNameErrorId = useId()
  const emailErrorId = useId()

  const [fullName, setFullName] = useState(profile.fullName)
  const [email, setEmail] = useState(profile.email)
  const [isSaving, setIsSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)

  const trimmedFullName = fullName.trim()
  const trimmedEmail = email.trim()
  const roleInfo = USER_ROLE_INFO[profile.role]

  let fullNameError: string | undefined
  if (trimmedFullName === '') fullNameError = 'Ingresa tu nombre.'

  let emailError: string | undefined
  if (trimmedEmail === '') emailError = 'Ingresa tu correo electrónico.'
  else if (!EMAIL_PATTERN.test(trimmedEmail)) emailError = 'Ingresa un correo válido.'

  const hasChanges = trimmedFullName !== profile.fullName || trimmedEmail !== profile.email

  function handleChange(setter: (value: string) => void, value: string) {
    setter(value)
    setIsSaved(false)
  }

  function handleDiscard() {
    setFullName(profile.fullName)
    setEmail(profile.email)
    setShowErrors(false)
    setIsSaved(false)
    setFailure(null)
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || !hasChanges) return

    setShowErrors(true)
    if (fullNameError || emailError) return

    setIsSaving(true)
    setFailure(null)
    setIsSaved(false)

    try {
      await updateMyProfile({ fullName: trimmedFullName, email: trimmedEmail })
    } catch (error) {
      setFailure(error)
      setIsSaving(false)
      return
    }

    updateSessionUser({ fullName: trimmedFullName, email: trimmedEmail })
    setFullName(trimmedFullName)
    setEmail(trimmedEmail)
    setShowErrors(false)
    setIsSaved(true)
    setIsSaving(false)
    onSaved({ fullName: trimmedFullName, email: trimmedEmail })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Datos personales</CardTitle>
        <CardDescription>Actualiza tu nombre y el correo vinculado a tu cuenta.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4 rounded-xl bg-[#eff4ff] p-4">
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#131b2e] font-heading text-xl font-bold text-white"
          >
            {getInitials(profile.fullName)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-heading font-semibold">{profile.fullName}</span>
            <span className="truncate text-sm text-muted-foreground">{profile.email}</span>
            <span className="text-xs font-semibold text-secondary">{roleInfo.selectLabel}</span>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          {failure !== null && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                {getProfileErrorMessage(failure, 'save')}
                {isSessionError(failure) && (
                  <>
                    {' '}
                    <Link to="/login">Iniciar sesión</Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <FormFieldLabel htmlFor={fullNameId} required>
                Nombre completo
              </FormFieldLabel>
              <IconInput
                id={fullNameId}
                icon={IdCard}
                value={fullName}
                maxLength={FULL_NAME_MAX_LENGTH}
                autoComplete="name"
                disabled={isSaving}
                aria-required="true"
                aria-invalid={showErrors && !!fullNameError}
                aria-describedby={showErrors && fullNameError ? fullNameErrorId : undefined}
                onChange={(event) => handleChange(setFullName, event.target.value)}
              />
              {showErrors && fullNameError && (
                <p id={fullNameErrorId} className="text-xs text-destructive">
                  {fullNameError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <FormFieldLabel htmlFor={emailId} required>
                Correo electrónico
              </FormFieldLabel>
              <IconInput
                id={emailId}
                icon={Mail}
                type="email"
                value={email}
                maxLength={EMAIL_MAX_LENGTH}
                autoComplete="email"
                disabled={isSaving}
                aria-required="true"
                aria-invalid={showErrors && !!emailError}
                aria-describedby={showErrors && emailError ? emailErrorId : undefined}
                onChange={(event) => handleChange(setEmail, event.target.value)}
              />
              {showErrors && emailError && (
                <p id={emailErrorId} className="text-xs text-destructive">
                  {emailError}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-xl bg-[#eff4ff] p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  Departamento asignado
                </span>
                <Lock aria-hidden="true" className="size-4" />
              </div>
              <div className="flex items-center gap-2">
                <Building2 aria-hidden="true" className="size-5 text-secondary" />
                <span className="text-sm font-semibold">{profile.departmentName ?? '—'}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Lo gestiona el administrador del sistema.
              </span>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl bg-[#eff4ff] p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold tracking-wider uppercase">Rol</span>
                <ShieldCheck aria-hidden="true" className="size-4" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={roleInfo.badgeVariant}>{roleInfo.label}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{roleInfo.description}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p role="status" className="flex items-center gap-2 text-sm text-[#005137]">
              {isSaved && (
                <>
                  <CircleCheck aria-hidden="true" className="size-4" />
                  {PROFILE_SAVED_MESSAGE}
                </>
              )}
            </p>
            <div className="ml-auto flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving || !hasChanges}
                onClick={handleDiscard}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={isSaving || !hasChanges}>
                {isSaving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default ProfileDetailsCard
