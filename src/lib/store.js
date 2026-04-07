// ============================================
// ADMITIO - Store Local Completo
// Simula todas las funcionalidades del SaaS
// ============================================

import {
  CONSULTAS_INICIALES,
  ACTIVIDAD_INICIAL,
  USUARIOS,
  CARRERAS,
  MEDIOS,
  ROLES,
  ESTADOS,
  TIPOS_ALUMNO,
  TIPOS_ACTIVIDAD,
  PLANTILLAS_CORREO,
  FORMULARIOS,
  CONFIG_ORG,
  METRICAS_ENCARGADOS,
  RECORDATORIOS_INICIALES,
  COLA_LEADS_INICIAL,
  CORREOS_ENVIADOS_INICIAL
} from '../data/mockData'

// Importar cliente Supabase
import { supabase } from './supabase'

// Importar funciones de sincronización con Supabase
import {
  syncCrearLead,
  syncActualizarLead,
  syncActualizarLeadDirecto, // NUEVO: Sync directo que espera respuesta
  syncEliminarLead,
  syncCrearAccion,
  syncCrearUsuario,
  syncActualizarUsuario,
  syncCrearCarrera,
  syncActualizarCarrera,
  syncEliminarCarrera,
  syncImportarCarreras,
  syncCrearFormulario,
  syncActualizarFormulario,
  syncEliminarFormulario,
  syncCrearLeadsBulk,
  syncCrearAccionesBulk,
  getInstitucionIdFromStore
} from './storeSync'

const STORAGE_KEY = 'admitio_data'
const STORAGE_VERSION = '2.7' // Incrementar - Modo Supabase real

// ============================================
// INICIALIZACIÓN
// ============================================
function initStore() {
  // SEGURIDAD: Ya no leemos de localStorage para evitar persistencia en el navegador
  // Limpiamos datos riskosos previos si existen
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) { }

  const userSession = localStorage.getItem('admitio_user')

  // Verificar si hay sesión de usuario de Supabase
  let isSupabaseUser = false
  if (userSession) {
    try {
      const user = JSON.parse(userSession)
      isSupabaseUser = user.institucion_id && user.institucion_id.includes('-')
    } catch (e) { }
  }

  // Si es usuario de Supabase, inicializar VACÍO (los datos vendrán del login)
  if (isSupabaseUser) {
    console.log('🔄 Inicializando store EN MEMORIA para Supabase (Seguridad Activa)...')
    return {
      consultas: [],
      actividad: [],
      usuarios: [],
      carreras: [],
      medios: MEDIOS,
      plantillas: [],
      formularios: [],
      config: { nombre: 'Mi Institución' },
      metricas_encargados: {},
      recordatorios: [],
      cola_leads: [],
      correos_enviados: [],
      notificaciones: [],
      importaciones: [],
      campanas: [],
      _supabase_sync: true
    }
  }

  // Datos iniciales demo (solo si no es Supabase)
  const initialData = {
    consultas: CONSULTAS_INICIALES,
    actividad: ACTIVIDAD_INICIAL,
    usuarios: USUARIOS,
    carreras: CARRERAS,
    medios: MEDIOS,
    roles: ROLES,
    estados: ESTADOS,
    tipos_alumno: TIPOS_ALUMNO,
    tipos_actividad: TIPOS_ACTIVIDAD,
    plantillas: PLANTILLAS_CORREO,
    formularios: FORMULARIOS,
    campanas: [],
    config: CONFIG_ORG,
    metricas_encargados: METRICAS_ENCARGADOS,
    recordatorios: RECORDATORIOS_INICIALES,
    cola_leads: COLA_LEADS_INICIAL,
    correos_enviados: CORREOS_ENVIADOS_INICIAL,
    notificaciones: [],
    importaciones: [],
    _supabase_sync: false
  }

  console.log(`✅ Store demo inicializado en memoria: ${initialData.consultas.length} leads`)
  return initialData
}

let store = initStore()

function saveStore() {
  // SEGURIDAD: Ya no guardamos en localStorage para evitar riesgos de datos en el navegador
  // El store permanece solo en la memoria RAM del navegador mientras la pestaña esté abierta
}

export function resetStore() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('admitio_version')
  } catch (e) { }

  store = initStore()
  console.log('🔄 Store reseteado (Memoria Limpia)')
  return store
}

// Recargar datos (en modo Supabase solo limpia para asegurar frescura)
export function reloadStore() {
  if (store?._supabase_sync) {
    console.log('🛡️ reloadStore: Ignorando localStorage por seguridad (Modo Supabase)')
    return store
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const data = JSON.parse(stored)
      // Asegurar que todos los arrays existan
      store = {
        ...data,
        consultas: data.consultas || [],
        usuarios: data.usuarios || [],
        carreras: data.carreras || [],
        medios: data.medios || MEDIOS,
        formularios: data.formularios || [],
        actividad: data.actividad || [],
        recordatorios: data.recordatorios || [],
        cola_leads: data.cola_leads || [],
        notificaciones: data.notificaciones || [],
        importaciones: data.importaciones || [],
        correos_enviados: data.correos_enviados || [],
        plantillas: data.plantillas || [],
        metricas_encargados: data.metricas_encargados || {},
        config: data.config || { nombre: 'Mi Institución' }
      }
    } catch (e) {
      console.error('Error al recargar store:', e)
    }
  }
  return store
}

// NUEVO: Aplicar actualización incremental de Realtime
export function applyRealtimeUpdate(payload) {
  if (!payload || !payload.table === 'leads') return;

  const { eventType, new: newRecord, old: oldRecord } = payload;
  console.log(`🔌 store.applyRealtimeUpdate: ${eventType} en ${payload.table} ID:${newRecord?.id || oldRecord?.id}`);

  if (eventType === 'INSERT') {
    // Evitar duplicados por si acaso el evento llega varias veces
    if (!store.consultas.some(c => c.id === newRecord.id)) {
      store.consultas = [newRecord, ...store.consultas];
    }
  }
  else if (eventType === 'UPDATE') {
    store.consultas = store.consultas.map(c =>
      c.id === newRecord.id ? { ...c, ...newRecord } : c
    );
  }
  else if (eventType === 'DELETE') {
    store.consultas = store.consultas.filter(c => c.id !== oldRecord.id);
  }

  // Notificar a React (Dashboard.jsx escucha este evento para llamar a loadData)
  window.dispatchEvent(new CustomEvent('admitio-store-updated'));
}

// NUEVO: Setear todos los datos (Usado por AuthContext)
export function setAllData(newData) {
  if (!newData) return
  console.log('📥 setAllData: Actualizando store en memoria con', newData.consultas?.length, 'leads')
  store = {
    ...store,
    ...newData,
    consultas: newData.consultas || [],
    usuarios: newData.usuarios || [],
    carreras: newData.carreras || [],
    formularios: newData.formularios || [],
    actividad: newData.actividad || []
  }
}

// Debug: ver estado actual del store
export function debugStore() {
  console.log('📊 Estado actual del store:')
  console.log('  - Consultas:', store.consultas?.length || 0)
  console.log('  - Usuarios:', store.usuarios?.length || 0)
  console.log('  - Carreras:', store.carreras?.length || 0)
  console.log('  - Encargados activos:', getEncargadosActivos().length)
  return {
    consultas: store.consultas?.length || 0,
    usuarios: store.usuarios?.length || 0,
    carreras: store.carreras?.length || 0
  }
}

// ============================================
// USUARIOS
// ============================================
export function getUsuarios(requesterId = null, incluirOcultos = false) {
  const requester = store.usuarios.find(u => u.id === requesterId)
  const isSuperAdmin = requester?.rol_id === 'superadmin'

  // Solo el superadmin puede ver usuarios ocultos
  if (incluirOcultos && isSuperAdmin) {
    return store.usuarios
  }

  // Para todos los demás, filtrar ocultos
  return store.usuarios.filter(u => !u.oculto && u.rol_id !== 'superadmin')
}

export function getUsuarioById(id) {
  return store.usuarios.find(u => u.id === id)
}

export function getEncargadosActivos() {
  return store.usuarios.filter(u => u.rol_id === 'encargado' && u.activo && !u.oculto)
}

// Obtener todos los usuarios (para reportes y mapeo de nombres)
export function getTodosLosUsuarios() {
  return store.usuarios
}

// Obtener nombre de usuario por ID
export function getNombreUsuario(userId) {
  if (!userId) return 'Sin asignar'
  const usuario = store.usuarios.find(u => u.id === userId)
  return usuario?.nombre || 'Usuario desconocido'
}

// Obtener nombre de carrera por ID
export function getNombreCarrera(carreraId) {
  if (!carreraId) return 'Sin carrera'
  const carrera = store.carreras.find(c => c.id === carreraId)
  return carrera?.nombre || 'Carrera desconocida'
}

// Obtener nombre de medio por ID
export function getNombreMedio(medioId) {
  if (!medioId) return 'Sin medio'
  const medio = store.medios.find(m => m.id === medioId)
  return medio?.nombre || medioId // Fallback al ID si no se encuentra
}

export function getRolesDisponibles(requesterId = null) {
  const requester = store.usuarios.find(u => u.id === requesterId)
  const isSuperAdmin = requester?.rol_id === 'superadmin' || requester?.rol_id === 'superowner'

  // Filtrar roles ocultos si no es superadmin
  return Object.values(ROLES).filter(rol => {
    if (rol.oculto && !isSuperAdmin) return false
    return true
  })
}

export function createUsuario(data) {
  const nuevoUsuario = {
    id: `user-${Date.now()}`,
    ...data,
    activo: data.activo !== undefined ? data.activo : true,
    config: { notificaciones_email: true, notificaciones_popup: true },
    created_at: new Date().toISOString()
  }
  store.usuarios.push(nuevoUsuario)
  saveStore()

  // ========== SYNC CON SUPABASE ==========
  const institucionId = getInstitucionIdFromStore()
  if (institucionId) {
    syncCrearUsuario(institucionId, nuevoUsuario)
  }
  // ========================================

  return nuevoUsuario
}

