import { useId, useRef, useState } from 'react'
import { CircleAlert, Save, Send } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { cn } from '@/lib/utils'
import {
  addPurchaseRequestItem,
  createPurchaseRequest,
  deletePurchaseRequestItem,
  submitPurchaseRequest,
  updatePurchaseRequest,
} from '../api/purchaseRequests'
import { getItemsTotal } from '../purchaseRequestItems'
import {
  getPurchaseRequestDraftSavedMessage,
  getPurchaseRequestErrorMessage,
  getPurchaseRequestSubmittedMessage,
} from '../purchaseRequestErrors'
import { PurchaseRequestPriority } from '../types'
import type { PurchaseRequestBody, PurchaseRequestItemBody } from '../types'
import PurchaseRequestItemsEditor, { type DraftItem } from './PurchaseRequestItemsEditor'

const JUSTIFICATION_MIN_LENGTH = 20
const JUSTIFICATION_MAX_LENGTH = 1000

const PRIORITY_OPTIONS: { value: PurchaseRequestPriority; label: string }[] = [
  { value: PurchaseRequestPriority.Urgent, label: 'Urgente' },
  { value: PurchaseRequestPriority.High, label: 'Alta' },
  { value: PurchaseRequestPriority.Medium, label: 'Media' },
  { value: PurchaseRequestPriority.Low, label: 'Baja' },
]

interface FormState {
  /** `null` = modo crear. */
  requestId: string | null
  requestNumber: string | null
  priority: PurchaseRequestPriority
  justification: string
  items: DraftItem[]
  /** Ítems que existen en la API y el usuario quitó. */
  removedItemIds: string[]
}

type SaveMode = 'draft' | 'submit'

interface PurchaseRequestFormDialogProps {
  /** Se llama con el mensaje de éxito; el padre cierra el diálogo y recarga. */
  onSaved: (message: string) => void
  /** `hasFailed` indica que hubo un error: la lista pudo cambiar y conviene recargarla. */
  onClose: (hasFailed: boolean) => void
}

/**
 * Modal de crear y editar. Se monta abierto y el padre lo desmonta al cerrarlo,
 * así cada apertura empieza con el formulario limpio.
 */
