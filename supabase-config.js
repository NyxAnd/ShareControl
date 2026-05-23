// ═══ SUPABASE CONFIG ═══
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.0/+esm'

const SUPABASE_URL = 'https://cfcnuqtghayuhychgxzh.supabase.co' // Reemplazar
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmY251cXRnaGF5dWh5Y2hneHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTU2NDUsImV4cCI6MjA5NTAzMTY0NX0.4GgyqpPj8kMe9G_XROkWuBUK04YBuq9DYIBgnGvGgVw' // Reemplazar
const STEAM_API_KEY = '1F68969564AA1DBBDC29CCDCA84C8AAF' // Clave de Steam API proporcionada
const STEAM_ACCOUNT_ID = '76561199166501268' // SteamID64 de la cuenta compartida (reemplazar o configurar localStorage)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function getSteamAccountId(){
  if(typeof localStorage !== 'undefined'){
    return localStorage.getItem('steam_account_id') || STEAM_ACCOUNT_ID
  }
  return STEAM_ACCOUNT_ID
}

// ═══ STEAM API HELPER (using Vercel proxy to avoid CORS) ═══
export async function getSteamUserInfo() {
  try {
    const steamId = getSteamAccountId()
    const res = await fetch(`/api/steam?endpoint=GetPlayerSummaries&steamid=${steamId}`)
    const data = await res.json()
    return data.response.players[0] || null
  } catch (e) {
    console.error('Steam API Error:', e)
    return null
  }
}

export async function getSteamGameStats() {
  try {
    const steamId = getSteamAccountId()
    const res = await fetch(`/api/steam?endpoint=GetOwnedGames&steamid=${steamId}`)
    const data = await res.json()
    return data.response.games || []
  } catch (e) {
    console.error('Steam Games Error:', e)
    return []
  }
}

export async function getSteamCurrentGame() {
  const user = await getSteamUserInfo()
  if (!user?.gameid) return null
  
  const games = await getSteamGameStats()
  const current = games.find(g => g.appid == user.gameid)
  return { game: current?.name || 'Unknown Game', appid: user.gameid, playtime_forever: current?.playtime_forever || 0 }
}

// ═══ DATABASE FUNCTIONS ═══

// Obtener todas las reservas
export async function getReservations() {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) console.error('DB Error:', error)
  return data || []
}

// Crear reserva
export async function createReservation(reservation) {
  try {
    // Primero, asegurar que el player existe en la tabla players
    const { data: existingPlayer, error: checkError } = await supabase
      .from('players')
      .select('username')
      .eq('username', reservation.player)
      .maybeSingle()
    
    console.log('Player check:', { existingPlayer, checkError })
    
    // Si no existe, crear el player con valores por defecto
    if (!existingPlayer && !checkError) {
      const { error: playerError } = await supabase
        .from('players')
        .insert([{
          username: reservation.player,
          country_flag: '🌍',
          timezone: 'UTC',
          color_hex: '#' + Math.floor(Math.random()*16777215).toString(16),
        }])
      
      if (playerError) {
        console.error('Error creating player:', playerError)
      }
    }
    
    // Ahora crear la reserva
    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        player_id: reservation.player,
        day: reservation.day,
        start_hour: reservation.startH,
        end_hour: reservation.endH,
        status: reservation.status,
        game: reservation.game,
      }])
      .select()
    
    if (error) {
      console.error('Create Reservation Error:', error)
      console.error('Error details:', { code: error.code, message: error.message, details: error.details })
      return null
    }
    return data?.[0]
  } catch (e) {
    console.error('Reservation Exception:', e)
    return null
  }
}

// Cancelar reserva
export async function cancelReservation(id) {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id)
    
    if (error) {
      console.error('❌ Cancel Reservation Error:', { code: error.code, message: error.message, details: error.details })
      return false
    }
    
    console.log('✅ Reservation cancelled successfully:', id)
    return true
  } catch (e) {
    console.error('❌ Cancel Exception:', e)
    return false
  }
}

// Extender reserva
export async function extendReservation(id, newEndHour) {
  const { error } = await supabase
    .from('reservations')
    .update({ end_hour: newEndHour })
    .eq('id', id)
  
  if (error) console.error('Extend Reservation Error:', error)
  return !error
}

