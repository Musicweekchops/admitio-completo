import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { ModalFormulario } from '../components/FormularioEditor'
import * as store from '../lib/store'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useLockLead } from '../hooks/useLockLead'
import { ESTADOS, CARRERAS, MEDIOS, TIPOS_ALUMNO } from '../data/mockData'

// Componente para campo editable inline
const EditableField = ({ label, value, onSave, type = 'text', icon, inputClassName = '' }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    setEditValue(value || '')
  }, [value])
  
  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      const result = await onSave(editValue)
      if (result.success) {
        setIsEditing(false)
      } else {
        setError(result.error || 'Error al guardar')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setEditValue(value || '')
      setIsEditing(false)
      setError(null)
    }
  }
  
  if (isEditing) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
          {icon && <Icon name={icon} size={12} />}
          {label}
        </label>
        <div className="flex gap-2">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            disabled={saving}
            className={`flex-1 px-3 py-2 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${inputClassName} ${saving ? 'bg-slate-100' : 'bg-white'}`}
          />
          {saving && (
            <div className="flex items-center px-2">
              <Icon name="Loader" size={16} className="animate-spin text-violet-500" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
  
  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="cursor-pointer group hover:bg-violet-50 rounded-lg p-2 -m-2 transition-colors"
    >
      <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
        {icon && <Icon name={icon} size={12} />}
        {label}
        <Icon name="Pencil" size={10} className="opacity-0 group-hover:opacity-100 text-violet-400 ml-1" />
      </label>
      <p className={`text-slate-800 ${inputClassName || 'text-sm'}`}>
        {value || <span className="text-slate-400 italic">Sin datos</span>}
      </p>
    </div>
  )
}

