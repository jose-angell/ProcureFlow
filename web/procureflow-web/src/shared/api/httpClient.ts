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

async function requestJson<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  let response: Response

  try {
    response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, init)
  } catch (error) {
    throw new NetworkError({ cause: error })
  }

  if (!response.ok) {
    throw new ApiError(response.status)
  }

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
