import { useState } from 'react'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Search,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { Department, DepartmentStatusFilter } from '../types'
import DeleteDepartmentButton from './DeleteDepartmentButton'

const STATUS_OPTIONS: { value: DepartmentStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Solo activos' },
  { value: 'inactive', label: 'Solo inactivos' },
]

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const COLUMNS = [
  { label: 'Nombre del departamento', className: '' },
  { label: 'Estado', className: '' },
  { label: 'Acciones', className: 'text-right' },
]

/** Minúsculas y sin tildes, para que "tecnologia" encuentre "Tecnología". */
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

interface DepartmentsTableProps {
  /** Lista ya ordenada; `null` mientras carga. */
  departments: Department[] | null
  onDeleted: (name: string) => void
  onDeleteError: (error: unknown) => void
}

function DepartmentsTable({ departments, onDeleted, onDeleteError }: DepartmentsTableProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DepartmentStatusFilter>('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const query = normalizeText(search.trim())
  const hasFilters = query !== '' || status !== 'all'

  const filtered = (departments ?? []).filter(
    (department) =>
      (status === 'all' || department.isActive === (status === 'active')) &&
      normalizeText(department.name).includes(query),
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  // Si la lista se acorta (p. ej. al eliminar), no se queda en una página que ya no existe.
  const currentPage = Math.min(page, totalPages)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, filtered.length)
  const visible = filtered.slice(from === 0 ? 0 : from - 1, to)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value: string | null) {
    setStatus((value ?? 'all') as DepartmentStatusFilter)
    setPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    setPageSize(Number(value ?? '10'))
    setPage(1)
  }

  function handleClear() {
    setSearch('')
    setStatus('all')
    setPage(1)
  }

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Label htmlFor="department-search" className="sr-only">
              Buscar departamento por nombre
            </Label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="department-search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Buscar departamento por nombre..."
              maxLength={100}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="department-status-filter" className="text-muted-foreground">
              Estado:
            </Label>
            <Select items={STATUS_OPTIONS} value={status} onValueChange={handleStatusChange}>
              <SelectTrigger id="department-status-filter" className="min-w-36">
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

        {departments && (
          <p className="text-xs text-muted-foreground">
            Mostrando{' '}
            <strong className="font-semibold text-foreground">{filtered.length}</strong> de{' '}
            <strong className="font-semibold text-foreground">{departments.length}</strong>{' '}
            departamentos
          </p>
        )}
      </div>

      <Table aria-busy={departments === null}>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                scope="col"
                className={cn('text-xs font-semibold tracking-wider uppercase', column.className)}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments === null ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="space-y-2 p-4">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-8 w-full" />
                ))}
              </TableCell>
            </TableRow>
          ) : visible.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-10 text-center text-muted-foreground"
              >
                {hasFilters
                  ? 'Ningún departamento coincide con los filtros.'
                  : 'No hay departamentos registrados.'}
              </TableCell>
            </TableRow>
          ) : (
            visible.map((department) => (
              <TableRow
                key={department.id}
                className={cn(!department.isActive && 'bg-muted/30 text-muted-foreground')}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#dce9ff] text-foreground"
                    >
                      <Building2 className="size-5" />
                    </div>
                    <span className="font-semibold">{department.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'gap-1.5 font-semibold',
                      department.isActive
                        ? 'bg-[#85f8c4] text-[#002114]'
                        : 'bg-[#dce9ff] text-[#0b1c30]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 rounded-full',
                        department.isActive ? 'bg-[#069669]' : 'bg-[#76777d]',
                      )}
                    />
                    {department.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${department.name}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <DeleteDepartmentButton
                      department={department}
                      onDeleted={onDeleted}
                      onError={onDeleteError}
                    />
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
            {departments === null ? (
              'Cargando departamentos...'
            ) : (
              <>
                Mostrando{' '}
                <strong className="font-semibold text-foreground">
                  {from}–{to}
                </strong>{' '}
                de <strong className="font-semibold text-foreground">{filtered.length}</strong>{' '}
                departamentos
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Label htmlFor="department-page-size" className="text-muted-foreground">
              Filas por pág.:
            </Label>
            <Select
              items={PAGE_SIZE_OPTIONS}
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger id="department-page-size" size="sm" className="min-w-16">
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
            disabled={departments === null || currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft aria-hidden="true" />
            Anterior
          </Button>
          <span className="font-medium">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={departments === null || currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </Card>
  )
}

export default DepartmentsTable
