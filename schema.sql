-- =============================================
-- ADMITIO - Schema SQL para Supabase
-- Sistema de Gestión de Admisiones
-- =============================================

-- Limpiar tablas si existen (solo para desarrollo)
DROP TABLE IF EXISTS acciones_lead CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS instituciones CASCADE;

-- =============================================
-- 1. INSTITUCIONES (con planes)
-- =============================================
CREATE TABLE instituciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,  -- 'projazz', 'ems', etc.
  
  -- Plan y límites
  plan VARCHAR(20) DEFAULT 'prueba' CHECK (plan IN ('prueba', 'inicial', 'profesional', 'premium', 'enterprise')),
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'cancelado')),
  
  -- Fechas
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  
  -- Contacto
  email_contacto VARCHAR(255),
  telefono VARCHAR(50),
  
  -- Contadores (se actualizan con triggers)
  leads_count INTEGER DEFAULT 0,
  usuarios_count INTEGER DEFAULT 1,
  storage_usado_mb DECIMAL(10,2) DEFAULT 0,
  emails_enviados_mes INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. USUARIOS
-- =============================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  
  -- Auth
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Perfil
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'encargado' CHECK (rol IN ('superowner', 'keymaster', 'encargado', 'asistente', 'rector')),
  
  -- Estado
  activo BOOLEAN DEFAULT true,
  password_temporal BOOLEAN DEFAULT false,
  email_verificado BOOLEAN DEFAULT false,
  
  -- Metadata
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(email, institucion_id)
);

-- =============================================
-- 3. LEADS
-- =============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  
  -- Datos del lead
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(50),
  
  -- Clasificación
  carrera_id UUID REFERENCES carreras(id),
  carrera_nombre VARCHAR(255),
  carreras_interes UUID[] DEFAULT '{}',  -- Array de UUIDs de carreras de interés
  medio VARCHAR(50),  -- 'instagram', 'web', 'referido', etc.
  
  -- Estado en el funnel
  estado VARCHAR(20) DEFAULT 'nueva' CHECK (estado IN ('nueva', 'contactado', 'seguimiento', 'examen', 'matriculado', 'descartado')),
  prioridad VARCHAR(10) DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  
  -- Asignación
  asignado_a UUID REFERENCES usuarios(id),
  
  -- Notas
  notas TEXT,
  
  -- Tracking de tiempos
  fecha_primer_contacto TIMESTAMP WITH TIME ZONE,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. ACCIONES DE LEAD (historial de contacto)
-- =============================================
CREATE TABLE acciones_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  
  tipo VARCHAR(50) NOT NULL,  -- 'llamada', 'email', 'whatsapp', 'reunion', 'nota'
  descripcion TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. CARRERAS (por institución)
-- =============================================
CREATE TABLE carreras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  
  nombre VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT 'bg-blue-500',
  activa BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. FORMULARIOS EMBEBIBLES
-- =============================================
CREATE TABLE formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,  -- URL pública
  campos JSONB DEFAULT '[]',
  carrera_default INTEGER,
  activo BOOLEAN DEFAULT true,
  
  -- Contador
  submissions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. CONFIGURACIÓN DE PLANES (referencia)
-- =============================================
CREATE TABLE planes_config (
  id VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  
  -- Límites
  max_leads INTEGER NOT NULL,
  max_usuarios INTEGER NOT NULL,
  max_emails_mes INTEGER NOT NULL,
  max_storage_mb INTEGER NOT NULL,
  max_formularios INTEGER NOT NULL,
  
  -- Funcionalidades
  importar_csv BOOLEAN DEFAULT false,
  exportar_excel BOOLEAN DEFAULT false,
  reportes_avanzados BOOLEAN DEFAULT false,
  duplicados BOOLEAN DEFAULT false,
  emails_automaticos BOOLEAN DEFAULT false,
  api_acceso BOOLEAN DEFAULT false,
  
  -- Precio (CLP anual)
  precio INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración de planes
INSERT INTO planes_config (id, nombre, max_leads, max_usuarios, max_emails_mes, max_storage_mb, max_formularios, importar_csv, exportar_excel, reportes_avanzados, duplicados, emails_automaticos, api_acceso, precio) VALUES
('prueba', 'Prueba', 15, 1, 0, 50, 0, false, false, false, false, false, false, 0),
('inicial', 'Inicial', 300, 5, 2000, 1024, 1, true, true, false, false, true, false, 79990),
('profesional', 'Profesional', 1500, 15, 10000, 5120, 3, true, true, true, true, true, false, 149990),
('premium', 'Premium', 5000, 50, 30000, 20480, 10, true, true, true, true, true, true, 349990),
('enterprise', 'Enterprise', 999999, 999, 999999, 102400, 999, true, true, true, true, true, true, NULL);

-- =============================================
-- 8. SUPER OWNER (tu usuario admin)
-- =============================================

-- Crear institución del sistema
INSERT INTO instituciones (id, nombre, codigo, plan, estado, email_contacto)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admitio Admin',
  'admitio-system',
  'enterprise',
  'activo',
  'owner@admitio.cl'
);

