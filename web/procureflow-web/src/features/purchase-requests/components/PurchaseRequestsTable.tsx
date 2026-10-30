import { useEffect, useState, type SyntheticEvent } from 'react'
import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Search } from 'lucide-react'
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
import CancelRequestButton from '@/features/dashboard/components/CancelRequestButton'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import { getPurchaseRequests } from '../api/purchaseRequests'
import { PurchaseRequestStatus } from '../types'
import type { PagedResult, PurchaseRequest, PurchaseRequestPriority } from '../types'
import PriorityBadge from './PriorityBadge'
import StatusBadge from './StatusBadge'

type StatusFilter = 'all' | keyof typeof PurchaseRequestStatus
type PriorityFilter = 'all' | keyof typeof PurchaseRequestPriority

// Las etiquetas son las de StatusBadge y PriorityBadge.
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Draft', label: 'Borrador' },
  { value: 'Submitted', label: 'Enviada' },
  { value: 'Approved', label: 'Aprobada' },
  { value: 'Rejected', label: 'Rechazada' },
  { value: 'Cancelled', label: 'Cancelada' },
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

function getColumns(isAdmin: boolean): Column[] {
  return [
    { label: 'Nº de solicitud', className: '' },
    ...(isAdmin
      ? [
          { label: 'Solicitante', className: '' },
          { label: 'Departamento', className: '' },
        ]
      : []),
    { label: 'Prioridad', className: '' },
    { label: 'Estado', className: '' },
    { label: 'Justificación', className: '' },
    { label: 'Total', className: 'text-right' },
    { label: 'Fecha de creación', className: '' },
    { label: 'Acciones', className: 'text-right' },
  ]
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

interface PurchaseRequestsTableProps {
  /** El Admin ve además Solicitante y Departamento. */
  isAdmin: boolean
  /** Cambiar su valor vuelve a cargar la tabla conservando filtros y página. */
  reloadKey: number
  onEdit: (request: PurchaseRequest) => void
  onCancelled: (requestNumber: string) => void
  onCancelError: (error: unknown) => void
}

function PurchaseRequestsTable({
  isAdmin,
  reloadKey,
  onEdit,
  onCancelled,
  onCancelError,
}: PurchaseRequestsTableProps) {
  const columns = getColumns(isAdmin)
  const [searchInput, setSearchInput] = useState('')
  const [requestNumber, setRequestNumber] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<RequestsState | null>(null)

  const requestKey = `${requestNumber}|${status}|${priority}|${pageSize}|${page}|${reloadKey}`

  useEffect(() => {
    let cancelled = false

    getPurchaseRequests({
      requestNumber: requestNumber || undefined,
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : priority,
      page,
      pageSize,
    })
      .then((result) => {
        if (cancelled) return

        // Tras cancelar la última fila de la última página, esa página ya no existe.
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
  }, [requestNumber, status, priority, pageSize, page, requestKey])

  const current = state && state.key === requestKey ? state : null
  const isLoading = current === null
  const hasFilters = requestNumber !== '' || status !== 'all' || priority !== 'all'

  function handleSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestNumber(searchInput.trim())
    setPage(1)
  }

  function handleStatusChange(value: string | null) {
    setStatus((value ?? 'all') as StatusFilter)
    setPage(1)
  }

  function handlePriorityChange(value: string | null) {
    setPriority((value ?? 'all') as PriorityFilter)
    setPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    setPageSize(Number(value ?? '10'))
    setPage(1)
  }

  function handleClear() {
    setSearchInput('')
    setRequestNumber('')
    setStatus('all')
    setPriority('all')
    setPage(1)
  }

  const result = current && 'result' in current ? current.result : null
  const totalCount = result?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = result ? from + result.items.length - 1 : 0

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-2 border-b border-border p-4 lg:flex-row lg:flex-wrap lg:items-center">
        <form onSubmit={handleSearch} role="search" className="relative flex-1 lg:min-w-64">
          <Label htmlFor="purchase-request-search" className="sr-only">
            Buscar por número de solicitud
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="purchase-request-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por número (PR-2026-...) y pulsar Enter"
            maxLength={50}
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-2">
          <Label htmlFor="purchase-request-status-filter" className="text-muted-foreground">
            Estado:
          </Label>
          <Select items={STATUS_OPTIONS} value={status} onValueChange={handleStatusChange}>
            <SelectTrigger id="purchase-request-status-filter" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="purchase-request-priority-filter" className="text-muted-foreground">
            Prioridad:
          </Label>
          <Select items={PRIORITY_OPTIONS} value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger id="purchase-request-priority-filter" className="min-w-36">
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
                    {hasFilters
                      ? 'Ninguna solicitud coincide con los filtros.'
                      : 'Aún no tienes solicitudes. Crea la primera con «Nueva solicitud».'}
                  </TableCell>
                </TableRow>
              ) : (
                result.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-semibold">{request.requestNumber}</TableCell>
                    {isAdmin && (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              aria-hidden="true"
                              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dce9ff] text-xs font-semibold text-foreground"
                            >
                              {getInitials(request.requestedByName)}
                            </div>
                            <span className="font-medium">{request.requestedByName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {request.departmentName}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <PriorityBadge priority={request.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      <p className="line-clamp-2" title={request.justification}>
                        {request.justification}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(request.totalAmount)}
                    </TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {request.status === PurchaseRequestStatus.Draft && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${request.requestNumber}`}
                            onClick={() => onEdit(request)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                        )}
                        {(request.status === PurchaseRequestStatus.Draft ||
                          request.status === PurchaseRequestStatus.Submitted) && (
                          <CancelRequestButton
                            request={request}
                            onCancelled={onCancelled}
                            onError={onCancelError}
                          />
                        )}
                      </div>
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
                <Label htmlFor="purchase-request-page-size" className="text-muted-foreground">
                  Filas por pág.:
                </Label>
                <Select
                  items={PAGE_SIZE_OPTIONS}
                  value={String(pageSize)}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger id="purchase-request-page-size" size="sm" className="min-w-16">
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

export default PurchaseRequestsTable
