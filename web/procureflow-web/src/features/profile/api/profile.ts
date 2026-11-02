import { getSession } from '@/features/auth/session'
import { ApiError, getJson, putJson } from '@/shared/api/httpClient'
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

export async function changeMyPassword(body: ChangeMyPasswordRequest): Promise<void> {
  return putJson('/api/users/me/password', body, { token: getToken() })
}