// Invitar usuario real vía Edge Function (crea Auth + DB)
export async function invitarUsuario(data) {
  console.log('📝 Invitando usuario vía Edge Function:', data.email)

  try {
    // Mapear rol a nombre legible
    const rolesNombres = {
      'superadmin': 'Administrador',
      'keymaster': 'Administrador',
      'rector': 'Rector/Director',
      'encargado': 'Encargado de Admisión',
      'asistente': 'Asistente'
    }
    const rolNombre = rolesNombres[data.rol_id] || data.rol_id

    const { data: response, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: data.email?.toLowerCase().trim(),
        nombre: data.nombre,
        password: data.password,
        rol: data.rol_id,
        rol_nombre: rolNombre,
        institucion_id: data.institucion_id,
        institucion_nombre: 'Admitio', // Podríamos obtener el nombre real si fuera necesario
        invitado_por: data.invitado_por
      }
    })

    if (error) {
      console.error('❌ Error llamando a invite-user:', error)
      return { error: error.message || 'Error al invitar usuario' }
    }

    if (!response?.success) {
      return { error: response?.error || 'Error en la respuesta de invitacion' }
    }

    // Si tuvo éxito, el usuario ya debería estar en la tabla 'usuarios' de Supabase
    // Pero para que aparezca en el store local de inmediato, podemos cargarlo o agregarlo
    const newUser = {
      id: response.user?.id,
      nombre: data.nombre,
      email: data.email,
      rol_id: data.rol_id,
      activo: true,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=7c3aed&color=fff`
    }

    if (!store.usuarios.find(u => u.id === newUser.id)) {
      store.usuarios.push(newUser)
      saveStore()
    }

    return { success: true, user: newUser }
  } catch (err) {
    console.error('💥 Error crítico en invitarUsuario:', err)
    return { error: err.message || 'Error inesperado' }
  }
}

export function updateUsuario(id, updates) {
  const index = store.usuarios.findIndex(u => u.id === id)
  if (index === -1) return null
  store.usuarios[index] = { ...store.usuarios[index], ...updates }
  saveStore()

  // ========== SYNC CON SUPABASE ==========
  syncActualizarUsuario(id, updates)
  // ========================================

  return store.usuarios[index]
}

export function toggleUsuarioActivo(id) {
  const usuario = store.usuarios.find(u => u.id === id)
  if (!usuario) return null
  usuario.activo = !usuario.activo
  saveStore()

  // ========== SYNC CON SUPABASE ==========
  syncActualizarUsuario(id, { activo: usuario.activo })
  // ========================================

  return usuario
}

// Obtener leads de un usuario
export function getLeadsPorUsuario(userId) {
  return store.consultas.filter(c => c.asignado_a === userId)
}

// Migrar leads de un usuario a otro con reporte
export async function migrarLeads(fromUserId, toUserId, adminUserId) {
  const fromUser = store.usuarios.find(u => u.id === fromUserId)
  const toUser = store.usuarios.find(u => u.id === toUserId)

  if (!fromUser || !toUser) {
    console.error('❌ Usuarios no encontrados para migración')
    return null
  }

  const leadsAMigrar = store.consultas.filter(c => c.asignado_a === fromUserId)

  if (leadsAMigrar.length === 0) {
    console.log('ℹ️ No hay leads para migrar')
    return { migrados: 0, reporte: null }
  }

  console.log(`🔄 Migrando ${leadsAMigrar.length} leads de ${fromUser.nombre} a ${toUser.nombre}`)

  try {
    // ========== SINCRONIZAR CON SUPABASE PRIMERO ==========
    const leadIds = leadsAMigrar.map(l => l.id)

    const { error: updateError } = await supabase
      .from('leads')
      .update({ asignado_a: toUserId })
      .in('id', leadIds)

    if (updateError) {
      console.error('❌ Error migrando leads en Supabase:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log(`✅ ${leadsAMigrar.length} leads actualizados en Supabase`)

    // ========== ACTUALIZAR STORE LOCAL ==========
    leadsAMigrar.forEach(lead => {
      lead.asignado_a = toUserId
      // Registrar actividad
      addActividad(
        lead.id,
        adminUserId,
        'migracion',
        `Lead migrado de ${fromUser.nombre} a ${toUser.nombre} (eliminación de encargado)`
      )
    })

    // Crear reporte de migración
    const reporte = {
      id: `rep-${Date.now()}`,
      tipo: 'migracion_leads',
      fecha: new Date().toISOString(),
      desde: {
        id: fromUser.id,
        nombre: fromUser.nombre,
        email: fromUser.email
      },
      hacia: {
        id: toUser.id,
        nombre: toUser.nombre,
        email: toUser.email
      },
      realizado_por: adminUserId,
      leads: leadsAMigrar.map(lead => ({
        id: lead.id,
        nombre: lead.nombre,
        estado: lead.estado,
        carrera_id: lead.carrera_id,
        carrera_nombre: store.carreras.find(ca => ca.id === lead.carrera_id)?.nombre || '',
        matriculado: lead.matriculado,
        descartado: lead.descartado,
        fecha_primer_contacto: lead.fecha_primer_contacto,
        notas: lead.notas
      })),
      total_leads: leadsAMigrar.length,
      estados: {
        nueva: leadsAMigrar.filter(l => l.estado === 'nueva' && !l.matriculado && !l.descartado).length,
        contactado: leadsAMigrar.filter(l => l.estado === 'contactado' && !l.matriculado && !l.descartado).length,
        seguimiento: leadsAMigrar.filter(l => l.estado === 'seguimiento' && !l.matriculado && !l.descartado).length,
        examen_admision: leadsAMigrar.filter(l => l.estado === 'examen_admision' && !l.matriculado && !l.descartado).length,
        matriculado: leadsAMigrar.filter(l => l.matriculado).length,
        descartado: leadsAMigrar.filter(l => l.descartado).length
      },
      leido: false
    }

    // Guardar reporte
    if (!store.reportes_migracion) {
      store.reportes_migracion = []
    }
    store.reportes_migracion.push(reporte)

    // Crear notificación para el nuevo encargado
    crearNotificacion(
      toUserId,
      'migracion_leads',
      `Se te han asignado ${leadsAMigrar.length} leads de ${fromUser.nombre}`,
      null,
      reporte.id
    )

    saveStore()

    console.log(`✅ Migración completada: ${leadsAMigrar.length} leads`)

    return {
      success: true,
      migrados: leadsAMigrar.length,
      reporte
    }
  } catch (err) {
    console.error('❌ Error en migración:', err)
    return { success: false, error: err.message }
  }
}

// Obtener reportes de migración para un usuario
export function getReportesMigracion(userId) {
  if (!store.reportes_migracion) return []
  return store.reportes_migracion.filter(r => r.hacia.id === userId)
}

// Marcar reporte como leído
export function marcarReporteLeido(reporteId) {
  if (!store.reportes_migracion) return null
  const reporte = store.reportes_migracion.find(r => r.id === reporteId)
  if (reporte) {
    reporte.leido = true
    saveStore()
  }
  return reporte
}

// Eliminar usuario (con opción de migrar primero)
export async function deleteUsuario(id) {
  console.log('🗑️ Iniciando eliminación de usuario:', id)

  // Verificar que el usuario existe
  const usuario = store.usuarios.find(u => u.id === id)
  if (!usuario) {
    console.error('❌ Usuario no encontrado en store:', id)
    return { success: false, error: 'Usuario no encontrado' }
  }

  console.log('👤 Usuario a eliminar:', usuario.nombre, usuario.email)

  // Verificar que no tenga leads asignados
  const leadsDelUsuario = (store.consultas || []).filter(c => c.asignado_a === id)
  if (leadsDelUsuario.length > 0) {
    console.warn('⚠️ Usuario tiene leads asignados:', leadsDelUsuario.length)
    return { success: false, error: 'El usuario tiene leads asignados', leadsCount: leadsDelUsuario.length }
  }

  try {
    // 1. Eliminar de nuestra tabla usuarios
    console.log('🗑️ Eliminando de tabla usuarios...')
    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Error eliminando de tabla usuarios:', deleteError)
      return { success: false, error: deleteError.message }
    }

    console.log('✅ Usuario eliminado de tabla usuarios')

    // 2. Intentar eliminar de Supabase Auth (requiere service_role key, puede fallar)
    // Esto es opcional - el usuario no podrá entrar porque no está en nuestra tabla
    if (usuario.auth_id) {
      console.log('🔐 Intentando eliminar de Supabase Auth:', usuario.auth_id)
      try {
        // Nota: Esta llamada requiere permisos de admin, puede fallar silenciosamente
        const { error: authError } = await supabase.auth.admin.deleteUser(usuario.auth_id)
        if (authError) {
          console.warn('⚠️ No se pudo eliminar de Auth (normal si no tienes service_role):', authError.message)
        } else {
          console.log('✅ Usuario eliminado de Supabase Auth')
        }
      } catch (authErr) {
        console.warn('⚠️ Auth delete no disponible:', authErr.message)
      }
    }

    // 3. Eliminar del store local
    store.usuarios = store.usuarios.filter(u => u.id !== id)
    console.log('✅ Usuario eliminado del store local')

    return { success: true }
  } catch (err) {
    console.error('❌ Error inesperado:', err)
    return { success: false, error: err.message }
  }
}

// ============================================
// CONSULTAS / LEADS
// ============================================
export function getConsultas(userId = null, rol = null, paraReportes = false) {
  // Protección contra store.consultas undefined
  if (!store.consultas || !Array.isArray(store.consultas)) {
    console.warn('⚠️ store.consultas no es un array, retornando vacío')
    return []
  }

  let consultas = [...store.consultas]

  // Filtrar por rol (excepto si es para reportes)
  if (!paraReportes) {
    if (rol === 'encargado' && userId) {
      consultas = consultas.filter(c => c.asignado_a === userId)
    }
    // Asistente ve solo los leads que creó
    if (rol === 'asistente' && userId) {
      consultas = consultas.filter(c => c.creado_por === userId)
    }
    if (rol === 'rector') {
      return [] // Rector no ve leads en listado, solo reportes
    }
  }

  // Agregar datos relacionados
  return consultas.map(c => enrichConsulta(c))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// Función específica para reportes - todos los leads sin filtro de rol
export function getConsultasParaReportes() {
  if (!store.consultas || !Array.isArray(store.consultas)) {
    console.warn('⚠️ store.consultas no es un array')
    return []
  }
  return store.consultas.map(c => enrichConsulta(c))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export function getConsultaById(id) {
  const consulta = store.consultas.find(c => c.id === id)
  if (!consulta) return null

  const actividad = (store.actividad || [])
    .filter(a => a.lead_id === id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // Mapear para compatibilidad con DetalleView que espera .acciones y .accion
  const acciones = actividad.map(a => ({
    ...a,
    accion: a.accion || a.descripcion,
    created_at: a.created_at || a.fecha, // Fallback importante
    realizado_por_nombre: a.realizado_por_nombre || a.user_nombre || 'Sistema'
  }))

  return {
    ...enrichConsulta(consulta),
    actividad,
    acciones
  }
}

function enrichConsulta(c) {
  const carrera = (store.carreras || []).find(ca => ca.id === c.carrera_id)
  const medio = (store.medios || []).find(m => m.id === c.medio_id)
  const encargado = (store.usuarios || []).find(u => u.id === c.asignado_a)
  const campana = (store.campanas || []).find(cam => cam.id === c.campana_id)

  return {
    ...c,
    carrera,
    medio,
    encargado,
    campana,
    recordatorios: (store.recordatorios || []).filter(r => r.lead_id === c.id && !r.disparado)
  }
}

export function createConsulta(data, userId, userRol = null) {
  // Determinar asignación
  let asignado_a = data.asignado_a
  let en_cola = false

  if (!asignado_a) {
    // Restaurando asignación en frontend para asegurar integridad en cargas masivas
    const resultado = asignarLeadInteligente()
    if (resultado.enCola) {
      en_cola = true
      asignado_a = null
    } else {
      asignado_a = resultado.userId
    }
  }

  // Obtener info del creador
  const creador = store.usuarios.find(u => u.id === userId)

  // Extraer nombre de carrera si hay carrera_id, o buscar ID si hay nombre
  let carrera_nombre = data.carrera_nombre || null
  let carrera_id = data.carrera_id || null

  if (carrera_id && !carrera_nombre) {
    const carrera = store.carreras.find(c => c.id === carrera_id || c.id === String(carrera_id))
    carrera_nombre = carrera?.nombre || null
  } else if (!carrera_id && carrera_nombre) {
    const carrera = store.carreras.find(c => c.nombre?.toLowerCase() === carrera_nombre.toLowerCase())
    if (carrera) carrera_id = carrera.id
  }

  const newConsulta = {
    id: `c-${Date.now()}`,
    ...data,
    carrera_id, // Asegurar el ID para que enrich funcione
    carrera_nombre, // Asegurar que siempre tenga el nombre
    estado: 'nueva',
    emails_enviados: 0,
    created_at: new Date().toISOString(),
    fecha_primer_contacto: null,
    fecha_proximo_contacto: new Date().toISOString(),
    fecha_examen_admision: null,
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    asignado_a,
    en_cola,
    ultimo_whatsapp: null,
    // Nuevo: Registro de quién creó el lead
    creado_por: userId,
    creado_por_nombre: creador?.nombre || 'Sistema',
    creado_por_rol: userRol || creador?.rol_id || 'sistema',
    origen_entrada: userRol === 'asistente' ? 'secretaria' : (data.origen_entrada || 'manual')
  }

  store.consultas.push(newConsulta)

  // Registrar actividad con info del creador
  const origenTexto = newConsulta.origen_entrada === 'secretaria'
    ? `Lead ingresado por Secretaría (${creador?.nombre || 'Asistente'})`
    : 'Lead ingresado al sistema'
  addActividad(newConsulta.id, userId, 'creacion', origenTexto)

  // Si está en cola, agregar a cola
  if (en_cola) {
    store.cola_leads.push({
      id: `cola-${Date.now()}`,
      lead_id: newConsulta.id,
      prioridad: 0,
      created_at: new Date().toISOString()
    })
    // Crear notificación para KeyMaster
    crearNotificacion('keymaster', 'cola_llena', `Nuevo lead en cola: ${data.nombre}`, newConsulta.id)
  } else if (asignado_a) {
    // Notificar al encargado
    crearNotificacion(asignado_a, 'nuevo_lead', `Nuevo lead asignado: ${data.nombre}`, newConsulta.id)
  }

  saveStore()

  // ========== SYNC CON SUPABASE ==========
  const institucionId = getInstitucionIdFromStore()
  if (institucionId) {
    syncCrearLead(institucionId, newConsulta)
  }
  // ========================================

  // Log para debugging
  const encargado = store.usuarios.find(u => u.id === asignado_a)
  console.log(`✅ Lead creado: ${data.nombre}`)
  console.log(`   → Creado por: ${creador?.nombre || 'Sistema'} (${newConsulta.origen_entrada})`)
  console.log(`   → Asignado a: ${encargado?.nombre || 'En cola'}`)
  console.log(`   → Total leads: ${store.consultas.length}`)

  // Devolver consulta enriquecida
  return enrichConsulta(newConsulta)
}

/**
 * Creación MASIVA de consultas (Bulk Import) con Lógica de Negocio
 * @param {Array} leadsData 
 * @param {string} userId 
 * @param {string} userRol 
 */
export function createConsultasBulk(leadsData, userId, userRol = null) {
  if (!leadsData?.length) return;

  console.log(`🚀 [Bulk] Iniciando creación masiva de ${leadsData.length} leads...`);

  const institucionId = getInstitucionIdFromStore();
  const creador = store.usuarios.find(u => u.id === userId);

  const newConsultas = [];
  const newActividades = [];
  const skipCount = { dups: 0 };

  leadsData.forEach((data, index) => {
    // 1. Verificación de duplicados (O(N) rápida en memoria)
    if (data.email || data.telefono) {
      const dups = buscarDuplicados(data.nombre, data.email || '', data.telefono || '');
      if (dups.length > 0) {
        skipCount.dups++;
        return;
      }
    }

    // 2. Vinculación inteligente de carrera
    let carrera_nombre = data.carrera_nombre || null;
    let carrera_id = data.carrera_id || null;
    if (carrera_id && !carrera_nombre) {
      const carrera = store.carreras.find(c => c.id === carrera_id || c.id === String(carrera_id));
      carrera_nombre = carrera?.nombre || null;
    } else if (!carrera_id && carrera_nombre) {
      const carrera = store.carreras.find(c => c.nombre?.toLowerCase() === carrera_nombre.toLowerCase());
      if (carrera) carrera_id = carrera.id;
    }

    // 3. Asignación inteligente
    let asignado_a = data.asignado_a || null;
    let en_cola = false;
    if (!asignado_a) {
      const resultado = asignarLeadInteligente();
      if (resultado.enCola) {
        en_cola = true;
      } else {
        asignado_a = resultado.userId;
      }
    }

    // 4. Construir objeto Lead
    const ts = Date.now() + index; // Evitar colisión de IDs locales
    const newLead = {
      id: `c-${ts}`,
      ...data,
      carrera_id,
      carrera_nombre,
      estado: 'nueva',
      created_at: new Date().toISOString(),
      asignado_a,
      en_cola,
      creado_por: userId,
      origen_entrada: data.origen_entrada || 'manual'
    };

    newConsultas.push(newLead);

    // 5. Construir Actividad
    newActividades.push({
      lead_id: newLead.id,
      usuario_id: userId,
      usuario_nombre: creador?.nombre || 'Sistema',
      tipo: 'creacion',
      descripcion: 'Lead ingresado por importación masiva',
      created_at: newLead.created_at
    });
  });

  if (newConsultas.length === 0) {
    console.warn('⚠️ [Bulk] No se crearon leads (todos eran duplicados).');
    return;
  }

  // 6. Actualización total del Store (Atómica localmente)
  store.consultas.push(...newConsultas);
  // Nota: store.actividad o store.actividades? Grep indicó store.consultas.push earlier.
  // Re-confirmando nombre del array de actividad...
  if (Array.isArray(store.actividad)) {
    store.actividad.push(...newActividades);
  } else if (Array.isArray(store.actividades)) {
    store.actividades.push(...newActividades);
  }

  saveStore();

  // 7. SYNC MASIVO CON SUPABASE
  if (institucionId) {
    syncCrearLeadsBulk(institucionId, newConsultas);
    syncCrearAccionesBulk(institucionId, newActividades);
  }

  console.log(`✅ [Bulk] Procesados: ${newConsultas.length} | Saltados: ${skipCount.dups}`);
  return newConsultas.length;
}

// ============================================
// DETECCIÓN DE DUPLICADOS
// ============================================

// Función para calcular similitud entre dos strings (0-100)
function calcularSimilitud(str1, str2) {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  // Coincidencia exacta
  if (s1 === s2) return 100

  // Si uno contiene al otro completamente
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2
    const shorter = s1.length > s2.length ? s2 : s1
    return Math.round((shorter.length / longer.length) * 100)
  }

  // Comparar palabra por palabra
  const palabras1 = s1.split(/\s+/).filter(p => p.length > 0)
  const palabras2 = s2.split(/\s+/).filter(p => p.length > 0)

  let coincidencias = 0
  for (const p1 of palabras1) {
    for (const p2 of palabras2) {
      if (p1 === p2) {
        coincidencias++
        break
      }
    }
  }

  const maxPalabras = Math.max(palabras1.length, palabras2.length)
  if (maxPalabras === 0) return 0

  return Math.round((coincidencias / maxPalabras) * 100)
}

export function buscarDuplicados(nombre, email = null, telefono = null) {
  const nombreNormalizado = nombre.toLowerCase().trim()
  const UMBRAL_MINIMO = 95 // Solo mostrar si >= 95%

  const resultados = store.consultas.map(c => {
    let porcentajeCoincidencia = 0
    let tipoCoincidencia = []

    // 1. Verificar email (coincidencia exacta = 100%)
    if (email && c.email) {
      const emailLimpio = email.toLowerCase().trim()
      const emailExistente = c.email.toLowerCase().trim()
      if (emailLimpio === emailExistente && emailLimpio.length > 0) {
        porcentajeCoincidencia = 100
        tipoCoincidencia.push('email')
      }
    }

    // 2. Verificar teléfono (coincidencia exacta = 100%)
    if (telefono && c.telefono) {
      const telLimpio = telefono.replace(/\D/g, '')
      const telExistente = c.telefono.replace(/\D/g, '')
      if (telLimpio === telExistente && telLimpio.length >= 8) {
        porcentajeCoincidencia = Math.max(porcentajeCoincidencia, 100)
        tipoCoincidencia.push('teléfono')
      }
    }

    // 3. Verificar nombre
    const nombreExistente = c.nombre.toLowerCase().trim()
    const similitudNombre = calcularSimilitud(nombreNormalizado, nombreExistente)

    // Solo considerar nombre si similitud >= 95%
    if (similitudNombre >= 95) {
      porcentajeCoincidencia = Math.max(porcentajeCoincidencia, similitudNombre)
      tipoCoincidencia.push('nombre')
    }

    return {
      consulta: c,
      porcentajeCoincidencia,
      tipoCoincidencia
    }
  })

  // Filtrar solo los que superan el umbral
  const duplicados = resultados
    .filter(r => r.porcentajeCoincidencia >= UMBRAL_MINIMO)
    .sort((a, b) => b.porcentajeCoincidencia - a.porcentajeCoincidencia)

  // Enriquecer con datos y agregar info de coincidencia
  return duplicados.map(d => ({
    ...enrichConsulta(d.consulta),
    porcentajeCoincidencia: d.porcentajeCoincidencia,
    tipoCoincidencia: d.tipoCoincidencia
  }))
}

// Agregar carrera/instrumento a lead existente
export function agregarCarreraALead(leadId, nuevaCarreraId, userId) {
  const lead = store.consultas.find(c => c.id === leadId)
  if (!lead) return null

  // Guardar carrera anterior
  const carreraAnterior = store.carreras.find(ca => ca.id === lead.carrera_id)
  const carreraNueva = store.carreras.find(ca => ca.id === nuevaCarreraId)

  // Crear array de carreras de interés si no existe
  if (!lead.carreras_interes) {
    lead.carreras_interes = []
  }

  // Agregar carrera actual a carreras de interés si no está
  if (lead.carrera_id && !lead.carreras_interes.includes(lead.carrera_id)) {
    lead.carreras_interes.push(lead.carrera_id)
  }

  // Agregar nueva carrera
  if (!lead.carreras_interes.includes(nuevaCarreraId)) {
    lead.carreras_interes.push(nuevaCarreraId)
  }

  // Registrar actividad
  addActividad(
    leadId,
    userId,
    'actualizacion',
    `Se agregó interés en ${carreraNueva?.nombre || 'otra carrera'} (ya tenía interés en ${carreraAnterior?.nombre || 'otra carrera'})`
  )

  // Actualizar estado si estaba descartado
  if (lead.descartado) {
    lead.descartado = false
    lead.estado = 'nueva'
    addActividad(leadId, userId, 'reactivacion', 'Lead reactivado por nueva consulta')
  }

  saveStore()

  console.log(`📝 Carrera agregada a lead existente: ${lead.nombre}`)
  console.log(`   → Carreras de interés: ${lead.carreras_interes.length}`)

  return enrichConsulta(lead)
}

export function updateConsulta(id, updates, userId) {
  const index = store.consultas.findIndex(c => c.id === id)
  if (index === -1) return null

  const oldConsulta = store.consultas[index]
  const newConsulta = { ...oldConsulta, ...updates }

  // Detectar cambio de estado
  if (updates.estado && oldConsulta.estado !== newConsulta.estado) {
    addActividad(id, userId, 'cambio_estado', `Estado: ${oldConsulta.estado} → ${newConsulta.estado}`)

    // Primer contacto
    if (!oldConsulta.fecha_primer_contacto && newConsulta.estado !== 'nueva') {
      newConsulta.fecha_primer_contacto = new Date().toISOString()
    }

    // Cierre
    if (newConsulta.estado === 'matriculado') {
      newConsulta.fecha_cierre = new Date().toISOString()
      newConsulta.matriculado = true
      addActividad(id, userId, 'matriculado', '🎉 Lead matriculado exitosamente')
      // Cancelar recordatorios pendientes
      cancelarRecordatorios(id)
    }
    if (newConsulta.estado === 'descartado') {
      newConsulta.fecha_cierre = new Date().toISOString()
      newConsulta.descartado = true
      addActividad(id, userId, 'descartado', `Lead descartado: ${updates.motivo_descarte || 'Sin motivo especificado'}`)
      cancelarRecordatorios(id)
    }

    // Examen de admisión agendado
    if (newConsulta.estado === 'examen_admision' && updates.fecha_examen_admision) {
      addActividad(id, userId, 'examen_agendado', `Examen agendado para ${formatDateShort(updates.fecha_examen_admision)}`)
      // Crear recordatorio para 2 días antes
      const fechaExamen = new Date(updates.fecha_examen_admision)
      const fechaRecordatorio = new Date(fechaExamen)
      fechaRecordatorio.setDate(fechaRecordatorio.getDate() - store.config.dias_antes_examen_recordatorio)
      crearRecordatorio(id, newConsulta.asignado_a, 'examen_encargado', 'Confirmar asistencia a examen', fechaRecordatorio)
    }
  }

  // NUEVO: Detectar cambio de carrera/instrumento de interés
  if (updates.carrera_id && oldConsulta.carrera_id !== updates.carrera_id) {
    const carreraAnterior = store.carreras.find(ca => ca.id === oldConsulta.carrera_id)
    const carreraNueva = store.carreras.find(ca => ca.id === updates.carrera_id)

    // Registrar actividad de cambio de interés
    addActividad(
      id,
      userId,
      'cambio_interes',
      `🎸 Nuevo interés: ${carreraNueva?.nombre || 'otro instrumento'} (antes: ${carreraAnterior?.nombre || 'ninguno'})`
    )

    // Marcar como nueva intención de matrícula
    newConsulta.nuevo_interes = true
    newConsulta.fecha_nuevo_interes = new Date().toISOString()

    // Agregar carrera anterior a carreras de interés si no está
    if (!newConsulta.carreras_interes) {
      newConsulta.carreras_interes = []
    }
    if (oldConsulta.carrera_id && !newConsulta.carreras_interes.includes(oldConsulta.carrera_id)) {
      newConsulta.carreras_interes.push(oldConsulta.carrera_id)
    }
    if (!newConsulta.carreras_interes.includes(updates.carrera_id)) {
      newConsulta.carreras_interes.push(updates.carrera_id)
    }

    console.log(`🎸 Cambio de instrumento detectado: ${oldConsulta.nombre}`)
    console.log(`   → De: ${carreraAnterior?.nombre} → A: ${carreraNueva?.nombre}`)
  }

  // Detectar reasignación
  if (updates.asignado_a !== undefined && oldConsulta.asignado_a !== newConsulta.asignado_a) {
    const oldEnc = store.usuarios.find(u => u.id === oldConsulta.asignado_a)
    const newEnc = store.usuarios.find(u => u.id === newConsulta.asignado_a)
    addActividad(id, userId, 'reasignacion', `Reasignado de ${oldEnc?.nombre || 'Sin asignar'} a ${newEnc?.nombre || 'Sin asignar'}`)

    // Notificar al nuevo encargado
    const lead = store.consultas.find(c => c.id === id)
    crearNotificacion(newConsulta.asignado_a, 'reasignacion', `Te asignaron un lead: ${lead?.nombre}`, id)

    // Si salió de cola, quitarlo
    store.cola_leads = store.cola_leads.filter(c => c.lead_id !== id)
    newConsulta.en_cola = false
  }

  // Detectar cambio de notas
  if (updates.notas !== undefined && oldConsulta.notas !== newConsulta.notas) {
    const preview = newConsulta.notas ? newConsulta.notas.substring(0, 50) + (newConsulta.notas.length > 50 ? '...' : '') : '(vacío)'
    addActividad(id, userId, 'nota_guardada', `Nota: "${preview}"`)
  }

  store.consultas[index] = newConsulta
  saveStore()

  // ========== SYNC CON SUPABASE ==========
  // Calcular TODOS los campos que cambiaron (incluyendo derivados)
  const syncUpdates = { ...updates }

  // Agregar campos derivados que se calcularon internamente
  if (newConsulta.matriculado !== oldConsulta.matriculado) {
    syncUpdates.matriculado = newConsulta.matriculado
  }
  if (newConsulta.descartado !== oldConsulta.descartado) {
    syncUpdates.descartado = newConsulta.descartado
  }
  if (newConsulta.fecha_cierre !== oldConsulta.fecha_cierre) {
    syncUpdates.fecha_cierre = newConsulta.fecha_cierre
  }
  if (newConsulta.fecha_primer_contacto !== oldConsulta.fecha_primer_contacto) {
    syncUpdates.fecha_primer_contacto = newConsulta.fecha_primer_contacto
  }
  if (newConsulta.nuevo_interes !== oldConsulta.nuevo_interes) {
    syncUpdates.nuevo_interes = newConsulta.nuevo_interes
  }
  if (newConsulta.fecha_nuevo_interes !== oldConsulta.fecha_nuevo_interes) {
    syncUpdates.fecha_nuevo_interes = newConsulta.fecha_nuevo_interes
  }
  if (newConsulta.carreras_interes !== oldConsulta.carreras_interes) {
    syncUpdates.carreras_interes = newConsulta.carreras_interes
  }

  syncActualizarLeadDirecto(id, syncUpdates)

  // Notificar a otros navegadores via Broadcast (no depende de pg_publication)
  if (window._admitioChannel) {
    window._admitioChannel.send({
      type: 'broadcast',
      event: 'lead-updated',
      payload: { leadId: id, fields: Object.keys(syncUpdates) }
    }).catch(() => { }) // silenciar errores de broadcast
  }
  // ========================================

  return newConsulta
}

// ============================================
// UPDATE CONSULTA ASYNC - Espera confirmación de Supabase
// ============================================
// Usar esta función para cambios críticos (estado, matriculado, descartado)
export async function updateConsultaAsync(id, updates, userId) {
  const index = store.consultas.findIndex(c => c.id === id)
  if (index === -1) return { success: false, error: 'Lead no encontrado' }

  const oldConsulta = store.consultas[index]
  const newConsulta = { ...oldConsulta, ...updates }

  // Detectar cambio de estado
  if (updates.estado && oldConsulta.estado !== newConsulta.estado) {
    await addActividad(id, userId, 'cambio_estado', `Estado: ${oldConsulta.estado} → ${newConsulta.estado}`)

    // Primer contacto
    if (!oldConsulta.fecha_primer_contacto && newConsulta.estado !== 'nueva') {
      newConsulta.fecha_primer_contacto = new Date().toISOString()
    }

    // Cierre - Matriculado
    if (newConsulta.estado === 'matriculado') {
      newConsulta.fecha_cierre = new Date().toISOString()
      newConsulta.matriculado = true
      await addActividad(id, userId, 'matriculado', '🎉 Lead matriculado exitosamente')
      cancelarRecordatorios(id)
    }

    // Cierre - Descartado
    if (newConsulta.estado === 'descartado') {
      newConsulta.fecha_cierre = new Date().toISOString()
      newConsulta.descartado = true
      await addActividad(id, userId, 'descartado', `Lead descartado: ${updates.motivo_descarte || 'Sin motivo especificado'}`)
      cancelarRecordatorios(id)
    }
  }

  // Detectar cambio de tipo_alumno
  if (updates.tipo_alumno && oldConsulta.tipo_alumno !== newConsulta.tipo_alumno) {
    await addActividad(id, userId, 'cambio_tipo', `Tipo: ${oldConsulta.tipo_alumno || 'nuevo'} → ${newConsulta.tipo_alumno}`)
  }

  // Detectar reasignación
  if (updates.asignado_a && oldConsulta.asignado_a !== newConsulta.asignado_a) {
    const oldEnc = store.usuarios.find(u => u.id === oldConsulta.asignado_a)
    const newEnc = store.usuarios.find(u => u.id === newConsulta.asignado_a)
    await addActividad(id, userId, 'reasignacion', `Reasignado de ${oldEnc?.nombre || 'Sin asignar'} a ${newEnc?.nombre || 'Sin asignar'}`)
  }

  // Detectar cambio de notas
  if (updates.notas !== undefined && oldConsulta.notas !== newConsulta.notas) {
    const preview = newConsulta.notas ? newConsulta.notas.substring(0, 50) + (newConsulta.notas.length > 50 ? '...' : '') : '(vacío)'
    await addActividad(id, userId, 'nota_guardada', `Nota: "${preview}"`)
  }

  // Actualizar store local PRIMERO
  store.consultas[index] = newConsulta
  saveStore()

  // ========== SYNC DIRECTO CON SUPABASE ==========
  // Calcular campos que cambiaron
  const syncUpdates = { ...updates }

  if (newConsulta.matriculado !== oldConsulta.matriculado) {
    syncUpdates.matriculado = newConsulta.matriculado
  }
  if (newConsulta.descartado !== oldConsulta.descartado) {
    syncUpdates.descartado = newConsulta.descartado
  }
  if (newConsulta.fecha_cierre !== oldConsulta.fecha_cierre) {
    syncUpdates.fecha_cierre = newConsulta.fecha_cierre
  }
  if (newConsulta.fecha_primer_contacto !== oldConsulta.fecha_primer_contacto) {
    syncUpdates.fecha_primer_contacto = newConsulta.fecha_primer_contacto
  }

  // SYNC DIRECTO - Esperar respuesta (Ahora secuencial tras la actividad)
  const syncResult = await syncActualizarLeadDirecto(id, syncUpdates)

  if (!syncResult.success) {
    console.error('❌ Error en sync:', syncResult.error)
    // El cambio local ya se hizo, pero el servidor no lo guardó
    return { success: false, error: syncResult.error, lead: newConsulta }
  }

  console.log('✅ Cambio sincronizado correctamente')
  return { success: true, lead: newConsulta }
}

export async function deleteConsulta(id) {
  console.log('🗑️ Eliminando lead:', id)

  // Si es ID local (no UUID), solo eliminar localmente
  if (!id || !id.includes('-') || id.startsWith('c-')) {
    console.log('⚠️ Lead con ID local, eliminando solo localmente')
    store.consultas = store.consultas.filter(c => c.id !== id)
    store.actividad = store.actividad.filter(a => a.lead_id !== id)
    store.recordatorios = store.recordatorios.filter(r => r.lead_id !== id)
    store.cola_leads = store.cola_leads.filter(c => c.lead_id !== id)
    return { success: true }
  }

  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error eliminando lead:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Lead eliminado de Supabase')

    // Eliminar del store local
    store.consultas = store.consultas.filter(c => c.id !== id)
    store.actividad = store.actividad.filter(a => a.lead_id !== id)
    store.recordatorios = store.recordatorios.filter(r => r.lead_id !== id)
    store.cola_leads = store.cola_leads.filter(c => c.lead_id !== id)

    return { success: true }
  } catch (err) {
    console.error('❌ Error:', err)
    return { success: false, error: err.message }
  }
}

// Reactivar un lead descartado
export function reactivarLead(id, userId) {
  const lead = store.consultas.find(c => c.id === id)
  if (!lead || !lead.descartado) return null

  const nuevoLead = createConsulta({
    nombre: lead.nombre,
    email: lead.email,
    telefono: lead.telefono,
    carrera_id: lead.carrera_id,
    medio_id: lead.medio_id,
    tipo_alumno: lead.tipo_alumno,
    notas: `Reactivado. Notas anteriores: ${lead.notas || '-'}`,
    reactivado_de: id
  }, userId)

  addActividad(nuevoLead.id, userId, 'reactivado', `Reactivado desde lead anterior (${lead.nombre})`)

  return nuevoLead
}

// ============================================
// ALGORITMO DE ASIGNACIÓN INTELIGENTE
// ============================================
function asignarLeadInteligente() {
  const encargados = getEncargadosActivos()
  const config = store.config

  if (encargados.length === 0) {
    return { enCola: true, razon: 'sin_encargados' }
  }

  const scores = encargados.map(enc => {
    const metricas = store.metricas_encargados[enc.id] || {
      leads_recibidos_mes: 0,
      tasa_conversion: 0.1,
      tiempo_promedio_primer_contacto_hrs: 5
    }

    // Contar leads activos
    const leadsActivos = store.consultas.filter(c =>
      c.asignado_a === enc.id &&
      !c.matriculado &&
      !c.descartado
    ).length

    // Si está al máximo, score = 0
    const maxLeadsDiarios = config.max_leads_diarios_encargado || 100
    if (leadsActivos >= maxLeadsDiarios) {
      return { userId: enc.id, nombre: enc.nombre, score: 0, razon: 'al_maximo', leadsActivos }
    }

    // Calcular score
    const capacidadDisponible = maxLeadsDiarios - leadsActivos
    const tasaConversion = metricas.tasa_conversion || 0.1
    const rapidez = 1 / (metricas.tiempo_promedio_primer_contacto_hrs || 5)

    const score = (
      capacidadDisponible * 10 +
      tasaConversion * 100 +
      rapidez * 50
    )

    return { userId: enc.id, nombre: enc.nombre, score, capacidadDisponible, leadsActivos }
  })

  // Filtrar disponibles
  const disponibles = scores.filter(s => s.score > 0)

  if (disponibles.length === 0) {
    return { enCola: true, razon: 'todos_al_maximo', scores }
  }

  // Ordenar por score
  disponibles.sort((a, b) => b.score - a.score)
  return { enCola: false, userId: disponibles[0].userId, nombre: disponibles[0].nombre }
}

export function getEstadoAsignacion() {
  const encargados = getEncargadosActivos()
  const config = store.config

  return encargados.map(enc => {
    const leadsActivos = store.consultas.filter(c =>
      c.asignado_a === enc.id &&
      !c.matriculado &&
      !c.descartado
    ).length

    return {
      usuario: enc,
      leadsActivos,
      capacidadMaxima: config.max_leads_diarios_encargado,
      porcentajeOcupacion: Math.round((leadsActivos / config.max_leads_diarios_encargado) * 100),
      disponible: leadsActivos < config.max_leads_diarios_encargado
    }
  })
}

// ============================================
// COLA DE LEADS
// ============================================
export function getColaLeads() {
  return store.cola_leads.map(item => ({
    ...item,
    lead: enrichConsulta(store.consultas.find(c => c.id === item.lead_id))
  })).sort((a, b) => b.prioridad - a.prioridad || new Date(a.created_at) - new Date(b.created_at))
}

export function asignarDesdeColaA(leadId, userId, asignadoPor) {
  const index = store.consultas.findIndex(c => c.id === leadId)
  if (index === -1) return null

  store.consultas[index].asignado_a = userId
  store.consultas[index].en_cola = false
  store.cola_leads = store.cola_leads.filter(c => c.lead_id !== leadId)

  addActividad(leadId, asignadoPor, 'reasignacion', `Asignado desde cola a ${store.usuarios.find(u => u.id === userId)?.nombre}`)
  crearNotificacion(userId, 'nuevo_lead', `Te asignaron un lead desde cola`, leadId)

  saveStore()
  return store.consultas[index]
}

export async function autoAsignarLeadsHuerfanos(userId) {
  console.log('🤖 Iniciando barrido de leads huérfanos...');
  const huerfanos = (store.consultas || []).filter(c =>
    !c.asignado_a &&
    !c.matriculado &&
    !c.descartado &&
    !c.en_cola
  )

  if (huerfanos.length === 0) {
    console.log('✅ No hay leads huérfanos para asignar.');
    return { success: true, count: 0 }
  }

  console.log(`📊 Encontrados ${huerfanos.length} leads huérfanos. Procesando...`);
  let count = 0

  for (const lead of huerfanos) {
    const resultado = asignarLeadInteligente()
    if (!resultado.enCola && resultado.userId) {
      // Actualizar localmente de forma inmediata para que el siguiente del loop vea la carga
      const idx = store.consultas.findIndex(c => c.id === lead.id)
      if (idx !== -1) {
        store.consultas[idx].asignado_a = resultado.userId

        // Disparar sincronización asíncrona (encolada en storeSync por debajo)
        try {
          // Usamos updateConsultaAsync que ya tiene el mutex y los timeouts
          updateConsultaAsync(lead.id, { asignado_a: resultado.userId }, userId)
          count++
        } catch (e) {
          console.error(`❌ Fallo al sincronizar asignación de lead ${lead.id}:`, e)
        }
      }
    }
  }

  if (count > 0) {
    saveStore()
    console.log(`✨ Barrido finalizado: ${count} leads asignados automáticamente.`);
  }

  return { success: true, count }
}

// ============================================
// ACTIVIDAD
// ============================================
export async function addActividad(leadId, userId, tipo, descripcion, metadata = {}) {
  const usuario = store.usuarios.find(u => u.id === userId)
  const actividad = {
    id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    lead_id: leadId,
    user_id: userId,
    user_nombre: usuario?.nombre,
    realizado_por_nombre: usuario?.nombre || 'Sistema',
    tipo,
    accion: descripcion, // Para compatibilidad con UI
    descripcion,
    metadata,
    created_at: new Date().toISOString()
  }

  // 1. Agregar al log global
  if (!store.actividad) store.actividad = []
  store.actividad.push(actividad)

  // 2. Agregar al array .acciones del lead específico si existe en store.consultas
  const leadIndex = store.consultas.findIndex(c => c.id === leadId)
  if (leadIndex !== -1) {
    if (!store.consultas[leadIndex].acciones) {
      store.consultas[leadIndex].acciones = []
    }
    // Agregar al principio (más reciente primero)
    store.consultas[leadIndex].acciones.unshift(actividad)
  }

  // ========== SYNC CON SUPABASE ==========
  syncCrearAccion(leadId, { tipo, descripcion, user_nombre: usuario?.nombre }, userId)
  // ========================================
}

export function getActividad(leadId) {
  return store.actividad
    .filter(a => a.lead_id === leadId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// ============================================
// WHATSAPP
// ============================================
export function registrarIntentoWhatsApp(leadId, userId) {
  const lead = store.consultas.find(c => c.id === leadId)
  if (!lead) return null

  // Actualizar último whatsapp
  const index = store.consultas.findIndex(c => c.id === leadId)
  store.consultas[index].ultimo_whatsapp = new Date().toISOString()

  // Registrar actividad
  addActividad(leadId, userId, 'whatsapp_intento', 'Intento de contacto por WhatsApp')

  // Crear recordatorio para 2 horas después
  const fechaRecordatorio = new Date()
  fechaRecordatorio.setHours(fechaRecordatorio.getHours() + store.config.horas_recordatorio_whatsapp)
  crearRecordatorio(leadId, userId, 'whatsapp_followup', 'Actualizar resultado de contacto WhatsApp', fechaRecordatorio)

  saveStore()

  // Generar URL de WhatsApp
  const telefono = lead.telefono.replace(/\D/g, '')
  const mensaje = encodeURIComponent(`Hola ${lead.nombre}, soy ${store.usuarios.find(u => u.id === userId)?.nombre} de ${store.config?.nombre || 'nuestra institución'}. Me comunico por tu consulta sobre ${lead.carrera?.nombre || 'nuestras carreras'}.`)
  if (!telefono) return null
  return `https://api.whatsapp.com/send?phone=${telefono}&text=${mensaje}`
}

