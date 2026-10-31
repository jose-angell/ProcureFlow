import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import { getPurchaseRequestSummary } from '@/features/purchase-requests/api/purchaseRequests'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import { cn } from '@/lib/utils'
import ApprovalStatsCards from '../components/ApprovalStatsCards'
import ApprovalsTable from '../components/ApprovalsTable'
import type { ApprovalTab } from '../types'

type SummaryState = { summary: PurchaseRequestSummary } | { error: unknown }

const TABS: { id: ApprovalTab; label: string }[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'history', label: 'Historial de mis decisiones' },
]

function ApprovalsContent({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending')
  const [summaryState, setSummaryState] = useState<SummaryState | null>(null)

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
  }, [])

  const summary = summaryState && 'summary' in summaryState ? summaryState.summary : null

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
          reloadKey={0}
          onDecide={() => undefined}
          onView={() => undefined}
        />
      </div>
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
