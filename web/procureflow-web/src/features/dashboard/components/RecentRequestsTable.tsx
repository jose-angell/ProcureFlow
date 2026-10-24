import { useEffect, useState, type SyntheticEvent } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react'
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
import { getPurchaseRequests } from '@/features/purchase-requests/api/purchaseRequests'
import PriorityBadge from '@/features/purchase-requests/components/PriorityBadge'
import StatusBadge from '@/features/purchase-requests/components/StatusBadge'
import type {
  PagedResult,
  PurchaseRequest,
  PurchaseRequestStatus,
} from '@/features/purchase-requests/types'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import BlockError from './BlockError'

const PAGE_SIZE = 10

type StatusFilter = 'all' | keyof typeof PurchaseRequestStatus

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Draft', label: 'Borrador' },
  { value: 'Submitted', label: 'Enviada' },
  { value: 'Approved', label: 'Aprobada' },
  { value: 'Rejected', label: 'Rechazada' },
  { value: 'Cancelled', label: 'Cancelada' },
]

const COLUMNS = [
  { label: 'Número', className: '' },
  { label: 'Solicitante', className: '' },
  { label: 'Departamento', className: '' },
  { label: 'Justificación', className: '' },
  { label: 'Fecha', className: '' },
  { label: 'Importe', className: 'text-right' },
  { label: 'Prioridad', className: 'text-center' },
  { label: 'Estado', className: 'text-center' },
]

// El resultado guarda la clave de la petición que lo originó: mientras la clave
// actual no coincida, el bloque está cargando.
type RequestsState = { key: string } & (
  | { result: PagedResult<PurchaseRequest> }
  | { error: unknown }
)

function RecentRequestsTable() {
  const [searchInput, setSearchInput] = useState('')
  const [requestNumber, setRequestNumber] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [state, setState] = useState<RequestsState | null>(null)

  const requestKey = `${requestNumber}|${status}|${page}`

  useEffect(() => {
    let cancelled = false

    getPurchaseRequests({
      requestNumber: requestNumber || undefined,
      status: status === 'all' ? undefined : status,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) setState({ key: requestKey, result })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ key: requestKey, error })
      })

    return () => {
      cancelled = true
    }
  }, [requestNumber, status, page, requestKey])

  const current = state && state.key === requestKey ? state : null
  const isLoading = current === null
  const hasFilters = requestNumber !== '' || status !== 'all'

  function handleSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestNumber(searchInput.trim())
    setPage(1)
  }

  function handleStatusChange(value: string | null) {
    setStatus((value ?? 'all') as StatusFilter)
    setPage(1)
  }

  function handleClear() {
    setSearchInput('')
    setRequestNumber('')
    setStatus('all')
    setPage(1)
  }

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <h2 className="font-heading text-base font-semibold">Solicitudes recientes</h2>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <form onSubmit={handleSearch} role="search" className="relative flex-1">
            <Label htmlFor="request-number-search" className="sr-only">
              Buscar por número de solicitud
            </Label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="request-number-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por número (PR-2026-...) y pulsar Enter"
              maxLength={50}
              className="pl-9"
            />
          </form>

          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="text-muted-foreground">
              Estado:
            </Label>
            <Select
              items={STATUS_OPTIONS}
              value={status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status-filter" className="min-w-36">
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

          <Button type="button" variant="ghost" onClick={handleClear}>
            <RotateCcw aria-hidden="true" />
            Limpiar
          </Button>
        </div>
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
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column.label}
                    scope="col"
                    className={`text-xs font-semibold tracking-wider uppercase ${column.className}`}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {current === null ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="space-y-2 p-4">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Skeleton key={index} className="h-8 w-full" />
                    ))}
                  </TableCell>
                </TableRow>
              ) : current.result.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {hasFilters
                      ? 'Ninguna solicitud coincide con los filtros.'
                      : 'Aún no hay solicitudes de compra.'}
                  </TableCell>
                </TableRow>
              ) : (
                current.result.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-semibold">{request.requestNumber}</TableCell>
                    <TableCell className="font-medium">{request.requestedByName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.departmentName}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate" title={request.justification}>
                        {request.justification}
                      </p>
                    </TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(request.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <PriorityBadge priority={request.priority} />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={request.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            result={current && 'result' in current ? current.result : null}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  )
}

interface PaginationProps {
  page: number
  result: PagedResult<PurchaseRequest> | null
  onPageChange: (page: number) => void
}

function Pagination({ page, result, onPageChange }: PaginationProps) {
  const totalCount = result?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = result ? from + result.items.length - 1 : 0

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs sm:flex-row">
      <p aria-live="polite" className="text-muted-foreground">
        {result === null ? (
          'Cargando solicitudes...'
        ) : (
          <>
            Mostrando <strong className="font-semibold text-foreground">{from} a {to}</strong>{' '}
            de <strong className="font-semibold text-foreground">{totalCount}</strong>{' '}
            {totalCount === 1 ? 'resultado' : 'resultados'}
          </>
        )}
      </p>

      <nav aria-label="Paginación" className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={result === null || page <= 1}
          onClick={() => onPageChange(page - 1)}
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
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </div>
  )
}

export default RecentRequestsTable
