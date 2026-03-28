import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
              <input
                type="password"
                className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] px-4 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
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
