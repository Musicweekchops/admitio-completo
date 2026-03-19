import React, { useState, useEffect } from 'react'
import Icon from './Icon'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const IntegracionGoogleSheets = ({ user, setNotification }) => {
  const [apiKey, setApiKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [mostrarKey, setMostrarKey] = useState(false)

  // Cargar API Key existente
  useEffect(() => {
    cargarApiKey()
  }, [user?.institucion_id])

  const cargarApiKey = async () => {
    if (!user?.institucion_id) {
      console.log('No hay institucion_id, no se puede cargar API Key')
      setLoading(false)
      return
    }

    console.log('Cargando API Key para institucion:', user.institucion_id)

    try {
      // Usar función RPC para bypass RLS seguro
      const { data, error } = await supabase.rpc('obtener_api_key', {
        p_institucion_id: user.institucion_id
      })

      console.log('Resultado obtener_api_key:', { data, error })

      if (error) {
        console.error('Error en RPC:', error)
        // Fallback: intentar query directo
        const { data: directData, error: directError } = await supabase
          .from('api_keys')
          .select('id, api_key, activa, created_at, ultimo_uso')
          .eq('institucion_id', user.institucion_id)
          .eq('activa', true)
          .order('created_at', { ascending: false })

        if (directData && directData.length > 0) {
          setApiKey(directData[0])
        }
      } else if (data && data.found) {
        setApiKey({
          id: data.id,
          api_key: data.api_key,
          activa: data.activa,
          created_at: data.created_at,
          ultimo_uso: data.ultimo_uso
        })
      }
    } catch (e) {
      console.error('Error cargando API Key:', e)
    }
    setLoading(false)
  }

  const generarNuevaKey = async () => {
    setGenerando(true)
    try {
      const { data, error } = await supabase.rpc('generar_api_key', {
        p_institucion_id: user?.institucion_id,
        p_usuario_id: user?.id
      })

      console.log('Resultado generar key:', data, error)

      if (error) throw error

      if (data && data.success) {
        // Guardar la key generada y mostrarla
        setApiKey({
          api_key: data.api_key,
          created_at: new Date().toISOString(),
          id: data.key_id
        })
        setMostrarKey(true) // Mostrar la key recién generada
        if (setNotification) setNotification({ type: 'success', message: 'API Key generada correctamente' })
      } else {
        throw new Error(data?.error || 'Error desconocido')
      }
    } catch (e) {
      console.error('Error generando API Key:', e)
      if (setNotification) setNotification({ type: 'error', message: 'Error al generar API Key: ' + e.message })
    }
    setGenerando(false)
  }

  const copiarAlPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (e) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = texto
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co'
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'tu-anon-key'

  // Ocultar parte de la key para seguridad
  const keyOculta = apiKey?.api_key
    ? `${apiKey.api_key.substring(0, 8)}${'•'.repeat(32)}${apiKey.api_key.substring(apiKey.api_key.length - 8)}`
    : ''

  const scriptConfig = `// ============================================
// CONFIGURACIÓN - EDITAR ESTOS VALORES
// ============================================
const CONFIG = {
  API_KEY: '${apiKey?.api_key || 'TU_API_KEY_AQUI'}',
  SUPABASE_URL: '${supabaseUrl}',
  // ... resto del script en documentación
};

function getSupabaseAnonKey() {
  return '${supabaseAnonKey}';
}`

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon name="Table" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Integración Google Sheets</h3>
            <p className="text-emerald-100 text-sm">Sincroniza leads automáticamente desde tu hoja de cálculo</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estado de la API Key */}
        {!apiKey ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Key" size={32} className="text-slate-400" />
            </div>
            <h4 className="font-semibold text-slate-800 mb-2">Genera tu API Key</h4>
            <p className="text-slate-500 text-sm mb-4">
              Necesitas una API Key para conectar tu Google Sheets con Admitio
            </p>
            <button
              onClick={generarNuevaKey}
              disabled={generando}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium disabled:opacity-50"
            >
              {generando ? 'Generando...' : 'Generar API Key'}
            </button>
          </div>
        ) : (
          <>
            {/* API Key existente */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon name="Key" size={18} className="text-emerald-600" />
                  <span className="font-medium text-emerald-800">Tu API Key</span>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                  Activa desde {new Date(apiKey.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Input con la key */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    type={mostrarKey ? 'text' : 'password'}
                    value={apiKey.api_key}
                    readOnly
                    className="w-full bg-white px-4 py-3 rounded-lg text-sm font-mono border border-emerald-200 pr-12"
                  />
                  <button
                    onClick={() => setMostrarKey(!mostrarKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={mostrarKey ? 'Ocultar' : 'Mostrar'}
                  >
                    <Icon name={mostrarKey ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                </div>
                <button
                  onClick={() => copiarAlPortapapeles(apiKey.api_key)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${copiado
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                    }`}
                >
                  <Icon name={copiado ? 'Check' : 'Copy'} size={16} />
                  {copiado ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>

              {/* Tip de seguridad */}
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <Icon name="Shield" size={12} />
                Guarda esta key en un lugar seguro. No la compartas públicamente.
              </p>
            </div>

            {/* Instrucciones */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                <Icon name="BookOpen" size={18} className="text-slate-400" />
                Instrucciones de configuración
              </h4>

              <ol className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">1</span>
                  <span>Abre tu Google Sheets con los datos de leads</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">2</span>
                  <span>Ve a <strong>Extensiones → Apps Script</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">3</span>
                  <span>Copia y pega el script de abajo</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">4</span>
                  <span>Ejecuta la función <code className="bg-slate-100 px-1 rounded">crearTrigger</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 font-medium">5</span>
                  <span>¡Listo! Las nuevas filas se enviarán automáticamente</span>
                </li>
              </ol>
            </div>

            {/* Formato de columnas */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h5 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                <Icon name="AlertCircle" size={16} />
                Formato de columnas requerido
              </h5>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
                {['nombre*', 'email', 'telefono', 'carrera', 'medio', 'notas'].map(col => (
                  <span key={col} className="bg-white px-2 py-1 rounded text-amber-700 font-mono text-center">
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-2">* Campo obligatorio. La primera fila debe ser el encabezado.</p>
            </div>

            {/* Botón para ver/descargar script */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowScript(!showScript)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <Icon name={showScript ? 'ChevronUp' : 'Code'} size={18} />
                {showScript ? 'Ocultar script' : 'Ver script de configuración'}
              </button>
              <a
                href="/google-apps-script-admitio.js"
                download="admitio-google-sheets.js"
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2"
              >
                <Icon name="Download" size={18} />
                Descargar
              </a>
            </div>

            {/* Script expandible */}
            {showScript && (
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-x-auto max-h-64">
                  {scriptConfig}
                </pre>
                <button
                  onClick={() => copiarAlPortapapeles(scriptConfig)}
                  className="absolute top-2 right-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
                >
                  Copiar
                </button>
              </div>
            )}

            {/* Regenerar key */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (confirm('¿Regenerar API Key? La anterior dejará de funcionar.')) {
                    generarNuevaKey()
                  }
                }}
                className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1"
              >
                <Icon name="RefreshCw" size={14} />
                Regenerar API Key
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default IntegracionGoogleSheets
