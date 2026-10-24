import { CircleCheck, CircleX, ClipboardClock, ReceiptText, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import BlockError from './BlockError'

interface SummaryCardsProps {
  summary: PurchaseRequestSummary | null
  isLoading: boolean
  error: unknown
}

interface KpiCardProps {
  label: string
  value: number
  icon: LucideIcon
  iconClassName: string
  note: string
  badge: string
  badgeClassName: string
}

const GRID_CLASSNAME = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'

function KpiCard({ label, value, icon: Icon, iconClassName, note, badge, badgeClassName }: KpiCardProps) {
  return (
    <Card className="justify-between gap-0 p-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="mt-1 font-heading text-4xl font-bold tracking-tight">
            {value}
          </span>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ${iconClassName}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-[11px] text-muted-foreground">{note}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClassName}`}>
          {badge}
        </span>
      </div>
    </Card>
  )
}

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
