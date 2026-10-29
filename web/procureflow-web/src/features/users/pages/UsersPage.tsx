import { useEffect, useState } from 'react'
import { CircleAlert, Plus } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { getDepartments } from '@/features/departments/api/departments'
import type { Department } from '@/features/departments/types'
import { getUsers } from '../api/users'
import { getUserErrorMessage } from '../userErrors'
import type { User } from '../types'

type UsersState = { users: User[] } | { error: unknown }
type DepartmentsState = { departments: Department[] } | { error: unknown }

function sortByName(users: User[]): User[] {
  return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
}

function UsersContent() {
  const [reloadKey] = useState(0)
  const [state, setState] = useState<UsersState | null>(null)
  // Un fallo al cargar departamentos no bloquea la lista: solo limita filtro y modal.
  const [, setDepartmentsState] = useState<DepartmentsState | null>(null)

  // Al recargar se conserva la lista anterior hasta que llega la nueva.
  useEffect(() => {
    let cancelled = false

    getUsers()
      .then((users) => {
        if (!cancelled) setState({ users: sortByName(users) })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ error })
      })

    getDepartments()
      .then((departments) => {
        if (!cancelled) setDepartmentsState({ departments })
      })
      .catch((error: unknown) => {
        if (!cancelled) setDepartmentsState({ error })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const users = state && 'users' in state ? state.users : null
  const error = state && 'error' in state ? state.error : null

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Gestión de Usuarios
            </h1>
            {users && (
              <span className="rounded-full bg-[#dce9ff] px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {users.length} {users.length === 1 ? 'usuario registrado' : 'usuarios registrados'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las cuentas de usuario, asignación de roles, departamentos y estados de
            acceso.
          </p>
        </div>

        <Button type="button" disabled>
          <Plus aria-hidden="true" />
          Agregar usuario
        </Button>
      </div>

      {error !== null ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            {getUserErrorMessage(error, 'load')}
            {isSessionError(error) && (
              <>
                {' '}
                <Link to="/login">Iniciar sesión</Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      ) : users === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
      ) : null}
    </section>
  )
}

function UsersPage() {
  // La API es la autoridad (403); aquí solo se evita mostrar una pantalla inútil.
  if (getSession()?.user.role !== UserRole.Admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <UsersContent />
}

export default UsersPage
