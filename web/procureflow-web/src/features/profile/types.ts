import type { UserRole } from '@/features/auth/types'

export interface MyProfile {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  departmentId: string
  departmentName: string | null
  createdAt: string
}

export interface UpdateMyProfileRequest {
  fullName: string
  email: string
}

export interface ChangeMyPasswordRequest {
  currentPassword: string
  newPassword: string
}