// Componente para select editable inline
const EditableSelectField = ({ label, value, options, onSave, icon }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  const currentOption = options.find(o => o.value === value)
  
  const handleChange = async (e) => {
    const newValue = e.target.value
    if (newValue === value) {
      setIsEditing(false)
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      const result = await onSave(newValue)
      if (result.success) {
        setIsEditing(false)
      } else {
        setError(result.error || 'Error al guardar')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }
  
  if (isEditing) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
          {icon && <Icon name={icon} size={12} />}
          {label}
        </label>
        <div className="flex gap-2">
          <select
            value={value || ''}
            onChange={handleChange}
            onBlur={() => !saving && setIsEditing(false)}
            autoFocus
            disabled={saving}
            className={`flex-1 px-3 py-2 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${saving ? 'bg-slate-100' : 'bg-white'}`}
          >
            <option value="">Seleccionar...</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {saving && (
            <div className="flex items-center px-2">
              <Icon name="Loader" size={16} className="animate-spin text-violet-500" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
  
  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="cursor-pointer group hover:bg-violet-50 rounded-lg p-2 -m-2 transition-colors"
    >
      <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
        {icon && <Icon name={icon} size={12} />}
        {label}
        <Icon name="Pencil" size={10} className="opacity-0 group-hover:opacity-100 text-violet-400 ml-1" />
      </label>
      <p className="text-sm text-slate-800">
        {currentOption?.label || <span className="text-slate-400 italic">Sin seleccionar</span>}
      </p>
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
  
  const crearLeadNuevo = async () => {
    // Verificar límite del plan
    if (puedeCrearLead && !puedeCrearLead()) {
      setShowLimiteAlert(true)
      return
    }
    
    setSubmitting(true)
    
    try {
      const carreraSeleccionada = carrerasDisponibles.find(c => String(c.id) === String(formData.carrera_id))
      
      const newConsulta = await store.createConsulta({
        ...formData,
        carrera_id: formData.carrera_id || null,
        carrera_nombre: carreraSeleccionada?.nombre || null,
        asignado_a: formData.asignado_a || null
      }, userId, userRol)
      
      // Actualizar contador de uso
      if (actualizarUso) actualizarUso('leads', 1)
      
      setSubmitting(false)
      setSuccess(true)
      
      setTimeout(() => {
        resetForm()
        onClose()
        if (onCreated) onCreated(newConsulta)
      }, 1500)
    } catch (error) {
      console.error('Error creando lead:', error)
      setSubmitting(false)
    }
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
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedDuplicado.matriculado ? 'bg-emerald-100 text-emerald-700' :
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
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            selectedDuplicado?.id === d.id 
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
                   onChange={e => setFormData({...formData, nombre: e.target.value})}
                   onBlur={verificarDuplicados}
                   className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                     duplicados.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                   }`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input type="email" required value={formData.email}
                     onChange={e => setFormData({...formData, email: e.target.value})}
                     onBlur={verificarDuplicados}
                     className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                       duplicados.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                     }`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
              <input type="tel" required value={formData.telefono}
                     onChange={e => setFormData({...formData, telefono: e.target.value})}
                     onBlur={verificarDuplicados}
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Carrera *</label>
            <select required value={formData.carrera_id}
                    onChange={e => setFormData({...formData, carrera_id: e.target.value})}
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
                       onChange={e => setFormData({...formData, tipo_alumno: e.target.value})}
                       className="sr-only" />
                <Icon name="UserPlus" size={16} />
                <span className="text-sm font-medium">Nuevo</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.tipo_alumno === 'antiguo' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="tipo_alumno_modal" value="antiguo" checked={formData.tipo_alumno === 'antiguo'}
                       onChange={e => setFormData({...formData, tipo_alumno: e.target.value})}
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
                         onChange={e => setFormData({...formData, medio_id: e.target.value})}
                         className="sr-only" />
                  <Icon name={m.icono} className={m.color} size={16} />
                  <span className="text-xs">{m.nombre}</span>
                </label>
              ))}
            </div>
          </div>
          {isKeyMaster && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a</label>
              <select value={formData.asignado_a}
                      onChange={e => setFormData({...formData, asignado_a: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Asignación automática</option>
                {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea value={formData.notas}
                      onChange={e => setFormData({...formData, notas: e.target.value})}
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
      <circle cx={size/2} cy={size/2} r={size/4} fill="white" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-slate-800">
        {total}
      </text>
      <text x={size/2} y={size/2 + 18} textAnchor="middle" dominantBaseline="middle" className="text-xs fill-slate-500">
        total
      </text>
    </svg>
  )
}

export default function Dashboard() {
  const { user, institucion, signOut, isKeyMaster, isRector, isEncargado, isAsistente, canViewAll, canEdit, canConfig, canCreateLeads, canReasignar, reloadFromSupabase, planInfo, actualizarUso, puedeCrearLead, puedeCrearUsuario, puedeCrearFormulario } = useAuth()
  
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
  
  // Estados para sidebar responsive
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

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
  useEffect(() => {
    // No conectar si no hay usuario autenticado
    if (!isSupabaseConfigured() || !user?.institucion_id || !user?.id) {
      return
    }

    console.log('🔌 Conectando Supabase Realtime...')
    
    let channel = null
    
    try {
      channel = supabase
        .channel(`db-changes-${user.institucion_id}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'leads', filter: `institucion_id=eq.${user.institucion_id}` },
          async (payload) => {
            console.log('📡 Cambio en leads:', payload.eventType)
            if (user?.institucion_id) { // Verificar que aún hay usuario
              await reloadFromSupabase()
              loadData()
              setLastUpdate(new Date())
            }
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'usuarios', filter: `institucion_id=eq.${user.institucion_id}` },
          async (payload) => {
            console.log('📡 Cambio en usuarios:', payload.eventType)
            if (user?.institucion_id) {
              await reloadFromSupabase()
              loadData()
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime conectado')
          }
        })
    } catch (e) {
      console.warn('Error conectando Realtime:', e)
    }

    return () => {
      if (channel) {
        console.log('🔌 Desconectando Realtime...')
        supabase.removeChannel(channel)
      }
    }
  }, [user?.institucion_id, user?.id]) // Re-suscribir si cambia usuario o institución
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
    
    // Para Rector: cargar TODOS los leads de la institución (para reportes)
    // Para otros roles: usar filtro normal
    let data
    if (isRector) {
      data = store.getConsultasParaReportes()
      console.log('📊 Rector - Leads cargados:', data.length)
      console.log('📊 Rector - Usuarios:', store.getTodosLosUsuarios()?.length || 0)
      console.log('📊 Rector - Encargados:', store.getEncargadosActivos()?.length || 0)
    } else {
      data = store.getConsultas(user?.id, user?.rol_id)
    }
    
    setConsultas(data)
    
    if (isEncargado) {
      setMetricas(store.getMetricasEncargado(user.id))
      setLeadsHoy(store.getLeadsContactarHoy(user.id, user.rol_id))
    } else if (isKeyMaster || isRector) {
      // Rector también ve los leads a contactar hoy (para tener contexto)
      setLeadsHoy(store.getLeadsContactarHoy())
    }
    setMetricasGlobales(store.getMetricasGlobales())
    setFormularios(store.getFormularios())
  }

  // Cargar datos inicial - con retry para asegurar que el store esté listo
  useEffect(() => {
    loadData()
    
    // Retry después de 500ms por si el store aún no tenía datos
    const timer = setTimeout(() => {
      if (isRector || isKeyMaster) {
        const storeLeads = store.getConsultasParaReportes()
        if (storeLeads.length > 0) {
          console.log('📊 Retry - Recargando con', storeLeads.length, 'leads')
          loadData()
        }
      }
    }, 500)
    
    // Escuchar evento de actualización del store (cuando AuthContext carga datos de Supabase)
    const handleStoreUpdate = () => {
      console.log('📊 Dashboard: Store actualizado, recargando datos...')
      store.reloadStore()
      loadData()
    }
    window.addEventListener('admitio-store-updated', handleStoreUpdate)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('admitio-store-updated', handleStoreUpdate)
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

  const filteredConsultas = consultas.filter(c => {
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
    const matchSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCarrera && matchEstado && matchTipo && matchSearch
  })

  async function handleUpdateEstado(id, nuevoEstado) {
    // Usar versión async que espera confirmación de Supabase
    const result = await store.updateConsultaAsync(id, { estado: nuevoEstado }, user.id)
    
    if (!result.success) {
      setNotification({ 
        type: 'error', 
        message: `Error al cambiar estado: ${result.error || 'Error de conexión'}` 
      })
      setTimeout(() => setNotification(null), 4000)
      return
    }
    
    loadData()
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    
    // Feedback de éxito
    setNotification({ type: 'success', message: 'Estado actualizado' })
    setTimeout(() => setNotification(null), 2000)
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

  async function handleLogout() {
    try {
      // Primero cerrar sesión (limpia estado)
      await signOut()
    } catch (e) {
      console.warn('Error en signOut:', e)
    }
    // Luego navegar
    navigate('/login', { replace: true })
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
    const navItems = [
      { id: 'dashboard', icon: 'Home', label: 'Dashboard', show: !isRector },
      { id: 'consultas', icon: 'Users', label: 'Consultas', show: !isRector, badge: consultas.filter(c => c.estado === 'nueva').length },
      { id: 'historial', icon: 'Archive', label: 'Historial', show: !isRector },
      { id: 'reportes', icon: 'BarChart', label: isRector ? 'Dashboard' : 'Reportes', show: isKeyMaster || isRector || isEncargado || user?.rol_id === 'superadmin' },
      { id: 'formularios', icon: 'FileCode', label: 'Formularios', show: isKeyMaster || user?.rol_id === 'superadmin' },
      { id: 'usuarios', icon: 'User', label: 'Usuarios', show: isKeyMaster || user?.rol_id === 'superadmin' },
      { id: 'programas', icon: 'GraduationCap', label: 'Carreras/Cursos', show: isKeyMaster || user?.rol_id === 'superadmin' },
      { id: 'importar', icon: 'Upload', label: 'Importar', show: isKeyMaster || user?.rol_id === 'superadmin' },
      { id: 'importaciones_sheets', icon: 'Table', label: 'Google Sheets', show: (isKeyMaster || user?.rol_id === 'superadmin') && planInfo?.plan === 'enterprise', badge: importacionesPendientes },
      { id: 'configuracion', icon: 'Settings', label: 'Configuración', show: isKeyMaster || user?.rol_id === 'superadmin' },
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
  const DashboardView = () => {
    const stats = isKeyMaster ? metricasGlobales : metricas
    if (!stats) return null
    
    // Calcular valores según el rol
    const totalLeads = stats.total || 0
    const pendientes = isKeyMaster ? (stats.nuevas || 0) : (stats.sinContactar || 0)
    const enProceso = isKeyMaster 
      ? (stats.contactados || 0) + (stats.seguimiento || 0) + (stats.examen_admision || 0)
      : (stats.activos || 0)
    const examenAdm = stats.examen_admision || 0
    const matriculados = stats.matriculados || 0
    const tasaConv = stats.tasaConversion || stats.tasa_conversion || 0
    const tiempoResp = stats.tiempoRespuestaPromedio || stats.tiempo_respuesta_promedio || null
    const tiempoCierre = stats.tiempoCierrePromedio || stats.tiempo_cierre_promedio || null
    
    // Calcular tipo de alumnos si no viene en stats
    const alumnosNuevos = stats.alumnos_nuevos || filteredConsultas.filter(c => c.tipo_alumno === 'nuevo').length
    const alumnosAntiguos = stats.alumnos_antiguos || filteredConsultas.filter(c => c.tipo_alumno === 'antiguo').length

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
                  {isKeyMaster ? 'Panel de Control' : `Hola, ${user?.nombre?.split(' ')[0]}`}
                </h1>
                <p className="text-violet-200">
                  {isKeyMaster ? 'Vista general del sistema' : 'Tu resumen de hoy'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{totalLeads}</p>
              <p className="text-violet-200">{isKeyMaster ? 'Consultas totales' : 'Leads asignados'}</p>
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
            title={isKeyMaster ? "Examen Adm." : "Contactar Hoy"} 
            value={isKeyMaster ? examenAdm : leadsHoy.length} 
            icon={isKeyMaster ? "ClipboardCheck" : "Phone"} 
            color="cyan" 
            sub={isKeyMaster ? "Agendados" : "Requieren atención"}
            onClick={() => isKeyMaster ? navigateToEstado('examen_admision') : setShowLeadsHoyModal(true)}
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
        {leadsHoy.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                <Icon name="Bell" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Para Contactar Hoy</h3>
                <p className="text-sm text-slate-500">{leadsHoy.length} lead{leadsHoy.length !== 1 ? 's' : ''} requiere{leadsHoy.length === 1 ? '' : 'n'} tu atención</p>
              </div>
            </div>
            <div className="space-y-2">
              {leadsHoy.slice(0, 5).map(c => (
                <div key={c.id} 
                     onClick={() => selectConsulta(c.id)}
                     className={`flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-all ${
                       c.nuevoInteres ? 'border-l-4 border-violet-500 ring-1 ring-violet-200' :
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
              {leadsHoy.length > 5 && (
                <button onClick={() => setActiveTab('consultas')} className="w-full text-center py-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
                  Ver todos ({leadsHoy.length}) →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Métricas de tiempo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                tiempoResp === null ? 'bg-slate-100 text-slate-400' :
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
                  <span className="text-lg font-bold text-blue-600">{stats.alumnos_nuevos || alumnosNuevos || 0} <span className="text-xs font-normal text-slate-400">Nuevos</span></span>
                  <span className="text-lg font-bold text-violet-600">{stats.alumnos_antiguos || alumnosAntiguos || 0} <span className="text-xs font-normal text-slate-400">Antiguos</span></span>
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

  // ============================================
  // CONSULTAS VIEW (KANBAN + LISTA)
  // ============================================
  const ConsultasView = () => (
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
          <div className="flex-1 min-w-[200px] relative">
            <Icon name="Search" className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" size={20} />
            <input type="text" placeholder="Buscar por nombre o email..."
                   value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
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

      {viewMode === 'kanban' ? <KanbanView /> : <ListView />}
    </div>
  )

  // KANBAN
  const KanbanView = () => {
    const columnas = [
      { estado: 'nueva', titulo: 'Nuevas', color: 'border-blue-500', filtro: c => c.estado === 'nueva' && !c.matriculado && !c.descartado },
      { estado: 'contactado', titulo: 'Contactados', color: 'border-amber-500', filtro: c => c.estado === 'contactado' && !c.matriculado && !c.descartado },
      { estado: 'seguimiento', titulo: 'Seguimiento', color: 'border-purple-500', filtro: c => c.estado === 'seguimiento' && !c.matriculado && !c.descartado },
      { estado: 'examen_admision', titulo: 'Examen Adm.', color: 'border-cyan-500', filtro: c => c.estado === 'examen_admision' && !c.matriculado && !c.descartado },
      { estado: 'matriculado', titulo: 'Matriculados', color: 'border-emerald-500', filtro: c => c.matriculado },
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
                       className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${consulta.matriculado ? 'ring-2 ring-emerald-200' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-slate-800 text-sm">{consulta.nombre}</p>
                      {consulta.matriculado ? (
                        <span className="text-emerald-500">
                          <Icon name="CheckCircle" size={16} />
                        </span>
                      ) : (
                        <span className={MEDIOS.find(m => m.id === consulta.medio_id)?.color}>
                          <Icon name={consulta.medio?.icono || 'Globe'} size={16} />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${consulta.carrera?.color || 'bg-slate-400'}`} />
                      <span className="text-xs text-slate-500">{consulta.carrera?.nombre || consulta.carrera_nombre || 'Sin carrera'}</span>
                      {consulta.tipo_alumno === 'antiguo' && (
                        <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-xs rounded">Antiguo</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{formatDateShort(consulta.created_at)}</span>
                      {!consulta.matriculado && (
                        <span className="flex items-center gap-1">
                          <Icon name="Mail" size={12} /> {consulta.emails_enviados}/2
                        </span>
                      )}
                    </div>
                    {isKeyMaster && consulta.encargado && (
                      <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                        → {consulta.encargado.nombre}
                      </p>
                    )}
                  </div>
                ))}
                {leadsColumna.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">Sin leads</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // LISTA
  const ListView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
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
              className="border-b border-slate-50 hover:bg-violet-50 cursor-pointer transition-colors"
            >
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

  // ============================================
  // HISTORIAL VIEW
  // ============================================
  const HistorialView = () => {
    const matriculados = consultas.filter(c => c.matriculado)
    const descartados = consultas.filter(c => c.descartado)
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

  // Handler para seleccionar consulta
  const selectConsulta = useCallback((id) => {
    const consulta = store.getConsultaById(id)
    setSelectedConsulta(consulta)
    setActiveTab('detalle')
  }, [])
  
  // Handler para cambiar estado
  const handleEstadoChange = useCallback(async (id, nuevoEstado) => {
    const result = await store.updateConsultaAsync(id, { estado: nuevoEstado }, user.id)
    
    if (!result.success) {
      setNotification({ type: 'error', message: `Error: ${result.error || 'No se pudo guardar'}` })
      setTimeout(() => setNotification(null), 4000)
      return
    }
    
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
    const result = await store.updateConsultaAsync(id, { asignado_a: nuevoEncargado }, user.id)
    
    if (!result.success) {
      setNotification({ type: 'error', message: `Error: ${result.error || 'No se pudo reasignar'}` })
      setTimeout(() => setNotification(null), 4000)
      return
    }
    
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
    setNotification({ type: 'success', message: `Lead asignado a ${encargado?.nombre || 'Sin asignar'}` })
    setTimeout(() => setNotification(null), 3000)
  }, [selectedConsulta?.id, user?.id])
  
  // Handler para cambiar tipo alumno
  const handleTipoAlumnoChange = useCallback(async (id, tipo) => {
    const result = await store.updateConsultaAsync(id, { tipo_alumno: tipo }, user.id)
    
    if (!result.success) {
      setNotification({ type: 'error', message: `Error: ${result.error || 'No se pudo guardar'}` })
      setTimeout(() => setNotification(null), 4000)
      return
    }
    
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
    setNotification({ type: 'success', message: `Tipo cambiado a "${tipo === 'nuevo' ? 'Alumno Nuevo' : 'Alumno Antiguo'}"` })
    setTimeout(() => setNotification(null), 2000)
  }, [selectedConsulta?.id, user?.id])

  // ============================================
  // DETALLE VIEW - Con notas editables y sistema de locks
  // ============================================
  const DetalleView = () => {
    if (!selectedConsulta) return null
    const c = selectedConsulta
    const encargados = store.getUsuarios().filter(u => u.rol_id === 'encargado')
    
    // Sistema de bloqueo de leads
    const {
      lockInfo,
      isLocked,
      isMyLock,
      loading: lockLoading,
      canEdit,
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
        // Los cambios ya están en localStorage y en cola de sync a Supabase
        // Solo necesitamos liberar el lock y cerrar
        await releaseLock()
        
        setSaveStatus('saved')
        setNotification({ type: 'success', message: '✓ Cambios guardados' })
        
        // Refrescar datos locales (no desde Supabase, para no sobrescribir)
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
      // Recargar desde Supabase para descartar cambios locales
      await reloadFromSupabase()
      loadData()
      await releaseLock()
      setIsEditing(false)
      
      // Refrescar el lead seleccionado con datos originales
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
      // Refrescar el lead seleccionado
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
    }

    return (
      <div className="space-y-6">
        <button onClick={handleBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
          <Icon name="ArrowLeft" size={20} /> Volver
        </button>
        
        {/* ========== INDICADOR DE BLOQUEO ========== */}
        {!lockLoading && (
          <div className={`rounded-xl p-4 border ${
            isMyLock 
              ? 'bg-emerald-50 border-emerald-200' 
              : isLocked 
                ? 'bg-amber-50 border-amber-200'
                : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isMyLock 
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
                      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                        saveStatus === 'saving'
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
        
        {/* Modal confirmación tomar control */}
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
        
        {/* Alerta de nuevo interés */}
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
          {/* Info principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              {/* Header con nombre editable */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  {isMyLock ? (
                    <EditableField
                      label="Nombre"
                      value={c.nombre}
                      onSave={async (newValue) => {
                        const result = await store.updateConsultaAsync(c.id, { nombre: newValue }, user.id)
                        if (result.success) {
                          setSelectedConsulta(store.getConsultaById(c.id))
                          loadData()
                        }
                        return result
                      }}
                      inputClassName="text-2xl font-bold"
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-slate-800">{c.nombre}</h2>
                      {c.tipo_alumno === 'antiguo' && (
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 text-sm rounded-full">Alumno Antiguo</span>
                      )}
                    </div>
                  )}
                  <p className="text-slate-500 mt-1">{c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${ESTADOS[c.estado]?.bg} ${ESTADOS[c.estado]?.text}`}>
                  {ESTADOS[c.estado]?.label}
                </span>
              </div>

              {/* Campos editables cuando está en modo edición */}
              {isMyLock ? (
                <div className="space-y-4 mb-6 p-4 bg-violet-50/50 rounded-xl border border-violet-100">
                  <p className="text-sm font-medium text-violet-700 flex items-center gap-2 mb-3">
                    <Icon name="Edit" size={16} />
                    Modo edición activo - Haz clic en cualquier campo para editar
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField
                      label="Email"
                      value={c.email}
                      type="email"
                      icon="Mail"
                      onSave={async (newValue) => {
                        const result = await store.updateConsultaAsync(c.id, { email: newValue }, user.id)
                        if (result.success) {
                          setSelectedConsulta(store.getConsultaById(c.id))
                          loadData()
                        }
                        return result
                      }}
                    />
                    
                    <EditableField
                      label="Teléfono"
                      value={c.telefono}
                      type="tel"
                      icon="Phone"
                      onSave={async (newValue) => {
                        const result = await store.updateConsultaAsync(c.id, { telefono: newValue }, user.id)
                        if (result.success) {
                          setSelectedConsulta(store.getConsultaById(c.id))
                          loadData()
                        }
                        return result
                      }}
                    />
                    
                    <EditableSelectField
                      label="Carrera"
                      value={c.carrera_id}
                      icon="Music"
                      options={store.getCarreras().map(ca => ({ value: ca.id, label: ca.nombre }))}
                      onSave={async (newValue) => {
                        const carrera = store.getCarreras().find(ca => ca.id === newValue)
                        const result = await store.updateConsultaAsync(c.id, { 
                          carrera_id: newValue,
                          carrera_nombre: carrera?.nombre || null
                        }, user.id)
                        if (result.success) {
                          setSelectedConsulta(store.getConsultaById(c.id))
                          loadData()
                        }
                        return result
                      }}
                    />
                    
                    <EditableSelectField
                      label="Medio de contacto"
                      value={c.medio_id}
                      icon="Globe"
                      options={MEDIOS.map(m => ({ value: m.id, label: m.nombre }))}
                      onSave={async (newValue) => {
                        const result = await store.updateConsultaAsync(c.id, { medio_id: newValue }, user.id)
                        if (result.success) {
                          setSelectedConsulta(store.getConsultaById(c.id))
                          loadData()
                        }
                        return result
                      }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t border-violet-100">
                    <InfoCard icon="Calendar" label="Fecha ingreso" value={formatDate(c.created_at)} iconColor="text-slate-400" />
                    <InfoCard 
                      icon={c.origen_entrada === 'secretaria' ? 'UserPlus' : c.origen_entrada === 'formulario' ? 'FileCode' : 'Edit'} 
                      label="Ingresado por" 
                      value={c.origen_entrada === 'secretaria' ? `Secretaría (${c.creado_por_nombre || ''})` : 
                             c.origen_entrada === 'formulario' ? 'Formulario Web' : 
                             c.creado_por_nombre || 'Manual'} 
                      iconColor={c.origen_entrada === 'secretaria' ? 'text-violet-500' : 'text-slate-400'} 
                    />
                  </div>
                </div>
              ) : (
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
              )}
              
              {/* Carreras de interés (si tiene más de una) */}
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
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                carreraId === c.carrera_id 
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

              {/* Notas editables */}
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

            {/* Timeline de actividad */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Historial de Actividad</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {c.actividad?.length > 0 ? c.actividad.map((a, i) => (
                  <div key={a.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        a.tipo === 'matriculado' ? 'bg-emerald-100 text-emerald-600' :
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
                      <p className="text-slate-800">{a.descripcion}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-400 text-center py-4">Sin actividad registrada</p>
                )}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-6">
            {/* Cambiar Estado - SIEMPRE disponible para quien tiene permiso, excepto si otro usuario lo bloquea */}
            {canEdit && !c.matriculado && !c.descartado && (
              <div className={`bg-white rounded-xl p-6 shadow-sm border ${isLocked && !isMyLock ? 'border-amber-200 opacity-70' : 'border-slate-100'}`}>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Icon name="GitBranch" size={18} className="text-violet-500" />
                  Cambiar Estado
                </h3>
                <div className="space-y-2">
                  {Object.values(ESTADOS).filter(e => e.id !== c.estado && !e.cerrado).map(estado => (
                    <button key={estado.id}
                            onClick={() => !(isLocked && !isMyLock) && handleUpdateEstado(c.id, estado.id)}
                            disabled={isLocked && !isMyLock}
                            className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${estado.bg} ${estado.text} ${isLocked && !isMyLock ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}>
                      <span className="flex items-center gap-2">
                        <Icon name="ArrowRight" size={14} />
                        {estado.label}
                      </span>
                    </button>
                  ))}
                  
                  {/* Botones de cierre (matriculado/descartado) con confirmación visual */}
                  <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                    <p className="text-xs text-slate-500 mb-2">Cerrar lead:</p>
                    <button 
                      onClick={() => !(isLocked && !isMyLock) && handleUpdateEstado(c.id, 'matriculado')}
                      disabled={isLocked && !isMyLock}
                      className={`w-full px-4 py-3 rounded-lg text-left transition-colors bg-emerald-100 text-emerald-700 ${isLocked && !isMyLock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-200 cursor-pointer'}`}>
                      <span className="flex items-center gap-2">
                        <Icon name="CheckCircle" size={16} />
                        Matriculado ✓
                      </span>
                    </button>
                    <button 
                      onClick={() => !(isLocked && !isMyLock) && handleUpdateEstado(c.id, 'descartado')}
                      disabled={isLocked && !isMyLock}
                      className={`w-full px-4 py-3 rounded-lg text-left transition-colors bg-red-100 text-red-700 ${isLocked && !isMyLock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200 cursor-pointer'}`}>
                      <span className="flex items-center gap-2">
                        <Icon name="XCircle" size={16} />
                        Descartado
                      </span>
                    </button>
                  </div>
                </div>
                {isLocked && !isMyLock && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                    <Icon name="Lock" size={12} /> {lockedByName} está editando este lead
                  </p>
                )}
              </div>
            )}

            {/* Tipo de Alumno - También sin requerir lock */}
            {canEdit && !c.matriculado && !c.descartado && (
              <div className={`bg-white rounded-xl p-6 shadow-sm border ${isLocked && !isMyLock ? 'border-amber-200 opacity-70' : 'border-slate-100'}`}>
                <h3 className="font-semibold text-slate-800 mb-4">Tipo de Alumno</h3>
                <div className="flex gap-2">
                  <button onClick={() => !(isLocked && !isMyLock) && handleTipoAlumnoChange(c.id, 'nuevo')}
                          disabled={isLocked && !isMyLock}
                          className={`flex-1 px-4 py-3 rounded-lg text-center transition-colors ${c.tipo_alumno === 'nuevo' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-slate-100 text-slate-600'} ${isLocked && !isMyLock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 cursor-pointer'}`}>
                    Nuevo
                  </button>
                  <button onClick={() => !(isLocked && !isMyLock) && handleTipoAlumnoChange(c.id, 'antiguo')}
                          disabled={isLocked && !isMyLock}
                          className={`flex-1 px-4 py-3 rounded-lg text-center transition-colors ${c.tipo_alumno === 'antiguo' ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300' : 'bg-slate-100 text-slate-600'} ${isLocked && !isMyLock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 cursor-pointer'}`}>
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
                        setNotification({ type: 'info', message: 'Teléfono copiado' })
                        setTimeout(() => setNotification(null), 2000)
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
                        setNotification({ type: 'info', message: 'Email copiado' })
                        setTimeout(() => setNotification(null), 2000)
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm"
                    >
                      <Icon name="Copy" size={14} />
                      Email
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isKeyMaster && !c.matriculado && !c.descartado && (
              <div className={`bg-white rounded-xl p-6 shadow-sm border ${isMyLock ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}>
                <h3 className="font-semibold text-slate-800 mb-4">Reasignar</h3>
                <select value={c.asignado_a || ''}
                        onChange={(e) => isMyLock && handleReasignar(c.id, e.target.value)}
                        disabled={!isMyLock}
                        className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${!isMyLock ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}>
                  {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                {!isMyLock && isLocked && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <Icon name="Lock" size={12} /> Bloqueado por {lockedByName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // REPORTES VIEW - Funnel-Centric Dashboard (Rediseño v2)
  // ============================================
  const ReportesView = () => {
    // Estados principales
    const [periodo, setPeriodo] = useState('mes') // 'semana', 'mes', 'trimestre', 'año'
    const [activeTab, setActiveTab] = useState('embudo') // 'embudo', 'tendencia', 'carreras', 'medios', 'encargados'
    const [tipoGrafico, setTipoGrafico] = useState('linea')
    const [agrupacion, setAgrupacion] = useState('dia')
    
    // Calcular fechas según período seleccionado
    const { fechaInicio, fechaFin, fechaInicioAnterior, fechaFinAnterior } = useMemo(() => {
      const hoy = new Date()
      const fin = new Date(hoy)
      fin.setHours(23, 59, 59, 999)
      
      let inicio = new Date(hoy)
      let diasPeriodo = 30
      
      switch(periodo) {
        case 'semana':
          inicio.setDate(hoy.getDate() - 7)
          diasPeriodo = 7
          break
        case 'mes':
          inicio.setMonth(hoy.getMonth() - 1)
          diasPeriodo = 30
          break
        case 'trimestre':
          inicio.setMonth(hoy.getMonth() - 3)
          diasPeriodo = 90
          break
        case 'año':
          inicio.setFullYear(hoy.getFullYear() - 1)
          diasPeriodo = 365
          break
      }
      inicio.setHours(0, 0, 0, 0)
      
      // Período anterior para comparación
      const finAnterior = new Date(inicio)
      finAnterior.setDate(finAnterior.getDate() - 1)
      finAnterior.setHours(23, 59, 59, 999)
      
      const inicioAnterior = new Date(finAnterior)
      inicioAnterior.setDate(inicioAnterior.getDate() - diasPeriodo + 1)
      inicioAnterior.setHours(0, 0, 0, 0)
      
      return {
        fechaInicio: inicio.toISOString().split('T')[0],
        fechaFin: fin.toISOString().split('T')[0],
        fechaInicioAnterior: inicioAnterior.toISOString().split('T')[0],
        fechaFinAnterior: finAnterior.toISOString().split('T')[0]
      }
    }, [periodo])
    
    // Estados de filtro (simplificados, ya no se muestran todos a la vez)
    const [filtroEstados, setFiltroEstados] = useState([])
    const [filtroCarreras, setFiltroCarreras] = useState([])
    const [filtroMedios, setFiltroMedios] = useState([])
    const [filtroEncargados, setFiltroEncargados] = useState([])
    const [filtroTipoAlumno, setFiltroTipoAlumno] = useState('todos')
    const [showFilters, setShowFilters] = useState(false)
    
    // USAR DATOS FRESCOS - Para Rector usar todos los leads, para otros usar consultas del dashboard
    const leadsReporte = useMemo(() => {
      // Para Rector: cargar todos los leads directamente del store
      // Para otros: usar las consultas ya filtradas del dashboard
      let leads = isRector ? store.getConsultasParaReportes() : [...consultas]
      
      console.log('📊 leadsReporte useMemo - isRector:', isRector, 'leads iniciales:', leads.length, 'consultas estado:', consultas.length)
      
      // Si no hay consultas en el dashboard pero hay en el store, cargar del store
      if (leads.length === 0 && !isRector) {
        leads = store.getConsultasParaReportes()
        console.log('📊 leadsReporte - Fallback a store:', leads.length)
      }
      
      // Filtrar por rol si es encargado (solo aplica si no es rector)
      if (user?.rol_id === 'encargado' && user?.id) {
        leads = leads.filter(c => c.asignado_a === user.id)
      }
      
      // Filtrar por rango de fechas
      if (fechaInicio) {
        const inicio = new Date(fechaInicio)
        inicio.setHours(0, 0, 0, 0)
        leads = leads.filter(c => new Date(c.created_at) >= inicio)
      }
      if (fechaFin) {
        const fin = new Date(fechaFin)
        fin.setHours(23, 59, 59, 999)
        leads = leads.filter(c => new Date(c.created_at) <= fin)
      }
      
      // Filtrar por estados
      if (filtroEstados.length > 0) {
        leads = leads.filter(c => {
          if (filtroEstados.includes('matriculado') && c.matriculado) return true
          if (filtroEstados.includes('descartado') && c.descartado) return true
          if (!c.matriculado && !c.descartado && filtroEstados.includes(c.estado)) return true
          return false
        })
      }
      
      // Filtrar por carreras
      if (filtroCarreras.length > 0) {
        leads = leads.filter(c => filtroCarreras.includes(c.carrera_id))
      }
      
      // Filtrar por medios
      if (filtroMedios.length > 0) {
        leads = leads.filter(c => filtroMedios.includes(c.medio_id))
      }
      
      // Filtrar por encargados
      if (filtroEncargados.length > 0) {
        leads = leads.filter(c => filtroEncargados.includes(c.asignado_a))
      }
      
      // Filtrar por tipo de alumno
      if (filtroTipoAlumno !== 'todos') {
        leads = leads.filter(c => c.tipo_alumno === filtroTipoAlumno)
      }
      
      return leads
    }, [consultas, isRector, fechaInicio, fechaFin, filtroEstados, filtroCarreras, filtroMedios, filtroEncargados, filtroTipoAlumno, user])
    
    // Calcular estadísticas desde los leads filtrados
    const estadisticas = useMemo(() => {
      const total = leadsReporte.length
      const matriculados = leadsReporte.filter(c => c.matriculado).length
      const descartados = leadsReporte.filter(c => c.descartado).length
      const activos = leadsReporte.filter(c => !c.matriculado && !c.descartado).length
      
      // Por estado
      const porEstado = {
        nueva: leadsReporte.filter(c => c.estado === 'nueva' && !c.matriculado && !c.descartado).length,
        contactado: leadsReporte.filter(c => c.estado === 'contactado' && !c.matriculado && !c.descartado).length,
        seguimiento: leadsReporte.filter(c => c.estado === 'seguimiento' && !c.matriculado && !c.descartado).length,
        examen_admision: leadsReporte.filter(c => c.estado === 'examen_admision' && !c.matriculado && !c.descartado).length,
        matriculado: matriculados,
        descartado: descartados
      }
      
      // Por carrera - usar store para obtener nombres
      const porCarrera = {}
      const todasCarreras = store.getCarreras()
      leadsReporte.forEach(c => {
        const carreraId = c.carrera_id || 'sin_carrera'
        if (!porCarrera[carreraId]) {
          // Buscar nombre de carrera en store, luego en el lead, luego fallback
          const carrera = todasCarreras.find(ca => ca.id === carreraId)
          const nombreCarrera = carrera?.nombre || c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'
          porCarrera[carreraId] = { total: 0, matriculados: 0, nombre: nombreCarrera, color: carrera?.color }
        }
        porCarrera[carreraId].total++
        if (c.matriculado) porCarrera[carreraId].matriculados++
      })
      
      // Por medio - usar store para obtener nombres
      const porMedio = {}
      const todosLosMedios = store.getMedios()
      leadsReporte.forEach(c => {
        const medioId = c.medio_id || 'sin_medio'
        if (!porMedio[medioId]) {
          // Buscar nombre del medio en store
          const medio = todosLosMedios.find(m => m.id === medioId)
          const nombreMedio = medio?.nombre || c.medio?.nombre || medioId
          porMedio[medioId] = { total: 0, matriculados: 0, nombre: nombreMedio, color: medio?.color }
        }
        porMedio[medioId].total++
        if (c.matriculado) porMedio[medioId].matriculados++
      })
      
      // Por encargado - usar store para obtener nombres
      const porEncargado = {}
      const todosUsuarios = store.getTodosLosUsuarios()
      leadsReporte.forEach(c => {
        const encargadoId = c.asignado_a || 'sin_asignar'
        if (!porEncargado[encargadoId]) {
          // Buscar nombre del encargado
          const usuario = todosUsuarios.find(u => u.id === encargadoId)
          const nombreEncargado = usuario?.nombre || c.encargado?.nombre || 'Sin asignar'
          porEncargado[encargadoId] = { total: 0, matriculados: 0, nombre: nombreEncargado, tasa: 0 }
        }
        porEncargado[encargadoId].total++
        if (c.matriculado) porEncargado[encargadoId].matriculados++
      })
      // Calcular tasa de conversión por encargado
      Object.keys(porEncargado).forEach(id => {
        const e = porEncargado[id]
        e.tasa = e.total > 0 ? Math.round((e.matriculados / e.total) * 100) : 0
      })
      
      // Por tipo de alumno
      const porTipoAlumno = {
        nuevo: leadsReporte.filter(c => c.tipo_alumno === 'nuevo' || !c.tipo_alumno).length,
        antiguo: leadsReporte.filter(c => c.tipo_alumno === 'antiguo').length
      }
      
      // Tiempo de respuesta promedio
      const leadsConPrimerContacto = leadsReporte.filter(c => c.fecha_primer_contacto && c.created_at)
      const tiemposRespuesta = leadsConPrimerContacto.map(c => {
        const inicio = new Date(c.created_at)
        const fin = new Date(c.fecha_primer_contacto)
        return (fin - inicio) / (1000 * 60 * 60) // Horas
      })
      const tiempoRespuestaPromedio = tiemposRespuesta.length > 0
        ? Math.round(tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length * 10) / 10
        : 0
      
      // Tiempo de cierre promedio
      const leadsConCierre = leadsReporte.filter(c => c.fecha_cierre && c.created_at && c.matriculado)
      const tiemposCierre = leadsConCierre.map(c => {
        const inicio = new Date(c.created_at)
        const fin = new Date(c.fecha_cierre)
        return (fin - inicio) / (1000 * 60 * 60 * 24) // Días
      })
      const tiempoCierrePromedio = tiemposCierre.length > 0
        ? Math.round(tiemposCierre.reduce((a, b) => a + b, 0) / tiemposCierre.length * 10) / 10
        : 0
      
      return {
        total,
        matriculados,
        descartados,
        activos,
        porEstado,
        porCarrera,
        porMedio,
        porEncargado,
        porTipoAlumno,
        tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0,
        tiempoRespuestaPromedio,
        tiempoCierrePromedio
      }
    }, [leadsReporte])
    
    // Calcular estadísticas del período anterior para comparación
    const estadisticasAnteriores = useMemo(() => {
      // Para Rector: usar todos los leads del store
      let leads = isRector ? store.getConsultasParaReportes() : [...consultas]
      
      // Si no hay consultas pero hay en el store, cargar del store
      if (leads.length === 0 && !isRector) {
        leads = store.getConsultasParaReportes()
      }
      
      // Filtrar por rol si es encargado
      if (user?.rol_id === 'encargado' && user?.id) {
        leads = leads.filter(c => c.asignado_a === user.id)
      }
      
      // Filtrar por período anterior
      if (fechaInicioAnterior && fechaFinAnterior) {
        const inicio = new Date(fechaInicioAnterior)
        inicio.setHours(0, 0, 0, 0)
        const fin = new Date(fechaFinAnterior)
        fin.setHours(23, 59, 59, 999)
        leads = leads.filter(c => {
          const fecha = new Date(c.created_at)
          return fecha >= inicio && fecha <= fin
        })
      }
      
      const total = leads.length
      const matriculados = leads.filter(c => c.matriculado).length
      
      return {
        total,
        matriculados,
        tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0
      }
    }, [consultas, isRector, fechaInicioAnterior, fechaFinAnterior, user])
    
    // Calcular cambios vs período anterior
    const cambios = useMemo(() => {
      const cambioLeads = estadisticas.total - estadisticasAnteriores.total
      const cambioMatriculas = estadisticas.matriculados - estadisticasAnteriores.matriculados
      const cambioConversion = estadisticas.tasaConversion - estadisticasAnteriores.tasaConversion
      
      return {
        leads: cambioLeads,
        leadsPercent: estadisticasAnteriores.total > 0 ? Math.round((cambioLeads / estadisticasAnteriores.total) * 100) : 0,
        matriculas: cambioMatriculas,
        conversion: cambioConversion // Puntos porcentuales
      }
    }, [estadisticas, estadisticasAnteriores])
    
    // Datos del embudo
    const datosEmbudo = useMemo(() => {
      const total = estadisticas.total || 0
      return [
        { etapa: 'Nuevos', cantidad: estadisticas.porEstado?.nueva || 0, color: 'bg-amber-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.nueva || 0) / total) * 100) : 0 },
        { etapa: 'Contactados', cantidad: estadisticas.porEstado?.contactado || 0, color: 'bg-blue-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.contactado || 0) / total) * 100) : 0 },
        { etapa: 'Seguimiento', cantidad: estadisticas.porEstado?.seguimiento || 0, color: 'bg-purple-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.seguimiento || 0) / total) * 100) : 0 },
        { etapa: 'Examen', cantidad: estadisticas.porEstado?.examen_admision || 0, color: 'bg-cyan-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.examen_admision || 0) / total) * 100) : 0 },
        { etapa: 'Matriculados', cantidad: estadisticas.matriculados || 0, color: 'bg-emerald-500', percent: total > 0 ? Math.round(((estadisticas.matriculados || 0) / total) * 100) : 0 },
      ]
    }, [estadisticas])
    
    const datosGrafico = store.getDatosGraficoTemporal(leadsReporte, agrupacion)
    
    const carreras = store.getCarreras()
    const medios = store.getMedios()
    const encargados = store.getEncargadosActivos()
    
    const estadosDisponibles = [
      { id: 'nueva', label: 'Nueva', color: 'bg-amber-500' },
      { id: 'contactado', label: 'Contactado', color: 'bg-blue-500' },
      { id: 'seguimiento', label: 'En Seguimiento', color: 'bg-purple-500' },
      { id: 'examen_admision', label: 'Examen Admisión', color: 'bg-cyan-500' },
      { id: 'matriculado', label: 'Matriculado', color: 'bg-emerald-500' },
      { id: 'descartado', label: 'Descartado', color: 'bg-slate-400' },
    ]
    
    const toggleFiltro = (arr, setArr, id) => {
      if (arr.includes(id)) {
        setArr(arr.filter(x => x !== id))
      } else {
        setArr([...arr, id])
      }
    }
    
    const limpiarFiltros = () => {
      setFiltroEstados([])
      setFiltroCarreras([])
      setFiltroMedios([])
      setFiltroEncargados([])
      setFiltroTipoAlumno('todos')
    }
    
    const descargarCSV = () => {
      const csv = store.exportarReporteCSV(leadsReporte, true)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `reporte_admisiones_${fechaInicio}_${fechaFin}.csv`
      link.click()
    }
    
    // Estado para modal de generación PDF
    const [generandoPDF, setGenerandoPDF] = useState(false)
    
    // Función para cargar jsPDF desde CDN
    const cargarJsPDF = () => {
      return new Promise((resolve, reject) => {
        // Si ya está cargado, usar el existente
        if (window.jspdf) {
          resolve(window.jspdf.jsPDF)
          return
        }
        
        // Cargar desde CDN
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        script.onload = () => {
          if (window.jspdf) {
            resolve(window.jspdf.jsPDF)
          } else {
            reject(new Error('jsPDF no se cargó correctamente'))
          }
        }
        script.onerror = () => reject(new Error('Error cargando jsPDF desde CDN'))
        document.head.appendChild(script)
      })
    }
    
    // Función para generar PDF (carga jsPDF desde CDN)
    const descargarPDF = async () => {
      setGenerandoPDF(true)
      
      try {
        // Cargar jsPDF desde CDN
        const jsPDF = await cargarJsPDF()
        
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 15
        let yPosition = margin
        
        // Colores
        const violetRGB = [139, 92, 246]
        const slateRGB = [100, 116, 139]
        const emeraldRGB = [16, 185, 129]
        const amberRGB = [245, 158, 11]
        const blueRGB = [59, 130, 246]
        const purpleRGB = [168, 85, 247]
        const cyanRGB = [6, 182, 212]
        
        // ============ PÁGINA 1: RESUMEN EJECUTIVO ============
        
        // Header con gradiente simulado
        pdf.setFillColor(139, 92, 246)
        pdf.rect(0, 0, pageWidth, 45, 'F')
        
        // Título
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(24)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Reporte de Admisiones', margin, 20)
        
        // Subtítulo
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'normal')
        pdf.text(nombreInstitucion, margin, 30)
        
        // Período
        const periodoTexto = {
          'semana': 'Última semana',
          'mes': 'Último mes',
          'trimestre': 'Último trimestre',
          'año': 'Último año'
        }[periodo] || periodo
        pdf.text(`Período: ${periodoTexto} | Generado: ${new Date().toLocaleDateString('es-CL')}`, margin, 38)
        
        yPosition = 55
        
        // ============ KPI PRINCIPAL: CONVERSIÓN ============
        pdf.setFillColor(245, 243, 255)
        pdf.roundedRect(margin, yPosition, pageWidth - margin * 2, 35, 3, 3, 'F')
        
        pdf.setTextColor(...violetRGB)
        pdf.setFontSize(10)
        pdf.text('TASA DE CONVERSIÓN', margin + 5, yPosition + 10)
        
        pdf.setFontSize(36)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${estadisticas?.tasaConversion || 0}%`, margin + 5, yPosition + 28)
        
        // Comparación
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        const cambioTexto = cambios.conversion >= 0 ? `+${cambios.conversion}pp vs anterior` : `${cambios.conversion}pp vs anterior`
        pdf.setTextColor(cambios.conversion >= 0 ? 16 : 239, cambios.conversion >= 0 ? 185 : 68, cambios.conversion >= 0 ? 129 : 68)
        pdf.text(cambioTexto, margin + 50, yPosition + 15)
        
        // Detalle
        pdf.setTextColor(...slateRGB)
        pdf.text(`${estadisticas?.matriculados || 0} matrículas de ${estadisticas?.total || 0} leads`, margin + 50, yPosition + 25)
        
        yPosition += 45
        
        // ============ KPIS SECUNDARIOS (2x2) ============
        const kpiWidth = (pageWidth - margin * 2 - 10) / 2
        const kpiHeight = 28
        
        const kpis = [
          { label: 'Total Leads', value: estadisticas?.total || 0, subtext: cambios.leads !== 0 ? `${cambios.leads > 0 ? '+' : ''}${cambios.leads} vs anterior` : '', color: violetRGB },
          { label: 'Matrículas', value: estadisticas?.matriculados || 0, subtext: `${estadisticas?.activos || 0} en proceso`, color: emeraldRGB },
          { label: 'Tiempo Respuesta', value: estadisticas?.tiempoRespuestaPromedio ? `${estadisticas.tiempoRespuestaPromedio}h` : '-', subtext: 'Primer contacto', color: amberRGB },
          { label: 'Ciclo de Cierre', value: estadisticas?.tiempoCierrePromedio ? `${estadisticas.tiempoCierrePromedio}d` : '-', subtext: 'Días promedio', color: purpleRGB }
        ]
        
        kpis.forEach((kpi, idx) => {
          const x = margin + (idx % 2) * (kpiWidth + 10)
          const y = yPosition + Math.floor(idx / 2) * (kpiHeight + 5)
          
          pdf.setFillColor(248, 250, 252)
          pdf.roundedRect(x, y, kpiWidth, kpiHeight, 2, 2, 'F')
          
          pdf.setTextColor(...slateRGB)
          pdf.setFontSize(9)
          pdf.text(kpi.label, x + 5, y + 8)
          
          pdf.setTextColor(...kpi.color)
          pdf.setFontSize(18)
          pdf.setFont('helvetica', 'bold')
          pdf.text(String(kpi.value), x + 5, y + 20)
          
          pdf.setTextColor(...slateRGB)
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'normal')
          pdf.text(kpi.subtext, x + 45, y + 20)
        })
        
        yPosition += kpiHeight * 2 + 20
        
        // ============ EMBUDO DE CONVERSIÓN ============
        pdf.setTextColor(30, 41, 59)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Embudo de Conversión', margin, yPosition)
        yPosition += 8
        
        const embudoColores = {
          'Nuevos': amberRGB,
          'Contactados': blueRGB,
          'Seguimiento': purpleRGB,
          'Examen': cyanRGB,
          'Matriculados': emeraldRGB
        }
        
        const barHeight = 12
        const maxBarWidth = pageWidth - margin * 2 - 50
        
        datosEmbudo.forEach((item, idx) => {
          const y = yPosition + idx * (barHeight + 4)
          const barWidth = Math.max(8, (item.cantidad / Math.max(1, estadisticas?.total || 1)) * maxBarWidth)
          
          // Etiqueta
          pdf.setTextColor(...slateRGB)
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'normal')
          pdf.text(item.etapa, margin, y + 8)
          
          // Barra
          pdf.setFillColor(...(embudoColores[item.etapa] || violetRGB))
          pdf.roundedRect(margin + 35, y, barWidth, barHeight, 2, 2, 'F')
          
          // Valor dentro de la barra
          pdf.setTextColor(255, 255, 255)
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'bold')
          if (barWidth > 20) {
            pdf.text(String(item.cantidad), margin + 38, y + 8)
          }
          
          // Porcentaje al final
          pdf.setTextColor(...slateRGB)
          pdf.setFont('helvetica', 'normal')
          pdf.text(`${item.percent}%`, margin + 40 + barWidth, y + 8)
        })
        
        yPosition += datosEmbudo.length * (barHeight + 4) + 15
        
        // ============ PÁGINA 2: GRÁFICO + TABLAS ============
        pdf.addPage()
        yPosition = margin
        
        // Título gráfico
        pdf.setTextColor(30, 41, 59)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Tendencia de Leads', margin, yPosition + 5)
        yPosition += 15
        
        // Dibujar gráfico de barras manualmente
        const chartData = datosGrafico.slice(-12) // Últimos 12 períodos
        if (chartData.length > 0) {
          const chartHeight = 50
          const chartWidth = pageWidth - margin * 2
          const barWidthChart = (chartWidth - 20) / chartData.length
          const maxVal = Math.max(...chartData.map(d => d.total), 1)
          
          // Fondo del gráfico
          pdf.setFillColor(250, 250, 252)
          pdf.rect(margin, yPosition, chartWidth, chartHeight, 'F')
          
          // Líneas de guía horizontales
          pdf.setDrawColor(230, 230, 235)
          for (let i = 0; i <= 4; i++) {
            const lineY = yPosition + (chartHeight / 4) * i
            pdf.line(margin, lineY, margin + chartWidth, lineY)
          }
          
          // Barras
          chartData.forEach((d, i) => {
            const barX = margin + 10 + i * barWidthChart
            const barH = (d.total / maxVal) * (chartHeight - 10)
            const barY = yPosition + chartHeight - barH - 5
            
            // Barra total (violeta)
            pdf.setFillColor(...violetRGB)
            pdf.rect(barX, barY, barWidthChart - 4, barH, 'F')
            
            // Barra matriculados (verde) superpuesta
            if (d.matriculados > 0) {
              const matrH = (d.matriculados / maxVal) * (chartHeight - 10)
              pdf.setFillColor(...emeraldRGB)
              pdf.rect(barX, yPosition + chartHeight - matrH - 5, barWidthChart - 4, matrH, 'F')
            }
          })
          
          // Leyenda
          yPosition += chartHeight + 5
          pdf.setFontSize(8)
          pdf.setFillColor(...violetRGB)
          pdf.rect(margin, yPosition, 8, 4, 'F')
          pdf.setTextColor(...slateRGB)
          pdf.text('Total leads', margin + 10, yPosition + 3)
          
          pdf.setFillColor(...emeraldRGB)
          pdf.rect(margin + 45, yPosition, 8, 4, 'F')
          pdf.text('Matriculados', margin + 55, yPosition + 3)
          
          yPosition += 15
        } else {
          pdf.setTextColor(...slateRGB)
          pdf.setFontSize(10)
          pdf.text('Sin datos de tendencia para el período seleccionado', margin, yPosition + 5)
          yPosition += 15
        }
        
        // ============ RENDIMIENTO POR CARRERA ============
        pdf.setTextColor(30, 41, 59)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Rendimiento por Carrera/Programa', margin, yPosition + 5)
        yPosition += 12
        
        // Header tabla
        pdf.setFillColor(248, 250, 252)
        pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F')
        pdf.setTextColor(...slateRGB)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Carrera', margin + 3, yPosition + 5.5)
        pdf.text('Leads', margin + 90, yPosition + 5.5)
        pdf.text('Matrículas', margin + 115, yPosition + 5.5)
        pdf.text('Conversión', margin + 145, yPosition + 5.5)
        yPosition += 10
        
        // Filas
        pdf.setFont('helvetica', 'normal')
        const carrerasData = Object.entries(estadisticas?.porCarrera || {})
          .filter(([_, v]) => v.total > 0)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 10)
          
        carrerasData.forEach(([id, data], idx) => {
          const tasa = data.total > 0 ? Math.round((data.matriculados / data.total) * 100) : 0
          const y = yPosition + idx * 7
          
          if (idx % 2 === 0) {
            pdf.setFillColor(252, 252, 253)
            pdf.rect(margin, y - 1, pageWidth - margin * 2, 7, 'F')
          }
          
          pdf.setTextColor(30, 41, 59)
          pdf.text((data.nombre || 'Sin carrera').substring(0, 35), margin + 3, y + 4)
          pdf.text(String(data.total), margin + 90, y + 4)
          pdf.setTextColor(...emeraldRGB)
          pdf.text(String(data.matriculados), margin + 115, y + 4)
          pdf.setTextColor(tasa >= 20 ? 16 : tasa >= 10 ? 245 : 100, tasa >= 20 ? 185 : tasa >= 10 ? 158 : 116, tasa >= 20 ? 129 : tasa >= 10 ? 11 : 139)
          pdf.text(`${tasa}%`, margin + 145, y + 4)
        })
        
        yPosition += carrerasData.length * 7 + 15
        
        // ============ RENDIMIENTO POR ENCARGADO ============
        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = margin
        }
        
        pdf.setTextColor(30, 41, 59)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Rendimiento por Encargado', margin, yPosition + 5)
        yPosition += 12
        
        // Header tabla
        pdf.setFillColor(248, 250, 252)
        pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F')
        pdf.setTextColor(...slateRGB)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Encargado', margin + 3, yPosition + 5.5)
        pdf.text('Leads', margin + 80, yPosition + 5.5)
        pdf.text('Matrículas', margin + 105, yPosition + 5.5)
        pdf.text('Conversión', margin + 140, yPosition + 5.5)
        yPosition += 10
        
        pdf.setFont('helvetica', 'normal')
        const encargadosData = Object.entries(estadisticas?.porEncargado || {})
          .filter(([_, v]) => v.total > 0)
          .sort((a, b) => (b[1].tasa || 0) - (a[1].tasa || 0))
          .slice(0, 8)
          
        encargadosData.forEach(([id, data], idx) => {
          const y = yPosition + idx * 7
          
          if (idx % 2 === 0) {
            pdf.setFillColor(252, 252, 253)
            pdf.rect(margin, y - 1, pageWidth - margin * 2, 7, 'F')
          }
          
          pdf.setTextColor(30, 41, 59)
          pdf.text((data.nombre || 'Sin asignar').substring(0, 30), margin + 3, y + 4)
          pdf.text(String(data.total), margin + 80, y + 4)
          pdf.setTextColor(...emeraldRGB)
          pdf.text(String(data.matriculados), margin + 105, y + 4)
          
          const tasa = data.tasa || 0
          pdf.setTextColor(tasa >= 25 ? 16 : tasa >= 15 ? 245 : 100, tasa >= 25 ? 185 : tasa >= 15 ? 158 : 116, tasa >= 25 ? 129 : tasa >= 15 ? 11 : 139)
          pdf.text(`${tasa}%`, margin + 140, y + 4)
        })
        
        // ============ FOOTER EN TODAS LAS PÁGINAS ============
        const totalPages = pdf.internal.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i)
          pdf.setTextColor(...slateRGB)
          pdf.setFontSize(8)
          pdf.text(
            `Página ${i} de ${totalPages} | Generado por Admitio | ${new Date().toLocaleDateString('es-CL')}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          )
        }
        
        // Descargar
        const fileName = `Reporte_Admisiones_${nombreInstitucion.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaInicio}.pdf`
        pdf.save(fileName)
        
        setNotification({ type: 'success', message: 'PDF generado correctamente' })
        
      } catch (error) {
        console.error('Error generando PDF:', error)
        setNotification({ 
          type: 'error', 
          message: 'Error al generar PDF. Verifica tu conexión a internet.' 
        })
      }
      
      setGenerandoPDF(false)
    }
    
    // Calcular máximo para escala del gráfico
    const maxValor = Math.max(...datosGrafico.map(d => d.total), 1)
    
    // Componente de gráfico de barras estilo Spotify
    const BarChart = ({ data }) => {
      if (data.length === 0) return <div className="h-72 flex items-center justify-center text-slate-400">Sin datos para mostrar</div>
      
      // Limitar a máximo 15 barras para legibilidad
      const displayData = data.length > 15 ? data.slice(-15) : data
      const maxVal = Math.max(...displayData.map(d => d.total), 1)
      
      // Calcular escala Y
      const yLabels = []
      const step = Math.ceil(maxVal / 4)
      for (let i = 0; i <= 4; i++) {
        yLabels.push(step * i)
      }
      yLabels.reverse()
      
      const formatFecha = (fecha) => {
        const [year, month, day] = fecha.split('-')
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        return day ? `${parseInt(day)} ${meses[parseInt(month) - 1]}` : `${meses[parseInt(month) - 1]} ${year}`
      }
      
      return (
        <div className="h-80">
          {/* Leyenda superior */}
          <div className="flex items-center justify-end gap-6 mb-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-violet-500" />
              <span className="text-slate-600">Total leads</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-600">Matriculados</span>
            </span>
          </div>
          
          <div className="flex h-64">
            {/* Eje Y */}
            <div className="flex flex-col justify-between pr-3 text-right">
              {yLabels.map((val, i) => (
                <span key={i} className="text-xs text-slate-400 font-medium">{val}</span>
              ))}
            </div>
            
            {/* Área del gráfico */}
            <div className="flex-1 relative">
              {/* Líneas de guía horizontales */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yLabels.map((_, i) => (
                  <div key={i} className="border-t border-slate-100 w-full" />
                ))}
              </div>
              
              {/* Barras */}
              <div className="relative h-full flex items-end gap-1 px-1">
                {displayData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group min-w-[20px]">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20 whitespace-nowrap">
                      <p className="font-semibold">{formatFecha(d.fecha)}</p>
                      <p className="text-violet-300">Total: {d.total}</p>
                      <p className="text-emerald-300">Matriculados: {d.matriculados}</p>
                      <p className="text-slate-400">Descartados: {d.descartados}</p>
                    </div>
                    
                    {/* Número sobre la barra */}
                    <span className="text-xs font-bold text-slate-600 mb-1">{d.total > 0 ? d.total : ''}</span>
                    
                    {/* Barra principal (total) */}
                    <div 
                      className="w-full bg-violet-500 rounded-t-md transition-all duration-200 group-hover:bg-violet-600 relative"
                      style={{ height: `${(d.total / maxVal) * 100}%`, minHeight: d.total > 0 ? '4px' : '0' }}
                    >
                      {/* Barra interna (matriculados) */}
                      {d.matriculados > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-md"
                          style={{ height: `${(d.matriculados / d.total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Eje X - Fechas */}
          <div className="flex mt-2 pl-8">
            <div className="flex-1 flex justify-between px-1">
              {displayData.map((d, i) => (
                <span 
                  key={i} 
                  className={`text-xs text-slate-500 text-center flex-1 ${displayData.length > 10 ? 'transform -rotate-45 origin-top-left mt-1' : ''}`}
                  style={{ fontSize: displayData.length > 12 ? '10px' : '12px' }}
                >
                  {displayData.length <= 10 || i % Math.ceil(displayData.length / 7) === 0 ? formatFecha(d.fecha) : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )
    }
    
    // Componente de gráfico de líneas estilo Spotify
    const LineChart = ({ data }) => {
      if (data.length < 2) return <div className="h-72 flex items-center justify-center text-slate-400">Se necesitan al menos 2 puntos de datos</div>
      
      const displayData = data.length > 20 ? data.slice(-20) : data
      const maxVal = Math.max(...displayData.map(d => d.total), 1)
      
      // Calcular escala Y
      const yLabels = []
      const step = Math.ceil(maxVal / 4)
      for (let i = 0; i <= 4; i++) {
        yLabels.push(step * i)
      }
      yLabels.reverse()
      
      const formatFecha = (fecha) => {
        const [year, month, day] = fecha.split('-')
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        return day ? `${parseInt(day)} ${meses[parseInt(month) - 1]}` : `${meses[parseInt(month) - 1]} ${year}`
      }
      
      // Calcular puntos para el path SVG
      const chartWidth = 100
      const chartHeight = 100
      const padding = 2
      
      const getX = (i) => padding + (i / (displayData.length - 1)) * (chartWidth - padding * 2)
      const getY = (val) => chartHeight - padding - (val / maxVal) * (chartHeight - padding * 2)
      
      const pathTotal = displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.total)}`).join(' ')
      const pathMatr = displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.matriculados)}`).join(' ')
      
      // Área bajo la curva
      const areaTotal = `${pathTotal} L ${getX(displayData.length - 1)} ${chartHeight - padding} L ${getX(0)} ${chartHeight - padding} Z`
      
      return (
        <div className="h-80">
          {/* Leyenda superior */}
          <div className="flex items-center justify-end gap-6 mb-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-4 h-1 rounded-full bg-violet-500" />
              <span className="text-slate-600">Total leads</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-1 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Matriculados</span>
            </span>
          </div>
          
          <div className="flex h-64">
            {/* Eje Y */}
            <div className="flex flex-col justify-between pr-3 text-right">
              {yLabels.map((val, i) => (
                <span key={i} className="text-xs text-slate-400 font-medium">{val}</span>
              ))}
            </div>
            
            {/* Área del gráfico */}
            <div className="flex-1 relative">
              {/* Líneas de guía horizontales */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yLabels.map((_, i) => (
                  <div key={i} className="border-t border-slate-100 w-full" />
                ))}
              </div>
              
              {/* SVG del gráfico */}
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
                {/* Área sombreada */}
                <path d={areaTotal} fill="url(#gradientArea)" opacity="0.3" />
                
                {/* Degradado */}
                <defs>
                  <linearGradient id="gradientArea" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Línea de total */}
                <path d={pathTotal} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Línea de matriculados */}
                <path d={pathMatr} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Puntos interactivos */}
                {displayData.map((d, i) => (
                  <g key={i} className="group">
                    {/* Punto total */}
                    <circle 
                      cx={getX(i)} 
                      cy={getY(d.total)} 
                      r="4" 
                      fill="#8b5cf6" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    {/* Punto matriculados */}
                    <circle 
                      cx={getX(i)} 
                      cy={getY(d.matriculados)} 
                      r="4" 
                      fill="#10b981" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    {/* Área hover invisible */}
                    <rect 
                      x={getX(i) - 3} 
                      y="0" 
                      width="6" 
                      height={chartHeight} 
                      fill="transparent" 
                      className="cursor-pointer"
                    />
                  </g>
                ))}
              </svg>
              
              {/* Tooltips (fuera del SVG para mejor renderizado) */}
              <div className="absolute inset-0 flex pointer-events-none">
                {displayData.map((d, i) => (
                  <div 
                    key={i} 
                    className="flex-1 relative group pointer-events-auto"
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20 whitespace-nowrap">
                      <p className="font-semibold">{formatFecha(d.fecha)}</p>
                      <p className="text-violet-300">Total: {d.total}</p>
                      <p className="text-emerald-300">Matriculados: {d.matriculados}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Eje X - Fechas */}
          <div className="flex mt-2 pl-8">
            <div className="flex-1 flex justify-between">
              {displayData.length <= 8 ? (
                displayData.map((d, i) => (
                  <span key={i} className="text-xs text-slate-500">{formatFecha(d.fecha)}</span>
                ))
              ) : (
                <>
                  <span className="text-xs text-slate-500">{formatFecha(displayData[0].fecha)}</span>
                  <span className="text-xs text-slate-500">{formatFecha(displayData[Math.floor(displayData.length / 2)].fecha)}</span>
                  <span className="text-xs text-slate-500">{formatFecha(displayData[displayData.length - 1].fecha)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )
    }
    
    // Presets de fecha
    const setPresetFecha = (preset) => {
      const hoy = new Date()
      let inicio = new Date()
      
      switch(preset) {
        case 'semana':
          inicio.setDate(hoy.getDate() - 7)
          break
        case 'mes':
          inicio.setMonth(hoy.getMonth() - 1)
          break
        case 'trimestre':
          inicio.setMonth(hoy.getMonth() - 3)
          break
        case 'semestre':
          inicio.setMonth(hoy.getMonth() - 6)
          break
        case 'año':
          inicio.setFullYear(hoy.getFullYear() - 1)
          break
      }
      
      setFechaInicio(inicio.toISOString().split('T')[0])
      setFechaFin(hoy.toISOString().split('T')[0])
    }
    
    const hayFiltrosActivos = filtroEstados.length > 0 || filtroCarreras.length > 0 || filtroMedios.length > 0 || filtroEncargados.length > 0 || filtroTipoAlumno !== 'todos'
    
    // Estado de carga
    const [cargandoDatos, setCargandoDatos] = useState(false)
    
    // Función para recargar datos (especialmente para Rector)
    const recargarDatosReporte = async () => {
      setCargandoDatos(true)
      try {
        await reloadFromSupabase()
        // Forzar recarga del store
        store.reloadStore()
        // Actualizar estado local
        loadData()
      } catch (e) {
        console.error('Error recargando:', e)
      }
      setCargandoDatos(false)
    }
    
    return (
      <div className="space-y-6">
        {/* Banner de bienvenida para Rector */}
        {isRector && leadsReporte.length === 0 && (
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Icon name="BarChart2" size={28} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Bienvenido al Panel de Reportes</h2>
                <p className="text-violet-100 mb-4">
                  Aquí podrás ver el rendimiento de admisiones, métricas de conversión y el progreso de cada encargado.
                </p>
                <button
                  onClick={recargarDatosReporte}
                  disabled={cargandoDatos}
                  className="px-4 py-2 bg-white text-violet-600 rounded-lg font-medium hover:bg-violet-50 transition-colors flex items-center gap-2"
                >
                  {cargandoDatos ? (
                    <>
                      <Icon name="Loader2" size={18} className="animate-spin" />
                      Cargando datos...
                    </>
                  ) : (
                    <>
                      <Icon name="RefreshCw" size={18} />
                      Cargar datos de la institución
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Header con selectores de período */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="Calendar" size={20} className="text-slate-400" />
              <select
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-700 bg-white focus:ring-2 focus:ring-violet-500"
              >
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
                <option value="trimestre">Este trimestre</option>
                <option value="año">Este año</option>
              </select>
              <span className="text-slate-400 text-sm">vs período anterior</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshData}
                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Actualizar datos"
              >
                <Icon name="RefreshCw" size={18} />
              </button>
              <button
                onClick={descargarCSV}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
                title="Exportar datos como CSV"
              >
                <Icon name="FileSpreadsheet" size={18} />
                CSV
              </button>
              <button
                onClick={descargarPDF}
                disabled={generandoPDF}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                title="Exportar reporte como PDF con gráficos"
              >
                {generandoPDF ? (
                  <>
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Icon name="FileText" size={18} />
                    PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* KPI Hero - Conversión */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Conversión principal */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-violet-200 text-sm font-medium mb-1 flex items-center justify-center lg:justify-start gap-2">
                <Icon name="Target" size={16} />
                TASA DE CONVERSIÓN
              </p>
              <div className="flex items-baseline justify-center lg:justify-start gap-3">
                <span className="text-6xl lg:text-7xl font-bold">{estadisticas?.tasaConversion || 0}%</span>
                {cambios.conversion !== 0 && (
                  <span className={`flex items-center gap-1 text-lg font-medium ${cambios.conversion > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    <Icon name={cambios.conversion > 0 ? 'TrendingUp' : 'TrendingDown'} size={20} />
                    {cambios.conversion > 0 ? '+' : ''}{cambios.conversion}pp
                  </span>
                )}
              </div>
              <p className="text-violet-200 mt-2">
                <span className="text-white font-bold">{estadisticas?.matriculados || 0}</span> matrículas de{' '}
                <span className="text-white font-bold">{estadisticas?.total || 0}</span> leads
              </p>
            </div>
            
            {/* Barra de progreso visual */}
            <div className="w-full lg:w-64">
              <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, estadisticas?.tasaConversion || 0)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-violet-200">
                <span>0%</span>
                <span>Meta: 25%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* KPIs Secundarios */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Total Leads</p>
                <p className="text-2xl font-bold text-slate-800">{estadisticas?.total || 0}</p>
              </div>
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <Icon name="Users" size={24} className="text-violet-600" />
              </div>
            </div>
            {cambios.leads !== 0 && (
              <p className={`text-sm mt-2 flex items-center gap-1 ${cambios.leads > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <Icon name={cambios.leads > 0 ? 'TrendingUp' : 'TrendingDown'} size={14} />
                {cambios.leads > 0 ? '+' : ''}{cambios.leads} vs anterior
              </p>
            )}
          </div>
          
          {/* KPI Matrículas con Meta - Destacado para Rector */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 shadow-sm border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm font-medium">Matrículas</p>
                <p className="text-2xl font-bold text-emerald-700">{estadisticas?.matriculados || 0}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Icon name="GraduationCap" size={24} className="text-white" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
                <span>Progreso del período</span>
                <span className="font-medium">{estadisticas?.activos || 0} en proceso</span>
              </div>
              <div className="h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((estadisticas?.matriculados || 0) / Math.max(1, (estadisticas?.total || 1))) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">T. Respuesta</p>
                {(() => {
                  const tiempo = formatearTiempoRespuesta(estadisticas?.tiempoRespuestaPromedio)
                  return <p className={`text-2xl font-bold ${tiempo.color}`}>{tiempo.texto || '-'}</p>
                })()}
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Icon name="Zap" size={24} className="text-amber-600" />
              </div>
            </div>
            <p className="text-sm mt-2 text-slate-500">Primer contacto</p>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Ciclo Cierre</p>
                <p className="text-2xl font-bold text-purple-600">
                  {estadisticas?.tiempoCierrePromedio ? `${estadisticas.tiempoCierrePromedio}d` : '-'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Icon name="Calendar" size={24} className="text-purple-600" />
              </div>
            </div>
            <p className="text-sm mt-2 text-slate-500">Días promedio</p>
          </div>
        </div>
        
        {/* Tabs de navegación */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {[
              { id: 'embudo', icon: 'Filter', label: 'Embudo' },
              { id: 'tendencia', icon: 'TrendingUp', label: 'Tendencia' },
              { id: 'carreras', icon: 'GraduationCap', label: 'Carreras' },
              { id: 'medios', icon: 'Share2', label: 'Medios' },
              ...(isKeyMaster || user?.rol_id === 'superadmin' || isRector ? [{ id: 'encargados', icon: 'Users', label: 'Encargados' }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="p-6">
            {/* Tab: Embudo */}
            {activeTab === 'embudo' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-slate-800">Embudo de Conversión</h3>
                <div className="space-y-3">
                  {datosEmbudo.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-28 text-sm text-slate-600 font-medium">{item.etapa}</div>
                      <div className="flex-1 h-10 bg-slate-100 rounded-lg overflow-hidden relative">
                        <div 
                          className={`h-full ${item.color} transition-all duration-700 flex items-center justify-end pr-3`}
                          style={{ width: `${Math.max(5, (item.cantidad / (estadisticas?.total || 1)) * 100)}%` }}
                        >
                          <span className="text-white font-bold text-sm">{item.cantidad}</span>
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm text-slate-500">{item.percent}%</div>
                    </div>
                  ))}
                </div>
                
                {/* Descartados separado */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-28 text-sm text-slate-400 font-medium">Descartados</div>
                    <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 transition-all duration-700 flex items-center justify-end pr-3"
                        style={{ width: `${Math.max(5, ((estadisticas?.descartados || 0) / (estadisticas?.total || 1)) * 100)}%` }}
                      >
                        <span className="text-white font-bold text-sm">{estadisticas?.descartados || 0}</span>
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm text-slate-400">
                      {estadisticas?.total > 0 ? Math.round((estadisticas.descartados / estadisticas.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tab: Tendencia */}
            {activeTab === 'tendencia' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Evolución Temporal</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={agrupacion}
                      onChange={e => setAgrupacion(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="dia">Por día</option>
                      <option value="semana">Por semana</option>
                      <option value="mes">Por mes</option>
                    </select>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setTipoGrafico('linea')}
                        className={`px-3 py-1.5 ${tipoGrafico === 'linea' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600'}`}
                      >
                        <Icon name="TrendingUp" size={16} />
                      </button>
                      <button
                        onClick={() => setTipoGrafico('barra')}
                        className={`px-3 py-1.5 ${tipoGrafico === 'barra' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600'}`}
                      >
                        <Icon name="BarChart2" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div data-chart-tendencia className="bg-white">
                  {datosGrafico.length > 0 ? (
                    tipoGrafico === 'linea' ? <LineChart data={datosGrafico} /> : <BarChart data={datosGrafico} />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400">
                      No hay datos para el período seleccionado
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Tab: Carreras */}
            {activeTab === 'carreras' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Rendimiento por Carrera</h3>
                <div className="space-y-3">
                  {Object.entries(estadisticas?.porCarrera || {})
                    .filter(([_, v]) => v.total > 0)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([id, data]) => {
                      const tasa = data.total > 0 ? Math.round((data.matriculados / data.total) * 100) : 0
                      return (
                        <div key={id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className={`w-3 h-3 rounded-full ${data.color || 'bg-slate-400'}`} />
                          <span className="flex-1 font-medium text-slate-700">{data.nombre}</span>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-slate-500 w-20">{data.total} leads</span>
                            <span className="text-emerald-600 w-16">{data.matriculados} mat.</span>
                            <span className={`font-bold w-12 text-right ${tasa >= 20 ? 'text-emerald-600' : tasa >= 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {tasa}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  {Object.keys(estadisticas?.porCarrera || {}).length === 0 && (
                    <p className="text-center text-slate-400 py-8">Sin datos de carreras</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Tab: Medios */}
            {activeTab === 'medios' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Rendimiento por Medio</h3>
                <div className="space-y-3">
                  {Object.entries(estadisticas?.porMedio || {})
                    .filter(([_, v]) => v.total > 0)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([id, data]) => {
                      const tasa = data.total > 0 ? Math.round((data.matriculados / data.total) * 100) : 0
                      return (
                        <div key={id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <Icon name="Share2" size={16} className="text-slate-400" />
                          <span className="flex-1 font-medium text-slate-700 capitalize">{data.nombre}</span>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-slate-500 w-20">{data.total} leads</span>
                            <span className="text-emerald-600 w-16">{data.matriculados} mat.</span>
                            <span className={`font-bold w-12 text-right ${tasa >= 20 ? 'text-emerald-600' : tasa >= 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {tasa}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  {Object.keys(estadisticas?.porMedio || {}).length === 0 && (
                    <p className="text-center text-slate-400 py-8">Sin datos de medios</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Tab: Encargados */}
            {activeTab === 'encargados' && (isKeyMaster || user?.rol_id === 'superadmin' || isRector) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Rendimiento por Encargado</h3>
                  <span className="text-sm text-slate-500">
                    {Object.keys(estadisticas?.porEncargado || {}).filter(k => k !== 'sin_asignar').length} encargados activos
                  </span>
                </div>
                
                {/* Resumen rápido */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-violet-600">
                      {Object.values(estadisticas?.porEncargado || {}).reduce((sum, e) => sum + e.total, 0)}
                    </p>
                    <p className="text-xs text-violet-600">Total asignados</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {Object.values(estadisticas?.porEncargado || {}).reduce((sum, e) => sum + e.matriculados, 0)}
                    </p>
                    <p className="text-xs text-emerald-600">Matrículas totales</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {(() => {
                        const tasas = Object.values(estadisticas?.porEncargado || {}).filter(e => e.total > 0).map(e => e.tasa || 0)
                        return tasas.length > 0 ? Math.round(tasas.reduce((a, b) => a + b, 0) / tasas.length) : 0
                      })()}%
                    </p>
                    <p className="text-xs text-amber-600">Conversión promedio</p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                        <th className="pb-3 font-medium">Encargado</th>
                        <th className="pb-3 text-center font-medium">Leads</th>
                        <th className="pb-3 text-center font-medium">Activos</th>
                        <th className="pb-3 text-center font-medium">Matrículas</th>
                        <th className="pb-3 text-center font-medium">Conversión</th>
                        <th className="pb-3 text-right font-medium">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(estadisticas?.porEncargado || {})
                        .filter(([id, _]) => id !== 'sin_asignar')
                        .sort((a, b) => (b[1].tasa || 0) - (a[1].tasa || 0))
                        .map(([id, data]) => {
                          // Calcular activos (no matriculados ni descartados)
                          const activos = leadsReporte.filter(l => 
                            l.asignado_a === id && !l.matriculado && !l.descartado
                          ).length
                          
                          return (
                            <tr key={id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium">
                                      {data.nombre?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-slate-800 block">{data.nombre || 'Sin nombre'}</span>
                                    <span className="text-xs text-slate-400">Encargado</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 text-center text-slate-600 font-medium">{data.total}</td>
                              <td className="py-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  activos > 5 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {activos}
                                </span>
                              </td>
                              <td className="py-4 text-center text-emerald-600 font-bold">{data.matriculados}</td>
                              <td className="py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${
                                  (data.tasa || 0) >= 25 ? 'bg-emerald-100 text-emerald-700' :
                                  (data.tasa || 0) >= 15 ? 'bg-amber-100 text-amber-700' :
                                  (data.tasa || 0) > 0 ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {data.tasa || 0}%
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${
                                        (data.tasa || 0) >= 25 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                        (data.tasa || 0) >= 15 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                        'bg-gradient-to-r from-slate-300 to-slate-400'
                                      }`}
                                      style={{ width: `${Math.min(100, (data.tasa || 0) * 2)}%` }}
                                    />
                                  </div>
                                  {(data.tasa || 0) >= 25 && <Icon name="TrendingUp" size={16} className="text-emerald-500" />}
                                  {(data.tasa || 0) > 0 && (data.tasa || 0) < 15 && <Icon name="TrendingDown" size={16} className="text-orange-500" />}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      
                      {/* Fila de Sin Asignar si hay leads sin asignar */}
                      {estadisticas?.porEncargado?.['sin_asignar']?.total > 0 && (
                        <tr className="border-b border-slate-50 bg-amber-50/50">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                                <Icon name="AlertCircle" size={20} className="text-amber-600" />
                              </div>
                              <div>
                                <span className="font-medium text-amber-800 block">Sin Asignar</span>
                                <span className="text-xs text-amber-600">Requiere atención</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center text-amber-700 font-medium">
                            {estadisticas.porEncargado['sin_asignar'].total}
                          </td>
                          <td className="py-4 text-center text-amber-600">-</td>
                          <td className="py-4 text-center text-amber-600">-</td>
                          <td className="py-4 text-center text-amber-600">-</td>
                          <td className="py-4 text-right">
                            <span className="text-xs text-amber-600">Asignar leads</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {Object.keys(estadisticas?.porEncargado || {}).filter(k => k !== 'sin_asignar').length === 0 && (
                    <div className="text-center py-12">
                      <Icon name="Users" size={48} className="text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No hay encargados con leads asignados</p>
                      <p className="text-slate-400 text-sm mt-1">Los leads deben ser asignados a encargados para ver métricas</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Resumen rápido al final */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Distribución por Tipo</h3>
            <div className="flex items-center justify-around py-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-blue-600">{estadisticas?.porTipoAlumno?.nuevo || 0}</span>
                </div>
                <p className="text-sm text-slate-600">Nuevos</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-violet-600">{estadisticas?.porTipoAlumno?.antiguo || 0}</span>
                </div>
                <p className="text-sm text-slate-600">Antiguos</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Período Anterior</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Leads</span>
                <span className="font-medium text-slate-800">{estadisticasAnteriores?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Matrículas</span>
                <span className="font-medium text-emerald-600">{estadisticasAnteriores?.matriculados || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Conversión</span>
                <span className="font-medium text-violet-600">{estadisticasAnteriores?.tasaConversion || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // FORMULARIOS VIEW - Editor mejorado sin re-renders
  // ============================================
  const FormulariosView = () => {
    const [editingForm, setEditingForm] = useState(null)
    const [localShowModal, setLocalShowModal] = useState(false)
    
    const handleDeleteForm = async (formId) => {
      if (confirm('¿Eliminar formulario?')) {
        const result = await store.deleteFormulario(formId)
        if (result?.error) {
          setNotification({ type: 'error', message: result.error })
          setTimeout(() => setNotification(null), 3000)
        } else {
          setNotification({ type: 'success', message: 'Formulario eliminado' })
          setTimeout(() => setNotification(null), 3000)
          await reloadFromSupabase()
          loadData()
        }
      }
    }
    
    const handleEditForm = (form) => {
      setEditingForm(form)
      setLocalShowModal(true)
    }
    
    const handleNewForm = () => {
      if (!puedeCrearFormulario()) {
        setLimiteAlerta({
          tipo: 'formularios',
          mensaje: `Has alcanzado el límite de ${planInfo?.limites?.max_formularios || 1} formulario(s) de tu plan ${planInfo?.nombre || 'actual'}. Actualiza tu plan para crear más formularios.`
        })
        return
      }
      setEditingForm(null)
      setLocalShowModal(true)
    }
    
    const handleFormCreated = () => {
      loadData()
      setLocalShowModal(false)
      setEditingForm(null)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Formularios Embebibles</h2>
            <p className="text-slate-500">Crea formularios para capturar leads desde tu sitio web</p>
          </div>
          <button onClick={handleNewForm} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2">
            <Icon name="Plus" size={20} /> Nuevo Formulario
          </button>
        </div>
        
        {formularios.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icon name="FileCode" size={32} className="text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Sin formularios</h3>
            <p className="text-slate-500 mb-4">Crea tu primer formulario para empezar a capturar leads</p>
            <button onClick={handleNewForm} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700">
              Crear Formulario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formularios.map(form => (
              <div key={form.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{form.nombre}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{form.descripcion || 'Sin descripción'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ml-2 ${form.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Icon name="Users" size={14} />
                    {form.leads_recibidos || 0} leads
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="List" size={14} />
                    {form.campos_extra?.length || 0} campos
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditForm(form)}
                    className="flex-1 px-3 py-2 bg-violet-50 text-violet-600 rounded-lg text-sm font-medium hover:bg-violet-100 flex items-center justify-center gap-1"
                  >
                    <Icon name="Edit" size={14} /> Editar
                  </button>
                  <button 
                    onClick={() => handleDeleteForm(form.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Usar el nuevo ModalFormulario */}
        <ModalFormulario
          isOpen={localShowModal}
          onClose={() => { setLocalShowModal(false); setEditingForm(null); }}
          onCreated={handleFormCreated}
          institucionId={user?.institucion_id}
          editForm={editingForm}
        />
      </div>
    )
  }

  // ============================================
  // USUARIOS VIEW
  // ============================================
  const UsuariosView = () => {
    const isSuperAdmin = user?.rol_id === 'superadmin'
    const [usuarios, setUsuarios] = useState(store.getUsuarios(user?.id, isSuperAdmin))
    const [localEditingUser, setLocalEditingUser] = useState(null)
    const [localShowUserModal, setLocalShowUserModal] = useState(false)
    const [localShowDeleteModal, setLocalShowDeleteModal] = useState(null)
    const [migrateToUser, setMigrateToUser] = useState('')
    const [userFormData, setUserFormData] = useState({
      nombre: '',
      email: '',
      password: '',
      rol_id: 'encargado',
      activo: true
    })
    
    const refreshUsuarios = () => setUsuarios(store.getUsuarios(user?.id, isSuperAdmin))
    
    const openNewUser = () => {
      if (!puedeCrearUsuario()) {
        setLimiteAlerta({
          tipo: 'usuarios',
          mensaje: `Has alcanzado el límite de ${planInfo?.limites?.max_usuarios || 1} usuario(s) de tu plan ${planInfo?.nombre || 'actual'}. Actualiza tu plan para agregar más usuarios.`
        })
        return
      }
      setLocalEditingUser(null)
      setUserFormData({
        nombre: '',
        email: '',
        password: '',
        rol_id: 'encargado',
        activo: true
      })
      setLocalShowUserModal(true)
    }
    
    const openEditUser = (user) => {
      setLocalEditingUser(user)
      setUserFormData({
        nombre: user.nombre,
        email: user.email,
        password: '',
        rol_id: user.rol_id,
        activo: user.activo
      })
      setLocalShowUserModal(true)
    }
    
    const handleSaveUser = async () => {
      if (!userFormData.nombre || !userFormData.email) {
        alert('Nombre y email son requeridos')
        return
      }
      
      try {
        if (localEditingUser) {
          // Actualizar usuario existente
          const updates = {
            nombre: userFormData.nombre,
            email: userFormData.email,
            rol_id: userFormData.rol_id,
            activo: userFormData.activo
          }
          await store.updateUsuario(localEditingUser.id, updates)
          setNotification({ type: 'success', message: 'Usuario actualizado' })
        } else {
          // Crear nuevo usuario
          const nuevoUsuario = await store.createUsuario({
            nombre: userFormData.nombre,
            email: userFormData.email,
            rol_id: userFormData.rol_id,
            activo: userFormData.activo
          })
          
          console.log('✅ Usuario creado:', nuevoUsuario)
          setNotification({ 
            type: 'success', 
            message: 'Usuario creado. Debe usar "Olvidé mi contraseña" para activar su cuenta.' 
          })
          
          // Actualizar contador de uso del plan si existe
          if (actualizarUso) actualizarUso('usuarios', 1)
        }
        
        setLocalShowUserModal(false)
        
        // Recargar usuarios desde Supabase para tener datos frescos
        if (reloadFromSupabase) {
          await reloadFromSupabase()
        }
        refreshUsuarios()
        
      } catch (error) {
        console.error('Error guardando usuario:', error)
        
        // Mostrar mensaje de error específico
        let errorMsg = 'Error al guardar usuario'
        if (error.message?.includes('duplicate') || error.code === '23505') {
          errorMsg = 'Ya existe un usuario con ese email'
        } else if (error.message) {
          errorMsg = error.message
        }
        
        setNotification({ type: 'error', message: errorMsg })
      }
      
      setTimeout(() => setNotification(null), 4000)
    }
    
    const handleToggleActivo = async (userId) => {
      try {
        await store.toggleUsuarioActivo(userId)
        refreshUsuarios()
        setNotification({ type: 'info', message: 'Estado actualizado' })
      } catch (error) {
        console.error('Error:', error)
        setNotification({ type: 'error', message: 'Error al actualizar estado' })
      }
      setTimeout(() => setNotification(null), 2000)
    }
    
    const openDeleteModal = (user) => {
      const leads = store.getLeadsPorUsuario(user.id)
      setLocalShowDeleteModal({ user, leadsCount: leads.length })
      setMigrateToUser('')
    }
    
    const handleDeleteUser = async () => {
      const { user: targetUser, leadsCount } = localShowDeleteModal
      
      // Si tiene leads y no seleccionó migración
      if (leadsCount > 0 && !migrateToUser) {
        alert('Debes seleccionar un encargado para migrar los leads')
        return
      }
      
      // Migrar leads si es necesario
      if (leadsCount > 0 && migrateToUser) {
        const resultado = store.migrarLeads(localShowDeleteModal.user.id, migrateToUser, user?.id)
        if (resultado) {
          setNotification({ 
            type: 'success', 
            message: `${resultado.migrados} leads migrados. Se generó reporte para el nuevo encargado.` 
          })
        }
      }
      
      // Eliminar usuario
      const result = await store.deleteUsuario(targetUser.id)
      if (result.success) {
        setNotification({ type: 'success', message: 'Usuario eliminado correctamente' })
        // Recargar desde Supabase
        await reloadFromSupabase()
      } else {
        setNotification({ type: 'error', message: result.error })
      }
      
      setLocalShowDeleteModal(null)
      refreshUsuarios()
      setTimeout(() => setNotification(null), 3000)
    }
    
    const encargadosParaMigrar = usuarios.filter(u => 
      u.rol_id === 'encargado' && 
      u.activo && 
      u.id !== localShowDeleteModal?.user?.id
    )
    
    const ROLES_DISPONIBLES = [
      ...(isSuperAdmin ? [{ id: 'superadmin', nombre: 'Super Administrador', desc: 'Acceso total del propietario (oculto)' }] : []),
      { id: 'keymaster', nombre: 'Key Master', desc: 'Control total del sistema' },
      { id: 'encargado', nombre: 'Encargado de Admisión', desc: 'Gestiona leads asignados' },
      { id: 'asistente', nombre: 'Asistente/Secretaría', desc: 'Solo crea leads' },
      { id: 'rector', nombre: 'Rector', desc: 'Solo ve reportes' },
    ]
    
    // Verificar si puede eliminar un usuario
    const puedeEliminar = (targetUser) => {
      // No puede eliminarse a sí mismo
      if (targetUser.id === user?.id) return false
      // Solo superadmin puede eliminar keymaster
      if (targetUser.rol_id === 'keymaster' && !isSuperAdmin) return false
      // Solo superadmin puede eliminar superadmin
      if (targetUser.rol_id === 'superadmin' && !isSuperAdmin) return false
      return true
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
          <button
            onClick={openNewUser}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2"
          >
            <Icon name="UserPlus" size={20} />
            Nuevo Usuario
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          u.rol_id === 'keymaster' ? 'bg-violet-500' :
                          u.rol_id === 'rector' ? 'bg-amber-500' :
                          u.rol_id === 'encargado' ? 'bg-blue-500' :
                          'bg-slate-400'
                        }`}>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.rol_id === 'keymaster' ? 'bg-violet-100 text-violet-700' :
                        u.rol_id === 'rector' ? 'bg-amber-100 text-amber-700' :
                        u.rol_id === 'encargado' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {ROLES_DISPONIBLES.find(r => r.id === u.rol_id)?.nombre || u.rol_id}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {u.rol_id === 'encargado' ? (
                        <span className="font-medium text-slate-700">{leadsCount}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActivo(u.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          u.activo 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditUser(u)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Icon name="Edit" size={18} />
                        </button>
                        {puedeEliminar(u) && (
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Icon name="Trash2" size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Modal Crear/Editar Usuario */}
        {localShowUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">
                  {localEditingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button onClick={() => setLocalShowUserModal(false)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
                  <Icon name="X" size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
                  <input
                    type="text"
                    value={userFormData.nombre}
                    onChange={e => setUserFormData({...userFormData, nombre: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="juan@projazz.cl"
                  />
                  {!localEditingUser && (
                    <p className="text-xs text-slate-400 mt-1">
                      El usuario recibirá instrucciones para activar su cuenta
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
                  <select
                    value={userFormData.rol_id}
                    onChange={e => setUserFormData({...userFormData, rol_id: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    {ROLES_DISPONIBLES.map(rol => (
                      <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {ROLES_DISPONIBLES.find(r => r.id === userFormData.rol_id)?.desc}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.activo}
                      onChange={e => setUserFormData({...userFormData, activo: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                  <span className="text-sm text-slate-700">Usuario activo</span>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setLocalShowUserModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUser}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700"
                >
                  {localEditingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Eliminar Usuario */}
        {localShowDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="AlertTriangle" className="text-red-600" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Eliminar Usuario</h3>
                  <p className="text-slate-500 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="font-semibold text-slate-800">{localShowDeleteModal.user.nombre}</p>
                <p className="text-sm text-slate-500">{localShowDeleteModal.user.email}</p>
              </div>
              
              {localShowDeleteModal.leadsCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="AlertCircle" className="text-amber-600" size={20} />
                    <p className="font-medium text-amber-800">
                      Este usuario tiene {localShowDeleteModal.leadsCount} lead{localShowDeleteModal.leadsCount !== 1 ? 's' : ''} asignado{localShowDeleteModal.leadsCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <p className="text-sm text-amber-700 mb-3">
                    Antes de eliminar, debes migrar los leads a otro encargado. Se mantendrán todos los estados y se generará un reporte para el nuevo encargado.
                  </p>
                  
                  <label className="block text-sm font-medium text-amber-800 mb-2">
                    Migrar leads a: *
                  </label>
                  <select
                    value={migrateToUser}
                    onChange={e => setMigrateToUser(e.target.value)}
                    className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecciona un encargado...</option>
                    {encargadosParaMigrar.map(enc => (
                      <option key={enc.id} value={enc.id}>
                        {enc.nombre} ({store.getLeadsPorUsuario(enc.id).length} leads actuales)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setLocalShowDeleteModal(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={localShowDeleteModal.leadsCount > 0 && !migrateToUser}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Icon name="Trash2" size={18} />
                  {localShowDeleteModal.leadsCount > 0 ? 'Migrar y Eliminar' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // CONFIGURACIÓN VIEW - Plan y Uso
  // ============================================
  const ConfiguracionView = () => {
    const PLANES_INFO = {
      free: { nombre: 'Gratis', color: 'slate', descripcion: 'Ideal para probar la plataforma' },
      prueba: { nombre: 'Prueba', color: 'slate', descripcion: 'Plan de prueba gratuito' },
      inicial: { nombre: 'Inicial', color: 'blue', descripcion: 'Para instituciones pequeñas' },
      profesional: { nombre: 'Profesional', color: 'violet', descripcion: 'Para instituciones en crecimiento' },
      premium: { nombre: 'Premium', color: 'amber', descripcion: 'Para instituciones consolidadas' },
      enterprise: { nombre: 'Enterprise', color: 'emerald', descripcion: 'Solución personalizada' },
    }

    const planActual = PLANES_INFO[planInfo?.plan] || PLANES_INFO.free
    const limites = planInfo?.limites || { max_leads: 10, max_usuarios: 1, max_formularios: 1 }
    const uso = planInfo?.uso || { leads: 0, usuarios: 0, formularios: 0 }

    const BarraUso = ({ label, usado, maximo, color = 'violet' }) => {
      const porcentaje = maximo > 0 ? Math.min(100, Math.round((usado / maximo) * 100)) : 0
      const colorClasses = {
        violet: { bg: 'bg-violet-500', light: 'bg-violet-100' },
        emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100' },
        blue: { bg: 'bg-blue-500', light: 'bg-blue-100' },
        amber: { bg: 'bg-amber-500', light: 'bg-amber-100' },
        red: { bg: 'bg-red-500', light: 'bg-red-100' },
      }
      const c = colorClasses[porcentaje >= 90 ? 'red' : porcentaje >= 70 ? 'amber' : color]
      
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{label}</span>
            <span className="font-medium text-slate-800">{usado} / {maximo}</span>
          </div>
          <div className={`h-3 ${c.light} rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${c.bg} rounded-full transition-all duration-500`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          {porcentaje >= 90 && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <Icon name="AlertTriangle" size={12} />
              {porcentaje >= 100 ? 'Límite alcanzado' : 'Cerca del límite'}
            </p>
          )}
        </div>
      )
    }

    const handleContactUpgrade = () => {
      const asunto = encodeURIComponent(`Upgrade de Plan - ${institucion?.nombre || 'Mi Institución'}`)
      const cuerpo = encodeURIComponent(`Hola,

Me gustaría conocer más sobre los planes de Admitio para mi institución.

Datos actuales:
- Institución: ${institucion?.nombre || 'N/A'}
- Plan actual: ${planActual.nombre}
- Leads actuales: ${uso.leads}
- Usuarios actuales: ${uso.usuarios}

Gracias.`)
      
      window.open(`mailto:contacto@admitio.cl?subject=${asunto}&body=${cuerpo}`, '_blank')
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Icon name="Settings" className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configuración</h1>
              <p className="text-slate-300">Gestiona tu cuenta y plan de suscripción</p>
            </div>
          </div>
        </div>

        {/* Info del Usuario */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Icon name="User" size={20} className="text-slate-400" />
            Información de la Cuenta
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Usuario</p>
              <p className="font-medium text-slate-800">{user?.nombre}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-800">{user?.email}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Rol</p>
              <p className="font-medium text-slate-800 capitalize">{user?.rol_id}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Institución</p>
              <p className="font-medium text-slate-800">{institucion?.nombre || nombreInstitucion}</p>
            </div>
          </div>
        </div>

        {/* Plan Actual */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Icon name="CreditCard" size={20} className="text-slate-400" />
              Plan Actual
            </h3>
            <span className={`px-4 py-2 rounded-full text-sm font-bold bg-${planActual.color}-100 text-${planActual.color}-700`}>
              {planActual.nombre}
            </span>
          </div>
          
          <p className="text-slate-500 mb-6">{planActual.descripcion}</p>

          {/* Barras de uso */}
          <div className="space-y-6">
            <BarraUso 
              label="Leads" 
              usado={uso.leads} 
              maximo={limites.max_leads} 
              color="violet"
            />
            <BarraUso 
              label="Usuarios" 
              usado={uso.usuarios} 
              maximo={limites.max_usuarios} 
              color="blue"
            />
            <BarraUso 
              label="Formularios" 
              usado={uso.formularios} 
              maximo={limites.max_formularios} 
              color="emerald"
            />
          </div>
        </div>

        {/* Mejorar Plan */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Zap" className="text-violet-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">¿Necesitas más capacidad?</h3>
              <p className="text-slate-600 text-sm mb-4">
                Actualiza tu plan para obtener más leads, usuarios y funcionalidades avanzadas.
              </p>
              <button
                onClick={handleContactUpgrade}
                className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
              >
                <Icon name="Mail" size={18} />
                Contactar para Upgrade
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Planes */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Comparativa de Planes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Característica</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-medium">Gratis</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-medium">Inicial</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-medium">Profesional</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-600">Leads</td>
                  <td className="py-3 px-4 text-center font-medium">10</td>
                  <td className="py-3 px-4 text-center font-medium">300</td>
                  <td className="py-3 px-4 text-center font-medium">1,500</td>
                  <td className="py-3 px-4 text-center font-medium">5,000</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-600">Usuarios</td>
                  <td className="py-3 px-4 text-center font-medium">1</td>
                  <td className="py-3 px-4 text-center font-medium">5</td>
                  <td className="py-3 px-4 text-center font-medium">15</td>
                  <td className="py-3 px-4 text-center font-medium">50</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-600">Formularios</td>
                  <td className="py-3 px-4 text-center font-medium">1</td>
                  <td className="py-3 px-4 text-center font-medium">1</td>
                  <td className="py-3 px-4 text-center font-medium">3</td>
                  <td className="py-3 px-4 text-center font-medium">10</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-600">Importar CSV</td>
                  <td className="py-3 px-4 text-center"><Icon name="X" size={16} className="inline text-slate-300" /></td>
                  <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                  <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                  <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-600">Reportes Avanzados</td>
                  <td className="py-3 px-4 text-center"><Icon name="X" size={16} className="inline text-slate-300" /></td>
                  <td className="py-3 px-4 text-center"><Icon name="X" size={16} className="inline text-slate-300" /></td>
                  <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                  <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Integración Google Sheets - Solo Enterprise */}
        {planInfo?.plan === 'enterprise' && (
          <IntegracionGoogleSheets />
        )}
      </div>
    )
  }

  // ============================================
  // INTEGRACIÓN GOOGLE SHEETS - Componente Enterprise
  // ============================================
  const IntegracionGoogleSheets = () => {
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
          setNotification({ type: 'success', message: 'API Key generada correctamente' })
        } else {
          throw new Error(data?.error || 'Error desconocido')
        }
      } catch (e) {
        console.error('Error generando API Key:', e)
        setNotification({ type: 'error', message: 'Error al generar API Key: ' + e.message })
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
                    className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      copiado 
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

  // ============================================
  // IMPORTACIONES SHEETS VIEW - Cola de revisión
  // ============================================
  const ImportacionesSheetsView = () => {
    const [importaciones, setImportaciones] = useState([])
    const [loading, setLoading] = useState(true)
    const [procesando, setProcesando] = useState(null)
    const [filtro, setFiltro] = useState('pendientes') // pendientes, todos
    const [stats, setStats] = useState({ pendientes: 0, sinConflicto: 0, conConflicto: 0 })
    
    const carreras = store.getCarreras() || []
    
    useEffect(() => {
      cargarImportaciones()
    }, [filtro])
    
    const cargarImportaciones = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('leads_importados')
          .select('*')
          .eq('institucion_id', user?.institucion_id)
          .order('created_at', { ascending: false })
        
        if (filtro === 'pendientes') {
          query = query.eq('estado', 'pendiente')
        }
        
        const { data, error } = await query.limit(100)
        
        if (error) throw error
        setImportaciones(data || [])
        
        // Cargar stats
        const { data: statsData } = await supabase
          .from('v_stats_importacion')
          .select('*')
          .eq('institucion_id', user?.institucion_id)
          .single()
        
        if (statsData) {
          setStats({
            pendientes: statsData.pendientes || 0,
            sinConflicto: statsData.sin_conflicto || 0,
            conConflicto: statsData.con_conflicto || 0
          })
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
          setNotification({ type: 'success', message: 'Lead aprobado correctamente' })
          cargarImportaciones()
          loadData() // Recargar datos del dashboard
        }
      } catch (e) {
        setNotification({ type: 'error', message: 'Error al aprobar: ' + e.message })
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
        
        setNotification({ type: 'info', message: 'Lead rechazado' })
        cargarImportaciones()
      } catch (e) {
        setNotification({ type: 'error', message: 'Error: ' + e.message })
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
          setNotification({ type: 'success', message: 'Lead existente actualizado' })
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
        loadData()
      } catch (e) {
        setNotification({ type: 'error', message: 'Error: ' + e.message })
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
        
        setNotification({ type: 'success', message: `${data.aprobados} leads aprobados` })
        cargarImportaciones()
        loadData()
      } catch (e) {
        setNotification({ type: 'error', message: 'Error: ' + e.message })
      }
      setProcesando(null)
    }
    
    // Componente para card de lead importado
    const LeadImportadoCard = ({ item }) => {
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
              <LeadImportadoCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // PROGRAMAS VIEW - Gestión de Carreras/Cursos
  // ============================================
  const ProgramasView = () => {
    const [showModal, setShowModal] = useState(false)
    const [editingPrograma, setEditingPrograma] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState(null)
    const [importError, setImportError] = useState(null)
    const [deleteError, setDeleteError] = useState(null)
    
    const carreras = store.getCarreras() || []
    
    const carrerasFiltradas = carreras.filter(c => 
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    // Contar leads por carrera
    const leadsCount = (carreraId) => {
      return consultas.filter(c => c.carrera_id === carreraId).length
    }
    
    // Colores disponibles para carreras
    const coloresDisponibles = [
      { id: 'bg-violet-500', nombre: 'Violeta', hex: '#8b5cf6' },
      { id: 'bg-blue-500', nombre: 'Azul', hex: '#3b82f6' },
      { id: 'bg-emerald-500', nombre: 'Verde', hex: '#10b981' },
      { id: 'bg-amber-500', nombre: 'Ámbar', hex: '#f59e0b' },
      { id: 'bg-rose-500', nombre: 'Rosa', hex: '#f43f5e' },
      { id: 'bg-cyan-500', nombre: 'Cian', hex: '#06b6d4' },
      { id: 'bg-orange-500', nombre: 'Naranja', hex: '#f97316' },
      { id: 'bg-pink-500', nombre: 'Rosado', hex: '#ec4899' },
      { id: 'bg-indigo-500', nombre: 'Índigo', hex: '#6366f1' },
      { id: 'bg-teal-500', nombre: 'Teal', hex: '#14b8a6' },
    ]
    
    const handleCreate = async (data) => {
      const result = await store.createCarrera(data)
      if (result?.error) {
        setDeleteError(result.error)
        setTimeout(() => setDeleteError(null), 5000)
      } else {
        setShowModal(false)
        // Recargar desde Supabase
        await reloadFromSupabase()
        loadData()
      }
    }
    
    const handleUpdate = async (id, data) => {
      const result = await store.updateCarrera(id, data)
      if (result?.error) {
        setDeleteError(result.error)
        setTimeout(() => setDeleteError(null), 5000)
      } else {
        setEditingPrograma(null)
        await reloadFromSupabase()
        loadData()
      }
    }
    
    const handleDelete = async (id) => {
      const result = await store.deleteCarrera(id)
      if (result.error === 'TIENE_LEADS') {
        setDeleteError(`No se puede eliminar: tiene ${result.count} leads asociados. Reasigna los leads primero.`)
        setTimeout(() => setDeleteError(null), 5000)
      } else if (result.error) {
        setDeleteError(result.error)
        setTimeout(() => setDeleteError(null), 5000)
      } else {
        await reloadFromSupabase()
        loadData()
      }
    }
    
    const handleFileUpload = (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target.result
          const lines = text.split('\n').filter(line => line.trim())
          
          // Detectar si tiene header
          const firstLine = lines[0].toLowerCase()
          const hasHeader = firstLine.includes('nombre') || firstLine.includes('carrera') || firstLine.includes('curso')
          
          const dataLines = hasHeader ? lines.slice(1) : lines
          
          const carreras = dataLines.map((line, idx) => {
            const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/"/g, ''))
            return {
              nombre: cols[0] || `Programa ${idx + 1}`,
              color: cols[1] || coloresDisponibles[idx % coloresDisponibles.length].id
            }
          }).filter(c => c.nombre)
          
          if (carreras.length === 0) {
            setImportError('No se encontraron datos válidos en el archivo')
            return
          }
          
          setImportData(carreras)
          setImportError(null)
        } catch (err) {
          setImportError('Error al procesar el archivo: ' + err.message)
        }
      }
      reader.readAsText(file)
    }
    
    const handleImport = async () => {
      if (!importData || importData.length === 0) return
      
      const result = await store.importarCarreras(importData)
      if (result?.error) {
        setImportError(result.error)
      } else {
        setShowImportModal(false)
        setImportData(null)
        await reloadFromSupabase()
        loadData()
      }
    }
    
    const handleExport = () => {
      const csv = 'nombre,color\n' + carreras.map(c => `"${c.nombre}","${c.color}"`).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `carreras_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    }
    
    // Modal de Crear/Editar
    const ProgramaModal = ({ programa, onSave, onClose }) => {
      const [nombre, setNombre] = useState(programa?.nombre || '')
      const [color, setColor] = useState(programa?.color || 'bg-violet-500')
      
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">
                  {programa ? 'Editar Programa' : 'Nuevo Programa'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del programa *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Ingeniería Civil, 1° Básico, Guitarra..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Color identificador
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {coloresDisponibles.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setColor(c.id)}
                      className={`w-full aspect-square rounded-lg ${c.id} transition-all ${
                        color === c.id ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'
                      }`}
                      title={c.nombre}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => onSave({ nombre, color })}
                disabled={!nombre.trim()}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {programa ? 'Guardar cambios' : 'Crear programa'}
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Icon name="GraduationCap" className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Carreras / Cursos</h1>
                <p className="text-violet-200">
                  Gestiona los programas de tu institución
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium flex items-center gap-2"
              >
                <Icon name="Upload" size={18} />
                Importar CSV
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium flex items-center gap-2"
              >
                <Icon name="Download" size={18} />
                Exportar
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-white hover:bg-white/90 text-violet-600 rounded-lg font-medium flex items-center gap-2"
              >
                <Icon name="Plus" size={18} />
                Nuevo
              </button>
            </div>
          </div>
        </div>
        
        {/* Alerta de error */}
        {deleteError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Icon name="AlertTriangle" size={20} className="text-red-500" />
            <p className="text-red-700">{deleteError}</p>
            <button onClick={() => setDeleteError(null)} className="ml-auto">
              <Icon name="X" size={18} className="text-red-400" />
            </button>
          </div>
        )}
        
        {/* Búsqueda */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar programa..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        
        {/* Lista de programas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {carrerasFiltradas.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="GraduationCap" size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">
                {searchTerm ? 'Sin resultados' : 'Sin programas'}
              </h3>
              <p className="text-slate-500 mb-4">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Agrega tu primer programa o importa desde CSV'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
                >
                  Crear primer programa
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-3 font-medium">Programa</th>
                  <th className="px-6 py-3 font-medium text-center">Leads</th>
                  <th className="px-6 py-3 font-medium text-center">Estado</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {carrerasFiltradas.map(carrera => (
                  <tr key={carrera.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${carrera.color || 'bg-violet-500'}`} />
                        <span className="font-medium text-slate-800">{carrera.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        leadsCount(carrera.id) > 0 
                          ? 'bg-violet-100 text-violet-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {leadsCount(carrera.id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        carrera.activa !== false
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {carrera.activa !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingPrograma(carrera)}
                          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                          title="Editar"
                        >
                          <Icon name="Edit2" size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar "${carrera.nombre}"?`)) {
                              handleDelete(carrera.id)
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Total programas</p>
            <p className="text-2xl font-bold text-slate-800">{carreras.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Activos</p>
            <p className="text-2xl font-bold text-emerald-600">
              {carreras.filter(c => c.activa !== false).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Con leads</p>
            <p className="text-2xl font-bold text-violet-600">
              {carreras.filter(c => leadsCount(c.id) > 0).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Total leads</p>
            <p className="text-2xl font-bold text-blue-600">{consultas.length}</p>
          </div>
        </div>
        
        {/* Modal Crear/Editar */}
        {(showModal || editingPrograma) && (
          <ProgramaModal
            programa={editingPrograma}
            onSave={editingPrograma 
              ? (data) => handleUpdate(editingPrograma.id, data)
              : handleCreate
            }
            onClose={() => {
              setShowModal(false)
              setEditingPrograma(null)
            }}
          />
        )}
        
        {/* Modal Importar CSV */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">Importar desde CSV</h2>
                  <button 
                    onClick={() => {
                      setShowImportModal(false)
                      setImportData(null)
                      setImportError(null)
                    }} 
                    className="p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <Icon name="X" size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-2">
                    <strong>Formato esperado:</strong> Una columna con el nombre del programa.
                  </p>
                  <code className="text-xs text-slate-500 block">
                    nombre<br/>
                    Ingeniería Civil<br/>
                    Medicina<br/>
                    1° Básico
                  </code>
                </div>
                
                <div>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                  />
                </div>
                
                {importError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {importError}
                  </div>
                )}
                
                {importData && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-emerald-700 font-medium mb-2">
                      ✓ {importData.length} programas encontrados
                    </p>
                    <ul className="text-sm text-emerald-600 max-h-32 overflow-y-auto">
                      {importData.slice(0, 5).map((c, i) => (
                        <li key={i}>• {c.nombre}</li>
                      ))}
                      {importData.length > 5 && (
                        <li className="text-emerald-500">... y {importData.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportData(null)
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData}
                  className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Importar {importData?.length || 0} programas
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // IMPORTAR VIEW - Con Historial de Importaciones
  // ============================================

const ImportarView = () => {
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [historialImportaciones, setHistorialImportaciones] = useState([])
  const [estadisticasImport, setEstadisticasImport] = useState(null)
  const [selectedImportacion, setSelectedImportacion] = useState(null)
  const [encargadoSeleccionado, setEncargadoSeleccionado] = useState('auto') // 'auto' = asignación automática
  
  // Obtener lista de encargados activos
  const encargadosActivos = store.getEncargadosActivos() || []
  
  // Cargar historial al montar
  useEffect(() => {
    cargarHistorial()
  }, [])
  
  const cargarHistorial = () => {
    setHistorialImportaciones(store.getHistorialImportaciones(10))
    setEstadisticasImport(store.getEstadisticasImportaciones())
  }
  
const handleImportCSV = async () => {
    if (!importFile) return
    
    setImporting(true)
    setImportResult(null)
    
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      const csvData = e.target.result
      
      // Pasar opciones con el encargado seleccionado
      const opciones = {
        asignarA: encargadoSeleccionado !== 'auto' ? encargadoSeleccionado : null
      }
      
      const result = await store.importarLeadsCSV(csvData, user?.id, {}, opciones)
      
      setImportResult(result)
      setImporting(false)
      
      if (result.success && result.importados > 0) {
        // Obtener nombre del encargado si se seleccionó uno específico
        const encargadoNombre = encargadoSeleccionado !== 'auto' 
          ? encargadosActivos.find(e => e.id === encargadoSeleccionado)?.nombre 
          : null
        
        // Notificación de éxito
        setNotification({ 
          type: 'success', 
          message: `✅ ${result.importados} leads importados${encargadoNombre ? ` y asignados a ${encargadoNombre}` : ''}${result.duplicados > 0 ? ` (${result.duplicados} duplicados omitidos)` : ''}` 
        })
        setTimeout(() => setNotification(null), 5000)
        cargarHistorial()
        
        // IMPORTANTE: Recargar desde Supabase para ver los nuevos leads
        try {
          await reloadFromSupabase()
        } catch (err) {
          console.error('Error recargando:', err)
        }
        loadData()
        
        // Cerrar modal de importación
        if (typeof setShowImportModal === 'function') setShowImportModal(false)
      }
    }
    
    reader.onerror = () => {
      setImporting(false)
      setImportResult({ success: false, error: 'Error al leer el archivo' })
    }
    
    reader.readAsText(importFile)
}
  const descargarPlantilla = () => {
    const plantilla = `nombre,email,telefono,carrera,notas
"Juan Pérez","juan@email.com","+56912345678","Guitarra Eléctrica","Interesado en clases presenciales"
"María García","maria@email.com","+56987654321","Canto Popular","Consulta por horarios"`
    
    const blob = new Blob([plantilla], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'plantilla_importacion_admitio.csv'
    link.click()
  }
  
  const formatFechaHora = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Header con ícono */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Icon name="Upload" className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Importar Base de Datos</h1>
            <p className="text-blue-200">Carga tu Excel o CSV para comenzar rápidamente</p>
          </div>
        </div>
      </div>
      
      {/* Estadísticas de importaciones */}
      {estadisticasImport && estadisticasImport.totalImportaciones > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Total Importaciones</p>
            <p className="text-2xl font-bold text-slate-800">{estadisticasImport.totalImportaciones}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Leads Importados</p>
            <p className="text-2xl font-bold text-emerald-600">{estadisticasImport.totalLeadsImportados}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Duplicados Detectados</p>
            <p className="text-2xl font-bold text-amber-600">{estadisticasImport.totalDuplicados}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Última Importación</p>
            <p className="text-sm font-medium text-slate-800">
              {estadisticasImport.ultimaImportacion 
                ? formatFechaHora(estadisticasImport.ultimaImportacion.fecha)
                : 'Nunca'}
            </p>
          </div>
        </div>
      )}
      
      {/* Importación de Datos */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="Upload" className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Importar Base de Datos</h3>
            <p className="text-sm text-slate-500">Carga masiva de leads desde un archivo CSV</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-blue-800 mb-2 font-medium">📋 Formato del archivo CSV:</p>
          <ul className="text-sm text-blue-700 space-y-1 ml-4">
            <li>• <strong>nombre</strong> (requerido): Nombre completo del lead</li>
            <li>• <strong>email</strong>: Correo electrónico</li>
            <li>• <strong>telefono</strong>: Número de teléfono</li>
            <li>• <strong>carrera</strong>: Nombre del instrumento/carrera</li>
            <li>• <strong>notas</strong>: Observaciones o comentarios</li>
          </ul>
          <button
            onClick={descargarPlantilla}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Icon name="Download" size={14} />
            Descargar plantilla de ejemplo
          </button>
        </div>
        
        {/* Selector de encargado para asignación */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Icon name="UserPlus" size={20} className="text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-violet-800 font-medium mb-2">Asignar leads a:</p>
              <select
                value={encargadoSeleccionado}
                onChange={(e) => setEncargadoSeleccionado(e.target.value)}
                className="w-full px-4 py-2.5 border border-violet-300 rounded-lg text-slate-700 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="auto">🔄 Asignación automática (round-robin)</option>
                <option value="" disabled>──────────────────</option>
                {encargadosActivos.map(enc => (
                  <option key={enc.id} value={enc.id}>
                    👤 {enc.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-violet-600 mt-2">
                {encargadoSeleccionado === 'auto' 
                  ? 'Los leads se distribuirán automáticamente entre los encargados activos'
                  : `Todos los leads se asignarán a ${encargadosActivos.find(e => e.id === encargadoSeleccionado)?.nombre || 'el encargado seleccionado'}`
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex-1">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setImportFile(e.target.files[0])
                setImportResult(null)
              }}
              className="hidden"
            />
            <div className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              importFile 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
            }`}>
              <Icon name={importFile ? "FileCheck" : "File"} className={importFile ? "text-blue-500" : "text-slate-400"} size={24} />
              <div>
                <p className="font-medium text-slate-700">
                  {importFile ? importFile.name : 'Seleccionar archivo CSV'}
                </p>
                <p className="text-xs text-slate-400">
                  {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Click para seleccionar'}
                </p>
              </div>
              {importFile && (
                <button 
                  onClick={(e) => { e.preventDefault(); setImportFile(null); setImportResult(null); }}
                  className="ml-auto p-1 text-slate-400 hover:text-red-500"
                >
                  <Icon name="X" size={18} />
                </button>
              )}
            </div>
          </label>
          
          <button
            onClick={handleImportCSV}
            disabled={!importFile || importing}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
          >
            {importing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Icon name="Upload" size={20} />
                Importar
              </>
            )}
          </button>
        </div>
        
        {/* Resultado de importación inline (cuando no es exitoso o hay errores) */}
        {importResult && !showSuccessModal && (
          <div className={`mt-4 p-4 rounded-xl ${
            importResult.success 
              ? importResult.importados === 0 
                ? 'bg-amber-50 border border-amber-200' 
                : 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {importResult.success ? (
              importResult.importados === 0 ? (
                <>
                  <p className="font-medium text-amber-800 flex items-center gap-2">
                    <Icon name="AlertTriangle" size={20} />
                    No se importaron leads
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {importResult.duplicados > 0 
                      ? `Todos los ${importResult.duplicados} registros ya existen en la base de datos.`
                      : 'El archivo no contenía datos válidos para importar.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-emerald-800 flex items-center gap-2">
                    <Icon name="CheckCircle" size={20} />
                    Importación completada
                  </p>
                  <div className="mt-2 text-sm text-emerald-700">
                    <p>✓ {importResult.importados} leads importados</p>
                    {importResult.duplicados > 0 && <p>⚠️ {importResult.duplicados} duplicados omitidos</p>}
                  </div>
                </>
              )
            ) : (
              <p className="text-red-800 flex items-center gap-2">
                <Icon name="AlertCircle" size={20} />
                Error: {importResult.error}
              </p>
            )}
            
            {/* Mostrar errores detallados */}
            {importResult.errores?.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">
                  Ver {importResult.errores.length} advertencia{importResult.errores.length !== 1 ? 's' : ''}
                </summary>
                <ul className="mt-2 ml-4 text-xs text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errores.slice(0, 15).map((err, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <Icon name="ChevronRight" size={12} className="mt-0.5 flex-shrink-0" />
                      {err}
                    </li>
                  ))}
                  {importResult.errores.length > 15 && (
                    <li className="text-slate-400">... y {importResult.errores.length - 15} más</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
      
      {/* Historial de Importaciones */}
      {historialImportaciones.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Icon name="History" className="text-violet-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Historial de Importaciones</h3>
                <p className="text-sm text-slate-500">Últimas {historialImportaciones.length} importaciones realizadas</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Usuario</th>
                  <th className="pb-3 font-medium text-center">Importados</th>
                  <th className="pb-3 font-medium text-center">Duplicados</th>
                  <th className="pb-3 font-medium text-center">Errores</th>
                  <th className="pb-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historialImportaciones.map((imp) => (
                  <tr key={imp.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{formatFechaHora(imp.fecha)}</p>
                      <p className="text-xs text-slate-400">ID: {imp.id}</p>
                    </td>
                    <td className="py-3 text-slate-600">{imp.usuario_nombre}</td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {imp.importados}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {imp.duplicados > 0 ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                          {imp.duplicados}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {imp.errores > 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {imp.errores}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => setSelectedImportacion(imp)}
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Icon name="Eye" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Guía de migración */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <Icon name="HelpCircle" className="text-violet-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Guía de Migración desde Excel/Google Sheets</h3>
            <p className="text-sm text-slate-500">Pasos para importar tu base de datos existente</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">1</div>
            <div>
              <p className="font-medium text-slate-800">Prepara tu archivo</p>
              <p className="text-sm text-slate-500">Abre tu Excel o Google Sheets y asegúrate de que la primera fila tenga los nombres de las columnas (nombre, email, telefono, etc.)</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">2</div>
            <div>
              <p className="font-medium text-slate-800">Exporta a CSV</p>
              <p className="text-sm text-slate-500">En Excel: Archivo → Guardar como → CSV. En Google Sheets: Archivo → Descargar → CSV (.csv)</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">3</div>
            <div>
              <p className="font-medium text-slate-800">Sube el archivo</p>
              <p className="text-sm text-slate-500">Usa el botón de arriba para seleccionar tu archivo CSV y haz click en "Importar"</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">✓</div>
            <div>
              <p className="font-medium text-slate-800">Revisa los resultados</p>
              <p className="text-sm text-slate-500">El sistema detectará automáticamente duplicados y te mostrará un resumen de la importación</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>💡 Tip:</strong> Si tus columnas tienen nombres diferentes (ej: "Nombre Completo" en vez de "nombre"), el sistema intentará reconocerlas automáticamente. Si no funciona, renombra las columnas en tu archivo original.
          </p>
        </div>
      </div>

      {/* Reset de datos */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4 text-red-600 flex items-center gap-2">
          <Icon name="AlertTriangle" size={20} />
          Zona de Peligro
        </h3>
        <p className="text-slate-500 mb-4">Resetear la base de datos a los datos iniciales de prueba. Esta acción eliminará todos los leads y actividad actual.</p>
        <button 
          onClick={() => { 
            if(confirm('¿Estás seguro? Esta acción eliminará TODOS los datos actuales y no se puede deshacer.')) { 
              store.resetStore(); 
              loadData(); 
              cargarHistorial();
              setNotification({ type: 'info', message: 'Datos reseteados' }); 
              setTimeout(() => setNotification(null), 2000); 
            }
          }}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 flex items-center gap-2 border border-red-200"
        >
          <Icon name="RefreshCw" size={20} /> Resetear Datos
        </button>
      </div>
      
      {/* ============================================ */}
      {/* MODAL DE ÉXITO - Aparece cuando importa bien */}
      {/* ============================================ */}
      {showSuccessModal && importResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSuccessModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center animate-bounce-in" onClick={e => e.stopPropagation()}>
            {/* Icono animado */}
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Icon name="CheckCircle" className="text-emerald-600" size={48} />
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Importación Exitosa!</h3>
            <p className="text-slate-500 mb-6">Los leads han sido agregados a tu base de datos</p>
            
            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-emerald-600">{importResult.importados}</p>
                <p className="text-sm text-emerald-700">Importados</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-amber-600">{importResult.duplicados}</p>
                <p className="text-sm text-amber-700">Duplicados</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-slate-600">{importResult.errores?.length || 0}</p>
                <p className="text-sm text-slate-700">Errores</p>
              </div>
            </div>
            
            {/* Info del registro */}
            {importResult.registro && (
              <div className="text-sm text-slate-500 mb-6 p-3 bg-slate-50 rounded-lg">
                <p>Registro: <span className="font-mono text-xs">{importResult.registro.id}</span></p>
                <p>Fecha: {formatFechaHora(importResult.registro.fecha)}</p>
              </div>
            )}
            
            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setImportFile(null)
                  setImportResult(null)
                }}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
              >
                Importar Otro
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setActiveTab('consultas')
                }}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Icon name="Users" size={18} />
                Ver Leads
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* MODAL DE DETALLES DE IMPORTACIÓN */}
      {/* ============================================ */}
      {selectedImportacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImportacion(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Detalles de Importación</h3>
                  <p className="text-slate-500 text-sm">{formatFechaHora(selectedImportacion.fecha)}</p>
                </div>
                <button onClick={() => setSelectedImportacion(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                  <Icon name="X" size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {/* Resumen */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">{selectedImportacion.total_procesados}</p>
                  <p className="text-xs text-slate-500">Procesados</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{selectedImportacion.importados}</p>
                  <p className="text-xs text-emerald-700">Importados</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{selectedImportacion.duplicados}</p>
                  <p className="text-xs text-amber-700">Duplicados</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedImportacion.errores}</p>
                  <p className="text-xs text-red-700">Errores</p>
                </div>
              </div>
              
              {/* Info */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm"><strong>Usuario:</strong> {selectedImportacion.usuario_nombre}</p>
                <p className="text-sm"><strong>ID:</strong> <span className="font-mono text-xs">{selectedImportacion.id}</span></p>
              </div>
              
              {/* Leads importados */}
              {selectedImportacion.leads_creados?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Icon name="UserPlus" size={18} className="text-emerald-500" />
                    Leads Importados ({selectedImportacion.leads_creados.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <tbody>
                        {selectedImportacion.leads_creados.map((lead, i) => (
                          <tr key={lead.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-3 py-2 font-medium text-slate-700">{lead.nombre}</td>
                            <td className="px-3 py-2 text-slate-400 text-xs font-mono">{lead.id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Errores */}
              {selectedImportacion.detalles_errores?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Icon name="AlertCircle" size={18} className="text-red-500" />
                    Errores/Advertencias ({selectedImportacion.detalles_errores.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg bg-red-50">
                    <ul className="p-3 space-y-1">
                      {selectedImportacion.detalles_errores.map((err, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <Icon name="ChevronRight" size={14} className="mt-0.5 flex-shrink-0" />
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



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
            className={`p-1.5 rounded-lg transition-all ${
              copied 
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
              onClick={handleLogout}
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
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'consultas' && <ConsultasView />}
        {activeTab === 'detalle' && <DetalleView />}
        {activeTab === 'historial' && <HistorialView />}
        {activeTab === 'reportes' && <ReportesView />}
        {activeTab === 'formularios' && <FormulariosView />}
        {activeTab === 'usuarios' && <UsuariosView />}
        {activeTab === 'programas' && <ProgramasView />}
        {activeTab === 'importaciones_sheets' && <ImportacionesSheetsView />}
        {activeTab === 'importar' && <ImportarView />}
        {activeTab === 'configuracion' && <ConfiguracionView />}
      </div>
      
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
                    <p className="text-slate-500 text-sm">{leadsHoy.length} lead{leadsHoy.length !== 1 ? 's' : ''} requiere{leadsHoy.length === 1 ? '' : 'n'} tu atención</p>
                  </div>
                </div>
                <button onClick={() => setShowLeadsHoyModal(false)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {leadsHoy.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="CheckCircle" className="text-emerald-600" size={32} />
                  </div>
                  <p className="text-slate-600 font-medium">¡Todo al día!</p>
                  <p className="text-slate-400 text-sm">No tienes leads pendientes de contactar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leadsHoy.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setShowLeadsHoyModal(false)
                        selectConsulta(c.id)
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                        c.nuevoInteres ? 'bg-violet-50 border border-violet-200' :
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
          <div className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 
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
