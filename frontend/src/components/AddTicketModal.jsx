import { useEffect, useState } from 'react'
import { api } from '../api'

const initial = {
  full_name: '',
  phone: '',
  adult_tickets: 0,
  member_tickets: 0,
  kid_tickets: 0,
}

function formatError(detail) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((x) => x.msg || x).join(' ')
  }
  return 'Could not save'
}

export default function AddTicketModal({
  open,
  onClose,
  onSaved,
  adultPriceJd = 3,
  memberPriceJd = 10,
  kidPriceJd = 12,
  ticket = null,
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const isEdit = Boolean(ticket?.id)

  useEffect(() => {
    if (!open) return
    setErr('')
    if (ticket) {
      setForm({
        full_name: ticket.full_name ?? '',
        phone: ticket.phone ?? '',
        adult_tickets: ticket.adult_tickets ?? 0,
        member_tickets: ticket.member_tickets ?? 0,
        kid_tickets: ticket.kid_tickets ?? 0,
      })
    } else {
      setForm(initial)
    }
  }, [open, ticket])

  if (!open) return null

  const adultsN = Number(form.adult_tickets) || 0
  const membersN = Number(form.member_tickets) || 0
  const kidsN = Number(form.kid_tickets) || 0
  const previewTotal =
    adultsN * adultPriceJd + membersN * memberPriceJd + kidsN * kidPriceJd

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    const adults = Number(form.adult_tickets)
    const members = Number(form.member_tickets)
    const kids = Number(form.kid_tickets)
    if (adults === 0 && members === 0 && kids === 0) {
      setErr('Add at least one adult, member, or kid ticket.')
      return
    }
    const body = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      adult_tickets: adults,
      member_tickets: members,
      kid_tickets: kids,
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/tickets/${ticket.id}`, body)
      } else {
        await api.post('/tickets', body)
      }
      onSaved?.()
      onClose()
    } catch (e2) {
      setErr(formatError(e2.response?.data?.detail) || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#030303]/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white border border-[#D4C9BE] shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-form-title"
      >
        <div className="h-0.5 bg-[#123458] rounded-t-2xl" />
        <div className="px-6 py-4 border-b border-[#D4C9BE] flex justify-between items-center">
          <div>
            <h2 id="ticket-form-title" className="text-base font-bold text-[#030303]">
              {isEdit ? 'Edit ticket entry' : 'New ticket entry'}
            </h2>
            <p className="text-xs text-[#030303]/35 mt-0.5">Egg Hunting 2026 · AOS</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#030303]/35 hover:bg-[#F1EFEC] hover:text-[#030303]/70 transition-all text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-1.5">
              Full name
            </label>
            <input
              required
              className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] px-4 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-1.5">
              Phone
            </label>
            <input
              required
              className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] px-4 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-1.5">
                Adults{' '}
                <span className="normal-case font-normal text-[#030303]/30">({adultPriceJd} JD ea.)</span>
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] px-4 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
                value={form.adult_tickets}
                onChange={(e) => update('adult_tickets', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-1.5">
                Members{' '}
                <span className="normal-case font-normal text-[#030303]/30">({memberPriceJd} JD ea.)</span>
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] px-4 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
                value={form.member_tickets}
                onChange={(e) => update('member_tickets', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-1.5">
                Kids{' '}
                <span className="normal-case font-normal text-[#030303]/30">({kidPriceJd} JD ea.)</span>
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-[#D4C9BE] bg-[#F1EFEC] px-4 py-2.5 text-sm text-[#030303] outline-none focus:ring-2 focus:ring-[#123458]/20 focus:border-[#123458] transition-all"
                value={form.kid_tickets}
                onChange={(e) => update('kid_tickets', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl bg-[#F1EFEC] border border-[#D4C9BE] px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#030303]/40">
              Total due
            </span>
            <span className="text-lg font-bold text-[#123458]">{previewTotal} JD</span>
          </div>

          {err && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{err}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D4C9BE] text-sm text-[#030303]/60 font-medium hover:bg-[#F1EFEC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#123458] text-white text-sm font-semibold hover:bg-[#0d2845] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
