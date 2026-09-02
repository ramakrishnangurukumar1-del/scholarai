import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

const ACCESS_KEY = 'scholarai.access'
const REFRESH_KEY = 'scholarai.refresh'

export const tokenStore = {
  get access() {
    return safeGet(ACCESS_KEY)
  },
  get refresh() {
    return safeGet(REFRESH_KEY)
  },
  set(access: string, refresh?: string) {
    safeSet(ACCESS_KEY, access)
    if (refresh) safeSet(REFRESH_KEY, refresh)
  },
  clear() {
    safeDel(ACCESS_KEY)
    safeDel(REFRESH_KEY)
  },
}

function safeGet(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}
function safeDel(k: string) {
  try {
    localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

export const apiClient = axios.create({ baseURL: BASE_URL })

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On a 401, try one refresh, then replay the request.
let refreshing: Promise<string | null> | null = null

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config
    if (error.response?.status !== 401 || !original || (original as { _retry?: boolean })._retry) {
      return Promise.reject(error)
    }
    const refresh = tokenStore.refresh
    if (!refresh) return Promise.reject(error)

    ;(original as { _retry?: boolean })._retry = true
    refreshing ??= axios
      .post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
      .then((res) => {
        tokenStore.set(res.data.access_token)
        return res.data.access_token as string
      })
      .catch(() => {
        tokenStore.clear()
        return null
      })
      .finally(() => {
        refreshing = null
      })

    const newAccess = await refreshing
    if (!newAccess) return Promise.reject(error)
    original.headers = original.headers ?? {}
    original.headers.Authorization = `Bearer ${newAccess}`
    return apiClient(original)
  },
)

/** Pull a human-readable message out of an axios error. */
export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?'
  }
  return fallback
}
