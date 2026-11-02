import { cn } from '@/lib/utils'

/** Barras encendidas según la longitud: 0 vacío, 1 débil (< 8), 2 moderada (8–11), 3 segura (12+). */
function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length === 0) return 0
  if (password.length < 8) return 1
  if (password.length < 12) return 2
  return 3
}

const STRENGTH_INFO = {
  0: { label: 'Ingresa tu nueva contraseña', barClass: '', textClass: 'text-muted-foreground' },
  1: { label: 'Contraseña débil', barClass: 'bg-destructive', textClass: 'text-destructive' },
  2: { label: 'Contraseña moderada', barClass: 'bg-[#316bf3]', textClass: 'text-secondary' },
  3: { label: 'Contraseña segura', barClass: 'bg-[#68dba9]', textClass: 'text-[#005137]' },
} as const

/** Medidor de fuerza por longitud; el texto se anuncia con `aria-live`. */
function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  const info = STRENGTH_INFO[strength]

  return (
    <div className="flex flex-col gap-1">
      <div aria-hidden="true" className="flex h-1.5 gap-1">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={cn(
              'h-full flex-1 rounded-full transition-colors',
              bar <= strength ? info.barClass : 'bg-[#dce9ff]',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span aria-live="polite" className={cn('font-semibold', info.textClass)}>
          {info.label}
        </span>
        <span className="text-muted-foreground">Mín. 8 caracteres</span>
      </div>
    </div>
  )
}

export default PasswordStrengthMeter
