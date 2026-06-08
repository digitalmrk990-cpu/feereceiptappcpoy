import { useState, useCallback } from 'react'
import ExcelUpload from './components/ExcelUpload'
import DonorTable from './components/DonorTable'
import ReceiptPreview from './components/ReceiptPreview'
import { PROJECTS, PROJECT_OPTIONS } from './data/projects'

export default function App() {
  const [donors, setDonors] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [project, setProject] = useState('manncar')

  const handleDataLoaded = useCallback((data) => {
    setDonors(data)
    setSelectedIndex(null)
  }, [])

  const handleSelect = useCallback((index) => {
    setSelectedIndex(index)
  }, [])

  const handleProjectChange = useCallback((e) => {
    setProject(e.target.value)
  }, [])

  const currentProject = PROJECTS[project]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-[#d10087] to-[#e4008d] shadow-lg">
        <div className="max-w-6xl mx-auto px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/30">
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate drop-shadow-sm">
                ULTIMATE FUND RAYS SOLUTIONS Receipt Generator
              </h1>
              <p className="text-xs sm:text-sm text-pink-100 truncate">
                Upload Excel & generate donation receipts
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 animate-fadeIn">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/80 p-4 sm:p-6 mb-4 sm:mb-6 transition-all duration-300 hover:shadow-lg animate-slideUp">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-[#d10087] to-[#e4008d] rounded-full" />
              Select Project
            </h2>
            <select
              value={project}
              onChange={handleProjectChange}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-[#d10087]/40 focus:ring-2 focus:ring-[#d10087]/20 focus:outline-none transition-all duration-300 text-gray-700 font-medium"
            >
              {PROJECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {donors && (
            <div className="mt-3 text-xs text-gray-400">
              Generating receipts for: <span className="font-semibold text-gray-600">{currentProject.label}</span>
            </div>
          )}
        </div>

        <ExcelUpload onDataLoaded={handleDataLoaded} />

        {donors && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/80 p-4 sm:p-6 mb-4 sm:mb-6 transition-all duration-300 hover:shadow-lg animate-slideUp">
            <DonorTable
              donors={donors}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
            />
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/80 p-4 sm:p-6 transition-all duration-300 hover:shadow-lg animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <ReceiptPreview
            donors={donors}
            selectedIndex={selectedIndex}
            project={project}
          />
        </div>
      </main>
    </div>
  )
}
