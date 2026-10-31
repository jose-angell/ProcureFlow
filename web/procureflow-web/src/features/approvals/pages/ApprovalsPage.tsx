import { useState } from 'react'
import { Navigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import { cn } from '@/lib/utils'
import type { ApprovalTab } from '../types'

const TABS: { id: ApprovalTab; label: string }[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'history', label: 'Historial de mis decisiones' },
]

function ApprovalsContent() {
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending')

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
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`approvals-panel-${activeTab}`}
        aria-labelledby={`approvals-tab-${activeTab}`}
      />
    </section>
  )
}

function ApprovalsPage() {
  const role = getSession()?.user.role

  // La API es la autoridad (403); aquí solo se evita mostrar una pantalla inútil.
  if (role !== UserRole.Approver && role !== UserRole.Admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <ApprovalsContent />
}

export default ApprovalsPage
