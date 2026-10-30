import { CircleCheck, ClipboardClock, FilePenLine, ReceiptText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BlockError from '@/features/dashboard/components/BlockError'
import KpiCard from '@/features/dashboard/components/KpiCard'
import type { PurchaseRequestSummary } from '../types'

interface PurchaseRequestStatsCardsProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

const GRID_CLASSNAME = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'

function PurchaseRequestStatsCards({
  summary,
  isLoading,
  error,
}: PurchaseRequestStatsCardsProps) {
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
        label="Total solicitudes"
        value={summary.total}
        icon={ReceiptText}
        iconClassName="bg-[#eff4ff] text-foreground"
        note={`${summary.cancelled} ${summary.cancelled === 1 ? 'cancelada' : 'canceladas'}`}
      />
      <KpiCard
        label="En revisión"
        value={summary.submitted}
        icon={ClipboardClock}
        iconClassName="bg-[#e5eeff] text-secondary"
        note="Pendientes de aprobación"
      />
      <KpiCard
        label="Aprobadas"
        value={summary.approved}
        icon={CircleCheck}
        iconClassName="bg-[#002114] text-[#069669]"
        note={`${approvedPercent}% del total`}
      />
      <KpiCard
        label="Rechazadas / Borrador"
        value={summary.rejected + summary.draft}
        icon={FilePenLine}
        iconClassName="bg-[#dce9ff] text-muted-foreground"
        note={`${summary.rejected} ${summary.rejected === 1 ? 'rechazada' : 'rechazadas'} • ${summary.draft} en borrador`}
      />
    </div>
  )
}

export default PurchaseRequestStatsCards
