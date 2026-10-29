import { UserCheck, Users, UsersRound, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { USER_ROLE_INFO, USER_ROLES_ORDER } from '../userRoles'
import type { User } from '../types'

interface StatCardProps {
  label: string
  icon: LucideIcon
  iconClassName: string
  children: React.ReactNode
}

function StatCard({ label, icon: Icon, iconClassName, children }: StatCardProps) {
  return (
    <Card className="justify-between gap-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {children}
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  )
}

interface UserStatsCardsProps {
  /** Lista completa, no la filtrada. */
  users: User[]
}

function UserStatsCards({ users }: UserStatsCardsProps) {
  const activeCount = users.filter((user) => user.isActive).length
  const inactiveCount = users.length - activeCount
  const activePercent = users.length === 0 ? 0 : Math.round((activeCount / users.length) * 100)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Usuarios totales" icon={Users} iconClassName="bg-[#dce9ff] text-primary">
        <span className="mt-1 font-heading text-4xl font-bold tracking-tight">{users.length}</span>
      </StatCard>

      <StatCard label="Roles asignados" icon={UsersRound} iconClassName="bg-[#dce9ff] text-primary">
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {USER_ROLES_ORDER.map((role) => (
            <li key={role} className="flex items-center gap-2">
              <span className="font-heading font-bold">
                {users.filter((user) => user.role === role).length}
              </span>
              <span className="text-muted-foreground">{USER_ROLE_INFO[role].label}</span>
            </li>
          ))}
        </ul>
      </StatCard>

      <StatCard label="Usuarios activos" icon={UserCheck} iconClassName="bg-[#dce9ff] text-primary">
        <span className="mt-1 font-heading text-4xl font-bold tracking-tight">{activeCount}</span>
        <span className="mt-1 text-[11px] text-muted-foreground">
          {inactiveCount} {inactiveCount === 1 ? 'inactivo' : 'inactivos'} · {activePercent}% activos
        </span>
      </StatCard>
    </div>
  )
}

export default UserStatsCards
