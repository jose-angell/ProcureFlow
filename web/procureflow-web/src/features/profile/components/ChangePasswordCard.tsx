import { useState, type SyntheticEvent } from 'react'
import { BadgeCheck, CircleAlert, CircleCheck, KeyRound, Lock, LockKeyhole, Shield } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { replaceSessionToken } from '@/features/auth/session'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { changeMyPassword } from '../api/profile'
import { getProfileErrorMessage, PASSWORD_UPDATED_MESSAGE } from '../profileErrors'
import PasswordField from './PasswordField'
import PasswordStrengthMeter from './PasswordStrengthMeter'

const PASSWORD_MIN_LENGTH = 8

/** Tarjeta "Actualizar contraseña". Al terminar bien limpia los campos y la sesión sigue activa. */
function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)

  let currentError: string | undefined
  if (currentPassword === '') currentError = 'Ingresa tu contraseña actual.'

  let newError: string | undefined
  if (newPassword === '') newError = 'Ingresa la nueva contraseña.'
  else if (newPassword.length < PASSWORD_MIN_LENGTH) {
    newError = 'La nueva contraseña debe tener al menos 8 caracteres.'
  } else if (newPassword === currentPassword) {
    newError = 'La nueva contraseña debe ser distinta de la actual.'
  }

  let confirmError: string | undefined
  if (confirmPassword === '') confirmError = 'Confirma la nueva contraseña.'
  else if (confirmPassword !== newPassword) confirmError = 'Las contraseñas no coinciden.'

  function handleChange(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setIsUpdated(false)
    }
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return

    setShowErrors(true)
    if (currentError || newError || confirmError) return

    setIsSaving(true)
    setFailure(null)
    setIsUpdated(false)

    try {
      const response = await changeMyPassword({ currentPassword, newPassword })
      // El token anterior ya no vale: se guarda el nuevo para no perder la sesión.
      replaceSessionToken(response)
    } catch (error) {
      setFailure(error)
      setIsSaving(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowErrors(false)
    setIsUpdated(true)
    setIsSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between font-heading text-xl">
          Actualizar contraseña
          <Shield aria-hidden="true" className="size-5 text-muted-foreground" />
        </CardTitle>
        <CardDescription>Usa una contraseña de al menos 8 caracteres.</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          {failure !== null && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                {getProfileErrorMessage(failure, 'password')}
                {isSessionError(failure) && (
                  <>
                    {' '}
                    <Link to="/login">Iniciar sesión</Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="max-w-lg">
            <PasswordField
              label="Contraseña actual"
              icon={KeyRound}
              value={currentPassword}
              onChange={handleChange(setCurrentPassword)}
              autoComplete="current-password"
              disabled={isSaving}
              error={showErrors ? currentError : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PasswordField
              label="Nueva contraseña"
              icon={Lock}
              value={newPassword}
              onChange={handleChange(setNewPassword)}
              autoComplete="new-password"
              disabled={isSaving}
              error={showErrors ? newError : undefined}
            >
              <PasswordStrengthMeter password={newPassword} />
            </PasswordField>

            <PasswordField
              label="Confirmar nueva contraseña"
              icon={BadgeCheck}
              value={confirmPassword}
              onChange={handleChange(setConfirmPassword)}
              autoComplete="new-password"
              disabled={isSaving}
              error={showErrors ? confirmError : undefined}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p role="status" className="flex items-center gap-2 text-sm text-[#005137]">
              {isUpdated && (
                <>
                  <CircleCheck aria-hidden="true" className="size-4" />
                  {PASSWORD_UPDATED_MESSAGE}
                </>
              )}
            </p>
            <Button type="submit" disabled={isSaving} className="ml-auto">
              <LockKeyhole aria-hidden="true" />
              {isSaving ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default ChangePasswordCard
