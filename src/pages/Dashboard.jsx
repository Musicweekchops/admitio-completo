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

  // Nombre dinámico de la institución
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
  const [limiteAlerta, setLimiteAlerta] = useState(null) // { tipo: 'leads'|'usuarios'|'formularios', mensaje: '...' }
  const [importacionesPendientes, setImportacionesPendientes] = useState(0) // Para badge del menú
  const [selectedLeads, setSelectedLeads] = useState([]) // Para asignación masiva

  // Estados para sidebar responsive
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [syncStatus, setSyncStatus] = useState('synced') // 'syncing' | 'synced' | 'error'
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now())

  // Protecciones para arrays que pueden ser undefined durante la carga
  const safeLeadsHoy = leadsHoy || []

  // ============================================
  // FUNCIÓN PARA FORMATEAR TIEMPO PROGRESIVO
  // minutos → horas → días
  // ============================================
  const formatearTiempoRespuesta = (horas) => {
    if (horas === null || horas === undefined || isNaN(horas)) return { valor: '-', unidad: '', color: 'text-slate-400' }

    const minutos = horas * 60

    // Determinar color según tiempo (basado en horas)
    let color = 'text-emerald-600' // Bueno: < 4h
    if (horas > 4 && horas <= 8) color = 'text-amber-500' // Regular: 4-8h
    if (horas > 8 && horas <= 24) color = 'text-orange-500' // Malo: 8-24h
    if (horas > 24) color = 'text-red-600' // Muy malo: > 24h

    // Formato progresivo
    if (minutos < 60) {
      return {
        valor: Math.round(minutos),
        unidad: 'min',
        color,
        texto: `${Math.round(minutos)} min`
      }
    } else if (horas < 24) {
      const h = Math.floor(horas)
      const m = Math.round((horas - h) * 60)
      return {
        valor: horas.toFixed(1),
        unidad: 'hrs',
        color,
        texto: m > 0 ? `${h}h ${m}m` : `${h} hrs`
      }
    } else {
      const dias = horas / 24
      return {
        valor: dias.toFixed(1),
        unidad: 'días',
        color,
        texto: `${dias.toFixed(1)} días`
      }
    }
  }

  // ========== ACTUALIZACIÓN MANUAL + REALTIME ==========
  // Estilo Trello: Realtime para cambios, botón para forzar actualización

  // Función para actualizar manualmente
  const handleRefreshData = async () => {
    if (!isSupabaseConfigured() || !user?.institucion_id) return
    console.log('🔄 Actualizando datos manualmente...')
    try {
      await reloadFromSupabase()
      loadData()
      setLastUpdate(new Date())
      setNotification({ type: 'success', message: 'Datos traídos de la nube' })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error actualizando:', error)
    }
  }

  // Supabase Realtime - Solo escucha cambios, no hace polling
  const selectedConsultaRef = useRef(selectedConsulta)

  // Mantener ref actualizado
  useEffect(() => {
    selectedConsultaRef.current = selectedConsulta
  }, [selectedConsulta])

  useEffect(() => {
    // Exponer para consultas manuales en consola
    if (typeof window !== 'undefined') {
      window._supabase = supabase
    }

    if (!isSupabaseConfigured() || !user?.institucion_id) return

    let retryCount = 0;
    const MAX_RETRIES = 5;
    let channel = null;

    const setupRealtime = () => {
      if (!user?.institucion_id) return;

      // Limpiar canal previo si existe
      if (channel) {
        supabase.removeChannel(channel);
      }

      const channelName = `admitio-leads-realtime`
      console.log(`🔌 Conectando True Realtime: ${channelName} (Intento: ${retryCount + 1})`)

      channel = supabase
        .channel(channelName)
        .on('postgres_changes',
          {
            event: '*', 
            schema: 'public', 
            table: 'leads',
            filter: `institucion_id=eq.${user.institucion_id}`
          },
          (payload) => {
            console.log('📡 [True-RT] CAMBIO DETECTADO:', payload.eventType, payload.new?.id || payload.old?.id)
            
            // Inyectar actualización incremental directamente en el store
            store.applyRealtimeUpdate(payload)
            
            // Refrescar UI (loadData lee del store que ya está actualizado)
            loadData()
            setLastUpdate(new Date())
            setLastHeartbeat(Date.now()) // Cada mensaje real también cuenta como pulso
          }
        )
        .on('broadcast', { event: 'heartbeat' }, () => {
          setLastHeartbeat(Date.now())
          console.log('💓 [True-RT] Latido recibido')
        })
        .subscribe((status) => {
          console.log('📡 [rt-v4] Realtime status:', status)
          
          if (status === 'SUBSCRIBED') {
            setSyncStatus('synced')
            retryCount = 0; // Resetear contador al éxito
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn(`⚠️ [rt-v4] Canal desconectado (${status}).`)
            setSyncStatus('error')
            
            // Lógica de Re-intento Automático
            if (status !== 'CLOSED' || retryCount < MAX_RETRIES) {
              retryCount++;
              console.log(`🔄 [rt-v4] Re-intentando conexión en 5s... (${retryCount}/${MAX_RETRIES})`);
              setTimeout(setupRealtime, 5000);
            }
          }
        })

      // Guardar referencia al canal para usarlo en broadcasts
      window._admitioChannel = channel
    }

    setupRealtime();

    return () => {
      console.log('🔌 Desconectando Realtime...')
      if (channel) {
        supabase.removeChannel(channel)
      }
      window._admitioChannel = null
    }
  }, [user?.institucion_id])

  // Monitor de Latido (Heartbeat) - Detecta Conexiones Fantasma
  useEffect(() => {
    if (syncStatus !== 'synced') return

    const interval = setInterval(() => {
      const channel = window._admitioChannel
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { t: Date.now() }
        })
      }

      // Si no hay pulso por más de 40 segundos, marcar error y REINTENTAR
      if (Date.now() - lastHeartbeat > 40000) {
        console.warn('💔 [True-RT] Conexión Fantasma detectada (Sin latido). Reintentando forcivamentre...')
        setSyncStatus('error')
        // Forzar limpieza y reconexión
        if (window._admitioChannel) {
          supabase.removeChannel(window._admitioChannel)
        }
        setupRealtime()
      }
    }, 15000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        console.log('☀️ [True-RT] Pestaña enfocada. Verificando latido...')
        
        // Si no hay latido por más de 60 segundos, forzar reconexión y sync
        if (now - lastHeartbeat > 60000) {
          console.warn('⚡ [True-RT] Sistema despertando tras inactividad. Forzando reconexión...')
          setSyncStatus('loading')
          loadData() // Refrescar datos por HTTP por si acaso el websocket se perdió
          if (window._admitioChannel) {
            supabase.removeChannel(window._admitioChannel)
          }
          setupRealtime()
        }
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [syncStatus, lastHeartbeat])

  // Escuchar actualizaciones del store (desde storeSync y AuthContext)
  useEffect(() => {
    const handleStoreUpdate = () => {
      console.log('🔄 Reaccionando a actualización del store...')
      loadData()
    }

    window.addEventListener('admitio-store-updated', handleStoreUpdate)
    window.addEventListener('admitio-data-loaded', handleStoreUpdate)

    return () => {
      window.removeEventListener('admitio-store-updated', handleStoreUpdate)
      window.removeEventListener('admitio-data-loaded', handleStoreUpdate)
    }
  }, [user?.id])

  // Chequeo preventivo de sesión (cada 5 seg)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;

    const sessionCheck = setInterval(async () => {
      // Usar getUser() es más confiable que getSession() en tiempo real
      // ya que verifica más estrictamente el estado del cliente
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      // Si no hay usuario en Auth o hay error de autenticación (401/403)
      if (!authUser || error) {
        console.warn('⚠️ Sesión perdida detectada por el vigilante:', error?.message);
        setNotification({
          type: 'error',
          message: 'Tu sesión ha expirado. Por seguridad y para no perder tus cambios, por favor inicia sesión de nuevo.',
          isBlocking: true
        });
      }
    }, 5000); // 5 segundos

    return () => clearInterval(sessionCheck);
  }, [user?.id]);

  // Vigilante de conectividad (Navegador)
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada');
      setNotification({ type: 'success', message: 'Conexión restaurada' });
      setTimeout(() => setNotification(null), 3000);
      setSyncStatus('synced');
    };

    const handleOffline = () => {
      console.warn('🌐 Conexión de red perdida');
      setNotification({ 
        type: 'error', 
        message: 'Has perdido la conexión. Los cambios no se sincronizarán hasta volver a estar en línea.' 
      });
      setSyncStatus('error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Estado inicial
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  // ========================================

  // Cargar importaciones pendientes (solo Enterprise)
  const cargarImportacionesPendientes = async () => {
    if (planInfo?.plan !== 'enterprise') return

    try {
      const { count } = await supabase
        .from('leads_importados')
        .select('*', { count: 'exact', head: true })
        .eq('institucion_id', user?.institucion_id)
        .eq('estado', 'pendiente')

      setImportacionesPendientes(count || 0)
    } catch (e) {
      console.error('Error cargando importaciones pendientes:', e)
    }
  }

  useEffect(() => {
    if (planInfo?.plan === 'enterprise' && user?.institucion_id) {
      cargarImportacionesPendientes()

      // Suscribirse a cambios en leads_importados
      const channel = supabase
        .channel('importaciones-changes')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'leads_importados', filter: `institucion_id=eq.${user.institucion_id}` },
          (payload) => {
            console.log('📥 Nueva importación desde Sheets')
            cargarImportacionesPendientes()

            // Notificar solo si no hay throttling (la función SQL ya controla esto)
            if (payload.new && payload.new.conflicto_detalles?.notificar !== false) {
              setNotification({
                type: 'info',
                message: `Nuevo lead desde Sheets: ${payload.new.datos_raw?.nombre || 'Sin nombre'}`
              })
              setTimeout(() => setNotification(null), 4000)
            }
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
  }, [planInfo?.plan, user?.institucion_id])

  function loadData() {
    console.log('📊 loadData() - Rol:', user?.rol_id, 'isRector:', isRector)

    // Protección: verificar que el store esté listo
    const storeReady = store.getConsultas && typeof store.getConsultas === 'function'
    if (!storeReady) {
      console.warn('⚠️ loadData: store no está listo')
      return
    }

    // Para Rector: cargar TODOS los leads de la institución (para reportes)
    // Para otros roles: usar filtro normal
    let data
    if (isRector) {
      data = store.getConsultasParaReportes() || []
      console.log('📊 Rector - Leads cargados:', data?.length || 0)
      console.log('📊 Rector - Usuarios:', store.getTodosLosUsuarios()?.length || 0)
      console.log('📊 Rector - Encargados:', store.getEncargadosActivos()?.length || 0)
    } else {
      data = store.getConsultas(user?.id, user?.rol_id) || []
    }

    setConsultas(data || [])

    if (isEncargado && user?.id) {
      setMetricas(store.getMetricasEncargado(user.id))
      setLeadsHoy(store.getLeadsContactarHoy(user.id, user.rol_id) || [])
    } else if (isKeyMaster || isRector) {
      // Rector también ve los leads a contactar hoy (para tener contexto)
      setLeadsHoy(store.getLeadsContactarHoy() || [])
    }
    setMetricasGlobales(store.getMetricasGlobales())
    setFormularios(store.getFormularios() || [])

    // ✅ Actualizar consulta seleccionada para refrescar historial/acciones
    if (selectedConsulta) {
      const updated = store.getConsultaById(selectedConsulta.id)
      if (updated) {
        setSelectedConsulta(updated)
      }
    }
  }

  // Cargar datos inicial y escuchar eventos de datos cargados
  useEffect(() => {
    loadData()

    // Escuchar cuando el store se actualiza desde la nube
    // Escuchar actualizaciones del store (desde storeSync y AuthContext)
    const handleDataLoaded = () => {
      console.log('📡 Evento de datos recibido, actualizando vista...')
      loadData()
      setSyncStatus('synced') // Asegurar que el indicador vuelva a verde tras carga manual
    }

    // Escuchar estado de sincronización para el indicador visual
    const handleSyncStatus = (event) => {
      setSyncStatus(event.detail.status)
    }

    // Escuchar errores críticos (401/403) para bloquear UI y evitar pérdida de datos
    const handleSyncError = (event) => {
      const { detail } = event
      if (detail.status === 401 || detail.status === 403 || detail.error?.includes('Unauthorized')) {
        setNotification({
          type: 'error',
          message: 'Tu sesión ha expirado. Para proteger tus cambios, por favor inicia sesión de nuevo.',
          isBlocking: true
        })
      }
    }

    window.addEventListener('admitio-store-updated', handleDataLoaded)
    window.addEventListener('admitio-sync-status', handleSyncStatus)
    window.addEventListener('admitio-sync-error', handleSyncError)

    // Retry inicial para asegurar datos
    const timer = setTimeout(() => {
      loadData()
    }, 500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('admitio-store-updated', handleDataLoaded)
      window.removeEventListener('admitio-sync-status', handleSyncStatus)
      window.removeEventListener('admitio-sync-error', handleSyncError)
    }
  }, [user])

  // Helper para abrir modal de nuevo lead con validación de límite
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

  const filteredConsultas = (consultas || []).filter(c => {
    const matchCarrera = filterCarrera === 'todas' || c.carrera?.nombre === filterCarrera

    // Manejar estados especiales (matriculado/descartado)
    let matchEstado = false
    if (filterEstado === 'todos') {
      matchEstado = true
    } else if (filterEstado === 'matriculado') {
      matchEstado = c.matriculado === true
    } else if (filterEstado === 'descartado') {
      matchEstado = c.descartado === true
    } else {
      // Estados normales: solo si NO está matriculado ni descartado
      matchEstado = c.estado === filterEstado && !c.matriculado && !c.descartado
    }

    const matchTipo = filterTipoAlumno === 'todos' || c.tipo_alumno === filterTipoAlumno
    const searchLower = searchTerm.toLowerCase()
    const matchSearch = (c.nombre || '').toLowerCase().includes(searchLower) ||
      (c.email || '').toLowerCase().includes(searchLower) ||
      (c.telefono || '').toLowerCase().includes(searchLower)
    return matchCarrera && matchEstado && matchTipo && matchSearch
  })

  async function handleUpdateEstado(id, nuevoEstado) {
    // Mostrar feedback inmediato
    setNotification({ type: 'info', message: 'Actualizando estado...' })

    try {
      // Usar versión async que espera confirmación de Supabase
      const result = await store.updateConsultaAsync(id, { estado: nuevoEstado }, user.id)

      if (!result || !result.success) {
        setNotification({ type: 'error', message: result?.error || 'Error al cambiar estado' })
        setTimeout(() => setNotification(null), 4000)
        return
      }

      loadData()
      if (selectedConsulta?.id === id) {
        setSelectedConsulta(store.getConsultaById(id))
      }

      setNotification({ type: 'success', message: `Estado cambiado a "${nuevoEstado}"` })
      setTimeout(() => setNotification(null), 2000)
    } catch (error) {
      console.error('Error cambiando estado:', error)
      // Fallback: usar versión síncrona
      store.updateConsulta(id, { estado: nuevoEstado }, user.id)
      loadData()
      if (selectedConsulta?.id === id) {
        setSelectedConsulta(store.getConsultaById(id))
      }
      setNotification({ type: 'warning', message: 'Estado cambiado (sin confirmar servidor)' })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  function handleEnviarEmail(id) {
    const consulta = store.getConsultaById(id)
    if (consulta.emails_enviados >= 2) {
      alert('Máximo de 2 emails alcanzado')
      return
    }
    store.updateConsulta(id, { emails_enviados: consulta.emails_enviados + 1 }, user.id)
    loadData()
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
  }

  function handleLogout() {
    signOut()
    navigate('/login')
  }

  function navigateToEstado(estado) {
    setFilterEstado(estado)
    setActiveTab('consultas')
    setSelectedConsulta(null)
  }

  function navigateToMatriculados() {
    setFilterEstado('matriculado')
    setActiveTab('consultas')
    setSelectedConsulta(null)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  }

  // ============================================
  // SIDEBAR - Responsive y Colapsable
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
  // Handler para seleccionar consulta
  const selectConsulta = useCallback((id) => {
    const consulta = store.getConsultaById(id)
    setSelectedConsulta(consulta)
    setActiveTab('detalle')
  }, [])

  // Handler para cambiar estado
  const handleEstadoChange = useCallback((id, nuevoEstado) => {
    store.updateConsulta(id, { estado: nuevoEstado }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
    setNotification({ type: 'success', message: `Estado cambiado a "${nuevoEstado}"` })
    setTimeout(() => setNotification(null), 2000)
  }, [selectedConsulta?.id, user?.id])

  // Handler para reasignar
  const handleReasignar = useCallback(async (id, nuevoEncargado) => {
    const encargado = store.getUsuarios().find(u => u.id === nuevoEncargado)
    store.updateConsulta(id, { asignado_a: nuevoEncargado }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }

    // Notificación individual
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
      } catch (e) {
        console.error('Error notificando asignación:', e)
      }
    }

    loadData()
    setNotification({ type: 'success', message: `Lead asignado a ${encargado?.nombre || 'Sin asignar'}` })
    setTimeout(() => setNotification(null), 3000)
  }, [selectedConsulta?.id, user?.id, nombreInstitucion])

  // Handler para asignación masiva
  const handleBulkAssign = async (encargadoId) => {
    if (!encargadoId || selectedLeads.length === 0) return

    const encargado = store.getUsuarios().find(u => u.id === encargadoId)
    const leadsCount = selectedLeads.length

    // Actualizar cada lead en el store
    selectedLeads.forEach(id => {
      store.updateConsulta(id, { asignado_a: encargadoId }, user.id)
    })

    // Notificación masiva
    if (encargado?.email) {
      try {
        await notifyAssignment({
          encargadoId,
          encargadoEmail: encargado.email,
          encargadoNombre: encargado.nombre,
          leadsCount: leadsCount,
          isBulk: true,
          institucionNombre: nombreInstitucion
        })
      } catch (e) {
        console.error('Error notificando asignación masiva:', e)
      }
    }

    setSelectedLeads([])
    loadData()
    setNotification({ type: 'success', message: `¡${leadsCount} leads asignados a ${encargado?.nombre}!` })
    setTimeout(() => setNotification(null), 3000)
  }

  // Handler para cambiar tipo alumno
  const handleTipoAlumnoChange = useCallback((id, tipo) => {
    store.updateConsulta(id, { tipo_alumno: tipo }, user.id)
    if (selectedConsulta?.id === id) {
      setSelectedConsulta(store.getConsultaById(id))
    }
    loadData()
  }, [selectedConsulta?.id, user?.id])

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

      {/* BANNER DE HONESTIDAD BRUTAL: Solo visible si hay problemas de conexión real */}
      {syncStatus !== 'synced' && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white py-2 px-4 shadow-2xl animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <Icon name="AlertCircle" size={20} />
            <p className="font-bold text-sm lg:text-base">
              CONEXIÓN INESTABLE - MODO SOLO LECTURA ACTIVO (Reintentando...)
            </p>
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

      {/* Botón flotante refrescar */}
      <button
        onClick={handleRefreshData}
        className="fixed bottom-4 left-72 z-40 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg hover:bg-slate-50 hover:shadow-xl transition-all"
        title="Traer últimos datos de la nube"
      >
        <Icon name="RefreshCw" size={16} />
        <span className="text-sm font-medium">Recibir de la Nube</span>
      </button>
    </div>
  )
}
