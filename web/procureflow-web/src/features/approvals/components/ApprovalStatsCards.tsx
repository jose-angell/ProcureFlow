import { Ban, CircleCheck, ClipboardClock, Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BlockError from '@/features/dashboard/components/BlockError'
import KpiCard from '@/features/dashboard/components/KpiCard'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import { formatCurrency } from '@/shared/lib/format'

interface ApprovalStatsCardsProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

const GRID_CLASSNAME = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'

function ApprovalStatsCards({ summary, isLoading, error }: ApprovalStatsCardsProps) {
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

  const approvedPercent =
    summary.total === 0 ? 0 : Math.round((summary.approved / summary.total) * 100)

  return (
    <div className={GRID_CLASSNAME}>
      <KpiCard
        label="Pendientes de mi firma"
        value={summary.submitted}
        icon={ClipboardClock}
        iconClassName="bg-[#ffdad6] text-[#93000a]"
        note="Esperan tu decisión"
      />
      <KpiCard
        label="Aprobadas"
        value={summary.approved}
        icon={CircleCheck}
        iconClassName="bg-[#002114] text-[#069669]"
        note={`${approvedPercent}% del total`}
      />
      <KpiCard
        label="Rechazadas"
        value={summary.rejected}
        icon={Ban}
        iconClassName="bg-[#dce9ff] text-muted-foreground"
        note={`${summary.cancelled} ${summary.cancelled === 1 ? 'cancelada' : 'canceladas'}`}
      />
      <KpiCard
        label="Importe gestionado"
        value={formatCurrency(summary.totalAmount)}
        icon={Wallet}
        iconClassName="bg-[#e5eeff] text-secondary"
        note={`${summary.total} ${summary.total === 1 ? 'solicitud' : 'solicitudes'} en total`}
      />
    </div>
  )
}

export default ApprovalStatsCards
