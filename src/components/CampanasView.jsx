import React, { useState } from 'react'
import Icon from './Icon'
import * as store from '../lib/store'

const CampanasView = ({ user, setNotification }) => {
  const [showModal, setShowModal] = useState(false)
  const [editingCampana, setEditingCampana] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const campanas = store.getCampanas()
  const leads = store.getConsultasParaReportes() || []

  const colors = [
    'bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 
    'bg-cyan-500', 'bg-fuchsia-500'
  ]

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.target)
    const data = {
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion'),
      medio: formData.get('medio'),
      color: formData.get('color'),
      fecha_inicio: formData.get('fecha_inicio') || null,
      fecha_fin: formData.get('fecha_fin') || null
    }

    let res
    if (editingCampana) {
      res = await store.updateCampana(editingCampana.id, data)
    } else {
      res = await store.createCampana(data)
    }

    if (res.success) {
      setNotification({ type: 'success', message: editingCampana ? 'Campaña actualizada' : 'Campaña creada' })
      setShowModal(false)
      setEditingCampana(null)
    } else {
      setNotification({ type: 'error', message: res.error })
    }
    setLoading(false)
  }

  const toggleStatus = async (campana) => {
    const res = await store.updateCampana(campana.id, { activa: !campana.activa })
    if (res.success) {
      setNotification({ type: 'success', message: 'Estado actualizado' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campaña de Marketing</h1>
          <p className="text-slate-500 text-sm">Gestiona el origen y los tags de tus leads</p>
        </div>
        <button 
          onClick={() => { setEditingCampana(null); setShowModal(true) }}
          className="px-4 py-2 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <Icon name="Plus" size={20} /> Nueva Campaña
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campanas.map(c => {
          const count = leads.filter(l => l.campana_id === c.id).length
          const matriculados = leads.filter(l => l.campana_id === c.id && l.matriculado).length
          
          return (
            <div key={c.id} className={`bg-white rounded-2xl p-6 shadow-sm border ${c.activa ? 'border-slate-100' : 'border-slate-200 opacity-75'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${c.color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
                  <Icon name="Megaphone" size={24} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingCampana(c); setShowModal(true) }} className="p-2 text-slate-400 hover:text-violet-600 transition-colors">
                    <Icon name="Edit2" size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-1">{c.nombre}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{c.descripcion || 'Sin descripción'}</p>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 mb-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Total Leads</p>
                  <p className="text-xl font-bold text-slate-700">{count}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Matrículas</p>
                  <p className="text-xl font-bold text-emerald-600">{matriculados}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.activa ? 'ACTIVA' : 'INACTIVA'}
                </span>
                <button 
                  onClick={() => toggleStatus(c)}
                  className="text-xs font-semibold text-violet-600 hover:underline"
                >
                  {c.activa ? 'Desactivar' : 'Reactivar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                {editingCampana ? 'Editar Campaña' : 'Nueva Campaña'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <Icon name="X" size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Campaña</label>
                <input required name="nombre" defaultValue={editingCampana?.nombre} placeholder="Ej: CyberDay 2026, Taller de Bandas" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Canal Principal (Opcional)</label>
                <input name="medio" defaultValue={editingCampana?.medio} placeholder="Ej: instagram, facebook, web" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
                <textarea name="descripcion" defaultValue={editingCampana?.descripcion} rows="2" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Color del Tag</label>
                <div className="flex flex-wrap gap-3">
                  {colors.map(color => (
                    <label key={color} className="relative cursor-pointer">
                      <input type="radio" name="color" value={color} defaultChecked={editingCampana?.color === color || (!editingCampana && color === 'bg-violet-500')} className="peer sr-only" />
                      <div className={`w-8 h-8 rounded-full ${color} ring-offset-2 peer-checked:ring-2 ring-slate-800 transition-all`} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Inicio</label>
                  <input type="date" name="fecha_inicio" defaultValue={editingCampana?.fecha_inicio} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Fin</label>
                  <input type="date" name="fecha_fin" defaultValue={editingCampana?.fecha_fin} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={loading}
                  className="w-full py-3 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                  {loading ? <Icon name="RotateCw" className="animate-spin" size={20} /> : (editingCampana ? 'Actualizar' : 'Crear Campaña')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampanasView
