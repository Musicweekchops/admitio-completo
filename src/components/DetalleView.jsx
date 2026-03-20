import React, { useState, useEffect, memo } from 'react'
import Icon from './Icon'
import { ESTADOS, MEDIOS } from '../data/mockData'
import * as store from '../lib/store'

const NotasTextarea = ({ consulta, userId, onSaved }) => {
  const [notas, setNotas] = useState(consulta?.notas || '')
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    setNotas(consulta?.notas || '')
    setSaved(true)
  }, [consulta?.id, consulta?.notas])

  const handleChange = (e) => {
    setNotas(e.target.value)
    setSaved(e.target.value === (consulta?.notas || ''))
  }

  const handleSave = async () => {
    if (notas !== (consulta?.notas || '')) {
      const success = await store.updateConsultaAsync(consulta.id, { notas }, userId)
      if (success) {
        setSaved(true)
        if (onSaved) onSaved()
      }
    }
  }

  return (
    <div className={`bg-slate-50 rounded-lg p-4 border border-slate-200`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Icon name="FileText" size={16} />
          Notas de seguimiento
        </label>
        {!saved && (
          <span className="text-xs text-amber-600">Sin guardar</span>
        )}
      </div>
      <textarea
        value={notas}
        onChange={handleChange}
        onBlur={handleSave}
        placeholder="Escribe notas sobre este lead... (se guardan automáticamente)"
        className={`w-full h-32 px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white`}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-400">Las notas se guardan en el historial</p>
        <button
          onClick={handleSave}
          disabled={saved}
          className={`px-3 py-1 text-sm rounded-lg font-medium flex items-center gap-1 ${saved ? 'bg-slate-100 text-slate-400' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
        >
          <Icon name="Save" size={14} />
          {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

const DetalleView = memo(({
  selectedConsulta,
  setSelectedConsulta,
  setActiveTab,
  user,
  loadData,
  setNotification,
  handleEstadoChange,
  handleTipoAlumnoChange,
  handleReasignar,
  handleEnviarEmail,
  formatDateShort,
  isKeyMaster
}) => {
  const c = selectedConsulta
  if (!c) return null
  const encargados = store.getUsuarios().filter(u => u.rol_id === 'encargado')

  const handleBack = () => {
    setSelectedConsulta(null)
    setActiveTab('consultas')
    loadData()
  }

  return (
    <div className="space-y-6">
      <button onClick={handleBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 group"
      >
        <Icon name="ArrowLeft" size={20} className="group-hover:-translate-x-1 transition-transform" />
        Volver a consultas
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Info & History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-800">{c.nombre}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ESTADOS[c.estado]?.bg || 'bg-slate-100'} ${ESTADOS[c.estado]?.text || 'text-slate-600'}`}>
                    {ESTADOS[c.estado]?.label || c.estado}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Icon name="Mail" size={16} />
                    {c.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="Phone" size={16} />
                    {c.telefono}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="Calendar" size={16} />
                    {formatDateShort(c.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <a href={`https://wa.me/${c.telefono?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                  title="WhatsApp"
                >
                  <Icon name="MessageCircle" size={20} />
                </a>
                <a href={`mailto:${c.email}`}
                  className="p-2 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"
                  title="Email"
                >
                  <Icon name="Mail" size={20} />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Programa de Interés</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${c.carrera?.color || 'bg-slate-400'}`} />
                    <p className="font-semibold text-slate-700">{c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Medio de Captación</p>
                  <div className="flex items-center gap-2">
                    <Icon name={c.medio?.icono || 'Globe'} size={16} className="text-slate-500" />
                    <p className="text-slate-700">{c.medio?.nombre || 'Web'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tipo de Alumno</p>
                  <p className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${c.tipo_alumno === 'antiguo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                    {c.tipo_alumno === 'antiguo' ? 'Alumno Antiguo' : 'Alumno Nuevo'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Responsable</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-[10px] font-bold text-violet-600">
                      {c.encargado?.nombre?.charAt(0) || '?'}
                    </div>
                    <p className="text-slate-700 font-medium">{c.encargado?.nombre || 'Sin asignar'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notas section */}
          <NotasTextarea
            consulta={c}
            userId={user.id}
            onSaved={() => {
              loadData()
              if (setNotification) {
                setNotification({ type: 'success', message: 'Notas guardadas y registradas en historial' })
                setTimeout(() => setNotification(null), 2000)
              }
            }}
          />

          {/* Historial log */}          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="Activity" size={20} className="text-slate-400" />
              Historial de Actividad
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {(c.acciones || []).length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Sin actividad registrada</p>
              ) : (
                c.acciones.map((acc, idx) => (
                  <div key={acc.id || idx} className="flex gap-4 relative">
                    {idx !== (c.acciones || []).length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-100" />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${acc.tipo === 'creacion' ? 'bg-blue-100 text-blue-600' :
                      acc.tipo === 'cambio_estado' ? 'bg-amber-100 text-amber-600' :
                        acc.tipo === 'matricula' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      <Icon name={acc.tipo === 'creacion' ? 'Plus' :
                        acc.tipo === 'cambio_estado' ? 'RefreshCw' :
                          acc.tipo === 'matricula' ? 'Check' :
                            'MessageSquare'
                      } size={14} />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-800">{acc.accion}</p>
                        <span className="text-xs text-slate-400">{new Date(acc.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {acc.descripcion && <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border-l-2 border-slate-200">{acc.descripcion}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">Realizado por: {acc.realizado_por_nombre || 'Sistema'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Cambiar Estado</h3>
            <div className="space-y-2">
              {Object.values(ESTADOS).map(est => (
                <button
                  key={est.id}
                  onClick={() => handleEstadoChange(c.id, est.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between group ${c.estado === est.id ? `${est.bg} ${est.text} border-transparent font-bold` : 'bg-white border-slate-100 text-slate-600 hover:border-violet-200 hover:bg-violet-50'}`}
                >
                  <span>{est.label}</span>
                  {c.estado === est.id && <Icon name="Check" size={16} />}
                </button>
              ))}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <button onClick={() => store.toggleMatricula(c.id, user.id)}
                  className={`w-full px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${c.matriculado ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  <Icon name={c.matriculado ? 'CheckCircle' : 'GraduationCap'} size={20} />
                  {c.matriculado ? '¡Matriculado!' : 'Marcar Matriculado'}
                </button>
              </div>
              {!c.matriculado && (
                <button onClick={() => store.toggleDescarte(c.id, user.id)}
                  className={`w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${c.descartado ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {c.descartado ? 'Reactivar Lead' : 'Descartar Lead'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Tipo de Alumno</h3>
            <div className="flex gap-2">
              <button onClick={() => handleTipoAlumnoChange(c.id, 'nuevo')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${c.tipo_alumno === 'nuevo' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                Nuevo
              </button>
              <button onClick={() => handleTipoAlumnoChange(c.id, 'antiguo')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${c.tipo_alumno === 'antiguo' ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                Antiguo
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              <button onClick={() => handleEnviarEmail(c.id)}
                disabled={c.emails_enviados >= 2}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${c.emails_enviados >= 2 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                <Icon name="Mail" size={20} />
                Registrar Email ({c.emails_enviados}/2)
              </button>
              <a href={`tel:${c.telefono}`}
                onClick={() => {
                  store.registrarAccionContacto(c.id, user?.id, 'llamada')
                  loadData()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                <Icon name="Phone" size={20} />
                Llamar
              </a>
              <a href={`https://wa.me/${c.telefono?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                onClick={() => {
                  store.registrarAccionContacto(c.id, user?.id, 'whatsapp')
                  loadData()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                <Icon name="MessageCircle" size={20} />
                WhatsApp
              </a>
              <a href={`mailto:${c.email}`}
                onClick={() => {
                  store.registrarAccionContacto(c.id, user?.id, 'email')
                  loadData()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors">
                <Icon name="Mail" size={20} />
                Enviar Email
              </a>
            </div>

            {/* Botones de copiar */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2">Copiar al portapapeles</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.telefono || '')
                    store.registrarAccionContacto(c.id, user?.id, 'copiar_telefono')
                    loadData()
                    if (setNotification) {
                      setNotification({ type: 'info', message: 'Teléfono copiado' })
                      setTimeout(() => setNotification(null), 2000)
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm"
                >
                  <Icon name="Copy" size={14} />
                  Teléfono
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.email || '')
                    store.registrarAccionContacto(c.id, user?.id, 'copiar_email')
                    loadData()
                    if (setNotification) {
                      setNotification({ type: 'info', message: 'Email copiado' })
                      setTimeout(() => setNotification(null), 2000)
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm"
                >
                  <Icon name="Copy" size={14} />
                  Email
                </button>
              </div>
            </div>
          </div>

          {isKeyMaster && !c.matriculado && !c.descartado && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Reasignar</h3>
              <select value={c.asignado_a || ''}
                onChange={(e) => handleReasignar(c.id, e.target.value || null)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Sin asignar</option>
                {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default DetalleView
