import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

/**
 * El mismo status significa cosas distintas según la operación que falló.
 * `save` cubre crear y editar; `status` es activar o desactivar.
 */
export type UserOperation = 'load' | 'save' | 'status' | 'delete'

export function getUserCreatedMessage(fullName: string): string {
  return `Usuario ${fullName} creado.`
}

export function getUserUpdatedMessage(fullName: string): string {
  return `Usuario ${fullName} actualizado.`
}

export function getUserDeletedMessage(fullName: string): string {
  return `Usuario ${fullName} eliminado.`
}

/** Para un 401 la UI añade el enlace a /login (ver `isSessionError`). */
export function getUserErrorMessage(error: unknown, operation: UserOperation): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return operation === 'save' ? 'Revisa los datos del usuario.' : UNEXPECTED_ERROR
      case 401:
        return 'Tu sesión expiró. Inicia sesión de nuevo.'
      case 403:
        return 'No tienes permiso para gestionar usuarios.'
      case 404:
        if (operation === 'save') return 'El usuario o el departamento ya no existe.'
        if (operation === 'delete' || operation === 'status') {
          return 'El usuario ya no existe.'
        }
        return UNEXPECTED_ERROR
      case 409:
        if (operation === 'save') return 'Ya existe un usuario con ese correo.'
        if (operation === 'delete') {
          return 'No se puede eliminar un usuario con solicitudes o decisiones de aprobación.'
        }
        return UNEXPECTED_ERROR
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
