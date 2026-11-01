import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from 'cn'

interface IconInputProps extends ComponentProps<typeof Input> {
  icon: LucideIcon
}

/** `Input` con un icono a la izquierda, fondo `#eff4ff` y borde `#dce9ff`. */
function IconInput({ icon: Icon, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input className={cn('border-[#dce9ff] bg-[#eff4ff] pl-9', className)} {...props} />
    </div>
  )
}

export default IconInput
