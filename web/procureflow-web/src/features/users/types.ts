import type { UserRole } from '@/features/auth/types'

// Copia ProcureFlow.Application/Users/Dtos/UserDto.cs
export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  departmentId: string
  departmentName: string | null
  isActive: boolean
  createdAt: string
}

// Copia CreateUserRequest.cs
export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  departmentId: string
  role: UserRole
}

// Copia UpdateUserRequest.cs (password vacío = no cambia)
export interface UpdateUserRequest {
  fullName: string
  email: string
  password: string | null
  departmentId: string
  role: UserRole
}

export type UserStatusFilter = 'all' | 'active' | 'inactive'
export type UserRoleFilter = 'all' | UserRole
