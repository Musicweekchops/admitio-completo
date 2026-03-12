-- =============================================
-- ADMITIO - Schema SQL para Supabase
-- Sistema de Gestión de Admisiones
-- =============================================

-- Limpiar tablas si existen (solo para desarrollo)
DROP TABLE IF EXISTS formularios CASCADE;
DROP TABLE IF EXISTS acciones_lead CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS carreras CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS instituciones CASCADE;
DROP TABLE IF EXISTS planes_config CASCADE;

-- =============================================
-- 1. INSTITUCIONES (con planes)
-- =============================================
CREATE TABLE instituciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,  -- 'slug' para URL
  
  -- Plan y límites
  plan VARCHAR(20) DEFAULT 'prueba' CHECK (plan IN ('prueba', 'inicial', 'profesional', 'premium', 'enterprise')),
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'cancelado')),
  
  -- Fechas
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  
  -- Contacto y Perfil (Requerido por el Frontend)
  email_contacto VARCHAR(255),
  telefono VARCHAR(50),
  tipo VARCHAR(50),
  pais VARCHAR(100),
  ciudad VARCHAR(100),
  region VARCHAR(100),
  sitio_web VARCHAR(255),
  logo_url TEXT,
  
  -- Contadores
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
  
  -- Auth (Link con Supabase Auth)
  auth_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL,
  
  -- Perfil
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'encargado' CHECK (rol IN ('superowner', 'keymaster', 'encargado', 'asistente', 'rector')),
  
  -- Estado
  activo BOOLEAN DEFAULT true,
  password_temporal BOOLEAN DEFAULT false,
  email_verificado BOOLEAN DEFAULT false,
  password_hash TEXT, -- Para compatibilidad con migración
  
  -- Metadata
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  ultimo_activo TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(email, institucion_id)
);

-- =============================================
-- 3. CARRERAS (por institución)
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
-- 4. LEADS
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
  carreras_interes UUID[] DEFAULT '{}',
  medio VARCHAR(50),  -- 'instagram', 'web', 'referido', etc.
  
  -- Estado en el funnel
  estado VARCHAR(20) DEFAULT 'nueva' CHECK (estado IN ('nueva', 'contactado', 'seguimiento', 'examen', 'matriculado', 'descartado')),
  prioridad VARCHAR(10) DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  
  -- Asignación
  asignado_a UUID REFERENCES usuarios(id),
  creado_por UUID REFERENCES usuarios(id),
  
  -- Notas
  notas TEXT,
  
  -- Tracking y Estados adicionales
  matriculado BOOLEAN DEFAULT false,
  descartado BOOLEAN DEFAULT false,
  motivo_descarte TEXT,
  tipo_alumno VARCHAR(50) DEFAULT 'nuevo',
  nuevo_interes UUID REFERENCES carreras(id),
  fecha_nuevo_interes TIMESTAMP WITH TIME ZONE,
  emails_enviados INTEGER DEFAULT 0,
  fecha_proximo_contacto TIMESTAMP WITH TIME ZONE,
  
  -- Tracking de tiempos
  fecha_primer_contacto TIMESTAMP WITH TIME ZONE,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. ACCIONES DE LEAD
-- =============================================
CREATE TABLE acciones_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. FORMULARIOS EMBEBIBLES
-- =============================================
CREATE TABLE formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  campos JSONB DEFAULT '[]',
  carrera_default UUID REFERENCES carreras(id), -- Corregido a UUID
  activo BOOLEAN DEFAULT true,
  
  -- Contador
  submissions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. CONFIGURACIÓN DE PLANES
