import { useId, useState, type ReactNode } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import FormFieldLabel from '@/shared/components/FormFieldLabel'
import IconInput from '@/shared/components/IconInput'

interface PasswordFieldProps {
  label: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
  /** Mensaje de error ya listo para mostrar; `undefined` si el campo es válido. */
  error?: string
  /** Ayuda o medidor que va debajo del campo. */
  children?: ReactNode
}

/** Campo de contraseña obligatorio con botón accesible para mostrarla u ocultarla. */
function PasswordField({
  label,
  icon,
  value,
  onChange,
  autoComplete,
  disabled,
  error,
  children,
}: PasswordFieldProps) {
  const inputId = useId()
  const errorId = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <FormFieldLabel htmlFor={inputId} required>
        {label}
      </FormFieldLabel>
      <div className="relative">
        <IconInput
          id={inputId}
          icon={icon}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          maxLength={500}
          className="pr-10"
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVisible((current) => !current)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4.5" />
          ) : (
            <Eye aria-hidden="true" className="size-4.5" />
          )}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
      {children}
    </div>
  )
}

export default PasswordField