// Obtener donaciones
export async function getDonations() {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (error) console.error('DB Error:', error)
  return data || []
}

// Registrar donación
export async function recordDonation(donation) {
  const { data, error } = await supabase
    .from('donations')
    .insert([{
      player_id: donation.name,
      amount: donation.amount,
      message: donation.msg
    }])
    .select()
  
  if (error) console.error('Donation Error:', error)
  return data?.[0]
}

// Obtener logs de actividad
export async function getLogs() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  
  if (error) console.error('Logs Error:', error)
  return data || []
}

// Registrar un evento en el feed de logs
export async function recordLog(log) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert([{
      action: log.event_type || 'info',
      player_id: log.player_id,
      details: {
        message: log.message,
        metadata: log.metadata || null
      }
    }])
    .select()
  
  if (error) console.error('Record Log Error:', error)
  return data?.[0]
}

export function subscribeToLogs(callback) {
  return supabase
    .channel('activity_logs')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'activity_logs' },
      (payload) => callback(payload)
    )
    .subscribe()
}

// ═══ PLAYER CREDITS ═══
export async function getPlayerCredits(username) {
  const { data, error } = await supabase
    .from('player_credits')
    .select('*')
    .eq('player_id', username)
    .maybeSingle()

  const ignoredCodes = ['PGRST116', 'PGRST117', 'PGRST118', 'PGRST404', 'PGRST406']
  if (error && !ignoredCodes.includes(error.code)) console.error('Get Credits Error:', error)
  return data || { player_id: username, credits: 0, total_earned: 0, total_spent: 0 }
}

export async function awardCredits(username, amount, reason = 'Completed reservation') {
  try {
    // Obtener o crear registro de créditos
    let credits = await getPlayerCredits(username)
    
    if (!credits.id) {
      // Crear nuevo registro
      const { data, error } = await supabase
        .from('player_credits')
        .insert([{
          player_id: username,
          credits: amount,
          total_earned: amount
        }])
        .select()
      
      if (error) {
        console.error('Error creating credits:', error)
        return false
      }
      return true
    } else {
      // Actualizar registro existente
      const { error } = await supabase
        .from('player_credits')
        .update({
          credits: credits.credits + amount,
          total_earned: credits.total_earned + amount,
          updated_at: new Date()
        })
        .eq('player_id', username)
      
      if (error) {
        console.error('Error awarding credits:', error)
        return false
      }
      return true
    }
  } catch (e) {
    console.error('Award Credits Exception:', e)
    return false
  }
}

export async function spendCredits(username, amount) {
  try {
    const credits = await getPlayerCredits(username)
    
    if (credits.credits < amount) {
      console.error('Insufficient credits')
      return false
    }
    
    const { error } = await supabase
      .from('player_credits')
      .update({
        credits: credits.credits - amount,
        total_spent: credits.total_spent + amount,
        updated_at: new Date()
      })
      .eq('player_id', username)
    
    if (error) {
      console.error('Error spending credits:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('Spend Credits Exception:', e)
    return false
  }
}

export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('players')
    .select('username, country_flag, hours_played, is_admin')
    .order('hours_played', { ascending: false })
    .limit(10)

  if (error) console.error('Leaderboard Error:', error)
  return data || []
}

export async function getPlayerStats(username) {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', username)
    .maybeSingle()

  const ignoredCodes = ['PGRST116', 'PGRST117', 'PGRST118', 'PGRST404', 'PGRST406']
  if (error && !ignoredCodes.includes(error.code)) console.error('Get Stats Error:', error)
  return data || { player_id: username, total_hours: 0, infraction_count: 0, rank: null }
}

export async function getPlayerProfile(username) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('username', username)
    .single()

  if (error) console.error('Get Player Profile Error:', error)
  return data || null
}

export async function createPlayerProfile(profile) {
  const { data, error } = await supabase
    .from('players')
    .insert([profile])
    .select()

  if (error) console.error('Create Player Profile Error:', error)
  return data?.[0] || null
}

export async function updatePlayerProfile(profile) {
  const { id, ...changes } = profile
  const { data, error } = await supabase
    .from('players')
    .update(changes)
    .eq('id', id)
    .select()

  if (error) console.error('Update Player Profile Error:', error)
  return data?.[0] || null
}