function PurchaseRequestFormDialog({ onSaved, onClose }: PurchaseRequestFormDialogProps) {
  const priorityName = useId()
  const justificationId = useId()
  const nextItemKey = useRef(0)

  const [form, setForm] = useState<FormState>({
    requestId: null,
    requestNumber: null,
    priority: PurchaseRequestPriority.Medium,
    justification: '',
    items: [],
    removedItemIds: [],
  })
  // Prioridad y justificación tal como están en la API; `null` hasta que la solicitud existe.
  const [savedHeader, setSavedHeader] = useState<PurchaseRequestBody | null>(null)
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [showSubmitError, setShowSubmitError] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const [hasFailed, setHasFailed] = useState(false)

  const isSaving = savingMode !== null
  const isEditing = form.requestId !== null
  const trimmedJustification = form.justification.trim()
  const justificationTooShort = trimmedJustification.length < JUSTIFICATION_MIN_LENGTH
  const canSubmit = form.items.length > 0 && getItemsTotal(form.items) > 0

  function handleOpenChange(nextOpen: boolean) {
    // Mientras se guarda el diálogo no se puede cerrar.
    if (!nextOpen && !isSaving) onClose(hasFailed)
  }

  function handleAddItem(item: PurchaseRequestItemBody) {
    const key = `new-${nextItemKey.current++}`
    setForm((current) => ({ ...current, items: [...current.items, { key, id: null, ...item }] }))
  }

  function handleRemoveItem(item: DraftItem) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((candidate) => candidate.key !== item.key),
      removedItemIds:
        item.id === null ? current.removedItemIds : [...current.removedItemIds, item.id],
    }))
  }

  async function handleSave(mode: SaveMode) {
    if (isSaving) return

    setShowErrors(true)
    if (justificationTooShort) return
    if (mode === 'submit') {
      setShowSubmitError(true)
      if (!canSubmit) return
    }

    setSavingMode(mode)
    setFailure(null)

    try {
      const header: PurchaseRequestBody = {
        priority: form.priority,
        justification: trimmedJustification,
      }
      let requestId = form.requestId
      let requestNumber = form.requestNumber

      // 1. Crear la solicitud; desde aquí el modal pasa a modo editar.
      if (requestId === null) {
        const created = await createPurchaseRequest(header)
        requestId = created.id
        requestNumber = created.requestNumber
        const createdId = created.id
        const createdNumber = created.requestNumber
        setForm((current) => ({
          ...current,
          requestId: createdId,
          requestNumber: createdNumber,
        }))
        setSavedHeader(header)
      } else if (
        savedHeader === null ||
        savedHeader.priority !== header.priority ||
        savedHeader.justification !== header.justification
      ) {
        // 2. Actualizar la cabecera solo si cambió.
        await updatePurchaseRequest(requestId, header)
        setSavedHeader(header)
      }

      // 3. Quitar los ítems que existen en la API.
      for (const itemId of form.removedItemIds) {
        await deletePurchaseRequestItem(requestId, itemId)
        setForm((current) => ({
          ...current,
          removedItemIds: current.removedItemIds.filter((id) => id !== itemId),
        }))
      }

      // 4. Añadir los ítems nuevos.
      for (const item of form.items) {
        if (item.id !== null) continue

        const added = await addPurchaseRequestItem(requestId, {
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
        setForm((current) => ({
          ...current,
          items: current.items.map((candidate) =>
            candidate.key === item.key ? { ...candidate, id: added.id } : candidate,
          ),
        }))
      }

      // 5. Enviar a aprobación.
      if (mode === 'submit') {
        await submitPurchaseRequest(requestId)
      }

      // 6. Éxito.
      const number = requestNumber ?? ''
      onSaved(
        mode === 'submit'
          ? getPurchaseRequestSubmittedMessage(number)
          : getPurchaseRequestDraftSavedMessage(number),
      )
    } catch (error) {
      setFailure(error)
      setHasFailed(true)
    } finally {
      setSavingMode(null)
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{isEditing ? 'Editar solicitud' : 'Nueva solicitud de compra'}</DialogTitle>
            {isEditing && <Badge variant="secondary">{form.requestNumber} (Borrador)</Badge>}
          </div>
          <DialogDescription>
            Completa la justificación e introduce las partidas requeridas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {failure !== null && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                {getPurchaseRequestErrorMessage(failure, 'save')}
                {isSessionError(failure) && (
                  <>
                    {' '}
                    <Link to="/login">Iniciar sesión</Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <fieldset className="flex flex-col gap-1.5" disabled={isSaving}>
            <legend className="mb-1.5 text-sm font-semibold">Prioridad de tramitación</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted',
                    'has-checked:border-primary has-checked:bg-muted has-checked:font-semibold',
                    'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                    'has-disabled:cursor-not-allowed has-disabled:opacity-50',
                  )}
                >
                  <input
                    type="radio"
                    name={priorityName}
                    value={option.value}
                    checked={form.priority === option.value}
                    className="accent-primary"
                    onChange={() => setForm((current) => ({ ...current, priority: option.value }))}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={justificationId} className="font-semibold">
                Justificación del gasto o necesidad
              </Label>
              <span className="text-xs text-muted-foreground">
                {form.justification.length}/{JUSTIFICATION_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id={justificationId}
              value={form.justification}
              maxLength={JUSTIFICATION_MAX_LENGTH}
              rows={3}
              placeholder="Describe el motivo de la adquisición, el proyecto o equipo destinatario y el beneficio esperado..."
              disabled={isSaving}
              aria-invalid={showErrors && justificationTooShort ? true : undefined}
              aria-describedby={
                showErrors && justificationTooShort ? `${justificationId}-error` : undefined
              }
              onChange={(event) =>
                setForm((current) => ({ ...current, justification: event.target.value }))
              }
            />
            {showErrors && justificationTooShort && (
              <p id={`${justificationId}-error`} className="text-xs text-destructive">
                La justificación debe tener al menos {JUSTIFICATION_MIN_LENGTH} caracteres.
              </p>
            )}
          </div>

          <PurchaseRequestItemsEditor
            items={form.items}
            disabled={isSaving}
            onAdd={handleAddItem}
            onRemove={handleRemoveItem}
          />

          {showSubmitError && !canSubmit && (
            <p role="alert" className="text-sm text-destructive">
              Agrega al menos un ítem con importe mayor a cero para enviar.
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onClose(hasFailed)}
          >
            Cancelar
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => handleSave('draft')}
            >
              <Save aria-hidden="true" />
              {savingMode === 'draft' ? 'Guardando...' : 'Guardar como borrador'}
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => handleSave('submit')}>
              <Send aria-hidden="true" />
              {savingMode === 'submit' ? 'Enviando...' : 'Enviar solicitud para aprobación'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PurchaseRequestFormDialog
