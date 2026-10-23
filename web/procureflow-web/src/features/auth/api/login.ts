import { postJson } from '@/shared/api/httpClient'
import type { AuthResponse, LoginRequest } from '../types'

export function login(request: LoginRequest): Promise<AuthResponse> {
  return postJson<LoginRequest, AuthResponse>('/api/auth/login', request)
}
