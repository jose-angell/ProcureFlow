import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getPurchaseRequestSummary } from '@/features/purchase-requests/api/purchaseRequests'
import {
  PurchaseRequestStatus,
  type PurchaseRequest,
  type PurchaseRequestSummary,
} from '@/features/purchase-requests/types'
import {
  getCancelRequestErrorMessage,
  getCancelRequestSuccessMessage,
} from '../cancelRequestErrors'
import { isSessionError } from '../dashboardErrors'
import CancelRequestButton from './CancelRequestButton'
import RecentRequestsTable from './RecentRequestsTable'
import RequesterSummaryCards from './RequesterSummaryCards'

// El resultado guarda la clave de recarga que lo originó: mientras la clave
// actual no coincida, el bloque está cargando.
type SummaryState = { key: number } & (
  | { summary: PurchaseRequestSummary }
  | { error: unknown }
)

type CancelResult = { success: string } | { error: unknown }

function RequesterDashboard() {
  const [reloadKey, setReloadKey] = useState(0)
  const [summaryState, setSummaryState] = useState<SummaryState | null>(null)
  const [cancelResult, setCancelResult] = useState<CancelResult | null>(null)

  useEffect(() => {
    let cancelled = false

    getPurchaseRequestSummary()
      .then((summary) => {
        if (!cancelled) setSummaryState({ key: reloadKey, summary })
      })
      .catch((error: unknown) => {
        if (!cancelled) setSummaryState({ key: reloadKey, error })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const current = summaryState && summaryState.key === reloadKey ? summaryState : null

  function handleCancelled(requestNumber: string) {
    setCancelResult({ success: getCancelRequestSuccessMessage(requestNumber) })
    setReloadKey((key) => key + 1)
  }

  function handleCancelError(error: unknown) {
    setCancelResult({ error })
    // El estado de la solicitud pudo cambiar: se vuelve a cargar todo.
    setReloadKey((key) => key + 1)
  }

  function renderActions(request: PurchaseRequest) {
    const canCancel =
      request.status === PurchaseRequestStatus.Draft ||
      request.status === PurchaseRequestStatus.Submitted

    if (!canCancel) return null

    return (
      <CancelRequestButton
        request={request}
        onCancelled={handleCancelled}
        onError={handleCancelError}
      />
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Mis Solicitudes de Compra
            </h1>
            <span className="rounded-full bg-[#dbe1ff] px-2 py-0.5 text-[11px] font-semibold text-[#00174b]">
              Panel Solicitante
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta el estado de tus solicitudes, crea nuevas peticiones y gestiona tus
            borradores en tiempo real.
          </p>
        </div>

        <Button type="button" disabled>
          <Plus aria-hidden="true" />
          Nueva solicitud
        </Button>
      </div>

      <RequesterSummaryCards
        summary={current && 'summary' in current ? current.summary : null}
        isLoading={current === null}
        error={current && 'error' in current ? current.error : null}
      />

      {cancelResult && (
        <Alert variant={'error' in cancelResult ? 'destructive' : 'default'}>
          {'error' in cancelResult ? (
            <CircleAlert aria-hidden="true" />
          ) : (
            <CircleCheck aria-hidden="true" />
          )}
          <AlertDescription>
            {'error' in cancelResult
              ? getCancelRequestErrorMessage(cancelResult.error)
              : cancelResult.success}
            {'error' in cancelResult && isSessionError(cancelResult.error) && (
              <>
                {' '}
                <Link to="/login">Iniciar sesión</Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <RecentRequestsTable
        title="Mis solicitudes recientes"
        showRequesterColumn={false}
        showDepartmentColumn={false}
        renderActions={renderActions}
        reloadKey={reloadKey}
      />
    </section>
  )
}

export default RequesterDashboard
