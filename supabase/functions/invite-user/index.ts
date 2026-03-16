// ============================================
// ADMITIO - Edge Function: Invitar Usuario
// supabase/functions/invite-user/index.ts
// Crea usuario + envía email personalizado via Resend
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
  email: string
  nombre: string
  password: string
  rol: string
  rol_nombre: string
  institucion_id: string
  institucion_nombre: string
  invitado_por: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que sea POST
    if (req.method !== 'POST') {
      throw new Error('Método no permitido')
    }

    // Obtener datos del request
    const {
      email,
      nombre,
      password,
      rol,
      rol_nombre,
      institucion_id,
      institucion_nombre,
      invitado_por
    }: InviteRequest = await req.json()

    // Validaciones
    console.log(`📩 Procesando invitación para: ${email} (Institución: ${institucion_id})`)
    
    if (!email || !nombre || !password || !rol || !institucion_id) {
      console.error('❌ Faltan campos requeridos:', { email: !!email, nombre: !!nombre, password: !!password, rol: !!rol, institucion_id: !!institucion_id })
      throw new Error('Faltan campos requeridos')
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres')
    }

    // Crear cliente Supabase con service_role (permite crear usuarios)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Error: Variables de entorno de Supabase no configuradas')
      throw new Error('Error de configuración del servidor')
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar que el email no exista
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('institucion_id', institucion_id)
      .maybeSingle()

    if (existingUser) {
      console.warn(`⚠️ El usuario ${email} ya existe en la tabla usuarios de la institución ${institucion_id}`)
      throw new Error('Este correo ya está registrado en tu institución')
    }

    // ========== CREAR O VINCULAR USUARIO EN AUTH ==========
    let authUserId: string | undefined

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre,
        rol: rol,
        rol_nombre: rol_nombre,
        institucion_nombre: institucion_nombre
      }
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`ℹ️ El usuario ${email} ya existe en Auth. Buscando su ID...`)
        
        // El usuario ya existe en Auth, necesitamos su ID para la tabla
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) {
          console.error('❌ Error listando usuarios de Auth:', listError)
          throw new Error(`Este correo ya está registrado en Auth y no pudimos recuperar su ID: ${listError.message}`)
        }

        const existingAuthUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())
        if (!existingAuthUser) {
          console.error(`❌ El usuario ${email} debería existir en Auth pero no fue encontrado en la lista`)
          throw new Error('Este correo ya está registrado en Auth pero hubo un error de sincronización. Contacta a soporte.')
        }

        authUserId = existingAuthUser.id
        console.log(`✅ ID de Auth recuperado: ${authUserId}`)
      } else {
        console.error('❌ Error creando auth user:', authError)
        throw new Error(`Error de autenticación: ${authError.message}`)
      }
    } else {
      authUserId = authData.user.id
      console.log(`✅ Usuario creado en Auth con ID: ${authUserId}`)
    }

    if (!authUserId) {
      throw new Error('No se pudo obtener el ID del usuario de autenticación')
    }

    // ========== CREAR USUARIO EN TABLA ==========
    const { data: userData, error: userError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        institucion_id: institucion_id,
        auth_id: authUserId,
        email: email.toLowerCase().trim(),
        nombre: nombre,
        rol: rol,
        activo: true,
        email_verificado: true
      })
      .select()
      .single()

    if (userError) {
      console.error('❌ Error creando usuario en tabla:', userError)
      
      // Solo hacer rollback si acabamos de crear al usuario en Auth
      if (!authError) { 
        console.log('🔄 Iniciando rollback en Auth...')
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      
      throw new Error(`Error al crear el registro del usuario: ${userError.message}`)
    }

    console.log('✅ Usuario creado en la tabla usuarios con ID:', userData.id)

    // ========== ENVIAR EMAIL CON RESEND ==========
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (RESEND_API_KEY) {
      const emailHtml = generarEmailInvitacion({
        nombre,
        rol_nombre,
        institucion_nombre,
        email: email.toLowerCase().trim()
      })

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Admitio <notificaciones@admitio.cl>',
          to: [email.toLowerCase().trim()],
          subject: `¡Bienvenido a ${institucion_nombre}! - Admitio`,
          html: emailHtml
        })
      })

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json()
        console.error('Error enviando email con Resend:', errorData)
        // No lanzamos error, el usuario ya fue creado
      } else {
        console.log('✅ Email enviado correctamente via Resend')
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY no configurada, email no enviado')
    }

    // ========== RESPUESTA EXITOSA ==========
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuario creado correctamente',
        user: {
          id: userData.id,
          auth_id: authUserId,
          email: email.toLowerCase().trim(),
          nombre: nombre
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Error crítico en invite-user:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error al crear usuario',
        details: error.stack || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

// ========== TEMPLATE DE EMAIL ==========
function generarEmailInvitacion({
  nombre,
  rol_nombre,
  institucion_nombre,
  email
}: {
  nombre: string
  rol_nombre: string
  institucion_nombre: string
  email: string
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Admitio</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); border-radius: 16px 16px 0 0; padding: 40px 32px;">
              <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; display: inline-block;">
                <span style="font-size: 28px;">🎓</span>
              </div>
              <h1 style="color: #ffffff; margin: 16px 0 0; font-size: 28px; font-weight: 700;">
                ¡Bienvenido al equipo!
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px;">
                ${institucion_nombre}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Has sido invitado a unirte a <strong style="color: #6D28D9;">${institucion_nombre}</strong> en Admitio.
              </p>
              
              <!-- Info box -->
              <div style="background-color: #F5F3FF; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #8B5CF6;">
                <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
                  <strong>👤 Tu rol:</strong> ${rol_nombre}
                </p>
                <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
                  <strong>🏛️ Institución:</strong> ${institucion_nombre}
                </p>
                <p style="color: #374151; font-size: 14px; margin: 0;">
                  <strong>📧 Tu correo:</strong> ${email}
                </p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Tu administrador te proporcionará tu contraseña de acceso. Una vez la tengas, haz clic en el botón para ingresar:
              </p>
              
              <!-- Botón -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a href="https://app.admitio.cl/login" 
                       style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                      Ingresar a Admitio
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #E5E7EB;">
                Si no esperabas esta invitación, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © 2025 Admitio · <a href="https://app.admitio.cl" style="color: #8B5CF6; text-decoration: none;">app.admitio.cl</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
