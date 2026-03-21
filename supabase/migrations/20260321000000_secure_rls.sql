-- Nueva migración: 20260321000000_secure_rls.sql
-- Endurecimiento de Seguridad (Hardening) de RLS para Multitenancy isolation

-- 1. FUNCIÓN AUXILIAR DE SEGURIDAD
-- Obtiene la institucion_id del usuario autenticado actual basándose en su auth.uid()
CREATE OR REPLACE FUNCTION get_my_institucion() 
RETURNS UUID AS $$
  SELECT institucion_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. ASEGURAR QUE RLS ESTÉ HABILITADO EN TODAS LAS TABLAS
ALTER TABLE instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_locks ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR POLÍTICAS PERMISIVAS DE DESARROLLO (dev_all_*)
DROP POLICY IF EXISTS "dev_all_inst" ON instituciones;
DROP POLICY IF EXISTS "dev_all_u" ON usuarios;
DROP POLICY IF EXISTS "dev_all_l" ON leads;
DROP POLICY IF EXISTS "dev_all_a" ON acciones_lead;
DROP POLICY IF EXISTS "dev_all_c" ON carreras;
DROP POLICY IF EXISTS "dev_all_f" ON formularios;
DROP POLICY IF EXISTS "dev_all_p" ON planes_config;
DROP POLICY IF EXISTS "dev_all_locks" ON lead_locks;

-- 4. CREAR NUEVAS POLÍTICAS DE AISLAMIENTO (ISOLATION) POR INSTITUCIÓN

-- Instituciones: Solo lectura de la propia institución
CREATE POLICY "inst_read_self" ON instituciones
  FOR SELECT TO authenticated
  USING (id = get_my_institucion());

-- Usuarios: Solo acceso a usuarios de la misma institución
CREATE POLICY "user_isolation" ON usuarios
  FOR ALL TO authenticated
  USING (institucion_id = get_my_institucion());

-- Leads: Aislamiento total por institución
CREATE POLICY "leads_isolation" ON leads
  FOR ALL TO authenticated
  USING (institucion_id = get_my_institucion());

-- Acciones: Aislamiento total por institución
CREATE POLICY "acciones_isolation" ON acciones_lead
  FOR ALL TO authenticated
  USING (lead_id IN (SELECT id FROM leads WHERE institucion_id = get_my_institucion()));

-- Carreras: Aislamiento total por institución
CREATE POLICY "carreras_isolation" ON carreras
  FOR ALL TO authenticated
  USING (institucion_id = get_my_institucion());

-- Formularios: Aislamiento total por institución
CREATE POLICY "formularios_isolation" ON formularios
  FOR ALL TO authenticated
  USING (institucion_id = get_my_institucion());

-- Configuración de Planes: Lectura pública (lectura)
CREATE POLICY "planes_read" ON planes_config
  FOR SELECT TO authenticated
  USING (true);

-- Bloqueos: Aislamiento total por institución
CREATE POLICY "locks_isolation" ON lead_locks
  FOR ALL TO authenticated
  USING (institucion_id = get_my_institucion());

-- 5. ACCESO PÚBLICO PARA FORMULARIOS (ANÓNIMO)
-- Los formularios deben poder cargarse y enviar leads de forma anónima
CREATE POLICY "public_form_read" ON formularios FOR SELECT TO anon USING (activo = true);
CREATE POLICY "public_lead_insert" ON leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public_actions_insert" ON acciones_lead FOR INSERT TO anon WITH CHECK (true);
