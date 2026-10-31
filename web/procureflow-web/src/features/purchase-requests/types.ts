// Los valores deben coincidir con ProcureFlow.Domain/Enums/PurchaseRequestStatus.cs
export const PurchaseRequestStatus = {
  Draft: 1,
  Submitted: 2,
  Approved: 3,
  Rejected: 4,
  Cancelled: 5,
} as const
export type PurchaseRequestStatus =
  (typeof PurchaseRequestStatus)[keyof typeof PurchaseRequestStatus]

// Los valores deben coincidir con ProcureFlow.Domain/Enums/PurchaseRequestPriority.cs
export const PurchaseRequestPriority = {
  Low: 1,
  Medium: 2,
  High: 3,
  Urgent: 4,
} as const
export type PurchaseRequestPriority =
  (typeof PurchaseRequestPriority)[keyof typeof PurchaseRequestPriority]

export interface PurchaseRequest {
  id: string
  requestNumber: string
  requestedByUserId: string
  requestedByName: string
  departmentId: string
  departmentName: string
  priority: PurchaseRequestPriority
  status: PurchaseRequestStatus
  justification: string
  totalAmount: number
  createdAt: string
  itemsCount: number
  decidedAt: string | null
  decisionComment: string | null
  decidedByName: string | null
}

// Copia ProcureFlow.Application/PurchaseRequests/Dtos/PurchaseRequestItemDto.cs
export interface PurchaseRequestItem {
  id: string
  purchaseRequestId: string
  description: string
  quantity: number
  unitPrice: number
}

// Copia ProcureFlow.Application/PurchaseRequests/Dtos/PurchaseRequestDetailDto.cs
export interface PurchaseRequestDetail extends PurchaseRequest {
  items: PurchaseRequestItem[]
}

// Copia CreatePurchaseRequestRequest.cs y UpdatePurchaseRequestRequest.cs
export interface PurchaseRequestBody {
  priority: PurchaseRequestPriority
  justification: string
}

// Copia CreatePurchaseRequestItemRequest.cs
export interface PurchaseRequestItemBody {
  description: string
  quantity: number
  unitPrice: number
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export interface PurchaseRequestFilters {
  requestNumber?: string
  /** Nombre del estado: la API lo parsea como `PurchaseRequestStatus`. */
  status?: keyof typeof PurchaseRequestStatus
  /** Nombre de la prioridad: la API lo parsea como `PurchaseRequestPriority`. */
  priority?: keyof typeof PurchaseRequestPriority
  /** Solo solicitudes decididas por el usuario actual. */
  decidedByMe?: boolean
  departmentId?: string
  page: number
  pageSize: number
}

// Copia ProcureFlow.Application/PurchaseRequests/Dtos/DecisionRequest.cs
export interface DecisionRequest {
  comments: string | null
}

export interface DepartmentRequestCount {
  departmentId: string
  departmentName: string
  count: number
}

export interface PurchaseRequestSummary {
  total: number
  draft: number
  submitted: number
  approved: number
  rejected: number
  cancelled: number
  totalAmount: number
  byDepartment: DepartmentRequestCount[]
}
