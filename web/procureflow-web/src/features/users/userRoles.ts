import { UserRole } from '@/features/auth/types'

type BadgeVariant = 'default' | 'secondary' | 'outline'

interface UserRoleInfo {
  label: string
  /** Texto largo para el selector de rol del formulario. */
  selectLabel: string
  badgeVariant: BadgeVariant
  description: string
}

export const USER_ROLE_INFO: Record<UserRole, UserRoleInfo> = {
  [UserRole.Admin]: {
    label: 'Admin',
    selectLabel: 'Admin (Administrador)',
    badgeVariant: 'default',
    description: 'Gestiona usuarios y departamentos del sistema.',
  },
  [UserRole.Approver]: {
    label: 'Approver',
    selectLabel: 'Approver (Aprobador)',
    badgeVariant: 'secondary',
    description: 'Aprueba o rechaza las solicitudes enviadas de su departamento.',
  },
  [UserRole.Requester]: {
    label: 'Requester',
    selectLabel: 'Requester (Solicitante)',
    badgeVariant: 'outline',
    description: 'Crea y envía solicitudes de compra de su departamento.',
  },
}

/** Orden en que se listan los roles en filtros, selector y tarjeta. */
export const USER_ROLES_ORDER: UserRole[] = [
  UserRole.Admin,
  UserRole.Approver,
  UserRole.Requester,
]
