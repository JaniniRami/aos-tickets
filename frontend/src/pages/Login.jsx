import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      setToken(data.access_token)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F1EFEC] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#030303] tracking-tight">
            Amman Orthodox Scout
          </h1>
          <p className="text-sm text-[#030303]/50 mt-1.5 font-medium">
            Egg Hunting 2026 · Admin
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D4C9BE] shadow-sm overflow-hidden">
          <div className="h-1 bg-[#123458]" />
          <form onSubmit={onSubmit} className="p-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/50 mb-1.5">
                Username
              </label>
              <input
                className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] px-4 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/50 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] pl-4 pr-12 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#030303]/45 hover:text-[#030303] hover:bg-[#030303]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#123458]/30 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m12.74 12.74L21 21m-9-3.75a3.75 3.75 0 0 1-3.75-3.75m9 3.75a3.75 3.75 0 0 0-3.75-3.75" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div
                className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
                role="alert"
              >
                <span className="text-red-500 text-base leading-none">!</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#123458] text-white py-2.5 text-sm font-semibold hover:bg-[#0d2845] disabled:opacity-50 transition-colors mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
