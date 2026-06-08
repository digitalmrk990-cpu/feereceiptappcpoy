import { useMemo, useState } from 'react'
import { formatIndianCurrency } from '../services/pdfGenerator'

const PAGE_SIZE = 20

const HEADERS = [
  { key: 'Donor Name', label: 'Donor Name' },
  { key: 'Address 1', label: 'Address' },
  { key: 'PAN No.', label: 'PAN No.' },
  { key: 'Email ID', label: 'Email' },
  { key: 'Mode of Payment (MOP)', label: 'Payment Mode' },
  { key: 'Payment ID No.', label: 'Payment ID' },
  { key: 'Donor Bank Name', label: 'Bank Name' },
  { key: 'Amount', label: 'Amount' },
  { key: 'Receipt No.', label: 'Receipt No.' },
  { key: 'Account Of', label: 'Account Of' },
]

export default function DonorTable({ donors, selectedIndex, onSelect }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!search.trim()) return donors
    const q = search.toLowerCase()
    return donors.filter((d) =>
      d['Donor Name'].toLowerCase().includes(q)
    )
  }, [donors, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  )

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(0)
  }

  if (!donors || donors.length === 0) return null

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-gradient-to-b from-[#d10087] to-[#e4008d] rounded-full" />
          Donor Records
          <span className="text-xs text-gray-400 font-normal bg-gray-100 px-2 py-0.5 rounded-full">{donors.length}</span>
        </h2>
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by donor name..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-[#d10087]/40 focus:ring-2 focus:ring-[#d10087]/20 focus:outline-none transition-all duration-300"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/80">
              <th className="px-3 py-3.5 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-[11px]">#</th>
              {HEADERS.map((h) => (
                <th
                  key={h.key}
                  className={`px-3 py-3.5 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-[11px] ${
                    h.key === 'Amount' ? 'text-right' : ''
                  }`}
                >
                  {h.label}
                </th>
              ))}
              <th className="px-3 py-3.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-[11px]">
                Status
              </th>
              <th className="px-3 py-3.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-[11px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginated.map((donor, i) => {
              const realIndex = donors.indexOf(donor)
              return (
                <tr
                  key={realIndex}
                  className={`transition-all duration-200 ${
                    selectedIndex === realIndex
                      ? 'bg-[#d10087]/5 border-l-2 border-l-[#d10087]'
                      : 'hover:bg-gray-50/80 border-l-2 border-l-transparent'
                  }`}
                >
                  <td className="px-3 py-3 text-gray-400 whitespace-nowrap text-xs">{realIndex + 1}</td>
                  {HEADERS.map((h) => {
                    const val = donor[h.key]
                    if (h.key === 'Amount') {
                      return (
                        <td key={h.key} className="px-3 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                          {formatIndianCurrency(val)}
                        </td>
                      )
                    }
                    if (h.key === 'Donor Name') {
                      return (
                        <td key={h.key} className="px-3 py-3 font-medium text-gray-900 max-w-[200px] truncate whitespace-nowrap">
                          {val}
                        </td>
                      )
                    }
                    return (
                      <td key={h.key} className="px-3 py-3 text-gray-500 max-w-[160px] truncate whitespace-nowrap">
                        {val}
                      </td>
                    )
                  })}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {donor._dataMissing ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 font-medium text-[11px] rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Data Missing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 font-medium text-[11px] rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Ready
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => onSelect(realIndex)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#d10087]/5 text-[#d10087] font-medium text-xs rounded-lg hover:bg-[#d10087]/10 hover:shadow-sm transition-all duration-200"
                    >
                      Preview
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 gap-2">
          <p className="text-xs sm:text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg text-gray-600 disabled:opacity-30 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              onClick={() =>
                setPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg text-gray-600 disabled:opacity-30 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              Next
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
