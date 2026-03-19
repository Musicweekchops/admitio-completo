import React, { memo } from 'react'
import Icon from './Icon'
import { ESTADOS, MEDIOS } from '../data/mockData'

const StatCard = memo(({ title, value, icon, color, sub, onClick }) => {
  const colorClasses = {
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'hover:bg-amber-50' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', hover: 'hover:bg-cyan-50' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'hover:bg-emerald-50' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', hover: 'hover:bg-violet-50' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', hover: 'hover:bg-slate-50' },
    red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50' },
  }
  const c = colorClasses[color] || colorClasses.slate

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center ${c.text}`}>
          <Icon name={icon} size={24} />
        </div>
      </div>
      {sub && <p className={`${c.text} text-sm mt-2`}>{sub}</p>}
    </>
  )

  if (onClick) {
    return (
      <button 
        onClick={onClick} 
        className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-left transition-all ${c.hover} hover:shadow-md hover:scale-[1.02] active:scale-[0.98] w-full`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      {content}
    </div>
  )
})

const DashboardView = memo(({ 
  user, 
  isKeyMaster, 
  metricas, 
  metricasGlobales, 
  consultas, 
  handleRefreshData, 
  navigateToEstado, 
  setFilterEstado, 
  setActiveTab, 
  safeLeadsHoy, 
  navigateToMatriculados, 
  setShowLeadsHoyModal, 
  formatearTiempoRespuesta,
  selectConsulta,
  filteredConsultas,
  handleNuevoLead,
  canEdit
}) => {
  // Fallback: verificar rol directamente
  const esAdmin = isKeyMaster || user?.rol_id === 'keymaster' || user?.rol_id === 'superadmin'

  const stats = esAdmin ? metricasGlobales : metricas

  // Protección: asegurar que consultas sea array
  const safeConsultas = consultas || []

  // Valores por defecto si no hay stats
  const defaultStats = {
    total: safeConsultas.length || 0,
    nuevas: safeConsultas.filter(c => c.estado === 'nueva').length || 0,
    contactados: safeConsultas.filter(c => c.estado === 'contactado').length || 0,
    seguimiento: safeConsultas.filter(c => c.estado === 'seguimiento').length || 0,
    examen_admision: safeConsultas.filter(c => c.estado === 'examen_admision').length || 0,
    matriculados: safeConsultas.filter(c => c.matriculado).length || 0,
    sinContactar: safeConsultas.filter(c => c.estado === 'nueva' && !c.matriculado).length || 0,
    activos: safeConsultas.filter(c => !c.matriculado && !c.descartado).length || 0,
    tasaConversion: 0
  }

  const safeStats = stats || defaultStats

  // Calcular valores según el rol
  const totalLeads = safeStats.total || 0
  const pendientes = esAdmin ? (safeStats.nuevas || 0) : (safeStats.sinContactar || 0)
  const enProceso = esAdmin
    ? (safeStats.contactados || 0) + (safeStats.seguimiento || 0)
    : (safeStats.activos || 0) - (safeStats.sinContactar || 0) - (safeStats.examen_admision || 0)
  const examenAdm = safeStats.examen_admision || 0
  const matriculados = safeStats.matriculados || 0
  const tasaConv = safeStats.tasaConversion || safeStats.tasa_conversion || 0
  const tiempoResp = safeStats.tiempoRespuestaPromedio || safeStats.tiempo_respuesta_promedio || null
  const tiempoCierre = safeStats.tiempoCierrePromedio || safeStats.tiempo_cierre_promedio || null

  // Calcular tipo de alumnos si no viene en stats
  const alumnosNuevos = safeStats.alumnos_nuevos || (filteredConsultas || []).filter(c => c.tipo_alumno === 'nuevo').length
  const alumnosAntiguos = safeStats.alumnos_antiguos || (filteredConsultas || []).filter(c => c.tipo_alumno === 'antiguo').length

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-900 to-purple-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Icon name="GraduationCap" className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {esAdmin ? 'Panel de Control' : `Hola, ${user?.nombre?.split(' ')[0]}`}
              </h1>
              <p className="text-violet-200">
                {esAdmin ? 'Vista general del sistema' : 'Tu resumen de hoy'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{totalLeads}</p>
            <p className="text-violet-200">{esAdmin ? 'Consultas totales' : 'Leads asignados'}</p>
            {/* Botón de actualizar manual */}
            <button
              onClick={handleRefreshData}
              className="mt-2 p-1.5 rounded-full hover:bg-white/20 transition-colors group"
              title="Actualizar datos"
            >
              <Icon name="RefreshCw" size={14} className="text-violet-200 group-hover:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Clickeables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Pendientes"
          value={pendientes}
          icon="Clock"
          color="amber"
          sub="Requieren atención"
          onClick={() => navigateToEstado('nueva')}
        />
        <StatCard
          title="En Proceso"
          value={enProceso}
          icon="Users"
          color="blue"
          sub="Seguimiento activo"
          onClick={() => { if(setFilterEstado) setFilterEstado('todos'); if(setActiveTab) setActiveTab('consultas'); }}
        />
        <StatCard
          title={esAdmin ? "Examen Adm." : "Contactar Hoy"}
          value={esAdmin ? examenAdm : (safeLeadsHoy?.length || 0)}
          icon={esAdmin ? "ClipboardCheck" : "Phone"}
          color="cyan"
          sub={esAdmin ? "Agendados" : "Requieren atención"}
          onClick={() => esAdmin ? navigateToEstado('examen_admision') : (setShowLeadsHoyModal && setShowLeadsHoyModal(true))}
        />
        <StatCard
          title="Matriculados"
          value={matriculados}
          icon="Check"
          color="emerald"
          sub="Este período"
          onClick={() => navigateToMatriculados && navigateToMatriculados()}
        />
        <StatCard
          title="Conversión"
          value={`${tasaConv}%`}
          icon="TrendingUp"
          color="violet"
          sub="Tasa de éxito"
        />
      </div>

      {/* KPIs de Tiempo - Solo si hay datos */}
      {(tiempoResp !== null || tiempoCierre !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiempoResp !== null && (() => {
            const tiempo = formatearTiempoRespuesta ? formatearTiempoRespuesta(tiempoResp) : { texto: `${tiempoResp}h`, color: 'text-slate-600' }
            return (
              <div className={`p-4 rounded-xl border ${tiempoResp <= 4 ? 'bg-emerald-50 border-emerald-200' : tiempoResp <= 8 ? 'bg-amber-50 border-amber-200' : tiempoResp <= 24 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tiempo.color.replace('text-', 'bg-').replace('600', '100')} ${tiempo.color}`}>
                    <Icon name="Zap" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tiempo de Respuesta</p>
                    <p className={`text-2xl font-bold ${tiempo.color}`}>
                      {tiempo.texto} <span className="text-base font-normal">promedio</span>
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}
          {tiempoCierre !== null && tiempoCierre > 0 && (() => {
            const color = tiempoCierre <= 7 ? 'text-emerald-600' : tiempoCierre <= 14 ? 'text-blue-600' : tiempoCierre <= 30 ? 'text-amber-600' : 'text-red-600'
            const bgClass = tiempoCierre <= 7 ? 'bg-emerald-50 border-emerald-200' : tiempoCierre <= 14 ? 'bg-blue-50 border-blue-200' : tiempoCierre <= 30 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            return (
              <div className={`p-4 rounded-xl border ${bgClass}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-').replace('600', '100')} ${color}`}>
                    <Icon name="Calendar" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tiempo de Cierre</p>
                    <p className={`text-2xl font-bold ${color}`}>
                      {tiempoCierre} días <span className="text-base font-normal">promedio</span>
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Leads para Hoy */}
      {safeLeadsHoy?.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              <Icon name="Bell" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Para Contactar Hoy</h3>
              <p className="text-sm text-slate-500">{safeLeadsHoy.length} lead{safeLeadsHoy.length !== 1 ? 's' : ''} requiere{safeLeadsHoy.length === 1 ? '' : 'n'} tu atención</p>
            </div>
          </div>
          <div className="space-y-2">
            {safeLeadsHoy.slice(0, 5).map(c => (
              <div key={c.id}
                onClick={() => selectConsulta(c.id)}
                className={`flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-all ${c.nuevoInteres ? 'border-l-4 border-violet-500 ring-1 ring-violet-200' :
                  c.atrasado ? 'border-l-4 border-red-400' :
                  'border-l-4 border-amber-400'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${c.carrera?.color || 'bg-slate-400'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{c.nombre}</p>
                      {c.nuevoInteres && (
                        <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full font-medium flex items-center gap-1">
                          <Icon name="Music" size={10} /> Nuevo Interés
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'} · {ESTADOS[c.estado]?.label || c.estado}
                      {c.tipo_alumno === 'antiguo' && <span className="ml-2 text-violet-600">• Alumno Antiguo</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.atrasado && !c.nuevoInteres && <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">Atrasado</span>}
                  <Icon name="ChevronRight" size={16} className="text-slate-400" />
                </div>
              </div>
            ))}
            {safeLeadsHoy.length > 5 && (
              <button 
                onClick={() => setActiveTab && setActiveTab('consultas')} 
                className="w-full text-center py-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Ver todos ({safeLeadsHoy.length}) →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Métricas de tiempo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tiempoResp === null ? 'bg-slate-100 text-slate-400' :
              tiempoResp <= 4 ? 'bg-emerald-100 text-emerald-600' :
              tiempoResp <= 8 ? 'bg-amber-100 text-amber-600' :
              'bg-red-100 text-red-600'
            }`}>
              <Icon name="Zap" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tiempo de Respuesta</p>
              <p className="text-2xl font-bold text-slate-800">
                {tiempoResp !== null ? `${tiempoResp}h` : 'Sin datos'}
              </p>
            </div>
          </div>
          {tiempoResp !== null && (
            tiempoResp <= 4 ? (
              <p className="text-sm text-emerald-600">✓ Excelente tiempo</p>
            ) : tiempoResp <= 8 ? (
              <p className="text-sm text-amber-600">⚠ Tiempo aceptable</p>
            ) : (
              <p className="text-sm text-red-600">⚠ Considera responder más rápido</p>
            )
          )}
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Icon name="Calendar" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tiempo de Cierre</p>
              <p className="text-2xl font-bold text-slate-800">
                {tiempoCierre !== null && tiempoCierre > 0 ? `${tiempoCierre} días` : 'Sin datos'}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400">Promedio hasta matrícula</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600">
              <Icon name="UserCheck" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tipo de Alumnos</p>
              <div className="flex gap-4 mt-1">
                <span className="text-lg font-bold text-blue-600">{alumnosNuevos} <span className="text-xs font-normal text-slate-400">Nuevos</span></span>
                <span className="text-lg font-bold text-violet-600">{alumnosAntiguos} <span className="text-xs font-normal text-slate-400">Antiguos</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leads recientes */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Leads Recientes</h3>
          <button 
            onClick={() => setActiveTab && setActiveTab('consultas')} 
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            Ver todos →
          </button>
        </div>
        <div className="space-y-3">
          {(filteredConsultas || []).filter(c => !c.matriculado && !c.descartado).slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => selectConsulta(c.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${c.carrera?.color || 'bg-slate-400'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{c.nombre}</p>
                    {c.tipo_alumno === 'antiguo' && (
                      <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-xs rounded">Antiguo</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs ${ESTADOS[c.estado]?.bg || 'bg-slate-100'} ${ESTADOS[c.estado]?.text || 'text-slate-600'}`}>
                  {ESTADOS[c.estado]?.label || c.estado}
                </span>
                <span className={`${MEDIOS?.find(m => m.id === c.medio_id)?.color || 'text-slate-500'}`}>
                  <Icon name={c.medio?.icono || 'Globe'} size={16} />
                </span>
              </div>
            </div>
          ))}
          {(filteredConsultas || []).filter(c => !c.matriculado && !c.descartado).length === 0 && (
            <p className="text-center text-slate-400 py-4">🎉 No hay leads activos</p>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={handleNuevoLead} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl p-5 text-left hover:from-violet-700 hover:to-purple-700 transition-all">
            <Icon name="Plus" className="mb-3" size={32} />
            <p className="font-semibold">Nueva Consulta</p>
            <p className="text-violet-200 text-sm">Registrar prospecto manualmente</p>
          </button>
          <button 
            onClick={() => setActiveTab && setActiveTab('consultas')} 
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl p-5 text-left hover:from-blue-700 hover:to-cyan-700 transition-all"
          >
            <Icon name="LayoutGrid" className="mb-3" size={32} />
            <p className="font-semibold">Ver Pipeline</p>
            <p className="text-blue-200 text-sm">Gestionar leads en Kanban</p>
          </button>
        </div>
      )}
    </div>
  )
})

export default DashboardView
