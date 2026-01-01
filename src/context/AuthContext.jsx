import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { reloadStore } from '../lib/store'

const AuthContext = createContext(null)

// Configuración de roles
const ROLES = {
  superadmin: {
    nombre: 'Super Admin',
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: true, reportes: true, formularios: true, crear_leads: true, eliminar_keymaster: true }
  },
  keymaster: {
    nombre: 'Key Master',
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: true, reportes: true, formularios: true, crear_leads: true }
  },
  encargado: {
    nombre: 'Encargado',
    permisos: { ver_todos: true, editar: true, reasignar: true, reportes: true, crear_leads: true }
  },
  asistente: {
    nombre: 'Asistente',
    permisos: { ver_propios: true, editar: true, crear_leads: true }
  },
  rector: {
    nombre: 'Rector',
    permisos: { ver_todos: true, reportes: true }
  }
}

// Configuración de planes
const PLANES_DEFAULT = {
  free: { nombre: 'Gratis', max_leads: 10, max_usuarios: 1, max_formularios: 1 },
  inicial: { nombre: 'Inicial', max_leads: 300, max_usuarios: 5, max_formularios: 1 },
  profesional: { nombre: 'Profesional', max_leads: 1500, max_usuarios: 15, max_formularios: 3 },
  premium: { nombre: 'Premium', max_leads: 5000, max_usuarios: 50, max_formularios: 10 },
  enterprise: { nombre: 'Enterprise', max_leads: 999999, max_usuarios: 999, max_formularios: 999 },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [institucion, setInstitucion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [planInfo, setPlanInfo] = useState({
    plan: 'free',
    limites: PLANES_DEFAULT.free,
    uso: { leads: 0, usuarios: 0, formularios: 0 }
  })
  
  // Ref para evitar race conditions durante signOut
  const isSigningOut = useRef(false)

  useEffect(() => {
    // Timeout de seguridad - nunca quedarse en loading más de 8 segundos
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Timeout de carga - forzando fin de loading')
        setLoading(false)
      }
    }, 8000)

    // Limpiar datos viejos de localStorage al iniciar
    const oldData = localStorage.getItem('admitio_data')
    if (oldData) {
      try {
        const parsed = JSON.parse(oldData)
        if (parsed.consultas?.some(c => typeof c.id === 'number')) {
          console.log('🧹 Limpiando datos de demostración...')
          localStorage.removeItem('admitio_data')
          localStorage.removeItem('admitio_user')
        }
      } catch (e) {
        localStorage.removeItem('admitio_data')
      }
    }

    checkSession()

    let subscription = null
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth event:', event, '- isSigningOut:', isSigningOut.current)
        
        // Ignorar eventos SIGNED_IN si estamos cerrando sesión
        if (isSigningOut.current) {
          console.log('⏸️ Ignorando evento durante signOut')
          return
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserFromAuth(session.user)
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Evento SIGNED_OUT recibido')
          setUser(null)
          setInstitucion(null)
          localStorage.removeItem('admitio_user')
          localStorage.removeItem('admitio_data')
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refrescado')
        }
      })
      subscription = data.subscription
    }

    return () => {
      clearTimeout(safetyTimeout)
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  async function checkSession() {
    try {
      // No verificar sesión si estamos cerrando sesión
      if (isSigningOut.current) {
        console.log('⏸️ Saltando checkSession - signOut en progreso')
        setLoading(false)
        return
      }
      
      if (!isSupabaseConfigured()) {
        console.log('⚠️ Supabase no configurado')
        setLoading(false)
        return
      }

      // Timeout para getSession
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
      
      // Verificar de nuevo por si signOut se llamó mientras esperábamos
      if (isSigningOut.current) {
        console.log('⏸️ signOut detectado durante checkSession')
        setLoading(false)
        return
      }
      
      if (session?.user) {
        await loadUserFromAuth(session.user)
      } else {
        console.log('ℹ️ No hay sesión activa')
        localStorage.removeItem('admitio_user')
        localStorage.removeItem('admitio_data')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking session:', error)
      // En caso de error, limpiar y permitir login
      localStorage.removeItem('admitio_user')
      localStorage.removeItem('admitio_data')
      setLoading(false)
    }
  }

  async function loadUserFromAuth(authUser) {
    // No cargar usuario si estamos cerrando sesión
    if (isSigningOut.current) {
      console.log('⏸️ Saltando loadUserFromAuth - signOut en progreso')
      return
    }
    
    try {
      console.log('🔍 Buscando usuario con auth_id:', authUser.id)
      
      // Primero buscar por auth_id
      let { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*, instituciones(id, nombre, tipo, pais, ciudad, region, sitio_web, plan)')
        .eq('auth_id', authUser.id)
        .eq('activo', true)
        .single()

      // Si no encuentra por auth_id, buscar por email
      if (error || !usuario) {
        console.log('⚠️ No encontrado por auth_id, buscando por email:', authUser.email)
        
        const { data: usuarioPorEmail, error: errorEmail } = await supabase
          .from('usuarios')
          .select('*, instituciones(id, nombre, tipo, pais, ciudad, region, sitio_web, plan)')
          .eq('email', authUser.email.toLowerCase())
          .eq('activo', true)
          .single()
        
        if (errorEmail || !usuarioPorEmail) {
          console.log('❌ Usuario no encontrado en tabla usuarios por email')
          setLoading(false)
          return
        }
        
        // Actualizar auth_id si no lo tiene
        if (!usuarioPorEmail.auth_id) {
          console.log('📝 Actualizando auth_id del usuario...')
          await supabase
            .from('usuarios')
            .update({ auth_id: authUser.id })
            .eq('id', usuarioPorEmail.id)
        }
        
        usuario = usuarioPorEmail
        console.log('✅ Usuario encontrado por email:', usuario.nombre)
      }

      // Obtener rol con permisos por defecto si no existe
      const rol = ROLES[usuario.rol] || ROLES.encargado
      console.log('👤 Rol:', usuario.rol, '- Permisos:', rol.permisos)

      const enrichedUser = {
        id: usuario.id,
        auth_id: authUser.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol_id: usuario.rol,
        activo: true,
        institucion_id: usuario.institucion_id,
        institucion_nombre: usuario.instituciones?.nombre || 'Mi Institución',
        email_verificado: authUser.email_confirmed_at != null,
        rol: rol,
        permisos: rol.permisos || { editar: true, ver_propios: true, crear_leads: true }
      }

      setUser(enrichedUser)
      setInstitucion(usuario.instituciones)
      localStorage.setItem('admitio_user', JSON.stringify(enrichedUser))

      await loadInstitucionData(usuario.institucion_id)

      console.log('✅ Usuario cargado:', enrichedUser.nombre, '- canEdit:', enrichedUser.permisos?.editar)
    } catch (error) {
      console.error('Error cargando usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  // ========== SIGN IN ==========
  async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado. Contacta al administrador.' }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })

      if (error) {
        console.error('Error en login:', error)
        if (error.message.includes('Invalid login')) {
          return { success: false, error: 'Credenciales inválidas' }
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' }
        }
        return { success: false, error: error.message }
      }

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        return { success: false, error: 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' }
      }

      return { success: true, user: data.user }

    } catch (error) {
      console.error('Error en signIn:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // ========== SIGN UP ==========
  async function signUp({ 
    institucion: nombreInstitucion, 
    tipo,
    pais,
    ciudad,
    region,
    sitioWeb,
    nombre, 
    email, 
    password 
  }) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado. Contacta al administrador.' }
    }

    const emailNormalizado = email.toLowerCase().trim()
    const nombreInst = nombreInstitucion.trim()
    const nombreUsuario = nombre.trim()

    try {
      // ========== VALIDACIONES PREVIAS ==========
      
      if (!nombreInst || nombreInst.length < 3) {
        return { success: false, error: 'El nombre de la institución debe tener al menos 3 caracteres' }
      }
      
      if (!tipo) {
        return { success: false, error: 'Selecciona el tipo de institución' }
      }

      if (!pais) {
        return { success: false, error: 'Selecciona el país' }
      }

      if (!ciudad || ciudad.trim().length < 2) {
        return { success: false, error: 'Ingresa la ciudad' }
      }
      
      if (!nombreUsuario || nombreUsuario.length < 2) {
        return { success: false, error: 'El nombre debe tener al menos 2 caracteres' }
      }

      if (!emailNormalizado || !emailNormalizado.includes('@')) {
        return { success: false, error: 'Email inválido' }
      }

      if (!password || password.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
      }

      // Verificar si la institución ya existe
      const { data: instExistePorCodigo } = await supabase
        .from('instituciones')
        .select('id, nombre')
        .eq('codigo', nombreInst)
        .maybeSingle()

      if (instExistePorCodigo) {
        return { success: false, error: `Ya existe una institución llamada "${instExistePorCodigo.nombre}"` }
      }

      const { data: instExistePorNombre } = await supabase
        .from('instituciones')
        .select('id, nombre')
        .ilike('nombre', nombreInst)
        .maybeSingle()

      if (instExistePorNombre) {
        return { success: false, error: `Ya existe una institución con un nombre similar: "${instExistePorNombre.nombre}"` }
      }

      // Verificar si el email ya existe
      const { data: emailExisteEnUsuarios } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', emailNormalizado)
        .maybeSingle()

      if (emailExisteEnUsuarios) {
        return { success: false, error: 'Este correo electrónico ya está registrado' }
      }

      // ========== CREAR EN SUPABASE AUTH ==========
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailNormalizado,
        password,
        options: {
          data: {
            nombre: nombreUsuario,
            institucion: nombreInst
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        console.error('Error creando auth user:', authError)
        if (authError.message.includes('already registered')) {
          return { success: false, error: 'Este correo electrónico ya está registrado' }
        }
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Error al crear usuario' }
      }

      // ========== CREAR INSTITUCIÓN CON TODOS LOS CAMPOS ==========
      const { data: nuevaInst, error: instError } = await supabase
        .from('instituciones')
        .insert({ 
          nombre: nombreInst, 
          codigo: nombreInst,
          tipo: tipo,
          pais: pais,
          ciudad: ciudad.trim(),
          region: region || null,
          sitio_web: sitioWeb || null,
          plan: 'free', 
          estado: 'activo'
        })
        .select()
        .single()

      if (instError) {
        console.error('Error creando institución:', instError)
        return { success: false, error: 'Error al crear la institución. Por favor contacta soporte.' }
      }

      // ========== CREAR USUARIO ==========
      const { error: userError } = await supabase
        .from('usuarios')
        .insert({
          institucion_id: nuevaInst.id,
          auth_id: authData.user.id,
          email: emailNormalizado,
          nombre: nombreUsuario,
          rol: 'keymaster',
          activo: true,
          email_verificado: false
        })

      if (userError) {
        console.error('Error creando usuario:', userError)
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        return { success: false, error: 'Error al crear el usuario. Por favor intenta de nuevo.' }
      }

      localStorage.setItem('admitio_pending_email', emailNormalizado)

      console.log('✅ Cuenta creada:', {
        institucion: nuevaInst.nombre,
        tipo: tipo,
        pais: pais,
        ciudad: ciudad,
        email: emailNormalizado
      })

      return { 
        success: true, 
        requiresVerification: true,
        message: 'Cuenta creada. Revisa tu correo para verificar tu cuenta.',
        email: emailNormalizado
      }

    } catch (error) {
      console.error('Error en signup:', error)
      return { success: false, error: error.message || 'Error al crear cuenta' }
    }
  }

  // ========== SIGN OUT ==========
  async function signOut() {
    console.log('🚪 Iniciando cierre de sesión...')
    
    // 1. Marcar que estamos cerrando sesión (evita race conditions con onAuthStateChange)
    isSigningOut.current = true
    
    // 2. Limpiar estado de React PRIMERO
    setUser(null)
    setInstitucion(null)
    setLoading(false)
    
    // 3. Limpiar localStorage
    localStorage.removeItem('admitio_user')
    localStorage.removeItem('admitio_data')
    localStorage.removeItem('admitio_pending_email')
    
    // 4. Cerrar sesión en Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut()
        console.log('✅ Sesión cerrada en Supabase')
      } catch (error) {
        console.error('Error en signOut de Supabase:', error)
      }
    }
    
    // 5. Resetear el flag después de un breve delay
    // Esto permite que cualquier evento residual de Supabase sea ignorado
    setTimeout(() => {
      isSigningOut.current = false
      console.log('🔓 Flag isSigningOut reseteado')
    }, 1000)
    
    console.log('👋 Sesión cerrada completamente')
    // La redirección la maneja ProtectedRoute al detectar !isAuthenticated
  }

  // ========== RESET PASSWORD ==========
  async function resetPassword(email) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado' }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: `${window.location.origin}/cambiar-password` }
      )

      if (error) throw error

      return { success: true, message: 'Revisa tu correo para restablecer tu contraseña' }
    } catch (error) {
      console.error('Error en reset password:', error)
      return { success: false, error: error.message }
    }
  }

  // ========== RESEND VERIFICATION ==========
  async function resendVerification(email) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado' }
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      return { success: true, message: 'Email de verificación reenviado' }
    } catch (error) {
      console.error('Error reenviando verificación:', error)
      return { success: false, error: error.message }
    }
  }

  // ========== LOAD INSTITUCION DATA ==========
  async function loadInstitucionData(institucionId) {
    console.log('📥 Cargando datos de institución:', institucionId)
    
    try {
      // Cargar datos en paralelo con timeout
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout cargando datos')), 10000)
      )
      
      const dataPromise = Promise.all([
        supabase.from('leads').select('*').eq('institucion_id', institucionId).order('created_at', { ascending: false }),
        supabase.from('usuarios').select('*').eq('institucion_id', institucionId).eq('activo', true),
        supabase.from('carreras').select('*').eq('institucion_id', institucionId).eq('activa', true).order('nombre', { ascending: true }),
        supabase.from('formularios').select('*').eq('institucion_id', institucionId).order('created_at', { ascending: false }),
        supabase.from('acciones_lead').select('*').order('created_at', { ascending: false }).limit(100)
      ])
      
      const [leadsRes, usuariosRes, carrerasRes, formulariosRes, accionesRes] = await Promise.race([dataPromise, timeout])
      
      const leads = leadsRes.data || []
      const usuarios = usuariosRes.data || []
      const carreras = carrerasRes.data || []
      const formularios = formulariosRes.data || []
      const acciones = accionesRes.data || []

      const storeData = {
        consultas: (leads || []).map(lead => ({
          id: lead.id,
          nombre: lead.nombre,
          email: lead.email,
          telefono: lead.telefono,
          carrera_id: lead.carrera_id,
          carrera_nombre: lead.carrera_nombre,
          medio_id: lead.medio || 'web',
          estado: lead.estado || 'nueva',
          prioridad: lead.prioridad || 'media',
          notas: lead.notas,
          asignado_a: lead.asignado_a,
          creado_por: lead.creado_por,
          created_at: lead.created_at,
          fecha_primer_contacto: lead.fecha_primer_contacto,
          fecha_cierre: lead.fecha_cierre,
          matriculado: lead.matriculado || false,
          descartado: lead.descartado || false,
          updated_at: lead.updated_at,
          tipo_alumno: lead.tipo_alumno || 'nuevo',
          emails_enviados: lead.emails_enviados || 0
        })),
        usuarios: (usuarios || []).map(u => ({
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          rol_id: u.rol,
          activo: u.activo,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}&background=7c3aed&color=fff`
        })),
        carreras: (carreras || []).map(c => ({
          id: c.id,
          nombre: c.nombre,
          color: c.color || 'bg-violet-500',
          activa: c.activa
        })),
        formularios: (formularios || []).map(f => ({
          id: f.id,
          nombre: f.nombre,
          slug: f.slug,
          campos: f.campos || [],
          carrera_default: f.carrera_default,
          activo: f.activo !== false,
          submissions: f.submissions || 0,
          created_at: f.created_at
        })),
        actividad: (acciones || []).map(a => ({
          id: a.id,
          tipo: a.tipo,
          descripcion: a.descripcion,
          created_at: a.created_at,
          usuario_id: a.usuario_id,
          lead_id: a.lead_id
        })),
        medios: [
          { id: 'instagram', nombre: 'Instagram', icono: 'Instagram', color: 'text-pink-500' },
          { id: 'web', nombre: 'Sitio Web', icono: 'Globe', color: 'text-blue-500' },
          { id: 'whatsapp', nombre: 'WhatsApp', icono: 'MessageCircle', color: 'text-green-500' },
          { id: 'telefono', nombre: 'Teléfono', icono: 'Phone', color: 'text-slate-500' },
          { id: 'referido', nombre: 'Referido', icono: 'Users', color: 'text-violet-500' },
          { id: 'facebook', nombre: 'Facebook', icono: 'Facebook', color: 'text-blue-600' },
          { id: 'email', nombre: 'Email', icono: 'Mail', color: 'text-amber-500' },
          { id: 'presencial', nombre: 'Presencial', icono: 'MapPin', color: 'text-emerald-500' },
          { id: 'otro', nombre: 'Otro', icono: 'MoreHorizontal', color: 'text-gray-500' }
        ],
        // Campos adicionales requeridos por el store
        recordatorios: [],
        cola_leads: [],
        notificaciones: [],
        importaciones: [],
        correos_enviados: [],
        plantillas: [],
        metricas_encargados: {},
        config: { nombre: 'Mi Institución' },
        _supabase_sync: true,
        lastSync: new Date().toISOString()
      }

      localStorage.setItem('admitio_data', JSON.stringify(storeData))
      
      // CRÍTICO: Recargar el store en memoria con los nuevos datos
      reloadStore()
      
      console.log('📦 Datos cargados desde Supabase:', {
        leads: storeData.consultas.length,
        usuarios: storeData.usuarios.length,
        carreras: storeData.carreras.length,
        formularios: storeData.formularios.length
      })

      await loadPlanInfo(institucionId, storeData.consultas.length, storeData.usuarios.length)

    } catch (error) {
      console.error('Error cargando datos de institución:', error)
    }
  }

  async function loadPlanInfo(institucionId, leadsCount, usuariosCount) {
    try {
      const { data: inst } = await supabase
        .from('instituciones')
        .select('plan')
        .eq('id', institucionId)
        .single()

      const planId = inst?.plan || 'free'
      const limites = PLANES_DEFAULT[planId] || PLANES_DEFAULT.free

      const { count: formCount } = await supabase
        .from('formularios')
        .select('*', { count: 'exact', head: true })
        .eq('institucion_id', institucionId)

      setPlanInfo({
        plan: planId,
        limites,
        uso: {
          leads: leadsCount,
          usuarios: usuariosCount,
          formularios: formCount || 0
        }
      })

    } catch (error) {
      console.error('Error cargando info del plan:', error)
    }
  }

  function actualizarUso(tipo, delta) {
    setPlanInfo(prev => ({
      ...prev,
      uso: {
        ...prev.uso,
        [tipo]: Math.max(0, (prev.uso[tipo] || 0) + delta)
      }
    }))
  }

  async function reloadFromSupabase() {
    if (!user?.institucion_id || !isSupabaseConfigured()) {
      return false
    }
    
    try {
      await loadInstitucionData(user.institucion_id)
      return true
    } catch (error) {
      console.error('Error recargando:', error)
      return false
    }
  }

  // Helpers
  const puedeCrearLead = () => planInfo.uso.leads < planInfo.limites.max_leads
  const puedeCrearUsuario = () => planInfo.uso.usuarios < planInfo.limites.max_usuarios
  const puedeCrearFormulario = () => planInfo.uso.formularios < planInfo.limites.max_formularios
  const porcentajeUsoLeads = () => Math.round((planInfo.uso.leads / planInfo.limites.max_leads) * 100)
  const porcentajeUsoUsuarios = () => Math.round((planInfo.uso.usuarios / planInfo.limites.max_usuarios) * 100)
  const porcentajeUsoFormularios = () => Math.round((planInfo.uso.formularios / planInfo.limites.max_formularios) * 100)

  // Aliases
  const login = signIn
  const logout = signOut
  const signup = signUp

  // Roles y permisos
  const isSuperAdmin = user?.rol_id === 'superadmin'
  const isKeyMaster = user?.rol_id === 'keymaster' || isSuperAdmin
  const isEncargado = user?.rol_id === 'encargado'
  const isAsistente = user?.rol_id === 'asistente'
  const isRector = user?.rol_id === 'rector'
  
  const canViewAll = user?.permisos?.ver_todos || isSuperAdmin
  const canViewOwn = user?.permisos?.ver_propios
  const canEdit = user?.permisos?.editar || isSuperAdmin
  const canReasignar = user?.permisos?.reasignar || isSuperAdmin
  const canConfig = user?.permisos?.config || isSuperAdmin
  const canManageUsers = user?.permisos?.usuarios || isSuperAdmin
  const canViewReports = user?.permisos?.reportes || isEncargado || isSuperAdmin
  const canManageForms = user?.permisos?.formularios || isSuperAdmin
  const canCreateLeads = user?.permisos?.crear_leads || canEdit
  const canDeleteKeyMaster = user?.permisos?.eliminar_keymaster || isSuperAdmin

  return (
    <AuthContext.Provider value={{
      user,
      institucion,
      loading,
      signIn,
      signOut,
      signUp,
      resetPassword,
      resendVerification,
      reloadFromSupabase,
      login,
      logout,
      signup,
      isAuthenticated: !!user,
      isSuperAdmin,
      isKeyMaster,
      isEncargado,
      isAsistente,
      isRector,
      canViewAll,
      canViewOwn,
      canEdit,
      canReasignar,
      canConfig,
      canManageUsers,
      canViewReports,
      canManageForms,
      canCreateLeads,
      canDeleteKeyMaster,
      planInfo,
      actualizarUso,
      puedeCrearLead,
      puedeCrearUsuario,
      puedeCrearFormulario,
      porcentajeUsoLeads,
      porcentajeUsoUsuarios,
      porcentajeUsoFormularios,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
