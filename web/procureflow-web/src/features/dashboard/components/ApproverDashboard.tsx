import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getPurchaseRequestSummary } from '@/features/purchase-requests/api/purchaseRequests'
import {
  PurchaseRequestStatus,
  type PurchaseRequest,
  type PurchaseRequestSummary,
} from '@/features/purchase-requests/types'
import { isSessionError } from '../dashboardErrors'
import {
  getDecisionErrorMessage,
  getDecisionSuccessMessage,
  type Decision,
} from '../decisionErrors'
import ApproverSummaryCards from './ApproverSummaryCards'
import DecideRequestButton from './DecideRequestButton'
import DepartmentApprovals from './DepartmentApprovals'
import RecentRequestsTable from './RecentRequestsTable'
import RequestsByDepartment from './RequestsByDepartment'

// El resultado guarda la clave de recarga que lo originó: mientras la clave
// actual no coincida, el bloque está cargando.
type SummaryState = { key: number } & (
  | { summary: PurchaseRequestSummary }
  | { error: unknown }
)

type DecisionResult = { success: string } | { error: unknown }

function ApproverDashboard() {
  const [reloadKey, setReloadKey] = useState(0)
  const [summaryState, setSummaryState] = useState<SummaryState | null>(null)
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null)

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
  const summary = current && 'summary' in current ? current.summary : null
  const summaryError = current && 'error' in current ? current.error : null
  const isLoading = current === null

  function handleDecided(requestNumber: string, decision: Decision) {
    setDecisionResult({ success: getDecisionSuccessMessage(requestNumber, decision) })
    setReloadKey((key) => key + 1)
  }

  function handleDecisionError(error: unknown) {
    setDecisionResult({ error })
    // El estado de la solicitud pudo cambiar: se vuelve a cargar todo.
    setReloadKey((key) => key + 1)
  }

  function renderActions(request: PurchaseRequest) {
    if (request.status !== PurchaseRequestStatus.Submitted) return null

    return (
      <DecideRequestButton
        request={request}
        onDecided={handleDecided}
        onError={handleDecisionError}
      />
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Gestión y Aprobación de Compras
          </h1>
          <span className="rounded-full bg-[#dbe1ff] px-2 py-0.5 text-[11px] font-semibold text-[#00174b]">
            Panel Aprobador
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisa las solicitudes departamentales, revisa partidas presupuestarias y
          autoriza compras pendientes.
        </p>
      </div>

      <ApproverSummaryCards summary={summary} isLoading={isLoading} error={summaryError} />

      {decisionResult && (
        <Alert variant={'error' in decisionResult ? 'destructive' : 'default'}>
          {'error' in decisionResult ? (
            <CircleAlert aria-hidden="true" />
          ) : (
            <CircleCheck aria-hidden="true" />
          )}
          <AlertDescription>
            {'error' in decisionResult
              ? getDecisionErrorMessage(decisionResult.error)
              : decisionResult.success}
            {'error' in decisionResult && isSessionError(decisionResult.error) && (
              <>
                {' '}
                <Link to="/login">Iniciar sesión</Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <RecentRequestsTable
        title="Solicitudes del departamento"
        showDepartmentColumn={false}
        renderActions={renderActions}
        reloadKey={reloadKey}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DepartmentApprovals summary={summary} isLoading={isLoading} error={summaryError} />
        <RequestsByDepartment summary={summary} isLoading={isLoading} error={summaryError} />
      </div>
    </section>
  )
}

export default ApproverDashboard
