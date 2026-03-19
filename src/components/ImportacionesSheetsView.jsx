import React, { useState, useEffect } from 'react'
import Icon from './Icon'
import { supabase } from '../lib/supabase'
import * as store from '../lib/store'

const LeadImportadoCard = ({ item, carreras, procesando, aprobarLead, rechazarLead, resolverDuplicado }) => {
  const datos = item.datos_raw || {}
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(item.carrera_mapeada_id || '')
  const [guardarMapeo, setGuardarMapeo] = useState(false)

  const tieneConflictoCarrera = item.tipo_conflicto === 'carrera_no_existe' || item.tipo_conflicto === 'multiple'
  const tieneConflictoDuplicado = item.tipo_conflicto === 'duplicado_email' || item.tipo_conflicto === 'duplicado_telefono'

  return (
    <div className={`bg-white rounded-xl border ${item.tiene_conflicto ? 'border-amber-200' : 'border-slate-200'} overflow-hidden`}>
      {/* Header con estado */}
      <div className={`px-4 py-2 ${item.tiene_conflicto ? 'bg-amber-50' : 'bg-emerald-50'} flex items-center justify-between`}>
        <span className={`text-sm font-medium ${item.tiene_conflicto ? 'text-amber-700' : 'text-emerald-700'}`}>
          {item.tiene_conflicto ? (
            <>
              <Icon name="AlertTriangle" size={14} className="inline mr-1" />
              {item.tipo_conflicto === 'duplicado_email' && 'Posible duplicado (email)'}
              {item.tipo_conflicto === 'duplicado_telefono' && 'Posible duplicado (teléfono)'}
              {item.tipo_conflicto === 'carrera_no_existe' && 'Carrera no encontrada'}
              {item.tipo_conflicto === 'multiple' && 'Múltiples conflictos'}
            </>
          ) : (
            <>
              <Icon name="CheckCircle" size={14} className="inline mr-1" />
              Listo para aprobar
            </>
          )}
        </span>
        <span className="text-xs text-slate-500">
          {new Date(item.created_at).toLocaleString()}
        </span>
      </div>

      {/* Datos del lead */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Nombre:</span>
            <span className="ml-2 font-medium">{datos.nombre}</span>
          </div>
          <div>
            <span className="text-slate-500">Email:</span>
            <span className="ml-2">{datos.email || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Teléfono:</span>
            <span className="ml-2">{datos.telefono || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Carrera:</span>
            <span className={`ml-2 ${tieneConflictoCarrera ? 'text-amber-600 font-medium' : ''}`}>
              {datos.carrera || '-'}
            </span>
          </div>
        </div>

        {/* Conflicto duplicado */}
        {tieneConflictoDuplicado && item.conflicto_detalles && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Lead existente:</strong> {item.conflicto_detalles.lead_existente_nombre}
            </p>
            <p className="text-xs text-amber-600">
              Creado: {new Date(item.conflicto_detalles.lead_existente_fecha).toLocaleDateString()}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => resolverDuplicado(item.id, 'actualizar')}
                disabled={procesando === item.id}
                className="flex-1 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium"
              >
                Actualizar existente
              </button>
              <button
                onClick={() => resolverDuplicado(item.id, 'crear')}
                disabled={procesando === item.id}
                className="flex-1 px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded-lg text-sm font-medium"
              >
                Crear nuevo
              </button>
              <button
                onClick={() => resolverDuplicado(item.id, 'ignorar')}
                disabled={procesando === item.id}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm"
              >
                Ignorar
              </button>
            </div>
          </div>
        )}

        {/* Conflicto carrera */}
        {tieneConflictoCarrera && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-amber-800 mb-2">
              La carrera "<strong>{item.carrera_original}</strong>" no existe. Selecciona una:
            </p>
            <select
              value={carreraSeleccionada}
              onChange={e => setCarreraSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm mb-2"
            >
              <option value="">-- Seleccionar carrera --</option>
              {carreras.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-amber-700">
              <input
                type="checkbox"
                checked={guardarMapeo}
                onChange={e => setGuardarMapeo(e.target.checked)}
                className="rounded"
              />
              Recordar este mapeo para futuras importaciones
            </label>
          </div>
        )}

        {/* Acciones */}
        {!tieneConflictoDuplicado && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => aprobarLead(item, carreraSeleccionada || null, guardarMapeo)}
              disabled={procesando === item.id || (tieneConflictoCarrera && !carreraSeleccionada)}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {procesando === item.id ? (
                <Icon name="Loader2" size={16} className="animate-spin" />
              ) : (
                <Icon name="Check" size={16} />
              )}
              Aprobar
            </button>
            <button
              onClick={() => rechazarLead(item.id)}
              disabled={procesando === item.id}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const ImportacionesSheetsView = ({ user, setNotification, loadData }) => {
  const [importaciones, setImportaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(null)
  const [filtro, setFiltro] = useState('pendientes') // pendientes, todos
  const [stats, setStats] = useState({ pendientes: 0, sinConflicto: 0, conConflicto: 0 })

  const carreras = store.getCarreras() || []

  useEffect(() => {
    cargarImportaciones()
  }, [filtro, user?.institucion_id])

  const cargarImportaciones = async () => {
    if (!user?.institucion_id) return
    setLoading(true)
    try {
      let query = supabase
        .from('leads_importados')
        .select('*')
        .eq('institucion_id', user.institucion_id)
        .order('created_at', { ascending: false })

      if (filtro === 'pendientes') {
        query = query.eq('estado', 'pendiente')
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      setImportaciones(data || [])

      // Cargar stats
      try {
        const { data: statsData } = await supabase
          .from('v_stats_importacion')
          .select('*')
          .eq('institucion_id', user.institucion_id)
          .single()

        if (statsData) {
          setStats({
            pendientes: statsData.pendientes || 0,
            sinConflicto: statsData.sin_conflicto || 0,
            conConflicto: statsData.con_conflicto || 0
          })
        }
      } catch (e) {
        console.warn('Error cargando stats de importación:', e)
      }
    } catch (e) {
      console.error('Error cargando importaciones:', e)
    }
    setLoading(false)
  }

  const aprobarLead = async (importacion, carreraId = null, guardarMapeo = false) => {
    setProcesando(importacion.id)
    try {
      const { data, error } = await supabase.rpc('aprobar_lead_importado', {
        p_lead_importado_id: importacion.id,
        p_usuario_id: user?.id,
        p_carrera_id: carreraId,
        p_guardar_mapeo: guardarMapeo
      })

      if (error) throw error

      if (data.success) {
        if (setNotification) setNotification({ type: 'success', message: 'Lead aprobado correctamente' })
        cargarImportaciones()
        if (loadData) loadData() // Recargar datos del dashboard
      }
    } catch (e) {
      if (setNotification) setNotification({ type: 'error', message: 'Error al aprobar: ' + e.message })
    }
    setProcesando(null)
  }

  const rechazarLead = async (importacionId) => {
    if (!confirm('¿Rechazar este lead? No se creará en el sistema.')) return

    setProcesando(importacionId)
    try {
      const { data, error } = await supabase.rpc('rechazar_lead_importado', {
        p_lead_importado_id: importacionId,
        p_usuario_id: user?.id
      })

      if (error) throw error

      if (setNotification) setNotification({ type: 'info', message: 'Lead rechazado' })
      cargarImportaciones()
    } catch (e) {
      if (setNotification) setNotification({ type: 'error', message: 'Error: ' + e.message })
    }
    setProcesando(null)
  }

  const resolverDuplicado = async (importacionId, accion) => {
    setProcesando(importacionId)
    try {
      if (accion === 'actualizar') {
        const { data, error } = await supabase.rpc('resolver_duplicado_actualizar', {
          p_lead_importado_id: importacionId,
          p_usuario_id: user?.id
        })
        if (error) throw error
        if (setNotification) setNotification({ type: 'success', message: 'Lead existente actualizado' })
      } else if (accion === 'crear') {
        // Forzar creación ignorando duplicado
        const importacion = importaciones.find(i => i.id === importacionId)
        await aprobarLead(importacion, importacion.carrera_mapeada_id)
        return
      } else {
        await rechazarLead(importacionId)
        return
      }
      cargarImportaciones()
      if (loadData) loadData()
    } catch (e) {
      if (setNotification) setNotification({ type: 'error', message: 'Error: ' + e.message })
    }
    setProcesando(null)
  }

  const aprobarTodosSinConflicto = async () => {
    if (!confirm(`¿Aprobar ${stats.sinConflicto} leads sin conflictos?`)) return

    setProcesando('todos')
    try {
      const { data, error } = await supabase.rpc('aprobar_leads_sin_conflicto', {
        p_institucion_id: user?.institucion_id,
        p_usuario_id: user?.id
      })

      if (error) throw error

      if (setNotification) setNotification({ type: 'success', message: `${data.aprobados} leads aprobados` })
      cargarImportaciones()
      if (loadData) loadData()
    } catch (e) {
      if (setNotification) setNotification({ type: 'error', message: 'Error: ' + e.message })
    }
    setProcesando(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Icon name="Download" className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Importaciones desde Sheets</h1>
              <p className="text-emerald-200">
                {stats.pendientes} pendientes • {stats.sinConflicto} sin conflictos
              </p>
            </div>
          </div>
          {stats.sinConflicto > 0 && (
            <button
              onClick={aprobarTodosSinConflicto}
              disabled={procesando === 'todos'}
              className="px-4 py-2 bg-white hover:bg-white/90 text-emerald-700 rounded-lg font-medium flex items-center gap-2"
            >
              <Icon name="CheckCircle" size={18} />
              Aprobar todos sin conflictos ({stats.sinConflicto})
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFiltro('pendientes')}
          className={`px-4 py-2 rounded-lg font-medium ${filtro === 'pendientes' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          Pendientes ({stats.pendientes})
        </button>
        <button
          onClick={() => setFiltro('todos')}
          className={`px-4 py-2 rounded-lg font-medium ${filtro === 'todos' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          Todos
        </button>
        <button
          onClick={cargarImportaciones}
          className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <Icon name="RefreshCw" size={18} />
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500">Cargando importaciones...</p>
        </div>
      ) : importaciones.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Inbox" size={32} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">
            {filtro === 'pendientes' ? 'Sin importaciones pendientes' : 'Sin importaciones'}
          </h3>
          <p className="text-slate-500">
            Los leads que lleguen desde Google Sheets aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {importaciones.map(item => (
            <LeadImportadoCard 
              key={item.id} 
              item={item} 
              carreras={carreras}
              procesando={procesando}
              aprobarLead={aprobarLead}
              rechazarLead={rechazarLead}
              resolverDuplicado={resolverDuplicado}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImportacionesSheetsView
