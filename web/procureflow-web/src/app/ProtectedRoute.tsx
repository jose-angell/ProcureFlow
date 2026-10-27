import { Navigate, Outlet, useLocation } from 'react-router'
import { clearSession, getSession, isTokenExpired } from '@/features/auth/session'
import type { LoginLocationState } from '@/features/auth/types'

/**
 * Deja pasar solo con una sesión guardada cuyo token no venció. Sin sesión va a
 * /login; con token vencido borra la sesión y lo indica en el estado de navegación.
 * Es solo UX: la API sigue validando cada petición.
 */
function ProtectedRoute() {
  const { pathname, search } = useLocation()
  const session = getSession()

  if (!session) {
    const state: LoginLocationState = { from: { pathname, search } }
    return <Navigate to="/login" replace state={state} />
  }

  if (isTokenExpired(session.accessToken)) {
    clearSession()
    const state: LoginLocationState = { from: { pathname, search }, reason: 'expired' }
    return <Navigate to="/login" replace state={state} />
  }

  return <Outlet />
}

export default ProtectedRoute
