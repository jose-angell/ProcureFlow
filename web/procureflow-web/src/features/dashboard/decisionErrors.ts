import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

export type Decision = 'approved' | 'rejected'

export function getDecisionSuccessMessage(
  requestNumber: string,
  decision: Decision,
): string {
  return decision === 'approved'
    ? `Solicitud ${requestNumber} aprobada.`
    : `Solicitud ${requestNumber} rechazada.`
}

/** Para un 401 la UI añade el enlace a /login (ver `isSessionError`). */
export function getDecisionErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'La solicitud ya no está pendiente de decisión.'
      case 401:
        return 'Tu sesión expiró. Inicia sesión de nuevo.'
      case 403:
        return 'No tienes permiso para decidir sobre esta solicitud.'
      case 404:
        return 'La solicitud ya no existe.'
      case 409:
        return 'Tu usuario está inactivo y no puede decidir solicitudes.'
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
