-- =============================================
-- ADMITIO - EMERGENCY RECOVERY SCRIPT 🩹🛡️
-- Ejecutar en el SQL Editor de Supabase si el Dashboard no carga
-- =============================================

-- 1. FIX DE RECURSIVIDAD EN RLS (Usuarios)
-- Permite que el usuario lea su propio perfil sin disparar la función recursiva
DROP POLICY IF EXISTS "user_isolation" ON usuarios;
CREATE POLICY "user_self_read" ON usuarios FOR SELECT TO authenticated USING (auth_id = auth.uid());
CREATE POLICY "user_tenant_isolation" ON usuarios FOR ALL TO authenticated USING (institucion_id = get_my_institucion());

-- 2. FIX DE ACCESO A INSTITUCIONES
-- Permite que el usuario lea los datos básicos de su propia institución
DROP POLICY IF EXISTS "inst_isolation" ON instituciones;
CREATE POLICY "inst_read_self" ON instituciones FOR SELECT TO authenticated USING (id = get_my_institucion());

-- 3. VINCULACIÓN MAESTRA (Asegura que tu usuario administrativo tenga acceso)
-- NOTA: Cambia el email si usas otro para administrar
DO $$
DECLARE
  v_inst_id UUID := '00000000-0000-0000-0000-000000000001';
  v_auth_id UUID;
BEGIN
  -- A. Asegurar que existe la Institución Maestra si se borró
  INSERT INTO instituciones (id, nombre, codigo, plan, estado)
  VALUES (v_inst_id, 'Admitio Admin', 'ADMIN', 'enterprise', 'activo')
  ON CONFLICT (id) DO UPDATE SET plan = 'enterprise';

  -- B. Buscar tu Auth ID por Email (Sincronización manual)
  -- Reemplaza con tu email real si es distinto
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'arnaldoallendeb@gmail.com' LIMIT 1;

  IF v_auth_id IS NOT NULL THEN
    -- C. Vincular o Actualizar tu perfil administrativo
    INSERT INTO usuarios (institucion_id, auth_id, email, nombre, rol, activo)
    VALUES (v_inst_id, v_auth_id, 'arnaldoallendeb@gmail.com', 'Administrador', 'superowner', true)
    ON CONFLICT (auth_id) DO UPDATE SET 
      institucion_id = v_inst_id,
      rol = 'superowner',
      activo = true;
      
    RAISE NOTICE '✅ Usuario vinculado exitosamente a Institución Maestra';
  ELSE
    RAISE NOTICE '⚠️ No se encontró el usuario en Auth. Asegúrate de estar registrado.';
  END IF;
END $$;

-- 4. LIMPIEZA DE CACHÉ DE ESQUEMA (Previene el Error 406)
NOTIFY pgrst, 'reload schema';
