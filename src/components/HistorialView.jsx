import React, { useState, memo } from 'react'
import Icon from './Icon'

const HistorialView = memo(({ consultas, isKeyMaster, selectConsulta, formatDate }) => {
  const matriculados = (consultas || []).filter(c => c.matriculado)
  const descartados = (consultas || []).filter(c => c.descartado)
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
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
                    <td className="p-4 text-sm text-slate-600">{formatDate ? formatDate(c.fecha_cierre) : c.fecha_cierre}</td>
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
          </div>
        )}
      </div>
    </div>
  )
})

export default HistorialView
