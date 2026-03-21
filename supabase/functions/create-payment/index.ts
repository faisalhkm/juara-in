import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') ?? ''
const MIDTRANS_API_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY') ?? ''
  console.log('Server key length:', serverKey.length)
  console.log('Server key prefix:', serverKey.substring(0, 10))

  try {
    const { transaction_id } = await req.json()

    if (!transaction_id) {
      return new Response(JSON.stringify({ error: 'transaction_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 1. Ambil data transaksi dari DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: trx, error } = await supabase
      .from('transactions')
      .select(`
        *,
        candidates ( name, school_or_team ),
        voters ( name, phone ),
        vote_packages ( label )
      `)
      .eq('id', transaction_id)
      .single()

    if (error || !trx) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. Call Midtrans Snap API
    const authHeader = btoa(`${MIDTRANS_SERVER_KEY}:`)
    const midtransPayload = {
      transaction_details: {
        order_id: trx.id,
        gross_amount: trx.amount_idr
      },
      customer_details: {
        first_name: trx.voters.name,
        phone: trx.voters.phone
      },
      item_details: [{
        id: trx.vote_packages.label,
        price: trx.amount_idr,
        quantity: 1,
        name: `Vote ${trx.vote_packages.label} - ${trx.candidates.name}`
      }],
      expiry: {
        unit: 'minutes',
        duration: 15
      }
    }

    const midtransRes = await fetch(MIDTRANS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify(midtransPayload)
    })

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok) {
      throw new Error(midtransData.error_messages?.join(', ') ?? 'Midtrans error')
    }

    // 3. Update transaksi dengan gateway_ref
    await supabase
      .from('transactions')
      .update({ gateway_ref: midtransData.token })
      .eq('id', transaction_id)

    return new Response(JSON.stringify({ snap_token: midtransData.token }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