export async function getPlayerOverview(username) {
  const [statsRes, donationsRes, infractionsRes] = await Promise.all([
    supabase.from('player_stats').select('*').eq('player_id', username).single(),
    supabase.from('donations').select('amount').eq('player_id', username),
    supabase.from('activity_logs').select('*').eq('player_id', username).like('action', '%violation%')
  ])

  if (statsRes.error && statsRes.error.code) {
    const ignoredCodes = ['PGRST116', 'PGRST117', 'PGRST118', 'PGRST404', 'PGRST406']
    if (!ignoredCodes.includes(statsRes.error.code)) console.warn('Player overview stats error:', statsRes.error)
  }
  if (donationsRes.error) console.warn('Player overview donations error:', donationsRes.error)
  if (infractionsRes.error) console.warn('Player overview infractions error:', infractionsRes.error)

  const stats = statsRes.data || { total_hours: 0, rank: null }
  const donations = donationsRes.data || []
  const infractions = infractionsRes.data || []

  return {
    total_hours: Number(stats.total_hours || 0),
    rank: stats.rank || null,
    total_donations: donations.reduce((sum, d) => sum + Number(d.amount || 0), 0),
    infractions: infractions.length,
    active_reservations: 0
  }
}

export function subscribeToDonations(callback) {
  return supabase
    .channel('donations')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'donations' },
      (payload) => callback(payload)
    )
    .subscribe()
}

// Obtener fondos
export async function getFunds() {
  const { data, error } = await supabase
    .from('community_funds')
    .select('*')
  
  if (error) console.error('Funds Error:', error)
  return data?.[0] || { games_fund: 0, server_fund: 0 }
}

// Actualizar fondos
export async function updateFunds(games, server) {
  const { error } = await supabase
    .from('community_funds')
    .update({ games_fund: games, server_fund: server })
    .eq('id', 1)
  
  if (error) console.error('Update Funds Error:', error)
  return !error
}

// ═══ REAL-TIME SUBSCRIPTIONS ═══
export function subscribeToReservations(callback) {
  return supabase
    .channel('reservations')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'reservations' },
      (payload) => callback(payload)
    )
    .subscribe()
}

export function subscribeToSteamStatus(callback) {
  const interval = setInterval(async () => {
    const user = await getSteamUserInfo()
    callback(user)
  }, 30000) // Cada 30 segundos
  
  return () => clearInterval(interval)
}

// ═══ VALIDATION FUNCTIONS ═══
export async function validateReservation(reservation) {
  const errors = []
  
  // Validar horas
  if (reservation.endH <= reservation.startH) {
    errors.push('Fin debe ser posterior al inicio')
  }
  
  if (reservation.endH - reservation.startH > 4) {
    errors.push('Máximo 4 horas consecutivas')
  }
  
  // Validar límite de reservas activas
  const active = await supabase
    .from('reservations')
    .select('*')
    .eq('player_id', reservation.player)
    .eq('status', 'confirmed')
  
  if (active.data?.length >= 3) {
    errors.push('Ya tienes 3 reservas activas')
  }
  
  // Validar conflictos
  const conflicts = await supabase
    .from('reservations')
    .select('*')
    .eq('day', reservation.day)
    .eq('status', 'confirmed')
    .lt('end_hour', reservation.endH)
    .gt('start_hour', reservation.startH)
  
  if (conflicts.data?.length > 0) {
    errors.push(`Conflicto con reserva de ${conflicts.data[0].player_id}`)
  }
  
  return { valid: errors.length === 0, errors }
}

// ═══ SYNC STEAM STATUS WITH DB ═══
export async function syncSteamStatus() {
  const user = await getSteamUserInfo()
  if (!user) return
  
  const { data: current } = await supabase
    .from('steam_status')
    .select('*')
    .limit(1)
  
  const status = {
    steam_id: user.steamid,
    player_name: user.personaname,
    game_id: user.gameid || null,
    state: user.personastate, // 0=offline, 1=online, 2=busy, etc
    last_logoff: new Date(user.lastlogoff * 1000),
    updated_at: new Date()
  }
  
  if (current?.length > 0) {
    await supabase
      .from('steam_status')
      .update(status)
      .eq('id', current[0].id)
  } else {
    await supabase
      .from('steam_status')
      .insert([status])
  }
}
