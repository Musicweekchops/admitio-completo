import React, { useState, useEffect } from 'react'
import Icon from './Icon'
import * as store from '../lib/store'

const ProgramaModal = ({ programa, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    nombre: programa?.nombre || '',
    color: programa?.color || 'bg-violet-500',
    activa: programa?.activa !== false
  })

  const COLORS = [
    { name: 'Violeta', value: 'bg-violet-500' },
    { name: 'Azul', value: 'bg-blue-500' },
    { name: 'Esmeralda', value: 'bg-emerald-500' },
    { name: 'Ámbar', value: 'bg-amber-500' },
    { name: 'Rojo', value: 'bg-red-500' },
    { name: 'Rosa', value: 'bg-pink-500' },
    { name: 'Índigo', value: 'bg-indigo-500' },
    { name: 'Slate', value: 'bg-slate-500' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {programa ? 'Editar Programa' : 'Nuevo Programa'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <Icon name="X" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Programa</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500"
              placeholder="Ej: Guitarra Eléctrica"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color identificativo</label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.value })}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center border-2 transition-all ${formData.color === c.value ? 'border-slate-800 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <div className={`w-6 h-6 rounded-full ${c.value}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activa"
              checked={formData.activa}
              onChange={e => setFormData({ ...formData, activa: e.target.checked })}
              className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4"
            />
            <label htmlFor="activa" className="text-sm font-medium text-slate-700">Programa activo</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
            >
              {programa ? 'Guardar Cambios' : 'Crear Programa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ProgramasView = ({ user, consultas, loadData, setNotification }) => {
  const [carreras, setCarreras] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingPrograma, setEditingPrograma] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteError, setDeleteError] = useState(null)
  const [importData, setImportData] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)

  useEffect(() => {
    setCarreras(store.getCarreras())
  }, [consultas])

  const handleCreate = (data) => {
    const result = store.createCarrera(data, user.id)
    if (result) {
      if (setNotification) setNotification({ type: 'success', message: 'Programa creado correctamente' })
      setShowModal(false)
      loadData()
    }
  }

  const handleUpdate = (id, data) => {
    const result = store.updateCarrera(id, data, user.id)
    if (result) {
      if (setNotification) setNotification({ type: 'success', message: 'Programa actualizado correctamente' })
      setEditingPrograma(null)
      loadData()
    }
  }

  const handleDelete = (id) => {
    // Verificar si tiene leads asociados
    const hasLeads = (consultas || []).some(c => c.carrera_id === id)
    if (hasLeads) {
      setDeleteError('No se puede eliminar un programa que ya tiene leads asociados. Desactívalo en su lugar.')
      setTimeout(() => setDeleteError(null), 5000)
      return
    }

    const res = store.deleteCarrera(id)
    if (res) {
      if (setNotification) setNotification({ type: 'success', message: 'Programa eliminado' })
      loadData()
    }
  }

  const handleImport = async () => {
    if (!importData) return
    setImporting(true)

    try {
      // Mock de importación por ahora
      // En un caso real, procesaríamos el CSV aquí
      await new Promise(r => setTimeout(r, 1000))

      if (setNotification) setNotification({ type: 'info', message: 'Función de importación próximamente disponible' })
      setShowImportModal(false)

    } catch (e) {
      setImportError(e.message)
    } finally {
      setImporting(false)
    }
  }

  const handleExport = () => {
    const data = carreras.map(c => ({
      Nombre: c.nombre,
      Estado: c.activa !== false ? 'Activo' : 'Inactivo',
      Leads: (consultas || []).filter(con => con.carrera_id === c.id).length
    }))

    const csvContent = "data:text/csv;charset=utf-8,"
      + "Nombre,Estado,Leads\n"
      + data.map(r => `${r.Nombre},${r.Estado},${r.Leads}`).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "programas_admitio.csv")
    document.body.appendChild(link)
    link.click()
  }

  const leadsCount = (carreraId) => (consultas || []).filter(c => c.carrera_id === carreraId).length

  const carrerasFiltradas = carreras.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
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
                    <span className={`px-2 py-1 rounded-full text-sm ${leadsCount(carrera.id) > 0
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-500'
                      }`}>
                      {leadsCount(carrera.id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${carrera.activa !== false
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
          <p className="text-2xl font-bold text-blue-600">{(consultas || []).length}</p>
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
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Sube un archivo .csv con los nombres de los programas para importarlos masivamente.
              </p>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                <Icon name="Upload" size={32} className="text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Selecciona o arrastra el archivo aquí</p>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                  onChange={e => setImportData(e.target.files[0])}
                />
                <label
                  htmlFor="csv-upload"
                  className="mt-4 inline-block px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer hover:bg-white/80"
                >
                  Examinar archivos
                </label>
                {importData && (
                  <p className="mt-2 text-sm text-violet-600 font-medium">{importData.name}</p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={!importData || importing}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg disabled:opacity-50"
              >
                {importing ? 'Importando...' : 'Comenzar Importación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProgramasView
