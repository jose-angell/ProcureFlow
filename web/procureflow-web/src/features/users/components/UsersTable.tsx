import { useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Search } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { UserRole } from '@/features/auth/types'
import type { Department } from '@/features/departments/types'
import { cn } from '@/lib/utils'
import { USER_ROLE_INFO, USER_ROLES_ORDER } from '../userRoles'
import type { User, UserRoleFilter, UserStatusFilter } from '../types'

const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  ...USER_ROLES_ORDER.map((role) => ({
    value: String(role),
    label: USER_ROLE_INFO[role].label,
  })),
]

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const COLUMNS = [
  { label: 'Nombre', className: '' },
  { label: 'Email', className: '' },
  { label: 'Departamento', className: '' },
  { label: 'Rol', className: '' },
  { label: 'Estado', className: '' },
  { label: 'Acciones', className: 'text-right' },
]

/** Minúsculas y sin tildes, para que "gomez" encuentre "Gómez". */
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Hasta dos iniciales: primera y última palabra del nombre. */
function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

interface UsersTableProps {
  /** Lista completa ya ordenada por nombre. */
  users: User[]
  /** Todos los departamentos; vacío si no se pudieron cargar. */
  departments: Department[]
}

function UsersTable({ users, departments }: UsersTableProps) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRoleFilter>('all')
  const [departmentId, setDepartmentId] = useState('all')
  const [status, setStatus] = useState<UserStatusFilter>('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const departmentOptions = [
    { value: 'all', label: 'Todos' },
    ...departments.map((department) => ({ value: department.id, label: department.name })),
  ]

  const query = normalizeText(search.trim())
  const hasFilters = query !== '' || role !== 'all' || departmentId !== 'all' || status !== 'all'

  const filtered = users.filter(
    (user) =>
      (role === 'all' || user.role === role) &&
      (departmentId === 'all' || user.departmentId === departmentId) &&
      (status === 'all' || user.isActive === (status === 'active')) &&
      (query === '' ||
        normalizeText(user.fullName).includes(query) ||
        normalizeText(user.email).includes(query)),
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

  function handleRoleChange(value: string | null) {
    setRole(value === null || value === 'all' ? 'all' : (Number(value) as UserRole))
    setPage(1)
  }

  function handleDepartmentChange(value: string | null) {
    setDepartmentId(value ?? 'all')
    setPage(1)
  }

  function handleStatusChange(value: string | null) {
    setStatus((value ?? 'all') as UserStatusFilter)
    setPage(1)
  }

  function handlePageSizeChange(value: string | null) {
    setPageSize(Number(value ?? '10'))
    setPage(1)
  }

  function handleClear() {
    setSearch('')
    setRole('all')
    setDepartmentId('all')
    setStatus('all')
    setPage(1)
  }

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative flex-1 lg:min-w-64">
            <Label htmlFor="user-search" className="sr-only">
              Buscar usuario por nombre o email
            </Label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="user-search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Buscar por nombre o email..."
              maxLength={200}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="user-role-filter" className="text-muted-foreground">
              Rol:
            </Label>
            <Select items={ROLE_OPTIONS} value={String(role)} onValueChange={handleRoleChange}>
              <SelectTrigger id="user-role-filter" className="min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="user-department-filter" className="text-muted-foreground">
              Depto:
            </Label>
            <Select
              items={departmentOptions}
              value={departmentId}
              onValueChange={handleDepartmentChange}
            >
              <SelectTrigger id="user-department-filter" className="min-w-36">
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

          <div className="flex items-center gap-2">
            <Label htmlFor="user-status-filter" className="text-muted-foreground">
              Estado:
            </Label>
            <Select items={STATUS_OPTIONS} value={status} onValueChange={handleStatusChange}>
              <SelectTrigger id="user-status-filter" className="min-w-32">
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
            Limpiar filtros
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Mostrando <strong className="font-semibold text-foreground">{filtered.length}</strong> de{' '}
          <strong className="font-semibold text-foreground">{users.length}</strong> usuarios
        </p>
      </div>

      <Table>
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
          {visible.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-10 text-center text-muted-foreground"
              >
                {hasFilters
                  ? 'Ningún usuario coincide con los filtros.'
                  : 'No hay usuarios registrados.'}
              </TableCell>
            </TableRow>
          ) : (
            visible.map((user) => (
              <TableRow
                key={user.id}
                className={cn(!user.isActive && 'bg-muted/30 text-muted-foreground')}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dce9ff] text-xs font-semibold text-foreground"
                    >
                      {getInitials(user.fullName)}
                    </div>
                    <span className="font-semibold">{user.fullName}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.departmentName ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={USER_ROLE_INFO[user.role].badgeVariant}>
                    {USER_ROLE_INFO[user.role].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      'gap-1.5 font-semibold',
                      user.isActive
                        ? 'bg-[#85f8c4] text-[#002114]'
                        : 'bg-[#dce9ff] text-[#0b1c30]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 rounded-full',
                        user.isActive ? 'bg-[#069669]' : 'bg-[#76777d]',
                      )}
                    />
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${user.fullName}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
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
            Mostrando{' '}
            <strong className="font-semibold text-foreground">
              {from}–{to}
            </strong>{' '}
            de <strong className="font-semibold text-foreground">{filtered.length}</strong>{' '}
            usuarios
          </p>

          <div className="flex items-center gap-2">
            <Label htmlFor="user-page-size" className="text-muted-foreground">
              Filas por pág.:
            </Label>
            <Select
              items={PAGE_SIZE_OPTIONS}
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger id="user-page-size" size="sm" className="min-w-16">
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
            disabled={currentPage <= 1}
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
            disabled={currentPage >= totalPages}
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

export default UsersTable
