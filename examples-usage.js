// ═══ EJEMPLOS DE USO - BACKEND LOGIC ═══
// Cómo usar las funciones avanzadas

import { 
  detectConflicts, 
  findAvailableSlot,
  calculatePlayerStats,
  checkPlayerQuota,
  checkCooldown,
  detectOvertime,
  processDonation,
  processAutomatedActions,
  startAutomatedSync,
  exportStats
} from './backend-logic.js'

// ═══ EJEMPLO 1: VALIDAR UNA NUEVA RESERVA ═══
async function exampleValidateReservation() {
  const newReservation = {
    day: 2,      // Miércoles
    startH: 14.0,
    endH: 16.5   // 2.5 horas
  }
  
  // Detectar conflictos
  const conflicts = await detectConflicts(newReservation)
  
  if (conflicts.hasConflict) {
    console.log('❌ Conflicto detectado:')
    console.log(conflicts.conflicts)
    
    if (conflicts.suggestion) {
      console.log('💡 Slots disponibles:')
      console.log(conflicts.suggestion)
    }
  } else {
    console.log('✅ No hay conflictos, se puede reservar')
  }
}

// ═══ EJEMPLO 2: BUSCAR SLOTS DISPONIBLES ═══
async function exampleFindSlots() {
  // Buscar un slot de 3 horas el viernes
  const slots = await findAvailableSlot(4, 3)
  
  if (slots) {
    console.log('📅 Slots disponibles el viernes:')
    slots.forEach(slot => {
      console.log(`  ${slot.start.toFixed(1)}:00 - ${slot.end.toFixed(1)}:00 (${slot.duration}h)`)
    })
  } else {
    console.log('❌ No hay slots disponibles')
  }
}

// ═══ EJEMPLO 3: CALCULAR ESTADÍSTICAS DE UN JUGADOR ═══
async function examplePlayerStats() {
  const stats = await calculatePlayerStats('Carlos99')
  
  console.log('📊 Estadísticas de Carlos99:')
  console.log(`  Horas totales: ${stats.totalHours}h`)
  console.log(`  Infracciones: ${stats.infractionCount}`)
  console.log(`  Reservas activas: ${stats.activeReservations}`)
  console.log(`  Total donado: $${stats.totalDonated.toFixed(2)}`)
  console.log(`  Ranking: #${stats.rank}`)
}

// ═══ EJEMPLO 4: VERIFICAR CUOTA DE RESERVAS ═══
async function exampleCheckQuota() {
  const quota = await checkPlayerQuota('Juan')
  
  console.log(`📋 Cuota de Juan:`)
  console.log(`  Puede reservar: ${quota.canReserve ? 'SÍ' : 'NO'}`)
  console.log(`  Reservas activas: ${quota.activeCount}/${quota.maxAllowed}`)
  console.log(`  Spots disponibles: ${quota.spotsLeft}`)
}

// ═══ EJEMPLO 5: VERIFICAR COOLDOWN ═══
async function exampleCheckCooldown() {
  const cooldown = await checkCooldown('Denyer')
  
  if (cooldown.canReserve) {
    console.log('✅ Denyer puede hacer nuevas reservas')
  } else {
    console.log(`⏳ Denyer en cooldown: ${cooldown.cooldownMinutes}m restantes`)
  }
}

// ═══ EJEMPLO 6: DETECTAR OVERTIME ═══
async function exampleDetectOvertime() {
  const overtime = await detectOvertime('reservation-uuid-here')
  
  console.log(`⏱️ Estado de sesión:`)
  console.log(`  Overtime: ${overtime.isOvertime ? 'SÍ' : 'NO'}`)
  if (overtime.isOvertime) {
    console.log(`  Minutos excedidos: ${overtime.minutes}`)
    console.log(`  Estado: ${overtime.warningLevel.toUpperCase()}`)
    if (overtime.shouldKick) {
      console.log('  ⚠️ ¡DEBE SER DESCONECTADO!')
    }
  }
}

// ═══ EJEMPLO 7: PROCESAR DONACIÓN ═══
async function exampleProcessDonation() {
  try {
    const donation = await processDonation(
      'Carlos99',
      5.00,
      'Para el DLC!'
    )
    
    console.log('💳 Donación procesada:')
    console.log(`  Jugador: Carlos99`)
    console.log(`  Monto: $5.00`)
    console.log(`  Distribución: $2.75 (games) + $2.25 (server)`)
  } catch (error) {
    console.error('❌ Error en donación:', error.message)
  }
}

// ═══ EJEMPLO 8: INICIAR SINCRONIZACIÓN AUTOMÁTICA ═══
function exampleStartAutoSync() {
  // Esto ejecutará processAutomatedActions cada 5 minutos
  startAutomatedSync()
  
  console.log('⚙️ Sistema automático iniciado')
  console.log('  - Detectará overtimes')
  console.log('  - Procesará cola de espera')
  console.log('  - Registrará infracciones')
}

