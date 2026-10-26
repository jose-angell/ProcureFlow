import { CircleCheck, CircleX, ClipboardClock, ReceiptText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import BlockError from './BlockError'
import KpiCard from './KpiCard'

interface SummaryCardsProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

const GRID_CLASSNAME = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'

function SummaryCards({ summary, isLoading, error }: SummaryCardsProps) {
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

  return (
    <div className={GRID_CLASSNAME}>
      <KpiCard
        label="Solicitudes totales"
        value={summary.total}
        icon={ReceiptText}
        iconClassName="bg-[#eff4ff] text-foreground"
        note="Registradas en el sistema"
        badge="Todas"
        badgeClassName="bg-[#e5eeff] text-foreground"
      />
      <KpiCard
        label="Pendientes de aprobación"
        value={summary.submitted}
        icon={ClipboardClock}
        iconClassName="bg-[#e5eeff] text-secondary"
        note="Pendientes de revisión de departamento"
        badge="Enviadas"
        badgeClassName="bg-[#dbe1ff] font-semibold text-[#00174b]"
      />
      <KpiCard
        label="Solicitudes aprobadas"
        value={summary.approved}
        icon={CircleCheck}
        iconClassName="bg-[#002114] text-[#069669]"
        note="Aprobación departamental única"
        badge={approvalRate}
        badgeClassName="bg-[#85f8c4] text-[#002114]"
      />
      <KpiCard
        label="Rechazadas / Canceladas"
        value={summary.rejected + summary.cancelled}
        icon={CircleX}
        iconClassName="bg-[#ffdad6] text-[#93000a]"
        note={`${summary.rejected} rechazadas · ${summary.cancelled} canceladas`}
        badge="Finalizadas"
        badgeClassName="bg-[#dce9ff] text-muted-foreground"
      />
    </div>
  )
}

export default SummaryCards
