import { useEffect, useState, type SyntheticEvent } from 'react'
import { ChevronLeft, ChevronRight, Eye, Gavel, RotateCcw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import BlockError from '@/features/dashboard/components/BlockError'
import { getDepartments } from '@/features/departments/api/departments'
import type { Department } from '@/features/departments/types'
import { getPurchaseRequests } from '@/features/purchase-requests/api/purchaseRequests'
import PriorityBadge from '@/features/purchase-requests/components/PriorityBadge'
import StatusBadge from '@/features/purchase-requests/components/StatusBadge'
import type {
  PagedResult,
  PurchaseRequest,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from '@/features/purchase-requests/types'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import type { ApprovalTab } from '../types'

type HistoryStatusFilter = 'all' | 'Approved' | 'Rejected'
type PriorityFilter = 'all' | keyof typeof PurchaseRequestPriority

// Las etiquetas son las de StatusBadge y PriorityBadge.
const HISTORY_STATUS_OPTIONS: { value: HistoryStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Approved', label: 'Aprobada' },
  { value: 'Rejected', label: 'Rechazada' },
]

const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'Low', label: 'Baja' },
  { value: 'Medium', label: 'Media' },
  { value: 'High', label: 'Alta' },
  { value: 'Urgent', label: 'Urgente' },
]

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

interface Column {
  label: string
  className: string
}

const COLUMNS: Record<ApprovalTab, Column[]> = {
  pending: [
    { label: 'Nº de solicitud', className: '' },
    { label: 'Solicitante / Dpto.', className: '' },
    { label: 'Justificación', className: '' },
    { label: 'Importe total', className: 'text-right' },
    { label: 'Fecha de creación', className: '' },
    { label: 'Prioridad', className: '' },
    { label: 'Acciones', className: 'text-right' },
  ],
  history: [
    { label: 'Nº de solicitud', className: '' },
    { label: 'Solicitante / Dpto.', className: '' },
    { label: 'Justificación', className: '' },
    { label: 'Importe total', className: 'text-right' },
    { label: 'Estado / Fecha de decisión', className: '' },
    { label: 'Prioridad', className: '' },
    { label: 'Comentarios', className: '' },
    { label: 'Acciones', className: 'text-right' },
  ],
}

/** Hasta dos iniciales: primera y última palabra del nombre. */
function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// El resultado guarda la clave de la petición que lo originó: mientras la clave
// actual no coincida, la tabla está cargando.
type RequestsState = { key: string } & (
  | { result: PagedResult<PurchaseRequest> }
  | { error: unknown }
)

type DepartmentsState = { departments: Department[] } | { error: unknown }

interface ApprovalsTableProps {
  tab: ApprovalTab
  /** El Admin puede filtrar por departamento. */
  isAdmin: boolean
  /** Cambiar su valor vuelve a cargar la tabla conservando filtros y página. */
  reloadKey: number
  onDecide: (request: PurchaseRequest) => void
  onView: (request: PurchaseRequest) => void
}

