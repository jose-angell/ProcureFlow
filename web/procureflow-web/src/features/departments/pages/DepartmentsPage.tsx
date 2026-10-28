import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { getDepartments } from '../api/departments'
import DepartmentsTable from '../components/DepartmentsTable'
import { getDepartmentErrorMessage } from '../departmentErrors'
import type { Department } from '../types'

type DepartmentsState = { departments: Department[] } | { error: unknown }

function sortByName(departments: Department[]): Department[] {
  return [...departments].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function DepartmentsContent() {
  const [state, setState] = useState<DepartmentsState | null>(null)

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
  }, [])

  const departments = state && 'departments' in state ? state.departments : null
  const error = state && 'error' in state ? state.error : null
  const activeCount = departments?.filter((department) => department.isActive).length ?? 0

  return (
    <section className="flex flex-col gap-6">
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
        <DepartmentsTable departments={departments} />
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