export function registrarResultadoWhatsApp(leadId, userId, resultado) {
  addActividad(leadId, userId, 'whatsapp_resultado', `Resultado WhatsApp: ${resultado}`)

  // Marcar recordatorios de whatsapp como completados
  store.recordatorios = store.recordatorios.map(r => {
    if (r.lead_id === leadId && r.tipo === 'whatsapp_followup' && !r.disparado) {
      return { ...r, disparado: true, resultado }
    }
    return r
  })

  saveStore()
}

// ============================================
// RECORDATORIOS
// ============================================
function crearRecordatorio(leadId, userId, tipo, descripcion, fechaDisparo) {
  store.recordatorios.push({
    id: `rec-${Date.now()}`,
    lead_id: leadId,
    user_id: userId,
    tipo,
    descripcion,
    fecha_disparo: fechaDisparo.toISOString(),
    disparado: false,
    resultado: null,
    created_at: new Date().toISOString()
  })
}

function cancelarRecordatorios(leadId) {
  store.recordatorios = store.recordatorios.map(r => {
    if (r.lead_id === leadId && !r.disparado) {
      return { ...r, disparado: true, resultado: 'cancelado' }
    }
    return r
  })
}

export function getRecordatoriosPendientes(userId = null) {
  const ahora = new Date()
  let recordatorios = store.recordatorios.filter(r =>
    !r.disparado &&
    new Date(r.fecha_disparo) <= ahora
  )

  if (userId) {
    recordatorios = recordatorios.filter(r => r.user_id === userId)
  }

  return recordatorios.map(r => ({
    ...r,
    lead: enrichConsulta(store.consultas.find(c => c.id === r.lead_id))
  }))
}

