import { useEffect, useState } from 'react'
import { CircleAlert, CircleUser } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { getMyProfile } from '../api/profile'
import ProfileDetailsCard from '../components/ProfileDetailsCard'
import { getProfileErrorMessage } from '../profileErrors'
import type { MyProfile } from '../types'

type ProfileState = { profile: MyProfile } | { error: unknown }

/** Pantalla de perfil: la ve cualquier usuario con sesión, sea cual sea su rol. */
function ProfilePage() {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<ProfileState | null>(null)

  useEffect(() => {
    let cancelled = false

    getMyProfile()
      .then((profile) => {
        if (!cancelled) setState({ profile })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ error })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const profile = state && 'profile' in state ? state.profile : null
  const error = state && 'error' in state ? state.error : null

  function handleRetry() {
    setState(null)
    setReloadKey((key) => key + 1)
  }

  function handleSaved(changes: { fullName: string; email: string }) {
    setState((current) =>
      current && 'profile' in current ? { profile: { ...current.profile, ...changes } } : current,
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Configuración de la cuenta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona tu información personal, correo electrónico y credenciales de acceso a
          ProcureFlow.
        </p>
      </div>

      <div className="inline-flex w-fit rounded-xl bg-[#eff4ff] p-1">
        <span
          aria-current="page"
          className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-semibold shadow-sm"
        >
          <CircleUser aria-hidden="true" className="size-4.5" />
          Mi perfil
        </span>
      </div>

      {error !== null ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {getProfileErrorMessage(error, 'load')}
              {isSessionError(error) && (
                <>
                  {' '}
                  <Link to="/login">Iniciar sesión</Link>
                </>
              )}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : profile === null ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <p className="sr-only">Cargando perfil…</p>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <ProfileDetailsCard profile={profile} onSaved={handleSaved} />
      )}
    </section>
  )
}

export default ProfilePage
