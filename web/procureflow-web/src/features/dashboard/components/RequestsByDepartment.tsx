import { Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import BlockError from './BlockError'

interface RequestsByDepartmentProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

// Colores de las barras tomados del diseño Stitch; se repiten si hay más departamentos.
const BAR_COLORS = ['bg-[#0051d5]', 'bg-[#68dba9]', 'bg-[#b4c5ff]', 'bg-[#d3e4fe]']

function RequestsByDepartment({ summary, isLoading, error }: RequestsByDepartmentProps) {
  return (
    <Card className="justify-between gap-0 p-4">
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-secondary" aria-hidden="true" />
            <h2 className="font-heading text-base font-semibold">
              Solicitudes por departamento
            </h2>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Distribución activa
          </span>
        </div>

        <Content summary={summary} isLoading={isLoading} error={error} />
      </div>

      {summary && !error && (
        <div className="mt-6 flex items-center justify-end border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            Total: {summary.total} {summary.total === 1 ? 'solicitud' : 'solicitudes'}
          </span>
        </div>
      )}
    </Card>
  )
}

function Content({ summary, isLoading, error }: RequestsByDepartmentProps) {
  if (error) {
    return <BlockError error={error} />
  }

  if (isLoading || !summary) {
    return (
      <div className="space-y-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    )
  }

  if (summary.byDepartment.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos por departamento.</p>
  }

  return (
    <ul className="space-y-4">
      {summary.byDepartment.map((department, index) => {
        const percentage = Math.round((department.count / summary.total) * 100)

        return (
          <li key={department.departmentId}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium">{department.departmentName}</span>
              <span className="font-semibold">
                {department.count} {department.count === 1 ? 'solicitud' : 'solicitudes'}{' '}
                <span className="font-medium text-muted-foreground">({percentage}%)</span>
              </span>
            </div>
            <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default RequestsByDepartment
