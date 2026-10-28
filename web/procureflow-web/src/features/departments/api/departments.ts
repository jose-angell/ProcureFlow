import { getSession } from '@/features/auth/session'
import {
  ApiError,
  deleteRequest,
  getJson,
  patch,
  postJson,
  putJson,
} from '@/shared/api/httpClient'
import type { Department, DepartmentNameRequest } from '../types'

/** Sin sesión guardada no se llama a la API: se trata como un 401. */
function getToken(): string {
  const session = getSession()
  if (!session) throw new ApiError(401)
  return session.accessToken
}

export async function getDepartments(): Promise<Department[]> {
  return getJson<Department[]>('/api/departments', { token: getToken() })
}

export async function createDepartment(name: string): Promise<Department> {
  const body: DepartmentNameRequest = { name }
  return postJson<DepartmentNameRequest, Department>('/api/departments', body, {
    token: getToken(),
  })
}

export async function updateDepartment(id: string, name: string): Promise<void> {
  const body: DepartmentNameRequest = { name }
  return putJson(`/api/departments/${id}`, body, { token: getToken() })
}

export async function activateDepartment(id: string): Promise<void> {
  return patch(`/api/departments/${id}/activate`, { token: getToken() })
}

export async function deactivateDepartment(id: string): Promise<void> {
  return patch(`/api/departments/${id}/deactivate`, { token: getToken() })
}

export async function deleteDepartment(id: string): Promise<void> {
  return deleteRequest(`/api/departments/${id}`, { token: getToken() })
}
