import { getSession } from '@/features/auth/session'
import { ApiError, getJson, patch, patchJson } from '@/shared/api/httpClient'
import type {
  DecisionRequest,
  PagedResult,
  PurchaseRequest,
  PurchaseRequestFilters,
  PurchaseRequestSummary,
} from '../types'

/** Sin sesión guardada no se llama a la API: se trata como un 401. */
function getToken(): string {
  const session = getSession()
  if (!session) throw new ApiError(401)
  return session.accessToken
}

export async function getPurchaseRequests(
  filters: PurchaseRequestFilters,
): Promise<PagedResult<PurchaseRequest>> {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.requestNumber) params.set('requestNumber', filters.requestNumber)
  if (filters.status) params.set('status', filters.status)

  return getJson<PagedResult<PurchaseRequest>>(`/api/purchases?${params}`, {
    token: getToken(),
  })
}

export async function getPurchaseRequestSummary(): Promise<PurchaseRequestSummary> {
  return getJson<PurchaseRequestSummary>('/api/purchases/summary', {
    token: getToken(),
  })
}

export async function cancelPurchaseRequest(id: string): Promise<void> {
  return patch(`/api/purchases/${id}/cancel`, { token: getToken() })
}

export async function approvePurchaseRequest(
  id: string,
  comments: string | null,
): Promise<void> {
  const body: DecisionRequest = { comments }
  return patchJson(`/api/purchases/${id}/approve`, body, { token: getToken() })
}

export async function rejectPurchaseRequest(
  id: string,
  comments: string,
): Promise<void> {
  const body: DecisionRequest = { comments }
  return patchJson(`/api/purchases/${id}/reject`, body, { token: getToken() })
}

export async function getPendingApprovals(): Promise<PurchaseRequest[]> {
  return getJson<PurchaseRequest[]>('/api/purchases/pendingApprovals', {
    token: getToken(),
  })
}