/** Se monta con `key={tab}`: cambiar de pestaña reinicia filtros y página. */
function ApprovalsTable({ tab, isAdmin, reloadKey, onDecide, onView }: ApprovalsTableProps) {
  const columns = COLUMNS[tab]
  const [searchInput, setSearchInput] = useState('')
  const [requestNumber, setRequestNumber] = useState('')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [departmentId, setDepartmentId] = useState('all')
  const [historyStatus, setHistoryStatus] = useState<HistoryStatusFilter>('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<RequestsState | null>(null)
  const [departmentsState, setDepartmentsState] = useState<DepartmentsState | null>(null)

  const requestKey = `${requestNumber}|${priority}|${departmentId}|${historyStatus}|${pageSize}|${page}|${reloadKey}`

  useEffect(() => {
    if (!isAdmin) return

    let cancelled = false

    getDepartments()
      .then((departments) => {
        if (!cancelled) setDepartmentsState({ departments })
      })
      .catch((error: unknown) => {
        if (!cancelled) setDepartmentsState({ error })
      })

    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    let cancelled = false

    const status: keyof typeof PurchaseRequestStatus | undefined =
      tab === 'pending' ? 'Submitted' : historyStatus === 'all' ? undefined : historyStatus

    getPurchaseRequests({
      requestNumber: requestNumber || undefined,
      status,
      priority: priority === 'all' ? undefined : priority,
      decidedByMe: tab === 'history' ? true : undefined,
      departmentId: departmentId === 'all' ? undefined : departmentId,
      page,
      pageSize,
    })
      .then((result) => {
        if (cancelled) return

        // Tras decidir la última fila de la última página, esa página ya no existe.
        if (result.items.length === 0 && result.totalCount > 0 && page > 1) {
          setPage(Math.ceil(result.totalCount / pageSize))
          return
        }

        setState({ key: requestKey, result })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ key: requestKey, error })
      })

    return () => {
      cancelled = true
    }
  }, [tab, requestNumber, priority, departmentId, historyStatus, pageSize, page, requestKey])

  const current = state && state.key === requestKey ? state : null
  const isLoading = current === null
  const hasFilters =
    requestNumber !== '' || priority !== 'all' || departmentId !== 'all' || historyStatus !== 'all'

  const departments =
    departmentsState && 'departments' in departmentsState ? departmentsState.departments : []
  const departmentOptions = [
    { value: 'all', label: 'Todos' },
    ...departments.map((department) => ({ value: department.id, label: department.name })),
  ]

  function handleSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestNumber(searchInput.trim())
    setPage(1)
  }

  function handlePriorityChange(value: string | null) {
    setPriority((value ?? 'all') as PriorityFilter)
    setPage(1)
  }

  function handleDepartmentChange(value: string | null) {
    setDepartmentId(value ?? 'all')
    setPage(1)
  }

  function handleHistoryStatusChange(value: string | null) {
    setHistoryStatus((value ?? 'all') as HistoryStatusFilter)
    setPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    setPageSize(Number(value ?? '10'))
    setPage(1)
  }

  function handleClear() {
    setSearchInput('')
    setRequestNumber('')
    setPriority('all')
    setDepartmentId('all')
    setHistoryStatus('all')
    setPage(1)
  }

  const result = current && 'result' in current ? current.result : null
  const totalCount = result?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = result ? from + result.items.length - 1 : 0

  const emptyMessage = hasFilters
    ? 'Ninguna solicitud coincide con los filtros.'
    : tab === 'pending'
      ? 'No tienes solicitudes pendientes de decisión.'
      : 'Aún no has decidido ninguna solicitud.'

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-2 border-b border-border p-4 lg:flex-row lg:flex-wrap lg:items-center">
        <form onSubmit={handleSearch} role="search" className="relative flex-1 lg:min-w-64">
          <Label htmlFor="approvals-search" className="sr-only">
            Buscar por número de solicitud
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="approvals-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por número (PR-2026-...) y pulsar Enter"
            maxLength={50}
            className="pl-9"
          />
        </form>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Label htmlFor="approvals-department-filter" className="text-muted-foreground">
              Departamento:
            </Label>
            <Select
              items={departmentOptions}
              value={departmentId}
              onValueChange={handleDepartmentChange}
              disabled={departmentsState === null || 'error' in departmentsState}
            >
              <SelectTrigger id="approvals-department-filter" className="min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {tab === 'history' && (
          <div className="flex items-center gap-2">
            <Label htmlFor="approvals-status-filter" className="text-muted-foreground">
              Estado:
            </Label>
            <Select
              items={HISTORY_STATUS_OPTIONS}
              value={historyStatus}
              onValueChange={handleHistoryStatusChange}
            >
              <SelectTrigger id="approvals-status-filter" className="min-w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HISTORY_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Label htmlFor="approvals-priority-filter" className="text-muted-foreground">
            Prioridad:
          </Label>
          <Select items={PRIORITY_OPTIONS} value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger id="approvals-priority-filter" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="ghost" onClick={handleClear}>
          <RotateCcw aria-hidden="true" />
          Limpiar filtros
        </Button>
      </div>

      {current && 'error' in current ? (
        <div className="p-4">
          <BlockError error={current.error} />
        </div>
      ) : (
        <>
          <Table aria-busy={isLoading}>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {columns.map((column) => (
                  <TableHead
                    key={column.label}
                    scope="col"
                    className={cn(
                      'text-xs font-semibold tracking-wider uppercase',
                      column.className,
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {current === null ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="space-y-2 p-4">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Skeleton key={index} className="h-8 w-full" />
                    ))}
                  </TableCell>
                </TableRow>
              ) : !result || result.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                result.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-semibold">{request.requestNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dce9ff] text-xs font-semibold text-foreground"
                        >
                          {getInitials(request.requestedByName)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{request.requestedByName}</span>
                          <span className="text-xs text-muted-foreground">
                            {request.departmentName}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      <div className="flex flex-col items-start gap-1">
                        <p className="line-clamp-1" title={request.justification}>
                          {request.justification}
                        </p>
                        <Badge variant="secondary">
                          {request.itemsCount} {request.itemsCount === 1 ? 'partida' : 'partidas'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(request.totalAmount)}
                    </TableCell>
                    {tab === 'pending' ? (
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                    ) : (
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={request.status} />
                          {request.decidedAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(request.decidedAt)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <PriorityBadge priority={request.priority} />
                    </TableCell>
                    {tab === 'history' && (
                      <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                        {request.decisionComment ? (
                          <p className="line-clamp-2" title={request.decisionComment}>
                            {request.decisionComment}
                          </p>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {tab === 'pending' ? (
                        <Button type="button" size="sm" onClick={() => onDecide(request)}>
                          <Gavel aria-hidden="true" />
                          Decidir
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Ver detalles de ${request.requestNumber}`}
                          onClick={() => onView(request)}
                        >
                          <Eye aria-hidden="true" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs sm:flex-row">
            <div className="flex flex-wrap items-center gap-4">
              <p aria-live="polite" className="text-muted-foreground">
                {result === null ? (
                  'Cargando solicitudes...'
                ) : (
                  <>
                    Mostrando{' '}
                    <strong className="font-semibold text-foreground">
                      {from}–{to}
                    </strong>{' '}
                    de <strong className="font-semibold text-foreground">{totalCount}</strong>{' '}
                    solicitudes
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                <Label htmlFor="approvals-page-size" className="text-muted-foreground">
                  Filas por pág.:
                </Label>
                <Select
                  items={PAGE_SIZE_OPTIONS}
                  value={String(pageSize)}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger id="approvals-page-size" size="sm" className="min-w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <nav aria-label="Paginación" className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={result === null || page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </Button>
              <span className="font-medium">
                Página {page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={result === null || page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          </div>
        </>
      )}
    </Card>
  )
}

export default ApprovalsTable
