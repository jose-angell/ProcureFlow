import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Plus } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import { getCancelRequestErrorMessage } from '@/features/dashboard/cancelRequestErrors'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { getPurchaseRequestSummary } from '../api/purchaseRequests'
import PurchaseRequestStatsCards from '../components/PurchaseRequestStatsCards'
import {
  getPurchaseRequestErrorMessage,
  type PurchaseRequestOperation,
} from '../purchaseRequestErrors'
import type { PurchaseRequestSummary } from '../types'

type SummaryState = { summary: PurchaseRequestSummary } | { error: unknown }
type ActionResult =
  | { success: string }
  | { error: unknown; operation: PurchaseRequestOperation | 'cancel' }

function getErrorMessage(error: unknown, operation: PurchaseRequestOperation | 'cancel') {
  return operation === 'cancel'
    ? getCancelRequestErrorMessage(error)
    : getPurchaseRequestErrorMessage(error, operation)
}

function PurchaseRequestsContent() {
  // Lo asignan guardar, enviar y cancelar cuando se conecten (pasos siguientes).
  const [actionResult] = useState<ActionResult | null>(null)
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

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Mis Solicitudes de Compra
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona, consulta el estado de aprobación y da seguimiento a tus requerimientos de
            compra.
          </p>
        </div>

        <Button type="button" disabled>
          <Plus aria-hidden="true" />
          Nueva solicitud
        </Button>
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
              ? getErrorMessage(actionResult.error, actionResult.operation)
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

      <PurchaseRequestStatsCards
        summary={summaryState && 'summary' in summaryState ? summaryState.summary : null}
        isLoading={summaryState === null}
        error={summaryState && 'error' in summaryState ? summaryState.error : null}
      />
    </section>
  )
}

function PurchaseRequestsPage() {
  const role = getSession()?.user.role

  // La API es la autoridad (403); aquí solo se evita mostrar una pantalla inútil.
  if (role !== UserRole.Requester && role !== UserRole.Admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <PurchaseRequestsContent />
}

export default PurchaseRequestsPage
