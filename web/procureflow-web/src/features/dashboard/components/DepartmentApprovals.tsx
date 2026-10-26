import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import { formatCurrency } from '@/shared/lib/format'
import BlockError from './BlockError'

interface DepartmentApprovalsProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

/**
 * Resumen de pendientes del departamento, calculado desde `summary` (sin llamar a
 * `pendingApprovals`). "Revisar pendientes" queda deshabilitado: su destino es la
 * página Aprobaciones, que aún no existe.
 */
function DepartmentApprovals({ summary, isLoading, error }: DepartmentApprovalsProps) {
  const pending = summary?.submitted ?? 0

  return (
    <Card className="justify-between gap-0 p-4">
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-secondary" aria-hidden="true" />
            <h2 className="font-heading text-base font-semibold">
              Aprobaciones departamentales
            </h2>
          </div>
          {summary && !error && pending > 0 && (
            <span className="rounded-full bg-[#dbe1ff] px-2 py-0.5 text-[11px] font-semibold text-[#00174b]">
              {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
            </span>
          )}
        </div>

        <Content summary={summary} isLoading={isLoading} error={error} />
      </div>

      {summary && !error && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span>
            Importe gestionado:{' '}
            <strong className="text-foreground">{formatCurrency(summary.totalAmount)}</strong>
          </span>
        </div>
      )}
    </Card>
  )
}

function Content({ summary, isLoading, error }: DepartmentApprovalsProps) {
  if (error) {
    return <BlockError error={error} />
  }

  if (isLoading || !summary) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        {summary.submitted === 0
          ? 'No tienes solicitudes pendientes de decisión.'
          : `Tienes ${summary.submitted} ${
              summary.submitted === 1 ? 'solicitud enviada' : 'solicitudes enviadas'
            } esperando tu decisión.`}
      </p>
      <Button variant="outline" className="w-full" disabled>
        Revisar pendientes
      </Button>
    </div>
  )
}

export default DepartmentApprovals
