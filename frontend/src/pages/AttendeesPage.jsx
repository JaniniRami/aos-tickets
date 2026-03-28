import { useOutletContext } from 'react-router-dom'

export default function AttendeesPage() {
  const { liveStats } = useOutletContext()
  const attendees = liveStats?.attendees ?? []
  const insideTotal = Number(liveStats?.people_inside_today ?? 0)
  const insideAdults = Number(liveStats?.people_inside_today_adults ?? 0)
  const insideKids = Number(liveStats?.people_inside_today_kids ?? 0)

  const insideCards = [
    { label: 'Inside total', value: insideTotal, accent: true },
    { label: 'Inside adults', value: insideAdults, accent: false },
    { label: 'Inside kids', value: insideKids, accent: false },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {insideCards.map(({ label, value, accent }) => (
          <div
            key={label}
            className="rounded-xl bg-white border border-[#D4C9BE] p-4 relative overflow-hidden"
          >
            {accent && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#123458]" />}
            <p className="text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-2">
              {label}
            </p>
            <p
              className={`text-3xl font-bold tracking-tight tabular-nums ${
                accent ? 'text-[#123458]' : 'text-[#030303]'
              }`}
            >
              {value.toLocaleString()}
            </p>
            <p className="text-xs text-[#030303]/30 mt-1">Scans today (GMT+3)</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#D4C9BE] bg-white overflow-hidden min-h-[12rem]">
        <div className="px-5 py-4 border-b border-[#D4C9BE] flex flex-wrap items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#123458]" />
          <h2 className="text-sm font-semibold text-[#030303]">Attendees</h2>
          <span className="text-xs text-[#030303]/35">at least one scan recorded</span>
          {attendees.length > 0 && (
            <span className="text-xs font-medium text-[#030303]/45 tabular-nums ml-auto">
              {attendees.length} {attendees.length === 1 ? 'person' : 'people'}
            </span>
          )}
        </div>

        {attendees.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-[#030303]/45 font-medium">No scans yet.</p>
            <p className="text-xs text-[#030303]/30 mt-1">Attendees appear here after a ticket is scanned.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F1EFEC] max-h-[min(70vh,36rem)] overflow-y-auto">
            {attendees.map((a) => (
              <li
                key={a.ticket_id}
                className="px-5 py-4 flex flex-wrap gap-x-4 gap-y-1 hover:bg-[#F1EFEC]/70 transition-colors"
              >
                <span className="text-sm font-semibold text-[#030303]">{a.full_name}</span>
                <span className="text-sm text-[#030303]/50">
                  Adults {a.adult_scanned}/{a.adult_tickets} · Kids {a.kid_scanned}/{a.kid_tickets}
                </span>
                <span className="text-xs text-[#030303]/30 w-full font-mono leading-relaxed">
                  {a.scan_timestamps.map((t) => new Date(t).toLocaleString()).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
