import React, { useState, useEffect } from 'react'
import Icon from './Icon'
import { ESTADOS, MEDIOS, CARRERAS } from '../data/mockData'
import * as store from '../lib/store'
import { useAuth } from '../context/AuthContext'

const ModalNuevaConsulta = ({ isOpen, onClose, onCreated, isKeyMaster, userId, userRol, nombreInstitucion }) => {
  const { puedeCrearLead, actualizarUso, planInfo, notifyAssignment } = useAuth()
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
    const encontrados = verificarDuplicados()

    if (encontrados.length > 0) {
      setShowDuplicadoAlert(true)
      setSelectedDuplicado(encontrados[0])
      return
    }

    crearLeadNuevo()
  }

  const crearLeadNuevo = () => {
    if (puedeCrearLead && !puedeCrearLead()) {
      setShowLimiteAlert(true)
      return
    }

    setSubmitting(true)
    const carreraSeleccionada = carrerasDisponibles.find(c => String(c.id) === String(formData.carrera_id))

    const newConsulta = store.createConsulta({
      ...formData,
      carrera_id: formData.carrera_id || null,
      carrera_nombre: carreraSeleccionada?.nombre || null,
      asignado_a: formData.asignado_a || null
    }, userId, userRol)

    if (actualizarUso) actualizarUso('leads', 1)

    if (formData.asignado_a && notifyAssignment) {
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
      formData.carrera_id,
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

  if (showDuplicadoAlert && selectedDuplicado) {
    const carreraNueva = carrerasDisponibles.find(c => String(c.id) === String(formData.carrera_id))
    const carreraExistente = selectedDuplicado.carrera || { nombre: selectedDuplicado.carrera_nombre || 'Sin carrera' }

    const puedeAgregarCarrera = carreraNueva && (
      !selectedDuplicado.carrera_id ||
      String(carreraNueva.id) !== String(selectedDuplicado.carrera_id) ||
      (selectedDuplicado.carreras_interes && !selectedDuplicado.carreras_interes.includes(carreraNueva.id))
    )

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
          </div>

          <div className="bg-violet-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-violet-600 mb-2">Nueva consulta:</p>
            <p className="font-semibold text-violet-800">{formData.nombre}</p>
            <p className="text-sm text-violet-700">
              <Icon name="Music" size={14} className="inline mr-2" />
              Solicita info sobre: <span className="font-medium">{carreraNueva?.nombre || 'Sin seleccionar'}</span>
            </p>
          </div>

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
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Nueva Consulta</h3>
          <button onClick={handleClose} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

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
                </p>
              </div>
              <button onClick={() => setShowLimiteAlert(false)} className="text-red-400 hover:text-red-600">
                <Icon name="X" size={16} />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
            <input type="text" required value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              onBlur={verificarDuplicados}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${duplicados.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input type="email" required value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onBlur={verificarDuplicados}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${duplicados.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`} />
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
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? 'Guardando...' : 'Registrar Consulta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalNuevaConsulta
