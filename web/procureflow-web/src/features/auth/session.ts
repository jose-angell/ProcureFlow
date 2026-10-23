import type { AuthResponse } from './types'

const SESSION_KEY = 'procureflow.session'

export interface StoredSession {
  accessToken: string
  user: Omit<AuthResponse, 'accessToken'>
}

/**
 * Guarda la sesión en localStorage (recordar) o sessionStorage (no recordar)
 * y borra la clave del otro almacenamiento para que nunca haya dos sesiones.
 */
export function saveSession(response: AuthResponse, remember: boolean): void {
  const { accessToken, ...user } = response
  const session: StoredSession = { accessToken, user }

  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage

  other.removeItem(SESSION_KEY)
  target.setItem(SESSION_KEY, JSON.stringify(session))
}