export function getRecordatoriosFuturos(userId = null) {
  const ahora = new Date()
  let recordatorios = store.recordatorios.filter(r =>
    !r.disparado &&
    new Date(r.fecha_disparo) > ahora
  )

  if (userId) {
    recordatorios = recordatorios.filter(r => r.user_id === userId)
  }

  return recordatorios.map(r => ({
    ...r,
    lead: enrichConsulta(store.consultas.find(c => c.id === r.lead_id))
  })).sort((a, b) => new Date(a.fecha_disparo) - new Date(b.fecha_disparo))
}

export function responderRecordatorio(recordatorioId, resultado) {
  const index = store.recordatorios.findIndex(r => r.id === recordatorioId)
  if (index === -1) return null

  store.recordatorios[index].disparado = true
  store.recordatorios[index].resultado = resultado

  const rec = store.recordatorios[index]
  addActividad(rec.lead_id, rec.user_id, 'recordatorio', `Recordatorio respondido: ${resultado}`)

  saveStore()
  return store.recordatorios[index]
}

// Verificar leads sin avance (simulación de cron job)
export function verificarLeadsSinAvance() {
  const ahora = new Date()
  const diasLimite = store.config.dias_sin_avance_alerta
  const alertas = []

  store.consultas.forEach(lead => {
    if (lead.matriculado || lead.descartado || lead.estado === 'examen_admision') return

    const ultimaActividad = store.actividad
      .filter(a => a.lead_id === lead.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

    if (ultimaActividad) {
      const dias = Math.floor((ahora - new Date(ultimaActividad.created_at)) / (1000 * 60 * 60 * 24))
      if (dias >= diasLimite) {
        // Verificar si ya hay recordatorio pendiente
        const yaExiste = store.recordatorios.some(r =>
          r.lead_id === lead.id &&
          r.tipo === 'sin_avance' &&
          !r.disparado
        )
        if (!yaExiste) {
          crearRecordatorio(lead.id, lead.asignado_a, 'sin_avance', `Lead sin avance hace ${dias} días`, ahora)
          alertas.push(lead)
        }
      }
    }
  })

  saveStore()
  return alertas
}

// ============================================
// NOTIFICACIONES
// ============================================
function crearNotificacion(userId, tipo, mensaje, leadId = null, reporteId = null) {
  // Si es para rol, buscar usuarios con ese rol
  const destinatarios = ROLES[userId]
    ? store.usuarios.filter(u => u.rol_id === userId).map(u => u.id)
    : [userId]

  destinatarios.forEach(destId => {
    store.notificaciones.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: destId,
      tipo,
      mensaje,
      lead_id: leadId,
      reporte_id: reporteId,
      leida: false,
      created_at: new Date().toISOString()
    })
  })
}

