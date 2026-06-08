export async function sendWhatsAppReceipt(pdfBlob, donor, project) {
  const receiptNo = donor['Receipt No.'] || 'N/A'
  const donorName = donor['Donor Name'] || 'Unknown'
  const mobile = donor['Mobile No.']
  if (!mobile) {
    return { success: false, error: 'No mobile number available for this donor' }
  }

  const formData = new FormData()
  formData.append('file', pdfBlob, `Receipt_${receiptNo}_${donorName}.pdf`)
  formData.append('mobile', mobile)
  formData.append('receiptNo', receiptNo)
  formData.append('donorName', donorName)
  formData.append('project', project)

  const res = await fetch('/api/send-whatsapp', { method: 'POST', body: formData })
  const data = await res.json()
  return data
}
