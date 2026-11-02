import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

export const PROFILE_SAVED_MESSAGE = 'Cambios guardados correctamente.'
export const PASSWORD_UPDATED_MESSAGE = 'Contraseña actualizada correctamente.'

/**
 * El mismo status significa cosas distintas según la operación que falló.
 * `save` son nombre y correo; `password` es el cambio de contraseña.
 */
export type ProfileOperation = 'load' | 'save' | 'password'

/** Para un 401 la UI añade el enlace a /login (ver `isSessionError`). */
export function getProfileErrorMessage(error: unknown, operation: ProfileOperation): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        if (operation === 'save') return 'Revisa tus datos.'
        if (operation === 'password') {
          return 'La contraseña actual no es correcta o la nueva no cumple los requisitos.'
        }
        return UNEXPECTED_ERROR
      case 401:
        return 'Tu sesión expiró. Inicia sesión de nuevo.'
      case 403:
        return 'Tu usuario está inactivo.'
      case 404:
        return 'Tu usuario ya no existe.'
      case 409:
        return operation === 'save' ? 'Ya existe un usuario con ese correo.' : UNEXPECTED_ERROR
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
