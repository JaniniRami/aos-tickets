import axios from 'axios'

/** Relative API prefix (e.g. /aos/api) for same-origin Docker/nginx and Vite dev. */
export function resolveApiBaseURL() {
  const override = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (override) return override
  const appBase = String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '')
  return `${appBase}/api`
}

const baseURL = resolveApiBaseURL()

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

/** No JWT — for public ticket check (`GET /scan/...`) only. */
export const publicApi = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'aos_jwt'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const t = getToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && getToken()) {
      setToken(null)
      if (!window.location.pathname.includes('/scan/')) {
        window.location.assign(`${import.meta.env.BASE_URL}login`)
      }
    }
    return Promise.reject(err)
  },
)
