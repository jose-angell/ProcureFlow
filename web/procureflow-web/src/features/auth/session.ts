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

/** Borra la sesión de localStorage y sessionStorage. */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

/**
 * true si el token no tiene un `exp` legible o si ya venció.
 * Decodifica el payload (base64url) sin validar la firma: eso lo hace la API.
 */
export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const { exp } = JSON.parse(json) as { exp?: unknown }

    return typeof exp !== 'number' || exp * 1000 <= now
  } catch {
    return true
  }
}

/** Sesión guardada cuyo token no venció; null si no hay sesión o ya expiró. */
export function getValidSession(): StoredSession | null {
  const session = getSession()
  return session && !isTokenExpired(session.accessToken) ? session : null
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
