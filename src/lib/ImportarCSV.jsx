// ============================================
// COMPONENTE: ImportarCSV.jsx
// Importación de leads con feedback completo
// ============================================

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import { importarLeadsCSV } from '../lib/store'
import { useAuth } from '../context/AuthContext'

export default function ImportarCSV({ onClose, onSuccess }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [archivo, setArchivo] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [preview, setPreview] = useState(null)

  // Leer archivo y mostrar preview
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setArchivo(file)
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lineas = text.split('\n').filter(l => l.trim())
      
      // Mostrar preview de las primeras 5 líneas
      setPreview({
        headers: lineas[0],
        totalLineas: lineas.length - 1, // Sin contar header
        primerasLineas: lineas.slice(1, 6)
      })
    }
    reader.readAsText(file)
  }

  // Procesar importación
  // Dentro de ImportarCSV.jsx
const handleImportar = async () => {
  if (!archivo) return;
  setProcesando(true);

  const reader = new FileReader();
  reader.onload = async (event) => { // <-- Añade async aquí
    const csvData = event.target.result;
    
    try {
      // <-- Añade await aquí
      const result = await importarLeadsCSV(csvData, user?.id || 'keymaster');
      
      setProcesando(false);
      setResultado(result);

      if (result.success && result.importados > 0 && onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      setProcesando(false);
      setResultado({ success: false, error: 'Error en la sincronización' });
    }
  };
  reader.readAsText(archivo);
};

  // Reset para importar otro archivo
  const handleReset = () => {
    setArchivo(null)
    setPreview(null)
    setResultado(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Importar Leads</h2>
              <p className="text-sm text-gray-500">Sube un archivo CSV con tus contactos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          
          {/* Resultado de importación */}
          {resultado && (
            <div className={`p-4 rounded-xl ${
              resultado.success && resultado.importados > 0
                ? 'bg-emerald-50 border border-emerald-200'
                : resultado.success && resultado.importados === 0
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {resultado.success && resultado.importados > 0 ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                    resultado.success ? 'text-amber-500' : 'text-red-500'
                  }`} />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    resultado.success && resultado.importados > 0
                      ? 'text-emerald-800'
                      : resultado.success
                      ? 'text-amber-800'
                      : 'text-red-800'
                  }`}>
                    {resultado.success 
                      ? resultado.importados > 0 
                        ? '¡Importación completada!' 
                        : 'Importación sin resultados'
                      : 'Error en la importación'
                    }
                  </h3>
                  
                  {resultado.success ? (
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-emerald-700">
                        <span className="font-bold text-lg">{resultado.importados}</span> leads importados correctamente
                      </p>
                      {resultado.duplicados > 0 && (
                        <p className="text-amber-700">
                          <span className="font-bold">{resultado.duplicados}</span> duplicados omitidos
                        </p>
                      )}
                      {resultado.errores?.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            Ver {resultado.errores.length} advertencias
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto">
                            {resultado.errores.map((err, i) => (
                              <li key={i} className="pl-2 border-l-2 border-gray-300">{err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-red-700">{resultado.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Zona de carga */}
          {!resultado && (
            <>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  archivo 
                    ? 'border-emerald-300 bg-emerald-50' 
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {archivo ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto" />
                    <p className="font-medium text-emerald-700">{archivo.name}</p>
                    <p className="text-sm text-emerald-600">
                      {preview?.totalLineas || 0} registros encontrados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="font-medium text-gray-700">
                      Haz clic o arrastra tu archivo CSV
                    </p>
                    <p className="text-sm text-gray-500">
                      Formato: nombre, email, teléfono, carrera
                    </p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {preview && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Vista previa:</h4>
                  <div className="text-xs font-mono bg-white rounded-lg p-3 overflow-x-auto">
                    <div className="text-emerald-600 font-semibold mb-1">
                      {preview.headers}
                    </div>
                    {preview.primerasLineas.map((linea, i) => (
                      <div key={i} className="text-gray-600 truncate">
                        {linea}
                      </div>
                    ))}
                    {preview.totalLineas > 5 && (
                      <div className="text-gray-400 mt-1">
                        ... y {preview.totalLineas - 5} registros más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Formato esperado */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">Formato esperado:</h4>
                <code className="text-xs text-blue-700 block bg-blue-100 rounded p-2">
                  nombre,email,telefono,carrera,notas<br/>
                  Juan Pérez,juan@email.com,+56912345678,Guitarra,Interesado en clases
                </code>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          {resultado ? (
            <>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Importar otro archivo
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportar}
                disabled={!archivo || procesando}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importar {preview?.totalLineas || ''} leads
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
