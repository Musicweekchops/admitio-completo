-- ADMITIO PRODUCTION CONSOLIDATED HARDENING (2026-03-21)
-- Este script consolida todas las mejoras de seguridad, rendimiento y estabilidad
-- Diseñado para ejecución en producción con Zero Downtime.

-- =============================================
-- 1. ASEGURAR ÍNDICES DE RENDIMIENTO (O(1))
-- =============================================
-- Previene escaneos completos de tabla durante la validación de RLS
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_leads_institucion_id ON leads(institucion_id);

-- =============================================
-- 2. FUNCIÓN DE IDENTIDAD OPTIMIZADA (JWT + DB)
-- =============================================
-- Obtiene la institucion_id de forma ultra rápida (JWT) o segura (DB)
CREATE OR REPLACE FUNCTION get_my_institucion() 
RETURNS UUID AS $$
DECLARE
  jwt_inst_id UUID;
  db_inst_id UUID;
BEGIN
  -- 1. Intentar obtener desde el JWT (Ultra rápido, Sin acceso a disco)
  jwt_inst_id := (auth.jwt() -> 'app_metadata' ->> 'institucion_id')::uuid;
  IF jwt_inst_id IS NOT NULL THEN
    RETURN jwt_inst_id;
  END IF;

  -- 2. Fallback a la tabla (Indexado, Seguro)
  SELECT institucion_id INTO db_inst_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1;
  RETURN db_inst_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- 3. ELEVACIÓN DE PRIVILEGIOS DEL TRIGGER (MUTEX FIX)
-- =============================================
-- SECURITY DEFINER soluciona el error de permisos al insertar leads 
-- desde usuarios con roles restrictivos.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. ACTIVACIÓN DE RLS Y LIMPIEZA DE POLÍTICAS
-- =============================================
ALTER TABLE instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_locks ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas dev_* antiguas
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "dev_all_inst" ON instituciones;
    DROP POLICY IF EXISTS "dev_all_u" ON usuarios;
    DROP POLICY IF EXISTS "dev_all_l" ON leads;
    DROP POLICY IF EXISTS "dev_all_a" ON acciones_lead;
    DROP POLICY IF EXISTS "dev_all_c" ON carreras;
    DROP POLICY IF EXISTS "dev_all_f" ON formularios;
    DROP POLICY IF EXISTS "dev_all_locks" ON lead_locks;
END $$;

-- =============================================
-- 5. POLÍTICAS DE AISLAMIENTO (PRODUCTION ISOLATION)
-- =============================================
-- Usuarios: Aislamiento total
DROP POLICY IF EXISTS "user_isolation" ON usuarios;
CREATE POLICY "user_isolation" ON usuarios FOR ALL TO authenticated USING (institucion_id = get_my_institucion());

-- Leads: Aislamiento total
DROP POLICY IF EXISTS "leads_isolation" ON leads;
CREATE POLICY "leads_isolation" ON leads FOR ALL TO authenticated USING (institucion_id = get_my_institucion());

-- Acciones: Aislamiento total (vía lead_id)
DROP POLICY IF EXISTS "acciones_isolation" ON acciones_lead;
CREATE POLICY "acciones_isolation" ON acciones_lead FOR ALL TO authenticated 
USING (lead_id IN (SELECT id FROM leads WHERE institucion_id = get_my_institucion()));

-- Carreras/Formularios: Aislamiento total
DROP POLICY IF EXISTS "carreras_isolation" ON carreras;
CREATE POLICY "carreras_isolation" ON carreras FOR ALL TO authenticated USING (institucion_id = get_my_institucion());

DROP POLICY IF EXISTS "formularios_isolation" ON formularios;
CREATE POLICY "formularios_isolation" ON formularios FOR ALL TO authenticated USING (institucion_id = get_my_institucion());

-- =============================================
-- 6. ACCESO PÚBLICO (REQUERIDO PARA CAPTACIÓN)
-- =============================================
DROP POLICY IF EXISTS "public_lead_insert" ON leads;
CREATE POLICY "public_lead_insert" ON leads FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "public_actions_insert" ON acciones_lead;
CREATE POLICY "public_actions_insert" ON acciones_lead FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "public_form_read" ON formularios;
CREATE POLICY "public_form_read" ON formularios FOR SELECT TO anon USING (activo = true);
