// ═══ ADVANCED BACKEND LOGIC ═══
// Aquí van las funciones más complejas de backend

import { supabase } from './supabase-config.js'

// ═══ CONFLICT DETECTION ═══
/**
 * Detecta conflictos entre reservas
 * @param {Object} newRes - Nueva reserva a validar
 * @returns {Object} - { hasConflict: bool, conflicts: Array, suggestion: String }
 */
export async function detectConflicts(newRes) {
  const { data: existing, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('day', newRes.day)
    .eq('status', 'confirmed')
    .lt('end_hour', newRes.endH)
    .gt('start_hour', newRes.startH)
  
  if (error) throw new Error(`DB Error: ${error.message}`)
  
  if (!existing || existing.length === 0) {
    return { hasConflict: false, conflicts: [], suggestion: null }
  }
  
  const conflicts = existing.map(r => ({
    player: r.player_id,
    start: r.start_hour,
    end: r.end_hour,
    game: r.game
  }))
  
  // Buscar slot libre alternativo
  const suggestion = await findAvailableSlot(newRes.day, newRes.endH - newRes.startH)
  
  return { hasConflict: true, conflicts, suggestion }
}

// ═══ FIND AVAILABLE SLOTS ═══
/**
 * Encuentra slots disponibles en un día
 * @param {number} day - Día de la semana (0-6)
 * @param {number} duration - Duración requerida en horas
 * @returns {Promise<Array>} - Array de slots disponibles
 */
export async function findAvailableSlot(day, duration) {
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('day', day)
    .eq('status', 'confirmed')
    .order('start_hour')
  
  if (error) throw new Error(`DB Error: ${error.message}`)
  
  const SH = 8, EH = 22 // 8am - 10pm
  const reserved = (reservations || []).map(r => ({ start: r.start_hour, end: r.end_hour }))
  
  const available = []
  let currentTime = SH
  
  for (const res of reserved) {
    if (res.start - currentTime >= duration) {
      available.push({ start: currentTime, end: res.start, duration: res.start - currentTime })
    }
    currentTime = Math.max(currentTime, res.end)
  }
  
  if (EH - currentTime >= duration) {
    available.push({ start: currentTime, end: EH, duration: EH - currentTime })
  }
  
  return available.length > 0 ? available : null
}

// ═══ PLAYER STATS ═══
/**
 * Calcula estadísticas de un jugador
 * @param {string} playerId - ID del jugador
 * @returns {Promise<Object>} - Estadísticas calculadas
 */
export async function calculatePlayerStats(playerId) {
  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select('*')
    .eq('player_id', playerId)
    .eq('status', 'confirmed')
  
  if (resError) throw new Error(`Reservations Error: ${resError.message}`)
  
  const { data: infractions, error: infError } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('player_id', playerId)
    .contains('action', 'violation')
  
  if (infError) throw new Error(`Infractions Error: ${infError.message}`)
  
  const { data: donations, error: donError } = await supabase
    .from('donations')
    .select('amount')
    .eq('player_id', playerId)
  
  if (donError) throw new Error(`Donations Error: ${donError.message}`)
  
  const totalHours = (reservations || []).reduce((sum, r) => sum + (r.end_hour - r.start_hour), 0)
  const infractionCount = infractions?.length || 0
  const totalDonated = donations?.reduce((sum, d) => sum + d.amount, 0) || 0
  
  return {
    playerId,
    totalHours: Math.round(totalHours * 10) / 10,
    infractionCount,
    activeReservations: (reservations || []).length,
    totalDonated,
    rank: await calculatePlayerRank(playerId)
  }
}

// ═══ PLAYER RANKING ═══
/**
 * Calcula el ranking de un jugador basado en horas y donaciones
 */
export async function calculatePlayerRank(playerId) {
  const { data: allStats, error } = await supabase
    .from('player_stats')
    .select('*')
    .order('total_hours', { ascending: false })
  
  if (error) throw new Error(`Rank Error: ${error.message}`)
  
  const rank = (allStats || []).findIndex(s => s.player_id === playerId) + 1
  return rank || 999
}

// ═══ QUOTA MANAGEMENT ═══
/**
 * Verifica límites de reservas de un jugador
 * @param {string} playerId - ID del jugador
 * @returns {Promise<Object>} - { canReserve: bool, activeCount: num, maxAllowed: num }
 */
export async function checkPlayerQuota(playerId) {
  const { data: active, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('player_id', playerId)
    .eq('status', 'confirmed')
  
  if (error) throw new Error(`Quota Error: ${error.message}`)
  
  const maxReservations = 3
  const activeCount = active?.length || 0
  
  return {
    canReserve: activeCount < maxReservations,
    activeCount,
    maxAllowed: maxReservations,
    spotsLeft: maxReservations - activeCount
  }
}

// ═══ COOLDOWN SYSTEM ═══
/**
 * Verifica el cooldown entre sesiones
 * @param {string} playerId - ID del jugador
 * @returns {Promise<Object>} - { canReserve: bool, cooldownMinutes: num }
 */
export async function checkCooldown(playerId) {
  const { data: lastRes, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('player_id', playerId)
    .order('updated_at', { ascending: false })
    .limit(1)
  
  if (error || !lastRes || lastRes.length === 0) {
    return { canReserve: true, cooldownMinutes: 0 }
  }
  
  const COOLDOWN_MINUTES = 120 // 2 horas
  const lastEnd = new Date(lastRes[0].updated_at)
  const now = new Date()
  const elapsed = (now - lastEnd) / 60000 // convertir a minutos
  const remaining = Math.max(0, COOLDOWN_MINUTES - elapsed)
  
  return {
    canReserve: remaining === 0,
    cooldownMinutes: Math.ceil(remaining)
  }
}

// ═══ OVERTIME DETECTION ═══
/**
 * Detecta si una sesión se pasó del tiempo
 * @param {string} reservationId - ID de la reserva
 * @returns {Promise<Object>} - { isOvertime: bool, minutes: num, shouldKick: bool }
 */
export async function detectOvertime(reservationId) {
  const { data: reservation, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .single()
  
  if (error) throw new Error(`Overtime Error: ${error.message}`)
  
  if (!reservation) return { isOvertime: false, minutes: 0, shouldKick: false }
  
  const now = new Date()
  const reservationEnd = new Date(reservation.updated_at)
  reservationEnd.setHours(reservationEnd.getHours() + Math.floor(reservation.end_hour))
  
  const overtime = (now - reservationEnd) / 60000 // minutos
  const shouldKick = overtime > 15 // Kick después de 15 minutos de overtime
  
  return {
    isOvertime: overtime > 0,
    minutes: Math.ceil(overtime),
    shouldKick,
    warningLevel: overtime > 5 ? 'critical' : overtime > 0 ? 'warning' : 'ok'
  }
}

// ═══ AUTOMATED ACTIONS ═══
/**
 * Realiza acciones automáticas basadas en reglas
 */
export async function processAutomatedActions() {
  console.log('⚙️ Procesando acciones automáticas...')
  
  // 1. Detectar overtimes
  const { data: allRes, error: resError } = await supabase
    .from('reservations')
    .select('*')
    .eq('status', 'confirmed')
  
  if (resError) {
    console.error('Error fetching reservations:', resError)
    return
  }
  
  for (const res of allRes || []) {
    const overtime = await detectOvertime(res.id)
    if (overtime.shouldKick) {
      // Registrar violación
      await supabase.from('activity_logs').insert([{
        player_id: res.player_id,
        action: 'violation_overtime',
        details: { reservation_id: res.id, overtime_minutes: overtime.minutes }
      }])
      
      // Incrementar contador de infracciones
      const { data: stats } = await supabase
        .from('player_stats')
        .select('*')
        .eq('player_id', res.player_id)
        .single()
      
      if (stats) {
        await supabase
          .from('player_stats')
          .update({ infraction_count: (stats.infraction_count || 0) + 1 })
          .eq('player_id', res.player_id)
      }
      
      console.log(`⚠️ Infraction logged for ${res.player_id}: Overtime +${overtime.minutes}m`)
    }
  }
  
  // 2. Procesar cola de espera
  const { data: queued } = await supabase
    .from('reservations')
    .select('*')
    .eq('status', 'queued')
    .order('created_at')
  
  for (const qRes of queued || []) {
    const conflicts = await detectConflicts({
      day: qRes.day,
      startH: qRes.start_hour,
      endH: qRes.end_hour
    })
    
    if (!conflicts.hasConflict) {
      // Mover a confirmado
      await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', qRes.id)
      
      console.log(`✅ Queue reservation confirmed: ${qRes.player_id}`)
    }
  }
}

// ═══ FUND MANAGEMENT ═══
/**
 * Maneja donaciones y actualiza fondos
 */
export async function processDonation(playerId, amount, message) {
  // 1. Registrar donación
  const { data: donation, error: donError } = await supabase
    .from('donations')
    .insert([{ player_id: playerId, amount, message }])
    .select()
  
  if (donError) throw new Error(`Donation Error: ${donError.message}`)
  
  // 2. Actualizar fondos
  const { data: funds, error: fundError } = await supabase
    .from('community_funds')
    .select('*')
    .limit(1)
    .single()
  
  if (fundError) throw new Error(`Fund Error: ${fundError.message}`)
  
  // Distribuir: 55% a games, 45% a server
  const newGamesFund = funds.games_fund + (amount * 0.55)
  const newServerFund = funds.server_fund + (amount * 0.45)
  
  const { error: updateError } = await supabase
    .from('community_funds')
    .update({
      games_fund: Math.min(newGamesFund, funds.games_goal),
      server_fund: Math.min(newServerFund, funds.server_goal)
    })
    .eq('id', funds.id)
  
  if (updateError) throw new Error(`Update Error: ${updateError.message}`)
  
  // 3. Registrar log
  await supabase.from('activity_logs').insert([{
    player_id: playerId,
    action: 'donation',
    details: { amount, message }
  }])
  
  return donation[0]
}

// ═══ PERIODIC SYNC ═══
/**
 * Ejecuta todas las acciones automáticas periódicamente
 */
export function startAutomatedSync() {
  // Cada 5 minutos
  setInterval(processAutomatedActions, 5 * 60 * 1000)
  
  console.log('✅ Automated sync started (every 5 minutes)')
}

// ═══ EXPORT STATS ═══
/**
 * Exporta estadísticas en JSON para análisis
 */
export async function exportStats(format = 'json') {
  const { data: reservations } = await supabase.from('reservations').select('*')
  const { data: donations } = await supabase.from('donations').select('*')
  const { data: stats } = await supabase.from('player_stats').select('*')
  
  const export_data = {
    exported_at: new Date().toISOString(),
    summary: {
      total_reservations: reservations?.length || 0,
      total_hours_played: reservations?.reduce((sum, r) => sum + (r.end_hour - r.start_hour), 0) || 0,
      total_donations: donations?.reduce((sum, d) => sum + d.amount, 0) || 0,
      total_players: stats?.length || 0
    },
    data: { reservations, donations, stats }
  }
  
  return export_data
}
