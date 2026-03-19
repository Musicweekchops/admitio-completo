import React, { useState, useEffect, memo } from 'react'
import Icon from './Icon'
import { supabase } from '../lib/supabase'

const GoogleSheetsView = memo(({ user, setNotification, loadData }) => {
  const [apiKey, setApiKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [mostrarKey, setMostrarKey] = useState(false)

  useEffect(() => {
    cargarApiKey()
  }, [user?.institucion_id])

  const cargarApiKey = async () => {
    if (!user?.institucion_id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('obtener_api_key', {
        p_institucion_id: user.institucion_id
      })

      if (data && data.found) {
        setApiKey({
          id: data.id,
          api_key: data.api_key,
          activa: data.activa,
          created_at: data.created_at
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

      if (data && data.success) {
        setApiKey({
          api_key: data.api_key,
          created_at: new Date().toISOString(),
          id: data.key_id
        })
        setMostrarKey(true)
        setNotification({ type: 'success', message: 'API Key generada correctamente' })
      }
    } catch (e) {
      setNotification({ type: 'error', message: 'Error al generar API Key' })
    }
    setGenerando(false)
  }

  const copiarAlPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (e) {
      console.error('Error copiando:', e)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando configuración...</div>

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white text-center">
        <Icon name="Table" size={32} className="mx-auto mb-2 opacity-80" />
        <h3 className="text-xl font-bold">Integración Google Sheets</h3>
        <p className="text-emerald-100 text-sm">Sincroniza leads automáticamente</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        {!apiKey ? (
          <div className="text-center py-6">
            <button onClick={generarNuevaKey} disabled={generando} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium">
              {generando ? 'Generando...' : 'Generar API Key'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type={mostrarKey ? 'text' : 'password'}
                value={apiKey.api_key}
                readOnly
                className="flex-1 bg-slate-50 px-4 py-2 rounded-lg font-mono text-sm border"
              />
              <button onClick={() => setMostrarKey(!mostrarKey)} className="p-2 text-slate-400 hover:text-slate-600">
                <Icon name={mostrarKey ? 'EyeOff' : 'Eye'} size={20} />
              </button>
              <button onClick={() => copiarAlPortapapeles(apiKey.api_key)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                <Icon name={copiado ? 'Check' : 'Copy'} size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500">Úsala en tu script de Google Apps Script para autenticar las peticiones.</p>
          </div>
        )}
      </div>
    </div>
  )
})

export default GoogleSheetsView
