import { postJson } from '@/shared/api/httpClient'
import type { AuthResponse, RegisterRequest } from '../types'

export function register(request: RegisterRequest): Promise<AuthResponse> {
  return postJson<RegisterRequest, AuthResponse>('/api/auth/register', request)
}