export function getNotificaciones(userId) {
  return store.notificaciones
    .filter(n => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export function getNotificacionesNoLeidas(userId) {
  return store.notificaciones.filter(n => n.user_id === userId && !n.leida)
}

export function marcarNotificacionLeida(notifId) {
  const index = store.notificaciones.findIndex(n => n.id === notifId)
  if (index !== -1) {
    store.notificaciones[index].leida = true
    saveStore()
  }
}

export function marcarTodasLeidas(userId) {
  store.notificaciones = store.notificaciones.map(n => {
    if (n.user_id === userId) {
      return { ...n, leida: true }
    }
    return n
  })
  saveStore()
}

// ============================================
// CORREOS
// ============================================
export function getPlantillas() {
  return store.plantillas
}

export function getPlantillaById(id) {
  return store.plantillas.find(p => p.id === id)
}

export function createPlantilla(data) {
  const nueva = {
    id: `tpl-${Date.now()}`,
    ...data,
    activo: true,
    created_at: new Date().toISOString()
  }
  store.plantillas.push(nueva)
  saveStore()
  return nueva
}

export function updatePlantilla(id, updates) {
  const index = store.plantillas.findIndex(p => p.id === id)
  if (index === -1) return null
  store.plantillas[index] = { ...store.plantillas[index], ...updates }
  saveStore()
  return store.plantillas[index]
}

export function deletePlantilla(id) {
  store.plantillas = store.plantillas.filter(p => p.id !== id)
  saveStore()
}

// Enviar correo (simulado)
export function enviarCorreo(leadId, userId, plantillaId, asuntoPersonalizado = null, contenidoPersonalizado = null) {
  const lead = store.consultas.find(c => c.id === leadId)
  const usuario = store.usuarios.find(u => u.id === userId)
  const plantilla = store.plantillas.find(p => p.id === plantillaId)

  if (!lead) return { success: false, error: 'Lead no encontrado' }

  // Reemplazar variables
  let asunto = asuntoPersonalizado || plantilla?.asunto || `Mensaje de ${store.config?.nombre || 'Admisiones'}`
  let contenido = contenidoPersonalizado || plantilla?.contenido || ''

  const variables = {
    '{{nombre}}': lead.nombre,
    '{{email}}': lead.email,
    '{{carrera}}': lead.carrera?.nombre || '',
    '{{encargado}}': usuario?.nombre || '',
    '{{fecha_examen}}': lead.fecha_examen_admision ? formatDateShort(lead.fecha_examen_admision) : '',
    '{{hora_examen}}': lead.fecha_examen_admision ? formatTime(lead.fecha_examen_admision) : '',
  }

  Object.entries(variables).forEach(([key, value]) => {
    asunto = asunto.replace(new RegExp(key, 'g'), value)
    contenido = contenido.replace(new RegExp(key, 'g'), value)
  })

  // Registrar correo
  const correo = {
    id: `email-${Date.now()}`,
    lead_id: leadId,
    user_id: userId,
    plantilla_id: plantillaId,
    asunto,
    contenido,
    destinatario: lead.email,
    estado: 'enviado', // Simulado
    created_at: new Date().toISOString()
  }
  store.correos_enviados.push(correo)

  // Actualizar contador de lead
  const leadIndex = store.consultas.findIndex(c => c.id === leadId)
  store.consultas[leadIndex].emails_enviados = (store.consultas[leadIndex].emails_enviados || 0) + 1

  // Registrar actividad
  addActividad(leadId, userId, 'email_enviado', `Email enviado: "${asunto}"`)

  saveStore()
  return { success: true, correo }
}

export function getCorreosEnviados(leadId = null) {
  let correos = store.correos_enviados
  if (leadId) {
    correos = correos.filter(c => c.lead_id === leadId)
  }
  return correos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// ============================================
// FORMULARIOS
// ============================================
export function getFormularios() {
  return store.formularios || []
}

export function getFormularioById(id) {
  return (store.formularios || []).find(f => f.id === id)
}

export function getFormularioBySlug(slug) {
  return (store.formularios || []).find(f => f.slug === slug)
}

export function createFormulario(data) {
  const nuevo = {
    id: `form-${Date.now()}`, // ID temporal, Supabase generará UUID
    ...data,
    activo: true,
    submissions: 0,
    created_at: new Date().toISOString()
  }
  store.formularios.push(nuevo)
  saveStore()

  // Sincronizar con Supabase
  const institucionId = getInstitucionIdFromStore()
  if (institucionId) {
    syncCrearFormulario(institucionId, nuevo)
  }

  return nuevo
}

export function updateFormulario(id, updates) {
  const index = store.formularios.findIndex(f => f.id === id)
  if (index === -1) return null

  store.formularios[index] = {
    ...store.formularios[index],
    ...updates,
    updated_at: new Date().toISOString()
  }
  saveStore()

  // Sincronizar con Supabase
  syncActualizarFormulario(id, updates)

  return store.formularios[index]
}

export async function deleteFormulario(id) {
  console.log('🗑️ Eliminando formulario:', id)

  // Si es ID local, solo eliminar localmente
  if (!id || !id.includes('-')) {
    store.formularios = store.formularios.filter(f => f.id !== id)
    return { success: true }
  }

  try {
    const { error } = await supabase
      .from('formularios')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error eliminando formulario:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Formulario eliminado de Supabase')

    // Eliminar del store local
    store.formularios = store.formularios.filter(f => f.id !== id)

    return { success: true }
  } catch (err) {
    console.error('❌ Error:', err)
    return { success: false, error: err.message }
  }
}

export function generarEmbedCode(formId) {
  const form = getFormularioById(formId)
  if (!form) return ''

  return `<!-- Formulario Admitio: ${form.nombre} -->
<iframe 
  src="${window.location.origin}/form/${form.slug}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
</iframe>
<!-- Fin Formulario Admitio -->`
}

// ============================================
// MÉTRICAS Y REPORTES
// ============================================

// Calcular tiempo en horas entre dos fechas
function calcularHorasEntre(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return null
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  return Math.round((fin - inicio) / (1000 * 60 * 60) * 10) / 10 // Una decimal
}

// Calcular tiempo en días entre dos fechas
function calcularDiasEntre(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return null
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  return Math.round((fin - inicio) / (1000 * 60 * 60 * 24) * 10) / 10 // Una decimal
}

export function getMetricasGlobales() {
  // Protección: asegurar que store.consultas existe
  if (!store.consultas || !Array.isArray(store.consultas)) {
    console.warn('⚠️ getMetricasGlobales: store.consultas no disponible')
    return {
      total: 0, nuevas: 0, contactados: 0, seguimiento: 0, examen_admision: 0,
      enProceso: 0, matriculados: 0, descartados: 0, enCola: 0,
      alumnos_nuevos: 0, alumnos_antiguos: 0, tasaConversion: 0,
      tasa_conversion: 0, tiempo_respuesta_promedio: 0, tiempo_cierre_promedio: 0
    }
  }

  const leads = store.consultas
  const total = leads.length
  const nuevas = leads.filter(c => c.estado === 'nueva' && !c.matriculado && !c.descartado).length
  const contactados = leads.filter(c => c.estado === 'contactado' && !c.matriculado && !c.descartado).length
  const seguimiento = leads.filter(c => c.estado === 'seguimiento' && !c.matriculado && !c.descartado).length
  const examen_admision = leads.filter(c => c.estado === 'examen_admision' && !c.matriculado && !c.descartado).length
  const enProceso = contactados + seguimiento
  const matriculados = leads.filter(c => c.matriculado).length
  const descartados = leads.filter(c => c.descartado).length
  const enCola = (store.cola_leads || []).length
  const alumnos_nuevos = leads.filter(c => c.tipo_alumno === 'nuevo').length
  const alumnos_antiguos = leads.filter(c => c.tipo_alumno === 'antiguo').length

  // Calcular tiempos promedio REALES
  const leadsConPrimerContacto = leads.filter(c => c.fecha_primer_contacto && c.created_at)
  const tiemposRespuesta = leadsConPrimerContacto.map(c => calcularHorasEntre(c.created_at, c.fecha_primer_contacto))
  const tiempoRespuestaPromedio = tiemposRespuesta.length > 0
    ? Math.round(tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length * 10) / 10
    : 0

  const leadsConCierre = leads.filter(c => c.fecha_cierre && c.created_at && c.matriculado)
  const tiemposCierre = leadsConCierre.map(c => calcularDiasEntre(c.created_at, c.fecha_cierre))
  const tiempoCierrePromedio = tiemposCierre.length > 0
    ? Math.round(tiemposCierre.reduce((a, b) => a + b, 0) / tiemposCierre.length * 10) / 10
    : 0

  return {
    total,
    nuevas,
    contactados,
    seguimiento,
    examen_admision,
    enProceso,
    matriculados,
    descartados,
    enCola,
    alumnos_nuevos,
    alumnos_antiguos,
    tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0,
    tasa_conversion: total > 0 ? Math.round((matriculados / total) * 100) : 0,
    tiempo_respuesta_promedio: tiempoRespuestaPromedio,
    tiempo_cierre_promedio: tiempoCierrePromedio
  }
}

export function getMetricasEncargado(userId) {
  // Protección: asegurar que store.consultas existe
  if (!store.consultas || !Array.isArray(store.consultas)) {
    console.warn('⚠️ getMetricasEncargado: store.consultas no disponible')
    return {
      total: 0, activos: 0, matriculados: 0, descartados: 0, contactarHoy: 0,
      sinContactar: 0, alumnos_nuevos: 0, alumnos_antiguos: 0, tasaConversion: 0,
      tiempoRespuestaPromedio: 0, tiempo_respuesta_promedio: 0,
      tiempoCierrePromedio: 0, tiempo_cierre_promedio: 0
    }
  }

  // Solo leads asignados a este encargado
  const leads = store.consultas.filter(c => c.asignado_a === userId)

  const total = leads.length
  const activos = leads.filter(c => !c.matriculado && !c.descartado).length
  const matriculados = leads.filter(c => c.matriculado).length
  const descartados = leads.filter(c => c.descartado).length

  // Leads que contactar hoy
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)

  const contactarHoy = leads.filter(c => {
    if (c.matriculado || c.descartado) return false
    if (!c.fecha_proximo_contacto) return c.estado === 'nueva'
    const fecha = new Date(c.fecha_proximo_contacto)
    return fecha >= hoy && fecha < manana
  }).length

  // Tiempo de respuesta promedio de ESTE encargado
  const leadsConPrimerContacto = leads.filter(c => c.fecha_primer_contacto && c.created_at)
  const tiemposRespuesta = leadsConPrimerContacto.map(c => calcularHorasEntre(c.created_at, c.fecha_primer_contacto))
  const tiempoRespuestaPromedio = tiemposRespuesta.length > 0
    ? Math.round(tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length * 10) / 10
    : 0

  // Tiempo de cierre promedio de ESTE encargado
  const leadsConCierre = leads.filter(c => c.fecha_cierre && c.created_at && c.matriculado)
  const tiemposCierre = leadsConCierre.map(c => calcularDiasEntre(c.created_at, c.fecha_cierre))
  const tiempoCierrePromedio = tiemposCierre.length > 0
    ? Math.round(tiemposCierre.reduce((a, b) => a + b, 0) / tiemposCierre.length * 10) / 10
    : 0

  // Leads sin contactar (estado nueva)
  const sinContactar = leads.filter(c => c.estado === 'nueva' && !c.matriculado && !c.descartado).length

  // Tipo de alumnos
  const alumnos_nuevos = leads.filter(c => c.tipo_alumno === 'nuevo').length
  const alumnos_antiguos = leads.filter(c => c.tipo_alumno === 'antiguo').length

  return {
    total,
    activos,
    matriculados,
    descartados,
    contactarHoy,
    sinContactar,
    alumnos_nuevos,
    alumnos_antiguos,
    tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0,
    tiempoRespuestaPromedio,
    tiempo_respuesta_promedio: tiempoRespuestaPromedio, // Alias para compatibilidad
    tiempoCierrePromedio,
    tiempo_cierre_promedio: tiempoCierrePromedio // Alias para compatibilidad
  }
}

export function getMetricasPorCarrera() {
  const porCarrera = {}

  store.carreras.forEach(carrera => {
    porCarrera[carrera.id] = {
      carrera: carrera.nombre,
      color: carrera.color,
      total: 0,
      matriculados: 0,
      descartados: 0,
      enProceso: 0
    }
  })

  store.consultas.forEach(lead => {
    if (porCarrera[lead.carrera_id]) {
      porCarrera[lead.carrera_id].total++
      if (lead.matriculado) porCarrera[lead.carrera_id].matriculados++
      else if (lead.descartado) porCarrera[lead.carrera_id].descartados++
      else porCarrera[lead.carrera_id].enProceso++
    }
  })

  return Object.values(porCarrera)
}

export function getMetricasPorMedio() {
  const porMedio = {}

  store.medios.forEach(medio => {
    porMedio[medio.id] = {
      medio: medio.nombre,
      icono: medio.icono,
      color: medio.color,
      total: 0,
      matriculados: 0
    }
  })

  store.consultas.forEach(lead => {
    if (porMedio[lead.medio_id]) {
      porMedio[lead.medio_id].total++
      if (lead.matriculado) porMedio[lead.medio_id].matriculados++
    }
  })

  return Object.values(porMedio)
}

// Métricas por origen de entrada (para estadísticas limpias)
export function getMetricasPorOrigen() {
  const porOrigen = {
    secretaria: { label: 'Secretaría', total: 0, matriculados: 0, descartados: 0 },
    formulario: { label: 'Formulario Web', total: 0, matriculados: 0, descartados: 0 },
    manual: { label: 'Ingreso Manual', total: 0, matriculados: 0, descartados: 0 }
  }

  store.consultas.forEach(lead => {
    const origen = lead.origen_entrada || 'manual'
    if (porOrigen[origen]) {
      porOrigen[origen].total++
      if (lead.matriculado) porOrigen[origen].matriculados++
      if (lead.descartado) porOrigen[origen].descartados++
    }
  })

  return Object.entries(porOrigen).map(([key, value]) => ({
    origen: key,
    ...value,
    tasaConversion: value.total > 0 ? Math.round((value.matriculados / value.total) * 100) : 0
  }))
}

export function getMetricasPorEncargado() {
  const encargados = store.usuarios.filter(u => u.rol_id === 'encargado' && !u.oculto)

  return encargados.map(enc => {
    const leads = store.consultas.filter(c => c.asignado_a === enc.id)
    const matriculados = leads.filter(c => c.matriculado).length
    const descartados = leads.filter(c => c.descartado).length
    const activos = leads.filter(c => !c.matriculado && !c.descartado).length

    // Tiempos de respuesta
    const leadsConPrimerContacto = leads.filter(c => c.fecha_primer_contacto && c.created_at)
    const tiemposRespuesta = leadsConPrimerContacto.map(c => {
      const inicio = new Date(c.created_at)
      const fin = new Date(c.fecha_primer_contacto)
      return (fin - inicio) / (1000 * 60 * 60) // horas
    })
    const tiempoRespuestaPromedio = tiemposRespuesta.length > 0
      ? Math.round(tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length * 10) / 10
      : null

    // Tiempos de cierre (solo matriculados)
    const leadsConCierre = leads.filter(c => c.fecha_cierre && c.created_at && c.matriculado)
    const tiemposCierre = leadsConCierre.map(c => {
      const inicio = new Date(c.created_at)
      const fin = new Date(c.fecha_cierre)
      return (fin - inicio) / (1000 * 60 * 60 * 24) // días
    })
    const tiempoCierrePromedio = tiemposCierre.length > 0
      ? Math.round(tiemposCierre.reduce((a, b) => a + b, 0) / tiemposCierre.length * 10) / 10
      : null

    return {
      id: enc.id,
      encargado: enc.nombre,
      total: leads.length,
      matriculados,
      descartados,
      activos,
      tasaConversion: leads.length > 0 ? Math.round((matriculados / leads.length) * 100) : 0,
      tiempoRespuestaPromedio, // en horas
      tiempoCierrePromedio // en días
    }
  })
}

export function getEmbudoConversion() {
  const estados = ['nueva', 'contactado', 'seguimiento', 'examen_admision', 'matriculado']

  return estados.map(estado => {
    const count = store.consultas.filter(c => {
      if (estado === 'matriculado') return c.matriculado
      if (c.matriculado || c.descartado) return false
      return c.estado === estado
    }).length

    return {
      estado,
      label: ESTADOS[estado]?.label || estado,
      count,
      color: ESTADOS[estado]?.bg || 'bg-gray-100'
    }
  })
}

export function getLeadsContactarHoy(userId = null, rol = null) {
  // Protección: asegurar que store.consultas existe
  if (!store.consultas || !Array.isArray(store.consultas)) {
    console.warn('⚠️ getLeadsContactarHoy: store.consultas no disponible')
    return []
  }

  const ahora = new Date()
  const hace24Horas = new Date(ahora.getTime() - 24 * 60 * 60 * 1000)

  let leads = store.consultas.filter(c => {
    // Excluir cerrados
    if (c.matriculado || c.descartado) return false

    // NUEVO: Leads con nuevo interés (cambio de instrumento) siempre aparecen
    if (c.nuevo_interes) return true

    // Leads en estado "nueva" siempre aparecen (no han sido contactados)
    if (c.estado === 'nueva') return true

    // Para otros estados, verificar si hay actividad en las últimas 24 horas
    const actividadLead = (store.actividad || []).filter(a => a.lead_id === c.id)
    if (actividadLead.length === 0) return true // Sin actividad = mostrar

    // Obtener la última actividad
    const ultimaActividad = actividadLead
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

    const fechaUltimaActividad = new Date(ultimaActividad.created_at)

    // Si la última actividad fue hace más de 24 horas, mostrar
    return fechaUltimaActividad < hace24Horas
  })

  // Filtrar por encargado si aplica
  if (rol === 'encargado' && userId) {
    leads = leads.filter(c => c.asignado_a === userId)
  }

  // Enriquecer y agregar flags
  return leads.map(c => {
    const enriched = enrichConsulta(c)

    // Flag de nuevo interés (cambio de instrumento)
    enriched.nuevoInteres = c.nuevo_interes || false

    // Leads matriculados o descartados NUNCA están atrasados (ya salieron del flujo)
    if (c.matriculado || c.descartado) {
      enriched.atrasado = false
    } else {
      // Calcular si está atrasado (más de 48 horas sin actividad)
      const actividadLead = store.actividad.filter(a => a.lead_id === c.id)
      if (actividadLead.length > 0) {
        const ultimaActividad = actividadLead
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        const hace48Horas = new Date(ahora.getTime() - 48 * 60 * 60 * 1000)
        enriched.atrasado = new Date(ultimaActividad.created_at) < hace48Horas
      } else {
        // Sin actividad registrada, verificar fecha de creación
        const fechaCreacion = new Date(c.created_at)
        const hace48Horas = new Date(ahora.getTime() - 48 * 60 * 60 * 1000)
        enriched.atrasado = fechaCreacion < hace48Horas
      }
    }

    return enriched
  })
}

// ============================================
// CALENDARIO
// ============================================
export function getEventosCalendario(userId = null, mes = null, anio = null) {
  const eventos = []
  const ahora = new Date()
  const mesActual = mes !== null ? mes : ahora.getMonth()
  const anioActual = anio !== null ? anio : ahora.getFullYear()

  // Filtrar leads
  let leads = store.consultas
  if (userId) {
    leads = leads.filter(c => c.asignado_a === userId)
  }

  leads.forEach(lead => {
    // Próximo contacto
    if (lead.fecha_proximo_contacto && !lead.matriculado && !lead.descartado) {
      const fecha = new Date(lead.fecha_proximo_contacto)
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        eventos.push({
          id: `evento-contacto-${lead.id}`,
          tipo: 'contacto',
          titulo: `Contactar: ${lead.nombre}`,
          fecha: lead.fecha_proximo_contacto,
          lead: enrichConsulta(lead),
          color: 'bg-amber-100 text-amber-700'
        })
      }
    }

    // Examen de admisión
    if (lead.fecha_examen_admision && lead.estado === 'examen_admision') {
      const fecha = new Date(lead.fecha_examen_admision)
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        eventos.push({
          id: `evento-examen-${lead.id}`,
          tipo: 'examen',
          titulo: `Examen: ${lead.nombre}`,
          fecha: lead.fecha_examen_admision,
          lead: enrichConsulta(lead),
          color: 'bg-cyan-100 text-cyan-700'
        })
      }
    }
  })

  // Recordatorios
  let recordatorios = store.recordatorios.filter(r => !r.disparado)
  if (userId) {
    recordatorios = recordatorios.filter(r => r.user_id === userId)
  }

  recordatorios.forEach(rec => {
    const fecha = new Date(rec.fecha_disparo)
    if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
      eventos.push({
        id: `evento-rec-${rec.id}`,
        tipo: 'recordatorio',
        titulo: rec.descripcion,
        fecha: rec.fecha_disparo,
        recordatorio: rec,
        lead: enrichConsulta(store.consultas.find(c => c.id === rec.lead_id)),
        color: 'bg-violet-100 text-violet-700'
      })
    }
  })

  return eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
}

