import { api } from '../api'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_STYLES = {
  registered: 'bg-[#F1EFEC] text-[#030303]/60 border-[#D4C9BE]',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  sent: 'bg-[#123458]/10 text-[#123458] border-[#123458]/20',
}

export default function TicketTable({ rows, onRefresh, onEdit }) {
  const statuses = ['registered', 'paid', 'sent']

  async function changeStatus(id, status) {
    await api.patch(`/tickets/${id}/status`, { status })
    onRefresh()
  }

  async function downloadZip(id, nameHint) {
    const res = await api.get(`/tickets/${id}/download`, { responseType: 'blob' })
    const safe = (nameHint || 'ticket').replace(/[^\w\s\-]/g, '').replace(/\s+/g, '_')
    downloadBlob(res.data, `${safe || 'ticket'}.zip`)
  }

  async function resetScans(id) {
    if (!window.confirm('Clear all scans for this entry?')) return
    await api.post(`/tickets/${id}/reset-scans`)
    onRefresh()
  }

  async function deleteEntry(id, name) {
    if (!window.confirm(`Delete ticket entry for "${name}"? This cannot be undone.`)) return
    await api.delete(`/tickets/${id}`)
    onRefresh()
  }

  return (
    <div className="rounded-xl border border-[#D4C9BE] bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[#D4C9BE] bg-[#F1EFEC]">
              {['Order', 'Name', 'Phone', 'Adults', 'Kids', 'Due (JD)', 'Scanned', 'Status', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#030303]/40 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4C9BE]/40">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-[#F1EFEC]/60 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-[#123458] whitespace-nowrap">
                  {r.ticket_code ?? String(r.id - 1).padStart(4, '0')}
                </td>
                <td className="px-4 py-3 font-semibold text-[#030303] whitespace-nowrap">
                  {r.full_name}
                </td>
                <td className="px-4 py-3 text-[#030303]/55 whitespace-nowrap">{r.phone}</td>
                <td className="px-4 py-3 text-[#030303]/70 tabular-nums">
                  {r.adult_scanned}/{r.adult_tickets}
                </td>
                <td className="px-4 py-3 text-[#030303]/70 tabular-nums">
                  {r.kid_scanned}/{r.kid_tickets}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-bold text-[#123458]">{r.total_due_jd ?? '—'}</span>
                  <span className="text-xs text-[#030303]/35 ml-1">JD</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-[#030303]/55">
                  {r.total_slots_scanned}/{r.total_slots}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    onChange={(e) => changeStatus(r.id, e.target.value)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-[#123458]/20 ${STATUS_STYLES[r.status] || STATUS_STYLES.registered}`}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s} className="bg-white text-[#030303]">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit?.(r)}
                      className="rounded-lg bg-[#123458]/10 text-[#123458] px-2.5 py-1 text-xs font-semibold hover:bg-[#123458]/20 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadZip(r.id, r.full_name)}
                      className="rounded-lg bg-[#D4C9BE]/40 text-[#030303]/65 px-2.5 py-1 text-xs font-semibold hover:bg-[#D4C9BE]/70 transition-colors"
                    >
                      ZIP
                    </button>
                    <button
                      type="button"
                      onClick={() => resetScans(r.id)}
                      className="rounded-lg text-[#030303]/40 px-2.5 py-1 text-xs font-medium hover:bg-[#F1EFEC] hover:text-[#030303]/60 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(r.id, r.full_name)}
                      className="rounded-lg text-red-400 px-2.5 py-1 text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-[#030303]/30 font-medium">No tickets yet</p>
        </div>
      )}
    </div>
  )
}
