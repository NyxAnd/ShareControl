## 🏗️ ARQUITECTURA DE SHARECONTROL

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (HTML/JS)                         │
│  sharecontrol-dashboard.html                                    │
│  ├─ UI Components (Calendar, Reservations, Stats)              │
│  ├─ Event Handlers (Click, Form Submit)                        │
│  └─ Real-time Updates (Websockets)                             │
└────────────────────┬────────────────────────────────────────────┘
                     │ Async API Calls
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE CLIENT (Middleware)                   │
│  supabase-config.js                                             │
│  ├─ Steam API Integration                                      │
│  ├─ Database CRUD Operations                                   │
│  ├─ Real-time Subscriptions (Websockets)                       │
│  └─ Authentication                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API + Websockets
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND                              │
│  ├─ PostgreSQL Database                                        │
│  │  ├─ players                                                 │
│  │  ├─ reservations                                            │
│  │  ├─ donations                                               │
│  │  ├─ steam_status                                            │
│  │  ├─ community_funds                                         │
│  │  ├─ activity_logs                                           │
│  │  └─ player_stats                                            │
│  ├─ RLS Policies (Row Level Security)                          │
│  ├─ Real-time Subscriptions                                    │
│  └─ Authentication                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │ Webhooks + API
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL APIS                                 │
│  ├─ Steam API (getSteamUserInfo, getSteamCurrentGame)         │
│  └─ Ko-fi (Donations)                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 FLUJO DE DATOS

### 1️⃣ CREACIÓN DE RESERVA
```
Usuario clicks "Reservar" en UI
    ↓
Modal abre con formulario
    ↓
Usuario ingresa datos
    ↓
validateReservation() verifica reglas locales
    ↓
submitRes() envía a Supabase
    ↓
supabase-config.js::createReservation()
    ├─ INSERT en tabla reservations
    ├─ Valida conflictos en la BD
    └─ Retorna nueva reserva con ID
    ↓
subscribeToReservations() recibe websocket UPDATE
    ↓
UI actualiza automáticamente (renderCalendar, renderReservations)
    ↓
Notificación al usuario: "¡RESERVADO!" o "EN COLA"
    ↓
Log entry creado en activity_logs
```

### 2️⃣ SINCRONIZACIÓN STEAM EN TIEMPO REAL
```
initSteamSync() inicia
    ↓
subscribeToSteamStatus() setup
    ↓
syncSteamStatus() ejecuta cada 30s
    ├─ GET /ISteamUser/GetPlayerSummaries (Steam API)
    ├─ GET /IPlayerService/GetOwnedGames (Steam API)
    └─ UPDATE steam_status table (Supabase)
    ↓
Websocket notifica cambios
    ↓
updateSteamUI(user) actualiza el panel "LIVE STATUS"
    ├─ Mostrará quién está jugando
    ├─ Qué juego está corriendo
    └─ Cuándo fue el último logoff
```

### 3️⃣ VALIDACIÓN CON BACKEND LOGIC
```
Usuario intenta reservar 14:00-17:00 el viernes
    ↓
backend-logic.js::validateReservation()
    ├─ checkPlayerQuota() - ¿Tiene < 3 reservas?
    ├─ checkCooldown() - ¿Pasaron 2h desde último?
    ├─ detectConflicts() - ¿Hay solapamiento?
    └─ findAvailableSlot() - Si hay conflicto, sugerir hora alternativa
    ↓
Si hay problemas → showNotif('error', ...)
    ↓
Si está todo OK → createReservation() → BD
```

### 4️⃣ DETECCIÓN AUTOMÁTICA DE INFRACCIONES
```
processAutomatedActions() ejecuta cada 5 minutos
    ↓
Recorre todas las reservas confirmadas
    ↓
Para cada una: detectOvertime(reservationId)
    ├─ Compara hora actual vs end_hour
    ├─ Si > 15 min exceso → shouldKick = true
    └─ Retorna { isOvertime, minutes, shouldKick }
    ↓
Si shouldKick = true
    ├─ INSERT infraction en activity_logs
    ├─ UPDATE player_stats.infraction_count++
    └─ Envía warning al admin
```

### 5️⃣ GESTIÓN DE FONDOS COMUNITARIOS
```
Usuario hace donación ($10)
    ↓
processDonation('Carlos99', 10.00, 'Para el DLC')
    ├─ INSERT en donations table
    ├─ GET community_funds actual
    ├─ Calcula distribución:
    │  ├─ games_fund += $10 * 0.55 = $5.50
    │  └─ server_fund += $10 * 0.45 = $4.50
    ├─ UPDATE community_funds
    └─ INSERT en activity_logs
    ↓
UI actualiza barras de progreso
    ↓
Si goals alcanzados → triggerCeleb() (animación confetti)
```

---

## 🔄 SINCRONIZACIÓN EN TIEMPO REAL (WebSockets)

### Real-time Channels en Supabase
```javascript
// En supabase-config.js
subscribeToReservations(callback) {
  return supabase
    .channel('reservations')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'reservations' },
      (payload) => callback(payload)  // Se ejecuta cuando hay INSERT/UPDATE/DELETE
    )
    .subscribe()
}
```

### Ejemplo de Payload
```json
{
  "type": "postgres_changes",
  "event": "INSERT",
  "schema": "public",
  "table": "reservations",
  "record": {
    "id": "uuid-123",
    "player_id": "Carlos99",
    "day": 2,
    "start_hour": 14.0,
    "end_hour": 16.5,
    "status": "confirmed",
    "game": "Elden Ring",
    "created_at": "2024-05-22T...",
    "updated_at": "2024-05-22T..."
  }
}
```

