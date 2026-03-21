import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { ModalFormulario } from '../components/FormularioEditor'
import * as store from '../lib/store'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { ESTADOS, CARRERAS, MEDIOS, TIPOS_ALUMNO } from '../data/mockData'
import ReportesView from '../components/ReportesView'
import FormulariosView from '../components/FormulariosView'
import UsuariosView from '../components/UsuariosView'
import ConfiguracionView from '../components/ConfiguracionView'
import ProgramasView from '../components/ProgramasView'
import ImportarView from '../components/ImportarView'
import GoogleSheetsView from '../components/IntegracionGoogleSheets'
import ImportacionesSheetsView from '../components/ImportacionesSheetsView'
import DashboardView from '../components/DashboardView'
import ConsultasView from '../components/ConsultasView'
import HistorialView from '../components/HistorialView'
import DetalleView from '../components/DetalleView'
import ModalNuevaConsulta from '../components/ModalNuevaConsulta'
import PieChart from '../components/PieChart'
import { getSyncStatus } from '../lib/storeSync'


export default function Dashboard() {
  const { user, institucion, signOut, isKeyMaster, isRector, isEncargado, isAsistente, canViewAll, canEdit, canConfig, canCreateLeads, canReasignar, reloadFromSupabase, planInfo, actualizarUso, puedeCrearLead, puedeCrearUsuario, puedeCrearFormulario, inviteUser, notifyAssignment, resendVerification } = useAuth()

  // 1. ESTADOS BÁSICOS
  const nombreInstitucion = institucion?.nombre || user?.institucion_nombre || store.getConfig()?.nombre || 'Mi Institución'
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(isRector ? 'reportes' : 'dashboard')
  const [viewMode, setViewMode] = useState('kanban')
  const [consultas, setConsultas] = useState([])
  const [selectedConsulta, setSelectedConsulta] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showFormEditor, setShowFormEditor] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showLeadsHoyModal, setShowLeadsHoyModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(null)
  const [filterCarrera, setFilterCarrera] = useState('todas')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterTipoAlumno, setFilterTipoAlumno] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [metricas, setMetricas] = useState(null)
  const [metricasGlobales, setMetricasGlobales] = useState(null)
  const [leadsHoy, setLeadsHoy] = useState([])
  const [formularios, setFormularios] = useState([])
  const [embedCode, setEmbedCode] = useState('')
  const [notification, setNotification] = useState(null)
  const [limiteAlerta, setLimiteAlerta] = useState(null)
  const [importacionesPendientes, setImportacionesPendientes] = useState(0)
  const [selectedLeads, setSelectedLeads] = useState([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [syncStatus, setSyncStatus] = useState('synced')
  const [showErrorBanner, setShowErrorBanner] = useState(false)

  // 2. REFS
  const lastHeartbeatRef = useRef(Date.now())
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 10
  const channelRef = useRef(null)
  const selectedConsultaRef = useRef(null)
  const safeLeadsHoy = leadsHoy || []

  // Sincronizar Ref
  useEffect(() => {
    selectedConsultaRef.current = selectedConsulta
  }, [selectedConsulta])

  // ============================================
  // 3. FUNCIONES DE CARGA Y CONEXIÓN (Blindaje Atómico)
  // ============================================

  const loadData = useCallback(() => {
    console.log('📊 loadData() - Rol:', user?.rol_id, 'isRector:', isRector)
    if (!store.getConsultas || typeof store.getConsultas !== 'function') return

    let data
    if (isRector) {
      data = store.getConsultasParaReportes() || []
    } else {
      data = store.getConsultas(user?.id, user?.rol_id) || []
    }

    setConsultas(data || [])

    if (isEncargado && user?.id) {
      setMetricas(store.getMetricasEncargado(user.id))
      setLeadsHoy(store.getLeadsContactarHoy(user.id, user.rol_id) || [])
    } else if (isKeyMaster || isRector) {
      setLeadsHoy(store.getLeadsContactarHoy() || [])
    }
    setMetricasGlobales(store.getMetricasGlobales())
    setFormularios(store.getFormularios() || [])

    if (selectedConsultaRef.current) {
      const updated = store.getConsultaById(selectedConsultaRef.current.id)
      if (updated) setSelectedConsulta(updated)
    }
  }, [user?.id, user?.rol_id, isRector, isEncargado, isKeyMaster])

  const setupRealtime = useCallback(() => {
    if (!isSupabaseConfigured() || !user?.institucion_id) return
    
    // Evitar acumulaciones de canales
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channelName = 'admitio-leads-realtime'
    let isActive = true // Flag para evitar que desconexiones intencionales lancen reconexiones zombis

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `institucion_id=eq.${user.institucion_id}` }, (payload) => {
        if (!isActive) return
        store.applyRealtimeUpdate(payload)
        loadData()
        setLastUpdate(new Date())
        lastHeartbeatRef.current = Date.now()
      })
      .on('broadcast', { event: 'heartbeat' }, () => {
        if (!isActive) return
        lastHeartbeatRef.current = Date.now()
      })
      .subscribe((status) => {
        if (!isActive) return
        setSyncStatus(status === 'SUBSCRIBED' ? 'synced' : 'error')
        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0
        } else if (['TIMED_OUT', 'CHANNEL_ERROR', 'CLOSED'].includes(status) && retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          setTimeout(() => { if (isActive) setupRealtime() }, 5000)
        }
      })

    channelRef.current = {
      channel,
      cleanup: () => {
        isActive = false
        supabase.removeChannel(channel)
      }
    }
    window._admitioChannel = channel
  }, [user?.institucion_id, loadData])

  // ============================================
  // 4. HANDLERS DE ACCIÓN
  // ============================================

  const handleRefreshData = async () => {
    if (!user?.institucion_id) return
    console.log('🔄 Actualizando datos manualmente...')
    try {
      await reloadFromSupabase()
      loadData()
      setLastUpdate(new Date())
      setNotification({ type: 'success', message: 'Datos traídos de la nube' })
      setTimeout(() => setNotification(null), 3000)
    } catch (e) { console.error('Error actualizando:', e) }
  }

  const handleUpdateEstado = async (id, nuevoEstado) => {
    setNotification({ type: 'info', message: 'Actualizando estado...' })
    try {
      const res = await store.updateConsultaAsync(id, { estado: nuevoEstado }, user.id)
      if (res?.success) {
        loadData(); if (selectedConsulta?.id === id) setSelectedConsulta(store.getConsultaById(id))
        setNotification({ type: 'success', message: `Estado cambiado a "${nuevoEstado}"` })
      } else {
        setNotification({ type: 'error', message: res?.error || 'Error al cambiar estado' })
      }
    } catch (e) {
      console.error('Error cambiando estado:', e)
      store.updateConsulta(id, { estado: nuevoEstado }, user.id); loadData()
      if (selectedConsulta?.id === id) setSelectedConsulta(store.getConsultaById(id))
      setNotification({ type: 'warning', message: 'Estado cambiado (sin confirmar servidor)' })
    }
    setTimeout(() => setNotification(null), 3000)
  }

  const handleReasignar = useCallback(async (id, nuevoEncargado) => {
    const encargado = store.getUsuarios().find(u => u.id === nuevoEncargado)
    store.updateConsulta(id, { asignado_a: nuevoEncargado }, user.id)
    if (selectedConsulta?.id === id) setSelectedConsulta(store.getConsultaById(id))
    
    if (nuevoEncargado && encargado?.email) {
      const lead = store.getConsultaById(id)
      try {
        await notifyAssignment({
          encargadoId: nuevoEncargado,
          encargadoEmail: encargado.email,
          encargadoNombre: encargado.nombre,
          lead: { id: lead.id, nombre: lead.nombre, carrera: lead.carrera?.nombre || 'Sin carrera' },
          isBulk: false,
          institucionNombre: nombreInstitucion
        })
      } catch (e) { console.error(e) }
    }
    loadData()
    setNotification({ type: 'success', message: `Asignado a ${encargado?.nombre}` })
    setTimeout(() => setNotification(null), 3000)
  }, [user?.id, nombreInstitucion, notifyAssignment, loadData, selectedConsulta?.id])

  const handleBulkAssign = async (encargadoId) => {
    if (!encargadoId || selectedLeads.length === 0) return
    const encargado = store.getUsuarios().find(u => u.id === encargadoId)
    selectedLeads.forEach(id => store.updateConsulta(id, { asignado_a: encargadoId }, user.id))
    
    if (encargado?.email) {
      try {
        await notifyAssignment({ encargadoId, encargadoEmail: encargado.email, encargadoNombre: encargado.nombre, leadsCount: selectedLeads.length, isBulk: true, institucionNombre: nombreInstitucion })
      } catch (e) { console.error(e) }
    }
    setSelectedLeads([]); loadData()
    setNotification({ type: 'success', message: 'Asignación masiva exitosa' })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleTipoAlumnoChange = useCallback((id, tipo) => {
    store.updateConsulta(id, { tipo_alumno: tipo }, user.id)
    if (selectedConsulta?.id === id) setSelectedConsulta(store.getConsultaById(id))
    loadData()
  }, [user?.id, loadData, selectedConsulta?.id])

  const handleNuevoLead = () => {
    if (!puedeCrearLead || !puedeCrearLead()) {
      setLimiteAlerta({
        tipo: 'leads',
        mensaje: `Has alcanzado el límite de ${planInfo?.limites?.max_leads || 10} leads de tu plan ${planInfo?.nombre || 'actual'}. Actualiza tu plan para agregar más leads.`
      })
      return
    }
    setShowModal(true)
  }

  const handleEnviarEmail = (id) => {
    const c = store.getConsultaById(id)
    if (c.emails_enviados >= 2) { alert('Máximo de 2 emails alcanzado'); return }
    store.updateConsulta(id, { emails_enviados: c.emails_enviados + 1 }, user.id)
    loadData(); if (selectedConsulta?.id === id) setSelectedConsulta(store.getConsultaById(id))
  }

  const handleLogout = () => { signOut(); navigate('/login') }
  const selectConsulta = useCallback((id) => { 
    setSelectedConsulta(store.getConsultaById(id)); setActiveTab('detalle')
  }, [])
  const navigateToEstado = (estado) => { setFilterEstado(estado); setActiveTab('consultas'); setSelectedConsulta(null) }
  const navigateToMatriculados = () => { setFilterEstado('matriculado'); setActiveTab('consultas'); setSelectedConsulta(null) }

  // ============================================
  // 5. UTILIDADES Y ESTADO DERIVADO
  // ============================================

  const formatearTiempoRespuesta = (horas) => {
    if (horas == null || isNaN(horas)) return { valor: '-', unidad: '', color: 'text-slate-400' }
    const mTotal = horas * 60
    let color = horas < 4 ? 'text-emerald-600' : horas < 8 ? 'text-amber-500' : 'text-red-600'
    if (mTotal < 60) return { valor: Math.round(mTotal), unidad: 'min', color, texto: `${Math.round(mTotal)} min` }
    if (horas < 24) return { valor: horas.toFixed(1), unidad: 'hrs', color, texto: `${Math.floor(horas)}h ${Math.round((horas % 1) * 60)}m` }
    return { valor: (horas / 24).toFixed(1), unidad: 'días', color, texto: `${(horas / 24).toFixed(1)} días` }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
  const formatDateShort = (d) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '-'

  const filteredConsultas = useMemo(() => {
    return (consultas || []).filter(c => {
      const matchCarrera = filterCarrera === 'todas' || c.carrera?.nombre === filterCarrera
      let matchEstado = filterEstado === 'todos' || (filterEstado === 'matriculado' ? c.matriculado : filterEstado === 'descartado' ? c.descartado : (c.estado === filterEstado && !c.matriculado && !c.descartado))
      const matchTipo = filterTipoAlumno === 'todos' || c.tipo_alumno === filterTipoAlumno
      const s = searchTerm.toLowerCase()
      const matchSearch = (c.nombre || '').toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s) || (c.telefono || '').toLowerCase().includes(s)
      return matchCarrera && matchEstado && matchTipo && matchSearch
    })
  }, [consultas, filterCarrera, filterEstado, filterTipoAlumno, searchTerm])

  const cargarImportacionesPendientes = useCallback(async () => {
    if (planInfo?.plan !== 'enterprise') return
    try {
      const { count } = await supabase.from('leads_importados').select('*', { count: 'exact', head: true }).eq('institucion_id', user?.institucion_id).eq('estado', 'pendiente')
      setImportacionesPendientes(count || 0)
    } catch (e) { console.error('Error cargando importaciones pendientes:', e) }
  }, [user?.institucion_id, planInfo?.plan])

  // ============================================
  // 6. CAPA DE EFECTOS (Side Effects)
  // ============================================

  useEffect(() => {
    if (typeof window !== 'undefined') window._supabase = supabase
    if (user?.institucion_id) setupRealtime()
    
    return () => { 
      if (channelRef.current && channelRef.current.cleanup) {
        channelRef.current.cleanup()
        channelRef.current = null
      }
      window._admitioChannel = null 
    }
  }, [user?.institucion_id, setupRealtime])

  useEffect(() => {
    let t; if (syncStatus === 'error') t = setTimeout(() => setShowErrorBanner(true), 3000); else { setShowErrorBanner(false); if (t) clearTimeout(t) }
    return () => t && clearTimeout(t)
  }, [syncStatus])

  useEffect(() => {
    const handleOnline = () => { setSyncStatus('loading'); loadData(); if (window._admitioChannel) supabase.removeChannel(window._admitioChannel); setupRealtime() }
    const handleOffline = () => setSyncStatus('error')
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [loadData, setupRealtime])

  useEffect(() => {
    if (syncStatus !== 'synced') return
    // Intervalo de latido: 15s
    const interval = setInterval(() => {
      if (window._admitioChannel) {
        window._admitioChannel.send({ type: 'broadcast', event: 'heartbeat', payload: { t: Date.now() } })
      }
      
      const tiempoSinLatido = Date.now() - lastHeartbeatRef.current;
      if (tiempoSinLatido > 40000) { 
        console.warn('💓 [Heartbeat] Latido perdido (40s). Forzando reconexión...');
        lastHeartbeatRef.current = Date.now(); // Mentir temporalmente para que el intervalo no dispare repetidamente
        retryCountRef.current = 0; 
        setSyncStatus('error');
        setupRealtime();
      }
    }, 15000)
    
    // Recuperación silenciosa al volver a la pestaña
    const handleVis = () => { 
      if (document.visibilityState === 'visible') {
        const tiempoInactivo = Date.now() - lastHeartbeatRef.current;
        if (tiempoInactivo > 60000) {
          console.log('👁️ [Visibility] Tab regresó tras estar inactiva mucho tiempo. Re-conectando...');
          retryCountRef.current = 0
          lastHeartbeatRef.current = Date.now()
          setSyncStatus('loading')
          loadData()
          setupRealtime()
        }
      }
    }
    
    window.addEventListener('visibilitychange', handleVis)
    return () => { clearInterval(interval); window.removeEventListener('visibilitychange', handleVis) }
  }, [syncStatus, loadData, setupRealtime])

  useEffect(() => {
    const upd = () => loadData()
    window.addEventListener('admitio-store-updated', upd); window.addEventListener('admitio-data-loaded', upd)
    return () => { window.removeEventListener('admitio-store-updated', upd); window.removeEventListener('admitio-data-loaded', upd) }
  }, [loadData])

  // ELIMINADO: Polling agresivo de 15s hacia supabase.auth.getUser()
  // Motivo: Esto causaba el error "Lock broken by another request with the steal option"
  // y re-montaba componentes prematuramente en pestañas múltiples. El auto-refresh
  // de Supabase en auth.js (persistSession: true, autoRefreshToken: true) ya cubre
  // la persistencia segura.

  useEffect(() => {
    if (planInfo?.plan === 'enterprise' && user?.institucion_id) {
      cargarImportacionesPendientes()
      const c = supabase.channel('import-ch').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads_importados', filter: `institucion_id=eq.${user.institucion_id}` }, () => cargarImportacionesPendientes()).subscribe()
      return () => supabase.removeChannel(c)
    }
  }, [user?.institucion_id, planInfo?.plan, cargarImportacionesPendientes])

  useEffect(() => {
    loadData()
    const hs = (e) => setSyncStatus(e.detail.status)
    window.addEventListener('admitio-sync-status', hs)
    const t = setTimeout(() => loadData(), 500)
    return () => { window.removeEventListener('admitio-sync-status', hs); clearTimeout(t) }
  }, [user, loadData])


  // ============================================
  // 7. COMPONENTES INTERNOS
  // ============================================

  const Sidebar = () => {
    // Restringir pestañas de configuración estricta solo a Admins
    const esAdmin = ['superowner', 'keymaster', 'superadmin'].includes(user?.rol_id)
    const esRector = isRector || user?.rol_id === 'rector'
    const esEncargado = isEncargado || user?.rol_id === 'encargado'

    const navItems = [
      { id: 'dashboard', icon: 'Home', label: 'Dashboard', show: !esRector },
      { id: 'consultas', icon: 'Users', label: 'Consultas', show: !esRector, badge: (consultas || []).filter(c => c.estado === 'nueva').length },
      { id: 'historial', icon: 'Archive', label: 'Historial', show: !esRector },
      { id: 'reportes', icon: 'BarChart', label: esRector ? 'Dashboard' : 'Reportes', show: esAdmin || esRector || esEncargado },
      { id: 'formularios', icon: 'FileCode', label: 'Formularios', show: esAdmin },
      { id: 'usuarios', icon: 'User', label: 'Usuarios', show: esAdmin },
      { id: 'programas', icon: 'GraduationCap', label: 'Carreras/Cursos', show: esAdmin },
      { id: 'importar', icon: 'Upload', label: 'Importar', show: esAdmin },
      { id: 'importaciones_sheets', icon: 'Table', label: 'Google Sheets', show: esAdmin && planInfo?.plan === 'enterprise', badge: importacionesPendientes },
      { id: 'configuracion', icon: 'Settings', label: 'Configuración', show: esAdmin },
    ]

    const handleNavClick = (tabId) => {
      setActiveTab(tabId)
      setSelectedConsulta(null)
      if (tabId === 'dashboard') setFilterEstado('todos')
      setMobileMenuOpen(false) // Cerrar en mobile
    }

    // ============================================
    // INDICADOR DE ESTADO DE SINCRONIZACIÓN (DENTRO DE SIDEBAR)
    // ============================================
    const SyncStatusIndicator = ({ isMobile = false }) => {
      const syncStatusInfo = getSyncStatus() || {};
      const isActuallySyncing = syncStatus === 'syncing' || syncStatusInfo.isSyncing || syncStatusInfo.pendingTasks > 0;
      
      let icon = "CloudCheck";
      let color = "text-emerald-500";
      let label = "Sincronizado";
      let pulse = "";

      // Prioridad 1: Error de conexión o de red
      if (syncStatus === 'error' || !navigator.onLine) {
        icon = "CloudOff";
        color = "text-red-500 font-bold";
        label = "DESCONECTADO";
      } 
      // Prioridad 2: Guardando cambios
      else if (isActuallySyncing) {
        icon = "RefreshCw";
        color = "text-amber-500";
        label = "Sincronizando...";
        pulse = "animate-spin";
      }
      // Prioridad 3: Reposo (Sincronizado)
      else if (syncStatus === 'synced') {
        icon = "CloudCheck";
        color = "text-emerald-500";
        const time = syncStatusInfo.lastSync ? new Date(syncStatusInfo.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        label = `Sincronizado ${time}`;
      }
      else {
        icon = "Cloud";
        color = "text-slate-400";
        label = "Conectando...";
      }

      return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 ${sidebarCollapsed && !isMobile ? 'justify-center mx-auto' : ''}`} title={label}>
          <Icon name={icon} size={isMobile ? 18 : (sidebarCollapsed ? 20 : 16)} className={`${color} ${pulse}`} />
          {(!sidebarCollapsed || isMobile) && <span className={`text-[10px] uppercase tracking-wider font-bold ${color}`}>{label}</span>}
        </div>
      );
    };
    return (
      <>
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed left-0 top-0 h-full bg-white border-r border-slate-100 flex flex-col z-50
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header con logo */}
          <div className="p-4 flex flex-col gap-2">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} mb-2`}>
              <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{nombreInstitucion.charAt(0).toUpperCase()}</span>
                </div>
                {!sidebarCollapsed && (
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-800">{nombreInstitucion}</p>
                    <p className="text-xs text-slate-400">Sistema de Admisión</p>
                  </div>
                )}
              </div>

              {/* Botón cerrar - solo mobile */}
              {!sidebarCollapsed && (
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  title="Cerrar menú"
                >
                  <Icon name="X" size={20} />
                </button>
              )}
            </div>

            <SyncStatusIndicator />

            {/* Botón colapsar - solo desktop - VISIBLE */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`
                hidden lg:flex w-full items-center justify-center gap-2 p-3 rounded-xl mb-4 transition-all font-medium mt-2
                ${sidebarCollapsed
                  ? 'bg-violet-700 text-white hover:bg-violet-800'
                  : 'bg-violet-100 text-violet-700 hover:bg-violet-200 border-2 border-violet-300'}
              `}
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <Icon name={sidebarCollapsed ? 'ChevronRight' : 'ChevronLeft'} size={20} />
              {!sidebarCollapsed && <span className="text-sm">Colapsar</span>}
            </button>

            {/* Navegación */}
            <nav className="space-y-1">
              {navItems.filter(item => item.show).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${sidebarCollapsed ? 'justify-center' : ''}
                    ${activeTab === item.id || (item.id === 'consultas' && activeTab === 'detalle')
                      ? 'bg-violet-50 text-violet-600'
                      : 'text-slate-600 hover:bg-slate-50'}
                  `}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon name={item.icon} size={20} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {sidebarCollapsed && item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Stats rápidos - solo expandido */}
          {!isRector && metricas && !sidebarCollapsed && (
            <div className="mt-auto p-4">
              <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl">
                <p className="text-sm text-slate-600 mb-2">Mi rendimiento</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Asignados</span>
                    <span className="font-bold">{metricas.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Matriculados</span>
                    <span className="font-bold text-emerald-600">{metricas.matriculados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Conversión</span>
                    <span className="font-bold text-violet-600">{metricas.tasaConversion}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User info */}
          <div className="p-4 border-t border-slate-100">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-slate-600 font-medium">{user?.nombre?.charAt(0)}</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{user?.nombre}</p>
                  <p className="text-xs text-slate-400">{user?.rol?.nombre}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className={`p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg ${sidebarCollapsed ? 'mt-2' : ''}`}
                title="Cerrar sesión"
              >
                <Icon name="LogOut" size={18} />
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const MobileHeader = () => {
    // Definir localmente o pasar por prop si fuera necesario, 
    // pero para simplicidad lo definimos igual que en Sidebar
    const SyncStatusIndicatorLocal = ({ isMobile = true }) => {
      const syncStatusInfo = getSyncStatus() || {};
      const isActuallySyncing = syncStatus === 'syncing' || syncStatusInfo.isSyncing || syncStatusInfo.pendingTasks > 0;
      
      let icon = "CloudCheck";
      let color = "text-emerald-500";
      let label = "Sincronizado";
      let pulse = "";

      // Prioridad 1: Error de conexión o de red
      if (syncStatus === 'error' || !navigator.onLine) {
        icon = "CloudOff";
        color = "text-red-500 font-bold";
        label = "DESCONECTADO";
      } 
      // Prioridad 2: Guardando cambios
      else if (isActuallySyncing) {
        icon = "RefreshCw";
        color = "text-amber-500";
        label = "Sincronizando...";
        pulse = "animate-spin";
      }
      // Prioridad 3: Reposo (Sincronizado)
      else if (syncStatus === 'synced') {
        icon = "CloudCheck";
        color = "text-emerald-500";
        const time = syncStatusInfo.lastSync ? new Date(syncStatusInfo.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        label = `Sincronizado ${time}`;
      }
      else {
        icon = "Cloud";
        color = "text-slate-400";
        label = "Conectando...";
      }

      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100" title={label}>
          <Icon name={icon} size={18} className={`${color} ${pulse}`} />
          <span className={`text-[10px] uppercase tracking-wider font-bold ${color}`}>{label}</span>
        </div>
      );
    };

    return (
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-sm"
          >
            <Icon name="Menu" size={24} />
          </button>
          <SyncStatusIndicatorLocal isMobile={true} />
        </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">{nombreInstitucion.charAt(0).toUpperCase()}</span>
        </div>
        <span className="font-bold text-slate-800 text-sm truncate max-w-[100px]">{nombreInstitucion}</span>
      </div>

      <button
        onClick={handleNuevoLead}
        className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg"
      >
        <Icon name="Plus" size={24} />
      </button>
    </div>
  )
}


  // Vista especial para Asistente (solo crear leads)
  if (isAsistente) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const leadsHoyAsistente = (store.getConsultas() || []).filter(c => {
      const creado = new Date(c.created_at)
      return creado >= hoy
    }).length

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
                <Icon name="UserPlus" className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Ingresar Nueva Consulta</h1>
              <p className="text-slate-500 mt-1">Hola, {user?.nombre?.split(' ')[0]}</p>
            </div>

            <div className="bg-violet-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-violet-600">Leads ingresados hoy</p>
                  <p className="text-2xl font-bold text-violet-700">{leadsHoyAsistente}</p>
                </div>
                <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                  <Icon name="TrendingUp" className="text-violet-600" size={24} />
                </div>
              </div>
            </div>

            <button
              onClick={handleNuevoLead}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-3"
            >
              <Icon name="Plus" size={24} />
              Nueva Consulta
            </button>

            <button
              onClick={() => signOut()}
              className="w-full mt-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="LogOut" size={20} />
              Cerrar Sesión
            </button>
          </div>
        </div>

        <ModalNuevaConsulta
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreated={(newLead) => {
            setShowModal(false)
            setNotification({
              type: 'success',
              message: `¡Lead registrado! Asignado a ${newLead?.encargado?.nombre || 'automáticamente'}`
            })
            setTimeout(() => setNotification(null), 4000)
          }}
          isKeyMaster={false}
          userId={user?.id}
          userRol={user?.rol_id}
        />

        {notification && (
          <div className="fixed bottom-4 right-4 z-50 animate-bounce">
            <div className="px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 bg-emerald-600 text-white border border-emerald-400">
              <Icon name="CheckCircle" size={24} />
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <MobileHeader />

      {/* BANNER DE HONESTIDAD BRUTAL: Solo visible si hay problemas de conexión real persistentes */}
      {showErrorBanner && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
                <Icon name="ShieldAlert" size={20} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-sm block">CONEXIÓN INESTABLE - REINTENTANDO...</span>
                <span className="text-[11px] opacity-80 underline">Las ediciones están bloqueadas por seguridad hasta restablecer el latido.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                   console.log('🔌 [Manual] Iniciando reconexión forzada...');
                   retryCountRef.current = 0 // RESETEAR CONTADOR DE REINTENTOS
                   setLastHeartbeat(Date.now()) // Dar 45s de gracia inmediatos
                   setSyncStatus('loading')
                   loadData()
                   setupRealtime()
                }}
                className="px-3 py-1 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors whitespace-nowrap"
              >
                RECONECTAR AHORA
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pt-16 lg:pt-0`}>
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              isKeyMaster={isKeyMaster}
              metricas={metricas}
              metricasGlobales={metricasGlobales}
              consultas={consultas}
              handleRefreshData={handleRefreshData}
              navigateToEstado={navigateToEstado}
              setFilterEstado={setFilterEstado}
              setActiveTab={setActiveTab}
              safeLeadsHoy={safeLeadsHoy}
              navigateToMatriculados={navigateToMatriculados}
              setShowLeadsHoyModal={setShowLeadsHoyModal}
              formatearTiempoRespuesta={formatearTiempoRespuesta}
              selectConsulta={selectConsulta}
              filteredConsultas={filteredConsultas}
              handleNuevoLead={handleNuevoLead}
              canEdit={canEdit && syncStatus === 'synced'}
            />
          )}

          {activeTab === 'consultas' && (
            <ConsultasView
              isKeyMaster={isKeyMaster}
              canEdit={canEdit}
              handleNuevoLead={handleNuevoLead}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterCarrera={filterCarrera}
              setFilterCarrera={setFilterCarrera}
              filterEstado={filterEstado}
              setFilterEstado={setFilterEstado}
              filterTipoAlumno={filterTipoAlumno}
              setFilterTipoAlumno={setFilterTipoAlumno}
              viewMode={viewMode}
              setViewMode={setViewMode}
              filteredConsultas={filteredConsultas}
              selectConsulta={selectConsulta}
              selectedLeads={selectedLeads}
              setSelectedLeads={setSelectedLeads}
              formatDateShort={formatDateShort}
            />
          )}

          {activeTab === 'historial' && (
            <HistorialView
              consultas={consultas}
              isKeyMaster={isKeyMaster}
              selectConsulta={selectConsulta}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'detalle' && (
            <DetalleView
              selectedConsulta={selectedConsulta}
              setSelectedConsulta={setSelectedConsulta}
              setActiveTab={setActiveTab}
              user={user}
              loadData={loadData}
              setNotification={setNotification}
              handleEstadoChange={handleUpdateEstado}
              handleTipoAlumnoChange={handleTipoAlumnoChange}
              handleReasignar={handleReasignar}
              handleEnviarEmail={handleEnviarEmail}
              formatDateShort={formatDateShort}
              isKeyMaster={isKeyMaster}
              isSynced={syncStatus === 'synced'}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesView
              isRector={isRector}
              isKeyMaster={isKeyMaster}
              user={user}
              consultas={consultas}
              nombreInstitucion={nombreInstitucion}
              reloadFromSupabase={reloadFromSupabase}
              loadData={loadData}
              handleRefreshData={handleRefreshData}
              setNotification={setNotification}
              formatearTiempoRespuesta={formatearTiempoRespuesta}
            />
          )}

          {activeTab === 'formularios' && (
            <FormulariosView
              formularios={formularios}
              reloadFromSupabase={reloadFromSupabase}
              loadData={loadData}
              setNotification={setNotification}
              puedeCrearFormulario={puedeCrearFormulario}
              planInfo={planInfo}
              setLimiteAlerta={setLimiteAlerta}
              user={user}
            />
          )}

          {activeTab === 'usuarios' && (
            <UsuariosView
              user={user}
              reloadFromSupabase={reloadFromSupabase}
              setNotification={setNotification}
              puedeCrearUsuario={puedeCrearUsuario}
              planInfo={planInfo}
              setLimiteAlerta={setLimiteAlerta}
            />
          )}

          {activeTab === 'programas' && (
            <ProgramasView
              user={user}
              consultas={consultas}
              loadData={loadData}
              setNotification={setNotification}
            />
          )}

          {activeTab === 'importar' && (
            <ImportarView
              user={user}
              loadData={loadData}
              setNotification={setNotification}
            />
          )}

          {activeTab === 'importaciones_sheets' && (
            <ImportacionesSheetsView
              user={user}
              loadData={loadData}
              setNotification={setNotification}
            />
          )}

          {activeTab === 'configuracion' && (
            <ConfiguracionView
              user={user}
              institucion={institucion}
              planInfo={planInfo}
              canConfig={canConfig}
              loadData={loadData}
              setNotification={setNotification}
            />
          )}
        </div>
      </main>

      {/* Barra de Acciones Masivas */}
      {selectedLeads.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-[60] bulk-actions-animate">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
            <span className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedLeads.length}
            </span>
            <span className="font-medium">leads seleccionados</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Asignar a:</span>
            <select
              className="bg-slate-800 border-none rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-violet-500 outline-none"
              onChange={(e) => handleBulkAssign(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Seleccionar encargado...</option>
              {store.getUsuarios().filter(u => ['encargado', 'keymaster', 'director'].includes(u.rol_id)).map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSelectedLeads([])}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
      )}

      {/* Modal nueva consulta */}
      <ModalNuevaConsulta
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => loadData()}
        isKeyMaster={isKeyMaster}
        userId={user?.id}
        userRol={user?.rol_id}
      />

      {/* Modal Leads a Contactar Hoy */}
      {showLeadsHoyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLeadsHoyModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Icon name="Phone" className="text-cyan-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Para Contactar Hoy</h3>
                    <p className="text-slate-500 text-sm">{safeLeadsHoy.length} lead{safeLeadsHoy.length !== 1 ? 's' : ''} requiere{safeLeadsHoy.length === 1 ? '' : 'n'} tu atención</p>
                  </div>
                </div>
                <button onClick={() => setShowLeadsHoyModal(false)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {safeLeadsHoy.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="CheckCircle" className="text-emerald-600" size={32} />
                  </div>
                  <p className="text-slate-600 font-medium">¡Todo al día!</p>
                  <p className="text-slate-400 text-sm">No tienes leads pendientes de contactar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {safeLeadsHoy.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setShowLeadsHoyModal(false)
                        selectConsulta(c.id)
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${c.nuevoInteres ? 'bg-violet-50 border border-violet-200' :
                        c.atrasado ? 'bg-red-50 border border-red-200' :
                          'bg-slate-50 border border-slate-200'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${c.carrera?.color || 'bg-slate-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800">{c.nombre}</p>
                            </div>
                            <p className="text-sm text-slate-500">
                              {c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'} · {ESTADOS[c.estado]?.label || 'Nuevo'}
                            </p>
                          </div>
                        </div>
                        <Icon name="ChevronRight" size={20} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed ${notification.isBlocking ? 'inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4' : 'bottom-4 right-4 animate-bounce'} z-[200]`}>
          <div className={`${notification.isBlocking ? 'max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 border-t-4 border-red-500' : 'px-6 py-4 rounded-xl shadow-lg flex items-center gap-3'} ${
            notification.type === 'error' ? (notification.isBlocking ? 'bg-white' : 'bg-red-50 text-red-700') :
              notification.type === 'success' ? (notification.isBlocking ? 'bg-white' : 'bg-emerald-600 text-white') :
                'bg-blue-600 text-white'
            }`}>
            {notification.isBlocking ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="AlertCircle" size={40} className="text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Sesión Expirada</h3>
                <p className="text-slate-500 mb-8">{notification.message}</p>
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                >
                  <Icon name="LogOut" size={20} />
                  Cerrar sesión e ingresar de nuevo
                </button>
              </div>
            ) : (
              <>
                <Icon name={notification.type === 'success' ? 'CheckCircle' : notification.type === 'info' ? 'Info' : 'Bell'} size={24} />
                <p className="font-medium">{notification.message}</p>
                <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
                  <Icon name="X" size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
