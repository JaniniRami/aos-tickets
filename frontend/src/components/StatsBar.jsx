export default function StatsBar({ stats }) {
  if (!stats) return null

  const collected = Number(stats.total_due_all_jd ?? 0)
  const soldAdults = Number(stats.sold_adult_slots ?? 0)
  const soldMembers = Number(stats.sold_member_slots ?? 0)
  const soldKids = Number(stats.sold_kid_slots ?? 0)
  const soldTotal = Number(stats.sold_slots_total ?? 0)

  const cards = [
    {
      label: 'Total due',
      value: `${collected.toLocaleString()} JD`,
      accent: true,
      sub: 'All orders: registered, paid & sent',
    },
    {
      label: 'Adult passes',
      value: soldAdults.toLocaleString(),
      accent: false,
      sub: 'Across all orders',
    },
    {
      label: 'Member passes',
      value: soldMembers.toLocaleString(),
      accent: false,
      sub: 'Across all orders',
    },
    {
      label: 'Kid passes',
      value: soldKids.toLocaleString(),
      accent: false,
      sub: 'Across all orders',
    },
    {
      label: 'Passes total',
      value: soldTotal.toLocaleString(),
      accent: true,
      sub: 'Adult + member + kid, all orders',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
      {cards.map(({ label, value, accent, sub }) => (
        <div
          key={label}
          className="rounded-xl bg-white border border-[#D4C9BE] p-4 relative overflow-hidden"
        >
          {accent && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#123458]" />}
          <p className="text-xs font-semibold uppercase tracking-wider text-[#030303]/40 mb-2">
            {label}
          </p>
          <p
            className={`text-3xl font-bold tracking-tight ${
              accent ? 'text-[#123458]' : 'text-[#030303]'
            }`}
          >
            {value}
          </p>
          {sub && <p className="text-xs text-[#030303]/30 mt-1">{sub}</p>}
        </div>
      ))}
    </div>
  )
}
