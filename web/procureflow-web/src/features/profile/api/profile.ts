import { getSession } from '@/features/auth/session'
import type { AuthResponse } from '@/features/auth/types'
import { ApiError, getJson, putJson, putJsonWithResponse } from '@/shared/api/httpClient'
import type { ChangeMyPasswordRequest, MyProfile, UpdateMyProfileRequest } from '../types'

/** Sin sesión guardada no se llama a la API: se trata como un 401. */
function getToken(): string {
  const session = getSession()
  if (!session) throw new ApiError(401)
  return session.accessToken
}

export async function getMyProfile(): Promise<MyProfile> {
  return getJson<MyProfile>('/api/users/me', { token: getToken() })
}

export async function updateMyProfile(body: UpdateMyProfileRequest): Promise<void> {
  return putJson('/api/users/me', body, { token: getToken() })
}

/** La API responde 200 con un `AuthResponse` nuevo: el token anterior deja de valer. */
export async function changeMyPassword(body: ChangeMyPasswordRequest): Promise<AuthResponse> {
  return putJsonWithResponse<ChangeMyPasswordRequest, AuthResponse>('/api/users/me/password', body, {
    token: getToken(),
  })
}
