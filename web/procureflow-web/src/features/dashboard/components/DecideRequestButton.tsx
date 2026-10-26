import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  approvePurchaseRequest,
  rejectPurchaseRequest,
} from '@/features/purchase-requests/api/purchaseRequests'
import type { PurchaseRequest } from '@/features/purchase-requests/types'
import { formatCurrency } from '@/shared/lib/format'
import type { Decision } from '../decisionErrors'

const MAX_COMMENT_LENGTH = 1000

interface DecideRequestButtonProps {
  request: Pick<
    PurchaseRequest,
    'id' | 'requestNumber' | 'requestedByName' | 'totalAmount' | 'justification'
  >
  onDecided: (requestNumber: string, decision: Decision) => void
  onError: (error: unknown) => void
}

/** Botón "Decidir" de una fila. Abre un diálogo para aprobar o rechazar con comentario. */
function DecideRequestButton({ request, onDecided, onError }: DecideRequestButtonProps) {
  const commentId = useId()
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState('')
  const [pending, setPending] = useState<Decision | null>(null)

  const isSubmitting = pending !== null
  const trimmedComments = comments.trim()

  function handleOpen() {
    setComments('')
    setOpen(true)
  }

  function handleOpenChange(nextOpen: boolean) {
    // Mientras la petición está en curso el diálogo no se puede cerrar.
    if (!isSubmitting) setOpen(nextOpen)
  }

  async function decide(decision: Decision) {
    setPending(decision)

    try {
      if (decision === 'approved') {
        await approvePurchaseRequest(request.id, trimmedComments || null)
      } else {
        await rejectPurchaseRequest(request.id, trimmedComments)
      }
      setOpen(false)
      onDecided(request.requestNumber, decision)
    } catch (error) {
      setOpen(false)
      onError(error)
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <Button type="button" size="sm" onClick={handleOpen}>
        Decidir
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decidir sobre la solicitud {request.requestNumber}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">Solicitante: {request.requestedByName}</span>
              <span className="block">Importe: {formatCurrency(request.totalAmount)}</span>
              <span className="block break-words">Justificación: {request.justification}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor={commentId}>Comentario</Label>
            <Textarea
              id={commentId}
              value={comments}
              maxLength={MAX_COMMENT_LENGTH}
              disabled={isSubmitting}
              onChange={(event) => setComments(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Opcional al aprobar. Obligatorio al rechazar.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Volver</AlertDialogCancel>
            {/* Button y no AlertDialogAction: este último cierra el diálogo al pulsarlo. */}
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting || trimmedComments === ''}
              onClick={() => decide('rejected')}
            >
              {pending === 'rejected' ? 'Rechazando...' : 'Rechazar'}
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={() => decide('approved')}>
              {pending === 'approved' ? 'Aprobando...' : 'Aprobar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default DecideRequestButton
