import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FormFieldLabelProps {
  htmlFor: string
  required?: boolean
  children: ReactNode
}

/** Etiqueta de campo en mayúsculas; el asterisco de obligatorio no lo lee el lector de pantalla. */
function FormFieldLabel({ htmlFor, required = false, children }: FormFieldLabelProps) {
  return (
    <Label htmlFor={htmlFor} className="text-[11px] font-semibold tracking-wider uppercase">
      {children}
      {required && (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      )}
    </Label>
  )
}

export default FormFieldLabel
