import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'Revisa los datos ingresados.'
      case 401:
        return 'Correo o contraseña incorrectos.'
      case 403:
        return 'Tu usuario está inactivo. Contacta al administrador.'
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
