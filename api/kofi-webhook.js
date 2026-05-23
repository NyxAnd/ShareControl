const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        return resolve(JSON.parse(body))
      } catch (jsonError) {
        try {
          const parsed = {}
          const params = new URLSearchParams(body)
          for (const [key, value] of params) {
            parsed[key] = value
          }
          return resolve(parsed)
        } catch (err) {
          return reject(err)
        }
      }
    })
    req.on('error', reject)
  })
}

function getSupporterName(payload) {
  return payload.supporter_name || payload.from_name || payload.name || payload.supporter || payload.display_name || null
}

function normalizeAmount(value) {
  const amount = parseFloat(value)
  return Number.isNaN(amount) ? 0 : amount
}

async function resolvePlayerId(name) {
  if (!name) return null
  const normalized = String(name).trim()
  const { data, error } = await supabase
    .from('players')
    .select('username')
    .eq('username', normalized)
    .limit(1)

  if (error) {
    console.warn('Player lookup failed:', error)
    return null
  }

  return data?.[0]?.username || null
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' })
  }

  try {
    const rawBody = req.body && Object.keys(req.body).length ? req.body : await parseRawBody(req)
    const payload = rawBody.data || rawBody
    const supporterName = getSupporterName(payload)
    const amount = normalizeAmount(payload.amount || payload.total || payload.value || payload.pledge_amount || payload.donation_amount)
    const message = String(payload.message || payload.note || payload.comment || payload.pledge_message || 'Ko-fi donation received').trim()

    const playerId = await resolvePlayerId(supporterName)
    const donation = {
      player_id: playerId,
      amount,
      message: message || 'Ko-fi donation received'
    }

    const { data: insertedDonation, error: donationError } = await supabase
      .from('donations')
      .insert([donation])
      .select()

    if (donationError) {
      console.error('Donation insert failed:', donationError)
      return res.status(500).json({ error: donationError.message })
    }

    await supabase.from('activity_logs').insert([{
      player_id: playerId || supporterName || 'Ko-fi',
      action: 'ko-fi_donation',
      details: {
        amount,
        message: donation.message,
        supporter_name: supporterName,
        payload: payload
      }
    }])

    return res.status(200).json({ success: true, donation: insertedDonation?.[0] || null })
  } catch (error) {
    console.error('Ko-fi webhook error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