-- =============================================
CREATE TABLE planes_config (
  id VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  
  max_leads INTEGER NOT NULL,
  max_usuarios INTEGER NOT NULL,
  max_emails_mes INTEGER NOT NULL,
  max_storage_mb INTEGER NOT NULL,
  max_formularios INTEGER NOT NULL,
  
  importar_csv BOOLEAN DEFAULT false,
  exportar_excel BOOLEAN DEFAULT false,
  reportes_avanzados BOOLEAN DEFAULT false,
  duplicados BOOLEAN DEFAULT false,
  emails_automaticos BOOLEAN DEFAULT false,
  api_acceso BOOLEAN DEFAULT false,
  
  precio INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO planes_config (id, nombre, max_leads, max_usuarios, max_emails_mes, max_storage_mb, max_formularios, importar_csv, exportar_excel, reportes_avanzados, duplicados, emails_automaticos, api_acceso, precio) VALUES
('prueba', 'Prueba', 15, 1, 0, 50, 0, false, false, false, false, false, false, 0),
('inicial', 'Inicial', 300, 5, 2000, 1024, 1, true, true, false, false, true, false, 79990),
('profesional', 'Profesional', 1500, 15, 10000, 5120, 3, true, true, true, true, true, false, 149990),
('premium', 'Premium', 5000, 50, 30000, 20480, 10, true, true, true, true, true, true, 349990),
('enterprise', 'Enterprise', 999999, 999, 999999, 102400, 999, true, true, true, true, true, true, NULL);

-- =============================================
-- 8. ÍNDICES
-- =============================================
CREATE INDEX idx_leads_institucion ON leads(institucion_id);
CREATE INDEX idx_usuarios_institucion ON usuarios(institucion_id);
CREATE INDEX idx_acciones_lead ON acciones_lead(lead_id);

-- =============================================
-- 9. TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'leads' THEN
    IF TG_OP = 'INSERT' THEN UPDATE instituciones SET leads_count = leads_count + 1 WHERE id = NEW.institucion_id;
    ELSIF TG_OP = 'DELETE' THEN UPDATE instituciones SET leads_count = leads_count - 1 WHERE id = OLD.institucion_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'usuarios' THEN
    IF TG_OP = 'INSERT' THEN UPDATE instituciones SET usuarios_count = usuarios_count + 1 WHERE id = NEW.institucion_id;
    ELSIF TG_OP = 'DELETE' THEN UPDATE instituciones SET usuarios_count = usuarios_count - 1 WHERE id = OLD.institucion_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_leads_count AFTER INSERT OR DELETE ON leads FOR EACH ROW EXECUTE FUNCTION update_counter();
CREATE TRIGGER tr_usuarios_count AFTER INSERT OR DELETE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_counter();

-- =============================================
-- 10. RLS
-- =============================================
ALTER TABLE instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_inst" ON instituciones FOR ALL USING (true);
CREATE POLICY "dev_all_u" ON usuarios FOR ALL USING (true);
CREATE POLICY "dev_all_l" ON leads FOR ALL USING (true);
CREATE POLICY "dev_all_a" ON acciones_lead FOR ALL USING (true);
CREATE POLICY "dev_all_c" ON carreras FOR ALL USING (true);
CREATE POLICY "dev_all_f" ON formularios FOR ALL USING (true);
CREATE POLICY "dev_all_p" ON planes_config FOR ALL USING (true);

-- =============================================
-- 11. USUARIO ADMIN (ARNALDO)
-- =============================================
INSERT INTO instituciones (id, nombre, codigo, plan, estado, email_contacto)
VALUES ('00000000-0000-0000-0000-000000000001', 'Admitio Admin', 'admitio-system', 'enterprise', 'activo', 'arnaldoallendeb@gmail.com');

INSERT INTO usuarios (id, institucion_id, email, auth_id, nombre, rol, activo, email_verificado)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'arnaldoallendeb@gmail.com', NULL, 'Arnaldo Allende', 'keymaster', true, true);

-- =============================================
-- 12. DEMO PROJAZZ
-- =============================================
INSERT INTO instituciones (id, nombre, codigo, plan, estado)
VALUES ('00000000-0000-0000-0000-000000000010', 'ProJazz Escuela', 'projazz', 'prueba', 'activo');

INSERT INTO usuarios (institucion_id, email, auth_id, nombre, rol, activo)
VALUES ('00000000-0000-0000-0000-000000000010', 'admin@projazz.cl', '00000000-0000-0000-0000-000000000011', 'Admin ProJazz', 'keymaster', true);

INSERT INTO carreras (institucion_id, nombre, color) VALUES
('00000000-0000-0000-0000-000000000010', 'Canto Popular', 'bg-pink-500'),
('00000000-0000-0000-0000-000000000010', 'Producción Musical', 'bg-green-500');

-- =============================================
-- 13. BLOQUEOS DE LEADS (Prevención de edición simultánea)
-- =============================================
CREATE TABLE lead_locks (
  lead_id UUID PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  usuario_nombre VARCHAR(255),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE lead_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all_locks" ON lead_locks FOR ALL USING (true);
