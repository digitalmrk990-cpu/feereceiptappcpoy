import express from 'express'
import multer from 'multer'
import { uploadPDF } from './api/supabaseUpload.js'
import fetch from 'node-fetch'
import 'dotenv/config'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })
const PORT = 3001

app.post('/api/send-whatsapp', upload.single('file'), async (req, res) => {
  try {
    const { mobile, receiptNo, donorName, project } = req.body
    if (!mobile) return res.status(400).json({ success: false, error: 'Mobile number is required' })

    const publicUrl = await uploadPDF(req.file.buffer, req.file.originalname)

    const token = process.env.WHATSAPP_TOKEN
    const phoneNumberId = process.env.PHONE_NUMBER_ID
    const cleanMobile = mobile.replace(/[^0-9]/g, '')
    const waNumber = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`

    const waRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waNumber,
        type: 'document',
        document: { link: publicUrl, filename: `Donation-Receipt_${receiptNo}.pdf` },
      }),
    })

    const data = await waRes.json()
    if (!waRes.ok) throw new Error(data?.error?.message || `WhatsApp API error: ${waRes.status}`)

    res.json({ success: true, message: `Receipt sent to ${mobile}`, waResponse: data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
})

app.listen(PORT, () => console.log(`Local API listening on http://localhost:${PORT}`))
