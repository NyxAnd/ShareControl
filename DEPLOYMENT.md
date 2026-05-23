## 🚀 DEPLOYMENT - Guía de Despliegue

Cómo poner ShareControl en producción para que tu equipo pueda usarlo desde cualquier lugar.

---

## Opción 1: Vercel (RECOMENDADO - Gratis)

### Paso 1: Preparar repo
```bash
cd "WEb sTEAM"
git init
git add .
git commit -m "Initial commit: ShareControl Dashboard"
```

### Paso 2: Crear cuenta en Vercel
- Ir a https://vercel.com
- Sign up con GitHub/Google
- Import Project → Select tu repo

### Paso 3: Configurar variables de entorno
En Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL = https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
VITE_STEAM_API_KEY = XXXX...
VITE_STEAM_ACCOUNT_ID = 12345...
```

### Paso 4: Deploy
```
Vercel detecta automáticamente y deploya
Tu sitio estará en: https://sharecontrol-tu-nombre.vercel.app
```

---

## Opción 2: Netlify (Alternativa)

### Paso 1: Conectar repo
- Ir a https://app.netlify.com
- "New site from Git" → Select tu repo

### Paso 2: Configurar build
```
Build command: npm run build (si usas)
Publish directory: . (raíz del proyecto)
```

### Paso 3: Variables de entorno
Netlify Dashboard → Site settings → Build & Deploy → Environment:

```
REACT_APP_SUPABASE_URL=https://...
REACT_APP_SUPABASE_ANON_KEY=...
etc
```

### Paso 4: Deploy
```
Netlify deploya automáticamente
Tu sitio: https://sharecontrol-tu-equipo.netlify.app
```

---

## Opción 3: GitHub Pages (Gratis, Estático)

### Paso 1: Crear repo público
```bash
git remote add origin https://github.com/tu-usuario/sharecontrol.git
git push -u origin main
```

### Paso 2: Habilitar Pages
GitHub → Settings → Pages:
- Branch: main
- Folder: / (root)
- Save

### Paso 3: Tu sitio
```
https://tu-usuario.github.io/sharecontrol
```

⚠️ **Nota**: Las variables de entorno se expondrán públicamente. Para máxima seguridad, usar Vercel o Netlify.

---

## Opción 4: Docker (Producción Profesional)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar archivos
COPY . .

# Instalar dependencias (si existen)
RUN npm install --legacy-peer-deps

# Exponer puerto
EXPOSE 3000

# Servir con http-server
RUN npm install -g http-server
CMD ["http-server", "-p", "3000", "-c-1"]
```

### Build y run
```bash
docker build -t sharecontrol .
docker run -p 3000:3000 sharecontrol
```

### Enviar a Docker Hub
```bash
docker tag sharecontrol tu-usuario/sharecontrol:latest
docker push tu-usuario/sharecontrol:latest
```

---

## Opción 5: Supabase Hosting (Todo en uno)

Supabase puede servir tu frontend directamente:

### Paso 1: Crear proyecto Supabase
- Ir a https://supabase.com/dashboard
- Crear nuevo proyecto

### Paso 2: Subir archivos
```bash
supabase functions deploy --project-id tu-proyecto
```

### Paso 3: Tu sitio
```
https://tu-proyecto.supabase.co/static/index.html
```

---

## 🔒 Configuración de Producción

### 1. Variables de Entorno Seguras

**NO HACER:**
```javascript
const STEAM_API_KEY = 'XXXX...' // ❌ Expuesto en cliente
```

**SÍ HACER:**
```javascript
// En cliente: llamar un endpoint backend
const response = await fetch('/api/steam-info')

// En servidor (Node.js/Python/Go):
app.get('/api/steam-info', (req, res) => {
  const API_KEY = process.env.STEAM_API_KEY // ✅ Secreto en servidor
  // llamar Steam API con la key
})
```

### 2. CORS Configuration

En `supabase-config.js`:
```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
```

### 3. Rate Limiting

Agregar límite de requests:
```javascript
const RATE_LIMIT = 10 // requests por minuto
let requestCount = 0
let resetTime = Date.now() + 60000

export async function rateLimitedRequest(fn) {
  if (Date.now() > resetTime) {
    requestCount = 0
    resetTime = Date.now() + 60000
  }
  
  if (requestCount >= RATE_LIMIT) {
    throw new Error('Rate limit exceeded')
  }
  
  requestCount++
  return fn()
}
```

