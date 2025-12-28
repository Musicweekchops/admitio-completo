// ============================================
// ADMITIO BACKOFFICE - Dashboard Principal
// src/pages/backoffice/BackofficeDashboard.jsx
// ============================================

import { useState, useEffect } from 'react'
import { useBackofficeAuth } from '../../context/BackofficeAuthContext'
import { supabase } from '../../lib/supabase'
import {
  Shield,
  Building,
  Users,
  FileText,
  TrendingUp,
  DollarSign,
  Globe,
  Activity,
  AlertTriangle,
  LogOut,
  Settings,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Target,
  Award,
  Loader,
  UserPlus,
  CreditCard,
  MessageSquare,
  BarChart3,
  PieChart,
  Map
} from 'lucide-react'

const BackofficeDashboard = () => {
  const { admin, cerrarSesion, isSuperOwner } = useBackofficeAuth()
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState(null)
  const [institucionesPorPais, setInstitucionesPorPais] = useState([])
  const [institucionesPorTipo, setInstitucionesPorTipo] = useState([])
  const [cohortes, setCohortes] = useState([])
  const [disputasPendientes, setDisputasPendientes] = useState([])
  const [institucionesRecientes, setInstitucionesRecientes] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Métricas generales
      const { data: metricasData } = await supabase
        .from('metricas_generales')
        .select('*')
        .single()
      
      setMetricas(metricasData)

      // Por país
      const { data: paisData } = await supabase
        .from('metricas_por_pais')
        .select('*')
        .limit(10)
      
      setInstitucionesPorPais(paisData || [])

      // Por tipo
      const { data: tipoData } = await supabase
        .from('metricas_por_tipo')
        .select('*')
      
      setInstitucionesPorTipo(tipoData || [])

      // Cohortes
      const { data: cohortesData } = await supabase
        .from('cohortes_mensuales')
        .select('*')
        .limit(6)
      
      setCohortes(cohortesData || [])

      // Disputas pendientes
      const { data: disputasData } = await supabase
        .from('disputas_nombre')
        .select('*')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(5)
      
      setDisputasPendientes(disputasData || [])

      // Instituciones recientes
      const { data: instRecientes } = await supabase
        .from('instituciones')
        .select('id, nombre, tipo, pais, ciudad, plan, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      setInstitucionesRecientes(instRecientes || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    return new Intl.NumberFormat('es-CL').format(num)
  }

  const formatCurrency = (num) => {
    if (!num) return '$0'
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      maximumFractionDigits: 0 
    }).format(num)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatMes = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-CL', {
      month: 'short',
      year: 'numeric'
    })
  }

  const getTipoLabel = (tipo) => {
    const tipos = {
      'musica_artes': 'Música / Artes',
      'idiomas': 'Idiomas',
      'tecnico_oficios': 'Técnico / Oficios',
      'preuniversitario': 'Preuniversitario',
      'educacion_superior': 'Ed. Superior',
      'capacitacion_empresarial': 'Capacitación',
      'colegio_escuela': 'Colegio / Escuela',
      'otro': 'Otro'
    }
    return tipos[tipo] || tipo || 'No especificado'
  }

  const getPlanColor = (plan) => {
    const colores = {
      free: 'bg-slate-100 text-slate-600',
      inicial: 'bg-blue-100 text-blue-600',
      profesional: 'bg-violet-100 text-violet-600',
      premium: 'bg-amber-100 text-amber-600',
      enterprise: 'bg-emerald-100 text-emerald-600'
    }
    return colores[plan] || colores.free
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando datos...</p>
        </div>
      </div>
    )
  }

  const tasaConversion = metricas?.instituciones_free > 0 
    ? ((metricas?.instituciones_pagadas / metricas?.total_instituciones) * 100).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Backoffice</h1>
                <p className="text-xs text-slate-400">Admitio Control Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={cargarDatos}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw size={18} />
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{admin?.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {isSuperOwner ? 'Super Owner' : 'Admin'}
                  </p>
                </div>
                <button
                  onClick={cerrarSesion}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px">
            {[
              { id: 'overview', label: 'Resumen', icon: BarChart3 },
              { id: 'instituciones', label: 'Instituciones', icon: Building },
              { id: 'disputas', label: 'Disputas', icon: MessageSquare, badge: disputasPendientes.length },
              { id: 'pagos', label: 'Pagos', icon: CreditCard },
              { id: 'admins', label: 'Admins', icon: Users, superOnly: true }
            ].map(tab => {
              if (tab.superOnly && !isSuperOwner) return null
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            {/* KPIs principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon={Building}
                label="Instituciones"
                value={formatNumber(metricas?.total_instituciones)}
                subvalue={`${metricas?.instituciones_activas || 0} activas`}
                color="violet"
              />
              <MetricCard
                icon={Users}
                label="Usuarios"
                value={formatNumber(metricas?.total_usuarios)}
                subvalue={`${metricas?.usuarios_activos || 0} activos`}
                color="blue"
              />
              <MetricCard
                icon={FileText}
                label="Leads Gestionados"
                value={formatNumber(metricas?.total_leads)}
                subvalue={`${metricas?.total_matriculas || 0} matrículas`}
                color="emerald"
              />
              <MetricCard
                icon={DollarSign}
                label="MRR Estimado"
                value={formatCurrency(metricas?.mrr_estimado)}
                subvalue={`${metricas?.instituciones_pagadas || 0} pagadas`}
                color="amber"
              />
            </div>

            {/* Segunda fila de KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon={TrendingUp}
                label="Tasa Conversión"
                value={`${tasaConversion}%`}
                subvalue="Free → Pagado"
                color="indigo"
              />
              <MetricCard
                icon={Target}
                label="Tasa Matrícula"
                value={metricas?.total_leads > 0 
                  ? `${((metricas?.total_matriculas / metricas?.total_leads) * 100).toFixed(1)}%` 
                  : '0%'
                }
                subvalue="Leads → Matrículas"
                color="pink"
              />
              <MetricCard
                icon={AlertTriangle}
                label="Disputas Pendientes"
                value={disputasPendientes.length}
                subvalue="Requieren atención"
                color="red"
              />
              <MetricCard
                icon={Calendar}
                label="Ingresos del Mes"
                value={formatCurrency(metricas?.ingresos_mes_actual)}
                subvalue={new Date().toLocaleDateString('es-CL', { month: 'long' })}
                color="green"
              />
            </div>

            {/* Gráficos y tablas */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Por País */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Globe size={20} className="text-violet-400" />
                    Distribución por País
                  </h3>
                </div>
                <div className="space-y-3">
                  {institucionesPorPais.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-slate-300">{item.pais}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-violet-500 h-2 rounded-full"
                            style={{ 
                              width: `${(item.instituciones / (metricas?.total_instituciones || 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-white font-medium w-8 text-right">
                          {item.instituciones}
                        </span>
                      </div>
                    </div>
                  ))}
                  {institucionesPorPais.length === 0 && (
                    <p className="text-slate-500 text-center py-4">Sin datos</p>
                  )}
                </div>
              </div>

              {/* Por Tipo */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <PieChart size={20} className="text-blue-400" />
                    Distribución por Tipo
                  </h3>
                </div>
                <div className="space-y-3">
                  {institucionesPorTipo.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-slate-300">{getTipoLabel(item.tipo)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 text-sm">
                          {item.pagadas} pagadas
                        </span>
                        <span className="text-white font-medium">
                          {item.instituciones}
                        </span>
                      </div>
                    </div>
                  ))}
                  {institucionesPorTipo.length === 0 && (
                    <p className="text-slate-500 text-center py-4">Sin datos</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cohortes y Recientes */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Cohortes */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Activity size={20} className="text-emerald-400" />
                  Cohortes Mensuales
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-slate-400 text-sm">
                        <th className="text-left pb-3">Mes</th>
                        <th className="text-right pb-3">Nuevas</th>
                        <th className="text-right pb-3">Convertidas</th>
                        <th className="text-right pb-3">Activas</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {cohortes.map((c, i) => (
                        <tr key={i} className="border-t border-slate-700">
                          <td className="py-2">{formatMes(c.mes_registro)}</td>
                          <td className="py-2 text-right">{c.instituciones_nuevas}</td>
                          <td className="py-2 text-right text-emerald-400">{c.convertidas_a_pago}</td>
                          <td className="py-2 text-right">{c.aun_activas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instituciones recientes */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <UserPlus size={20} className="text-violet-400" />
                  Registros Recientes
                </h3>
                <div className="space-y-3">
                  {institucionesRecientes.slice(0, 5).map((inst) => (
                    <div 
                      key={inst.id} 
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">{inst.nombre}</p>
                        <p className="text-slate-400 text-sm">
                          {inst.ciudad}, {inst.pais} • {getTipoLabel(inst.tipo)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(inst.plan)}`}>
                          {inst.plan}
                        </span>
                        <p className="text-slate-500 text-xs mt-1">
                          {formatDate(inst.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'instituciones' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Todas las Instituciones</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr className="text-slate-400 text-sm">
                    <th className="text-left px-6 py-3">Institución</th>
                    <th className="text-left px-6 py-3">Ubicación</th>
                    <th className="text-left px-6 py-3">Tipo</th>
                    <th className="text-left px-6 py-3">Plan</th>
                    <th className="text-left px-6 py-3">Registro</th>
                    <th className="text-right px-6 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {institucionesRecientes.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{inst.nombre}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {inst.ciudad}, {inst.pais}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {getTipoLabel(inst.tipo)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(inst.plan)}`}>
                          {inst.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {formatDate(inst.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-violet-400 hover:text-violet-300 text-sm">
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'disputas' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Disputas de Nombres</h2>
              <p className="text-slate-400 text-sm mt-1">
                {isSuperOwner 
                  ? 'Puedes revisar y cerrar disputas'
                  : 'Puedes revisar disputas pero solo el Super Owner puede cerrarlas'
                }
              </p>
            </div>
            <div className="p-6">
              {disputasPendientes.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay disputas pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputasPendientes.map((disputa) => (
                    <div 
                      key={disputa.id}
                      className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-medium">
                            "{disputa.nombre_disputado}"
                          </h3>
                          <p className="text-slate-400 text-sm mt-1">
                            Reclamado por: {disputa.reclamante_nombre} ({disputa.reclamante_email})
                          </p>
                          <p className="text-slate-500 text-sm mt-2">
                            {disputa.justificacion?.slice(0, 150)}...
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg">
                            Revisar
                          </button>
                          {isSuperOwner && (
                            <button className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg">
                              Resolver
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-500 text-xs mt-3">
                        Creada: {formatDate(disputa.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pagos' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Registro de Pagos</h2>
                <p className="text-slate-400 text-sm mt-1">Pagos manuales de instituciones</p>
              </div>
              <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg flex items-center gap-2">
                <DollarSign size={18} />
                Registrar Pago
              </button>
            </div>
            <div className="p-6 text-center py-12">
              <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay pagos registrados</p>
              <p className="text-slate-500 text-sm mt-1">
                Usa el botón "Registrar Pago" para agregar un nuevo pago
              </p>
            </div>
          </div>
        )}

        {activeTab === 'admins' && isSuperOwner && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Administradores</h2>
                <p className="text-slate-400 text-sm mt-1">Gestiona el acceso al backoffice</p>
              </div>
              <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg flex items-center gap-2">
                <UserPlus size={18} />
                Invitar Admin
              </button>
            </div>
            <div className="p-6">
              <div className="p-4 bg-slate-700/50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{admin?.nombre}</p>
                    <p className="text-slate-400 text-sm">{admin?.email}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-violet-600/20 text-violet-400 text-sm font-medium rounded-full">
                  Super Owner
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Componente de tarjeta de métrica
const MetricCard = ({ icon: Icon, label, value, subvalue, color }) => {
  const colors = {
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20'
  }

  const iconColors = {
    violet: 'text-violet-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    indigo: 'text-indigo-400',
    pink: 'text-pink-400',
    red: 'text-red-400',
    green: 'text-green-400'
  }

  return (
    <div className={`rounded-xl p-5 border ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={iconColors[color]} size={20} />
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-slate-500 text-sm mt-1">{subvalue}</p>
    </div>
  )
}

export default BackofficeDashboard
