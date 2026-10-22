import { createBrowserRouter, Navigate } from 'react-router'
import LoginPage from '@/features/auth/pages/LoginPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import PurchaseRequestsPage from '@/features/purchase-requests/pages/PurchaseRequestsPage'
import NotFoundPage from '@/shared/components/NotFoundPage'
import AppLayout from '@/shared/layouts/AppLayout'
import ProtectedRoute from './ProtectedRoute'

export const router = createBrowserRouter([
  // Rutas públicas
  { path: '/login', element: <LoginPage /> },

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
