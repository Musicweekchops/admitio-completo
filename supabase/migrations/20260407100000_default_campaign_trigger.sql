-- Migration: 20260407100000_default_campaign_trigger.sql
-- Description: Create 'Extensión' campaign as default, tag existing leads, and add fallback trigger.

-- 1. Create 'Extensión' campaign for all institutions if missing
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

        -- 2. Update existing leads that currenty have no campaign
        UPDATE public.leads
        SET campana_id = v_camp_id
        WHERE campana_id IS NULL AND institucion_id = r.id;
    END LOOP;
END $$;

-- 3. Trigger Function for silent fallback (for manual inserts or other tools)
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

-- 4. Apply trigger to 'leads' table
DROP TRIGGER IF EXISTS tr_leads_campana_default ON public.leads;
CREATE TRIGGER tr_leads_campana_default
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.asignar_campana_default();

-- 5. Notify to reload cache
NOTIFY pgrst, 'reload schema';
