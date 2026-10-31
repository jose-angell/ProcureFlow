import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import {
  getDecisionErrorMessage,
  getDecisionSuccessMessage,
  type Decision,
} from '@/features/dashboard/decisionErrors'
import { getPurchaseRequestSummary } from '@/features/purchase-requests/api/purchaseRequests'
import type { PurchaseRequest, PurchaseRequestSummary } from '@/features/purchase-requests/types'
import { cn } from '@/lib/utils'
import ApprovalStatsCards from '../components/ApprovalStatsCards'
import ApprovalsTable from '../components/ApprovalsTable'
import DecisionDialog from '../components/DecisionDialog'
import type { ApprovalTab } from '../types'

type SummaryState = { summary: PurchaseRequestSummary } | { error: unknown }
type ActionResult = { success: string } | { error: unknown }

const TABS: { id: ApprovalTab; label: string }[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'history', label: 'Historial de mis decisiones' },
]

function ApprovalsContent({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending')
  // Al recargar se conservan las tarjetas anteriores hasta que llegan las nuevas.
  const [summaryState, setSummaryState] = useState<SummaryState | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  // `null` = modal cerrado; `decide` abre el modal de decisión y `view` el de solo lectura.
  const [dialog, setDialog] = useState<{
    mode: 'decide' | 'view'
    request: PurchaseRequest
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    getPurchaseRequestSummary()
      .then((summary) => {
        if (!cancelled) setSummaryState({ summary })
      })
      .catch((error: unknown) => {
        if (!cancelled) setSummaryState({ error })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const summary = summaryState && 'summary' in summaryState ? summaryState.summary : null

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function handleDecided(requestNumber: string, decision: Decision) {
    setActionResult({ success: getDecisionSuccessMessage(requestNumber, decision) })
    setDialog(null)
    reload()
  }

  function handleDecisionError(error: unknown) {
    setActionResult({ error })
    setDialog(null)
    // El estado pudo cambiar (p. ej. otra pestaña ya decidió): se vuelve a cargar.
    reload()
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Gestión de Aprobaciones
          </h1>
          <Badge variant="secondary">Cola activa</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa, autoriza o rechaza las solicitudes de compra pendientes de tu departamento.
        </p>
      </div>

      {actionResult && (
        <Alert variant={'error' in actionResult ? 'destructive' : 'default'}>
          {'error' in actionResult ? (
            <CircleAlert aria-hidden="true" />
          ) : (
            <CircleCheck aria-hidden="true" />
          )}
          <AlertDescription>
            {'error' in actionResult
              ? getDecisionErrorMessage(actionResult.error)
              : actionResult.success}
            {'error' in actionResult && isSessionError(actionResult.error) && (
              <>
                {' '}
                <Link to="/login">Iniciar sesión</Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <ApprovalStatsCards
        summary={summary}
        isLoading={summaryState === null}
        error={summaryState && 'error' in summaryState ? summaryState.error : null}
      />

      <div
        role="tablist"
        aria-label="Vistas de aprobaciones"
        className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`approvals-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`approvals-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.id === 'pending' && summary && (
                <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
                  {summary.submitted}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`approvals-panel-${activeTab}`}
        aria-labelledby={`approvals-tab-${activeTab}`}
      >
        <ApprovalsTable
          key={activeTab}
          tab={activeTab}
          isAdmin={isAdmin}
          reloadKey={reloadKey}
          onDecide={(request) => setDialog({ mode: 'decide', request })}
          onView={(request) => setDialog({ mode: 'view', request })}
        />
      </div>

      {dialog?.mode === 'decide' && (
        <DecisionDialog
          key={dialog.request.id}
          mode="decide"
          request={dialog.request}
          onDecided={handleDecided}
          onError={handleDecisionError}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.mode === 'view' && (
        <DecisionDialog
          key={dialog.request.id}
          mode="view"
          request={dialog.request}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}

function ApprovalsPage() {
  const role = getSession()?.user.role

  // La API es la autoridad (403); aquí solo se evita mostrar una pantalla inútil.
  if (role !== UserRole.Approver && role !== UserRole.Admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <ApprovalsContent isAdmin={role === UserRole.Admin} />
}

export default ApprovalsPage
