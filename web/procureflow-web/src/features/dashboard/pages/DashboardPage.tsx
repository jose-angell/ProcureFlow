import { useEffect, useState } from 'react'
import { UserRole } from '@/features/auth/types'
import { getSession } from '@/features/auth/session'
import { getPurchaseRequestSummary } from '@/features/purchase-requests/api/purchaseRequests'
import type { PurchaseRequestSummary } from '@/features/purchase-requests/types'
import { ApiError } from '@/shared/api/httpClient'
import BlockError from '../components/BlockError'
import PendingDecisions from '../components/PendingDecisions'
import RecentRequestsTable from '../components/RecentRequestsTable'
import RequesterDashboard from '../components/RequesterDashboard'
import RequestsByDepartment from '../components/RequestsByDepartment'
import SummaryCards from '../components/SummaryCards'

type SummaryState = { summary: PurchaseRequestSummary } | { error: unknown }

function DashboardHeader() {
  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Panel de Control de Compras
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Supervisa el flujo de solicitudes de compra y sus decisiones.
      </p>
    </div>
  )
}

function DashboardContent({ role }: { role: UserRole }) {
  const [state, setState] = useState<SummaryState | null>(null)

  useEffect(() => {
    let cancelled = false

    getPurchaseRequestSummary()
      .then((summary) => {
        if (!cancelled) setState({ summary })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ error })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const summaryProps = {
    summary: state && 'summary' in state ? state.summary : null,
    isLoading: state === null,
    error: state && 'error' in state ? state.error : null,
  }
  const canDecide = role !== UserRole.Requester

  return (
    <section className="flex flex-col gap-6">
      <DashboardHeader />

      <SummaryCards {...summaryProps} />

      <RecentRequestsTable />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={canDecide ? undefined : 'lg:col-span-2'}>
          <RequestsByDepartment {...summaryProps} />
        </div>
        {canDecide && <PendingDecisions />}
      </div>
    </section>
  )
}

function DashboardPage() {
  const session = getSession()

  // Sin sesión no se llama a la API: se muestra el mismo aviso que ante un 401.
  if (!session) {
    return (
      <section className="flex flex-col gap-6">
        <DashboardHeader />
        <BlockError error={new ApiError(401)} />
      </section>
    )
  }

  if (session.user.role === UserRole.Requester) {
    return <RequesterDashboard />
  }

  return <DashboardContent role={session.user.role} />
}

export default DashboardPage
