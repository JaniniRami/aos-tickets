import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api'

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function ScanResult() {
  const { ticketId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(
          `${baseURL}/scan/${encodeURIComponent(ticketId)}`,
        )
        if (!cancelled) setData(res.data)
      } catch {
        if (!cancelled) setError('Could not reach server')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (ticketId) run()
    return () => {
      cancelled = true
    }
  }, [ticketId])

  if (loading && !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F1EFEC]">
        <div className="flex items-center gap-3 text-[#030303]/40">
          <div className="w-5 h-5 rounded-full border-2 border-[#D4C9BE] border-t-[#123458] animate-spin" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F1EFEC] px-4">
        <div className="text-center">
          <p className="text-3xl mb-3 text-[#030303]/20">!</p>
          <p className="text-sm text-[#030303]/50 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  const valid = data?.valid

  return (
    <div className="min-h-dvh bg-[#F1EFEC] px-4 py-10">
      <div className="max-w-md mx-auto">
        <div
          className={`rounded-2xl p-8 text-center mb-5 ${
            valid
              ? 'bg-emerald-500 shadow-lg shadow-emerald-200/60'
              : 'bg-red-500 shadow-lg shadow-red-200/60'
          }`}
        >
          <p className="text-5xl font-black tracking-tight text-white">
            {valid ? 'VALID' : 'DENIED'}
          </p>
          {!valid && data?.message && (
            <p className="text-white/75 text-sm mt-2 font-medium">{data.message}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-[#D4C9BE] overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-[#D4C9BE]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#030303]/35 mb-0.5">
              Ticket ID (this pass)
            </p>
            <p className="font-mono text-sm font-bold text-[#123458]">
              {data?.slot_code ?? ticketId}
            </p>
            {data?.ticket_code != null && (
              <p className="text-xs text-[#030303]/45 mt-1">
                Order: <span className="font-mono">{data.ticket_code}</span>
              </p>
            )}
            {data?.full_name && (
              <p className="text-xl font-bold text-[#030303] mt-1.5">{data.full_name}</p>
            )}
          </div>

          <div className="px-5 py-4 space-y-3 border-b border-[#D4C9BE]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#030303]/50">Adults</span>
              <span className="text-sm font-bold text-[#030303] tabular-nums">
                {data?.adult_scanned ?? 0} / {data?.adult_tickets ?? 0} scanned
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#030303]/50">Kids</span>
              <span className="text-sm font-bold text-[#030303] tabular-nums">
                {data?.kid_scanned ?? 0} / {data?.kid_tickets ?? 0} scanned
              </span>
            </div>
          </div>

          {Array.isArray(data?.slots) && data.slots.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#030303]/35 mb-3">
                Per slot
              </p>
              <ul className="space-y-2">
                {data.slots.map((s, i) => (
                  <li
                    key={`${s.ticket_type}-${s.ticket_index}-${i}`}
                    className="flex items-center justify-between rounded-xl bg-[#F1EFEC] px-3.5 py-2.5"
                  >
                    <span className="text-left">
                      <span className="font-mono text-xs font-bold text-[#123458] block">
                        {s.slot_code}
                      </span>
                      <span className="text-sm font-semibold text-[#030303] capitalize">
                        {s.ticket_type} #{s.ticket_index}
                      </span>
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        s.is_scanned ? 'text-emerald-700' : 'text-[#030303]/30'
                      }`}
                    >
                      {s.is_scanned ? formatTime(s.scanned_at) : 'Not scanned'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#030303]/25 font-medium tracking-wide">
          Amman Orthodox Scout · Egg Hunting 2026
        </p>
      </div>
    </div>
  )
}
