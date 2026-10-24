import type { AuthResponse } from './types'

const SESSION_KEY = 'procureflow.session'

export interface StoredSession {
  accessToken: string
  user: Omit<AuthResponse, 'accessToken'>
}

/**
 * Lee la sesión guardada: primero localStorage y luego sessionStorage.
 * Devuelve null si no hay sesión o el JSON guardado no es válido.
 */
export function getSession(): StoredSession | null {
  for (const storage of [localStorage, sessionStorage]) {
    const raw = storage.getItem(SESSION_KEY)
    if (!raw) continue

    try {
      const session = JSON.parse(raw) as Partial<StoredSession> | null
      if (typeof session?.accessToken === 'string' && session.user) {
        return session as StoredSession
      }
    } catch {
      // JSON inválido: se trata como si no hubiera sesión en este almacenamiento.
    }
  }

  return null
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
