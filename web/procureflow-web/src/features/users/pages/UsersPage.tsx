import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Plus } from 'lucide-react'
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
import UserFormDialog from '../components/UserFormDialog'
import UserStatsCards from '../components/UserStatsCards'
import UsersTable from '../components/UsersTable'
import {
  getUserDeletedMessage,
  getUserErrorMessage,
  type UserOperation,
} from '../userErrors'
import type { User } from '../types'

type UsersState = { users: User[] } | { error: unknown }
type ActionResult = { success: string } | { error: unknown; operation: UserOperation }
type DepartmentsState = { departments: Department[] } | { error: unknown }

function sortByName(users: User[]): User[] {
  return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
}

function sortDepartments(departments: Department[]): Department[] {
  return [...departments].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function UsersContent() {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<UsersState | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  // `null` = modal cerrado; `{ user: null }` = crear; `{ user }` = editar.
  const [formDialog, setFormDialog] = useState<{ user: User | null } | null>(null)
  // Un fallo al cargar departamentos no bloquea la lista: solo limita filtro y modal.
  const [departmentsState, setDepartmentsState] = useState<DepartmentsState | null>(null)

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
        if (!cancelled) setDepartmentsState({ departments: sortDepartments(departments) })
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
  const departments =
    departmentsState && 'departments' in departmentsState ? departmentsState.departments : []
  const departmentsError =
    departmentsState && 'error' in departmentsState ? departmentsState.error : null
  const currentUserId = getSession()?.user.userId

  function handleSaved(message: string) {
    setActionResult({ success: message })
    setFormDialog(null)
    setReloadKey((key) => key + 1)
  }

  function handleFormClose(hasFailed: boolean) {
    setFormDialog(null)
    // Un guardado a medias (p. ej. los datos cambiaron y el estado no) deja la lista desactualizada.
    if (hasFailed) setReloadKey((key) => key + 1)
  }

  function handleDeleted(fullName: string) {
    setActionResult({ success: getUserDeletedMessage(fullName) })
    setReloadKey((key) => key + 1)
  }

  function handleDeleteError(error: unknown) {
    setActionResult({ error, operation: 'delete' })
    // El estado pudo cambiar (p. ej. otro Admin lo eliminó): se vuelve a cargar.
    setReloadKey((key) => key + 1)
  }

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

        <Button type="button" onClick={() => setFormDialog({ user: null })}>
          <Plus aria-hidden="true" />
          Agregar usuario
        </Button>
      </div>

      {actionResult && (
        <Alert variant={'error' in actionResult ? 'destructive' : 'default'}>
          {'error' in actionResult ? (
            <CircleAlert aria-hidden="true" />
          ) : (
            <CircleCheck aria-hidden="true" />
          )}
          <AlertDescription>
            {'error' in actionResult
              ? getUserErrorMessage(actionResult.error, actionResult.operation)
              : actionResult.success}
            {'error' in actionResult && isSessionError(actionResult.error) && (
              <>
                {' '}
                <Link to="/login">Iniciar sesión</Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <UserStatsCards users={users} />
          <UsersTable
            users={users}
            departments={departments}
            currentUserId={currentUserId}
            onEdit={(user) => setFormDialog({ user })}
            onDeleted={handleDeleted}
            onDeleteError={handleDeleteError}
          />
        </>
      )}

      {formDialog && (
        <UserFormDialog
          key={formDialog.user?.id ?? 'new'}
          user={formDialog.user}
          departments={departments}
          departmentsError={departmentsError}
          currentUserId={currentUserId}
          onSaved={handleSaved}
          onClose={handleFormClose}
        />
      )}
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
