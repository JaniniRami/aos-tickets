import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api'

export const api = axios.create({
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
      if (!window.location.pathname.startsWith('/scan')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(err)
  },
)
