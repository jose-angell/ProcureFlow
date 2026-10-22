import { Navigate, Outlet, useLocation } from 'react-router'

/**
 * PLACEHOLDER TEMPORAL: no implementa autenticación real.
 *
 * `isAuthenticated` está fijo en `true`, por lo que hoy cualquier visitante
 * accede a las rutas protegidas. Esto NO es una medida de seguridad; la API
 * sigue siendo la autoridad final. Se reemplazará en la fase de autenticación
 * (sesión JWT) leyendo el estado real de la sesión.
 */
const isAuthenticated = true

function ProtectedRoute() {
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
