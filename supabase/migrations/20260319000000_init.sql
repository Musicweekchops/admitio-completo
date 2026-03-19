-- Initial Migration from schema.sql
-- =============================================
-- ADMITIO - Schema SQL para Supabase
-- Sistema de Gestión de Admisiones
-- =============================================

-- 1. INSTITUCIONES
CREATE TABLE instituciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  plan VARCHAR(20) DEFAULT 'prueba' CHECK (plan IN ('prueba', 'inicial', 'profesional', 'premium', 'enterprise')),
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'cancelado')),
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  email_contacto VARCHAR(255),
  telefono VARCHAR(50),
  tipo VARCHAR(50),
  pais VARCHAR(100),
  ciudad VARCHAR(100),
  region VARCHAR(100),
  sitio_web VARCHAR(255),
  logo_url TEXT,
  leads_count INTEGER DEFAULT 0,
  usuarios_count INTEGER DEFAULT 1,
  storage_usado_mb DECIMAL(10,2) DEFAULT 0,
  emails_enviados_mes INTEGER DEFAULT 0,
  api_key UUID UNIQUE DEFAULT gen_random_uuid(),
  api_key_last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USUARIOS
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  auth_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'encargado' CHECK (rol IN ('superowner', 'keymaster', 'encargado', 'asistente', 'rector')),
  activo BOOLEAN DEFAULT true,
  password_temporal BOOLEAN DEFAULT false,
  email_verificado BOOLEAN DEFAULT false,
  password_hash TEXT,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  ultimo_activo TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, institucion_id)
);

-- 3. CARRERAS
CREATE TABLE carreras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT 'bg-blue-500',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. LEADS
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(50),
  carrera_id UUID REFERENCES carreras(id),
  carrera_nombre VARCHAR(255),
  carreras_interes UUID[] DEFAULT '{}',
  medio VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'nueva' CHECK (estado IN ('nueva', 'contactado', 'seguimiento', 'examen', 'matriculado', 'descartado')),
  prioridad VARCHAR(10) DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  asignado_a UUID REFERENCES usuarios(id),
  creado_por UUID REFERENCES usuarios(id),
  notas TEXT,
  matriculado BOOLEAN DEFAULT false,
  descartado BOOLEAN DEFAULT false,
  motivo_descarte TEXT,
  tipo_alumno VARCHAR(50) DEFAULT 'nuevo',
  nuevo_interes UUID REFERENCES carreras(id),
  fecha_nuevo_interes TIMESTAMP WITH TIME ZONE,
  emails_enviados INTEGER DEFAULT 0,
  fecha_proximo_contacto TIMESTAMP WITH TIME ZONE,
  fecha_primer_contacto TIMESTAMP WITH TIME ZONE,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ACCIONES DE LEAD
CREATE TABLE acciones_lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FORMULARIOS
CREATE TABLE formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  campos JSONB DEFAULT '[]',
  carrera_default UUID REFERENCES carreras(id),
  activo BOOLEAN DEFAULT true,
  submissions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. BLOQUEOS
CREATE TABLE lead_locks (
  lead_id UUID PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  usuario_nombre VARCHAR(255),
  institucion_id UUID REFERENCES instituciones(id) ON DELETE CASCADE,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
