-- Migration: 20260407100000_default_campaign_trigger.sql
-- Description: Add unique constraint, create 'Extensión' default campaign, and tag existing leads.

-- 1. Ensure unique constraint exists for ON CONFLICT to work
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campanas_institucion_id_nombre_key'
  ) THEN
    ALTER TABLE public.campanas ADD CONSTRAINT campanas_institucion_id_nombre_key UNIQUE (institucion_id, nombre);
  END IF;
END $$;

-- 2. Create 'Extensión' campaign for all institutions if missing
DO $$
DECLARE
    r RECORD;
    v_camp_id UUID;
BEGIN
    FOR r IN SELECT id FROM instituciones LOOP
        -- Create 'Extensión' campaign with a distinctive blue color
        INSERT INTO public.campanas (institucion_id, nombre, color, activa)
        VALUES (r.id, 'Extensión', 'bg-blue-500', true)
        ON CONFLICT (institucion_id, nombre) DO NOTHING;

        -- Find the ID (whether created now or before)
        SELECT id INTO v_camp_id FROM public.campanas 
        WHERE nombre = 'Extensión' AND institucion_id = r.id 
        LIMIT 1;

        -- 3. Update existing leads that currenty have no campaign
        UPDATE public.leads
        SET campana_id = v_camp_id
        WHERE campana_id IS NULL AND institucion_id = r.id;
    END LOOP;
END $$;

-- 4. Trigger Function for silent fallback
CREATE OR REPLACE FUNCTION public.asignar_campana_default()
RETURNS TRIGGER AS $$
DECLARE
    v_camp_id UUID;
BEGIN
    -- Only act if no campana_id is provided
    IF NEW.campana_id IS NULL THEN
        -- Find 'Extensión' campaign for this institution
        SELECT id INTO v_camp_id 
        FROM public.campanas 
        WHERE nombre = 'Extensión' 
        AND institucion_id = NEW.institucion_id 
        LIMIT 1;

        -- Assign if found
        IF v_camp_id IS NOT NULL THEN
            NEW.campana_id := v_camp_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Apply trigger to 'leads' table
DROP TRIGGER IF EXISTS tr_leads_campana_default ON public.leads;
CREATE TRIGGER tr_leads_campana_default
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.asignar_campana_default();

-- 6. Notify to reload cache
NOTIFY pgrst, 'reload schema';
