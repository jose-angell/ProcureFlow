import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

export function getRegisterErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'Revisa los datos ingresados.'
      case 404:
        return 'El departamento seleccionado no está disponible.'
      case 409:
        return 'Ya existe una cuenta con este correo.'
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
