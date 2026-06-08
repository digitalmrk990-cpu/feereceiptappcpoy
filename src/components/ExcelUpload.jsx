import { useCallback, useRef, useState } from 'react'
import * as XLSX from 'xlsx'

const TARGET_COLUMNS = [
  { key: 'Donor Name', aliases: ['Donor Name'] },
  { key: 'Mobile No.', aliases: ['Mobile No.', 'Mobile', 'Phone', 'Phone No.', 'Phone Number', 'Contact No.', 'Contact Number'] },
  { key: 'Address 1', aliases: ['Address 1', 'Address1'] },
  { key: 'PAN No.', aliases: ['PAN No.', 'PAN No', 'Pan No', 'Pan No.'] },
  { key: 'Email ID', aliases: ['Email ID', 'Email Id', 'Mail Id', 'Mail ID'] },
  { key: 'Mode of Payment (MOP)', aliases: ['Mode of Payment (MOP)', 'MOP', 'Payment Mode', 'Mode of Payment'] },
  { key: 'Payment ID No.', aliases: ['Payment ID No.', 'Payment Id No', 'Payment Id No.', 'Payment ID No', 'Payment Id No.'] },
  { key: 'Donor Bank Name', aliases: ['Donor Bank Name', 'Donor bank Name', 'Bank Name'] },
  { key: 'Amount', aliases: ['Amount'] },
  { key: 'Receipt No.', aliases: ['Receipt No.', 'Receipt No', 'Reciept No', 'Reciept No.'] },
  { key: 'Account Of', aliases: ['Account Of', 'Account of', 'Account of '] },
]

const MANDATORY = ['Donor Name', 'Amount', 'Receipt No.']

function normalize(str) {
  return str.toLowerCase().replace(/[\s.,()\-_]+/g, '')
}

function findColumn(target, headers) {
  const normTarget = normalize(target)
  for (const header of headers) {
    if (normalize(header) === normTarget) return header
  }
  for (const header of headers) {
    const nh = normalize(header)
    if (nh.includes(normTarget) || normTarget.includes(nh)) return header
  }
  return null
}

function matchColumns(headers) {
  const columnMap = {}
  for (const col of TARGET_COLUMNS) {
    let matched = headers.find((h) => h === col.key)
    if (matched) {
      columnMap[col.key] = matched
      continue
    }
    for (const alias of col.aliases) {
      matched = headers.find((h) => h === alias)
      if (matched) break
      matched = headers.find((h) => normalize(h) === normalize(alias))
      if (matched) break
    }
    if (!matched) {
      matched = findColumn(col.key, headers)
    }
    if (matched) {
      columnMap[col.key] = matched
    }
  }
  return columnMap
}

function isEmptyRow(row) {
  return TARGET_COLUMNS.every(
    (col) => !row[col.key] || String(row[col.key]).trim() === ''
  )
}

export default function ExcelUpload({ onDataLoaded }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const processFile = useCallback(
    (file) => {
      setError(null)
      setLoading(true)

      const name = file.name.toLowerCase()
      if (
        !name.endsWith('.xlsx') &&
        !name.endsWith('.xls') &&
        !name.endsWith('.csv')
      ) {
        setError('Please upload a valid file (.xlsx, .xls, or .csv)')
        setLoading(false)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })

          if (!jsonData || jsonData.length === 0) {
            setError('File is empty')
            setLoading(false)
            return
          }

          const headers = Object.keys(jsonData[0])
          const columnMap = matchColumns(headers)

          const missing = TARGET_COLUMNS
            .filter((col) => !columnMap[col.key])
            .map((col) => col.key)

          if (missing.length > 0) {
            setError(`Required columns not found in sheet: ${missing.join(', ')}`)
            setLoading(false)
            return
          }

          const seen = new Set()
          const donors = jsonData
            .filter((row) => !isEmptyRow(row))
            .map((row) => {
              const entry = {}
              for (const col of TARGET_COLUMNS) {
                const sheetCol = columnMap[col.key]
                entry[col.key] = String(row[sheetCol] ?? '').trim()
              }

              const hasMissingMandatory = MANDATORY.some(
                (m) => !entry[m]
              )
              if (hasMissingMandatory) {
                entry._dataMissing = true
              }

              const receiptNo = entry['Receipt No.']
              if (!receiptNo) {
                entry._duplicate = false
              } else if (seen.has(receiptNo)) {
                entry._duplicate = true
              } else {
                seen.add(receiptNo)
                entry._duplicate = false
              }

              return entry
            })

          if (donors.length === 0) {
            setError('No valid rows found in the file')
            setLoading(false)
            return
          }

          onDataLoaded(donors)
        } catch {
          setError('Failed to parse file. Please check the file format.')
        }
        setLoading(false)
      }
      reader.onerror = () => {
        setError('Failed to read file')
        setLoading(false)
      }
      reader.readAsArrayBuffer(file)
    },
    [onDataLoaded]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  return (
    <div className="mb-6 animate-fadeIn">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`relative overflow-hidden border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-300 group
          ${dragOver
            ? 'border-[#d10087] bg-[#d10087]/5 scale-[1.01]'
            : 'border-gray-300 bg-white/60 hover:border-[#d10087]/40 hover:bg-[#d10087]/5 hover:shadow-md'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleChange}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <svg
                className="animate-spin h-10 w-10 text-[#d10087]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-gray-700 font-medium">Parsing file...</p>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#d10087] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-[#d10087] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-[#d10087] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-4 inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-[#d10087]/20 to-[#e4008d]/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
              <svg
                className="relative mx-auto h-14 w-14 text-[#d10087]/60 group-hover:text-[#d10087] group-hover:scale-110 transition-all duration-300 animate-float"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold mb-1 group-hover:text-[#d10087] transition-colors duration-300">
              Drag & drop your Excel/CSV file here
            </p>
            <p className="text-gray-400 text-sm mb-2">or click to browse</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d10087]/10 text-[#d10087] text-xs font-medium rounded-full">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              .xlsx .xls .csv
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 animate-slideUp bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        </div>
      )}
    </div>
  )
}
