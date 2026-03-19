import React, { useState, memo } from 'react'
import Icon from './Icon'
import { ModalFormulario } from './FormularioEditor'
import * as store from '../lib/store'

const FormulariosView = memo(({ 
  formularios, 
  reloadFromSupabase, 
  loadData, 
  setNotification, 
  puedeCrearFormulario, 
  planInfo, 
  setLimiteAlerta,
  user 
}) => {
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

      <ModalFormulario
        isOpen={localShowModal}
        onClose={() => { setLocalShowModal(false); setEditingForm(null); }}
        onCreated={handleFormCreated}
        institucionId={user?.institucion_id}
        editForm={editingForm}
      />
    </div>
  )
})

export default FormulariosView
