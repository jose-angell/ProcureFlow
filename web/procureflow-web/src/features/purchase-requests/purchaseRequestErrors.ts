import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

/**
 * El mismo status significa cosas distintas según la operación que falló.
 * `save` cubre crear, editar, añadir o quitar ítems y enviar; `load` es abrir una solicitud para editarla.
 */
export type PurchaseRequestOperation = 'load' | 'save'

export function getPurchaseRequestDraftSavedMessage(requestNumber: string): string {
  return `Solicitud ${requestNumber} guardada como borrador.`
}

export function getPurchaseRequestSubmittedMessage(requestNumber: string): string {
  return `Solicitud ${requestNumber} enviada para aprobación.`
}

/** Para un 401 la UI añade el enlace a /login (ver `isSessionError`). */
export function getPurchaseRequestErrorMessage(
  error: unknown,
  operation: PurchaseRequestOperation,
): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return operation === 'save' ? 'Revisa los datos de la solicitud.' : UNEXPECTED_ERROR
      case 401:
        return 'Tu sesión expiró. Inicia sesión de nuevo.'
      case 403:
        return 'No tienes permiso para gestionar esta solicitud.'
      case 404:
        return 'La solicitud ya no existe.'
      case 409:
        return operation === 'save'
          ? 'Tu usuario o tu departamento está inactivo. No puedes crear solicitudes.'
          : UNEXPECTED_ERROR
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
