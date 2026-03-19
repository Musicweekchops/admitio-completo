import React, { useState, useEffect, memo } from 'react'
import Icon from './Icon'
import { ESTADOS, MEDIOS, CARRERAS } from '../data/mockData'
import * as store from '../lib/store'

const SearchInput = memo(({ searchTerm, setSearchTerm }) => {
  const [localValue, setLocalValue] = useState(searchTerm)

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(localValue)
    }, 300)
    return () => clearTimeout(handler)
  }, [localValue, setSearchTerm])

  useEffect(() => {
    setLocalValue(searchTerm)
  }, [searchTerm])

  return (
    <div className="flex-1 min-w-[200px] relative">
      <Icon name="Search" className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" size={20} />
      <input 
        type="text" 
        placeholder="Nombre, email o teléfono..."
        value={localValue} 
        onChange={(e) => setLocalValue(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" 
      />
    </div>
  )
})

const KanbanView = memo(({ filteredConsultas, selectConsulta, isKeyMaster, selectedLeads, setSelectedLeads, formatDateShort }) => {
  const columnas = [
    { estado: 'nueva', titulo: 'Nuevas', color: 'border-blue-500', filtro: c => c.estado === 'nueva' && !c.matriculado && !c.descartado },
    { estado: 'contactado', titulo: 'Contactados', color: 'border-amber-500', filtro: c => c.estado === 'contactado' && !c.matriculado && !c.descartado },
    { estado: 'seguimiento', titulo: 'Seguimiento', color: 'border-purple-500', filtro: c => c.estado === 'seguimiento' && !c.matriculado && !c.descartado },
    { estado: 'examen_admision', titulo: 'Examen Adm.', color: 'border-cyan-500', filtro: c => c.estado === 'examen_admision' && !c.matriculado && !c.descartado },
    { estado: 'matriculado', titulo: 'Matriculados', color: 'border-emerald-500', filtro: c => c.matriculado },
    { estado: 'descartado', titulo: 'Descartados', color: 'border-red-500', filtro: c => c.descartado },
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columnas.map(col => {
        const leadsColumna = (filteredConsultas || []).filter(col.filtro)
        return (
          <div key={col.estado} className={`flex-shrink-0 w-72 bg-slate-100 rounded-xl p-4 border-t-4 ${col.color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{col.titulo}</h3>
              <span className="px-2 py-1 bg-white rounded-full text-sm font-medium text-slate-600">
                {leadsColumna.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[300px] max-h-[500px] overflow-y-auto">
              {leadsColumna.map(consulta => (
                <div key={consulta.id}
                  onClick={() => selectConsulta(consulta.id)}
                  className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all relative ${consulta.matriculado ? 'ring-2 ring-emerald-200' : ''} ${selectedLeads.includes(consulta.id) ? 'ring-2 ring-violet-500' : ''}`}>
                  {isKeyMaster && (
                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(consulta.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads([...selectedLeads, consulta.id])
                          } else {
                            setSelectedLeads(selectedLeads.filter(id => id !== consulta.id))
                          }
                        }}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-slate-800 text-sm pr-6">{consulta.nombre}</p>
                    {consulta.matriculado ? (
                      <span className="text-emerald-500">
                        <Icon name="CheckCircle" size={16} />
                      </span>
                    ) : (
                      <span className={MEDIOS.find(m => m.id === consulta.medio_id)?.color}>
                        <Icon name={consulta.medio?.icono || 'Globe'} size={16} />
                      </span>
                    )}
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
                    {!consulta.matriculado && (
                      <span className="flex items-center gap-1">
                        <Icon name="Mail" size={12} /> {consulta.emails_enviados}/2
                      </span>
                    )}
                  </div>
                  {isKeyMaster && consulta.encargado && (
                    <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                      → {consulta.encargado.nombre}
                    </p>
                  )}
                </div>
              ))}
              {leadsColumna.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">Sin leads</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})

const ListView = memo(({ filteredConsultas, selectConsulta, isKeyMaster, selectedLeads, setSelectedLeads, formatDateShort }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
    <table className="w-full min-w-[900px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          {isKeyMaster && (
            <th className="p-4 w-10">
              <input
                type="checkbox"
                checked={selectedLeads.length === (filteredConsultas || []).length && (filteredConsultas || []).length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLeads((filteredConsultas || []).map(c => c.id))
                  } else {
                    setSelectedLeads([])
                  }
                }}
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
            </th>
          )}
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
        {(filteredConsultas || []).map(c => (
          <tr
            key={c.id}
            onClick={() => selectConsulta(c.id)}
            className={`border-b border-slate-50 hover:bg-violet-50 cursor-pointer transition-colors ${selectedLeads.includes(c.id) ? 'bg-violet-50' : ''}`}
          >
            {isKeyMaster && (
              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedLeads.includes(c.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeads([...selectedLeads, c.id])
                    } else {
                      setSelectedLeads(selectedLeads.filter(id => id !== c.id))
                    }
                  }}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
              </td>
            )}
            <td className="p-4">
              <div className="flex items-center gap-2">
                {c.matriculado && <Icon name="CheckCircle" size={14} className="text-emerald-500" />}
                {c.descartado && <Icon name="XCircle" size={14} className="text-slate-400" />}
                <div>
                  <p className="font-medium text-slate-800">{c.nombre}</p>
                  <p className="text-xs text-slate-400">{formatDateShort(c.created_at)}</p>
                </div>
              </div>
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
              {c.matriculado ? (
                <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">Matriculado</span>
              ) : c.descartado ? (
                <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">Descartado</span>
              ) : (
                <span className={`px-2 py-1 rounded-full text-xs ${ESTADOS[c.estado]?.bg || 'bg-slate-100'} ${ESTADOS[c.estado]?.text || 'text-slate-600'}`}>
                  {ESTADOS[c.estado]?.label || c.estado}
                </span>
              )}
            </td>
            {isKeyMaster && (
              <td className="p-4 text-sm text-slate-600">{c.encargado?.nombre || '-'}</td>
            )}
            <td className="p-4">
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); selectConsulta(c.id); }}
                  className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg"
                >
                  <Icon name="Eye" size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {(filteredConsultas || []).length === 0 && (
      <div className="p-8 text-center text-slate-400">
        <Icon name="Search" size={32} className="mx-auto mb-2 opacity-50" />
        <p>No hay consultas que coincidan con los filtros</p>
      </div>
    )}
  </div>
))

