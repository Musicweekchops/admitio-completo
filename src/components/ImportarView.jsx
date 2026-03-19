import React, { useState, useEffect } from 'react'
import Icon from './Icon'
import * as store from '../lib/store'

const ImportarViewComponent = ({
  user,
  reloadFromSupabase,
  loadData,
  setNotification,
  setShowImportModal
}) => {
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [historialImportaciones, setHistorialImportaciones] = useState([])
  const [estadisticasImport, setEstadisticasImport] = useState(null)
  const [encargadoSeleccionado, setEncargadoSeleccionado] = useState('auto')

  const encargadosActivos = store.getEncargadosActivos() || []

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
      const opciones = { asignarA: encargadoSeleccionado !== 'auto' ? encargadoSeleccionado : null }
      const result = store.importarLeadsCSV(csvData, user?.id, {}, opciones)

      setImportResult(result)
      setImporting(false)

      if (result.success && result.importados > 0) {
        const encargadoNombre = encargadoSeleccionado !== 'auto' ? encargadosActivos.find(e => e.id === encargadoSeleccionado)?.nombre : null
        setNotification({
          type: 'success',
          message: `✅ ${result.importados} leads importados${encargadoNombre ? ` y asignados a ${encargadoNombre}` : ''}${result.duplicados > 0 ? ` (${result.duplicados} duplicados omitidos)` : ''}`
        })
        setTimeout(() => setNotification(null), 5000)
        cargarHistorial()
        try { await reloadFromSupabase() } catch (err) { console.error('Error recargando:', err) }
        loadData()
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
    const plantilla = `nombre,email,telefono,carrera,notas\n"Juan Pérez","juan@email.com","+56912345678","Guitarra Eléctrica","Interesado en clases presenciales"\n"María García","maria@email.com","+56987654321","Canto Popular","Consulta por horarios"`
    const blob = new Blob([plantilla], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'plantilla_importacion_admitio.csv'
    link.click()
  }

  const formatFechaHora = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white text-center">
        <h1 className="text-2xl font-bold">Importar Base de Datos</h1>
        <p className="text-blue-200">Carga tu Excel o CSV para comenzar rápidamente</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 italic flex items-center justify-between">
         <div>
           <h3 className="font-bold">Seleccionar archivo</h3>
           <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files[0])} className="mt-2" />
         </div>
         <button onClick={handleImportCSV} disabled={!importFile || importing} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
           {importing ? 'Importando...' : 'Importar CSV'}
         </button>
      </div>

      {historialImportaciones.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold mb-4">Historial Reciente</h3>
          <div className="space-y-2">
            {historialImportaciones.map(imp => (
              <div key={imp.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-sm">
                <span>{formatFechaHora(imp.fecha)}</span>
                <span className="font-bold text-emerald-600">+{imp.importados} leads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportarViewComponent
