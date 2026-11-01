import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface FormDialogHeaderProps {
  icon: LucideIcon
  title: string
  /** Texto del badge junto al título, p. ej. "Nuevo" o "Edición". */
  badge: string
  description: string
  onClose: () => void
  closeDisabled: boolean
}

/**
 * Cabecera de los modales de formulario: icono en recuadro, título con badge,
 * descripción, botón de cierre propio y borde inferior. Va dentro de un
 * `DialogContent` con `showCloseButton={false}`.
 */
function FormDialogHeader({
  icon: Icon,
  title,
  badge,
  description,
  onClose,
  closeDisabled,
}: FormDialogHeaderProps) {
  return (
    <div className="flex items-start gap-4 border-b px-6 py-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eff4ff] text-secondary">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-[20px] leading-tight font-semibold">{title}</DialogTitle>
          <Badge variant="outline">{badge}</Badge>
        </div>
        <DialogDescription>{description}</DialogDescription>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Cerrar"
        disabled={closeDisabled}
        onClick={onClose}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}

export default FormDialogHeader