// ============================================
// CONFIGURACIÓN
// ============================================
export function getConfig() {
  return store.config
}

export function updateConfig(updates) {
  store.config = { ...store.config, ...updates }
  saveStore()
  return store.config
}

export function getCarreras() {
  return store.carreras
}

export function getCarreraById(id) {
  return store.carreras.find(c => c.id === id)
}

export async function createCarrera(data) {
  console.log('🎓 Creando carrera en Supabase:', data)

  const institucionId = getInstitucionIdFromStore()
  console.log('📍 Institución ID:', institucionId)

  if (!institucionId) {
    console.error('❌ No se puede crear carrera: institucionId es null')
    return { error: 'No hay institución configurada' }
  }

  try {
    const { data: nueva, error } = await supabase
      .from('carreras')
      .insert({
        institucion_id: institucionId,
        nombre: data.nombre,
        color: data.color || 'bg-violet-500',
        activa: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creando carrera en Supabase:', error)
      return { error: error.message }
    }

    console.log('✅ Carrera creada en Supabase:', nueva)

    // Agregar al store local para que se refleje inmediatamente
    store.carreras.push(nueva)

    return nueva
  } catch (err) {
    console.error('❌ Error:', err)
    return { error: err.message }
  }
}

export async function updateCarrera(id, updates) {
  console.log('🎓 Actualizando carrera en Supabase:', id, updates)

  try {
    const supabaseUpdates = {}
    if (updates.nombre !== undefined) supabaseUpdates.nombre = updates.nombre
    if (updates.color !== undefined) supabaseUpdates.color = updates.color
    if (updates.activa !== undefined) supabaseUpdates.activa = updates.activa

    const { data, error } = await supabase
      .from('carreras')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error actualizando carrera:', error)
      return { error: error.message }
    }

    console.log('✅ Carrera actualizada en Supabase:', data)

    // Actualizar en store local
    const index = store.carreras.findIndex(c => c.id === id)
    if (index !== -1) {
      store.carreras[index] = { ...store.carreras[index], ...data }
    }

    return data
  } catch (err) {
    console.error('❌ Error:', err)
    return { error: err.message }
  }
}

