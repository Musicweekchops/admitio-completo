import React, { useState, useEffect } from 'react'
import Icon from './Icon'
import { supabase } from '../lib/supabase'
import * as store from '../lib/store'

const ImportarView = ({ user, loadData, setNotification }) => {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [asignarA, setAsignarA] = useState('')
  const [syncProgress, setSyncProgress] = useState(null)

  useEffect(() => {
    const handleProgress = (e) => {
      setSyncProgress(e.detail)
      // Limpiar progreso tras éxito total
      if (e.detail.percentage === 100) {
        setTimeout(() => {
          setSyncProgress(prev => prev && prev.percentage === 100 ? null : prev)
        }, 3000)
      }
    }
    window.addEventListener('admitio-sync-progress', handleProgress)
    return () => window.removeEventListener('admitio-sync-progress', handleProgress)
  }, [])

  const usuarios = store.getUsuarios() || []

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Por favor selecciona un archivo CSV válido')
      setFile(null)
    }
  }

  const procesarCSV = async () => {
    if (!file) return
    setImporting(true)
    setProgress(10)
    setError(null)

    try {
      let text = await file.text()
      
      // 1. Limpiar BOM de Excel (\ufeff) si existe
      text = text.replace(/^\ufeff/, '')

      // 2. Detectar delimitador inteligente (, o ;)
      const firstLine = text.split('\n')[0]
      const delimiter = firstLine.includes(';') ? ';' : ','
      
      const rows = text.split('\n')
        .filter(line => line.trim()) // Ignorar líneas vacías
        .map(row => row.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''))) // Limpiar comillas
      
      if (rows.length === 0) throw new Error('El archivo está vacío')

      // Normalizar headers a minúsculas para validación robusta
      const rawHeaders = rows[0]
      const headers = rawHeaders.map(h => h.toLowerCase())

      // 3. Validar headers mínimos (Insensible a mayúsculas)
      if (!headers.includes('nombre')) {
        console.log('Headers detectados:', headers)
        throw new Error('El CSV debe incluir al menos la columna "nombre"')
      }

      setProgress(30)

      const jsonLeads = rows.slice(1)
        .filter(row => row.length >= headers.length && row[headers.indexOf('nombre')])
        .map(row => {
          const lead = {}
          headers.forEach((header, i) => {
            if (row[i] !== undefined) {
              lead[header] = row[i]
            }
          })
          return lead
        })

      if (jsonLeads.length === 0) {
        throw new Error('No se encontraron datos válidos en el CSV')
      }

      setProgress(50)

      // Simular importación masiva (en producción usaríamos un RPC de Supabase)
      // Mapear leads para inserción masiva
      const leadsParaImportar = jsonLeads.map(lead => ({
        nombre: lead.nombre,
        email: lead.email || '',
        telefono: lead.telefono || '',
        carrera_nombre: lead.carrera || '',
        medio_nombre: lead.medio || 'CSV',
        notas: lead.notas || '',
        asignado_a: asignarA || null,
        tipo_alumno: lead.tipo_alumno || 'nuevo',
        origen_entrada: 'manual'
      }));

      // Ingesta Masiva Atómica (Detección de duplicados y asignaciones en el store)
      setProgress(60);
      const procesados = store.createConsultasBulk(leadsParaImportar, user.id);
      
      const exitosos = procesados || 0;
      const fallidos = jsonLeads.length - exitosos;
      setProgress(90);

      setResults({ total: jsonLeads.length, exitosos, fallidos });
      loadData();
      setProgress(100);
    } catch (e) {
      console.error('Error importando leads:', e);
      setError(e.message);
      if (setNotification) setNotification({ type: 'error', message: 'Error en la importación: ' + e.message });
    } finally {
      setTimeout(() => setImporting(false), 2000);
    }
  }

  const descargarPlantilla = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "nombre,email,telefono,carrera,medio,notas,tipo_alumno\n"
      + "Juan Perez,juan@example.com,987654321,Guitarra,Facebook,Interesado en nivel inicial,nuevo\n"
      + "Maria Lopez,maria@example.com,123456789,Piano,Sitio Web,,antiguo"

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "plantilla_leads_admitio.csv")
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Icon name="Upload" className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Importar Leads</h1>
            <p className="text-emerald-100">Carga masiva de consultas desde archivos CSV</p>
          </div>
        </div>
      </div>

      {/* Alerta Global de Sincronización */}
      {syncProgress && (
        <div className="bg-violet-600 text-white p-4 rounded-xl shadow-lg animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="RotateCw" className="animate-spin" size={20} />
            <span className="font-bold">Sincronizando con la nube... No cierres esta ventana.</span>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
            {syncProgress.percentage}%
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Instrucciones y Pasos */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="Info" size={20} className="text-emerald-500" />
              Pasos para la importación
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <p className="font-medium text-slate-700">Prepara tu archivo</p>
                  <p className="text-sm text-slate-500">Asegúrate de que el CSV tenga los encabezados correctos. Puedes descargar nuestra plantilla.</p>
                  <button
                    onClick={descargarPlantilla}
                    className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Icon name="Download" size={14} />
                    Descargar plantilla CSV
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div className="flex-1">
                  <p className="font-medium text-slate-700">Sube el archivo</p>
                  <div className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-emerald-400'}`}>
                    <input
                      type="file"
                      id="csv-file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="csv-file" className="cursor-pointer block">
                      <Icon name="FileText" size={32} className={`mx-auto mb-2 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
                      {file ? (
                        <div className="text-emerald-700 font-medium">
                          {file.name}
                          <p className="text-xs font-normal">Haga clic para cambiar de archivo</p>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">Arrastra tu CSV aquí o haz clic para buscar</p>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <p className="font-medium text-slate-700">Asignación de leads (Opcional)</p>
                  <p className="text-sm text-slate-500 mb-2">Selecciona un operador para asignar todos los leads importados.</p>
                  <select
                    value={asignarA}
                    onChange={e => setAsignarA(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">-- Distribución automática --</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              {importing ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Procesando leads...</span>
                    <span className="text-emerald-600 font-bold">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={procesarCSV}
                  disabled={!file}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all"
                >
                  Procesar Importación
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Asignación Retroactiva (Leads Huérfanos) */}
          {(() => {
            const huerfanos = (store.getConsultas() || []).filter(c => !c.asignado_a && !c.matriculado && !c.descartado && !c.en_cola)
            if (huerfanos.length === 0) return null

            return (
              <div className="bg-violet-50 rounded-xl p-6 border border-violet-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                    <Icon name="UserPlus" className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-violet-900 line-clamp-1">Pendientes de Asignación</h3>
                    <p className="text-xs text-violet-600 font-medium">Hay {huerfanos.length} leads sin encargado asignado</p>
                  </div>
                </div>
                
                <button
                  onClick={async () => {
                    setResults(null) // Limpiar resultados previos para priorizar el progreso de asignación
                    const res = await store.autoAsignarLeadsHuerfanos(user.id)
                    if (res.success && res.count > 0) {
                      // No enviamos éxito todavía, dejamos que la barra de progreso hable
                    } else if (res.count === 0) {
                      if (setNotification) setNotification({ type: 'info', message: 'No se encontraron leads para asignar.' })
                    }
                  }}
                  disabled={syncProgress && syncProgress.percentage < 100}
                  className="w-full py-2.5 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icon name="Zap" size={16} />
                  {syncProgress ? `Sincronizando... ${syncProgress.percentage}%` : 'Asignar Todos Automáticamente'}
                </button>

                {syncProgress && (
                  <div className="mt-4 space-y-2">
                    <div className="h-1.5 w-full bg-violet-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-600 transition-all duration-300"
                        style={{ width: `${syncProgress.percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-center text-violet-500 font-bold uppercase tracking-wider">
                      {syncProgress.processed} de {syncProgress.total} leads sincronizados
                    </p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Resultados */}
          {results && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Último Resultado</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                  <span className="text-slate-600">Total leídos</span>
                  <span className="font-bold text-slate-800">{results.total}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg">
                  <span className="text-emerald-700">Exitosos</span>
                  <span className="font-bold text-emerald-700">{results.exitosos}</span>
                </div>
                {results.fallidos > 0 && (
                  <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                    <span className="text-red-700">Fallidos</span>
                    <span className="font-bold text-red-700">{results.fallidos}</span>
                  </div>
                )}
                <button
                  onClick={() => setResults(null)}
                  className="w-full py-2 text-sm text-slate-400 hover:text-slate-600"
                >
                  Limpiar resultados
                </button>
              </div>
            </div>
          )}

          {/* Advertencias */}
          <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
            <h4 className="flex items-center gap-2 text-amber-700 font-bold mb-3">
              <Icon name="AlertTriangle" size={18} />
              Importante
            </h4>
            <ul className="text-sm text-amber-700 space-y-2 list-disc pl-4">
              <li>El archivo debe estar en formato .csv</li>
              <li>La primera fila debe contener los nombres de las columnas</li>
              <li>Se validará si el email o teléfono ya existe</li>
              <li>No cierres el navegador mientras dure el proceso</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportarView
