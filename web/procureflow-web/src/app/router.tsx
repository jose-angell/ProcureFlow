import { createBrowserRouter, Navigate } from 'react-router'
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import PurchaseRequestsPage from '@/features/purchase-requests/pages/PurchaseRequestsPage'
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
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
