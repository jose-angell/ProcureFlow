import {
  BadgeCheck,
  Building2,
  CircleHelp,
  Landmark,
  LayoutGrid,
  ReceiptText,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export type NavAudience = 'requester' | 'approver' | 'admin'

interface NavItem {
  label: string
  icon: LucideIcon
  /** Sin `to` la opción se muestra deshabilitada: aún no tiene página. */
  to?: string
  /** Audiencias que ven la opción. Sin `visibleTo` la ven todas. */
  visibleTo?: NavAudience[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutGrid, to: '/dashboard' },
  { label: 'Mis solicitudes', icon: ReceiptText, to: '/purchases' },
  { label: 'Aprobaciones', icon: BadgeCheck, visibleTo: ['approver', 'admin'] },
  { label: 'Departamentos', icon: Building2, visibleTo: ['admin'] },
  { label: 'Usuarios', icon: Users, visibleTo: ['admin'] },
]

const footerNavItems: NavItem[] = [
  { label: 'Centro de ayuda', icon: CircleHelp },
  { label: 'Configuración', icon: Settings },
]

const itemClassName =
  'flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors'

function SidebarItem({ item }: { item: NavItem }) {
  const Icon = item.icon

  if (!item.to) {
    return (
      <li>
        <span
          aria-disabled="true"
          className={cn(itemClassName, 'cursor-not-allowed text-muted-foreground opacity-50')}
        >
          <Icon className="size-5" aria-hidden="true" />
          {item.label}
        </span>
      </li>
    )
  }

  return (
    <li>
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          cn(
            itemClassName,
            isActive
              ? 'bg-[#dce9ff] font-semibold text-foreground'
              : 'text-muted-foreground hover:bg-[#e5eeff] hover:text-foreground',
          )
        }
      >
        <Icon className="size-5" aria-hidden="true" />
        {item.label}
      </NavLink>
    </li>
  )
}

interface AppSidebarProps {
  /** Audiencia del usuario actual; `null` (sin sesión) muestra todas las opciones. */
  audience: NavAudience | null
}

/**
 * Menú lateral global. Desde `lg` es una barra fija a la izquierda (el layout
 * debe dejar `lg:pl-64`); por debajo de `lg` es una barra horizontal superior.
 */
function AppSidebar({ audience }: AppSidebarProps) {
  const visibleItems = navItems.filter(
    (item) => !audience || !item.visibleTo || item.visibleTo.includes(audience),
  )

  return (
    <aside className="flex items-center gap-4 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex-col lg:items-stretch lg:justify-between lg:gap-0 lg:overflow-x-visible lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-4 lg:py-0">
      <div className="flex items-center gap-4 lg:flex-col lg:items-stretch lg:gap-0">
        <div className="flex shrink-0 items-center gap-2 lg:h-16">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="size-4.5" aria-hidden="true" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">
            ProcureFlow
          </span>
        </div>

        <nav aria-label="Principal" className="lg:pt-2">
          <p className="hidden px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase lg:block">
            Principal
          </p>
          <ul className="flex gap-1 lg:flex-col">
            {visibleItems.map((item) => (
              <SidebarItem key={item.label} item={item} />
            ))}
          </ul>
        </nav>
      </div>

      <nav aria-label="Secundaria" className="lg:py-4">
        <ul className="flex gap-1 lg:flex-col">
          {footerNavItems.map((item) => (
            <SidebarItem key={item.label} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default AppSidebar
