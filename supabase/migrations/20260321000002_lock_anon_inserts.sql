-- Nueva migración: 20260321000002_lock_anon_inserts.sql
-- Fase 3: Hardening de Endpoints de Front-end Públicos

-- =============================================
-- 1. CLAUSURA DE INYECCIÓN ANÓNIMA DIRECTA
-- =============================================
-- Anteriormente, cualquier actor podía hacer un INSERT directo
-- sin autenticación a la tabla 'leads', posibilitando ataques de inyección/spam.
-- Esto revoca ese permiso a nivel de Row Level Security.
DROP POLICY IF EXISTS "public_lead_insert" ON leads;

-- Nota de seguridad:
-- El acceso anónimo de solo lectura a los formularios ("public_form_read") 
-- se mantiene para que los Edge Functions o scripts puedan leer su configuración,
-- pero la inserción de leads ahora requiere el rol service_role vía Edge Function.
