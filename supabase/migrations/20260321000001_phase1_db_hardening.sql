-- Nueva migración: 20260321000001_phase1_db_hardening.sql
-- Fase 1: Correcciones Silenciosas SBD (Zero Downtime)

-- =============================================
-- 1. ELEVACIÓN DE PRIVILEGIOS DEL TRIGGER
-- =============================================
-- Soluciona el error donde un usuario autenticado estándar 
-- no puede insertar leads por no tener permiso UPDATE en 'instituciones'.
-- SECURITY DEFINER asegura que se ejecute con permisos del creador de la función.
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
-- 2. OPTIMIZACIÓN RLS Y PROBLEMA N+1
-- =============================================
-- 2A. Índice Crítico para el Fallback
-- Previene un SECUENCIAL SCAN completo en la tabla 'usuarios' por cada fila evaluada en el RLS.
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- 2B. Refactorización de get_my_institucion() 
-- Ahora intenta primero leer el JWT (O(1)) antes de consultar la DB.
CREATE OR REPLACE FUNCTION get_my_institucion() 
RETURNS UUID AS $$
DECLARE
  jwt_inst_id UUID;
  db_inst_id UUID;
BEGIN
  -- 1. Intentar obtener desde el JWT (Ultra rápido, Sin acceso a disco)
  -- Formato esperado en app_metadata: { "institucion_id": "uuid" }
  jwt_inst_id := (auth.jwt() -> 'app_metadata' ->> 'institucion_id')::uuid;
  IF jwt_inst_id IS NOT NULL THEN
    RETURN jwt_inst_id;
  END IF;

  -- 2. Fallback a la tabla (Indexado)
  SELECT institucion_id INTO db_inst_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1;
  RETURN db_inst_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
