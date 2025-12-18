import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import * as store from '../lib/store'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { ESTADOS, CARRERAS, MEDIOS, TIPOS_ALUMNO } from '../data/mockData'

// Componente separado para el textarea de notas (evita re-renders)
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
  
  const handleSave = () => {
    if (notas !== (consulta?.notas || '')) {
      store.updateConsulta(consulta.id, { notas }, userId)
      setSaved(true)
      if (onSaved) onSaved()
    }
  }
  
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
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
        className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
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

// Componente separado para el modal de nueva consulta (evita re-renders)
const ModalNuevaConsulta = ({ isOpen, onClose, onCreated, isKeyMaster, userId, userRol }) => {
  const [formData, setFormData] = useState({
    nombre: '', email: '', telefono: '', carrera_id: '', medio_id: 'web', notas: '', asignado_a: '', tipo_alumno: 'nuevo'
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [duplicados, setDuplicados] = useState([])
  const [showDuplicadoAlert, setShowDuplicadoAlert] = useState(false)
  const [selectedDuplicado, setSelectedDuplicado] = useState(null)
  
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
    setSubmitting(true)
    
    const carreraSeleccionada = carrerasDisponibles.find(c => String(c.id) === String(formData.carrera_id))
    
    const newConsulta = store.createConsulta({
      ...formData,
      carrera_id: formData.carrera_id || null,  // Mantener como string (UUID)
      carrera_nombre: carreraSeleccionada?.nombre || null,  // Guardar nombre también
      asignado_a: formData.asignado_a || null
    }, userId, userRol)
    
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
  const { user, institucion, signOut, isKeyMaster, isRector, isEncargado, isAsistente, canViewAll, canEdit, canConfig, canCreateLeads, canReasignar } = useAuth()
  
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
  
  // Estados para sidebar responsive
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const [formFormData, setFormFormData] = useState({
    nombre: '',
    descripcion: '',
    mostrar_carreras: true,
    campos_extra: []
  })

  // Cargar datos inicial
  useEffect(() => {
    loadData()
  }, [user])

  // ========== SUPABASE REALTIME ==========
  // Escuchar cambios en tiempo real
  useEffect(() => {
    if (!isSupabaseConfigured() || !user?.institucion_id) return

    console.log('🔌 Conectando Supabase Realtime...')
    
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads', filter: `institucion_id=eq.${user.institucion_id}` },
        (payload) => {
          console.log('📡 Cambio en leads:', payload.eventType)
          store.reloadStore()
          loadData()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios', filter: `institucion_id=eq.${user.institucion_id}` },
        (payload) => {
          console.log('📡 Cambio en usuarios:', payload.eventType)
          store.reloadStore()
          loadData()
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status)
      })

    return () => {
      console.log('🔌 Desconectando Realtime...')
      supabase.removeChannel(channel)
    }
  }, [user?.institucion_id])
  // ========================================

  function loadData() {
    const data = store.getConsultas(user?.id, user?.rol_id)
    setConsultas(data)
    
    if (isEncargado) {
      setMetricas(store.getMetricasEncargado(user.id))
      setLeadsHoy(store.getLeadsContactarHoy(user.id, user.rol_id))
    } else if (isKeyMaster) {
      setLeadsHoy(store.getLeadsContactarHoy())
    }
    setMetricasGlobales(store.getMetricasGlobales())
    setFormularios(store.getFormularios())
  }

  const filteredConsultas = consultas.filter(c => {
    const matchCarrera = filterCarrera === 'todas' || c.carrera?.nombre === filterCarrera
    const matchEstado = filterEstado === 'todos' || c.estado === filterEstado
    const matchTipo = filterTipoAlumno === 'todos' || c.tipo_alumno === filterTipoAlumno
    const matchSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCarrera && matchEstado && matchTipo && matchSearch
  })

  function handleUpdateEstado(id, nuevoEstado) {
    store.updateConsulta(id, { estado: nuevoEstado }, user.id)
    loadData()
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
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
    const navItems = [
      { id: 'dashboard', icon: 'Home', label: 'Dashboard', show: !isRector },
      { id: 'consultas', icon: 'Users', label: 'Consultas', show: !isRector, badge: consultas.filter(c => c.estado === 'nueva').length },
      { id: 'historial', icon: 'Archive', label: 'Historial', show: !isRector },
      { id: 'reportes', icon: 'BarChart', label: isRector ? 'Dashboard' : 'Reportes', show: isKeyMaster || isRector || isEncargado || user?.rol_id === 'superadmin' },
      { id: 'formularios', icon: 'FileCode', label: 'Formularios', show: isKeyMaster || user?.rol_id === 'superadmin' },
      { id: 'usuarios', icon: 'User', label: 'Usuarios', show: isKeyMaster || user?.rol_id === 'superadmin' },
      { id: 'config', icon: 'Upload', label: 'Importar', show: isKeyMaster || user?.rol_id === 'superadmin' },
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
<<<<<<< HEAD
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
=======
        className="p-2 text-violet-700 hover:bg-violet-50 rounded-lg"
>>>>>>> d430e39bd1f137fe271a8df4d86875a8e54430bd
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
        onClick={() => setShowModal(true)}
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
            {tiempoResp !== null && (
              <div className={`p-4 rounded-xl border ${tiempoResp <= 4 ? 'bg-emerald-50 border-emerald-200' : tiempoResp <= 8 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tiempoResp <= 4 ? 'bg-emerald-100 text-emerald-600' : tiempoResp <= 8 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                    <Icon name="Zap" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tiempo de Respuesta</p>
                    <p className={`text-2xl font-bold ${tiempoResp <= 4 ? 'text-emerald-600' : tiempoResp <= 8 ? 'text-amber-600' : 'text-red-600'}`}>
                      {tiempoResp}h promedio
                    </p>
                  </div>
                </div>
              </div>
            )}
            {tiempoCierre !== null && tiempoCierre > 0 && (
              <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                    <Icon name="Calendar" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tiempo de Cierre</p>
                    <p className="text-2xl font-bold text-blue-600">{tiempoCierre} días promedio</p>
                  </div>
                </div>
              </div>
            )}
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
            <button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl p-5 text-left hover:from-violet-700 hover:to-purple-700 transition-all">
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
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2">
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
      { estado: 'nueva', titulo: 'Nuevas', color: 'border-blue-500' },
      { estado: 'contactado', titulo: 'Contactados', color: 'border-amber-500' },
      { estado: 'seguimiento', titulo: 'Seguimiento', color: 'border-purple-500' },
      { estado: 'examen_admision', titulo: 'Examen Adm.', color: 'border-cyan-500' },
      { estado: 'matriculado', titulo: 'Matriculados', color: 'border-emerald-500' },
    ]

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columnas.map(col => (
          <div key={col.estado} className={`flex-shrink-0 w-72 bg-slate-100 rounded-xl p-4 border-t-4 ${col.color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{col.titulo}</h3>
              <span className="px-2 py-1 bg-white rounded-full text-sm font-medium text-slate-600">
                {filteredConsultas.filter(c => c.estado === col.estado).length}
              </span>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {filteredConsultas.filter(c => c.estado === col.estado).map(consulta => (
                <div key={consulta.id}
                     onClick={() => selectConsulta(consulta.id)}
                     className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-slate-800 text-sm">{consulta.nombre}</p>
                    <span className={MEDIOS.find(m => m.id === consulta.medio_id)?.color}>
                      <Icon name={consulta.medio?.icono || 'Globe'} size={16} />
                    </span>
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
                    <span className="flex items-center gap-1">
                      <Icon name="Mail" size={12} /> {consulta.emails_enviados}/2
                    </span>
                  </div>
                  {isKeyMaster && consulta.encargado && (
                    <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                      → {consulta.encargado.nombre}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
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
            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="p-4">
                <p className="font-medium text-slate-800">{c.nombre}</p>
                <p className="text-xs text-slate-400">{formatDateShort(c.created_at)}</p>
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
                <span className={`px-2 py-1 rounded-full text-xs ${ESTADOS[c.estado]?.bg} ${ESTADOS[c.estado]?.text}`}>
                  {ESTADOS[c.estado]?.label}
                </span>
              </td>
              {isKeyMaster && (
                <td className="p-4 text-sm text-slate-600">{c.encargado?.nombre || '-'}</td>
              )}
              <td className="p-4">
                <div className="flex items-center justify-center gap-1">
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
  const handleReasignar = useCallback((id, nuevoEncargado) => {
    const encargado = store.getUsuarios().find(u => u.id === nuevoEncargado)
    store.updateConsulta(id, { asignado_a: nuevoEncargado }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
    setNotification({ type: 'success', message: `Lead asignado a ${encargado?.nombre || 'Sin asignar'}` })
    setTimeout(() => setNotification(null), 3000)
  }, [selectedConsulta?.id, user?.id])
  
  // Handler para cambiar tipo alumno
  const handleTipoAlumnoChange = useCallback((id, tipo) => {
    store.updateConsulta(id, { tipo_alumno: tipo }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
  }, [selectedConsulta?.id, user?.id])

  // ============================================
  // DETALLE VIEW - Con notas editables
  // ============================================
  const DetalleView = () => {
    if (!selectedConsulta) return null
    const c = selectedConsulta
    const encargados = store.getUsuarios().filter(u => u.rol_id === 'encargado')
    
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

    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedConsulta(null); setActiveTab('consultas'); }}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
          <Icon name="ArrowLeft" size={20} /> Volver
        </button>
        
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
            {canEdit && !c.matriculado && !c.descartado && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4">Cambiar Estado</h3>
                <div className="space-y-2">
                  {Object.values(ESTADOS).filter(e => e.id !== c.estado).map(estado => (
                    <button key={estado.id}
                            onClick={() => handleUpdateEstado(c.id, estado.id)}
                            className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${estado.bg} ${estado.text} hover:opacity-80`}>
                      {estado.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canEdit && !c.matriculado && !c.descartado && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4">Tipo de Alumno</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleTipoAlumnoChange(c.id, 'nuevo')}
                          className={`flex-1 px-4 py-3 rounded-lg text-center transition-colors ${c.tipo_alumno === 'nuevo' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    Nuevo
                  </button>
                  <button onClick={() => handleTipoAlumnoChange(c.id, 'antiguo')}
                          className={`flex-1 px-4 py-3 rounded-lg text-center transition-colors ${c.tipo_alumno === 'antiguo' ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4">Reasignar</h3>
                <select value={c.asignado_a || ''}
                        onChange={(e) => handleReasignar(c.id, e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // REPORTES VIEW - Dashboard para Rector con Gráficos
  // ============================================
  const ReportesView = () => {
    // Estados para filtros
    const [fechaInicio, setFechaInicio] = useState(() => {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      return d.toISOString().split('T')[0]
    })
    const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0])
    const [filtroEstados, setFiltroEstados] = useState([])
    const [filtroCarreras, setFiltroCarreras] = useState([])
    const [filtroMedios, setFiltroMedios] = useState([])
    const [filtroEncargados, setFiltroEncargados] = useState([])
    const [filtroTipoAlumno, setFiltroTipoAlumno] = useState('todos')
    const [tipoGrafico, setTipoGrafico] = useState('linea')
    const [agrupacion, setAgrupacion] = useState('dia')
    const [showFilters, setShowFilters] = useState(false)
    
    // Obtener datos filtrados
    const leadsReporte = store.getReporteLeads({
      fechaInicio,
      fechaFin,
      estados: filtroEstados,
      carreras: filtroCarreras,
      medios: filtroMedios,
      encargados: filtroEncargados,
      tipoAlumno: filtroTipoAlumno,
      userId: user?.id,
      rol: user?.rol_id
    })
    
    const estadisticas = store.getEstadisticasReporte(leadsReporte)
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
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Icon name="BarChart3" className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Centro de Reportes</h1>
                <p className="text-violet-200">
                  {isEncargado ? 'Análisis de tus leads' : 'Análisis completo de admisiones'}
                </p>
              </div>
            </div>
            <button
              onClick={descargarCSV}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Icon name="Download" size={20} />
              Descargar CSV
            </button>
          </div>
        </div>
        
        {/* Filtros de fecha */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon name="Calendar" size={20} className="text-slate-400" />
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              />
              <span className="text-slate-400">a</span>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div className="flex gap-1">
              {[
                { id: 'semana', label: '7D' },
                { id: 'mes', label: '1M' },
                { id: 'trimestre', label: '3M' },
                { id: 'semestre', label: '6M' },
                { id: 'año', label: '1A' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPresetFecha(p.id)}
                  className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-violet-50 hover:border-violet-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            
            <div className="flex-1" />
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                showFilters || hayFiltrosActivos 
                  ? 'bg-violet-100 text-violet-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon name="Filter" size={18} />
              Filtros
              {hayFiltrosActivos && (
                <span className="w-5 h-5 bg-violet-600 text-white rounded-full text-xs flex items-center justify-center">
                  {filtroEstados.length + filtroCarreras.length + filtroMedios.length + filtroEncargados.length + (filtroTipoAlumno !== 'todos' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
          
          {/* Panel de filtros expandible */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              {/* Estados */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Estados</label>
                <div className="flex flex-wrap gap-2">
                  {estadosDisponibles.map(est => (
                    <button
                      key={est.id}
                      onClick={() => toggleFiltro(filtroEstados, setFiltroEstados, est.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filtroEstados.includes(est.id)
                          ? `${est.color} text-white`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {est.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Carreras */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Carreras</label>
                <div className="flex flex-wrap gap-2">
                  {carreras.map(car => (
                    <button
                      key={car.id}
                      onClick={() => toggleFiltro(filtroCarreras, setFiltroCarreras, car.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filtroCarreras.includes(car.id)
                          ? `${car.color} text-white`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {car.nombre}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Medios */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Medio de contacto</label>
                <div className="flex flex-wrap gap-2">
                  {medios.map(med => (
                    <button
                      key={med.id}
                      onClick={() => toggleFiltro(filtroMedios, setFiltroMedios, med.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filtroMedios.includes(med.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {med.nombre}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Encargados (solo para admin) */}
              {(isKeyMaster || user?.rol_id === 'superadmin' || isRector) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Encargados</label>
                  <div className="flex flex-wrap gap-2">
                    {encargados.map(enc => (
                      <button
                        key={enc.id}
                        onClick={() => toggleFiltro(filtroEncargados, setFiltroEncargados, enc.id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filtroEncargados.includes(enc.id)
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {enc.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tipo de alumno */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de alumno</label>
                <div className="flex gap-2">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'nuevo', label: 'Nuevos' },
                    { id: 'antiguo', label: 'Antiguos' },
                  ].map(tipo => (
                    <button
                      key={tipo.id}
                      onClick={() => setFiltroTipoAlumno(tipo.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filtroTipoAlumno === tipo.id
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tipo.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {hayFiltrosActivos && (
                <button
                  onClick={limpiarFiltros}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Icon name="X" size={16} />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Total Leads</p>
            <p className="text-2xl font-bold text-slate-800">{estadisticas.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Activos</p>
            <p className="text-2xl font-bold text-blue-600">{estadisticas.activos}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Matriculados</p>
            <p className="text-2xl font-bold text-emerald-600">{estadisticas.matriculados}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Descartados</p>
            <p className="text-2xl font-bold text-slate-500">{estadisticas.descartados}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">Conversión</p>
            <p className="text-2xl font-bold text-violet-600">{estadisticas.tasaConversion}%</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm">T. Respuesta</p>
            <p className={`text-2xl font-bold ${estadisticas.tiempoRespuestaPromedio <= 4 ? 'text-emerald-600' : estadisticas.tiempoRespuestaPromedio <= 8 ? 'text-amber-600' : 'text-red-600'}`}>
              {estadisticas.tiempoRespuestaPromedio}h
            </p>
          </div>
        </div>
        
        {/* Gráfico temporal */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Evolución Temporal</h3>
            <div className="flex items-center gap-2">
              <select
                value={agrupacion}
                onChange={e => setAgrupacion(e.target.value)}
                className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
              >
                <option value="dia">Por día</option>
                <option value="semana">Por semana</option>
                <option value="mes">Por mes</option>
              </select>
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setTipoGrafico('linea')}
                  className={`px-3 py-1 ${tipoGrafico === 'linea' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600'}`}
                >
                  <Icon name="TrendingUp" size={18} />
                </button>
                <button
                  onClick={() => setTipoGrafico('barra')}
                  className={`px-3 py-1 ${tipoGrafico === 'barra' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600'}`}
                >
                  <Icon name="BarChart2" size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {datosGrafico.length > 0 ? (
            tipoGrafico === 'linea' ? <LineChart data={datosGrafico} /> : <BarChart data={datosGrafico} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No hay datos para el período seleccionado
            </div>
          )}
        </div>
        
        {/* Estadísticas por dimensión */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por carrera */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Por Carrera</h3>
            <div className="space-y-3">
              {Object.entries(estadisticas.porCarrera).filter(([_, v]) => v.total > 0).map(([id, data]) => (
                <div key={id} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${data.color}`} />
                  <span className="flex-1 text-sm text-slate-600 truncate">{data.nombre}</span>
                  <span className="text-sm font-medium text-slate-800">{data.total}</span>
                  <span className="text-xs text-emerald-600 w-12 text-right">{data.matriculados} m.</span>
                  <span className="text-xs text-slate-400 w-10 text-right">
                    {data.total > 0 ? Math.round((data.matriculados / data.total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Por medio */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Por Medio de Contacto</h3>
            <div className="space-y-3">
              {Object.entries(estadisticas.porMedio).filter(([_, v]) => v.total > 0).map(([id, data]) => (
                <div key={id} className="flex items-center gap-3">
                  <Icon name="MessageCircle" size={16} className="text-slate-400" />
                  <span className="flex-1 text-sm text-slate-600 truncate">{data.nombre}</span>
                  <span className="text-sm font-medium text-slate-800">{data.total}</span>
                  <span className="text-xs text-emerald-600 w-12 text-right">{data.matriculados} m.</span>
                  <span className="text-xs text-slate-400 w-10 text-right">
                    {data.total > 0 ? Math.round((data.matriculados / data.total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Por encargado (solo admin) */}
        {(isKeyMaster || user?.rol_id === 'superadmin' || isRector) && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Rendimiento por Encargado</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                    <th className="pb-3">Encargado</th>
                    <th className="pb-3 text-center">Total</th>
                    <th className="pb-3 text-center">Matriculados</th>
                    <th className="pb-3 text-center">Conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(estadisticas.porEncargado).filter(([_, v]) => v.total > 0).map(([id, data]) => (
                    <tr key={id} className="border-b border-slate-50">
                      <td className="py-3 font-medium text-slate-800">{data.nombre}</td>
                      <td className="py-3 text-center">{data.total}</td>
                      <td className="py-3 text-center text-emerald-600">{data.matriculados}</td>
                      <td className="py-3 text-center">
                        <span className={`font-medium ${data.tasa >= 20 ? 'text-emerald-600' : data.tasa >= 10 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {data.tasa}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Resumen de tipo de alumno */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Distribución por Tipo de Alumno</h3>
            <div className="flex items-center justify-around py-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-blue-600">{estadisticas.porTipoAlumno.nuevo}</span>
                </div>
                <p className="text-sm text-slate-600">Nuevos</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-violet-600">{estadisticas.porTipoAlumno.antiguo}</span>
                </div>
                <p className="text-sm text-slate-600">Antiguos</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Tiempos Promedio</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-slate-600">Tiempo de Respuesta</span>
                <span className={`text-xl font-bold ${estadisticas.tiempoRespuestaPromedio <= 4 ? 'text-emerald-600' : estadisticas.tiempoRespuestaPromedio <= 8 ? 'text-amber-600' : 'text-red-600'}`}>
                  {estadisticas.tiempoRespuestaPromedio} hrs
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-slate-600">Tiempo de Cierre</span>
                <span className="text-xl font-bold text-purple-600">{estadisticas.tiempoCierrePromedio} días</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lista de leads filtrados */}
        {leadsReporte.length > 0 && leadsReporte.length <= 50 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Leads del Período ({leadsReporte.length})</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2">Nombre</th>
                    <th className="pb-2">Carrera</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2">Medio</th>
                    <th className="pb-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsReporte.slice(0, 50).map(lead => (
                    <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-800">{lead.nombre}</td>
                      <td className="py-2 text-slate-600">{lead.carrera?.nombre}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          lead.matriculado ? 'bg-emerald-100 text-emerald-700' :
                          lead.descartado ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {lead.matriculado ? 'Matriculado' : lead.descartado ? 'Descartado' : lead.estado}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">{lead.medio?.nombre}</td>
                      <td className="py-2 text-slate-400">{new Date(lead.created_at).toLocaleDateString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // FORMULARIOS VIEW - Editor mejorado
  // ============================================
  const FormulariosView = () => {
    const [showCode, setShowCode] = useState(null)
    const [previewForm, setPreviewForm] = useState(null)
    
    function handleCreateForm(e) {
      e.preventDefault()
      store.createFormulario(formFormData)
      setFormFormData({ nombre: '', descripcion: '', mostrar_carreras: true, campos_extra: [] })
      setShowFormModal(false)
      loadData()
    }
    
    function handleShowEmbed(formId) {
      const form = formularios.find(f => f.id === formId)
      const code = store.generarEmbedCode(formId, form)
      setEmbedCode(code)
      setShowCode(formId)
    }
    
    function copyToClipboard() {
      navigator.clipboard.writeText(embedCode)
      alert('¡Código copiado al portapapeles!')
    }
    
    function handleDeleteForm(formId) {
      if (confirm('¿Eliminar formulario?')) {
        store.deleteFormulario(formId)
        loadData()
      }
    }
    
    function addCampoExtra() {
      setFormFormData({
        ...formFormData,
        campos_extra: [...formFormData.campos_extra, { id: Date.now(), label: '', tipo: 'text', requerido: false }]
      })
    }
    
    function updateCampoExtra(id, field, value) {
      setFormFormData({
        ...formFormData,
        campos_extra: formFormData.campos_extra.map(c => c.id === id ? { ...c, [field]: value } : c)
      })
    }
    
    function removeCampoExtra(id) {
      setFormFormData({
        ...formFormData,
        campos_extra: formFormData.campos_extra.filter(c => c.id !== id)
      })
    }
    
    // Preview del formulario
    const FormPreview = ({ formConfig }) => (
      <div className="bg-white p-6 rounded-xl border-2 border-dashed border-slate-300">
        <h4 className="font-semibold text-slate-800 mb-4">{formConfig.nombre || 'Formulario de Admisión'}</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
            <input type="text" disabled placeholder="Tu nombre completo" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input type="email" disabled placeholder="tu@email.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
            <input type="tel" disabled placeholder="+56 9 1234 5678" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50" />
          </div>
          {formConfig.mostrar_carreras && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Carrera de interés *</label>
              <select disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
                <option>Selecciona una carrera</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">¿Has estudiado en ProJazz antes?</label>
            <select disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
              <option>No, sería mi primera vez</option>
            </select>
          </div>
          {formConfig.campos_extra?.map(campo => (
            <div key={campo.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {campo.label || 'Campo sin nombre'} {campo.requerido && '*'}
              </label>
              {campo.tipo === 'textarea' ? (
                <textarea disabled placeholder={campo.label} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 h-20" />
              ) : campo.tipo === 'select' ? (
                <select disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
                  <option>Seleccionar...</option>
                </select>
              ) : (
                <input type={campo.tipo} disabled placeholder={campo.label} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50" />
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mensaje (opcional)</label>
            <textarea disabled placeholder="Cuéntanos sobre ti..." className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 h-20" />
          </div>
          <button disabled className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium">
            Solicitar Información
          </button>
        </div>
      </div>
    )
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Icon name="FileCode" className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Formularios Embebibles</h2>
              <p className="text-slate-500">Crea formularios para capturar leads desde tu sitio web</p>
            </div>
          </div>
          <button onClick={() => setShowFormModal(true)} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2">
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
            <button onClick={() => setShowFormModal(true)} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700">
              Crear Formulario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formularios.map(form => (
              <div key={form.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">{form.nombre}</h3>
                    <p className="text-sm text-slate-500">{form.descripcion || 'Sin descripción'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${form.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Icon name="Users" size={14} />
                    {form.leads_recibidos} leads
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="List" size={14} />
                    {form.campos_extra?.length || 0} campos extra
                  </span>
                  {!form.mostrar_carreras && (
                    <span className="text-amber-600">Sin carreras</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreviewForm(form)}
                          className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-1">
                    <Icon name="Eye" size={14} /> Preview
                  </button>
                  <button onClick={() => handleShowEmbed(form.id)}
                          className="flex-1 px-3 py-2 bg-violet-50 text-violet-600 rounded-lg text-sm font-medium hover:bg-violet-100 flex items-center justify-center gap-1">
                    <Icon name="Code" size={14} /> Código
                  </button>
                  <button onClick={() => handleDeleteForm(form.id)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Modal Preview */}
        {previewForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewForm(null)}>
            <div className="bg-slate-100 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Preview: {previewForm.nombre}</h3>
                <button onClick={() => setPreviewForm(null)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
                  <Icon name="X" size={24} />
                </button>
              </div>
              <FormPreview formConfig={previewForm} />
            </div>
          </div>
        )}
        
        {/* Modal Código Embed */}
        {showCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCode(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Código para Embeber</h3>
                <button onClick={() => setShowCode(null)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
                  <Icon name="X" size={24} />
                </button>
              </div>
              <p className="text-slate-500 mb-4">Copia este código y pégalo en cualquier página de tu sitio web.</p>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-sm max-h-96">
                  <code>{embedCode}</code>
                </pre>
                <button onClick={copyToClipboard}
                        className="absolute top-3 right-3 px-3 py-1 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 flex items-center gap-1">
                  <Icon name="Copy" size={14} /> Copiar
                </button>
              </div>
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> En producción, conecta el formulario a tu webhook de N8N o Supabase.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Crear/Editar Formulario */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFormModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex" onClick={e => e.stopPropagation()}>
              {/* Editor */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Nuevo Formulario</h3>
                  <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600 lg:hidden">
                    <Icon name="X" size={24} />
                  </button>
                </div>
                <form onSubmit={handleCreateForm} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del formulario *</label>
                    <input type="text" required value={formFormData.nombre}
                           onChange={e => setFormFormData({...formFormData, nombre: e.target.value})}
                           placeholder="Ej: Formulario Landing Page"
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                    <textarea value={formFormData.descripcion}
                              onChange={e => setFormFormData({...formFormData, descripcion: e.target.value})}
                              placeholder="Descripción opcional..."
                              className="w-full h-16 px-4 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  
                  {/* Toggle Carreras */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-700">Mostrar selector de carreras</p>
                      <p className="text-sm text-slate-500">Permitir elegir carrera de interés</p>
                    </div>
                    <button type="button"
                            onClick={() => setFormFormData({...formFormData, mostrar_carreras: !formFormData.mostrar_carreras})}
                            className={`w-12 h-6 rounded-full transition-colors ${formFormData.mostrar_carreras ? 'bg-violet-600' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${formFormData.mostrar_carreras ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  
                  {/* Campos Extra */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">Campos Adicionales</label>
                      <button type="button" onClick={addCampoExtra}
                              className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                        <Icon name="Plus" size={14} /> Agregar campo
                      </button>
                    </div>
                    <div className="space-y-3">
                      {formFormData.campos_extra.map(campo => (
                        <div key={campo.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <input type="text" placeholder="Nombre del campo"
                                   value={campo.label}
                                   onChange={e => updateCampoExtra(campo.id, 'label', e.target.value)}
                                   className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            <select value={campo.tipo}
                                    onChange={e => updateCampoExtra(campo.id, 'tipo', e.target.value)}
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                              <option value="text">Texto</option>
                              <option value="email">Email</option>
                              <option value="tel">Teléfono</option>
                              <option value="number">Número</option>
                              <option value="date">Fecha</option>
                              <option value="textarea">Área de texto</option>
                              <option value="select">Selector</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-1 text-sm text-slate-600 whitespace-nowrap">
                            <input type="checkbox" checked={campo.requerido}
                                   onChange={e => updateCampoExtra(campo.id, 'requerido', e.target.checked)}
                                   className="rounded border-slate-300" />
                            Req.
                          </label>
                          <button type="button" onClick={() => removeCampoExtra(campo.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Icon name="X" size={16} />
                          </button>
                        </div>
                      ))}
                      {formFormData.campos_extra.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Sin campos adicionales</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowFormModal(false)}
                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50">
                      Cancelar
                    </button>
                    <button type="submit"
                            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700">
                      Crear Formulario
                    </button>
                  </div>
                </form>
              </div>
              
              {/* Preview en tiempo real */}
              <div className="w-96 p-6 bg-slate-100 overflow-y-auto hidden lg:block">
                <h4 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                  <Icon name="Eye" size={16} /> Vista previa
                </h4>
                <FormPreview formConfig={formFormData} />
              </div>
            </div>
          </div>
        )}
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
    
    const handleSaveUser = () => {
      if (!userFormData.nombre || !userFormData.email) {
        alert('Nombre y email son requeridos')
        return
      }
      
      if (localEditingUser) {
        // Actualizar
        const updates = {
          nombre: userFormData.nombre,
          email: userFormData.email,
          rol_id: userFormData.rol_id,
          activo: userFormData.activo
        }
        if (userFormData.password) {
          updates.password = userFormData.password
        }
        store.updateUsuario(localEditingUser.id, updates)
        setNotification({ type: 'success', message: 'Usuario actualizado' })
      } else {
        // Crear
        if (!userFormData.password) {
          alert('La contraseña es requerida para nuevos usuarios')
          return
        }
        store.createUsuario(userFormData)
        setNotification({ type: 'success', message: 'Usuario creado' })
      }
      
      setLocalShowUserModal(false)
      refreshUsuarios()
      setTimeout(() => setNotification(null), 2000)
    }
    
    const handleToggleActivo = (userId) => {
      store.toggleUsuarioActivo(userId)
      refreshUsuarios()
      setNotification({ type: 'info', message: 'Estado actualizado' })
      setTimeout(() => setNotification(null), 2000)
    }
    
    const openDeleteModal = (user) => {
      const leads = store.getLeadsPorUsuario(user.id)
      setLocalShowDeleteModal({ user, leadsCount: leads.length })
      setMigrateToUser('')
    }
    
    const handleDeleteUser = () => {
      const { user, leadsCount } = localShowDeleteModal
      
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
      const result = store.deleteUsuario(user.id)
      if (result.success) {
        setNotification({ type: 'success', message: 'Usuario eliminado' })
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
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña {localEditingUser ? '(dejar vacío para mantener)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
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
  // CONFIG VIEW
  // ============================================
  // ============================================
// CONFIG VIEW - Con Historial de Importaciones
// Reemplaza la función ConfigView en tu Dashboard.jsx
// ============================================

const ConfigView = () => {
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [historialImportaciones, setHistorialImportaciones] = useState([])
  const [estadisticasImport, setEstadisticasImport] = useState(null)
  const [selectedImportacion, setSelectedImportacion] = useState(null)
  
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
    
    reader.onload = (e) => {
      const csvData = e.target.result
      const result = store.importarLeadsCSV(csvData, user?.id)
      
      setImportResult(result)
      setImporting(false)
      
      if (result.success && result.importados > 0) {
        // Notificación de éxito
        setNotification({ 
          type: 'success', 
          message: `✅ ${result.importados} leads importados correctamente${result.duplicados > 0 ? ` (${result.duplicados} duplicados omitidos)` : ''}` 
        })
        setTimeout(() => setNotification(null), 5000)
        cargarHistorial()
        loadData()
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
              onClick={() => setShowModal(true)}
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
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'consultas' && <ConsultasView />}
        {activeTab === 'detalle' && <DetalleView />}
        {activeTab === 'historial' && <HistorialView />}
        {activeTab === 'reportes' && <ReportesView />}
        {activeTab === 'formularios' && <FormulariosView />}
        {activeTab === 'usuarios' && <UsuariosView />}
        {activeTab === 'config' && <ConfigView />}
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
