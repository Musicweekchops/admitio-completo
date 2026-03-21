// ============================================
// ADMITIO - Edge Function: Submit Form (Embed)
// supabase/functions/submit-form/index.ts
// Reemplaza la inyección directa insegura a la DB.
// Validación de Plan de la Institución y Formulario.
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Solo se permiten peticiones POST')
    }

    const payload = await req.json()
    const { institucion_id, nombre, email, telefono, carrera_nombre, tipo_alumno, medio, notas, ...campos_extra } = payload

    if (!institucion_id || !nombre || (!email && !telefono)) {
      throw new Error('Faltan campos obligatorios (institucion_id, nombre, email o telefono)')
    }

    // 2. Inicializar Cliente Supabase (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables de entorno no configuradas')
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Validar Institución y Plan
    const { data: inst, error: instError } = await supabase
      .from('instituciones')
      .select('id, nombre, plan, leads_count, estado, planes_config!inner(max_leads)')
      .eq('id', institucion_id)
      .single()

    if (instError || !inst) {
      throw new Error('Institución inválida o no encontrada')
    }

    if (inst.estado !== 'activo') {
      throw new Error('La institución no está activa')
    }

    const planConfig = inst.planes_config as any
    if (inst.leads_count >= planConfig.max_leads) {
      throw new Error('Límite de leads de la institución alcanzado')
    }

    // 4. Intentar resolver el ID de la carrera si se envió el nombre
    let carrera_id = null
    if (carrera_nombre) {
      const { data: carreraMatch } = await supabase
        .from('carreras')
        .select('id')
        .eq('institucion_id', institucion_id)
        .ilike('nombre', `%${carrera_nombre}%`)
        .eq('activa', true)
        .limit(1)
        .single()
      
      if (carreraMatch) {
        carrera_id = carreraMatch.id
      }
    }

    // 5. Insertar Lead (Usando Service Role, saltando RLS de Inserción Anónima)
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        institucion_id: inst.id,
        nombre: nombre,
        email: email ? String(email).trim().toLowerCase() : null,
        telefono: telefono ? String(telefono).trim() : null,
        carrera_id,
        carrera_nombre: carrera_nombre || null,
        tipo_alumno: tipo_alumno || 'nuevo',
        medio: medio || 'formulario_web',
        estado: 'nueva',
        prioridad: 'media',
        notas: notas || 'Lead capturado desde formulario web embebido.',
        // Guardar cualquier otro campo extra dinámico en una columna JSON si existiera,
        // o mapearlo a notas si no hay columna (admitio no parece tener campo_extra dinámico activo en DB)
      })
      .select()
      .single()

    if (insertError) {
      throw new Error('Hubo un problema al guardar el lead en la base de datos')
    }

    // 6. Registrar Acción Automática
    await supabase.from('acciones_lead').insert({
      lead_id: newLead.id,
      tipo: 'creacion_automatica',
      descripcion: `Lead capturado desde formulario web`
    })

    // 7. Notificar Asignación a Operadores (si el trigger lo asignó)
    try {
      const { data: fullLead } = await supabase
        .from('leads')
        .select('*, usuarios!leads_asignado_a_fkey(nombre, email)')
        .eq('id', newLead.id)
        .single()

      if (fullLead && fullLead.asignado_a && fullLead.usuarios) {
        await fetch(`${supabaseUrl}/functions/v1/notify-assignment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            encargadoEmail: fullLead.usuarios.email,
            encargadoNombre: fullLead.usuarios.nombre,
            lead: { id: fullLead.id, nombre: fullLead.nombre, carrera: fullLead.carrera_nombre || 'No especificada' },
            isBulk: false,
            institucionNombre: inst.nombre
          })
        })
      }
    } catch (notifyErr) {
      console.error('⚠️ Error silencioso enviando notificación:', notifyErr)
    }

    // 8. Responder Exitoso
    return new Response(
      JSON.stringify({ success: true, lead_id: newLead.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('💥 Error submit-form:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
