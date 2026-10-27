/** Respuesta no exitosa (status fuera de 2xx) de la API. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message?: string) {
    super(message ?? `La API respondió con el status ${status}.`)
    this.name = 'ApiError'
    this.status = status
  }
}

/** La petición no llegó a la API (servidor apagado, sin red, CORS). */
export class NetworkError extends Error {
  constructor(options?: ErrorOptions) {
    super('No se pudo conectar con el servidor.', options)
    this.name = 'NetworkError'
  }
}

let unauthorizedHandler: (() => void) | null = null

/**
 * Registra qué hacer cuando una petición con `Authorization` recibe 401
 * (token vencido o rechazado). Hay uno solo: registrar otro lo reemplaza.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

function hasAuthorization(init?: RequestInit): boolean {
  return new Headers(init?.headers).has('Authorization')
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let response: Response

  try {
    response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, init)
  } catch (error) {
    throw new NetworkError({ cause: error })
  }

  if (!response.ok) {
    // Sin token (p. ej. credenciales incorrectas en el login) el 401 no es una sesión vencida.
    if (response.status === 401 && hasAuthorization(init)) {
      unauthorizedHandler?.()
    }

    throw new ApiError(response.status)
  }

  return response
}

async function requestJson<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await request(path, init)
  return (await response.json()) as TResponse
}

export interface GetJsonOptions {
  /** Si se envía, la petición lleva `Authorization: Bearer <token>`. */
  token?: string
}

export function getJson<TResponse>(
  path: string,
  options?: GetJsonOptions,
): Promise<TResponse> {
  return requestJson<TResponse>(
    path,
    options?.token
      ? { headers: { Authorization: `Bearer ${options.token}` } }
      : undefined,
  )
}

/** PATCH sin cuerpo; no parsea la respuesta (la API responde 204). */
export async function patch(
  path: string,
  options?: GetJsonOptions,
): Promise<void> {
  await request(path, {
    method: 'PATCH',
    headers: options?.token ? { Authorization: `Bearer ${options.token}` } : undefined,
  })
}

/** PATCH con cuerpo JSON; no parsea la respuesta (la API responde 204). */
export async function patchJson<TBody>(
  path: string,
  body: TBody,
  options?: GetJsonOptions,
): Promise<void> {
  await request(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

export function postJson<TBody, TResponse>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
