import { uploadPDF } from './supabaseUpload.js'
import Busboy from 'busboy'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { fields, fileBuffer, fileName } = await parseFormData(req)

    const mobile = fields.mobile
    if (!mobile) {
      return res.status(400).json({ success: false, error: 'Mobile number is required' })
    }

    const receiptNo = fields.receiptNo || 'N/A'
    const donorName = fields.donorName || 'Unknown'
    const project = fields.project || ''

    const publicUrl = await uploadPDF(fileBuffer, fileName || `Receipt_${receiptNo}_${donorName}.pdf`)

    const response = await sendViaWhatsApp(mobile, publicUrl, receiptNo, donorName)

    return res.status(200).json({
      success: true,
      message: `Receipt sent successfully to ${mobile}`,
      waResponse: response,
    })
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
}

async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers })
    const fields = {}
    let fileBuffer = null
    let fileName = ''

    bb.on('field', (name, val) => { fields[name] = val })

    bb.on('file', (_name, file, info) => {
      fileName = info.filename
      const chunks = []
      file.on('data', (chunk) => chunks.push(chunk))
      file.on('end', () => { fileBuffer = Buffer.concat(chunks) })
    })

    bb.on('finish', () => {
      if (!fileBuffer) return reject(new Error('No file uploaded'))
      resolve({ fields, fileBuffer, fileName })
    })

    bb.on('error', reject)

    const bodyChunks = []
    req.on('data', (chunk) => bodyChunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(bodyChunks)
      bb.end(body)
    })
    req.on('error', reject)
  })
}

async function sendViaWhatsApp(mobile, pdfUrl, receiptNo, donorName) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp API credentials not configured')
  }

  const cleanMobile = mobile.replace(/[^0-9]/g, '')
  const waNumber = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`

  const body = {
    messaging_product: 'whatsapp',
    to: waNumber,
    type: 'document',
    document: {
      link: pdfUrl,
      filename: `Donation-Receipt_${receiptNo}.pdf`,
    },
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || `WhatsApp API error: ${res.status}`)
  }

  return data
}
