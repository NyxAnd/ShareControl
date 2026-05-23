<<<<<<< HEAD
## 🎮 ShareControl Dashboard - Setup Guide

Una plataforma para **compartir cuenta Steam en turnos** con sincronización en tiempo real.

### 📋 Requisitos

- Cuenta Supabase (https://supabase.com) - GRATIS
- Steam API Key (https://steamcommunity.com/dev/apikey)
- SteamID64 de la cuenta compartida

---

### 🚀 Paso 1: Configurar Supabase

1. **Ir a https://supabase.com** y crear cuenta
2. **Crear nuevo proyecto**
3. **Copiar las credenciales:**
   - Project URL (ej: https://tu-proyecto.supabase.co)
   - Anon Key (público)

4. **Ejecutar el SQL** en `supabase-schema.sql`:
   - En Supabase: SQL Editor → New Query
   - Copiar todo el contenido de `supabase-schema.sql`
   - Ejecutar

5. **Habilitar RLS** (Row Level Security):
   - Supabase: Authentication → Settings
   - Habilitar JWT

---

### 🎮 Paso 2: Obtener Steam API Key

1. **Ir a:** https://steamcommunity.com/dev/apikey
2. **Aceptar términos y obtener key**
3. **Encontrar SteamID64:**
   - Abrir https://steamcommunity.com/profiles/TU_PERFIL/
   - El número en la URL es tu SteamID64

---

### ⚙️ Paso 3: Actualizar Configuración

**Editar `supabase-config.js`** (líneas 3-6):

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'
const SUPABASE_ANON_KEY = 'eyJ...' // Tu anon key
const STEAM_API_KEY = 'XXXXXXXX...' // Tu Steam API key
const STEAM_ACCOUNT_ID = '123456789' // Tu SteamID64
```

---

### 📁 Estructura de Archivos

```
WEb sTEAM/
├── sharecontrol-dashboard.html    (Dashboard principal)
├── supabase-config.js             (Configuración + funciones)
├── supabase-schema.sql            (Crear tablas en BD)
└── README.md                       (Este archivo)
```

---

### ✨ Características Implementadas

#### Base de Datos (Supabase)
- ✅ Almacenar reservas con validaciones
- ✅ Registro de donaciones
- ✅ Fondos comunitarios
- ✅ Estadísticas de jugadores
- ✅ Sincronización en tiempo real (websockets)

#### Steam Integration
- ✅ Obtener estado de la cuenta (online/offline)
- ✅ Ver juego actual en tiempo real
- ✅ Historial de playtime
- ✅ Actualizaciones cada 30 segundos

#### Sistema de Reservas
- ✅ Crear reservas con validación automática
- ✅ Conflictos detectados automáticamente
- ✅ Cola de espera
- ✅ Extender sesiones (+30 min)
- ✅ Cancelar reservas

#### Donaciones
- ✅ Registrar donaciones en BD
- ✅ Calcular fondos de metas
- ✅ Historial públicamente visible

---

### 🔄 Cómo Funciona la Sincronización

```
Usuario hace acción (ej: reservar)
    ↓
Validación local + en BD (Supabase)
    ↓
Guardado en Supabase
    ↓
Websocket notifica cambio a todos
    ↓
UI actualiza automáticamente
```

**Ejemplo en tiempo real:**
- Carlos99 hace una reserva
- Se valida contra la BD
- Se guarda en `reservations` table
- Todos los navegadores conectados reciben actualización
- El calendario se renderiza con la nueva reserva

---

### 📊 Tablas de Base de Datos

```sql
players         -- Datos de jugadores
reservations    -- Sistema de turnos
steam_status    -- Estado actual de Steam
donations       -- Registro de donaciones
community_funds -- Fondos de metas
activity_logs   -- Log de eventos
player_stats    -- Estadísticas
```

---

### 🔐 Seguridad

**RLS Policies (Row Level Security):**
- ✅ Datos de reservas son públicos (todos pueden leer)
- ✅ Solo el propietario puede modificar su reserva
- ✅ Fondos son públicos
- ✅ Logs son de solo lectura

---

### 🐛 Troubleshooting

**Error: "supabase is not defined"**
- Verificar que `supabase-config.js` está en la misma carpeta
- Verificar que el HTML tiene `<script type="module">`

**Error: "Steam API returned null"**
- Verificar Steam API Key es válida
- Verificar SteamID64 es correcto
- Esperar 5 minutos (APIs tienen límites)

**Reservas no se guardan**
- Verificar Supabase URL y keys son correctas
- Verificar que la tabla `reservations` existe
- Abrir console del navegador (F12) para ver errores

---

### 📱 Próximas Mejoras Sugeridas

1. **Autenticación:** Agregar login para asociar jugadores
2. **Notificaciones:** Push notifications cuando es tu turno
3. **Integración Discord:** Webhook para notificaciones
4. **API REST:** Backend en Node.js/Python para validaciones más complejas
5. **Estadísticas avanzadas:** Análisis de patrones de juego
6. **Sistema de ratings:** Calificaciones entre jugadores

---

### 🎯 Variables de Entorno (Alternativa a hardcode)

Para máxima seguridad, usar variables de entorno en lugar de hardcodear:

```javascript
// En supabase-config.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STEAM_API_KEY = import.meta.env.VITE_STEAM_API_KEY
const STEAM_ACCOUNT_ID = import.meta.env.VITE_STEAM_ACCOUNT_ID
```

Luego crear `.env.local`:
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STEAM_API_KEY=XXXX...
VITE_STEAM_ACCOUNT_ID=12345...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_URL=https://...
```

---

### ☕ Ko-fi Webhook

Para activar las donaciones reales, usa el endpoint de Ko-fi:

- URL: `https://<tu-dominio>/api/kofi-webhook`
- Método: `POST`
- Contenido: JSON con `supporter_name`, `amount`, `message` o campos similares

El webhook escribe en `donations` y también en `activity_logs` para generar una traza real.

> Usa `SUPABASE_SERVICE_ROLE_KEY` en tu entorno de producción para asegurar que el endpoint pueda escribir en la base de datos.

---

### 📞 Soporte

Errores comunes y soluciones en la consola del navegador (F12 → Console)

**Happy Gaming! 🎮**
=======
# ShareControl
🎮 ShareControl — Realtime Steam shared-account operations platform ⚡ Manage reservations, monitor live Steam sessions, sync activity across devices, track community funds, and automate Discord alerts — all inside a futuristic cyberpunk SaaS dashboard.
>>>>>>> a815225d7f6b9f6a1a48769be96b78381930a306