// ═══ EJEMPLO 9: EXPORTAR ESTADÍSTICAS ═══
async function exampleExportStats() {
  const stats = await exportStats('json')
  
  console.log('📈 Resumen de estadísticas:')
  console.log(`  Total de reservas: ${stats.summary.total_reservations}`)
  console.log(`  Horas jugadas: ${stats.summary.total_hours_played}h`)
  console.log(`  Donaciones totales: $${stats.summary.total_donations}`)
  console.log(`  Jugadores activos: ${stats.summary.total_players}`)
  
  // Descargar como JSON
  const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sharecontrol-stats-${new Date().toISOString()}.json`
  a.click()
}

// ═══ INTEGRACIONES EN EL HTML ═══

/**
 * Llamar esto en submitRes() para obtener slots sugeridos si hay conflicto
 */
async function improvedSubmitRes() {
  const newRes = {
    day: parseInt(document.getElementById('res-day').value),
    startH: parseFloat(document.getElementById('res-start').value.split(':')[0]),
    endH: parseFloat(document.getElementById('res-end').value.split(':')[0])
  }
  
  // 1. Verificar cuota
  const quota = await checkPlayerQuota(newRes.player)
  if (!quota.canReserve) {
    showNotif('error', 'CUOTA EXCEDIDA', `Ya tienes ${quota.activeCount} reservas`)
    return
  }
  
  // 2. Verificar cooldown
  const cooldown = await checkCooldown(newRes.player)
  if (!cooldown.canReserve) {
    showNotif('error', 'EN COOLDOWN', `Espera ${cooldown.cooldownMinutes} minutos`)
    return
  }
  
  // 3. Detectar conflictos
  const conflicts = await detectConflicts(newRes)
  if (conflicts.hasConflict && conflicts.suggestion) {
    // Mostrar modal con sugerencias
    console.log('Slots alternativos:', conflicts.suggestion)
  }
  
  // 4. Crear reserva
  await createReservation(newRes)
}

/**
 * Tabla de infracciones en dashboard
 */
async function displayInfractions() {
  const stats = await exportStats()
  const playersWithViolations = stats.data.stats.filter(s => s.infraction_count > 0)
  
  console.table(playersWithViolations, ['player_id', 'infraction_count', 'total_hours'])
}

/**
 * Sistema de notificaciones para overtimes
 */
async function monitorOvertimes() {
  setInterval(async () => {
    const { data: active } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'confirmed')
    
    for (const res of active || []) {
      const overtime = await detectOvertime(res.id)
      
      if (overtime.warningLevel === 'critical') {
        showNotif('error', '⚠️ OVERTIME CRÍTICO', 
          `${res.player_id} +${overtime.minutes}m — ¡DESCONECTAR AHORA!`)
      } else if (overtime.warningLevel === 'warning') {
        showNotif('warning', '⏱️ OVERTIME', 
          `${res.player_id} +${overtime.minutes}m`)
      }
    }
  }, 60000) // Cada minuto
}

// ═══ INTEGRACIÓN EN LA PÁGINA PRINCIPAL ═══
/**
 * Llamar esto al inicializar la app
 */
export async function initAdvancedFeatures() {
  console.log('🚀 Inicializando características avanzadas...')
  
  // 1. Iniciar sincronización automática
  startAutomatedSync()
  
  // 2. Monitorear overtimes
  monitorOvertimes()
  
  // 3. Mostrar stats en panel (opcional)
  // displayInfractions()
  
  console.log('✅ Características avanzadas activas')
}

// ═══ DEBUG MODE ═══
/**
 * Modo debug para testing
 */
export async function debugMode() {
  const testPlayer = 'Carlos99'
  
  console.log('🐛 MODO DEBUG ACTIVADO')
  console.log('═══════════════════════')
  
  // Test 1: Stats
  console.log('\n📊 Test 1: Estadísticas de jugador')
  const stats = await calculatePlayerStats(testPlayer)
  console.table(stats)
  
  // Test 2: Quota
  console.log('\n📋 Test 2: Cuota de reservas')
  const quota = await checkPlayerQuota(testPlayer)
  console.table(quota)
  
  // Test 3: Cooldown
  console.log('\n⏳ Test 3: Cooldown')
  const cooldown = await checkCooldown(testPlayer)
  console.table(cooldown)
  
  // Test 4: Available slots
  console.log('\n📅 Test 4: Slots disponibles el viernes')
  const slots = await findAvailableSlot(4, 3)
  console.table(slots || [])
  
  // Test 5: Export
  console.log('\n📈 Test 5: Exportar estadísticas')
  const exported = await exportStats()
  console.log(exported.summary)
}

// Para activar: En la consola del navegador, escribe:
// import { debugMode } from './examples.js'
// debugMode()
