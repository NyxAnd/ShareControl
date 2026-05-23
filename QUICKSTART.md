## 🚀 QUICK START - 10 MINUTOS

### ✅ Paso 1: Supabase Setup (3 minutos)

**A. Crear cuenta**
```
1. Abre https://supabase.com
2. Sign Up con GitHub o Google
3. Crea un nuevo proyecto
```

**B. Ejecutar SQL**
```
1. En Supabase: SQL Editor (lado izquierdo)
2. New Query
3. Copia TODO el contenido de: supabase-schema.sql
4. Paste en editor
5. RUN (botón azul)
```

✅ Las 7 tablas están creadas

---

### ✅ Paso 2: Copiar Credenciales Supabase (1 minuto)

En Supabase Dashboard → Settings → API

Copia estas dos cosas:
```
Project URL: https://[XXXX].supabase.co
Anon public key: eyJ...
```

---

### ✅ Paso 3: Steam Setup (3 minutos)

**A. Obtener API Key**
```
1. Abre https://steamcommunity.com/dev/apikey
2. Acepta términos
3. Genera key (cópiala)
```

**B. Obtener SteamID64**
```
1. Abre tu perfil Steam
2. Mira la URL: /profiles/[NUMERO_AQUI]/
3. Ese número es tu SteamID64
```

---

### ✅ Paso 4: Configurar Variables (1 minuto)

Abre `supabase-config.js` (líneas 3-6):

```javascript
const SUPABASE_URL = 'https://abc123.supabase.co'  // ← Tu URL
const SUPABASE_ANON_KEY = 'eyJ...'                 // ← Tu Anon Key
const STEAM_API_KEY = 'XXXXX'                      // ← Tu Steam Key
const STEAM_ACCOUNT_ID = '123456789'               // ← Tu SteamID64
```

Guarda (Ctrl+S)

---

### ✅ Paso 5: Abrir el Dashboard (2 minutos)

```
1. Abre: sharecontrol-dashboard.html en navegador
   (Click derecho → Open with → Browser)
2. Debería funcionar automáticamente
3. Abre consola (F12) para ver logs
```

---

## 🎮 PRIMER USO

### Hacer una reserva
```
1. Click en "Reservar Slot"
2. Selecciona jugador: Carlos99
3. Selecciona día: Miércoles
4. Selecciona hora: 14:00 - 16:00
5. Click "Reservar Slot"
   ✅ Se guarda en Supabase automáticamente
```

### Ver cambios en tiempo real
```
1. Abre el dashboard en 2 navegadores (una ventana normal, una incógnito)
2. Haz una reserva en la ventana normal
3. La otra ventana actualiza automáticamente (sin refrescar)
```

### Monitorear Steam
```
1. La tarjeta "ACCOUNT OCCUPIED" se actualiza cada 30s
2. Muestra quién está jugando ahora
3. Muestra qué juego está corriendo
```

---

## 📊 VERIFICAR QUE FUNCIONA

### En la consola del navegador (F12)

Deberías ver logs como estos:
```
🚀 Iniciando ShareControl...
📡 Cargando datos de Supabase...
✅ Datos cargados: { reservations: [...], donations: [...] }
🎮 Iniciando sincronización de Steam...
✅ ShareControl iniciado
```

---

## 🐛 PROBLEMAS COMUNES

### Error: "supabase is not defined"
```
Solución:
1. Verifica que supabase-config.js está en la misma carpeta
2. Verifica que sharecontrol-dashboard.html tiene:
   <script type="module">
3. Recarga la página (Ctrl+F5)
```

### Error: "Steam API returned null"
```
Solución:
1. Verifica que STEAM_API_KEY es correcto
2. Verifica que STEAM_ACCOUNT_ID es un número válido
3. Espera 5 minutos (las APIs tienen límites)
4. Si persiste, ve a https://steamcommunity.com/dev/appsettings
   y verifica que tu IP no está bloqueada
```

### Error: "Cannot INSERT into reservations"
```
Solución:
1. Abre Supabase → SQL Editor
2. Ejecuta: SELECT * FROM reservations;
3. Si ves error, vuelve a ejecutar supabase-schema.sql
4. Verifica que SUPABASE_URL y SUPABASE_ANON_KEY son correctos
```

---

## 📱 COMPARTIR CON TU EQUIPO

### Opción 1: Archivo Local (Simple)
```
1. Copia la carpeta "WEb sTEAM" a tu equipo
2. Comparte con tu equipo (OneDrive, Google Drive, etc)
3. Cada uno abre sharecontrol-dashboard.html
4. ✅ Todos ven los mismos datos (desde Supabase)
```

### Opción 2: Link Online (Mejor)
Seguir pasos en DEPLOYMENT.md:
```
1. Deploy a Vercel (gratis, 5 minutos)
2. Envía link: https://sharecontrol-tu-equipo.vercel.app
3. Equipo abre el link (sin instalar nada)
4. ✅ Funciona en cualquier dispositivo
```

---

## 🎯 CHECKLIST

- [ ] Cuenta Supabase creada
- [ ] SQL ejecutado (7 tablas creadas)
- [ ] SUPABASE_URL y SUPABASE_ANON_KEY copiados
- [ ] Steam API Key obtenida
- [ ] Steam SteamID64 obtenido
- [ ] Variables configuradas en supabase-config.js
- [ ] Abierto sharecontrol-dashboard.html
- [ ] Logs aparecen en consola (F12)
- [ ] Primera reserva creada
- [ ] Vista en tiempo real funciona

---

## 📚 PRÓXIMOS PASOS

### Si todo funciona:
1. **Desplegar a Vercel** (ver DEPLOYMENT.md)
2. **Invitar a tu equipo**
3. **Agregar más jugadores** (editar array PLAYERS en supabase-config.js)
4. **Monitorear en tiempo real**

### Si quieres agregar funciones:
1. **Login real** (Supabase Auth)
2. **Notificaciones Discord**
3. **Aplicación móvil**
4. **Admin panel**

---

## 🔗 LINKS IMPORTANTES

- Supabase: https://supabase.com/dashboard
- Steam API: https://steamcommunity.com/dev/apikey
- Vercel (para desplegar): https://vercel.com
- Documentación: Lee README.md, ARCHITECTURE.md, DEPLOYMENT.md

---

## ⏱️ DURACIÓN ESTIMADA

| Tarea | Tiempo |
|-------|--------|
| Setup Supabase | 3 min |
| Steam API | 3 min |
| Configurar variables | 1 min |
| Prueba | 2 min |
| **TOTAL** | **~10 min** |

---

## 💬 AYUDA

Si algo no funciona:
1. Abre la consola (F12)
2. Copia el error
3. Busca en troubleshooting arriba 👆
4. Si persiste, lee backend-logic.js y supabase-config.js

---

**¡Estás listo! 🚀**

Tienes un dashboard profesional con:
- ✅ Base de datos tiempo real
- ✅ Integración Steam API
- ✅ Sistema de reservas
- ✅ Validaciones automáticas
- ✅ Listo para 100+ usuarios

**¡A jugar y organizarse!** 🎮
