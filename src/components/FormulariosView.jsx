import React, { useState } from 'react'
import Icon from './Icon'
import { ModalFormulario } from './FormularioEditor'
import * as store from '../lib/store'

const FormulariosViewComponent = ({
  formularios,
  reloadFromSupabase,
  setNotification,
  puedeCrearFormulario,
  planInfo,
  setLimiteAlerta
}) => {
  const [editingForm, setEditingForm] = useState(null)
  const [localShowModal, setLocalShowModal] = useState(false)

  const handleDeleteForm = async (formId) => {
    if (confirm('¿Eliminar formulario?')) {
      const result = await store.deleteFormulario(formId)
      if (result?.error) {
        setNotification({ type: 'error', message: result.error })
      } else {
        setNotification({ type: 'success', message: 'Formulario eliminado' })
        await reloadFromSupabase()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Formularios de Captura</h2>
          <p className="text-slate-500">Gestiona tus formularios integrables</p>
        </div>
        <button onClick={handleNewForm} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Icon name="Plus" size={20} /> Nuevo Formulario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {formularios.map(form => (
          <div key={form.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                <Icon name="Layout" size={24} />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEditForm(form)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Icon name="Edit" size={18} /></button>
                <button onClick={() => handleDeleteForm(form.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Icon name="Trash2" size={18} /></button>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">{form.nombre}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{form.descripcion || 'Sin descripción'}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${form.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {form.activo ? 'Activo' : 'Inactivo'}
              </span>
              <button onClick={() => handleEditForm(form)} className="text-violet-600 text-sm font-semibold hover:underline">Configurar</button>
            </div>
          </div>
        ))}

        {formularios.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Icon name="PlusCircle" size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No tienes formularios aún</h3>
            <p className="text-slate-500 mb-6">Crea tu primer formulario para empezar a recibir leads</p>
            <button onClick={handleNewForm} className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700">Crear Formulario</button>
          </div>
        )}
      </div>

      {localShowModal && (
        <ModalFormulario 
          isOpen={localShowModal} 
          onClose={() => setLocalShowModal(false)} 
          formToEdit={editingForm} 
          onSaved={() => { reloadFromSupabase(); setLocalShowModal(false); }}
        />
      )}
    </div>
  )
}

export default FormulariosViewComponent
