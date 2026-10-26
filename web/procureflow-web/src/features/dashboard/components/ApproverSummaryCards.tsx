import { Ban, CircleCheck, ClipboardClock, ReceiptText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import { formatCurrency } from '@/shared/lib/format'
import BlockError from './BlockError'
import KpiCard from './KpiCard'

interface ApproverSummaryCardsProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

const GRID_CLASSNAME = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'

function ApproverSummaryCards({ summary, isLoading, error }: ApproverSummaryCardsProps) {
  if (error) {
    return <BlockError error={error} />
  }

  if (isLoading || !summary) {
    return (
      <div className={GRID_CLASSNAME} aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-35 rounded-xl" />
        ))}
      </div>
    )
  }

  const approvalRate =
    summary.total === 0 ? '—' : `${Math.round((summary.approved / summary.total) * 100)}% tasa`
  const closedWithoutApproval = summary.rejected + summary.cancelled

  return (
    <div className={GRID_CLASSNAME}>
      <KpiCard
        label="Solicitudes del departamento"
        value={summary.total}
        icon={ReceiptText}
        iconClassName="bg-[#eff4ff] text-foreground"
        note="Importe acumulado"
        badge={formatCurrency(summary.totalAmount)}
        badgeClassName="bg-[#e5eeff] font-semibold text-foreground"
      />
      <KpiCard
        label="Pendientes de decisión"
        value={summary.submitted}
        icon={ClipboardClock}
        iconClassName="bg-[#e5eeff] text-secondary"
        note="Esperan tu revisión"
        badge="Enviadas"
        badgeClassName="bg-[#dbe1ff] font-semibold text-[#00174b]"
      />
      <KpiCard
        label="Aprobadas"
        value={summary.approved}
        icon={CircleCheck}
        iconClassName="bg-[#002114] text-[#069669]"
        note="Listas para adquisición"
        badge={approvalRate}
        badgeClassName="bg-[#85f8c4] text-[#002114]"
      />
      <KpiCard
        label="Rechazadas / Canceladas"
        value={closedWithoutApproval}
        icon={Ban}
        iconClassName="bg-[#dce9ff] text-muted-foreground"
        note={`${summary.rejected} rechazadas · ${summary.cancelled} canceladas`}
        badge="Cerradas"
        badgeClassName="bg-[#dce9ff] text-muted-foreground"
      />
    </div>
  )
}

export default ApproverSummaryCards