export async function deleteCarrera(id) {
  console.log('🗑️ Eliminando carrera de Supabase:', id)

  // Verificar si hay leads usando esta carrera
  const leadsConCarrera = store.consultas.filter(c => c.carrera_id === id)
  if (leadsConCarrera.length > 0) {
    console.warn(`⚠️ No se puede eliminar carrera ${id}: tiene ${leadsConCarrera.length} leads asociados`)
    return { error: 'TIENE_LEADS', count: leadsConCarrera.length }
  }

  try {
    const { error } = await supabase
      .from('carreras')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error eliminando carrera:', error)
      return { error: error.message }
    }

    console.log('✅ Carrera eliminada de Supabase')

    // Eliminar del store local
    store.carreras = store.carreras.filter(c => c.id !== id)

    return { success: true }
  } catch (err) {
    console.error('❌ Error:', err)
    return { error: err.message }
  }
}

export async function importarCarreras(carrerasData) {
  console.log('📥 Importando carreras a Supabase:', carrerasData.length)

  const institucionId = getInstitucionIdFromStore()
  if (!institucionId) {
    console.error('❌ No se puede importar: institucionId es null')
    return { error: 'No hay institución configurada' }
  }

  try {
    const insertData = carrerasData.map(c => ({
      institucion_id: institucionId,
      nombre: c.nombre,
      color: c.color || 'bg-violet-500',
      activa: true
    }))

    const { data, error } = await supabase
      .from('carreras')
      .insert(insertData)
      .select()

    if (error) {
      console.error('❌ Error importando carreras:', error)
      return { error: error.message }
    }

    console.log('✅ Carreras importadas a Supabase:', data.length)

    // Agregar al store local
    store.carreras.push(...data)

    return data
  } catch (err) {
    console.error('❌ Error:', err)
    return { error: err.message }
  }
}

export function getMedios() {
  return store.medios
}

// Confirmar que se contactó al lead por nuevo interés (limpia el flag)
export function confirmarContactoNuevoInteres(leadId, userId) {
  const lead = store.consultas.find(c => c.id === leadId)
  if (!lead || !lead.nuevo_interes) return null

  lead.nuevo_interes = false
  addActividad(leadId, userId, 'contacto_nuevo_interes', '✓ Confirmado contacto por cambio de instrumento')

  saveStore()
  return enrichConsulta(lead)
}

// ============================================
// REGISTRO DE ACCIONES DE CONTACTO
// ============================================
export function registrarAccionContacto(leadId, userId, tipoAccion) {
  const lead = store.consultas.find(c => c.id === leadId)
  if (!lead) return null

  const acciones = {
    llamada: { emoji: '📞', texto: 'Click en Llamar' },
    whatsapp: { emoji: '💬', texto: 'Click en WhatsApp' },
    email: { emoji: '✉️', texto: 'Click en Email' },
    copiar_telefono: { emoji: '📋', texto: 'Copió número de teléfono' },
    copiar_email: { emoji: '📋', texto: 'Copió email' }
  }

  const accion = acciones[tipoAccion]
  if (!accion) return null

  // Registrar en actividad
  addActividad(leadId, userId, 'accion_contacto', `${accion.emoji} ${accion.texto}`)

  // Actualizar timestamp de último contacto según tipo
  if (tipoAccion === 'whatsapp') {
    lead.ultimo_whatsapp = new Date().toISOString()
  }

  saveStore()
  return true
}

// ============================================
// REPORTERÍA AVANZADA
// ============================================
export function getReporteLeads(filtros = {}) {
  const {
    fechaInicio,
    fechaFin,
    estados = [],
    carreras = [],
    medios = [],
    encargados = [],
    tipoAlumno = 'todos',
    userId = null,
    rol = null
  } = filtros

  let leads = [...store.consultas]

  // Filtrar por encargado si no es admin
  if (rol === 'encargado' && userId) {
    leads = leads.filter(c => c.asignado_a === userId)
  }

  // Filtrar por rango de fechas
  if (fechaInicio) {
    const inicio = new Date(fechaInicio)
    inicio.setHours(0, 0, 0, 0)
    leads = leads.filter(c => new Date(c.created_at) >= inicio)
  }
  if (fechaFin) {
    const fin = new Date(fechaFin)
    fin.setHours(23, 59, 59, 999)
    leads = leads.filter(c => new Date(c.created_at) <= fin)
  }

  // Filtrar por estados
  if (estados.length > 0) {
    leads = leads.filter(c => {
      if (estados.includes('matriculado') && c.matriculado) return true
      if (estados.includes('descartado') && c.descartado) return true
      if (!c.matriculado && !c.descartado && estados.includes(c.estado)) return true
      return false
    })
  }

  // Filtrar por carreras
  if (carreras.length > 0) {
    leads = leads.filter(c => carreras.includes(c.carrera_id))
  }

  // Filtrar por medios
  if (medios.length > 0) {
    leads = leads.filter(c => medios.includes(c.medio_id))
  }

  // Filtrar por encargados
  if (encargados.length > 0) {
    leads = leads.filter(c => encargados.includes(c.asignado_a))
  }

  // Filtrar por tipo de alumno
  if (tipoAlumno !== 'todos') {
    leads = leads.filter(c => c.tipo_alumno === tipoAlumno)
  }

  return leads.map(c => enrichConsulta(c))
}

export function getEstadisticasReporte(leads) {
  const total = leads.length
  const matriculados = leads.filter(c => c.matriculado).length
  const descartados = leads.filter(c => c.descartado).length
  const activos = leads.filter(c => !c.matriculado && !c.descartado).length

  // Por estado
  const porEstado = {
    nueva: leads.filter(c => c.estado === 'nueva' && !c.matriculado && !c.descartado).length,
    contactado: leads.filter(c => c.estado === 'contactado' && !c.matriculado && !c.descartado).length,
    seguimiento: leads.filter(c => c.estado === 'seguimiento' && !c.matriculado && !c.descartado).length,
    examen_admision: leads.filter(c => c.estado === 'examen_admision' && !c.matriculado && !c.descartado).length,
    matriculado: matriculados,
    descartado: descartados
  }

  // Por carrera
  const porCarrera = {}
  store.carreras.forEach(carrera => {
    porCarrera[carrera.id] = {
      nombre: carrera.nombre,
      color: carrera.color,
      total: leads.filter(c => c.carrera_id === carrera.id).length,
      matriculados: leads.filter(c => c.carrera_id === carrera.id && c.matriculado).length
    }
  })

  // Por medio
  const porMedio = {}
  store.medios.forEach(medio => {
    porMedio[medio.id] = {
      nombre: medio.nombre,
      total: leads.filter(c => c.medio_id === medio.id).length,
      matriculados: leads.filter(c => c.medio_id === medio.id && c.matriculado).length
    }
  })

  // Por encargado
  const porEncargado = {}
  store.usuarios.filter(u => u.rol_id === 'encargado').forEach(enc => {
    const leadsEnc = leads.filter(c => c.asignado_a === enc.id)
    porEncargado[enc.id] = {
      nombre: enc.nombre,
      total: leadsEnc.length,
      matriculados: leadsEnc.filter(c => c.matriculado).length,
      tasa: leadsEnc.length > 0 ? Math.round((leadsEnc.filter(c => c.matriculado).length / leadsEnc.length) * 100) : 0
    }
  })

  // Por tipo de alumno
  const porTipoAlumno = {
    nuevo: leads.filter(c => c.tipo_alumno === 'nuevo').length,
    antiguo: leads.filter(c => c.tipo_alumno === 'antiguo').length
  }

  // Tiempos promedio
  const leadsConContacto = leads.filter(c => c.fecha_primer_contacto && c.created_at)
  const tiempoRespuestaPromedio = leadsConContacto.length > 0
    ? Math.round(leadsConContacto.reduce((sum, c) => {
      return sum + (new Date(c.fecha_primer_contacto) - new Date(c.created_at)) / (1000 * 60 * 60)
    }, 0) / leadsConContacto.length * 10) / 10
    : 0

  const leadsMatriculados = leads.filter(c => c.fecha_cierre && c.created_at && c.matriculado)
  const tiempoCierrePromedio = leadsMatriculados.length > 0
    ? Math.round(leadsMatriculados.reduce((sum, c) => {
      return sum + (new Date(c.fecha_cierre) - new Date(c.created_at)) / (1000 * 60 * 60 * 24)
    }, 0) / leadsMatriculados.length * 10) / 10
    : 0

  return {
    total,
    matriculados,
    descartados,
    activos,
    tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0,
    porEstado,
    porCarrera,
    porMedio,
    porEncargado,
    porTipoAlumno,
    tiempoRespuestaPromedio,
    tiempoCierrePromedio
  }
}

