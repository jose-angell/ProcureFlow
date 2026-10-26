import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface KpiCardProps {
  label: string
  value: number
  icon: LucideIcon
  iconClassName: string
  note: string
  badge: string
  badgeClassName: string
}

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

export default KpiCard