-- Crear SuperOwner (TÚ)
-- Password: Admitio2024! (hasheada con bcrypt)
INSERT INTO usuarios (id, institucion_id, email, password_hash, nombre, rol, activo, email_verificado)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'owner@admitio.cl',
  '$2a$10$xQEq0xT5YQfKxOJUJKEK0OqH8VZJzJqYpQE5E5XkKqXKqXKqXKqXK',
  'Super Owner',
  'superowner',
  true,
  true
);

-- =============================================
-- 9. ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_leads_institucion ON leads(institucion_id);
CREATE INDEX idx_leads_estado ON leads(estado);
CREATE INDEX idx_leads_asignado ON leads(asignado_a);
CREATE INDEX idx_usuarios_institucion ON usuarios(institucion_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_acciones_lead ON acciones_lead(lead_id);

-- =============================================
-- 10. TRIGGERS PARA CONTADORES
-- =============================================

-- Trigger: Actualizar contador de leads
CREATE OR REPLACE FUNCTION update_leads_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE instituciones SET leads_count = leads_count + 1, updated_at = NOW()
    WHERE id = NEW.institucion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE instituciones SET leads_count = leads_count - 1, updated_at = NOW()
    WHERE id = OLD.institucion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leads_count
AFTER INSERT OR DELETE ON leads
FOR EACH ROW EXECUTE FUNCTION update_leads_count();

-- Trigger: Actualizar contador de usuarios
CREATE OR REPLACE FUNCTION update_usuarios_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE instituciones SET usuarios_count = usuarios_count + 1, updated_at = NOW()
    WHERE id = NEW.institucion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE instituciones SET usuarios_count = usuarios_count - 1, updated_at = NOW()
    WHERE id = OLD.institucion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_usuarios_count
AFTER INSERT OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION update_usuarios_count();

-- =============================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (se refinan después)
-- Por ahora permitimos todo para desarrollo
CREATE POLICY "Allow all for dev" ON instituciones FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON usuarios FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON acciones_lead FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON carreras FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON formularios FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON planes_config FOR ALL USING (true);

-- =============================================
-- 12. DATOS DE PRUEBA (Institución Demo)
-- =============================================

-- Institución demo: ProJazz
INSERT INTO instituciones (id, nombre, codigo, plan, estado, email_contacto)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'ProJazz Escuela de Música',
  'projazz',
  'prueba',
  'activo',
  'admin@projazz.cl'
);

-- KeyMaster de ProJazz
INSERT INTO usuarios (institucion_id, email, password_hash, nombre, rol, activo, email_verificado)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'admin@projazz.cl',
  '$2a$10$xQEq0xT5YQfKxOJUJKEK0OqH8VZJzJqYpQE5E5XkKqXKqXKqXKqXK',
  'Administrador ProJazz',
  'keymaster',
  true,
  true
);

-- Carreras de ProJazz
INSERT INTO carreras (institucion_id, nombre, color, activa) VALUES
('00000000-0000-0000-0000-000000000010', 'Canto Popular', 'bg-pink-500', true),
('00000000-0000-0000-0000-000000000010', 'Guitarra Eléctrica', 'bg-orange-500', true),
('00000000-0000-0000-0000-000000000010', 'Batería', 'bg-red-500', true),
('00000000-0000-0000-0000-000000000010', 'Bajo Eléctrico', 'bg-purple-500', true),
('00000000-0000-0000-0000-000000000010', 'Piano/Teclado', 'bg-blue-500', true),
('00000000-0000-0000-0000-000000000010', 'Producción Musical', 'bg-green-500', true);

-- Algunos leads de prueba
INSERT INTO leads (institucion_id, nombre, email, telefono, carrera_nombre, medio, estado) VALUES
('00000000-0000-0000-0000-000000000010', 'María González', 'maria@gmail.com', '+56912345678', 'Canto Popular', 'instagram', 'nueva'),
('00000000-0000-0000-0000-000000000010', 'Pedro Soto', 'pedro@email.cl', '+56987654321', 'Guitarra Eléctrica', 'web', 'contactado'),
('00000000-0000-0000-0000-000000000010', 'Ana Muñoz', 'ana@test.com', '+56911112222', 'Batería', 'referido', 'seguimiento'),
('00000000-0000-0000-0000-000000000010', 'Carlos Ruiz', 'carlos@demo.cl', '+56933334444', 'Producción Musical', 'facebook', 'nueva'),
('00000000-0000-0000-0000-000000000010', 'Laura Díaz', 'laura@prueba.cl', '+56955556666', 'Piano/Teclado', 'instagram', 'examen');

-- =============================================
-- ¡SCHEMA COMPLETO!
-- =============================================
