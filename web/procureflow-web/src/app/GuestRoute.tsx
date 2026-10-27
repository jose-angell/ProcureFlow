import { Navigate, Outlet } from 'react-router'
import { getValidSession } from '@/features/auth/session'

/** Rutas solo para visitantes (/login, /register): con una sesión válida va al dashboard. */
function GuestRoute() {
  if (getValidSession()) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default GuestRoute
