import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api, getToken, setToken } from '../api'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function tabClass({ isActive }) {
  return [
    'rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
    isActive
      ? 'bg-[#F1EFEC] text-[#123458] border-[#123458]'
      : 'text-white/60 border-transparent hover:text-white/90 hover:bg-white/5',
  ].join(' ')
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const [liveStats, setLiveStats] = useState(null)
  const [scanGateSaving, setScanGateSaving] = useState(false)
  const [scanGateError, setScanGateError] = useState('')
  const [ticketsRefreshKey, setTicketsRefreshKey] = useState(0)
  const [resetAllBusy, setResetAllBusy] = useState(false)
  const [resetAllError, setResetAllError] = useState('')

  const refreshLive = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/live')
      setLiveStats(data)
      setScanGateError('')
    } catch (e) {
      if (e.response?.status === 401) {
        navigate('/login', { replace: true })
      }
    }
  }, [navigate])

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }
    refreshLive()
    const id = setInterval(refreshLive, 5000)
    return () => clearInterval(id)
  }, [navigate, refreshLive])

  function logout() {
    setToken(null)
    navigate('/login', { replace: true })
  }

  async function exportCsv(path, filename) {
    const res = await api.get(path, { responseType: 'blob' })
    downloadBlob(res.data, filename)
  }

  const gateReady = liveStats != null
  const scanningOn = gateReady && liveStats.ticket_scanning_enabled !== false

  async function resetAllScans() {
    if (
      !window.confirm(
        'Reset all scans for every ticket? Every slot will show as not scanned. This cannot be undone.',
      )
    ) {
      return
    }
    setResetAllBusy(true)
    setResetAllError('')
    try {
      await api.post('/dashboard/reset-all-scans')
      await refreshLive()
      setTicketsRefreshKey((k) => k + 1)
    } catch {
      setResetAllError('Could not reset scans')
    } finally {
      setResetAllBusy(false)
    }
  }

  async function toggleScanGate() {
    if (!gateReady || scanGateSaving) return
    const next = !scanningOn
    setScanGateSaving(true)
    setScanGateError('')
    try {
      await api.patch('/dashboard/scan-gate', { ticket_scanning_enabled: next })
      await refreshLive()
    } catch {
      setScanGateError('Could not save scanning setting')
    } finally {
      setScanGateSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#F1EFEC] flex flex-col">
      <header className="bg-[#123458] shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Egg Hunting 2026</h1>
            <p className="text-xs text-white/40 mt-0.5 font-medium uppercase tracking-widest">
              Amman Orthodox Scout · Tickets
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 mr-1">
              <span className="text-xs font-medium text-white/80 whitespace-nowrap">
                Ticket reading
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={scanningOn}
                aria-label={
                  scanningOn ? 'Ticket reading on; press to turn off' : 'Ticket reading off; press to turn on'
                }
                disabled={!gateReady || scanGateSaving}
                onClick={toggleScanGate}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                  scanningOn ? 'bg-emerald-400' : 'bg-white/30'
                } ${!gateReady || scanGateSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    scanningOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50 tabular-nums w-6">
                {gateReady ? (scanningOn ? 'On' : 'Off') : '…'}
              </span>
            </div>
            {scanGateError ? (
              <span className="text-xs text-amber-200 font-medium">{scanGateError}</span>
            ) : null}
            {resetAllError ? (
              <span className="text-xs text-amber-200 font-medium">{resetAllError}</span>
            ) : null}
            <button
              type="button"
              disabled={resetAllBusy}
              onClick={resetAllScans}
              className="rounded-lg border border-amber-400/50 text-amber-100 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/15 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {resetAllBusy ? 'Resetting…' : 'Reset all scans'}
            </button>
            <button
              type="button"
              onClick={() => exportCsv('/export/registered', 'registered.csv')}
              className="rounded-lg border border-white/20 text-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
            >
              Export all
            </button>
            <button
              type="button"
              onClick={() => exportCsv('/export/attended', 'attended.csv')}
              className="rounded-lg border border-white/20 text-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
            >
              Export attended
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-[#D4C9BE] text-[#123458] px-3 py-1.5 text-xs font-semibold hover:bg-white transition-all"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 border-t border-white/10">
          <NavLink to="/dashboard" end className={tabClass}>
            Tickets
          </NavLink>
          <NavLink to="/dashboard/attendees" className={tabClass}>
            Attendees
          </NavLink>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        <Outlet context={{ liveStats, refreshLive, ticketsRefreshKey }} />
      </main>
    </div>
  )
}
