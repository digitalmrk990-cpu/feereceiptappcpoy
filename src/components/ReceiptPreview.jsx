import { useRef, useState, useCallback } from 'react'
import ReceiptTemplate from './ReceiptTemplate'
import ReceiptTemplateAshray from './ReceiptTemplateAshray'
import ReceiptTemplateBeingSevak from './ReceiptTemplateBeingSevak'
import { PROJECTS } from '../data/projects'
import { downloadAllPDFs as downloadAll, downloadSinglePDF, generateReceiptPDF } from '../services/pdfGenerator'
import { sendWhatsAppReceipt } from '../services/whatsappService'

export default function ReceiptPreview({ donors, selectedIndex, signature, project }) {
  const receiptRef = useRef(null)
  const [downloadingSingle, setDownloadingSingle] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [sendingWA, setSendingWA] = useState(false)
  const [sendingAllWA, setSendingAllWA] = useState(false)
  const [waProgress, setWaProgress] = useState(null)
  const [waResult, setWaResult] = useState(null)

  const handleDownloadSingle = async () => {
    if (selectedIndex === null || selectedIndex === undefined) return
    setDownloadingSingle(true)
    try {
      await downloadSinglePDF(receiptRef.current, donors[selectedIndex], project)
    } catch {
      alert('Failed to download PDF. Please try again.')
    }
    setDownloadingSingle(false)
  }

  const handleDownloadAll = async () => {
    setDownloadingAll(true)
    try {
      const elements = Array.from(
        document.querySelectorAll('[data-receipt-batch]')
      )
      await downloadAll(
        elements.map((el, i) => ({ element: el, donor: donors[i] })),
        project
      )
    } catch {
      alert('Failed to download ZIP. Please try again.')
    }
    setDownloadingAll(false)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to print')
      return
    }
    const el = receiptRef.current
    const contentWidth = el.scrollWidth
    const a4WidthPx = 794
    const scale = Math.min(1, a4WidthPx / contentWidth)
    const innerHtml = el.innerHTML
    printWindow.document.write(`
      <html>
        <head>
          <title>Donation Receipt</title>
          <style>
            @page { size: A4 portrait; margin: 5mm; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; }
            .receipt-print {
              transform: scale(${scale});
              transform-origin: top center;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            img { max-width: 100%; }
            table { page-break-inside: avoid; }
            @media print {
              body { padding: 0; }
              .receipt-print { transform: scale(${scale}); }
            }
          </style>
        </head>
        <body><div class="receipt-print">${innerHtml}</div></body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  const handleSendWhatsAppSingle = useCallback(async () => {
    if (selectedIndex === null || selectedIndex === undefined) return
    setSendingWA(true)
    setWaResult(null)
    try {
      const pdf = await generateReceiptPDF(receiptRef.current)
      const blob = pdf.output('blob')
      const result = await sendWhatsAppReceipt(blob, donors[selectedIndex], project)
      setWaResult(result)
      if (result.success) {
        setTimeout(() => setWaResult(null), 5000)
      }
    } catch (err) {
      setWaResult({ success: false, error: err.message })
    }
    setSendingWA(false)
  }, [selectedIndex, donors, project])

  const handleSendWhatsAppAll = useCallback(async () => {
    setSendingAllWA(true)
    setWaResult(null)
    const results = { sent: 0, failed: 0, errors: [] }
    const batchElements = document.querySelectorAll('[data-receipt-batch]')

    for (let i = 0; i < donors.length; i++) {
      const donor = donors[i]
      setWaProgress({ current: i + 1, total: donors.length, donorName: donor['Donor Name'] })

      const mobile = donor['Mobile No.']
      if (!mobile) {
        results.failed++
        results.errors.push({ donor: donor['Donor Name'], error: 'No mobile number' })
        continue
      }

      try {
        const element = batchElements[i]
        if (!element) {
          results.failed++
          results.errors.push({ donor: donor['Donor Name'], error: 'Receipt element not found' })
          continue
        }
        const pdf = await generateReceiptPDF(element)
        const blob = pdf.output('blob')
        const result = await sendWhatsAppReceipt(blob, donor, project)

        if (result.success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push({ donor: donor['Donor Name'], error: result.error || 'Unknown error' })
        }
      } catch (err) {
        results.failed++
        results.errors.push({ donor: donor['Donor Name'], error: err.message })
      }
    }

    setWaResult({ success: results.sent > 0, sent: results.sent, failed: results.failed, errors: results.errors })
    if (results.sent > 0 && results.failed === 0) {
      setTimeout(() => setWaResult(null), 5000)
    }
    setWaProgress(null)
    setSendingAllWA(false)
  }, [donors, project])

  const currentDonor =
    donors && selectedIndex !== null && selectedIndex !== undefined
      ? donors[selectedIndex]
      : donors?.[0]

  const currentIndex =
    selectedIndex !== null && selectedIndex !== undefined
      ? selectedIndex
      : 0

  if (!donors || donors.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">Upload an Excel file to preview receipts</p>
        <p className="text-gray-400 text-sm mt-1">Supported formats: .xlsx, .xls, .csv</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-gradient-to-b from-[#d10087] to-[#e4008d] rounded-full" />
          Receipt Preview
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {donors.length > 1 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:hover:from-emerald-600 disabled:hover:to-emerald-500 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
            >
              {downloadingAll ? (
                <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
              )}
              <span className="hidden sm:inline">{downloadingAll ? 'Packaging...' : 'Download All as ZIP'}</span>
              <span className="sm:hidden">{downloadingAll ? 'Packaging...' : 'All PDF'}</span>
            </button>
          )}
          <button
            onClick={handleDownloadSingle}
            disabled={
              downloadingSingle ||
              selectedIndex === null ||
              selectedIndex === undefined
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-gradient-to-r from-[#d10087] to-[#e4008d] text-white text-xs sm:text-sm font-medium rounded-lg hover:from-[#e4008d] hover:to-[#f0009d] disabled:opacity-50 disabled:hover:from-[#d10087] disabled:hover:to-[#e4008d] shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
          >
            {downloadingSingle ? (
              <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            )}
            {downloadingSingle ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 border border-gray-200 text-gray-600 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 active:scale-[0.97] shadow-sm hover:shadow-md transition-all duration-200"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleSendWhatsAppSingle}
            disabled={sendingWA || selectedIndex === null || selectedIndex === undefined}
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {sendingWA ? 'Sending...' : 'WhatsApp'}
          </button>
          {donors.length > 1 && (
            <button
              onClick={handleSendWhatsAppAll}
              disabled={sendingAllWA}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {sendingAllWA ? `${waProgress?.current || 0}/${waProgress?.total || donors.length}` : 'All WhatsApp'}
            </button>
          )}
        </div>
      </div>

      {waProgress && (
        <div className="mb-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm shadow-sm animate-slideUp">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending {waProgress.current} of {waProgress.total}: {waProgress.donorName}
          </div>
        </div>
      )}
      {waResult && (
        <div className={`mb-3 animate-slideUp px-4 py-3 rounded-lg text-sm shadow-sm ${
          waResult.success
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700'
            : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {waResult.success ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              )}
            </svg>
            {waResult.sent !== undefined
              ? `Sent: ${waResult.sent}, Failed: ${waResult.failed}`
              : waResult.success
                ? 'Receipt sent via WhatsApp successfully!'
                : `WhatsApp send failed: ${waResult.error || 'Unknown error'}`}
          </div>
          {waResult.errors?.length > 0 && (
            <details className="mt-2 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">View errors ({waResult.errors.length})</summary>
              <ul className="mt-1 list-disc pl-4 space-y-1">
                {waResult.errors.map((e, i) => (
                  <li key={i}>{e.donor}: {e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <div ref={receiptRef} data-receipt>
          {project === 'manncar' ? (
            <ReceiptTemplate donor={currentDonor} index={currentIndex} signature={signature} />
          ) : project === 'beingsevak' ? (
            <ReceiptTemplateBeingSevak donor={currentDonor} index={currentIndex} signature={signature} />
          ) : (
            <ReceiptTemplateAshray donor={currentDonor} index={currentIndex} signature={signature} project={project} />
          )}
        </div>
      </div>

      <div style={{ display: 'none' }}>
        {donors.map((donor, i) => (
          <div key={i} data-receipt-batch>
            {project === 'manncar' ? (
              <ReceiptTemplate donor={donor} index={i} signature={signature} />
            ) : project === 'beingsevak' ? (
              <ReceiptTemplateBeingSevak donor={donor} index={i} signature={signature} />
            ) : (
              <ReceiptTemplateAshray donor={donor} index={i} signature={signature} project={project} />
            )}
          </div>
        ))}
      </div>

      {donors.length > 1 && (
        <p className="text-xs text-gray-400 text-center mt-3">
          {selectedIndex !== null && selectedIndex !== undefined
            ? `Showing receipt for: ${currentDonor['Donor Name']}`
            : 'Showing receipt for first donor. Select a donor from the table to preview their receipt.'}
        </p>
      )}
    </div>
  )
}
