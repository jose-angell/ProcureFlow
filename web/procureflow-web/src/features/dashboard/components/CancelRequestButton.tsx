import { useState } from 'react'
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
import { cancelPurchaseRequest } from '@/features/purchase-requests/api/purchaseRequests'
import type { PurchaseRequest } from '@/features/purchase-requests/types'

interface CancelRequestButtonProps {
  request: Pick<PurchaseRequest, 'id' | 'requestNumber'>
  onCancelled: (requestNumber: string) => void
  onError: (error: unknown) => void
}

/** Botón "Cancelar" de una fila. Pide confirmación antes de llamar a la API. */
function CancelRequestButton({ request, onCancelled, onError }: CancelRequestButtonProps) {
  const [open, setOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    // Mientras la petición está en curso el diálogo no se puede cerrar.
    if (!isCancelling) setOpen(nextOpen)
  }

  async function handleConfirm() {
    setIsCancelling(true)

    try {
      await cancelPurchaseRequest(request.id)
      setOpen(false)
      onCancelled(request.requestNumber)
    } catch (error) {
      setOpen(false)
      onError(error)
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Cancelar
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la solicitud {request.requestNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La solicitud pasará a estado Cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Volver</AlertDialogCancel>
            {/* Button y no AlertDialogAction: este último cierra el diálogo al pulsarlo. */}
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={handleConfirm}
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar solicitud'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default CancelRequestButton
