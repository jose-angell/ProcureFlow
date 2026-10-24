import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PurchaseRequestStatus } from '../types'

interface StatusStyle {
  label: string
  badge: string
  dot: string
}

// Colores tomados del diseño Stitch (design/dashboardAdmin.html).
const STATUS_STYLES: Record<PurchaseRequestStatus, StatusStyle> = {
  [PurchaseRequestStatus.Draft]: {
    label: 'Borrador',
    badge: 'bg-[#d3e4fe] text-[#0b1c30]',
    dot: 'bg-[#c6c6cd]',
  },
  [PurchaseRequestStatus.Submitted]: {
    label: 'Enviada',
    badge: 'bg-[#dbe1ff] text-[#00174b]',
    dot: 'bg-[#0051d5]',
  },
  [PurchaseRequestStatus.Approved]: {
    label: 'Aprobada',
    badge: 'bg-[#85f8c4] text-[#002114]',
    dot: 'bg-[#069669]',
  },
  [PurchaseRequestStatus.Rejected]: {
    label: 'Rechazada',
    badge: 'bg-[#ffdad6] text-[#93000a]',
    dot: 'bg-[#ba1a1a]',
  },
  [PurchaseRequestStatus.Cancelled]: {
    label: 'Cancelada',
    badge: 'bg-[#dce9ff] text-[#0b1c30]',
    dot: 'bg-[#76777d]',
  },
}

interface StatusBadgeProps {
  status: PurchaseRequestStatus
  className?: string
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status]

  return (
    <Badge className={cn('gap-1.5 font-semibold', style.badge, className)}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', style.dot)} />
      {style.label}
    </Badge>
  )
}

export default StatusBadge
