import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Plus } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { getDepartments } from '../api/departments'
import DepartmentFormDialog from '../components/DepartmentFormDialog'
import DepartmentsTable from '../components/DepartmentsTable'
import {
  getDepartmentDeletedMessage,
  getDepartmentErrorMessage,
  type DepartmentOperation,
} from '../departmentErrors'
import type { Department } from '../types'

type DepartmentsState = { departments: Department[] } | { error: unknown }

function sortByName(departments: Department[]): Department[] {
  return [...departments].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

type ActionResult = { success: string } | { error: unknown; operation: DepartmentOperation }

function DepartmentsContent() {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<DepartmentsState | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  // `null` = modal cerrado; `{ department: null }` = crear; `{ department }` = editar.
  const [formDialog, setFormDialog] = useState<{ department: Department | null } | null>(null)

  // Al recargar se conserva la lista anterior hasta que llega la nueva.
  useEffect(() => {
    let cancelled = false

    getDepartments()
      .then((departments) => {
        if (!cancelled) setState({ departments: sortByName(departments) })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ error })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const departments = state && 'departments' in state ? state.departments : null
  const error = state && 'error' in state ? state.error : null
  const activeCount = departments?.filter((department) => department.isActive).length ?? 0

  function handleSaved(message: string) {
    setActionResult({ success: message })
    setFormDialog(null)
    setReloadKey((key) => key + 1)
  }

  function handleFormClose(hasFailed: boolean) {
    setFormDialog(null)
    // Un guardado a medias (p. ej. el nombre cambió y el estado no) deja la lista desactualizada.
    if (hasFailed) setReloadKey((key) => key + 1)
  }

  function handleDeleted(name: string) {
    setActionResult({ success: getDepartmentDeletedMessage(name) })
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
              Gestión de Departamentos
            </h1>
            {departments && (
              <span className="rounded-full bg-[#dce9ff] px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {activeCount} {activeCount === 1 ? 'activo' : 'activos'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las unidades organizativas de la empresa.
          </p>
        </div>

        <Button type="button" onClick={() => setFormDialog({ department: null })}>
          <Plus aria-hidden="true" />
          Agregar departamento
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
              ? getDepartmentErrorMessage(actionResult.error, actionResult.operation)
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
            {getDepartmentErrorMessage(error, 'load')}
            {isSessionError(error) && (
              <>
                {' '}
                <Link to="/login">Iniciar sesión</Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <DepartmentsTable
          departments={departments}
          onEdit={(department) => setFormDialog({ department })}
          onDeleted={handleDeleted}
          onDeleteError={handleDeleteError}
        />
      )}

      {formDialog && (
        <DepartmentFormDialog
          key={formDialog.department?.id ?? 'new'}
          department={formDialog.department}
          onSaved={handleSaved}
          onClose={handleFormClose}
        />
      )}
    </section>
  )
}

function DepartmentsPage() {
  // La API es la autoridad (403); aquí solo se evita mostrar una pantalla inútil.
  if (getSession()?.user.role !== UserRole.Admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <DepartmentsContent />
}

export default DepartmentsPage
