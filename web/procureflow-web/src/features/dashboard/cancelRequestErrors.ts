import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

export function getCancelRequestSuccessMessage(requestNumber: string): string {
  return `Solicitud ${requestNumber} cancelada.`
}

/** Para un 401 la UI añade el enlace a /login (ver `isSessionError`). */
export function getCancelRequestErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'La solicitud ya no se puede cancelar.'
      case 401:
        return 'Tu sesión expiró. Inicia sesión de nuevo.'
      case 403:
        return 'No tienes permiso para cancelar esta solicitud.'
      case 404:
        return 'La solicitud ya no existe.'
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
