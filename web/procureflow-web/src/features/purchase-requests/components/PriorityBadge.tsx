import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PurchaseRequestPriority } from '../types'

interface PriorityStyle {
  label: string
  badge: string
}

// Colores tomados del diseño Stitch (design/dashboardAdmin.html).
const PRIORITY_STYLES: Record<PurchaseRequestPriority, PriorityStyle> = {
  [PurchaseRequestPriority.Low]: {
    label: 'Baja',
    badge: 'bg-[#eff4ff] text-[#45464d]',
  },
  [PurchaseRequestPriority.Medium]: {
    label: 'Media',
    badge: 'bg-[#e5eeff] text-[#45464d]',
  },
  [PurchaseRequestPriority.High]: {
    label: 'Alta',
    badge: 'bg-[#dce9ff] text-[#0b1c30]',
  },
  [PurchaseRequestPriority.Urgent]: {
    label: 'Urgente',
    badge: 'bg-[#ffdad6] text-[#93000a] font-semibold',
  },
}

interface PriorityBadgeProps {
  priority: PurchaseRequestPriority
  className?: string
}

function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const style = PRIORITY_STYLES[priority]

  return (
    <Badge className={cn('gap-1.5', style.badge, className)}>
      {priority === PurchaseRequestPriority.Urgent && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[#ba1a1a]" />
      )}
      {style.label}
    </Badge>
  )
}

export default PriorityBadge
