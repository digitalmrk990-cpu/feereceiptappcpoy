import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET_NAME = 'receipts'

export async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760,
    })
  }
}

export async function uploadPDF(buffer, fileName) {
  await ensureBucket()

  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `whatsapp/${Date.now()}_${sanitized}`

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: false,
  })

  if (error) throw new Error(`Supabase upload failed: ${error.message}`)

  const { data: publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return publicUrl.publicUrl
}
