import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { clearSession, getSession } from '../session'
import { UserRole } from '../types'

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrador',
  [UserRole.Requester]: 'Solicitante',
  [UserRole.Approver]: 'Aprobador',
}

function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

/** Iniciales, nombre, rol y departamento del usuario de la sesión. Sin sesión no muestra nada. */
function CurrentUser() {
  const navigate = useNavigate()
  const session = getSession()
  if (!session) return null

  const { fullName, role, departmentName } = session.user
  const details = [ROLE_LABELS[role], departmentName].filter(Boolean).join(' • ')

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="flex min-w-0 items-center gap-2 rounded-lg p-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dbe1ff] text-xs font-bold text-[#00174b]"
        >
          {getInitials(fullName)}
        </div>
        <div className="hidden min-w-0 flex-col sm:flex">
          <span className="truncate text-sm leading-tight font-semibold">{fullName}</span>
          <span className="truncate text-xs leading-tight text-muted-foreground">
            {details}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CurrentUser
