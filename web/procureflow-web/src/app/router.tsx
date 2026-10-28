import { createBrowserRouter, Navigate } from 'react-router'
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import { clearSession, getSession } from '@/features/auth/session'
import type { LoginLocationState } from '@/features/auth/types'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import DepartmentsPage from '@/features/departments/pages/DepartmentsPage'
import PurchaseRequestsPage from '@/features/purchase-requests/pages/PurchaseRequestsPage'
import { setUnauthorizedHandler } from '@/shared/api/httpClient'
import NotFoundPage from '@/shared/components/NotFoundPage'
import AppLayout from '@/shared/layouts/AppLayout'
import GuestRoute from './GuestRoute'
import ProtectedRoute from './ProtectedRoute'

export const router = createBrowserRouter([
  // Rutas públicas
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // Rutas protegidas
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'purchases', element: <PurchaseRequestsPage /> },
          { path: 'departments', element: <DepartmentsPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])

// Una petición con token que recibe 401 cierra la sesión y lleva a /login.
// Sin sesión guardada no hace nada: así varios 401 simultáneos navegan una sola vez.
setUnauthorizedHandler(() => {
  if (!getSession()) return

  const { pathname, search } = router.state.location
  clearSession()

  const state: LoginLocationState = { from: { pathname, search }, reason: 'expired' }
  void router.navigate('/login', { replace: true, state })
})
