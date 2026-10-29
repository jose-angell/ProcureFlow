import { getSession } from '@/features/auth/session'
import {
  ApiError,
  deleteRequest,
  getJson,
  patch,
  postJson,
  putJson,
} from '@/shared/api/httpClient'
import type { CreateUserRequest, UpdateUserRequest, User } from '../types'

/** Sin sesión guardada no se llama a la API: se trata como un 401. */
function getToken(): string {
  const session = getSession()
  if (!session) throw new ApiError(401)
  return session.accessToken
}

export async function getUsers(): Promise<User[]> {
  return getJson<User[]>('/api/users?pageSize=100', { token: getToken() })
}

export async function createUser(body: CreateUserRequest): Promise<User> {
  return postJson<CreateUserRequest, User>('/api/users', body, {
    token: getToken(),
  })
}

export async function updateUser(id: string, body: UpdateUserRequest): Promise<void> {
  return putJson(`/api/users/${id}`, body, { token: getToken() })
}

export async function activateUser(id: string): Promise<void> {
  return patch(`/api/users/${id}/activate`, { token: getToken() })
}

export async function deactivateUser(id: string): Promise<void> {
  return patch(`/api/users/${id}/deactivate`, { token: getToken() })
}

export async function deleteUser(id: string): Promise<void> {
  return deleteRequest(`/api/users/${id}`, { token: getToken() })
}
