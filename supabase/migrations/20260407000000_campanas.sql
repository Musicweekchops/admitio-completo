-- Migration: 20260407000000_campanas.sql
-- Description: Create campanas table and link to leads

-- 1. Create campanas table
CREATE TABLE IF NOT EXISTS public.campanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID REFERENCES public.instituciones(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  medio TEXT,
  color TEXT DEFAULT 'bg-violet-500',
  activa BOOLEAN DEFAULT true,
  fecha_inicio DATE,
  fecha_fin DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (institucion_id, nombre)
);

-- 2. Add campana_id column to leads table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='campana_id') THEN
    ALTER TABLE public.leads ADD COLUMN campana_id UUID REFERENCES public.campanas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.campanas ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policy for Development
-- Note: Adjust this policy for production later.
DROP POLICY IF EXISTS "dev_all_campanas" ON public.campanas;
CREATE POLICY "dev_all_campanas" ON public.campanas
FOR ALL USING (true) WITH CHECK (true);

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
