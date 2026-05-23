-- ═══ TABLES SETUP ═══

-- Tabla de Jugadores
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_id TEXT UNIQUE,
  username TEXT NOT NULL,
  country_flag TEXT,
  timezone TEXT,
  color_hex TEXT,
  avatar_url TEXT,
  bio TEXT,
  favorite_game TEXT,
  hours_played DECIMAL(8,2) DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tabla de Reservas
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT REFERENCES players(username),
  day INTEGER CHECK (day >= 0 AND day <= 6), -- 0=Lunes, 6=Domingo
  start_hour DECIMAL(4,2),
  end_hour DECIMAL(4,2),
  status TEXT CHECK (status IN ('confirmed', 'queued', 'cancelled')),
  game TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tabla de Steam Status (actividad en tiempo real)
CREATE TABLE steam_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_id TEXT UNIQUE NOT NULL,
  player_name TEXT,
  game_id TEXT,
  state INTEGER, -- 0=offline, 1=online, 2=busy, 3=away, 4=snooze, 5=looking to trade, 6=looking to play
  last_logoff TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);

-- Tabla de Donaciones
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT REFERENCES players(username),
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabla de Fondos Comunitarios
CREATE TABLE community_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  games_fund DECIMAL(10,2) DEFAULT 0,
  server_fund DECIMAL(10,2) DEFAULT 0,
  games_goal DECIMAL(10,2) DEFAULT 50,
  server_goal DECIMAL(10,2) DEFAULT 120,
  last_updated TIMESTAMP DEFAULT now()
);

-- Tabla de Actividad/Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabla de Estadísticas
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT REFERENCES players(username) UNIQUE,
  total_hours DECIMAL(8,2) DEFAULT 0,
  infraction_count INTEGER DEFAULT 0,
  rank INTEGER,
  last_updated TIMESTAMP DEFAULT now()
);

-- ═══ INDICES ═══
CREATE INDEX idx_reservations_player ON reservations(player_id);
CREATE INDEX idx_reservations_day ON reservations(day);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_donations_player ON donations(player_id);
CREATE INDEX idx_activity_player ON activity_logs(player_id);
CREATE INDEX idx_steam_status_state ON steam_status(state);

-- ═══ INITIAL DATA ═══
INSERT INTO players (steam_id, username, country_flag, timezone, color_hex) VALUES
('76561199123456789', 'Carlos99', '🇦🇷', 'UTC-3', '#ff4455'),
('76561199123456790', 'Denyer', '🇪🇸', 'UTC+2', '#00e5ff'),
('76561199123456791', 'Juan', '🇲🇽', 'UTC-6', '#ffc400'),
('76561199123456792', 'Jasnis', '🇱🇹', 'UTC+3', '#00e676'),
('76561199123456793', 'Marcos', '🇧🇷', 'UTC-3', '#ab47bc');

INSERT INTO community_funds (games_fund, server_fund) VALUES (34.50, 88.00);

-- ═══ RLS POLICIES ═══
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer reservaciones
CREATE POLICY "reservations_read" ON reservations FOR SELECT USING (true);

-- Solo el que crea puede modificar
CREATE POLICY "reservations_write" ON reservations FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "reservations_update" ON reservations FOR UPDATE USING (auth.uid()::text = created_by);

-- Fondos públicos lectura
CREATE POLICY "funds_read" ON community_funds FOR SELECT USING (true);

-- Logs públicos
CREATE POLICY "logs_read" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON activity_logs FOR INSERT WITH CHECK (true);
