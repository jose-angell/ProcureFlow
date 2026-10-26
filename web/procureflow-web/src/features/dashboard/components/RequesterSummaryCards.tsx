import { CircleCheck, ClipboardClock, FilePenLine, ReceiptText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import { formatCurrency } from '@/shared/lib/format'
import BlockError from './BlockError'
import KpiCard from './KpiCard'

interface RequesterSummaryCardsProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

const GRID_CLASSNAME = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'

function RequesterSummaryCards({ summary, isLoading, error }: RequesterSummaryCardsProps) {
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
  const needsAction = summary.draft + summary.rejected

  return (
    <div className={GRID_CLASSNAME}>
      <KpiCard
        label="Mis solicitudes totales"
        value={summary.total}
        icon={ReceiptText}
        iconClassName="bg-[#eff4ff] text-foreground"
        note="Importe acumulado"
        badge={formatCurrency(summary.totalAmount)}
        badgeClassName="bg-[#e5eeff] font-semibold text-foreground"
      />
      <KpiCard
        label="Enviadas / Pendientes"
        value={summary.submitted}
        icon={ClipboardClock}
        iconClassName="bg-[#e5eeff] text-secondary"
        note="En revisión por aprobador"
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
        label="Borradores / Rechazadas"
        value={needsAction}
        icon={FilePenLine}
        iconClassName="bg-[#dce9ff] text-muted-foreground"
        note={`${summary.draft} borradores · ${summary.rejected} rechazadas`}
        badge={needsAction > 0 ? 'Requiere acción' : 'Al día'}
        badgeClassName={needsAction > 0 ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#dce9ff] text-muted-foreground'}
      />
    </div>
  )
}

export default RequesterSummaryCards
