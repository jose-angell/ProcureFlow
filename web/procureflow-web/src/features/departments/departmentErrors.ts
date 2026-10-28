import { ApiError, NetworkError } from '@/shared/api/httpClient'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta más tarde.'

/** El mismo status significa cosas distintas según la operación que falló. */
export type DepartmentOperation = 'load' | 'save' | 'deactivate' | 'delete'

export function getDepartmentCreatedMessage(name: string): string {
  return `Departamento ${name} creado.`
}

export function getDepartmentUpdatedMessage(name: string): string {
  return `Departamento ${name} actualizado.`
}

export function getDepartmentDeletedMessage(name: string): string {
  return `Departamento ${name} eliminado.`
}

/**
 * `save` cubre crear, cambiar el nombre y activar. Para un 401 la UI añade
 * el enlace a /login (ver `isSessionError`).
 */
export function getDepartmentErrorMessage(
  error: unknown,
  operation: DepartmentOperation,
): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Intenta de nuevo.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return operation === 'save'
          ? 'Revisa el nombre del departamento.'
          : UNEXPECTED_ERROR
      case 401:
        return 'Tu sesión expiró. Inicia sesión de nuevo.'
      case 403:
        return 'No tienes permiso para gestionar departamentos.'
      case 404:
        return 'El departamento ya no existe.'
      case 409:
        if (operation === 'save') return 'Ya existe un departamento con ese nombre.'
        if (operation === 'deactivate') {
          return 'No se puede desactivar un departamento con usuarios asociados.'
        }
        if (operation === 'delete') {
          return 'No se puede eliminar un departamento con usuarios asociados.'
        }
        return UNEXPECTED_ERROR
      default:
        return UNEXPECTED_ERROR
    }
  }

  return UNEXPECTED_ERROR
}
