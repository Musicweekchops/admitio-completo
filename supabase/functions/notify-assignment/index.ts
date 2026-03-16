// ============================================
// ADMITIO - Edge Function: Notificar Asignación
// supabase/functions/notify-assignment/index.ts
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Lead {
  id: string
  nombre: string
  carrera: string
}

interface AssignmentRequest {
  encargadoId: string
  encargadoEmail: string
  encargadoNombre: string
  lead?: Lead
  leadsCount?: number
  isBulk: boolean
  institucionNombre: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Método no permitido')
    }

    const {
      encargadoEmail,
      encargadoNombre,
      lead,
      leadsCount,
      isBulk,
      institucionNombre
    }: AssignmentRequest = await req.json()

    console.log(`📧 Notificando asignación a: ${encargadoEmail} (Bulk: ${isBulk}, Count: ${leadsCount})`)

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('❌ Error: RESEND_API_KEY no configurada')
      throw new Error('Error de configuración del servidor')
    }

    const subject = isBulk 
      ? `📦 Nuevos leads asignados (${leadsCount}) - ${institucionNombre}`
      : `👤 Nuevo lead asignado: ${lead?.nombre} - ${institucionNombre}`

    const html = generarEmailTemplate({
      encargadoNombre,
      lead,
      leadsCount,
      isBulk,
      institucionNombre
    })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Admitio <notificaciones@admitio.cl>',
        to: [encargadoEmail],
        subject,
        html
      })
    })

    if (!res.ok) {
      const errorData = await res.json()
      console.error('Error enviando email con Resend:', errorData)
      throw new Error(`Error de envío: ${errorData.message || 'Desconocido'}`)
    }

    console.log('✅ Email enviado correctamente')

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('💥 Error en notify-assignment:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

function generarEmailTemplate({ encargadoNombre, lead, leadsCount, isBulk, institucionNombre }: any) {
  const content = isBulk 
    ? `
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Se te han asignado <strong>${leadsCount} leads</strong> para su gestión en Admitio.
      </p>
      <div style="background-color: #F8FAFC; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #E2E8F0; text-align: center;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Puedes verlos todos ingresando a tu dashboard.
        </p>
      </div>
    `
    : `
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Se te ha asignado un nuevo lead para gestionar en Admitio.
      </p>
      <div style="background-color: #F8FAFC; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #8B5CF6;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
          <strong>👤 Nombre:</strong> ${lead.nombre}
        </p>
        <p style="color: #374151; font-size: 14px; margin: 0;">
          <strong>🎸 Carrera:</strong> ${lead.carrera}
        </p>
      </div>
    `;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); border-radius: 16px 16px 0 0; padding: 40px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                ${isBulk ? 'Nuevas Asignaciones' : 'Nueva Asignación de Lead'}
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
                ${institucionNombre}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hola <strong>${encargadoNombre}</strong>,
              </p>
              
              ${content}
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a href="https://app.admitio.cl/dashboard" 
                       style="display: inline-block; background: #8B5CF6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
                      Ir al Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94A3B8; font-size: 12px; text-align: center; margin-top: 32px;">
                Este es un mensaje automático de Admitio para ${institucionNombre}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
