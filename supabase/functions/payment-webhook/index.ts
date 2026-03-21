import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    const notification = await req.json()
    console.log('Webhook received:', JSON.stringify(notification))

    const { order_id, transaction_status, fraud_status, signature_key, gross_amount, payment_type } = notification

    // 1. Validasi signature dari Midtrans
    // Format: SHA512(order_id + status_code + gross_amount + server_key)
    const statusCode = notification.status_code
    const rawSignature = `${order_id}${statusCode}${gross_amount}${MIDTRANS_SERVER_KEY}`

    const encoder = new TextEncoder()
    const data = encoder.encode(rawSignature)
    const hashBuffer = await crypto.subtle.digest('SHA-512', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (expectedSignature !== signature_key) {
      console.error('Invalid signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. Tentukan status transaksi
    let newStatus: string
    if (transaction_status === 'capture' && fraud_status === 'accept') {
      newStatus = 'success'
    } else if (transaction_status === 'settlement') {
      newStatus = 'success'
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      newStatus = 'failed'
    } else {
      newStatus = 'pending'
    }

    // 3. Update transaksi di DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { error } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        payment_method: payment_type,
        confirmed_at: newStatus === 'success' ? new Date().toISOString() : null
      })
      .eq('id', order_id)

    if (error) {
      console.error('DB update error:', error)
      throw error
    }

    console.log(`Transaction ${order_id} updated to ${newStatus}`)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