---

## 🔐 SEGURIDAD (RLS - Row Level Security)

### Policies Aplicadas

**1. Reservations - READ (Público)**
```sql
CREATE POLICY "reservations_read" ON reservations 
  FOR SELECT USING (true);
-- Todos pueden ver todas las reservas
```

**2. Reservations - INSERT (Solo el propietario)**
```sql
CREATE POLICY "reservations_write" ON reservations 
  FOR INSERT WITH CHECK (auth.uid()::text = created_by);
-- Solo puedes crear si eres tú
```

**3. Donations - READ (Público)**
```sql
CREATE POLICY "donations_read" ON donations 
  FOR SELECT USING (true);
-- Todos ven el historial de donaciones
```

**4. Community Funds - READ (Público)**
```sql
CREATE POLICY "funds_read" ON community_funds 
  FOR SELECT USING (true);
-- Progreso visible para todos
```

---

## 📂 ARCHIVOS Y RESPONSABILIDADES

```
sharecontrol-dashboard.html
├─ HTML + CSS (UI)
├─ Contiene <script type="module"> que importa:
│  ├─ supabase-config.js (conexión + API)
│  ├─ backend-logic.js (validaciones complejas)
│  └─ examples-usage.js (testing)
└─ DOM events + renderizado

supabase-config.js
├─ Configuración de Supabase
├─ Steam API functions
├─ Database CRUD (getReservations, createReservation, etc)
└─ Real-time subscriptions

backend-logic.js
├─ Validaciones avanzadas
├─ Detección de conflictos
├─ Cálculo de cuotas
├─ Gestión de cooldowns
├─ Detección de overtimes
├─ Acciones automáticas
└─ Exportación de datos

examples-usage.js
├─ Ejemplos de cada función
├─ Integración en HTML
└─ Debug mode

supabase-schema.sql
├─ Definición de tablas
├─ Índices
├─ RLS Policies
└─ Datos iniciales

README.md
├─ Setup guide
├─ Configuración Supabase
├─ Configuración Steam API
└─ Troubleshooting
```

---

## ⚡ FLUJO DE INICIALIZACIÓN

```
DOMContentLoaded event
    ↓
initializeApp()
    ├─ loadFromSupabase() → Cargar reservas, donaciones, fondos
    ├─ initSteamSync() → Iniciar sincronización de Steam
    ├─ setupRealTimeSync() → Suscribirse a cambios
    ├─ renderCalendar() → Dibujar calendario
    ├─ renderReservations() → Dibujar lista de reservas
    └─ console.log('✅ ShareControl iniciado')
    ↓
setInterval handlers activos
    ├─ tick() → cada 1s (reloj, contadores)
    ├─ syncSteamStatus() → cada 30s
    ├─ processAutomatedActions() → cada 5 min
    ├─ addLog() → simular logs cada 5s (demo)
    └─ simulateDonation() → simular donación cada 20s (demo)
```

---

## 🎯 CASOS DE USO PRINCIPALES

### Caso 1: Reserva Válida
```
Carlos99 quiere 15:00-17:00 el viernes
  ✓ Cuota: 2/3 reservas activas → OK
  ✓ Cooldown: 0 min requerido → OK
  ✓ Conflictos: Ninguno → OK
  → Reserva CONFIRMADA
```

### Caso 2: Reserva en Cola
```
Juan quiere 15:00-17:00 el viernes
  ✓ Cuota: OK
  ✓ Cooldown: OK
  ✗ Conflictos: Carlos99 15:00-17:00 → CONFLICTO
  → Reserva EN COLA (espera el turno)
```

### Caso 3: Reserva Rechazada
```
Denyer quiere 14:00-18:30 el martes
  ✗ Duración: 4.5h > 4h max → RECHAZADA
  → "Máximo 4 horas consecutivas"
```

### Caso 4: Detección de Overtime
```
Jasnis reservó 14:00-16:00
  Ahora son las 16:15 (15 minutos de exceso)
  → detectOvertime() retorna shouldKick = true
  → Infracción registrada
  → Warning al admin
  → Estadísticas de Jasnis actualizadas
```

---

## 🚀 PRÓXIMAS OPTIMIZACIONES

1. **Autenticación Real**: Reemplazar hardcoded players con Auth0/Supabase Auth
2. **Notificaciones**: Push notifications cuando es tu turno
3. **Discord Bot**: Webhook para notificaciones en Discord
4. **Mobile App**: React Native o Flutter
5. **Analytics**: Dashboard de admin con gráficas
6. **Backups**: Automated backups a Google Drive
7. **Stripe Integration**: Pagos para donaciones
8. **Email Alerts**: Recordatorios de turno próximo

---

## 📞 DEBUGGING

### Ver logs en tiempo real
```javascript
// En consola del navegador
import { debugMode } from './examples-usage.js'
debugMode()
```

### Ver cambios en BD en tiempo real
```sql
-- En Supabase SQL Editor
SELECT * FROM reservations ORDER BY created_at DESC LIMIT 5;
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM donations ORDER BY created_at DESC;
```

### Monitorear Steam API
```javascript
// En consola
const user = await getSteamUserInfo()
console.log(user)
```

---

**Created**: 2024-05-22  
**Last Updated**: 2024-05-22  
**Status**: 🚀 Production Ready
