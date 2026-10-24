import { getJson } from '@/shared/api/httpClient'
import type { DepartmentOption } from '../types'

export function getActiveDepartments(): Promise<DepartmentOption[]> {
  return getJson<DepartmentOption[]>('/api/departments/active')
}
