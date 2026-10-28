import { ChevronRight } from 'lucide-react'
import { Outlet, useLocation } from 'react-router'
import CurrentUser from '@/features/auth/components/CurrentUser'
import { getSession } from '@/features/auth/session'
import { UserRole } from '@/features/auth/types'
import AppSidebar, { type NavAudience } from '@/shared/components/AppSidebar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/purchases': 'Mis solicitudes',
  '/departments': 'Departamentos',
}

const AUDIENCE_BY_ROLE: Record<UserRole, NavAudience> = {
  [UserRole.Requester]: 'requester',
  [UserRole.Approver]: 'approver',
  [UserRole.Admin]: 'admin',
}

function AppLayout() {
  const { pathname } = useLocation()
  const pageTitle = PAGE_TITLES[pathname]
  // Sin sesión (audience null) se muestran todas las opciones.
  const role = getSession()?.user.role
  const audience = role ? AUDIENCE_BY_ROLE[role] : null

  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppSidebar audience={audience} />

      <div className="flex min-h-svh flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-md lg:px-8">
          <nav aria-label="Ruta de navegación">
            <ol className="flex items-center gap-2 text-xs text-muted-foreground">
              <li>Inicio</li>
              {pageTitle && (
                <>
                  <li aria-hidden="true">
                    <ChevronRight className="size-3.5" />
                  </li>
                  <li aria-current="page" className="font-medium text-foreground">
                    {pageTitle}
                  </li>
                </>
              )}
            </ol>
          </nav>

          <CurrentUser />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
