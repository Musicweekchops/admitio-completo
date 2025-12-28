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
  ChevronRight,
  RefreshCw,
  Calendar,
  Target,
  Loader,
  UserPlus,
  CreditCard,
  MessageSquare,
  BarChart3,
  PieChart,
  X,
  Check,
  XCircle,
  Eye,
  Mail,
  Phone,
  Link,
  MapPin,
  Clock,
  Award,
  ExternalLink
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
  const [todasInstituciones, setTodasInstituciones] = useState([])
  const [pagosRegistrados, setPagosRegistrados] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  // Estados para modales
  const [modalPago, setModalPago] = useState(false)
  const [modalDisputa, setModalDisputa] = useState(null)
  const [modalInstitucion, setModalInstitucion] = useState(null)
  const [modalInvitarAdmin, setModalInvitarAdmin] = useState(false)
  const [admins, setAdmins] = useState([])

  // Estado para formulario de pago
  const [pagoForm, setPagoForm] = useState({
    institucion_id: '',
    monto: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    medio_pago: 'transferencia',
    plan_nuevo: 'inicial',
    periodo_desde: '',
    periodo_hasta: '',
    notas: ''
  })
  const [guardandoPago, setGuardandoPago] = useState(false)

  // Estado para resolver disputa
  const [resolucionDisputa, setResolucionDisputa] = useState({
    estado: 'rechazada',
    notas: ''
  })
  const [resolviendoDisputa, setResolviendoDisputa] = useState(false)

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
        .in('estado', ['pendiente', 'en_revision'])
        .order('created_at', { ascending: false })
      
      setDisputasPendientes(disputasData || [])

      // Todas las instituciones
      const { data: instTodas } = await supabase
        .from('instituciones')
        .select('*')
        .order('created_at', { ascending: false })
      
      setTodasInstituciones(instTodas || [])
      setInstitucionesRecientes((instTodas || []).slice(0, 10))

      // Pagos
      const { data: pagosData } = await supabase
        .from('pagos_instituciones')
        .select('*, instituciones(nombre)')
        .order('created_at', { ascending: false })
        .limit(20)
      
      setPagosRegistrados(pagosData || [])

      // Admins
      const { data: adminsData } = await supabase
        .from('admins_backoffice')
        .select('*')
        .order('created_at', { ascending: true })
      
      setAdmins(adminsData || [])

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

  const getEstadoDisputaColor = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-700',
      en_revision: 'bg-blue-100 text-blue-700',
      aprobada: 'bg-green-100 text-green-700',
      rechazada: 'bg-red-100 text-red-700'
    }
    return colores[estado] || colores.pendiente
  }

  // ========== REGISTRAR PAGO ==========
  const handleGuardarPago = async (e) => {
    e.preventDefault()
    if (!pagoForm.institucion_id || !pagoForm.monto) {
      alert('Selecciona una institución y monto')
      return
    }

    setGuardandoPago(true)
    try {
      // Insertar pago
      const { error: pagoError } = await supabase
        .from('pagos_instituciones')
        .insert({
          institucion_id: pagoForm.institucion_id,
          monto: parseFloat(pagoForm.monto),
          fecha_pago: pagoForm.fecha_pago,
          medio_pago: pagoForm.medio_pago,
          plan_nuevo: pagoForm.plan_nuevo,
          periodo_desde: pagoForm.periodo_desde || null,
          periodo_hasta: pagoForm.periodo_hasta || null,
          notas: pagoForm.notas || null,
          registrado_por: admin.id
        })

      if (pagoError) throw pagoError

      // Actualizar plan de la institución
      const { error: updateError } = await supabase
        .from('instituciones')
        .update({
          plan: pagoForm.plan_nuevo,
          precio_mensual: parseFloat(pagoForm.monto),
          fecha_proximo_pago: pagoForm.periodo_hasta || null
        })
        .eq('id', pagoForm.institucion_id)

      if (updateError) throw updateError

      // Log de actividad
      await supabase.from('backoffice_activity_log').insert({
        admin_id: admin.id,
        admin_email: admin.email,
        accion: 'registrar_pago',
        descripcion: `Pago de ${formatCurrency(pagoForm.monto)} registrado`,
        entidad_tipo: 'institucion',
        entidad_id: pagoForm.institucion_id
      })

      alert('Pago registrado exitosamente')
      setModalPago(false)
      setPagoForm({
        institucion_id: '',
        monto: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        medio_pago: 'transferencia',
        plan_nuevo: 'inicial',
        periodo_desde: '',
        periodo_hasta: '',
        notas: ''
      })
      cargarDatos()

    } catch (error) {
      console.error('Error registrando pago:', error)
      alert('Error al registrar pago: ' + error.message)
    } finally {
      setGuardandoPago(false)
    }
  }

  // ========== RESOLVER DISPUTA ==========
  const handleResolverDisputa = async () => {
    if (!modalDisputa || !isSuperOwner) return

    setResolviendoDisputa(true)
    try {
      const { error } = await supabase
        .from('disputas_nombre')
        .update({
          estado: resolucionDisputa.estado,
          resolucion_notas: resolucionDisputa.notas,
          cerrado_por: admin.id,
          fecha_cierre: new Date().toISOString()
        })
        .eq('id', modalDisputa.id)

      if (error) throw error

      // Si se aprueba, proteger el nombre para el reclamante
      if (resolucionDisputa.estado === 'aprobada') {
        // Aquí podrías crear la institución para el reclamante
        // o marcar la existente como transferida
      }

      // Log de actividad
      await supabase.from('backoffice_activity_log').insert({
        admin_id: admin.id,
        admin_email: admin.email,
        accion: 'resolver_disputa',
        descripcion: `Disputa por "${modalDisputa.nombre_disputado}" ${resolucionDisputa.estado}`,
        entidad_tipo: 'disputa',
        entidad_id: modalDisputa.id
      })

      alert('Disputa resuelta')
      setModalDisputa(null)
      setResolucionDisputa({ estado: 'rechazada', notas: '' })
      cargarDatos()

    } catch (error) {
      console.error('Error resolviendo disputa:', error)
      alert('Error: ' + error.message)
    } finally {
      setResolviendoDisputa(false)
    }
  }

  // ========== MARCAR EN REVISIÓN ==========
  const handleMarcarEnRevision = async (disputa) => {
    try {
      const { error } = await supabase
        .from('disputas_nombre')
        .update({
          estado: 'en_revision',
          revisado_por: admin.id,
          fecha_revision: new Date().toISOString()
        })
        .eq('id', disputa.id)

      if (error) throw error
      cargarDatos()
    } catch (error) {
      alert('Error: ' + error.message)
    }
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

  const tasaConversion = metricas?.total_instituciones > 0 
    ? ((metricas?.instituciones_pagadas / metricas?.total_instituciones) * 100).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
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
          <nav className="flex gap-1 -mb-px overflow-x-auto">
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
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
        
        {/* ==================== OVERVIEW ==================== */}
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
                  {institucionesPorPais.length > 0 ? institucionesPorPais.map((item, i) => (
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
                  )) : (
                    <p className="text-slate-500 text-center py-4">Sin datos aún</p>
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
                  {institucionesPorTipo.length > 0 ? institucionesPorTipo.map((item, i) => (
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
                  )) : (
                    <p className="text-slate-500 text-center py-4">Sin datos aún</p>
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
                {cohortes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-slate-400 text-sm">
                          <th className="text-left pb-3">Mes</th>
                          <th className="text-right pb-3">Nuevas</th>
                          <th className="text-right pb-3">Pagadas</th>
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
                ) : (
                  <p className="text-slate-500 text-center py-4">Sin datos aún</p>
                )}
              </div>

              {/* Instituciones recientes */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <UserPlus size={20} className="text-violet-400" />
                  Registros Recientes
                </h3>
                <div className="space-y-3">
                  {institucionesRecientes.length > 0 ? institucionesRecientes.slice(0, 5).map((inst) => (
                    <div 
                      key={inst.id} 
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => setModalInstitucion(inst)}
                    >
                      <div>
                        <p className="text-white font-medium">{inst.nombre}</p>
                        <p className="text-slate-400 text-sm">
                          {inst.ciudad || 'Sin ciudad'}, {inst.pais || 'Chile'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(inst.plan)}`}>
                          {inst.plan || 'free'}
                        </span>
                        <p className="text-slate-500 text-xs mt-1">
                          {formatDate(inst.created_at)}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 text-center py-4">Sin instituciones aún</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== INSTITUCIONES ==================== */}
        {activeTab === 'instituciones' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Todas las Instituciones ({todasInstituciones.length})</h2>
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
                  {todasInstituciones.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{inst.nombre}</p>
                        {inst.sitio_web && (
                          <a 
                            href={inst.sitio_web} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-violet-400 text-xs hover:underline flex items-center gap-1"
                          >
                            <ExternalLink size={10} />
                            {inst.sitio_web.replace(/https?:\/\//, '').slice(0, 30)}
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {inst.ciudad || '-'}, {inst.pais || 'Chile'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {getTipoLabel(inst.tipo)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(inst.plan)}`}>
                          {inst.plan || 'free'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {formatDate(inst.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setModalInstitucion(inst)}
                          className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1 ml-auto"
                        >
                          <Eye size={14} />
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {todasInstituciones.length === 0 && (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay instituciones registradas</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== DISPUTAS ==================== */}
        {activeTab === 'disputas' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Disputas de Nombres</h2>
              <p className="text-slate-400 text-sm mt-1">
                {isSuperOwner 
                  ? 'Puedes revisar y resolver disputas'
                  : 'Puedes revisar disputas pero solo el Super Owner puede resolverlas'
                }
              </p>
            </div>
            <div className="p-6">
              {disputasPendientes.length === 0 ? (
                <div className="text-center py-12">
                  <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-slate-400">No hay disputas pendientes</p>
                  <p className="text-slate-500 text-sm">¡Todo en orden!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputasPendientes.map((disputa) => (
                    <div 
                      key={disputa.id}
                      className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-medium">
                              "{disputa.nombre_disputado}"
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEstadoDisputaColor(disputa.estado)}`}>
                              {disputa.estado}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-300">
                              <span className="text-slate-500">Reclamante:</span> {disputa.reclamante_nombre}
                            </p>
                            <p className="text-slate-300">
                              <span className="text-slate-500">Email:</span> {disputa.reclamante_email}
                            </p>
                            {disputa.reclamante_telefono && (
                              <p className="text-slate-300">
                                <span className="text-slate-500">Tel:</span> {disputa.reclamante_telefono}
                              </p>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mt-3 line-clamp-2">
                            {disputa.justificacion}
                          </p>
                          <p className="text-slate-500 text-xs mt-2">
                            Creada: {formatDate(disputa.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {disputa.estado === 'pendiente' && (
                            <button 
                              onClick={() => handleMarcarEnRevision(disputa)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
                            >
                              Marcar en revisión
                            </button>
                          )}
                          <button 
                            onClick={() => setModalDisputa(disputa)}
                            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg"
                          >
                            Ver completo
                          </button>
                          {isSuperOwner && (
                            <button 
                              onClick={() => {
                                setModalDisputa(disputa)
                              }}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg"
                            >
                              Resolver
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== PAGOS ==================== */}
        {activeTab === 'pagos' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Registro de Pagos</h2>
                  <p className="text-slate-400 text-sm mt-1">Pagos manuales de instituciones</p>
                </div>
                <button 
                  onClick={() => setModalPago(true)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg flex items-center gap-2"
                >
                  <DollarSign size={18} />
                  Registrar Pago
                </button>
              </div>
              
              {pagosRegistrados.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700/50">
                      <tr className="text-slate-400 text-sm">
                        <th className="text-left px-6 py-3">Institución</th>
                        <th className="text-left px-6 py-3">Monto</th>
                        <th className="text-left px-6 py-3">Plan</th>
                        <th className="text-left px-6 py-3">Medio</th>
                        <th className="text-left px-6 py-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {pagosRegistrados.map((pago) => (
                        <tr key={pago.id} className="hover:bg-slate-700/30">
                          <td className="px-6 py-4 text-white">
                            {pago.instituciones?.nombre || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-medium">
                            {formatCurrency(pago.monto)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(pago.plan_nuevo)}`}>
                              {pago.plan_nuevo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 capitalize">
                            {pago.medio_pago}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-sm">
                            {formatDate(pago.fecha_pago)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center py-12">
                  <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay pagos registrados</p>
                  <p className="text-slate-500 text-sm mt-1">
                    Usa el botón "Registrar Pago" para agregar uno
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== ADMINS ==================== */}
        {activeTab === 'admins' && isSuperOwner && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Administradores</h2>
                <p className="text-slate-400 text-sm mt-1">Gestiona el acceso al backoffice</p>
              </div>
              <button 
                onClick={() => setModalInvitarAdmin(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg flex items-center gap-2"
              >
                <UserPlus size={18} />
                Invitar Admin
              </button>
            </div>
            <div className="p-6 space-y-3">
              {admins.map((a) => (
                <div key={a.id} className="p-4 bg-slate-700/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.rol === 'super_owner' ? 'bg-violet-600' : 'bg-slate-600'}`}>
                      {a.rol === 'super_owner' ? (
                        <Shield className="w-5 h-5 text-white" />
                      ) : (
                        <Users className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{a.nombre}</p>
                      <p className="text-slate-400 text-sm">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      a.rol === 'super_owner' 
                        ? 'bg-violet-600/20 text-violet-400' 
                        : 'bg-slate-600/50 text-slate-300'
                    }`}>
                      {a.rol === 'super_owner' ? 'Super Owner' : 'Admin'}
                    </span>
                    {a.ultimo_login && (
                      <span className="text-slate-500 text-xs">
                        Último acceso: {formatDate(a.ultimo_login)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ==================== MODAL: REGISTRAR PAGO ==================== */}
      {modalPago && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Registrar Pago</h2>
              <button onClick={() => setModalPago(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGuardarPago} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Institución *</label>
                <select
                  value={pagoForm.institucion_id}
                  onChange={(e) => setPagoForm({...pagoForm, institucion_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                >
                  <option value="">Seleccionar institución</option>
                  {todasInstituciones.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Monto (CLP) *</label>
                  <input
                    type="number"
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="50000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Fecha de pago *</label>
                  <input
                    type="date"
                    value={pagoForm.fecha_pago}
                    onChange={(e) => setPagoForm({...pagoForm, fecha_pago: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Medio de pago</label>
                  <select
                    value={pagoForm.medio_pago}
                    onChange={(e) => setPagoForm({...pagoForm, medio_pago: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Plan a activar</label>
                  <select
                    value={pagoForm.plan_nuevo}
                    onChange={(e) => setPagoForm({...pagoForm, plan_nuevo: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="inicial">Inicial</option>
                    <option value="profesional">Profesional</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Período desde</label>
                  <input
                    type="date"
                    value={pagoForm.periodo_desde}
                    onChange={(e) => setPagoForm({...pagoForm, periodo_desde: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Período hasta</label>
                  <input
                    type="date"
                    value={pagoForm.periodo_hasta}
                    onChange={(e) => setPagoForm({...pagoForm, periodo_hasta: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Notas</label>
                <textarea
                  value={pagoForm.notas}
                  onChange={(e) => setPagoForm({...pagoForm, notas: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-20"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalPago(false)}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPago}
                  className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {guardandoPago ? <Loader className="w-4 h-4 animate-spin" /> : <Check size={18} />}
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DETALLE INSTITUCIÓN ==================== */}
      {modalInstitucion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{modalInstitucion.nombre}</h2>
              <button onClick={() => setModalInstitucion(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-500 text-sm">Plan actual</p>
                    <span className={`inline-block mt-1 px-3 py-1 rounded text-sm font-medium ${getPlanColor(modalInstitucion.plan)}`}>
                      {modalInstitucion.plan || 'free'}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Tipo</p>
                    <p className="text-white">{getTipoLabel(modalInstitucion.tipo)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Ubicación</p>
                    <p className="text-white flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" />
                      {modalInstitucion.ciudad || '-'}, {modalInstitucion.region || ''} {modalInstitucion.pais || 'Chile'}
                    </p>
                  </div>
                  {modalInstitucion.sitio_web && (
                    <div>
                      <p className="text-slate-500 text-sm">Sitio web</p>
                      <a 
                        href={modalInstitucion.sitio_web} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:underline flex items-center gap-2"
                      >
                        <Link size={14} />
                        {modalInstitucion.sitio_web}
                      </a>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-500 text-sm">Fecha de registro</p>
                    <p className="text-white flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {formatDate(modalInstitucion.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Estado</p>
                    <p className="text-white">{modalInstitucion.estado || 'activo'}</p>
                  </div>
                  {modalInstitucion.precio_mensual > 0 && (
                    <div>
                      <p className="text-slate-500 text-sm">Precio mensual</p>
                      <p className="text-emerald-400 font-medium">
                        {formatCurrency(modalInstitucion.precio_mensual)}
                      </p>
                    </div>
                  )}
                  {modalInstitucion.health_score > 0 && (
                    <div>
                      <p className="text-slate-500 text-sm">Health Score</p>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              modalInstitucion.health_score >= 70 ? 'bg-emerald-500' :
                              modalInstitucion.health_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${modalInstitucion.health_score}%` }}
                          />
                        </div>
                        <span className="text-white font-medium">{modalInstitucion.health_score}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700 flex gap-3">
                <button
                  onClick={() => {
                    setPagoForm({...pagoForm, institucion_id: modalInstitucion.id})
                    setModalInstitucion(null)
                    setModalPago(true)
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2"
                >
                  <DollarSign size={16} />
                  Registrar pago
                </button>
                <button
                  onClick={() => setModalInstitucion(null)}
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DISPUTA ==================== */}
      {modalDisputa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Disputa: "{modalDisputa.nombre_disputado}"</h2>
              <button onClick={() => setModalDisputa(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getEstadoDisputaColor(modalDisputa.estado)}`}>
                    {modalDisputa.estado}
                  </span>
                  <span className="text-slate-500 text-sm">
                    Creada: {formatDate(modalDisputa.created_at)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm">Reclamante</p>
                    <p className="text-white">{modalDisputa.reclamante_nombre}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Email</p>
                    <a href={`mailto:${modalDisputa.reclamante_email}`} className="text-violet-400 hover:underline">
                      {modalDisputa.reclamante_email}
                    </a>
                  </div>
                  {modalDisputa.reclamante_telefono && (
                    <div>
                      <p className="text-slate-500 text-sm">Teléfono</p>
                      <p className="text-white">{modalDisputa.reclamante_telefono}</p>
                    </div>
                  )}
                  {modalDisputa.reclamante_documento && (
                    <div>
                      <p className="text-slate-500 text-sm">Documento</p>
                      <p className="text-white">{modalDisputa.reclamante_documento}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-slate-500 text-sm mb-2">Justificación</p>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-slate-300 text-sm">
                    {modalDisputa.justificacion}
                  </div>
                </div>

                {isSuperOwner && modalDisputa.estado !== 'aprobada' && modalDisputa.estado !== 'rechazada' && (
                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <h3 className="text-white font-medium mb-4">Resolver disputa</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Resolución</label>
                        <select
                          value={resolucionDisputa.estado}
                          onChange={(e) => setResolucionDisputa({...resolucionDisputa, estado: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                          <option value="rechazada">Rechazar - El nombre queda con el actual dueño</option>
                          <option value="aprobada">Aprobar - El reclamante tiene derecho al nombre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Notas de resolución</label>
                        <textarea
                          value={resolucionDisputa.notas}
                          onChange={(e) => setResolucionDisputa({...resolucionDisputa, notas: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-24"
                          placeholder="Explica la razón de la decisión..."
                        />
                      </div>
                      <button
                        onClick={handleResolverDisputa}
                        disabled={resolviendoDisputa}
                        className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 ${
                          resolucionDisputa.estado === 'aprobada' 
                            ? 'bg-emerald-600 hover:bg-emerald-500' 
                            : 'bg-red-600 hover:bg-red-500'
                        } text-white disabled:opacity-50`}
                      >
                        {resolviendoDisputa ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : resolucionDisputa.estado === 'aprobada' ? (
                          <Check size={18} />
                        ) : (
                          <XCircle size={18} />
                        )}
                        {resolucionDisputa.estado === 'aprobada' ? 'Aprobar disputa' : 'Rechazar disputa'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <button
                  onClick={() => setModalDisputa(null)}
                  className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