const ConsultasView = memo(({ 
  isKeyMaster, canEdit, handleNuevoLead, searchTerm, setSearchTerm, 
  filterCarrera, setFilterCarrera, filterEstado, setFilterEstado, 
  filterTipoAlumno, setFilterTipoAlumno, viewMode, setViewMode,
  filteredConsultas, selectConsulta, selectedLeads, setSelectedLeads, formatDateShort 
}) => {
  const carrerasDisponibles = store.getCarreras().length > 0 ? store.getCarreras() : CARRERAS

  return (
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
          <button onClick={handleNuevoLead} className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2">
            <Icon name="Plus" size={20} /> Nueva Consulta
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 flex-wrap">
          <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <select value={filterCarrera} onChange={(e) => setFilterCarrera(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="todas">Todas las carreras</option>
            {carrerasDisponibles.map(c => (
              <option key={c.id} value={c.nombre}>{c.nombre}</option>
            ))}
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

      {viewMode === 'kanban' ? (
        <KanbanView 
          filteredConsultas={filteredConsultas}
          selectConsulta={selectConsulta}
          isKeyMaster={isKeyMaster}
          selectedLeads={selectedLeads}
          setSelectedLeads={setSelectedLeads}
          formatDateShort={formatDateShort}
        />
      ) : (
        <ListView 
          filteredConsultas={filteredConsultas}
          selectConsulta={selectConsulta}
          isKeyMaster={isKeyMaster}
          selectedLeads={selectedLeads}
          setSelectedLeads={setSelectedLeads}
          formatDateShort={formatDateShort}
        />
      )}
    </div>
  )
})

export default ConsultasView
