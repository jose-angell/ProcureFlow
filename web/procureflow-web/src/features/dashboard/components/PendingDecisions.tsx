import { useEffect, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getPendingApprovals } from '@/features/purchase-requests/api/purchaseRequests'
import PriorityBadge from '@/features/purchase-requests/components/PriorityBadge'
import type { PurchaseRequest } from '@/features/purchase-requests/types'
import { formatCurrency } from '@/shared/lib/format'
import BlockError from './BlockError'

const MAX_VISIBLE = 5

type PendingState = { requests: PurchaseRequest[] } | { error: unknown }

/**
 * Solicitudes `Submitted` que esperan decisión. Solo lectura; la API responde 403
 * a un Requester, por eso la página solo lo monta para Approver y Admin.
 */
function PendingDecisions() {
  const [state, setState] = useState<PendingState | null>(null)

  useEffect(() => {
    let cancelled = false

    getPendingApprovals()
      .then((requests) => {
        if (!cancelled) setState({ requests })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ error })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const total = state && 'requests' in state ? state.requests.length : 0

  return (
    <Card className="justify-between gap-0 p-4">
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-secondary" aria-hidden="true" />
            <h2 className="font-heading text-base font-semibold">
              En espera de tu decisión
            </h2>
          </div>
          {total > 0 && (
            <span className="rounded-full bg-[#dbe1ff] px-2 py-0.5 text-[11px] font-semibold text-[#00174b]">
              {total} {total === 1 ? 'enviada' : 'enviadas'}
            </span>
          )}
        </div>

        <Content state={state} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span>
          Regla: <strong>Aprobación de nivel único por departamento</strong>
        </span>
      </div>
    </Card>
  )
}

function Content({ state }: { state: PendingState | null }) {
  if (state === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-18 rounded-lg" />
        ))}
      </div>
    )
  }

  if ('error' in state) {
    return <BlockError error={state.error} />
  }

  if (state.requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes solicitudes pendientes de decisión.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {state.requests.slice(0, MAX_VISIBLE).map((request) => (
        <li key={request.id} className="rounded-lg bg-muted/60 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm leading-tight font-semibold">
              {request.requestNumber}
            </span>
            <PriorityBadge priority={request.priority} />
          </div>
          <p className="mt-1 truncate text-xs" title={request.justification}>
            {request.justification}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {request.requestedByName} · {request.departmentName}
          </p>
          <span className="text-xs font-bold">
            Total partidas: {formatCurrency(request.totalAmount)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default PendingDecisions
