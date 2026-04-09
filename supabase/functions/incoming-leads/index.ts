// ============================================
// ADMITIO - Edge Function: Recibir Leads Externos (SaaS Optimized)
// supabase/functions/incoming-leads/index.ts
// Recibe leads con validación de API Key, Planes y Límites
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface IncomingLead {
  nombre: string
  email?: string
  telefono?: string
  carrera?: string // Nombre de la carrera
  medio?: string
  campana?: string // Nombre de la campaña
  campana_id?: string // UUID de la campaña
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Método no permitido')
    }

     // 1. Verificar API Key en Headers
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      throw new Error('No se proporcionó API Key (x-api-key header missing)')
    }

    const body: IncomingLead = await req.json()
    let { nombre, email, telefono, carrera, medio, campana, campana_id } = body

    if (!nombre) {
      throw new Error('El campo "nombre" (o "full_name") es obligatorio')
    }

    // Cliente Supabase con service_role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables de entorno de Supabase no configuradas')
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Validar Institución
    const { data: inst, error: instError } = await supabase
      .from('instituciones')
      .select(`id, nombre, plan, leads_count, estado`)
      .eq('api_key', apiKey)
      .single()

    if (instError || !inst) {
      console.error('❌ Error validando API Key:', instError)
      throw new Error('API Key inválida o institución no encontrada')
    }

    if (inst.estado !== 'activo') {
      throw new Error('La institución no está activa')
    }

    // 3. Validar permisos del Plan (SaaS Logic) - Consulta separada para evitar fallos de join
    const { data: planConfig, error: planError } = await supabase
      .from('planes_config')
      .select('id, max_leads, api_acceso')
      .eq('id', inst.plan)
      .single()

    if (planError || !planConfig) {
      console.error('❌ Error cargando configuración del plan:', planError)
      throw new Error('Error de configuración del plan de la institución')
    }

    if (!planConfig.api_acceso) {
      throw new Error(`Tu plan (${inst.plan}) no tiene acceso a la API. Sube de nivel para usar esta función.`)
    }

    if (inst.leads_count >= planConfig.max_leads) {
      throw new Error(`Límite de leads alcanzado (${inst.leads_count}/${planConfig.max_leads}).`)
    }

    // ========== TRANSFORMACIONES Y RESOLUCIÓN ==========

    // Normalización
    if (telefono) telefono = String(telefono).replace(/\D/g, '')
    if (email) email = email.toLowerCase().trim()
    
    // Mapeo de Medio
    if (medio) {
      const medioLower = medio.toLowerCase().trim()
      const mappingMedio: Record<string, string> = {
        'ig': 'instagram', 'fb': 'facebook', 'google': 'google ads', 'sheet': 'google sheets'
      }
      medio = mappingMedio[medioLower] || medio
    }

    // 3.1 Resolver carrera_id
    let carrera_id = null
    let carrera_nombre_final = carrera
    if (carrera) {
      const carreraLower = carrera.toLowerCase().trim()
      const { data: carrerasExistentes } = await supabase
        .from('carreras').select('id, nombre').eq('institucion_id', inst.id).eq('activa', true)
      if (carrerasExistentes) {
        const match = (carrerasExistentes as any[]).find(c => {
          const dbName = c.nombre.toLowerCase()
          return dbName.includes(carreraLower) || carreraLower.includes(dbName)
        })
        if (match) {
          carrera_id = match.id
          carrera_nombre_final = match.nombre
        }
      }
    }

    // 3.2 Resolver campana_id (CRÍTICO: Hacerlo antes de buscar duplicados)
    let campana_id_final = campana_id
    
    // Si no viene campaña, buscar 'Extensión' como default (para mantener coherencia con el trigger)
    const { data: campanasExistentes } = await supabase
      .from('campanas').select('id, nombre').eq('institucion_id', inst.id).eq('activa', true)
    
    if (!campana_id_final) {
      const campanaBusqueda = campana ? campana.toLowerCase().trim() : 'extensión';
      if (campanasExistentes) {
        const match = (campanasExistentes as any[]).find(c => {
          const dbName = c.nombre.toLowerCase()
          return dbName.includes(campanaBusqueda) || campanaBusqueda.includes(dbName)
        })
        if (match) campana_id_final = match.id
      }
    }

    // 4. Lógica de De-duplicación (Ahora con Campaña)
    let existingLead = null
    if (email || telefono) {
      console.log(`🔍 [SaaS] Buscando duplicados para ${email || 'S/E'} | Campaña: ${campana_id_final || 'Global'}`)
      
      let query = supabase.from('leads').select('*').eq('institucion_id', inst.id)
      
      // Filtro por campaña (El requerimiento: si es otra campaña, NO es duplicado)
      if (campana_id_final) {
        query = query.eq('campana_id', campana_id_final)
      } else {
        query = query.is('campana_id', null)
      }

      if (email && telefono) {
        query = query.or(`email.eq.${email},telefono.eq.${telefono}`)
      } else if (email) {
        query = query.eq('email', email)
      } else {
        query = query.eq('telefono', telefono)
      }

      const { data: duplicateData } = await query.order('updated_at', { ascending: false }).limit(1)
      if (duplicateData && duplicateData.length > 0) {
        existingLead = duplicateData[0]
        console.log(`✅ Duplicado encontrado en esta campaña: ${existingLead.id}`)
      }
    }

    let leadId = null
    let isUpdate = false

    if (existingLead) {
      // ACTUALIZAR LEAD EXISTENTE
      leadId = existingLead.id
      isUpdate = true

      console.log(`♻️ Duplicado detectado, actualizando lead: ${leadId}`)

      // Para que el webhook sea visible:
      // 1. Movemos el lead a 'nueva' de nuevo
      // 2. Actualizamos updated_at para que suba en el Dashboard
      const updateData: any = {
        estado: 'nueva',
        updated_at: new Date().toISOString()
      }

      await supabase.from('leads').update(updateData).eq('id', leadId)

      await supabase.from('acciones_lead').insert({
        lead_id: leadId,
        tipo: 'actualizacion_automatica',
        descripcion: `Re-entrada vía API SaaS (${medio || 'Externo'}). Carrera interés: ${carrera_nombre_final || 'No especificada'}`
      })

    } else {
      // CREAR NUEVO LEAD
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          institucion_id: inst.id,
          nombre,
          email,
          telefono,
          carrera_id,
          carrera_nombre: carrera_nombre_final,
          campana_id: campana_id_final,
          medio: medio || 'API SaaS',
          estado: 'nueva',
          prioridad: 'media'
        })
        .select()
        .single()

      if (leadError) {
        console.error('❌ Error insertando lead:', leadError)
        throw new Error(`Error al crear el lead: ${leadError.message}`)
      }

      leadId = newLead.id

      await supabase.from('acciones_lead').insert({
        lead_id: leadId,
        tipo: 'creacion_automatica',
        descripcion: `Lead cargado vía API SaaS (${medio || 'Externo'})`
      })
    }

    // 6. Notificar Asignación (NUEVO: Integración con Algoritmo SQL)
    if (leadId) {
      // Obtener el lead actualizado con su asignación (el trigger ya actuó)
      const { data: fullLead } = await supabase
        .from('leads')
        .select('*, usuarios!leads_asignado_a_fkey(nombre, email)')
        .eq('id', leadId)
        .single();

      if (fullLead && fullLead.asignado_a && fullLead.usuarios) {
        console.log(`📣 Disparando notificación para encargado: ${fullLead.usuarios.email}`);

        // Llamar a la función notify-assignment
        // Lo hacemos de forma asíncrona (sin esperar) para no retrasar el webhook
        const notifyParams = {
          encargadoEmail: fullLead.usuarios.email,
          encargadoNombre: fullLead.usuarios.nombre,
          lead: {
            id: fullLead.id,
            nombre: fullLead.nombre,
            carrera: fullLead.carrera_nombre || 'No especificada'
          },
          isBulk: false,
          institucionNombre: inst.nombre
        };

        // Invocación interna con await para evitar la terminación anticipada de Deno
        try {
          await fetch(`${supabaseUrl}/functions/v1/notify-assignment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify(notifyParams)
          });
          console.log('✅ Notificación de asignación disparada exitosamente');
        } catch (err) {
          console.error('⚠️ Error disparando notificación:', err);
        }
      }
    }

    // 7. Actualizar tracking de API Key
    await supabase.from('instituciones')
      .update({ api_key_last_used: new Date().toISOString() })
      .eq('id', inst.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: isUpdate ? `♻️ Lead actualizado: ${nombre}` : `✅ Lead creado: ${nombre}`,
        lead_id: leadId,
        lead_nombre: nombre,
        is_update: isUpdate,
        leads_total: inst.leads_count + (isUpdate ? 0 : 1),
        quota_remaining: planConfig.max_leads - (inst.leads_count + (isUpdate ? 0 : 1))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Error en incoming-leads (SaaS):', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error al procesar el webhook'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