### 4. SSL/HTTPS

- Vercel: ✅ Automático
- Netlify: ✅ Automático
- GitHub Pages: ✅ Automático
- Docker: Usar nginx con SSL

---

## 📊 Monitoreo en Producción

### 1. Supabase Analytics
```sql
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as total_reservas,
  COUNT(DISTINCT player_id) as jugadores_activos
FROM reservations
WHERE status = 'confirmed'
GROUP BY DATE(created_at)
ORDER BY fecha DESC
```

### 2. Steam API Errors
```javascript
export async function monitorSteamAPI() {
  const errors = []
  
  const user = await getSteamUserInfo().catch(e => {
    errors.push({ timestamp: new Date(), error: e.message })
    return null
  })
  
  if (errors.length > 10) {
    // Alertar a admin
    console.error('🚨 Steam API crítico')
  }
}
```

### 3. Uptime Monitoring
- Usar https://uptimerobot.com
- Monitorear tu_dominio.com cada 5 minutos
- Recibir alertas si está caído

---

## 📈 Escalabilidad

### Problemas potenciales

**Muchos usuarios (>100 simultáneos):**
1. Aumentar límites de Supabase (Plan Pro)
2. Implementar caching:
```javascript
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export async function getCachedReservations() {
  if (cache.has('reservations')) {
    return cache.get('reservations')
  }
  
  const data = await getReservations()
  cache.set('reservations', data)
  
  setTimeout(() => cache.delete('reservations'), CACHE_TTL)
  return data
}
```

3. Implementar CDN para archivos estáticos

**Muchas queries a Steam API:**
1. Implementar queue system
2. Usar caching con TTL
3. Limitar a 1 query cada 30s por jugador

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Automático)
Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

Cada push a `main` → Deploy automático ✅

---

## 📱 Compartir con tu equipo

### URL Pública
```
Enviar a tu equipo: https://sharecontrol-tu-equipo.vercel.app
```

### Instrucciones de Acceso
1. Abrir el link en navegador
2. Crear una reserva usando el dropdown de jugadores
3. Ver calendario actualizado en tiempo real
4. Donaciones automáticas simuladas

### Credenciales Compartidas
Enviar en Discord privado:
- Usuario de Supabase (si se requiere login)
- Contraseña temporal
- Link a reset de password

---

## 🛡️ Checklist de Seguridad

- [ ] Variables de entorno NO hardcodeadas
- [ ] HTTPS en la URL
- [ ] RLS policies activos en Supabase
- [ ] API keys de terceros en backend, no frontend
- [ ] Rate limiting implementado
- [ ] Logs monitoreados
- [ ] Backups automáticos de BD
- [ ] Error handling completo
- [ ] CORS configurado correctamente
- [ ] Sesiones de usuario seguras

---

## 🚨 Backup y Disaster Recovery

### Backup automático Supabase
```bash
# Exportar BD
pg_dump postgresql://user:pass@host/db > backup.sql

# Restaurar
psql postgresql://user:pass@host/db < backup.sql
```

### Programado diariamente
```javascript
async function scheduleBackup() {
  setInterval(async () => {
    const stats = await exportStats()
    // Enviar a Google Drive / Dropbox
    await uploadToBackup(stats)
  }, 24 * 60 * 60 * 1000) // Cada 24h
}
```

---

## 📞 Troubleshooting Deployment

**Error: "Cannot find module"**
```bash
npm install  # Instalar dependencias
```

**Error: "CORS blocked"**
```javascript
// Supabase allowlist
// En Supabase: API settings > Add domain
```

**Error: "Steam API 403"**
```javascript
// Verificar IP whitelisting en Steam
// https://steamcommunity.com/dev/appsettings/YOUR_APP_ID
```

---

## 🎯 Próximos Pasos

1. **Dominio personalizado**
   - Comprar en Namecheap/Google Domains
   - Conectar a Vercel/Netlify

2. **Analytics**
   - Google Analytics
   - Sentry para error tracking

3. **Notificaciones**
   - SendGrid para email
   - Twilio para SMS

4. **Payments**
   - Stripe para Ko-fi integration

---

**Status**: ✅ Listo para producción  
**Estimated Setup Time**: 15-30 minutos  
**Cost**: Gratis (Vercel + Supabase free tier)

Good luck! 🚀
