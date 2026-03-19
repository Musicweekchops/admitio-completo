-- Nueva migración: 20260319100000_audit_leads.sql
-- Implementa auditoría automática para la tabla leads

CREATE OR REPLACE FUNCTION tr_audit_leads_func()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Detectar cambio de Estado
  IF (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    INSERT INTO acciones_lead (lead_id, usuario_id, tipo, descripcion)
    VALUES (NEW.id, auth.uid(), 'cambio_estado', 'Estado cambiado de ' || COALESCE(OLD.estado, 'ninguno') || ' a ' || NEW.estado);
  END IF;
  
  -- 2. Detectar Notas actualizadas
  IF (OLD.notas IS DISTINCT FROM NEW.notas) THEN
    INSERT INTO acciones_lead (lead_id, usuario_id, tipo, descripcion)
    VALUES (NEW.id, auth.uid(), 'nota', 'Notas actualizadas');
  END IF;

  -- 3. Detectar Cambio de Asignación
  IF (OLD.asignado_a IS DISTINCT FROM NEW.asignado_a) THEN
    INSERT INTO acciones_lead (lead_id, usuario_id, tipo, descripcion)
    VALUES (NEW.id, auth.uid(), 'reasignacion', 'Lead reasignado');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar si ya existe para evitar errores en re-aplicación
DROP TRIGGER IF EXISTS tr_audit_leads ON leads;

CREATE TRIGGER tr_audit_leads
AFTER UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION tr_audit_leads_func();
