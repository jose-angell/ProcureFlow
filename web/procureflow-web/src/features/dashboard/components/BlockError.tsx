import { CircleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getDashboardErrorMessage, isSessionError } from '../dashboardErrors'

interface BlockErrorProps {
  error: unknown
  className?: string
}

/** Error de carga de un bloque del dashboard. Si es de sesión, ofrece volver a /login. */
function BlockError({ error, className }: BlockErrorProps) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert aria-hidden="true" />
      <AlertDescription>
        {getDashboardErrorMessage(error)}
        {isSessionError(error) && (
          <>
            {' '}
            <Link to="/login">Iniciar sesión</Link>
          </>
        )}
      </AlertDescription>
    </Alert>
  )
}

export default BlockError
