import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Plus } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import {
  getCancelRequestErrorMessage,
  getCancelRequestSuccessMessage,
} from '@/features/dashboard/cancelRequestErrors'
import { isSessionError } from '@/features/dashboard/dashboardErrors'
import { getPurchaseRequestSummary } from '../api/purchaseRequests'
import PurchaseRequestFormDialog from '../components/PurchaseRequestFormDialog'
import PurchaseRequestStatsCards from '../components/PurchaseRequestStatsCards'
import PurchaseRequestsTable from '../components/PurchaseRequestsTable'
import {
  getPurchaseRequestErrorMessage,
  type PurchaseRequestOperation,
} from '../purchaseRequestErrors'
import type { PurchaseRequest, PurchaseRequestSummary } from '../types'

type SummaryState = { summary: PurchaseRequestSummary } | { error: unknown }
type ActionResult =
  | { success: string }
  | { error: unknown; operation: PurchaseRequestOperation | 'cancel' }

function getErrorMessage(error: unknown, operation: PurchaseRequestOperation | 'cancel') {
  return operation === 'cancel'
    ? getCancelRequestErrorMessage(error)
    : getPurchaseRequestErrorMessage(error, operation)
}

function PurchaseRequestsContent({ isAdmin }: { isAdmin: boolean }) {
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // `null` = modal cerrado; `{ request: null }` = crear; `{ request }` = editar.
  const [formDialog, setFormDialog] = useState<{ request: PurchaseRequest | null } | null>(null)
  // Al recargar se conservan las tarjetas anteriores hasta que llegan las nuevas.
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
  }, [reloadKey])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function handleSaved(message: string) {
    setActionResult({ success: message })
    setFormDialog(null)
    reload()
  }

  function handleFormClose(hasFailed: boolean) {
    setFormDialog(null)
    // Un guardado a medias deja la solicitud creada o modificada: la lista está desactualizada.
    if (hasFailed) reload()
  }

  function handleCancelled(requestNumber: string) {
    setActionResult({ success: getCancelRequestSuccessMessage(requestNumber) })
    reload()
  }

  function handleCancelError(error: unknown) {
    setActionResult({ error, operation: 'cancel' })
    // El estado pudo cambiar (p. ej. ya no está en borrador o enviada): se vuelve a cargar.
    reload()
  }

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

        <Button type="button" onClick={() => setFormDialog({ request: null })}>
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

      <PurchaseRequestsTable
        isAdmin={isAdmin}
        reloadKey={reloadKey}
        onEdit={(request) => setFormDialog({ request })}
        onCancelled={handleCancelled}
        onCancelError={handleCancelError}
      />

      {formDialog && (
        <PurchaseRequestFormDialog
          key={formDialog.request?.id ?? 'new'}
          request={formDialog.request}
          onSaved={handleSaved}
          onClose={handleFormClose}
        />
      )}
    </section>
  )
}

function PurchaseRequestsPage() {
  const role = getSession()?.user.role

  // La API es la autoridad (403); aquí solo se evita mostrar una pantalla inútil.
  if (role !== UserRole.Requester && role !== UserRole.Admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <PurchaseRequestsContent isAdmin={role === UserRole.Admin} />
}

export default PurchaseRequestsPage