export function getDatosGraficoTemporal(leads, agrupacion = 'dia') {
  const datos = {}

  leads.forEach(lead => {
    const fecha = new Date(lead.created_at)
    let clave

    if (agrupacion === 'dia') {
      clave = fecha.toISOString().split('T')[0]
    } else if (agrupacion === 'semana') {
      const inicioSemana = new Date(fecha)
      inicioSemana.setDate(fecha.getDate() - fecha.getDay())
      clave = inicioSemana.toISOString().split('T')[0]
    } else if (agrupacion === 'mes') {
      clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    }

    if (!datos[clave]) {
      datos[clave] = { fecha: clave, total: 0, matriculados: 0, descartados: 0 }
    }

    datos[clave].total++
    if (lead.matriculado) datos[clave].matriculados++
    if (lead.descartado) datos[clave].descartados++
  })

  // Convertir a array y ordenar
  return Object.values(datos).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function exportarReporteCSV(leads, incluirDetalles = false) {
  let csv = ''

  // Headers
  const headers = [
    'Nombre',
    'Email',
    'Teléfono',
    'Carrera',
    'Estado',
    'Tipo Alumno',
    'Medio',
    'Encargado',
    'Fecha Ingreso',
    'Fecha Primer Contacto',
    'Fecha Cierre',
    'Matriculado',
    'Descartado'
  ]

  if (incluirDetalles) {
    headers.push('Notas', 'Origen')
  }

  csv += headers.join(',') + '\n'

  // Datos
  leads.forEach(lead => {
    const row = [
      `"${lead.nombre || ''}"`,
      `"${lead.email || ''}"`,
      `"${lead.telefono || ''}"`,
      `"${lead.carrera?.nombre || ''}"`,
      `"${lead.estado || ''}"`,
      `"${lead.tipo_alumno || ''}"`,
      `"${lead.medio?.nombre || ''}"`,
      `"${lead.encargado?.nombre || ''}"`,
      `"${lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-CL') : ''}"`,
      `"${lead.fecha_primer_contacto ? new Date(lead.fecha_primer_contacto).toLocaleDateString('es-CL') : ''}"`,
      `"${lead.fecha_cierre ? new Date(lead.fecha_cierre).toLocaleDateString('es-CL') : ''}"`,
      lead.matriculado ? 'Sí' : 'No',
      lead.descartado ? 'Sí' : 'No'
    ]

    if (incluirDetalles) {
      row.push(
        `"${(lead.notas || '').replace(/"/g, '""')}"`,
        `"${lead.origen_entrada || ''}"`
      )
    }

    csv += row.join(',') + '\n'
  })

  return csv
}

// ============================================
// IMPORTACIÓN DE DATOS (CORREGIDA)
// ============================================

// Función auxiliar: Parsear línea CSV correctamente
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Don't forget the last field
  result.push(current.trim())

  return result
}

// Función principal: Importar leads desde CSV
export function importarLeadsCSV(csvData, userId, mapeoColumnas = {}, opciones = {}) {
  console.log('📥 Iniciando importación de CSV...')

  // Opciones de importación
  const { asignarA = null } = opciones // ID del encargado al que asignar todos los leads

  // Normalizar saltos de línea y filtrar vacías
  const lineas = csvData
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim())

  if (lineas.length < 2) {
    console.error('❌ CSV vacío o sin datos')
    return { success: false, error: 'El archivo está vacío o no tiene datos' }
  }

  // Parsear headers
  const headers = parseCSVLine(lineas[0]).map(h =>
    h.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]/g, '') // Solo alfanumérico
  )

  console.log('📋 Headers detectados:', headers)

  // Mapeo inteligente de columnas
  const findColumn = (keywords) => {
    for (const kw of keywords) {
      const idx = headers.findIndex(h => h.includes(kw))
      if (idx !== -1) return idx
    }
    return -1
  }

  const mapeo = {
    nombre: mapeoColumnas.nombre ?? findColumn(['nombre', 'name', 'contacto', 'cliente']),
    email: mapeoColumnas.email ?? findColumn(['email', 'correo', 'mail']),
    telefono: mapeoColumnas.telefono ?? findColumn(['telefono', 'celular', 'fono', 'movil', 'phone', 'tel']),
    carrera: mapeoColumnas.carrera ?? findColumn(['carrera', 'instrumento', 'curso', 'programa', 'interes']),
    medio: mapeoColumnas.medio ?? findColumn(['medio', 'fuente', 'origen', 'canal', 'source']),
    notas: mapeoColumnas.notas ?? findColumn(['nota', 'comentario', 'observacion', 'detalle', 'mensaje'])
  }

  console.log('🗺️ Mapeo de columnas:', mapeo)

  // DEBUG: Mostrar carreras disponibles
  const carrerasActivas = store.carreras.filter(c => c.activa !== false)
  console.log('🎸 Carreras disponibles para matching:', carrerasActivas.map(c => ({ id: c.id, nombre: c.nombre, activa: c.activa })))

  // Validar que al menos tengamos nombre
  if (mapeo.nombre === -1) {
    return {
      success: false,
      error: 'No se encontró columna de "nombre". Asegúrate de que tu CSV tenga una columna llamada "nombre".'
    }
  }

  const resultados = {
    importados: 0,
    errores: [],
    duplicados: 0,
    detalles: []
  }

  // Procesar cada línea
  for (let i = 1; i < lineas.length; i++) {
    try {
      const valores = parseCSVLine(lineas[i])

      // Extraer valores con validación de índice
      const getValue = (idx) => {
        if (idx === -1 || idx >= valores.length) return ''
        return valores[idx]?.replace(/^["']|["']$/g, '').trim() || ''
      }

      const nombre = getValue(mapeo.nombre)
      const email = getValue(mapeo.email)
      const telefono = getValue(mapeo.telefono)
      const carreraTexto = getValue(mapeo.carrera)
      const medioTexto = getValue(mapeo.medio)
      const notas = getValue(mapeo.notas)

      // Validar nombre
      if (!nombre || nombre.length < 2) {
        resultados.errores.push(`Línea ${i + 1}: Nombre vacío o inválido`)
        continue
      }

      // Verificar duplicado por email o teléfono (más confiable que nombre)
      let esDuplicado = false
      if (email) {
        const existeEmail = store.consultas.find(c =>
          c.email?.toLowerCase() === email.toLowerCase()
        )
        if (existeEmail) {
          esDuplicado = true
          resultados.duplicados++
          resultados.errores.push(`Línea ${i + 1}: Email "${email}" ya existe (${existeEmail.nombre})`)
          continue
        }
      }

      if (telefono && !esDuplicado) {
        const telLimpio = telefono.replace(/\D/g, '')
        if (telLimpio.length >= 8) {
          const existeTel = store.consultas.find(c =>
            c.telefono?.replace(/\D/g, '') === telLimpio
          )
          if (existeTel) {
            esDuplicado = true
            resultados.duplicados++
            resultados.errores.push(`Línea ${i + 1}: Teléfono "${telefono}" ya existe (${existeTel.nombre})`)
            continue
          }
        }
      }

      // Buscar carrera que coincida con matching inteligente
      let carrera_id = null // NO usar default, dejar null si no encuentra
      if (carreraTexto) {
        const carreraTextoNorm = carreraTexto.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
          .trim()

        // Extraer palabra base (primer palabra): "guitarra electrica" -> "guitarra"
        const palabraBase = carreraTextoNorm.split(/\s+/)[0]

        // Filtrar solo carreras activas
        const carrerasActivas = store.carreras.filter(c => c.activa !== false)

        // Ordenar por longitud de nombre (más cortos primero = más genéricos)
        const carrerasOrdenadas = [...carrerasActivas].sort((a, b) => a.nombre.length - b.nombre.length)

        // 1. Primero: coincidencia EXACTA (ignorando case y acentos)
        let carreraEncontrada = carrerasOrdenadas.find(c => {
          const nombreNorm = c.nombre.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .trim()
          return nombreNorm === carreraTextoNorm
        })

        // 2. Si no hay exacta, buscar por palabra base al INICIO del nombre
        // "guitarra" matchea con "Guitarra" pero NO con "Bajo Guitarra"
        if (!carreraEncontrada) {
          carreraEncontrada = carrerasOrdenadas.find(c => {
            const nombreNorm = c.nombre.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            const primeraPalabra = nombreNorm.split(/\s+/)[0]
            return primeraPalabra === palabraBase
          })
        }

        // 3. Si aún no hay, buscar que el nombre EMPIECE con el texto buscado
        if (!carreraEncontrada) {
          carreraEncontrada = carrerasOrdenadas.find(c => {
            const nombreNorm = c.nombre.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            return nombreNorm.startsWith(palabraBase)
          })
        }

        if (carreraEncontrada) {
          carrera_id = carreraEncontrada.id
          console.log(`🎸 Carrera mapeada: "${carreraTexto}" → "${carreraEncontrada.nombre}"`)
        } else {
          console.warn(`⚠️ Carrera no encontrada: "${carreraTexto}"`)
          resultados.errores.push(`Línea ${i + 1}: Carrera "${carreraTexto}" no existe en el sistema`)
        }
      }

      // Si no se encontró carrera, saltar este lead (no usar default)
      if (!carrera_id) {
        console.warn(`⚠️ Línea ${i + 1}: Sin carrera válida, omitiendo`)
        continue
      }

      // Medio: guardar texto directo del CSV
      const medio_id = medioTexto || 'importacion'
      console.log(`📱 Medio: "${medio_id}"`)

      // Crear el lead
      const nuevoLead = createConsulta({
        nombre,
        email: email || '',
        telefono: telefono || '',
        carrera_id,
        medio_id,
        tipo_alumno: 'nuevo',
        notas: notas || 'Importado desde CSV',
        origen_entrada: 'importacion',
        asignado_a: asignarA || null // Asignar al encargado seleccionado
      }, userId, 'keymaster')

      resultados.importados++
      resultados.detalles.push({
        linea: i + 1,
        nombre,
        id: nuevoLead.id
      })

      console.log(`✅ Línea ${i + 1}: ${nombre} importado`)

    } catch (err) {
      console.error(`❌ Error en línea ${i + 1}:`, err)
      resultados.errores.push(`Línea ${i + 1}: Error de formato - ${err.message}`)
    }
  }

  console.log('📊 Resultado importación:', {
    importados: resultados.importados,
    duplicados: resultados.duplicados,
    errores: resultados.errores.length
  })

  // Registrar la importación en el historial
  const usuario = store.usuarios.find(u => u.id === userId)
  const registroImportacion = {
    id: `imp_${Date.now()}`,
    fecha: new Date().toISOString(),
    usuario_id: userId,
    usuario_nombre: usuario?.nombre || 'Sistema',
    archivo: 'CSV importado',
    total_procesados: lineas.length - 1,
    importados: resultados.importados,
    duplicados: resultados.duplicados,
    errores: resultados.errores.length,
    detalles_errores: resultados.errores.slice(0, 10), // Solo primeros 10 errores
    leads_creados: resultados.detalles.map(d => ({ id: d.id, nombre: d.nombre }))
  }

  if (!store.importaciones) {
    store.importaciones = []
  }
  store.importaciones.unshift(registroImportacion) // Agregar al inicio
  saveStore()

  console.log('📝 Importación registrada:', registroImportacion.id)

  return { success: true, ...resultados, registro: registroImportacion }
}

// ============================================
// HELPERS
// ============================================
function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

// ============================================
// HISTORIAL DE IMPORTACIONES
// ============================================
export function getHistorialImportaciones(limite = 20) {
  if (!store.importaciones) {
    store.importaciones = []
  }
  return store.importaciones.slice(0, limite)
}

export function getImportacionById(id) {
  if (!store.importaciones) return null
  return store.importaciones.find(i => i.id === id)
}

export function getEstadisticasImportaciones() {
  if (!store.importaciones || store.importaciones.length === 0) {
    return {
      totalImportaciones: 0,
      totalLeadsImportados: 0,
      totalDuplicados: 0,
      totalErrores: 0,
      ultimaImportacion: null
    }
  }

  return {
    totalImportaciones: store.importaciones.length,
    totalLeadsImportados: store.importaciones.reduce((sum, i) => sum + i.importados, 0),
    totalDuplicados: store.importaciones.reduce((sum, i) => sum + i.duplicados, 0),
    totalErrores: store.importaciones.reduce((sum, i) => sum + i.errores, 0),
    ultimaImportacion: store.importaciones[0]
  }
}

export function eliminarRegistroImportacion(id) {
  if (!store.importaciones) return false
  const idx = store.importaciones.findIndex(i => i.id === id)
  if (idx === -1) return false
  store.importaciones.splice(idx, 1)
  saveStore()
  return true
}

// Importar para uso externo
export { ROLES, ESTADOS, TIPOS_ALUMNO, TIPOS_ACTIVIDAD }

// ============================================
// GESTIÓN DE CAMPAÑAS
// ============================================

export function getCampanas() {
  return store.campanas || []
}

export async function createCampana(data) {
  const institucionId = getInstitucionIdFromStore()
  if (!institucionId) return { error: 'No se pudo obtener el ID de la institución' }

  const newCampana = {
    ...data,
    institucion_id: institucionId,
    activa: true,
    created_at: new Date().toISOString()
  }

  try {
    const { data: created, error } = await supabase
      .from('campanas')
      .insert(newCampana)
      .select()
      .single()

    if (error) throw error

    store.campanas.push(created)
    saveStore()
    return { success: true, campana: created }
  } catch (err) {
    console.error('Error creando campaña:', err)
    return { error: err.message }
  }
}

export async function updateCampana(id, updates) {
  try {
    const { data: updated, error } = await supabase
      .from('campanas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const index = store.campanas.findIndex(c => c.id === id)
    if (index !== -1) {
      store.campanas[index] = updated
      saveStore()
    }
    return { success: true, campana: updated }
  } catch (err) {
    console.error('Error actualizando campaña:', err)
    return { error: err.message }
  }
}

export async function deleteCampana(id) {
  try {
    const { error } = await supabase
      .from('campanas')
      .delete()
      .eq('id', id)

    if (error) throw error

    store.campanas = store.campanas.filter(c => c.id !== id)
    saveStore()
    return { success: true }
  } catch (err) {
    console.error('Error eliminando campaña:', err)
    return { error: err.message }
  }
}
