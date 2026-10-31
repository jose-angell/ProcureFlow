import { useEffect, useId, useState } from 'react'
import { CircleAlert, CircleCheck, CircleX, ListChecks } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { getDecisionErrorMessage, type Decision } from '@/features/dashboard/decisionErrors'
import {
  approvePurchaseRequest,
  getPurchaseRequest,
  rejectPurchaseRequest,
} from '@/features/purchase-requests/api/purchaseRequests'
import PriorityBadge from '@/features/purchase-requests/components/PriorityBadge'
import StatusBadge from '@/features/purchase-requests/components/StatusBadge'
import { PurchaseRequestStatus } from '@/features/purchase-requests/types'
import type { PurchaseRequest, PurchaseRequestDetail } from '@/features/purchase-requests/types'
import { formatCurrency, formatDate } from '@/shared/lib/format'

const MAX_COMMENT_LENGTH = 1000

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; detail: PurchaseRequestDetail }
  | { status: 'error'; error: unknown }

type DecisionDialogProps = {
  request: PurchaseRequest
  onClose: () => void
} & (
  | {
      mode: 'decide'
      /** El padre cierra el diálogo, muestra el mensaje y recarga. */
      onDecided: (requestNumber: string, decision: Decision) => void
      /** El padre cierra el diálogo, muestra el error y recarga: el estado pudo cambiar. */
      onError: (error: unknown) => void
    }
  // Solo lectura: muestra la decisión ya registrada, sin acciones.
  | { mode: 'view' }
)

/**
 * Modal para aprobar o rechazar una solicitud con sus partidas, o para consultar
 * la decisión ya tomada. Se monta abierto y el padre lo desmonta al cerrarlo,
 * así cada apertura empieza limpia.
 */
function DecisionDialog(props: DecisionDialogProps) {
  const { request, onClose } = props
  const isView = props.mode === 'view'
  const commentId = useId()
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [comments, setComments] = useState('')
  const [pending, setPending] = useState<Decision | null>(null)

  useEffect(() => {
    let cancelled = false

    getPurchaseRequest(request.id)
      .then((detail) => {
        if (!cancelled) setLoadState({ status: 'ready', detail })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadState({ status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [request.id])

  const isSubmitting = pending !== null
  const trimmedComments = comments.trim()
  const detail = loadState.status === 'ready' ? loadState.detail : null
  const isNotPending =
    !isView && detail !== null && detail.status !== PurchaseRequestStatus.Submitted
  const canDecide = detail !== null && !isNotPending

  function handleOpenChange(nextOpen: boolean) {
    // Mientras la petición está en curso el diálogo no se puede cerrar.
    if (!nextOpen && !isSubmitting) onClose()
  }

  async function decide(decision: Decision) {
    if (props.mode !== 'decide' || isSubmitting || !canDecide) return

    setPending(decision)

    try {
      if (decision === 'approved') {
        await approvePurchaseRequest(request.id, trimmedComments || null)
      } else {
        await rejectPurchaseRequest(request.id, trimmedComments)
      }
      props.onDecided(request.requestNumber, decision)
    } catch (error) {
      props.onError(error)
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{isView ? 'Detalle de la decisión' : 'Decisión de solicitud de compra'}</DialogTitle>
            <Badge variant="secondary">{request.requestNumber}</Badge>
            {isView ? (
              <StatusBadge status={request.status} />
            ) : (
              <PriorityBadge priority={request.priority} />
            )}
          </div>
          <DialogDescription>
            Revisa los detalles de la solicitud y las partidas antes de registrar tu decisión.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {loadState.status === 'error' && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                {getDecisionErrorMessage(loadState.error)}
                {isSessionError(loadState.error) && (
                  <>
                    {' '}
                    <Link to="/login">Iniciar sesión</Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isNotPending && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>La solicitud ya no está pendiente de decisión.</AlertDescription>
            </Alert>
          )}

          {loadState.status === 'loading' ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            detail && (
              <>
                <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Solicitante
                    </dt>
                    <dd className="font-medium">{detail.requestedByName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Departamento
                    </dt>
                    <dd className="font-medium">{detail.departmentName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Importe total
                    </dt>
                    <dd className="font-heading text-lg font-bold">
                      {formatCurrency(detail.totalAmount)}
                    </dd>
                  </div>
                  <div className="sm:col-span-3">
                    <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Justificación
                    </dt>
                    <dd className="wrap-break-word">{detail.justification}</dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <ListChecks aria-hidden="true" className="size-4.5 text-secondary" />
                    Partidas incluidas ({detail.items.length}{' '}
                    {detail.items.length === 1 ? 'partida' : 'partidas'})
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead scope="col" className="text-xs font-semibold uppercase">
                            Descripción
                          </TableHead>
                          <TableHead
                            scope="col"
                            className="text-center text-xs font-semibold uppercase"
                          >
                            Cantidad
                          </TableHead>
                          <TableHead
                            scope="col"
                            className="text-right text-xs font-semibold uppercase"
                          >
                            Precio Ud.
                          </TableHead>
                          <TableHead
                            scope="col"
                            className="text-right text-xs font-semibold uppercase"
                          >
                            Subtotal
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="max-w-xs whitespace-normal font-medium">
                              {item.description}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="font-semibold">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(detail.totalAmount)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>

                {isView ? (
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-4">
                    <h3 className="text-sm font-semibold">Comentarios de la decisión</h3>
                    {detail.decidedAt && (
                      <p className="text-xs text-muted-foreground">
                        Decidida por {detail.decidedByName ?? 'un aprobador'} el{' '}
                        {formatDate(detail.decidedAt)}
                      </p>
                    )}
                    <p className="wrap-break-word">
                      {detail.decisionComment || 'Sin comentario.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={commentId} className="font-semibold">
                      Comentarios de la decisión
                    </Label>
                    <Textarea
                      id={commentId}
                      value={comments}
                      maxLength={MAX_COMMENT_LENGTH}
                      rows={3}
                      disabled={isSubmitting || isNotPending}
                      placeholder="Escribe las observaciones o motivos de tu decisión..."
                      onChange={(event) => setComments(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Obligatorio si se rechaza • Opcional si se aprueba
                    </p>
                  </div>
                )}
              </>
            )
          )}
        </div>

        {isView ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancelar
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting || !canDecide || trimmedComments === ''}
                onClick={() => decide('rejected')}
              >
                <CircleX aria-hidden="true" />
                {pending === 'rejected' ? 'Rechazando...' : 'Rechazar solicitud'}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting || !canDecide}
                onClick={() => decide('approved')}
              >
                <CircleCheck aria-hidden="true" />
                {pending === 'approved' ? 'Aprobando...' : 'Aprobar solicitud'}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DecisionDialog
