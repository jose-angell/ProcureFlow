// Los valores deben coincidir con ProcureFlow.Domain/Enums/UserRole.cs
export const UserRole = { Admin: 1, Requester: 2, Approver: 3 } as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  departmentId: string
}

export interface DepartmentOption {
  id: string
  name: string
}

export interface AuthResponse {
  accessToken: string
  userId: string
  fullName: string
  email: string
  role: UserRole
  departmentId: string
  departmentName: string | null
}
