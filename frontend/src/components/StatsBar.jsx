export default function StatsBar({ stats }) {
  if (!stats) return null

  const collected = Number(stats.total_collected_paid_jd ?? 0)
  const soldAdults = Number(stats.sold_adult_slots_paid ?? 0)
  const soldKids = Number(stats.sold_kid_slots_paid ?? 0)
  const soldTotal = Number(stats.sold_slots_total_paid ?? 0)

  const cards = [
    {
      label: 'Collected',
      value: `${collected.toLocaleString()} JD`,
      accent: true,
      sub: 'Adult + kid totals, paid or sent orders',
    },
    {
      label: 'Adults sold (paid)',
      value: soldAdults.toLocaleString(),
      accent: false,
      sub: 'Adult passes on paid orders',
    },
    {
      label: 'Kids sold (paid)',
      value: soldKids.toLocaleString(),
      accent: false,
      sub: 'Kid passes on paid orders',
    },
    {
      label: 'Passes sold (paid)',
      value: soldTotal.toLocaleString(),
      accent: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
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
