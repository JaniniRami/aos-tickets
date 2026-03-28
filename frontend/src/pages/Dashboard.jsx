import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { api, getToken } from '../api'
import AddTicketModal from '../components/AddTicketModal'
import StatsBar from '../components/StatsBar'
import TicketTable from '../components/TicketTable'

export default function Dashboard() {
  const navigate = useNavigate()
  const { liveStats, refreshLive, ticketsRefreshKey } = useOutletContext()
  const [tickets, setTickets] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [pricing, setPricing] = useState({
    adult_price_jd: 3,
    member_price_jd: 10,
    kid_price_jd: 12,
  })

  const [scanFilter, setScanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        api.get('/tickets'),
        api.get('/tickets/pricing'),
      ])
      setTickets(tRes.data)
      setPricing(pRes.data)
      setLoadError('')
    } catch (e) {
      if (e.response?.status === 401) return
      setLoadError('Could not load dashboard')
    }
  }, [])

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
      return
    }
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load, navigate, ticketsRefreshKey])

  function closeModal() {
    setModalOpen(false)
    setEditingTicket(null)
  }

  function resetFilters() {
    setScanFilter('all')
    setStatusFilter('all')
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const slots = t.total_slots ?? 0
      const scannedCount = t.total_slots_scanned ?? 0
      const scanned = scannedCount > 0
      const fullyScanned = slots > 0 && scannedCount >= slots

      if (scanFilter === 'scanned' && !scanned) return false
      if (scanFilter === 'unscanned' && scanned) return false
      if (scanFilter === 'fully_scanned' && !fullyScanned) return false

      if (statusFilter !== 'all' && t.status !== statusFilter) return false

      return true
    })
  }, [tickets, scanFilter, statusFilter])

  const filtersActive = scanFilter !== 'all' || statusFilter !== 'all'

  return (
    <>
      {loadError && (
        <div
          className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
          role="alert"
        >
          <span className="text-red-500 font-bold text-sm">!</span>
          <p className="text-sm text-red-700">{loadError}</p>
        </div>
      )}

      <StatsBar stats={liveStats} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={() => {
            setEditingTicket(null)
            setModalOpen(true)
          }}
          className="rounded-xl bg-[#123458] text-white px-4 py-2 text-sm font-semibold hover:bg-[#0d2845] transition-colors whitespace-nowrap"
        >
          + Add ticket
        </button>

        <div className="flex-1 min-w-0 rounded-xl border border-[#D4C9BE] bg-white px-4 py-3 flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="scan-filter"
              className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-1.5"
            >
              Scans
            </label>
            <select
              id="scan-filter"
              value={scanFilter}
              onChange={(e) => setScanFilter(e.target.value)}
              className="rounded-lg border border-[#D4C9BE] bg-[#F1EFEC] px-3 py-1.5 text-sm text-[#030303] min-w-[11rem] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458]"
            >
              <option value="all">All entries</option>
              <option value="scanned">Has at least one scan</option>
              <option value="unscanned">No scans yet</option>
              <option value="fully_scanned">All slots scanned</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-1.5"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#D4C9BE] bg-[#F1EFEC] px-3 py-1.5 text-sm text-[#030303] min-w-[11rem] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458]"
            >
              <option value="all">All statuses</option>
              <option value="registered">Registered</option>
              <option value="paid">Paid</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          {filtersActive && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#123458] hover:underline"
              >
                Clear filters
              </button>
              <span className="text-xs text-[#030303]/40 tabular-nums">
                {filteredTickets.length} of {tickets.length}
              </span>
            </div>
          )}
        </div>
      </div>

      <TicketTable
        rows={filteredTickets}
        onRefresh={async () => {
          await load()
          await refreshLive()
        }}
        onEdit={(row) => {
          setEditingTicket(row)
          setModalOpen(true)
        }}
      />

      <AddTicketModal
        open={modalOpen}
        onClose={closeModal}
        onSaved={async () => {
          await load()
          await refreshLive()
        }}
        ticket={editingTicket}
        adultPriceJd={editingTicket?.adult_price_jd ?? pricing.adult_price_jd}
        memberPriceJd={editingTicket?.member_price_jd ?? pricing.member_price_jd}
        kidPriceJd={editingTicket?.kid_price_jd ?? pricing.kid_price_jd}
      />
    </>
  )
}
