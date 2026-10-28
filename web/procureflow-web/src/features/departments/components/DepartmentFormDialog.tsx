import { useId, useState, type SyntheticEvent } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import {
  activateDepartment,
  createDepartment,
  deactivateDepartment,
  updateDepartment,
} from '../api/departments'
import {
  getDepartmentCreatedMessage,
  getDepartmentErrorMessage,
  getDepartmentUpdatedMessage,
  type DepartmentOperation,
} from '../departmentErrors'
import type { Department } from '../types'

const MAX_NAME_LENGTH = 100

type ActiveValue = 'active' | 'inactive'

const STATUS_OPTIONS: { value: ActiveValue; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

interface DepartmentFormDialogProps {
  /** Departamento a editar; `null` para crear uno nuevo. */
  department: Department | null
  /** Se llama con el mensaje de éxito; el padre cierra el diálogo y recarga. */
  onSaved: (message: string) => void
  /** `hasFailed` indica que hubo un error: la lista pudo cambiar y conviene recargarla. */
  onClose: (hasFailed: boolean) => void
}

/**
 * Modal de crear y editar. Se monta abierto y el padre lo desmonta al cerrarlo,
 * así cada apertura empieza con el formulario limpio.
 */
function DepartmentFormDialog({ department, onSaved, onClose }: DepartmentFormDialogProps) {
  const nameId = useId()
  const statusId = useId()
  const isEditing = department !== null

  const [name, setName] = useState(department?.name ?? '')
  const [status, setStatus] = useState<ActiveValue>(department?.isActive === false ? 'inactive' : 'active')
  // Nombre ya guardado en la API: si el PUT sale bien y el PATCH falla, al reintentar no se repite el PUT.
  const [savedName, setSavedName] = useState(department?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [failure, setFailure] = useState<{ error: unknown; operation: DepartmentOperation } | null>(
    null,
  )

  const trimmedName = name.trim()
  const nameChanged = trimmedName !== savedName
  const statusChanged = isEditing && status !== (department.isActive ? 'active' : 'inactive')
  const canSave = trimmedName !== '' && (!isEditing || nameChanged || statusChanged)

  function handleOpenChange(nextOpen: boolean) {
    // Mientras la petición está en curso el diálogo no se puede cerrar.
    if (!nextOpen && !isSaving) onClose(failure !== null)
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave || isSaving) return

    setIsSaving(true)
    setFailure(null)
    let operation: DepartmentOperation = 'save'

    try {
      if (!isEditing) {
        await createDepartment(trimmedName)
        onSaved(getDepartmentCreatedMessage(trimmedName))
        return
      }

      if (nameChanged) {
        await updateDepartment(department.id, trimmedName)
        setSavedName(trimmedName)
      }

      if (statusChanged) {
        operation = status === 'active' ? 'save' : 'deactivate'
        await (status === 'active'
          ? activateDepartment(department.id)
          : deactivateDepartment(department.id))
      }

      onSaved(getDepartmentUpdatedMessage(trimmedName))
    } catch (error) {
      setFailure({ error, operation })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar departamento' : 'Crear nuevo departamento'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza el nombre o el estado del departamento.'
              : 'Registra una nueva unidad organizativa de la empresa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {failure && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                {getDepartmentErrorMessage(failure.error, failure.operation)}
                {isSessionError(failure.error) && (
                  <>
                    {' '}
                    <Link to="/login">Iniciar sesión</Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nombre del departamento</Label>
            <Input
              id={nameId}
              value={name}
              maxLength={MAX_NAME_LENGTH}
              placeholder="ej. Ingeniería de Software y DevOps"
              disabled={isSaving}
              autoFocus
              required
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor={statusId}>Estado</Label>
              <Select
                items={STATUS_OPTIONS}
                value={status}
                disabled={isSaving}
                onValueChange={(value) => setStatus((value ?? 'active') as ActiveValue)}
              >
                <SelectTrigger id={statusId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onClose(failure !== null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSave || isSaving}>
              <Check aria-hidden="true" />
              {isSaving ? 'Guardando...' : 'Guardar departamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DepartmentFormDialog
