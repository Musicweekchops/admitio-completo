import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { ModalFormulario } from '../components/FormularioEditor'
import * as store from '../lib/store'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useLockLead } from '../hooks/useLockLead'
import { ESTADOS, CARRERAS, MEDIOS, TIPOS_ALUMNO } from '../data/mockData'

// Modularized Views
import ReportesViewComponent from '../components/ReportesView'
import FormulariosViewComponent from '../components/FormulariosView'
import ConfiguracionViewComponent from '../components/ConfiguracionView'
import ImportarViewComponent from '../components/ImportarView'

// Componente separado para el input de búsqueda (evita re-renders pesados al escribir)
const SearchInput = ({ initialValue, onSearchChange }) => {
  const [value, setValue] = useState(initialValue || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(value)
    }, 400) // 400ms de debounce para fluidez total
    return () => clearTimeout(timer)
  }, [value, onSearchChange])

  return (
    <div className="flex-1 min-w-[200px] relative">
      <Icon name="Search" className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" size={20} />
      <input 
        type="text" 
        placeholder="Buscar por nombre o email..."
        value={value} 
        onChange={(e) => setValue(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" 
      />
    </div>
  )
}

// Componente separado para el textarea de notas (evita re-renders)
const NotasTextarea = ({ consulta, userId, onSaved, disabled = false, lockedByName = null }) => {
  const [notas, setNotas] = useState(consulta?.notas || '')
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    setNotas(consulta?.notas || '')
    setSaved(true)
  }, [consulta?.id, consulta?.notas])

  const handleChange = (e) => {
    if (disabled) return
    setNotas(e.target.value)
    setSaved(e.target.value === (consulta?.notas || ''))
  }

  const handleSave = () => {
    if (disabled) return
    if (notas !== (consulta?.notas || '')) {
      store.updateConsulta(consulta.id, { notas }, userId)
      setSaved(true)
      if (onSaved) onSaved()
    }
  }

  return (
    <div className={`bg-slate-50 rounded-lg p-4 border ${disabled ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Icon name="FileText" size={16} />
          Notas de seguimiento
        </label>
        {!saved && !disabled && (
          <span className="text-xs text-amber-600">Sin guardar</span>
        )}
        {disabled && lockedByName && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <Icon name="Lock" size={12} />
            Bloqueado por {lockedByName}
          </span>
        )}
      </div>
      <textarea
        value={notas}
        onChange={handleChange}
        onBlur={handleSave}
        disabled={disabled}
        placeholder={disabled ? "Solo lectura mientras otro usuario edita" : "Escribe notas sobre este lead... (se guardan automáticamente)"}
        className={`w-full h-32 px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-white'}`}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-400">Las notas se guardan en el historial</p>
        <button
          onClick={handleSave}
          disabled={saved || disabled}
          className={`px-3 py-1 text-sm rounded-lg font-medium flex items-center gap-1 ${saved ? 'bg-slate-100 text-slate-400' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
        >
          <Icon name="Save" size={14} />
          {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

const DetalleViewComponent = ({
  selectedConsulta,
  setSelectedConsulta,
  user,
  isKeyMaster,
  setNotification,
  setActiveTab,
  loadData,
  reloadFromSupabase,
  ESTADOS,
  CARRERAS,
  MEDIOS,
  formatDate,
  canEdit,
  handleUpdateEstado,
  handleTipoAlumnoChange,
  handleEnviarEmail,
  handleReasignar,
  useLockLead,
  NotasTextarea,
  InfoCard
}) => {
  if (!selectedConsulta) return null
  const c = selectedConsulta
  const encargados = store.getUsuarios().filter(u => u.rol_id === 'encargado')

  // Sistema de bloqueo de leads
  const {
    lockInfo,
    isLocked,
    isMyLock,
    loading: lockLoading,
    lockedByName,
    lockedSince,
    acquireLock,
    releaseLock,
    forceAcquireLock
  } = useLockLead(c.id, user, isKeyMaster)

  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saving', 'saved', 'error'
  const [showForceConfirm, setShowForceConfirm] = useState(false)

  // Calcular tiempo desde el bloqueo
  const getTimeSinceLock = () => {
    if (!lockedSince) return ''
    const diff = Date.now() - new Date(lockedSince).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'hace unos segundos'
    if (minutes === 1) return 'hace 1 minuto'
    if (minutes < 60) return `hace ${minutes} minutos`
    const hours = Math.floor(minutes / 60)
    return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  }

  // Iniciar edición (adquirir lock)
  const handleStartEditing = async () => {
    const result = await acquireLock()
    if (result.success) {
      setIsEditing(true)
      setNotification({ type: 'info', message: 'Modo edición activado' })
      setTimeout(() => setNotification(null), 2000)
    } else {
      setNotification({ type: 'error', message: result.error || 'No se pudo iniciar edición' })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  // Guardar y cerrar edición
  const handleGuardarYCerrar = async () => {
    if (!canEdit || !isMyLock) {
      setNotification({ type: 'error', message: 'No tienes permiso para editar' })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    setSaveStatus('saving')

    try {
      await releaseLock()
      setSaveStatus('saved')
      setNotification({ type: 'success', message: '✓ Cambios guardados' })
      loadData()
      setTimeout(() => {
        setNotification(null)
        setSaveStatus(null)
        setIsEditing(false)
      }, 1000)
    } catch (error) {
      setSaveStatus('error')
      setNotification({ type: 'error', message: 'Error al guardar. Intenta de nuevo.' })
      setTimeout(() => {
        setNotification(null)
        setSaveStatus(null)
      }, 3000)
    }
  }

  // Cancelar edición (descartar cambios)
  const handleCancelarEdicion = async () => {
    await reloadFromSupabase()
    loadData()
    await releaseLock()
    setIsEditing(false)
    const updated = store.getConsultaById(c.id)
    if (updated) setSelectedConsulta(updated)
    setNotification({ type: 'info', message: 'Cambios descartados' })
    setTimeout(() => setNotification(null), 2000)
  }

  // KeyMaster toma control
  const handleForceControl = async () => {
    const result = await forceAcquireLock(c.nombre)
    setShowForceConfirm(false)
    if (result.success) {
      setIsEditing(true)
      setNotification({
        type: 'warning',
        message: `Control tomado. ${result.previousUser} fue notificado.`
      })
      setTimeout(() => setNotification(null), 3000)
    } else {
      setNotification({ type: 'error', message: result.error })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  // Handler para confirmar contacto por nuevo interés
  const handleConfirmarNuevoInteres = () => {
    store.confirmarContactoNuevoInteres(c.id, user.id)
    loadData()
    const updated = store.getConsultaById(c.id)
    if (updated) setSelectedConsulta(updated)
    setNotification({ type: 'success', message: 'Contacto confirmado' })
    setTimeout(() => setNotification(null), 2000)
  }

  // Limpiar lock al salir de la vista
  const handleBack = async () => {
    if (isMyLock) {
      await releaseLock()
    }
    setSelectedConsulta(null)
    setActiveTab('consultas')
    store.reloadStore()
    loadData()
  }

  return (
    <div className="space-y-6">
      <button onClick={handleBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
        <Icon name="ArrowLeft" size={20} /> Volver
      </button>

      {!lockLoading && (
        <div className={`rounded-xl p-4 border ${isMyLock
          ? 'bg-emerald-50 border-emerald-200'
          : isLocked
            ? 'bg-amber-50 border-amber-200'
            : 'bg-slate-50 border-slate-200'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMyLock
                ? 'bg-emerald-100'
                : isLocked
                  ? 'bg-amber-100'
                  : 'bg-slate-100'
                }`}>
                <Icon
                  name={isMyLock ? 'Edit' : isLocked ? 'Lock' : 'Unlock'}
                  className={isMyLock ? 'text-emerald-600' : isLocked ? 'text-amber-600' : 'text-slate-500'}
                  size={20}
                />
              </div>
              <div>
                {isMyLock ? (
                  <>
                    <h4 className="font-semibold text-emerald-800">Estás editando este lead</h4>
                    <p className="text-sm text-emerald-600">Otros usuarios no pueden modificarlo mientras editas</p>
                  </>
                ) : isLocked ? (
                  <>
                    <h4 className="font-semibold text-amber-800">
                      <Icon name="User" size={14} className="inline mr-1" />
                      {lockedByName} está editando este lead
                    </h4>
                    <p className="text-sm text-amber-600">{getTimeSinceLock()} · Solo lectura</p>
                  </>
                ) : (
                  <>
                    <h4 className="font-semibold text-slate-700">Lead disponible para edición</h4>
                    <p className="text-sm text-slate-500">Haz clic en "Editar" para comenzar</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isMyLock ? (
                <>
                  <button
                    onClick={handleGuardarYCerrar}
                    disabled={saveStatus === 'saving'}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${saveStatus === 'saving'
                      ? 'bg-slate-300 text-slate-500 cursor-wait'
                      : saveStatus === 'saved'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                  >
                    <Icon name={saveStatus === 'saving' ? 'Loader' : saveStatus === 'saved' ? 'Check' : 'Save'} size={16} />
                    {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? '¡Guardado!' : 'Guardar y Cerrar'}
                  </button>
                  <button
                    onClick={handleCancelarEdicion}
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors flex items-center gap-2"
                  >
                    <Icon name="X" size={16} />
                    Cancelar
                  </button>
                </>
              ) : isLocked ? (
                <>
                  <span className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Icon name="Eye" size={14} />
                    Solo lectura
                  </span>
                  {isKeyMaster && (
                    <button
                      onClick={() => setShowForceConfirm(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <Icon name="AlertTriangle" size={16} />
                      Tomar control
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleStartEditing}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
                >
                  <Icon name="Edit" size={16} />
                  Editar lead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showForceConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Icon name="AlertTriangle" className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">¿Tomar control del lead?</h3>
                <p className="text-sm text-slate-500">{lockedByName} perderá acceso de edición</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              Esta acción quedará registrada en el historial del lead. {lockedByName} verá que tomaste el control.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForceConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleForceControl}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Icon name="Lock" size={16} />
                Sí, tomar control
              </button>
            </div>
          </div>
        </div>
      )}

      {c.nuevo_interes && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Icon name="Music" className="text-violet-600" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-violet-800">¡Nuevo Interés Detectado!</h4>
                <p className="text-sm text-violet-600">
                  Este lead cambió su instrumento de interés. Considera esto como una nueva intención de matrícula.
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirmarNuevoInteres}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
            >
              <Icon name="Check" size={16} />
              Confirmar Contacto
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-800">{c.nombre}</h2>
                  {c.tipo_alumno === 'antiguo' && (
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 text-sm rounded-full">Alumno Antiguo</span>
                  )}
                </div>
                <p className="text-slate-500">{c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${ESTADOS[c.estado]?.bg} ${ESTADOS[c.estado]?.text}`}>
                {ESTADOS[c.estado]?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <InfoCard icon="Mail" label="Email" value={c.email} iconColor="text-blue-500" copiable leadId={c.id} />
              <InfoCard icon="Phone" label="Teléfono" value={c.telefono} iconColor="text-green-500" copiable leadId={c.id} />
              <InfoCard icon={c.medio?.icono || 'Globe'} label="Medio" value={c.medio?.nombre} iconColor={c.medio?.color} />
              <InfoCard icon="Calendar" label="Fecha ingreso" value={formatDate(c.created_at)} iconColor="text-slate-400" />
              <InfoCard
                icon={c.origen_entrada === 'secretaria' ? 'UserPlus' : c.origen_entrada === 'formulario' ? 'FileCode' : 'Edit'}
                label="Ingresado por"
                value={c.origen_entrada === 'secretaria' ? `Secretaría (${c.creado_por_nombre || ''})` :
                  c.origen_entrada === 'formulario' ? 'Formulario Web' :
                    c.creado_por_nombre || 'Manual'}
                iconColor={c.origen_entrada === 'secretaria' ? 'text-violet-500' : 'text-slate-400'}
              />
              <InfoCard
                icon="Music"
                label="Tipo alumno"
                value={c.tipo_alumno === 'nuevo' ? 'Alumno Nuevo' : 'Alumno Antiguo'}
                iconColor={c.tipo_alumno === 'nuevo' ? 'text-blue-500' : 'text-violet-500'}
              />
            </div>

            {c.carreras_interes && c.carreras_interes.length > 1 && (
              <div className="mb-6 p-4 bg-violet-50 rounded-xl">
                <p className="text-sm font-medium text-violet-700 mb-2 flex items-center gap-2">
                  <Icon name="Music" size={16} />
                  Carreras de interés ({c.carreras_interes.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {c.carreras_interes.map(carreraId => {
                    const carrera = CARRERAS.find(ca => ca.id === carreraId)
                    return carrera ? (
                      <span key={carreraId}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${carreraId === c.carrera_id
                            ? 'bg-violet-600 text-white'
                            : 'bg-violet-100 text-violet-700'
                          }`}>
                        {carrera.nombre}
                        {carreraId === c.carrera_id && ' (principal)'}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}

            <NotasTextarea
              consulta={c}
              userId={user.id}
              disabled={!isMyLock}
              lockedByName={isLocked && !isMyLock ? lockedByName : null}
              onSaved={() => {
                setSelectedConsulta(store.getConsultaById(c.id))
                loadData()
              }}
            />
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Historial de Actividad</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {c.actividad?.length > 0 ? c.actividad.map((a, i) => (
                <div key={a.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${a.tipo === 'matriculado' ? 'bg-emerald-100 text-emerald-600' :
                        a.tipo === 'descartado' ? 'bg-red-100 text-red-600' :
                          a.tipo === 'cambio_estado' ? 'bg-blue-100 text-blue-600' :
                            a.tipo === 'email_enviado' ? 'bg-amber-100 text-amber-600' :
                              a.tipo === 'cambio_tipo' ? 'bg-violet-100 text-violet-600' :
                                a.tipo === 'nota' ? 'bg-slate-100 text-slate-600' :
                                  'bg-slate-100 text-slate-600'
                      }`}>
                      <Icon name={
                        a.tipo === 'matriculado' ? 'Check' :
                          a.tipo === 'descartado' ? 'X' :
                            a.tipo === 'email_enviado' ? 'Mail' :
                              a.tipo === 'cambio_tipo' ? 'UserCheck' :
                                a.tipo === 'nota' ? 'FileText' :
                                  'Activity'
                      } size={16} />
                    </div>
                    {i < c.actividad.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      {a.user_nombre && (
                        <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                          {a.user_nombre}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>
                    </div>
                    <p className="text-slate-800 text-sm">{a.descripcion}</p>
                  </div>
                </div>
              )) : (
                <p className="text-slate-400 text-center py-4">Sin actividad registrada</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {canEdit && !c.matriculado && !c.descartado && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Cambiar Estado</h3>
              <div className="space-y-2">
                {c.estado !== 'nueva' && (
                  <button onClick={() => handleUpdateEstado(c.id, 'nueva')}
                    className="w-full px-4 py-3 rounded-lg text-left bg-blue-500 text-white hover:bg-blue-600 cursor-pointer font-medium">
                    Nueva Consulta
                  </button>
                )}
                {c.estado !== 'contactado' && (
                  <button onClick={() => handleUpdateEstado(c.id, 'contactado')}
                    className="w-full px-4 py-3 rounded-lg text-left bg-amber-500 text-white hover:bg-amber-600 cursor-pointer font-medium">
                    Contactado
                  </button>
                )}
                {c.estado !== 'seguimiento' && (
                  <button onClick={() => handleUpdateEstado(c.id, 'seguimiento')}
                    className="w-full px-4 py-3 rounded-lg text-left bg-purple-500 text-white hover:bg-purple-600 cursor-pointer font-medium">
                    En Seguimiento
                  </button>
                )}
                {c.estado !== 'examen_admision' && (
                  <button onClick={() => handleUpdateEstado(c.id, 'examen_admision')}
                    className="w-full px-4 py-3 rounded-lg text-left bg-cyan-500 text-white hover:bg-cyan-600 cursor-pointer font-medium">
                    Examen de Admisión
                  </button>
                )}
                <button onClick={() => handleUpdateEstado(c.id, 'matriculado')}
                  className="w-full px-4 py-3 rounded-lg text-left bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer font-medium">
                  ✓ Matriculado
                </button>
                <button onClick={() => handleUpdateEstado(c.id, 'descartado')}
                  className="w-full px-4 py-3 rounded-lg text-left bg-red-500 text-white hover:bg-red-600 cursor-pointer font-medium">
                  ✗ Descartado
                </button>
              </div>
            </div>
          )}

          {canEdit && !c.matriculado && !c.descartado && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Tipo de Alumno</h3>
              <div className="flex gap-2">
                <button onClick={() => handleTipoAlumnoChange(c.id, 'nuevo')}
                  className={`flex-1 px-4 py-3 rounded-lg text-center transition-colors ${c.tipo_alumno === 'nuevo' ? 'bg-blue-500 text-white ring-2 ring-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} cursor-pointer`}>
                  Nuevo
                </button>
                <button onClick={() => handleTipoAlumnoChange(c.id, 'antiguo')}
                  className={`flex-1 px-4 py-3 rounded-lg text-center transition-colors ${c.tipo_alumno === 'antiguo' ? 'bg-violet-500 text-white ring-2 ring-violet-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} cursor-pointer`}>
                  Antiguo
                </button>
              </div>
            </div>
          )}

          {canEdit && !c.matriculado && !c.descartado && (
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
                  onClick={() => { store.registrarAccionContacto(c.id, user?.id, 'llamada'); loadData(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">
                  <Icon name="Phone" size={20} /> Llamar
                </a>
                <a href={`https://wa.me/${c.telefono?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  onClick={() => { store.registrarAccionContacto(c.id, user?.id, 'whatsapp'); loadData(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                  <Icon name="MessageCircle" size={20} /> WhatsApp
                </a>
                <a href={`mailto:${c.email}`}
                  onClick={() => { store.registrarAccionContacto(c.id, user?.id, 'email'); loadData(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100">
                  <Icon name="Mail" size={20} /> Enviar Email
                </a>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-2">Copiar al portapapeles</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(c.telefono || ''); store.registrarAccionContacto(c.id, user?.id, 'copiar_telefono'); loadData(); setNotification({ type: 'info', message: 'Teléfono copiado' }); setTimeout(() => setNotification(null), 2000); }}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm">
                    <Icon name="Copy" size={14} /> Teléfono
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(c.email || ''); store.registrarAccionContacto(c.id, user?.id, 'copiar_email'); loadData(); setNotification({ type: 'info', message: 'Email copiado' }); setTimeout(() => setNotification(null), 2000); }}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm">
                    <Icon name="Copy" size={14} /> Email
                  </button>
                </div>
              </div>
            </div>
          )}

          {isKeyMaster && !c.matriculado && !c.descartado && (
            <div className={`bg-white rounded-xl p-6 shadow-sm border ${isMyLock ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}>
              <h3 className="font-semibold text-slate-800 mb-4">Reasignar</h3>
              <select value={c.asignado_a || ''}
                onChange={(e) => isMyLock && handleReasignar(c.id, e.target.value || null)}
                disabled={!isMyLock}
                className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${!isMyLock ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}>
                <option value="">Sin asignar</option>
                {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



const KanbanView = ({ filteredConsultas, selectConsulta, isKeyMaster, selectedLeads, setSelectedLeads }) => {
  const columnas = [
    { estado: 'nueva', titulo: 'Nuevas', color: 'border-blue-500', filtro: c => c.estado === 'nueva' && !c.matriculado && !c.descartado },
    { estado: 'contactado', titulo: 'Contactados', color: 'border-amber-500', filtro: c => c.estado === 'contactado' && !c.matriculado && !c.descartado },
    { estado: 'seguimiento', titulo: 'Seguimiento', color: 'border-purple-500', filtro: c => c.estado === 'seguimiento' && !c.matriculado && !c.descartado },
    { estado: 'examen_admision', titulo: 'Examen Adm.', color: 'border-cyan-500', filtro: c => c.estado === 'examen_admision' && !c.matriculado && !c.descartado },
    { estado: 'matriculado', titulo: 'Matriculados', color: 'border-emerald-500', filtro: c => c.matriculado },
    { estado: 'descartado', titulo: 'Descartados', color: 'border-red-500', filtro: c => c.descartado },
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columnas.map(col => {
        const leadsColumna = filteredConsultas.filter(col.filtro)
        return (
          <div key={col.estado} className={`flex-shrink-0 w-72 bg-slate-100 rounded-xl p-4 border-t-4 ${col.color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{col.titulo}</h3>
              <span className="px-2 py-1 bg-white rounded-full text-sm font-medium text-slate-600">
                {leadsColumna.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[300px] max-h-[500px] overflow-y-auto">
              {leadsColumna.map(consulta => (
                <div key={consulta.id}
                  onClick={() => selectConsulta(consulta.id)}
                  className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all relative ${consulta.matriculado ? 'ring-2 ring-emerald-200' : ''} ${selectedLeads.includes(consulta.id) ? 'ring-2 ring-violet-500' : ''}`}>
                  {isKeyMaster && (
                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(consulta.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads([...selectedLeads, consulta.id])
                          } else {
                            setSelectedLeads(selectedLeads.filter(id => id !== consulta.id))
                          }
                        }}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-slate-800 text-sm pr-6">{consulta.nombre}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

const ListView = ({ filteredConsultas, selectConsulta, isKeyMaster, selectedLeads, setSelectedLeads, formatDateShort, ESTADOS }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
    <table className="w-full min-w-[900px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          {isKeyMaster && (
            <th className="p-4 w-10">
              <input
                type="checkbox"
                checked={selectedLeads.length === filteredConsultas.length && filteredConsultas.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLeads(filteredConsultas.map(c => c.id))
                  } else {
                    setSelectedLeads([])
                  }
                }}
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
            </th>
          )}
          <th className="text-left p-4 text-sm font-medium text-slate-600">Nombre</th>
          <th className="text-left p-4 text-sm font-medium text-slate-600">Contacto</th>
          <th className="text-left p-4 text-sm font-medium text-slate-600">Carrera</th>
          <th className="text-center p-4 text-sm font-medium text-slate-600">Tipo</th>
          <th className="text-center p-4 text-sm font-medium text-slate-600">Estado</th>
          {isKeyMaster && <th className="text-left p-4 text-sm font-medium text-slate-600">Encargado</th>}
          <th className="text-center p-4 text-sm font-medium text-slate-600">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {filteredConsultas.map(c => (
          <tr
            key={c.id}
            onClick={() => selectConsulta(c.id)}
            className={`border-b border-slate-50 hover:bg-violet-50 cursor-pointer transition-colors ${selectedLeads.includes(c.id) ? 'bg-violet-50' : ''}`}
          >
            {isKeyMaster && (
              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedLeads.includes(c.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeads([...selectedLeads, c.id])
                    } else {
                      setSelectedLeads(selectedLeads.filter(id => id !== c.id))
                    }
                  }}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
              </td>
            )}
            <td className="p-4">
              <div className="flex items-center gap-2">
                {c.matriculado && <Icon name="CheckCircle" size={14} className="text-emerald-500" />}
                {c.descartado && <Icon name="XCircle" size={14} className="text-slate-400" />}
                <div>
                  <p className="font-medium text-slate-800">{c.nombre}</p>
                  <p className="text-xs text-slate-400">{formatDateShort(c.created_at)}</p>
                </div>
              </div>
            </td>
            <td className="p-4">
              <p className="text-sm text-slate-600">{c.email}</p>
              <p className="text-xs text-slate-400">{c.telefono}</p>
            </td>
            <td className="p-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c.carrera?.color || 'bg-slate-400'}`} />
                <span className="text-sm text-slate-600">{c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'}</span>
              </div>
            </td>
            <td className="p-4 text-center">
              <span className={`px-2 py-1 rounded-full text-xs ${c.tipo_alumno === 'antiguo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                {c.tipo_alumno === 'antiguo' ? 'Antiguo' : 'Nuevo'}
              </span>
            </td>
            <td className="p-4 text-center">
              {c.matriculado ? (
                <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">Matriculado</span>
              ) : c.descartado ? (
                <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">Descartado</span>
              ) : (
                <span className={`px-2 py-1 rounded-full text-xs ${ESTADOS[c.estado]?.bg} ${ESTADOS[c.estado]?.text}`}>
                  {ESTADOS[c.estado]?.label}
                </span>
              )}
            </td>
            {isKeyMaster && (
              <td className="p-4 text-sm text-slate-600">{c.encargado?.nombre || '-'}</td>
            )}
            <td className="p-4">
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); selectConsulta(c.id); }}
                  className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg"
                >
                  <Icon name="Eye" size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {filteredConsultas.length === 0 && (
      <div className="p-8 text-center text-slate-400">
        <Icon name="Search" size={32} className="mx-auto mb-2 opacity-50" />
        <p>No hay consultas que coincidan con los filtros</p>
      </div>
    )}
  </div>
)

const ConsultasViewComponent = ({
  isKeyMaster,
  canEdit,
  handleNuevoLead,
  searchTerm,
  setSearchTerm,
  filterCarrera,
  setFilterCarrera,
  filterEstado,
  setFilterEstado,
  filterTipoAlumno,
  setFilterTipoAlumno,
  viewMode,
  setViewMode,
  filteredConsultas,
  selectConsulta,
  formatDateShort,
  selectedLeads,
  setSelectedLeads,
  CARRERAS,
  ESTADOS,
  MEDIOS
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
          <Icon name="Users" className="text-violet-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Consultas</h2>
          <p className="text-slate-500">
            {isKeyMaster ? 'Todas las consultas' : 'Mis leads asignados'}
          </p>
        </div>
      </div>
      {canEdit && (
        <button onClick={handleNuevoLead} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2">
          <Icon name="Plus" size={20} /> Nueva Consulta
        </button>
      )}
    </div>

    {/* Filtros */}
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-4 flex-wrap">
        <SearchInput initialValue={searchTerm} onSearchChange={setSearchTerm} />
        <select value={filterCarrera} onChange={(e) => setFilterCarrera(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="todas">Todas las carreras</option>
          {CARRERAS.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        </select>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="todos">Todos los estados</option>
          {Object.values(ESTADOS).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <select value={filterTipoAlumno} onChange={(e) => setFilterTipoAlumno(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="todos">Todos los tipos</option>
          <option value="nuevo">Alumnos Nuevos</option>
          <option value="antiguo">Alumnos Antiguos</option>
        </select>
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          <button onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400'}`}>
            <Icon name="LayoutGrid" size={20} />
          </button>
          <button onClick={() => setViewMode('lista')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'lista' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400'}`}>
            <Icon name="List" size={20} />
          </button>
        </div>
      </div>
    </div>

    {viewMode === 'kanban' ? (
      <KanbanView
        filteredConsultas={filteredConsultas}
        selectConsulta={selectConsulta}
        isKeyMaster={isKeyMaster}
        selectedLeads={selectedLeads}
        setSelectedLeads={setSelectedLeads}
        formatDateShort={formatDateShort}
        MEDIOS={MEDIOS}
      />
    ) : (
      <ListView
        filteredConsultas={filteredConsultas}
        selectConsulta={selectConsulta}
        isKeyMaster={isKeyMaster}
        selectedLeads={selectedLeads}
        setSelectedLeads={setSelectedLeads}
        formatDateShort={formatDateShort}
        ESTADOS={ESTADOS}
      />
    )}
  </div>
)

const DashboardViewComponent = ({
  isKeyMaster,
  user,
  metricasGlobales,
  metricas,
  consultas,
  filteredConsultas,
  handleRefreshData,
  navigateToEstado,
  setFilterEstado,
  setActiveTab,
  safeLeadsHoy,
  setShowLeadsHoyModal,
  selectConsulta,
  formatearTiempoRespuesta,
  ESTADOS,
  MEDIOS,
  canEdit,
  handleNuevoLead,
  navigateToMatriculados,
  StatCard
}) => {
  // Fallback: verificar rol directamente
  const esAdmin = isKeyMaster || user?.rol_id === 'keymaster' || user?.rol_id === 'superadmin'

  const stats = esAdmin ? metricasGlobales : metricas

  // Protección: asegurar que consultas sea array
  const safeConsultas = consultas || []

  // Valores por defecto si no hay stats
  const defaultStats = {
    total: safeConsultas.length || 0,
    nuevas: safeConsultas.filter(c => c.estado === 'nueva').length || 0,
    contactados: safeConsultas.filter(c => c.estado === 'contactado').length || 0,
    seguimiento: safeConsultas.filter(c => c.estado === 'seguimiento').length || 0,
    examen_admision: safeConsultas.filter(c => c.estado === 'examen_admision').length || 0,
    matriculados: safeConsultas.filter(c => c.matriculado).length || 0,
    sinContactar: safeConsultas.filter(c => c.estado === 'nueva' && !c.matriculado).length || 0,
    activos: safeConsultas.filter(c => !c.matriculado && !c.descartado).length || 0,
    tasaConversion: 0
  }

  const safeStats = stats || defaultStats

  // Calcular valores según el rol
  const totalLeads = safeStats.total || 0
  const pendientes = esAdmin ? (safeStats.nuevas || 0) : (safeStats.sinContactar || 0)
  const enProceso = esAdmin
    ? (safeStats.contactados || 0) + (safeStats.seguimiento || 0)
    : (safeStats.activos || 0) - (safeStats.sinContactar || 0) - (safeStats.examen_admision || 0)
  const examenAdm = safeStats.examen_admision || 0
  const matriculados = safeStats.matriculados || 0
  const tasaConv = safeStats.tasaConversion || safeStats.tasa_conversion || 0
  const tiempoResp = safeStats.tiempoRespuestaPromedio || safeStats.tiempo_respuesta_promedio || null
  const tiempoCierre = safeStats.tiempoCierrePromedio || safeStats.tiempo_cierre_promedio || null

  // Calcular tipo de alumnos si no viene en stats
  const alumnosNuevos = safeStats.alumnos_nuevos || filteredConsultas.filter(c => c.tipo_alumno === 'nuevo').length
  const alumnosAntiguos = safeStats.alumnos_antiguos || filteredConsultas.filter(c => c.tipo_alumno === 'antiguo').length

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-900 to-purple-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Icon name="GraduationCap" className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {esAdmin ? 'Panel de Control' : `Hola, ${user?.nombre?.split(' ')[0]}`}
              </h1>
              <p className="text-violet-200">
                {esAdmin ? 'Vista general del sistema' : 'Tu resumen de hoy'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{totalLeads}</p>
            <p className="text-violet-200">{esAdmin ? 'Consultas totales' : 'Leads asignados'}</p>
            {/* Botón de actualizar manual */}
            <button
              onClick={handleRefreshData}
              className="mt-2 p-1.5 rounded-full hover:bg-white/20 transition-colors group"
              title="Actualizar datos"
            >
              <Icon name="RefreshCw" size={14} className="text-violet-200 group-hover:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Clickeables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Pendientes"
          value={pendientes}
          icon="Clock"
          color="amber"
          sub="Requieren atención"
          onClick={() => navigateToEstado('nueva')}
        />
        <StatCard
          title="En Proceso"
          value={enProceso}
          icon="Users"
          color="blue"
          sub="Seguimiento activo"
          onClick={() => { setFilterEstado('todos'); setActiveTab('consultas'); }}
        />
        <StatCard
          title={esAdmin ? "Examen Adm." : "Contactar Hoy"}
          value={esAdmin ? examenAdm : safeLeadsHoy.length}
          icon={esAdmin ? "ClipboardCheck" : "Phone"}
          color="cyan"
          sub={esAdmin ? "Agendados" : "Requieren atención"}
          onClick={() => esAdmin ? navigateToEstado('examen_admision') : setShowLeadsHoyModal(true)}
        />
        <StatCard
          title="Matriculados"
          value={matriculados}
          icon="Check"
          color="emerald"
          sub="Este período"
          onClick={() => navigateToMatriculados()}
        />
        <StatCard
          title="Conversión"
          value={`${tasaConv}%`}
          icon="TrendingUp"
          color="violet"
          sub="Tasa de éxito"
        />
      </div>

      {/* KPIs de Tiempo - Solo si hay datos */}
      {(tiempoResp !== null || tiempoCierre !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiempoResp !== null && (() => {
            const tiempo = formatearTiempoRespuesta(tiempoResp)
            return (
              <div className={`p-4 rounded-xl border ${tiempoResp <= 4 ? 'bg-emerald-50 border-emerald-200' : tiempoResp <= 8 ? 'bg-amber-50 border-amber-200' : tiempoResp <= 24 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tiempo.color.replace('text-', 'bg-').replace('600', '100')} ${tiempo.color}`}>
                    <Icon name="Zap" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tiempo de Respuesta</p>
                    <p className={`text-2xl font-bold ${tiempo.color}`}>
                      {tiempo.texto} <span className="text-base font-normal">promedio</span>
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}
          {tiempoCierre !== null && tiempoCierre > 0 && (() => {
            const color = tiempoCierre <= 7 ? 'text-emerald-600' : tiempoCierre <= 14 ? 'text-blue-600' : tiempoCierre <= 30 ? 'text-amber-600' : 'text-red-600'
            const bgClass = tiempoCierre <= 7 ? 'bg-emerald-50 border-emerald-200' : tiempoCierre <= 14 ? 'bg-blue-50 border-blue-200' : tiempoCierre <= 30 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            return (
              <div className={`p-4 rounded-xl border ${bgClass}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-').replace('600', '100')} ${color}`}>
                    <Icon name="Calendar" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tiempo de Cierre</p>
                    <p className={`text-2xl font-bold ${color}`}>
                      {tiempoCierre} días <span className="text-base font-normal">promedio</span>
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Leads para Hoy */}
      {safeLeadsHoy.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              <Icon name="Bell" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Para Contactar Hoy</h3>
              <p className="text-sm text-slate-500">{safeLeadsHoy.length} lead{safeLeadsHoy.length !== 1 ? 's' : ''} requiere{safeLeadsHoy.length === 1 ? '' : 'n'} tu atención</p>
            </div>
          </div>
          <div className="space-y-2">
            {safeLeadsHoy.slice(0, 5).map(c => (
              <div key={c.id}
                onClick={() => selectConsulta(c.id)}
                className={`flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-all ${c.nuevoInteres ? 'border-l-4 border-violet-500 ring-1 ring-violet-200' :
                  c.atrasado ? 'border-l-4 border-red-400' :
                    'border-l-4 border-amber-400'
                  }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${c.carrera?.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{c.nombre}</p>
                      {c.nuevoInteres && (
                        <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full font-medium flex items-center gap-1">
                          <Icon name="Music" size={10} /> Nuevo Interés
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'} · {ESTADOS[c.estado]?.label}
                      {c.tipo_alumno === 'antiguo' && <span className="ml-2 text-violet-600">• Alumno Antiguo</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.atrasado && !c.nuevoInteres && <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">Atrasado</span>}
                  <Icon name="ChevronRight" size={16} className="text-slate-400" />
                </div>
              </div>
            ))}
            {safeLeadsHoy.length > 5 && (
              <button onClick={() => setActiveTab('consultas')} className="w-full text-center py-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
                Ver todos ({safeLeadsHoy.length}) →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Métricas de tiempo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tiempoResp === null ? 'bg-slate-100 text-slate-400' :
              tiempoResp <= 4 ? 'bg-emerald-100 text-emerald-600' :
                tiempoResp <= 8 ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
              }`}>
              <Icon name="Zap" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tiempo de Respuesta</p>
              <p className="text-2xl font-bold text-slate-800">
                {tiempoResp !== null ? `${tiempoResp}h` : 'Sin datos'}
              </p>
            </div>
          </div>
          {tiempoResp !== null && (
            tiempoResp <= 4 ? (
              <p className="text-sm text-emerald-600">✓ Excelente tiempo</p>
            ) : tiempoResp <= 8 ? (
              <p className="text-sm text-amber-600">⚠ Tiempo aceptable</p>
            ) : (
              <p className="text-sm text-red-600">⚠ Considera responder más rápido</p>
            )
          )}
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Icon name="Calendar" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tiempo de Cierre</p>
              <p className="text-2xl font-bold text-slate-800">
                {tiempoCierre !== null && tiempoCierre > 0 ? `${tiempoCierre} días` : 'Sin datos'}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400">Promedio hasta matrícula</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600">
              <Icon name="UserCheck" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tipo de Alumnos</p>
              <div className="flex gap-4 mt-1">
                <span className="text-lg font-bold text-blue-600">{alumnosNuevos} <span className="text-xs font-normal text-slate-400">Nuevos</span></span>
                <span className="text-lg font-bold text-violet-600">{alumnosAntiguos} <span className="text-xs font-normal text-slate-400">Antiguos</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leads recientes */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Leads Recientes</h3>
          <button onClick={() => setActiveTab('consultas')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
            Ver todos →
          </button>
        </div>
        <div className="space-y-3">
          {filteredConsultas.filter(c => !c.matriculado && !c.descartado).slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => selectConsulta(c.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${c.carrera?.color}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{c.nombre}</p>
                    {c.tipo_alumno === 'antiguo' && (
                      <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-xs rounded">Antiguo</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs ${ESTADOS[c.estado]?.bg} ${ESTADOS[c.estado]?.text}`}>
                  {ESTADOS[c.estado]?.label}
                </span>
                <span className={`${MEDIOS?.find(m => m.id === c.medio_id)?.color || 'text-slate-500'}`}>
                  <Icon name={c.medio?.icono || 'Globe'} size={16} />
                </span>
              </div>
            </div>
          ))}
          {filteredConsultas.filter(c => !c.matriculado && !c.descartado).length === 0 && (
            <p className="text-center text-slate-400 py-4">🎉 No hay leads activos</p>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={handleNuevoLead} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl p-5 text-left hover:from-violet-700 hover:to-purple-700 transition-all">
            <Icon name="Plus" className="mb-3" size={32} />
            <p className="font-semibold">Nueva Consulta</p>
            <p className="text-violet-200 text-sm">Registrar prospecto manualmente</p>
          </button>
          <button onClick={() => setActiveTab('consultas')} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl p-5 text-left hover:from-blue-700 hover:to-cyan-700 transition-all">
            <Icon name="LayoutGrid" className="mb-3" size={32} />
            <p className="font-semibold">Ver Pipeline</p>
            <p className="text-blue-200 text-sm">Gestionar leads en Kanban</p>
          </button>
        </div>
      )}
    </div>
  )
}

const StatCard = ({ title, value, icon, color, sub, onClick }) => {
  const colorClasses = {
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'hover:bg-amber-50' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', hover: 'hover:bg-cyan-50' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'hover:bg-emerald-50' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', hover: 'hover:bg-violet-50' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', hover: 'hover:bg-slate-50' },
    red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50' },
  }
  const c = colorClasses[color] || colorClasses.slate

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center ${c.text}`}>
          <Icon name={icon} size={24} />
        </div>
      </div>
      {sub && <p className={`${c.text} text-sm mt-2`}>{sub}</p>}
    </>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-left transition-all ${c.hover} hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}>
        {content}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      {content}
    </div>
  )
}

const InfoCard = ({ icon, label, value, iconColor, copiable, leadId }) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group relative">
      <div className={`w-10 h-10 ${iconColor} bg-white rounded-lg flex items-center justify-center shadow-sm`}>
        <Icon name={icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-700 truncate">{value || '-'}</p>
      </div>
      {copiable && value && (
        <button
          onClick={() => handleCopy(value)}
          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Copiar"
        >
          <Icon name={copied ? "Check" : "Copy"} size={14} />
        </button>
      )}
    </div>
  )
}

const HistorialViewComponent = ({ matriculados, descartados, selectConsulta, formatDate, isKeyMaster }) => {
  const [historialTab, setHistorialTab] = useState('matriculados')
  const lista = historialTab === 'matriculados' ? matriculados : descartados

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
          <Icon name="Archive" className="text-slate-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historial</h2>
          <p className="text-slate-500">Leads cerrados (matriculados y descartados)</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setHistorialTab('matriculados')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${historialTab === 'matriculados' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <Icon name="Check" size={16} className="inline mr-2" />
          Matriculados ({matriculados.length})
        </button>
        <button onClick={() => setHistorialTab('descartados')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${historialTab === 'descartados' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <Icon name="X" size={16} className="inline mr-2" />
          Descartados ({descartados.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {lista.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Icon name={historialTab === 'matriculados' ? 'GraduationCap' : 'UserX'} size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay {historialTab === 'matriculados' ? 'matriculados' : 'descartados'} aún</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left p-4 text-sm font-medium text-slate-600">Nombre</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Carrera</th>
                <th className="text-center p-4 text-sm font-medium text-slate-600">Tipo</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Fecha Cierre</th>
                {isKeyMaster && <th className="text-left p-4 text-sm font-medium text-slate-600">Encargado</th>}
                <th className="text-center p-4 text-sm font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium text-slate-800">{c.nombre}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.carrera?.color || 'bg-slate-400'}`} />
                      <span className="text-sm text-slate-600">{c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${c.tipo_alumno === 'antiguo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                      {c.tipo_alumno === 'antiguo' ? 'Antiguo' : 'Nuevo'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{formatDate(c.fecha_cierre)}</td>
                  {isKeyMaster && <td className="p-4 text-sm text-slate-600">{c.encargado?.nombre || '-'}</td>}
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      <button onClick={() => selectConsulta(c.id)}
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg">
                        <Icon name="Eye" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const UsuariosViewComponent = ({
  user,
  usuarios,
  setUsuarios,
  isKeyMaster,
  isSuperAdmin,
  setNotification,
  refreshUsuarios,
  openNewUser,
  openEditUser,
  handleSaveUser,
  handleToggleActivo,
  handleDeactivateUser,
  handleDeleteUser,
  localEditingUser,
  localShowUserModal,
  setLocalShowUserModal,
  localShowDeleteModal,
  setLocalShowDeleteModal,
  localShowDeactivateModal,
  setLocalShowDeactivateModal,
  userFormData,
  setUserFormData,
  migrateToUser,
  setMigrateToUser,
  encargadosParaMigrar,
  ROLES_DISPONIBLES,
  puedeEliminar
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Icon name="Users" className="text-amber-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
            <p className="text-slate-500">Administra los usuarios del sistema</p>
          </div>
        </div>
        <button onClick={openNewUser} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2">
          <Icon name="UserPlus" size={20} /> Invitar Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left p-4 text-sm font-medium text-slate-600">Nombre</th>
              <th className="text-left p-4 text-sm font-medium text-slate-600">Email</th>
              <th className="text-left p-4 text-sm font-medium text-slate-600">Rol</th>
              <th className="text-center p-4 text-sm font-medium text-slate-600">Leads</th>
              <th className="text-center p-4 text-sm font-medium text-slate-600">Estado</th>
              <th className="text-center p-4 text-sm font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => {
              const leadsCount = store.getLeadsPorUsuario(u.id).length
              return (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${u.rol_id === 'keymaster' ? 'bg-violet-500' : u.rol_id === 'rector' ? 'bg-amber-500' : u.rol_id === 'encargado' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                        {u.nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.nombre}</p>
                        <p className="text-xs text-slate-400">ID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.rol_id === 'keymaster' ? 'bg-violet-100 text-violet-700' : u.rol_id === 'rector' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {ROLES_DISPONIBLES.find(r => r.id === u.rol_id)?.nombre || u.rol_id}
                    </span>
                  </td>
                  <td className="p-4 text-center font-medium">{leadsCount}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleToggleActivo(u)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => openEditUser(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Icon name="Edit" size={18} /></button>
                       {puedeEliminar(u) && (
                         <button onClick={() => handleDeleteUser(u)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Icon name="Trash2" size={18} /></button>
                       )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {localShowUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">{localEditingUser ? 'Editar Usuario' : 'Crear Usuario'}</h3>
            <div className="space-y-4">
              <input type="text" value={userFormData.nombre} onChange={e => setUserFormData({ ...userFormData, nombre: e.target.value })} placeholder="Nombre completo" className="w-full px-4 py-2 border rounded-lg" />
              <input type="email" value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} placeholder="Email" className="w-full px-4 py-2 border rounded-lg" disabled={localEditingUser} />
              <select value={userFormData.rol_id} onChange={e => setUserFormData({ ...userFormData, rol_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                {ROLES_DISPONIBLES.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setLocalShowUserModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleSaveUser} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {localShowDeactivateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-red-600">Desactivar Usuario</h3>
            <p className="mb-4">El usuario <b>{localShowDeactivateModal.user.nombre}</b> tiene <b>{localShowDeactivateModal.leadsCount}</b> leads asignados.</p>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Reasignar leads a:</label>
              <select value={migrateToUser} onChange={e => setMigrateToUser(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                <option value="">Seleccionar encargado...</option>
                {encargadosParaMigrar.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setLocalShowDeactivateModal(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleDeactivateUser} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Confirmar y Desactivar</button>
            </div>
          </div>
        </div>
      )}

      {localShowDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-red-600">Eliminar Usuario</h3>
            <p className="mb-4 text-sm text-slate-600">Esta acción es permanente. Si el usuario tiene leads, debes reasignarlos.</p>
            {localShowDeleteModal.leadsCount > 0 && (
              <div className="space-y-4 mb-4">
                <label className="block text-sm font-medium text-slate-700">Reasignar {localShowDeleteModal.leadsCount} leads a:</label>
                <select value={migrateToUser} onChange={e => setMigrateToUser(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500">
                  <option value="">Seleccionar encargado...</option>
                  {encargadosParaMigrar.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setLocalShowDeleteModal(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleDeleteUser} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Confirmar Eliminación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Icon name="Users" className="text-amber-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
            <p className="text-slate-500">Administra los usuarios del sistema</p>
          </div>
        </div>
        <button onClick={openNewUser} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2">
          <Icon name="UserPlus" size={20} /> Invitar Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left p-4 text-sm font-medium text-slate-600">Nombre</th>
              <th className="text-left p-4 text-sm font-medium text-slate-600">Email</th>
              <th className="text-left p-4 text-sm font-medium text-slate-600">Rol</th>
              <th className="text-center p-4 text-sm font-medium text-slate-600">Leads</th>
              <th className="text-center p-4 text-sm font-medium text-slate-600">Estado</th>
              <th className="text-center p-4 text-sm font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => {
              const leadsCount = store.getLeadsPorUsuario(u.id).length
              return (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${u.rol_id === 'keymaster' ? 'bg-violet-500' : u.rol_id === 'rector' ? 'bg-amber-500' : u.rol_id === 'encargado' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                        {u.nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.nombre}</p>
                        <p className="text-xs text-slate-400">ID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.rol_id === 'keymaster' ? 'bg-violet-100 text-violet-700' : u.rol_id === 'rector' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {ROLES_DISPONIBLES.find(r => r.id === u.rol_id)?.nombre || u.rol_id}
                    </span>
                  </td>
                  <td className="p-4 text-center font-medium">{leadsCount}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleToggleActivo(u)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEditUser(u)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg"><Icon name="Edit" size={18} /></button>
                      {puedeEliminar(u) && <button onClick={() => setLocalShowDeleteModal({ user: u, leadsCount })} className="p-2 text-red-400 hover:text-red-600 rounded-lg"><Icon name="Trash2" size={18} /></button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {localShowUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6">{localEditingUser ? 'Editar Usuario' : 'Crear Usuario'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre completo" value={userFormData.nombre} onChange={e => setUserFormData({ ...userFormData, nombre: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="email" placeholder="Email" value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg" disabled={localEditingUser} />
              {!localEditingUser && <input type="password" placeholder="Contraseña" value={userFormData.password} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />}
              <select value={userFormData.rol_id} onChange={e => setUserFormData({ ...userFormData, rol_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                {ROLES_DISPONIBLES.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setLocalShowUserModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleSaveUser} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium">{inviteLoading ? 'Cargando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {localShowDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Eliminar Usuario</h3>
            {localShowDeleteModal.leadsCount > 0 && (
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">Este usuario tiene {localShowDeleteModal.leadsCount} leads. Migrar a:</p>
                <select value={migrateToUser} onChange={e => setMigrateToUser(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Seleccionar...</option>
                  {encargadosParaMigrar.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setLocalShowDeleteModal(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleDeleteUser} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente separado para el modal de nueva consulta (evita re-renders)
const ModalNuevaConsulta = ({ isOpen, onClose, onCreated, isKeyMaster, userId, userRol }) => {
  const { puedeCrearLead, actualizarUso, planInfo } = useAuth()
  const [formData, setFormData] = useState({
    nombre: '', email: '', telefono: '', carrera_id: '', medio_id: 'web', notas: '', asignado_a: '', tipo_alumno: 'nuevo'
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [duplicados, setDuplicados] = useState([])
  const [showDuplicadoAlert, setShowDuplicadoAlert] = useState(false)
  const [selectedDuplicado, setSelectedDuplicado] = useState(null)
  const [showLimiteAlert, setShowLimiteAlert] = useState(false)

  const encargados = store.getUsuarios().filter(u => u.rol_id === 'encargado')
  // Usar carreras de Supabase, fallback a mockData
  const carrerasDisponibles = store.getCarreras().length > 0 ? store.getCarreras() : CARRERAS

  const resetForm = () => {
    setFormData({
      nombre: '', email: '', telefono: '', carrera_id: '', medio_id: 'web', notas: '', asignado_a: '', tipo_alumno: 'nuevo'
    })
    setSuccess(false)
    setDuplicados([])
    setShowDuplicadoAlert(false)
    setSelectedDuplicado(null)
  }

  // Verificar duplicados cuando cambia nombre, email o teléfono
  const verificarDuplicados = () => {
    if (formData.nombre.length >= 3 || formData.email.length >= 5) {
      const encontrados = store.buscarDuplicados(formData.nombre, formData.email, formData.telefono)
      setDuplicados(encontrados)
      return encontrados
    }
    setDuplicados([])
    return []
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Verificar duplicados antes de crear
    const encontrados = verificarDuplicados()

    if (encontrados.length > 0) {
      setShowDuplicadoAlert(true)
      setSelectedDuplicado(encontrados[0]) // Mostrar el primer duplicado
      return
    }

    // No hay duplicados, crear normalmente
    crearLeadNuevo()
  }

  const crearLeadNuevo = () => {
    // Verificar límite del plan
    if (puedeCrearLead && !puedeCrearLead()) {
      setShowLimiteAlert(true)
      return
    }

    setSubmitting(true)

    const carreraSeleccionada = carrerasDisponibles.find(c => String(c.id) === String(formData.carrera_id))

    const newConsulta = store.createConsulta({
      ...formData,
      carrera_id: formData.carrera_id || null,  // Mantener como string (UUID)
      carrera_nombre: carreraSeleccionada?.nombre || null,  // Guardar nombre también
      asignado_a: formData.asignado_a || null
    }, userId, userRol)

    // Actualizar contador de uso
    if (actualizarUso) actualizarUso('leads', 1)

    // Notificar al encargado si se seleccionó uno
    if (formData.asignado_a) {
      const encargado = store.getUsuarios().find(u => u.id === formData.asignado_a)
      if (encargado?.email) {
        notifyAssignment({
          encargadoId: formData.asignado_a,
          encargadoEmail: encargado.email,
          encargadoNombre: encargado.nombre,
          lead: { id: newConsulta.id, nombre: newConsulta.nombre, carrera: newConsulta.carrera_nombre || 'Sin carrera' },
          isBulk: false,
          institucionNombre: nombreInstitucion
        }).catch(e => console.error('Error notificando asignación inicial:', e))
      }
    }

    setSubmitting(false)
    setSuccess(true)

    setTimeout(() => {
      resetForm()
      onClose()
      if (onCreated) onCreated(newConsulta)
    }, 1500)
  }

  const agregarCarreraAExistente = () => {
    if (!selectedDuplicado || !formData.carrera_id) return

    setSubmitting(true)
    const resultado = store.agregarCarreraALead(
      selectedDuplicado.id,
      formData.carrera_id,  // Mantener como string
      userId
    )
    setSubmitting(false)

    if (resultado) {
      setShowDuplicadoAlert(false)
      setSuccess(true)
      setTimeout(() => {
        resetForm()
        onClose()
        if (onCreated) onCreated(resultado)
      }, 1500)
    }
  }

  const crearDeTodasFormas = () => {
    setShowDuplicadoAlert(false)
    crearLeadNuevo()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  // Modal de éxito
  if (success) {
    const encargadoAsignado = formData.asignado_a
      ? encargados.find(e => e.id === formData.asignado_a)?.nombre
      : 'automáticamente'

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="CheckCircle" className="text-emerald-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">¡Lead Registrado!</h3>
          <p className="text-slate-600 mb-2">{formData.nombre}</p>
          <p className="text-sm text-slate-500">
            Asignado a: <span className="font-medium text-violet-600">{encargadoAsignado}</span>
          </p>
        </div>
      </div>
    )
  }

  // Modal de alerta de duplicado
  if (showDuplicadoAlert && selectedDuplicado) {
    const carreraNueva = carrerasDisponibles.find(c => String(c.id) === String(formData.carrera_id))
    const carreraExistente = selectedDuplicado.carrera

    // Mostrar botón "Agregar Carrera" si:
    // 1. Se seleccionó una carrera nueva Y
    // 2. El duplicado no tiene esa carrera (o no tiene carrera)
    const puedeAgregarCarrera = carreraNueva && (
      !carreraExistente ||
      String(carreraNueva.id) !== String(carreraExistente.id) ||
      (selectedDuplicado.carreras_interes && !selectedDuplicado.carreras_interes.includes(carreraNueva.id))
    )

    // Mostrar porcentaje de coincidencia si existe
    const porcentaje = selectedDuplicado.porcentajeCoincidencia || 100
    const tipoCoincidencia = selectedDuplicado.tipoCoincidencia || ['datos']

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="AlertTriangle" className="text-amber-600" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800">¡Posible Duplicado!</h3>
              <p className="text-slate-500 text-sm">
                Coincidencia del {porcentaje}% por {tipoCoincidencia.join(', ')}
              </p>
            </div>
          </div>

          {/* Info del duplicado encontrado */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800">{selectedDuplicado.nombre}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedDuplicado.matriculado ? 'bg-emerald-100 text-emerald-700' :
                  selectedDuplicado.descartado ? 'bg-slate-100 text-slate-600' :
                    'bg-blue-100 text-blue-700'
                }`}>
                {selectedDuplicado.matriculado ? 'Matriculado' :
                  selectedDuplicado.descartado ? 'Descartado' :
                    ESTADOS[selectedDuplicado.estado]?.label || selectedDuplicado.estado}
              </span>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p><Icon name="Mail" size={14} className="inline mr-2" />{selectedDuplicado.email}</p>
              <p><Icon name="Phone" size={14} className="inline mr-2" />{selectedDuplicado.telefono}</p>
              <p><Icon name="Music" size={14} className="inline mr-2" />
                <span className="font-medium">{carreraExistente?.nombre || 'Sin carrera asignada'}</span>
              </p>
              {selectedDuplicado.encargado && (
                <p><Icon name="User" size={14} className="inline mr-2" />Asignado a: {selectedDuplicado.encargado.nombre}</p>
              )}
            </div>

            {/* Mostrar carreras de interés si tiene varias */}
            {selectedDuplicado.carreras_interes && selectedDuplicado.carreras_interes.length > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Carreras de interés actuales:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedDuplicado.carreras_interes.map(cid => {
                    const carr = CARRERAS.find(c => c.id === cid)
                    return carr ? (
                      <span key={cid} className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">
                        {carr.nombre}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Nueva consulta */}
          <div className="bg-violet-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-violet-600 mb-2">Nueva consulta:</p>
            <p className="font-semibold text-violet-800">{formData.nombre}</p>
            <p className="text-sm text-violet-700">
              <Icon name="Music" size={14} className="inline mr-2" />
              Solicita info sobre: <span className="font-medium">{carreraNueva?.nombre || 'Sin seleccionar'}</span>
            </p>
          </div>

          {/* Pregunta y opciones */}
          {puedeAgregarCarrera ? (
            <>
              <p className="text-center text-slate-700 mb-4 font-medium">
                ¿Deseas agregar <span className="text-violet-600">{carreraNueva?.nombre}</span> a su perfil existente?
              </p>
              <div className="flex gap-3">
                <button onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={crearDeTodasFormas}
                  className="flex-1 px-4 py-3 border border-amber-200 text-amber-700 bg-amber-50 rounded-xl font-medium hover:bg-amber-100">
                  Crear Nuevo
                </button>
                <button onClick={agregarCarreraAExistente} disabled={submitting}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Icon name="Plus" size={18} />
                      Agregar Carrera
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-slate-700 mb-4">
                {carreraNueva ? 'Este lead ya tiene interés en esta carrera.' : 'Selecciona una carrera diferente para agregarla.'} ¿Qué deseas hacer?
              </p>
              <div className="flex gap-3">
                <button onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={crearDeTodasFormas}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700">
                  Crear de todas formas
                </button>
              </div>
            </>
          )}

          {/* Mostrar otros duplicados si hay más de uno */}
          {duplicados.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Se encontraron {duplicados.length} coincidencias:</p>
              <div className="flex flex-wrap gap-2">
                {duplicados.map((d, i) => (
                  <button key={d.id}
                    onClick={() => setSelectedDuplicado(d)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedDuplicado?.id === d.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                    {d.nombre} ({d.porcentajeCoincidencia || 100}%)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Formulario principal
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Nueva Consulta</h3>
          <button onClick={handleClose} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Alerta de límite de plan alcanzado */}
        {showLimiteAlert && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Icon name="AlertTriangle" className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium mb-1">
                  Has alcanzado el límite de tu plan
                </p>
                <p className="text-xs text-red-600 mb-3">
                  Tu plan actual permite {planInfo?.limites?.max_leads || 10} leads.
                  Actualiza tu plan para agregar más.
                </p>
                <button
                  onClick={() => {
                    onClose()
                    // Navegar a configuración (se manejará en el padre)
                  }}
                  className="text-sm text-red-700 font-medium hover:text-red-800 underline"
                >
                  Ver opciones de upgrade →
                </button>
              </div>
              <button onClick={() => setShowLimiteAlert(false)} className="text-red-400 hover:text-red-600">
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Alerta de posible duplicado mientras escribe */}
        {duplicados.length > 0 && !showDuplicadoAlert && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <Icon name="AlertTriangle" className="text-amber-600 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-medium">
                Posible duplicado: {duplicados[0].nombre}
              </p>
              <p className="text-xs text-amber-600">
                {duplicados[0].carrera?.nombre} • {duplicados[0].estado}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
            <input type="text" required value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              onBlur={verificarDuplicados}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${duplicados.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                }`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input type="email" required value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onBlur={verificarDuplicados}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${duplicados.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                  }`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
              <input type="tel" required value={formData.telefono}
                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                onBlur={verificarDuplicados}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Carrera *</label>
            <select required value={formData.carrera_id}
              onChange={e => setFormData({ ...formData, carrera_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Seleccionar carrera</option>
              {carrerasDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Alumno</label>
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.tipo_alumno === 'nuevo' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="tipo_alumno_modal" value="nuevo" checked={formData.tipo_alumno === 'nuevo'}
                  onChange={e => setFormData({ ...formData, tipo_alumno: e.target.value })}
                  className="sr-only" />
                <Icon name="UserPlus" size={16} />
                <span className="text-sm font-medium">Nuevo</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.tipo_alumno === 'antiguo' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="tipo_alumno_modal" value="antiguo" checked={formData.tipo_alumno === 'antiguo'}
                  onChange={e => setFormData({ ...formData, tipo_alumno: e.target.value })}
                  className="sr-only" />
                <Icon name="UserCheck" size={16} />
                <span className="text-sm font-medium">Antiguo</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medio de contacto</label>
            <div className="grid grid-cols-3 gap-2">
              {MEDIOS.slice(0, 5).map(m => (
                <label key={m.id} className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.medio_id === m.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="medio_modal" value={m.id} checked={formData.medio_id === m.id}
                    onChange={e => setFormData({ ...formData, medio_id: e.target.value })}
                    className="sr-only" />
                  <Icon name={m.icono} className={m.color} size={16} />
                  <span className="text-xs">{m.nombre}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a</label>
            <select value={formData.asignado_a || ''}
              onChange={e => setFormData({ ...formData, asignado_a: e.target.value || null })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Sin asignar (Auto)</option>
              {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea value={formData.notas}
              onChange={e => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Información adicional..."
              className="w-full h-20 px-4 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                'Registrar Consulta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente simple de gráfico de torta
const PieChart = ({ data, size = 200 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return <div className="text-slate-400 text-center py-8">Sin datos</div>

  let currentAngle = 0
  const paths = data.map((item, i) => {
    const percentage = item.value / total
    const angle = percentage * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    const radius = size / 2 - 10
    const cx = size / 2
    const cy = size / 2

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return (
      <path key={i} d={d} fill={item.color} className="hover:opacity-80 transition-opacity cursor-pointer">
        <title>{item.label}: {item.value} ({(percentage * 100).toFixed(1)}%)</title>
      </path>
    )
  })

  return (
    <svg width={size} height={size} className="mx-auto">
      {paths}
      <circle cx={size / 2} cy={size / 2} r={size / 4} fill="white" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-slate-800">
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="middle" className="text-xs fill-slate-500">
        total
      </text>
    </svg>
  )
}

export default function Dashboard() {
  const { user, institucion, signOut, isKeyMaster, isRector, isEncargado, isAsistente, canViewAll, canEdit, canConfig, canCreateLeads, canReasignar, reloadFromSupabase, planInfo, actualizarUso, puedeCrearLead, puedeCrearUsuario, puedeCrearFormulario, inviteUser, notifyAssignment, resendVerification } = useAuth()

  // Nombre dinámico de la institución
  const nombreInstitucion = institucion?.nombre || user?.institucion_nombre || store.getConfig()?.nombre || 'Mi Institución'
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(isRector ? 'reportes' : 'dashboard')
  const [viewMode, setViewMode] = useState('kanban')
  const [consultas, setConsultas] = useState([])
  const [selectedConsulta, setSelectedConsulta] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showFormEditor, setShowFormEditor] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showLeadsHoyModal, setShowLeadsHoyModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(null)
  const [filterCarrera, setFilterCarrera] = useState('todas')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterTipoAlumno, setFilterTipoAlumno] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [metricas, setMetricas] = useState(null)
  const [metricasGlobales, setMetricasGlobales] = useState(null)
  const [leadsHoy, setLeadsHoy] = useState([])
  const [formularios, setFormularios] = useState([])
  const [embedCode, setEmbedCode] = useState('')
  const [notification, setNotification] = useState(null)
  const [limiteAlerta, setLimiteAlerta] = useState(null) // { tipo: 'leads'|'usuarios'|'formularios', mensaje: '...' }
  const [importacionesPendientes, setImportacionesPendientes] = useState(0) // Para badge del menú
  const [selectedLeads, setSelectedLeads] = useState([]) // Para asignación masiva

  // Estados para sidebar responsive
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Protecciones para arrays que pueden ser undefined durante la carga
  const safeLeadsHoy = leadsHoy || []

  // ============================================
  // FUNCIÓN PARA FORMATEAR TIEMPO PROGRESIVO
  // minutos → horas → días
  // ============================================
  const formatearTiempoRespuesta = (horas) => {
    if (horas === null || horas === undefined || isNaN(horas)) return { valor: '-', unidad: '', color: 'text-slate-400' }

    const minutos = horas * 60

    // Determinar color según tiempo (basado en horas)
    let color = 'text-emerald-600' // Bueno: < 4h
    if (horas > 4 && horas <= 8) color = 'text-amber-500' // Regular: 4-8h
    if (horas > 8 && horas <= 24) color = 'text-orange-500' // Malo: 8-24h
    if (horas > 24) color = 'text-red-600' // Muy malo: > 24h

    // Formato progresivo
    if (minutos < 60) {
      return {
        valor: Math.round(minutos),
        unidad: 'min',
        color,
        texto: `${Math.round(minutos)} min`
      }
    } else if (horas < 24) {
      const h = Math.floor(horas)
      const m = Math.round((horas - h) * 60)
      return {
        valor: horas.toFixed(1),
        unidad: 'hrs',
        color,
        texto: m > 0 ? `${h}h ${m}m` : `${h} hrs`
      }
    } else {
      const dias = horas / 24
      return {
        valor: dias.toFixed(1),
        unidad: 'días',
        color,
        texto: `${dias.toFixed(1)} días`
      }
    }
  }

  // ========== ACTUALIZACIÓN MANUAL + REALTIME ==========
  // Estilo Trello: Realtime para cambios, botón para forzar actualización

  // Función para actualizar manualmente
  const handleRefreshData = async () => {
    if (!isSupabaseConfigured() || !user?.institucion_id) return
    console.log('🔄 Actualizando datos manualmente...')
    try {
      await reloadFromSupabase()
      loadData()
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error actualizando:', error)
    }
  }

  // Supabase Realtime - Solo escucha cambios, no hace polling
  const selectedConsultaRef = useRef(selectedConsulta)

  // Mantener ref actualizado
  useEffect(() => {
    selectedConsultaRef.current = selectedConsulta
  }, [selectedConsulta])

  useEffect(() => {
    if (!isSupabaseConfigured() || !user?.institucion_id) return

    const channelName = `admitio-${user.institucion_id}`
    console.log(`🔌 Conectando Realtime a canal: ${channelName}`)
    
    const channel = supabase
      .channel('admitio-notifications-v4')
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          table: 'lead_notifications'
        },
        async (payload) => {
          console.log('📡 [rt-v4] RECIBIDA:', payload.new)
          
          // Filtrar por institución en el cliente (más robusto)
          if (payload.new?.institucion_id && payload.new.institucion_id !== user.institucion_id) {
            return
          }
          
          if (!selectedConsultaRef.current) {
            console.log('🔄 [rt-v4] Refrescando Dashboard...')
            await reloadFromSupabase()
            store.reloadStore()
            loadData()
            setLastUpdate(new Date())
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [rt-v4] Realtime status:', status)
      })

    // Guardar referencia al canal para usarlo en broadcasts
    window._admitioChannel = channel

    return () => {
      console.log('🔌 Desconectando Realtime...')
      supabase.removeChannel(channel)
      window._admitioChannel = null
    }
  }, [user?.institucion_id])
  // ========================================

  // Cargar importaciones pendientes (solo Enterprise)
  const cargarImportacionesPendientes = async () => {
    if (planInfo?.plan !== 'enterprise') return

    try {
      const { count } = await supabase
        .from('leads_importados')
        .select('*', { count: 'exact', head: true })
        .eq('institucion_id', user?.institucion_id)
        .eq('estado', 'pendiente')

      setImportacionesPendientes(count || 0)
    } catch (e) {
      console.error('Error cargando importaciones pendientes:', e)
    }
  }

  useEffect(() => {
    if (planInfo?.plan === 'enterprise' && user?.institucion_id) {
      cargarImportacionesPendientes()

      // Suscribirse a cambios en leads_importados
      const channel = supabase
        .channel('importaciones-changes')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'leads_importados', filter: `institucion_id=eq.${user.institucion_id}` },
          (payload) => {
            console.log('📥 Nueva importación desde Sheets')
            cargarImportacionesPendientes()

            // Notificar solo si no hay throttling (la función SQL ya controla esto)
            if (payload.new && payload.new.conflicto_detalles?.notificar !== false) {
              setNotification({
                type: 'info',
                message: `Nuevo lead desde Sheets: ${payload.new.datos_raw?.nombre || 'Sin nombre'}`
              })
              setTimeout(() => setNotification(null), 4000)
            }
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
  }, [planInfo?.plan, user?.institucion_id])

  function loadData() {
    console.log('📊 loadData() - Rol:', user?.rol_id, 'isRector:', isRector)

    // Protección: verificar que el store esté listo
    const storeReady = store.getConsultas && typeof store.getConsultas === 'function'
    if (!storeReady) {
      console.warn('⚠️ loadData: store no está listo')
      return
    }

    // Para Rector: cargar TODOS los leads de la institución (para reportes)
    // Para otros roles: usar filtro normal
    let data
    if (isRector) {
      data = store.getConsultasParaReportes() || []
      console.log('📊 Rector - Leads cargados:', data?.length || 0)
      console.log('📊 Rector - Usuarios:', store.getTodosLosUsuarios()?.length || 0)
      console.log('📊 Rector - Encargados:', store.getEncargadosActivos()?.length || 0)
    } else {
      data = store.getConsultas(user?.id, user?.rol_id) || []
    }

    setConsultas(data || [])

    if (isEncargado && user?.id) {
      setMetricas(store.getMetricasEncargado(user.id))
      setLeadsHoy(store.getLeadsContactarHoy(user.id, user.rol_id) || [])
    } else if (isKeyMaster || isRector) {
      // Rector también ve los leads a contactar hoy (para tener contexto)
      setLeadsHoy(store.getLeadsContactarHoy() || [])
    }
    setMetricasGlobales(store.getMetricasGlobales())
    setFormularios(store.getFormularios() || [])
  }

  // Cargar datos inicial y escuchar eventos de datos cargados
  useEffect(() => {
    loadData()

    // Escuchar cuando AuthContext carga datos de Supabase
    const handleDataLoaded = () => {
      console.log('📡 Evento admitio-data-loaded recibido')
      store.reloadStore() // Recargar store desde localStorage
      loadData() // Recargar datos en el Dashboard
    }

    window.addEventListener('admitio-data-loaded', handleDataLoaded)

    // Retry después de 500ms por si el store aún no tenía datos
    const timer = setTimeout(() => {
      store.reloadStore()
      loadData()
    }, 500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('admitio-data-loaded', handleDataLoaded)
    }
  }, [user])

  // Helper para abrir modal de nuevo lead con validación de límite
  const handleNuevoLead = () => {
    if (!puedeCrearLead || !puedeCrearLead()) {
      setLimiteAlerta({
        tipo: 'leads',
        mensaje: `Has alcanzado el límite de ${planInfo?.limites?.max_leads || 10} leads de tu plan ${planInfo?.nombre || 'actual'}. Actualiza tu plan para agregar más leads.`
      })
      return
    }
    setShowModal(true)
  }

  const filteredConsultas = (consultas || []).filter(c => {
    const matchCarrera = filterCarrera === 'todas' || c.carrera?.nombre === filterCarrera

    // Manejar estados especiales (matriculado/descartado)
    let matchEstado = false
    if (filterEstado === 'todos') {
      matchEstado = true
    } else if (filterEstado === 'matriculado') {
      matchEstado = c.matriculado === true
    } else if (filterEstado === 'descartado') {
      matchEstado = c.descartado === true
    } else {
      // Estados normales: solo si NO está matriculado ni descartado
      matchEstado = c.estado === filterEstado && !c.matriculado && !c.descartado
    }

    const matchTipo = filterTipoAlumno === 'todos' || c.tipo_alumno === filterTipoAlumno
    const matchSearch = (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchCarrera && matchEstado && matchTipo && matchSearch
  })

  async function handleUpdateEstado(id, nuevoEstado) {
    // Mostrar feedback inmediato
    setNotification({ type: 'info', message: 'Actualizando estado...' })

    try {
      // Usar versión async que espera confirmación de Supabase
      const result = await store.updateConsultaAsync(id, { estado: nuevoEstado }, user.id)

      if (!result || !result.success) {
        setNotification({ type: 'error', message: result?.error || 'Error al cambiar estado' })
        setTimeout(() => setNotification(null), 4000)
        return
      }

      loadData()
      if (selectedConsulta?.id === id) {
        setSelectedConsulta(store.getConsultaById(id))
      }

      setNotification({ type: 'success', message: `Estado cambiado a "${nuevoEstado}"` })
      setTimeout(() => setNotification(null), 2000)
    } catch (error) {
      console.error('Error cambiando estado:', error)
      // Fallback: usar versión síncrona
      store.updateConsulta(id, { estado: nuevoEstado }, user.id)
      loadData()
      if (selectedConsulta?.id === id) {
        setSelectedConsulta(store.getConsultaById(id))
      }
      setNotification({ type: 'warning', message: 'Estado cambiado (sin confirmar servidor)' })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  function handleEnviarEmail(id) {
    const consulta = store.getConsultaById(id)
    if (consulta.emails_enviados >= 2) {
      alert('Máximo de 2 emails alcanzado')
      return
    }
    store.updateConsulta(id, { emails_enviados: consulta.emails_enviados + 1 }, user.id)
    loadData()
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
  }

  function handleLogout() {
    signOut()
    navigate('/login')
  }

  function navigateToEstado(estado) {
    setFilterEstado(estado)
    setActiveTab('consultas')
    setSelectedConsulta(null)
  }

  function navigateToMatriculados() {
    setFilterEstado('matriculado')
    setActiveTab('consultas')
    setSelectedConsulta(null)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  }

  // ============================================
  // SIDEBAR - Responsive y Colapsable
  // ============================================
  const Sidebar = () => {
    // Restringir pestañas de configuración estricta solo a Admins
    const esAdmin = ['superowner', 'keymaster', 'superadmin'].includes(user?.rol_id)
    const esRector = isRector || user?.rol_id === 'rector'
    const esEncargado = isEncargado || user?.rol_id === 'encargado'

    const navItems = [
      { id: 'dashboard', icon: 'Home', label: 'Dashboard', show: !esRector },
      { id: 'consultas', icon: 'Users', label: 'Consultas', show: !esRector, badge: (consultas || []).filter(c => c.estado === 'nueva').length },
      { id: 'historial', icon: 'Archive', label: 'Historial', show: !esRector },
      { id: 'reportes', icon: 'BarChart', label: esRector ? 'Dashboard' : 'Reportes', show: esAdmin || esRector || esEncargado },
      { id: 'formularios', icon: 'FileCode', label: 'Formularios', show: esAdmin },
      { id: 'usuarios', icon: 'User', label: 'Usuarios', show: esAdmin },
      { id: 'programas', icon: 'GraduationCap', label: 'Carreras/Cursos', show: esAdmin },
      { id: 'importar', icon: 'Upload', label: 'Importar', show: esAdmin },
      { id: 'importaciones_sheets', icon: 'Table', label: 'Google Sheets', show: esAdmin && planInfo?.plan === 'enterprise', badge: importacionesPendientes },
      { id: 'configuracion', icon: 'Settings', label: 'Configuración', show: esAdmin },
    ]

    const handleNavClick = (tabId) => {
      setActiveTab(tabId)
      setSelectedConsulta(null)
      if (tabId === 'dashboard') setFilterEstado('todos')
      setMobileMenuOpen(false) // Cerrar en mobile
    }

    return (
      <>
        {/* Overlay para mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed left-0 top-0 h-full bg-white border-r border-slate-100 flex flex-col z-50
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header con logo */}
          <div className="p-4">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
              <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{nombreInstitucion.charAt(0).toUpperCase()}</span>
                </div>
                {!sidebarCollapsed && (
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-800">{nombreInstitucion}</p>
                    <p className="text-xs text-slate-400">Sistema de Admisión</p>
                  </div>
                )}
              </div>

              {/* Botón cerrar - solo mobile */}
              {!sidebarCollapsed && (
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  title="Cerrar menú"
                >
                  <Icon name="X" size={20} />
                </button>
              )}
            </div>

            {/* Botón colapsar - solo desktop - VISIBLE */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`
                hidden lg:flex w-full items-center justify-center gap-2 p-3 rounded-xl mb-4 transition-all font-medium
                ${sidebarCollapsed
                  ? 'bg-violet-700 text-white hover:bg-violet-800'
                  : 'bg-violet-100 text-violet-700 hover:bg-violet-200 border-2 border-violet-300'}
              `}
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <Icon name={sidebarCollapsed ? 'ChevronRight' : 'ChevronLeft'} size={20} />
              {!sidebarCollapsed && <span className="text-sm">Colapsar</span>}
            </button>

            {/* Navegación */}
            <nav className="space-y-1">
              {navItems.filter(item => item.show).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${sidebarCollapsed ? 'justify-center' : ''}
                    ${activeTab === item.id || (item.id === 'consultas' && activeTab === 'detalle')
                      ? 'bg-violet-50 text-violet-600'
                      : 'text-slate-600 hover:bg-slate-50'}
                  `}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon name={item.icon} size={20} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {sidebarCollapsed && item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Stats rápidos - solo expandido */}
          {!isRector && metricas && !sidebarCollapsed && (
            <div className="mt-auto p-4">
              <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl">
                <p className="text-sm text-slate-600 mb-2">Mi rendimiento</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Asignados</span>
                    <span className="font-bold">{metricas.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Matriculados</span>
                    <span className="font-bold text-emerald-600">{metricas.matriculados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Conversión</span>
                    <span className="font-bold text-violet-600">{metricas.tasaConversion}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User info */}
          <div className="p-4 border-t border-slate-100">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-slate-600 font-medium">{user?.nombre?.charAt(0)}</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{user?.nombre}</p>
                  <p className="text-xs text-slate-400">{user?.rol?.nombre}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className={`p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg ${sidebarCollapsed ? 'mt-2' : ''}`}
                title="Cerrar sesión"
              >
                <Icon name="LogOut" size={18} />
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ============================================
  // MOBILE HEADER
  // ============================================
  const MobileHeader = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-30">
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-sm"
      >
        <Icon name="Menu" size={24} />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">{nombreInstitucion.charAt(0).toUpperCase()}</span>
        </div>
        <span className="font-bold text-slate-800">{nombreInstitucion}</span>
      </div>

      <button
        onClick={handleNuevoLead}
        className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg"
      >
        <Icon name="Plus" size={24} />
      </button>
    </div>
  )

  // ============================================
  // DASHBOARD VIEW - Para Encargados y KeyMaster
  // ============================================
  // ============================================
  // DASHBOARD VIEW - Para Encargados y KeyMaster
  // ============================================
  const DashboardView = () => (
    <DashboardViewComponent
      isKeyMaster={isKeyMaster}
      user={user}
      metricasGlobales={metricasGlobales}
      metricas={metricas}
      consultas={consultas}
      filteredConsultas={filteredConsultas}
      handleRefreshData={handleRefreshData}
      navigateToEstado={navigateToEstado}
      setFilterEstado={setFilterEstado}
      setActiveTab={setActiveTab}
      safeLeadsHoy={safeLeadsHoy}
      setShowLeadsHoyModal={setShowLeadsHoyModal}
      selectConsulta={selectConsulta}
      formatearTiempoRespuesta={formatearTiempoRespuesta}
      ESTADOS={ESTADOS}
      MEDIOS={MEDIOS}
      canEdit={canEdit}
      handleNuevoLead={handleNuevoLead}
      navigateToMatriculados={navigateToMatriculados}
      StatCard={StatCard}
    />
  )

  // ============================================
  // CONSULTAS VIEW (KANBAN + LISTA)
  // ============================================
  // ============================================
  // CONSULTAS VIEW (KANBAN + LISTA)
  // ============================================
  const ConsultasView = () => (
    <ConsultasViewComponent
      isKeyMaster={isKeyMaster}
      canEdit={canEdit}
      handleNuevoLead={handleNuevoLead}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      viewMode={viewMode}
      setViewMode={setViewMode}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      filterEstado={filterEstado}
      setFilterEstado={setFilterEstado}
      filterMedio={filterMedio}
      setFilterMedio={setFilterMedio}
      filterEncargado={filterEncargado}
      setFilterEncargado={setFilterEncargado}
      ESTADOS={ESTADOS}
      MEDIOS={MEDIOS}
      ENCARGADOS={ENCARGADOS}
      filteredConsultas={filteredConsultas}
      selectedLeads={selectedLeads}
      setSelectedLeads={setSelectedLeads}
      handleBulkAssign={handleBulkAssign}
      KanbanView={KanbanView}
      ListView={ListView}
    />
  )

  // ============================================
  // HISTORIAL VIEW
  // ============================================
  // ============================================
  // HISTORIAL VIEW - Matriculados y Descartados
  // ============================================
  const HistorialView = () => (
    <HistorialViewComponent
      matriculados={(consultas || []).filter(c => c.matriculado)}
      descartados={(consultas || []).filter(c => c.descartado)}
      selectConsulta={selectConsulta}
      formatDate={formatDate}
      isKeyMaster={isKeyMaster}
    />
  )

  // Handler para seleccionar consulta
  const selectConsulta = useCallback((id) => {
    const consulta = store.getConsultaById(id)
    setSelectedConsulta(consulta)
    setActiveTab('detalle')
  }, [])

  // Handler para cambiar estado
  const handleEstadoChange = useCallback((id, nuevoEstado) => {
    store.updateConsulta(id, { estado: nuevoEstado }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
    setNotification({ type: 'success', message: `Estado cambiado a "${nuevoEstado}"` })
    setTimeout(() => setNotification(null), 2000)
  }, [selectedConsulta?.id, user?.id])

  // Handler para reasignar
  const handleReasignar = useCallback(async (id, nuevoEncargado) => {
    const encargado = store.getUsuarios().find(u => u.id === nuevoEncargado)
    store.updateConsulta(id, { asignado_a: nuevoEncargado }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }

    // Notificación individual
    if (nuevoEncargado && encargado?.email) {
      const lead = store.getConsultaById(id)
      try {
        await notifyAssignment({
          encargadoId: nuevoEncargado,
          encargadoEmail: encargado.email,
          encargadoNombre: encargado.nombre,
          lead: { id: lead.id, nombre: lead.nombre, carrera: lead.carrera?.nombre || 'Sin carrera' },
          isBulk: false,
          institucionNombre: nombreInstitucion
        })
      } catch (e) {
        console.error('Error notificando asignación:', e)
      }
    }

    loadData()
    setNotification({ type: 'success', message: `Lead asignado a ${encargado?.nombre || 'Sin asignar'}` })
    setTimeout(() => setNotification(null), 3000)
  }, [selectedConsulta?.id, user?.id, nombreInstitucion])

  // Handler para asignación masiva
  const handleBulkAssign = async (encargadoId) => {
    if (!encargadoId || selectedLeads.length === 0) return

    const encargado = store.getUsuarios().find(u => u.id === encargadoId)
    const leadsCount = selectedLeads.length

    // Actualizar cada lead en el store
    selectedLeads.forEach(id => {
      store.updateConsulta(id, { asignado_a: encargadoId }, user.id)
    })

    // Notificación masiva
    if (encargado?.email) {
      try {
        await notifyAssignment({
          encargadoId,
          encargadoEmail: encargado.email,
          encargadoNombre: encargado.nombre,
          leadsCount: leadsCount,
          isBulk: true,
          institucionNombre: nombreInstitucion
        })
      } catch (e) {
        console.error('Error notificando asignación masiva:', e)
      }
    }

    setSelectedLeads([])
    loadData()
    setNotification({ type: 'success', message: `¡${leadsCount} leads asignados a ${encargado?.nombre}!` })
    setTimeout(() => setNotification(null), 3000)
  }

  // Handler para cambiar tipo alumno
  const handleTipoAlumnoChange = useCallback((id, tipo) => {
    store.updateConsulta(id, { tipo_alumno: tipo }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
  }, [selectedConsulta?.id, user?.id])

  // ============================================
  // DETALLE VIEW - Con notas editables y sistema de locks
  // ============================================
  // ============================================
  // DETALLE VIEW - Información completa de un lead
  // ============================================
  const DetalleView = () => (
    <DetalleViewComponent
      selectedConsulta={selectedConsulta}
      setSelectedConsulta={setSelectedConsulta}
      user={user}
      isKeyMaster={isKeyMaster}
      setNotification={setNotification}
      setActiveTab={setActiveTab}
      loadData={loadData}
      reloadFromSupabase={reloadFromSupabase}
      ESTADOS={ESTADOS}
      CARRERAS={CARRERAS}
      MEDIOS={MEDIOS}
      formatDate={formatDate}
      canEdit={canEdit}
      handleUpdateEstado={handleUpdateEstado}
      handleTipoAlumnoChange={handleTipoAlumnoChange}
      handleEnviarEmail={handleEnviarEmail}
      handleReasignar={handleReasignar}
      useLockLead={useLockLead}
      NotasTextarea={NotasTextarea}
      InfoCard={InfoCard}
    />
  )

  // ============================================
  // REPORTES VIEW - Funnel-Centric Dashboard (Rediseño v2)
  // ============================================
  // ReportesView was moved to src/components/ReportesView.jsx

  // ============================================
  // FORMULARIOS VIEW - Editor mejorado sin re-renders
  // ============================================

  // ============================================
  // CONFIGURACIÓN VIEW - Plan y Uso
  // ============================================

  // ============================================
  // IMPORTAR VIEW - Con Historial de Importaciones
  // ============================================




  // ============================================
  // COMPONENTES AUXILIARES
  // ============================================
  const StatCard = ({ title, value, icon, color, sub, onClick }) => {
    const colorClasses = {
      amber: { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'hover:bg-amber-50' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
      cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', hover: 'hover:bg-cyan-50' },
      emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'hover:bg-emerald-50' },
      violet: { bg: 'bg-violet-100', text: 'text-violet-600', hover: 'hover:bg-violet-50' },
      slate: { bg: 'bg-slate-100', text: 'text-slate-600', hover: 'hover:bg-slate-50' },
      red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50' },
    }
    const c = colorClasses[color] || colorClasses.slate

    const content = (
      <>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
          <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center ${c.text}`}>
            <Icon name={icon} size={24} />
          </div>
        </div>
        {sub && <p className={`${c.text} text-sm mt-2`}>{sub}</p>}
      </>
    )

    if (onClick) {
      return (
        <button onClick={onClick} className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-left transition-all ${c.hover} hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}>
          {content}
        </button>
      )
    }

    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        {content}
      </div>
    )
  }

  const InfoCard = ({ icon, label, value, iconColor, copiable, leadId }) => {
    const [copied, setCopied] = React.useState(false)

    const handleCopy = () => {
      if (!value) return
      navigator.clipboard.writeText(value)
      setCopied(true)

      // Registrar acción si es teléfono o email
      if (leadId && (label === 'Teléfono' || label === 'Email')) {
        const tipoAccion = label === 'Teléfono' ? 'copiar_telefono' : 'copiar_email'
        store.registrarAccionContacto(leadId, user?.id, tipoAccion)
        loadData()
      }

      setTimeout(() => setCopied(false), 2000)
    }

    // Detectar copiado con Ctrl+C / Cmd+C
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selection = window.getSelection().toString()
        if (selection && selection.includes(value)) {
          // Registrar acción si es teléfono o email
          if (leadId && (label === 'Teléfono' || label === 'Email')) {
            const tipoAccion = label === 'Teléfono' ? 'copiar_telefono' : 'copiar_email'
            store.registrarAccionContacto(leadId, user?.id, tipoAccion)
            loadData()
          }
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }
    }

    return (
      <div
        className={`flex items-center gap-3 p-3 bg-slate-50 rounded-lg group relative ${copiable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`}
        onClick={copiable ? handleCopy : undefined}
        onKeyDown={copiable ? handleKeyDown : undefined}
        tabIndex={copiable ? 0 : undefined}
      >
        <Icon name={icon} className={iconColor || 'text-slate-400'} size={20} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="font-medium text-slate-800 truncate select-all">{value || '-'}</p>
        </div>
        {copiable && value && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className={`p-1.5 rounded-lg transition-all ${copied
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-300'
              }`}
            title="Copiar"
          >
            <Icon name={copied ? "Check" : "Copy"} size={14} />
          </button>
        )}
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-emerald-600 text-white text-xs rounded shadow-lg">
            ¡Copiado!
          </span>
        )}
      </div>
    )
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  // Vista especial para Asistente (solo crear leads)
  if (isAsistente) {
    // Contar leads creados hoy por este usuario
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const leadsHoyAsistente = store.getConsultas().filter(c => {
      const creado = new Date(c.created_at)
      return creado >= hoy
    }).length

    const ultimoLead = store.getConsultas()[0] // El más reciente

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
                <Icon name="UserPlus" className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Ingresar Nueva Consulta</h1>
              <p className="text-slate-500 mt-1">Hola, {user?.nombre?.split(' ')[0]}</p>
            </div>

            {/* Stats del día */}
            <div className="bg-violet-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-violet-600">Leads ingresados hoy</p>
                  <p className="text-2xl font-bold text-violet-700">{leadsHoyAsistente}</p>
                </div>
                <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                  <Icon name="TrendingUp" className="text-violet-600" size={24} />
                </div>
              </div>
              {ultimoLead && (
                <div className="mt-3 pt-3 border-t border-violet-100">
                  <p className="text-xs text-violet-500">Último registrado:</p>
                  <p className="text-sm font-medium text-violet-700">{ultimoLead.nombre}</p>
                  <p className="text-xs text-violet-500">
                    Asignado a: {ultimoLead.encargado?.nombre || 'Pendiente'}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleNuevoLead}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-3"
            >
              <Icon name="Plus" size={24} />
              Nueva Consulta
            </button>

            <button
              onClick={() => signOut()}
              className="w-full mt-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="LogOut" size={20} />
              Cerrar Sesión
            </button>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            Rol: Asistente • Solo puede ingresar consultas
          </p>
        </div>

        {/* Modal nueva consulta */}
        <ModalNuevaConsulta
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreated={(newLead) => {
            setShowModal(false)
            setNotification({
              type: 'success',
              message: `¡Lead registrado! Asignado a ${newLead?.encargado?.nombre || store.getUsuarioById(newLead?.asignado_a)?.nombre || 'automáticamente'}`
            })
            setTimeout(() => setNotification(null), 4000)
          }}
          isKeyMaster={false}
          userId={user?.id}
          userRol={user?.rol_id}
        />

        {/* Notificación */}
        {notification && (
          <div className="fixed bottom-4 right-4 z-50 animate-bounce">
            <div className="px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 bg-emerald-600 text-white">
              <Icon name="CheckCircle" size={24} />
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal - responsive */}
      <div className={`
        transition-all duration-300
        pt-16 lg:pt-0
        ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
        p-4 lg:p-8
      `}>
        {activeTab === 'dashboard' && <DashboardViewComponent isKeyMaster={isKeyMaster} user={user} metricasGlobales={metricasGlobales} metricas={metricas} consultas={consultas} filteredConsultas={filteredConsultas} handleRefreshData={loadData} navigateToEstado={navigateToEstado} setFilterEstado={setFilterEstado} setActiveTab={setActiveTab} safeLeadsHoy={safeLeadsHoy} setShowLeadsHoyModal={setShowLeadsHoyModal} selectConsulta={selectConsulta} formatearTiempoRespuesta={formatearTiempoRespuesta} ESTADOS={ESTADOS} MEDIOS={MEDIOS} canEdit={canEdit} handleNuevoLead={handleNuevoLead} navigateToMatriculados={navigateToMatriculados} StatCard={StatCard} />}
        {activeTab === 'consultas' && <ConsultasViewComponent isKeyMaster={isKeyMaster} canEdit={canEdit} handleNuevoLead={handleNuevoLead} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterCarrera={filterCarrera} setFilterCarrera={setFilterCarrera} filterEstado={filterEstado} setFilterEstado={setFilterEstado} filterTipoAlumno={filterTipoAlumno} setFilterTipoAlumno={setFilterTipoAlumno} viewMode={viewMode} setViewMode={setViewMode} filteredConsultas={filteredConsultas} selectConsulta={selectConsulta} formatDateShort={formatDateShort} selectedLeads={selectedLeads} setSelectedLeads={setSelectedLeads} CARRERAS={CARRERAS} ESTADOS={ESTADOS} MEDIOS={MEDIOS} />}
        {activeTab === 'detalle' && <DetalleViewComponent consulta={selectedConsulta} user={user} isKeyMaster={isKeyMaster} isSuperAdmin={isRector} onClose={() => setSelectedConsulta(null)} onUpdate={loadData} setNotification={setNotification} handleUpdateEstado={handleUpdateEstado} handleEnviarEmail={handleEnviarEmail} formatDate={formatDate} InfoCard={InfoCard} />}
        {activeTab === 'historial' && <HistorialViewComponent user={user} loadData={loadData} isKeyMaster={isKeyMaster} formatDate={formatDate} />}
        {activeTab === 'reportes' && <ReportesViewComponent user={user} isRector={isRector} consultas={consultas} isKeyMaster={isKeyMaster} nombreInstitucion={nombreInstitucion} />}
        {activeTab === 'formularios' && <FormulariosViewComponent formularios={formularios} reloadFromSupabase={reloadFromSupabase} setNotification={setNotification} puedeCrearFormulario={puedeCrearFormulario} planInfo={planInfo} setLimiteAlerta={setLimiteAlerta} />}
        {activeTab === 'usuarios' && <UsuariosViewComponent user={user} usuarios={store.getUsuarios()} isKeyMaster={isKeyMaster} isSuperAdmin={isRector} setNotification={setNotification} refreshUsuarios={loadData} ROLES_DISPONIBLES={store.getRolesDisponibles?.() || []} puedeEliminar={(u) => u.id !== user.id} />}
        {activeTab === 'importar' && <ImportarViewComponent user={user} reloadFromSupabase={reloadFromSupabase} loadData={loadData} setNotification={setNotification} setShowImportModal={() => setActiveTab('dashboard')} />}
        {activeTab === 'configuracion' && <ConfiguracionViewComponent user={user} planInfo={planInfo} usageData={planInfo?.uso} nombreInstitucion={nombreInstitucion} setNotification={setNotification} setLocalShowPlanModal={() => {}} />}
      </div>

      {/* Barra de Acciones Masivas */}
      {selectedLeads.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-[60] bulk-actions-animate">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
            <span className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedLeads.length}
            </span>
            <span className="font-medium">leads seleccionados</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Asignar a:</span>
            <select
              className="bg-slate-800 border-none rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none"
              onChange={(e) => handleBulkAssign(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Seleccionar encargado...</option>
              {store.getUsuarios().filter(u => ['encargado', 'keymaster', 'director'].includes(u.rol_id)).map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSelectedLeads([])}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Cancelar selección"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
      )}

      {/* Modal nueva consulta */}
      <ModalNuevaConsulta
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => loadData()}
        isKeyMaster={isKeyMaster}
        userId={user?.id}
        userRol={user?.rol_id}
      />

      {/* Modal Leads a Contactar Hoy */}
      {showLeadsHoyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLeadsHoyModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Icon name="Phone" className="text-cyan-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Para Contactar Hoy</h3>
                    <p className="text-slate-500 text-sm">{safeLeadsHoy.length} lead{safeLeadsHoy.length !== 1 ? 's' : ''} requiere{safeLeadsHoy.length === 1 ? '' : 'n'} tu atención</p>
                  </div>
                </div>
                <button onClick={() => setShowLeadsHoyModal(false)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {safeLeadsHoy.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="CheckCircle" className="text-emerald-600" size={32} />
                  </div>
                  <p className="text-slate-600 font-medium">¡Todo al día!</p>
                  <p className="text-slate-400 text-sm">No tienes leads pendientes de contactar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {safeLeadsHoy.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setShowLeadsHoyModal(false)
                        selectConsulta(c.id)
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${c.nuevoInteres ? 'bg-violet-50 border border-violet-200' :
                          c.atrasado ? 'bg-red-50 border border-red-200' :
                            'bg-slate-50 border border-slate-200'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${c.carrera?.color || 'bg-slate-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800">{c.nombre}</p>
                              {c.nuevoInteres && (
                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full font-medium">
                                  🎸 Nuevo Interés
                                </span>
                              )}
                              {c.atrasado && !c.nuevoInteres && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                  Atrasado
                                </span>
                              )}
                              {c.tipo_alumno === 'antiguo' && (
                                <span className="px-2 py-0.5 bg-violet-100 text-violet-600 text-xs rounded-full">
                                  Antiguo
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              {c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'} · {ESTADOS[c.estado]?.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${ESTADOS[c.estado]?.bg} ${ESTADOS[c.estado]?.text}`}>
                            {ESTADOS[c.estado]?.label}
                          </span>
                          <Icon name="ChevronRight" size={20} className="text-slate-400" />
                        </div>
                      </div>
                      {c.notas && (
                        <p className="mt-2 text-sm text-slate-500 line-clamp-1 pl-6">
                          📝 {c.notas}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de límite de plan alcanzado */}
      {limiteAlerta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="AlertTriangle" size={32} />
              </div>
              <h2 className="text-xl font-bold">Límite alcanzado</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-center mb-6">
                {limiteAlerta.mensaje}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLimiteAlerta(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Entendido
                </button>
                <button
                  onClick={() => {
                    setLimiteAlerta(null)
                    setActiveTab('configuracion')
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700"
                >
                  Ver planes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce">
          <div className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-600 text-white' :
              notification.type === 'info' ? 'bg-blue-600 text-white' :
                'bg-violet-600 text-white'
            }`}>
            <Icon name={notification.type === 'success' ? 'CheckCircle' : notification.type === 'info' ? 'Info' : 'Bell'} size={24} />
            <div>
              <p className="font-medium">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
              <Icon name="X" size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante actualizar */}
      <button
        onClick={() => {
          store.reloadStore() // Recargar desde localStorage (sincroniza con otras pestañas)
          loadData()
          setNotification({ type: 'info', message: 'Datos actualizados' })
          setTimeout(() => setNotification(null), 2000)
        }}
        className="fixed bottom-4 left-72 z-40 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg hover:bg-slate-50 hover:shadow-xl transition-all"
        title="Actualizar datos"
      >
        <Icon name="RefreshCw" size={16} />
        <span className="text-sm font-medium">Actualizar</span>
      </button>
    </div>
  )
}
