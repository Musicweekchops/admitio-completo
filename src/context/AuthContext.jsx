import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

// Configuración de roles
const ROLES = {
  superowner: {
    nombre: 'Super Owner',
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: true, reportes: true, formularios: true, crear_leads: true, eliminar_keymaster: true }
  },
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
  
  // Guards para evitar llamadas duplicadas
  const isLoadingUser = React.useRef(false)
  const initialCheckDone = React.useRef(false)

  useEffect(() => {
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

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth event:', event, '| initialCheckDone:', initialCheckDone.current)
        
        // No procesar si estamos en /auth/callback (AuthCallback lo maneja)
        if (window.location.pathname === '/auth/callback') {
          console.log('⏸️ Ignorando evento - AuthCallback lo maneja')
          return
        }
        
        // Ignorar SIGNED_IN durante la carga inicial (checkSession lo maneja)
        if (event === 'SIGNED_IN' && !initialCheckDone.current) {
          console.log('⏸️ Ignorando SIGNED_IN - checkSession lo está manejando')
          return
        }
        
        // Solo procesar SIGNED_IN después de la carga inicial (para login manual)
        if (event === 'SIGNED_IN' && session?.user && initialCheckDone.current) {
          await loadUserFromAuth(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setInstitucion(null)
          localStorage.removeItem('admitio_user')
          localStorage.removeItem('admitio_data')
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  // ========== SISTEMA DE PRESENCIA ==========
  // Heartbeat: actualiza ultimo_activo cada 2 minutos si el usuario está logueado
  useEffect(() => {
    if (!user?.id) return
    
    // Actualizar inmediatamente al cargar
    actualizarPresencia()
    
    // Actualizar cada 2 minutos
    const heartbeatInterval = setInterval(() => {
      actualizarPresencia()
    }, 2 * 60 * 1000) // 2 minutos
    
    // Actualizar en eventos de actividad
    const handleActivity = () => {
      actualizarPresencia()
    }
    
    // Escuchar eventos de actividad (throttled)
    let lastActivity = Date.now()
    const throttledActivity = () => {
      const now = Date.now()
      if (now - lastActivity > 30000) { // Max cada 30 segundos
        lastActivity = now
        handleActivity()
      }
    }
    
    window.addEventListener('click', throttledActivity)
    window.addEventListener('keydown', throttledActivity)
    window.addEventListener('scroll', throttledActivity)
    
    // Marcar offline al cerrar/salir
    const handleBeforeUnload = () => {
      // Usar sendBeacon para enviar antes de cerrar
      if (user?.id && isSupabaseConfigured()) {
        const url = `${supabase.supabaseUrl}/rest/v1/usuarios?id=eq.${user.id}`
        const data = JSON.stringify({ ultimo_activo: new Date(0).toISOString() })
        navigator.sendBeacon(url, data)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('click', throttledActivity)
      window.removeEventListener('keydown', throttledActivity)
      window.removeEventListener('scroll', throttledActivity)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user?.id])
  
  async function actualizarPresencia() {
    if (!user?.id || !isSupabaseConfigured()) return
    
    try {
      await supabase
        .from('usuarios')
        .update({ ultimo_activo: new Date().toISOString() })
        .eq('id', user.id)
    } catch (err) {
      // Silenciar errores de presencia
      console.debug('Error actualizando presencia:', err)
    }
  }
  // ==========================================

  async function checkSession() {
    try {
      // No verificar si estamos en /auth/callback (AuthCallback lo maneja)
      if (window.location.pathname === '/auth/callback') {
        console.log('⏸️ checkSession saltado - AuthCallback lo maneja')
        setLoading(false)
        initialCheckDone.current = true
        return
      }

      if (!isSupabaseConfigured()) {
        console.log('⚠️ Supabase no configurado')
        setLoading(false)
        initialCheckDone.current = true
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await loadUserFromAuth(session.user)
      } else {
        localStorage.removeItem('admitio_user')
        localStorage.removeItem('admitio_data')
        setLoading(false)
      }
    } catch (error) {
      // Ignorar AbortError - ocurre cuando el componente se desmonta (React StrictMode)
      if (error.name === 'AbortError') {
        console.log('⏸️ Solicitud cancelada (normal en desarrollo)')
        return
      }
      console.error('Error checking session:', error)
      setLoading(false)
    } finally {
      // Marcar que la carga inicial terminó
      initialCheckDone.current = true
    }
  }

  async function loadUserFromAuth(authUser) {
    // Guard: evitar llamadas simultáneas
    if (isLoadingUser.current) {
      console.log('⏸️ Ya cargando usuario, ignorando llamada duplicada')
      return
    }
    isLoadingUser.current = true
    
    try {
      console.log('🔍 Cargando usuario:', authUser.email)
      
      // Buscar usuario SIN filtrar por activo para detectar desactivados
      const { data: initialUser, error } = await supabase
        .from('usuarios')
        .select('*, instituciones(id, nombre, tipo, pais, ciudad, region, sitio_web, plan)')
        .eq('auth_id', authUser.id)
        .maybeSingle()

      let usuario = initialUser;

      if (error) {
        // Ignorar AbortError
        if (error.name === 'AbortError') {
          console.log('⏸️ Consulta cancelada (normal en desarrollo)')
          return { success: false, error: 'cancelled' }
        }
        console.error('❌ Error consultando usuario:', error)
        return { success: false, error: 'Error al cargar usuario' }
      }
      
      // Lógica de VINCULACIÓN: Si no se encuentra por auth_id, buscar por email
      if (!usuario) {
        console.log('🔗 Buscando usuario por email para vinculación:', authUser.email)
        const { data: usuarioPorEmail } = await supabase
          .from('usuarios')
          .select('*, instituciones(id, nombre, tipo, pais, ciudad, region, sitio_web, plan)')
          .eq('email', authUser.email)
          .maybeSingle()
        
        if (usuarioPorEmail) {
          console.log('✅ Usuario encontrado por email, vinculando auth_id...')
          // Vincular auth_id para futuras sesiones
          const { data: usuarioVinculado, error: linkError } = await supabase
            .from('usuarios')
            .update({ auth_id: authUser.id })
            .eq('id', usuarioPorEmail.id)
            .select('*, instituciones(id, nombre, tipo, pais, ciudad, region, sitio_web, plan)')
            .single()
          
          if (!linkError) {
            usuario = usuarioVinculado
            console.log('🎊 Usuario vinculado exitosamente')
          }
        }
      }
      
      if (!usuario) {
        console.log('⚠️ Usuario no encontrado en tabla usuarios')
        // Cerrar sesión de Auth si el usuario no existe en nuestra tabla
        await supabase.auth.signOut()
        return { success: false, error: 'Usuario no encontrado' }
      }
      
      // Verificar si está desactivado
      if (!usuario.activo) {
        console.log('🚫 Usuario desactivado:', authUser.email)
        // Cerrar sesión de Auth
        await supabase.auth.signOut()
        return { success: false, error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' }
      }

      const rol = ROLES[usuario.rol] || ROLES.keymaster || ROLES.asistente

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
        permisos: rol.permisos || {}
      }

      setUser(enrichedUser)
      setInstitucion(usuario.instituciones)
      localStorage.setItem('admitio_user', JSON.stringify(enrichedUser))

      await loadInstitucionData(usuario.institucion_id)

      console.log('✅ Usuario cargado:', enrichedUser.nombre)
      return { success: true }
    } catch (error) {
      // Ignorar AbortError - ocurre cuando el componente se desmonta
      if (error.name === 'AbortError') {
        console.log('⏸️ Solicitud cancelada (normal en desarrollo)')
        return { success: false, error: 'cancelled' }
      }
      console.error('Error cargando usuario:', error)
      return { success: false, error: 'Error al cargar usuario' }
    } finally {
      // Siempre resetear el guard y loading
      isLoadingUser.current = false
      setLoading(false)
    }
  }

  // ========== SIGN IN ==========
  async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado. Contacta al administrador.' }
    }

    try {
      console.log('🔐 Iniciando login para:', email)
      
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

      console.log('✅ Login Auth exitoso, verificando estado del usuario...')
      
      // ========== VERIFICAR ESTADO DEL USUARIO ==========
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, activo, email_verificado, rol')
        .eq('auth_id', data.user.id)
        .maybeSingle()
      
      if (userError) {
        console.error('Error verificando usuario:', userError)
        await supabase.auth.signOut()
        return { success: false, error: 'Error al verificar usuario' }
      }
      
      if (!usuario) {
        console.log('⚠️ Usuario no existe en tabla')
        await supabase.auth.signOut()
        return { success: false, error: 'Usuario no encontrado. Contacta al administrador.' }
      }
      
      if (!usuario.activo) {
        console.log('🚫 Usuario desactivado:', email)
        await supabase.auth.signOut()
        return { success: false, error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' }
      }
      // =====================================================
      
      // ========== VERIFICACIÓN DE EMAIL ==========
      if (!usuario.email_verificado) {
        // Si es keymaster (creador de institución) → requiere verificación
        if (usuario.rol === 'keymaster') {
          console.log('🚫 Keymaster sin verificar:', email)
          await supabase.auth.signOut()
          
          // Guardar email para reenvío
          localStorage.setItem('admitio_pending_email', email.toLowerCase().trim())
          
          return { 
            success: false, 
            error: 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
            needsVerification: true,
            email: email.toLowerCase().trim()
          }
        }
        
        // Si es invitado (otro rol) → verificar automáticamente en primer login
        try {
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ email_verificado: true })
            .eq('auth_id', data.user.id)
          
          if (!updateError) {
            console.log('✅ Email verificado automáticamente en primer login (invitado)')
          }
        } catch (verifyErr) {
          console.warn('⚠️ Error en verificación automática:', verifyErr)
        }
      }
      // =====================================================
      
      return { success: true, user: data.user }

    } catch (error) {
      // Ignorar AbortError
      if (error.name === 'AbortError') {
        console.log('⏸️ Login cancelado')
        return { success: false, error: 'Solicitud cancelada, intenta de nuevo' }
      }
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
    
    // Generar código único (slug) a partir del nombre
    const generarCodigo = (str) => {
      return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/[^a-z0-9]/g, '-') // Solo letras y números
        .replace(/-+/g, '-') // Quitar guiones duplicados
        .replace(/^-|-$/g, '') // Quitar guiones al inicio/final
    }
    const codigoInst = generarCodigo(nombreInst)

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
        .eq('codigo', codigoInst)
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
          }
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
          codigo: codigoInst,
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
          email_verificado: false // Requiere verificación
        })

      if (userError) {
        console.error('Error creando usuario:', userError)
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        return { success: false, error: 'Error al crear el usuario. Por favor intenta de nuevo.' }
      }

      // ========== ENVIAR EMAIL DE VERIFICACIÓN ==========
      // Guardamos email para poder reenviar si es necesario
      localStorage.setItem('admitio_pending_email', emailNormalizado)
      
      try {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: emailNormalizado,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        
        if (resendError) {
          console.warn('⚠️ No se pudo enviar email de verificación:', resendError)
        } else {
          console.log('✅ Email de verificación enviado')
        }
      } catch (emailErr) {
        console.warn('⚠️ Error enviando verificación:', emailErr)
      }

      console.log('✅ Cuenta creada:', {
        institucion: nuevaInst.nombre,
        tipo: tipo,
        pais: pais,
        ciudad: ciudad,
        email: emailNormalizado
      })

      // Cerrar sesión para que verifique primero
      await supabase.auth.signOut()

      return { 
        success: true, 
        requiresVerification: true,
        message: 'Cuenta creada. Revisa tu correo para verificar tu email.',
        email: emailNormalizado
      }

    } catch (error) {
      console.error('Error en signup:', error)
      return { success: false, error: error.message || 'Error al crear cuenta' }
    }
  }

  // ========== SIGN OUT ==========
  async function signOut() {
    try {
      if (isSupabaseConfigured()) {
        // Timeout de 3 segundos para signOut
        const signOutPromise = supabase.auth.signOut()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
        await Promise.race([signOutPromise, timeoutPromise]).catch(() => {
          console.warn('⚠️ signOut tardó demasiado, continuando...')
        })
      }
    } catch (error) {
      console.warn('⚠️ Error en signOut:', error)
    } finally {
      // Siempre limpiar estado local
      setUser(null)
      setInstitucion(null)
      localStorage.removeItem('admitio_user')
      localStorage.removeItem('admitio_data')
      localStorage.removeItem('admitio_pending_email')
      console.log('👋 Sesión cerrada')
    }
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
    try {
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('institucion_id', institucionId)
        .order('created_at', { ascending: false })

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('*')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      const { data: carreras } = await supabase
        .from('carreras')
        .select('*')
        .eq('institucion_id', institucionId)
        .eq('activa', true)
        .order('nombre', { ascending: true })

      const { data: formularios } = await supabase
        .from('formularios')
        .select('*')
        .eq('institucion_id', institucionId)
        .order('created_at', { ascending: false })

      const { data: acciones } = await supabase
        .from('acciones_lead')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

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
          updated_at: lead.updated_at
        })),
        usuarios: (usuarios || []).map(u => ({
          id: u.id,
          auth_id: u.auth_id,
          email: u.email,
          nombre: u.nombre,
          rol_id: u.rol,
          activo: u.activo,
          email_verificado: u.email_verificado || false,
          ultimo_activo: u.ultimo_activo,
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
          fecha: a.created_at,
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
        recordatorios: [],
        lastSync: new Date().toISOString(),
        _institucion_id: institucionId
      }

      localStorage.setItem('admitio_data', JSON.stringify(storeData))
      
      // Disparar evento para que el Dashboard recargue
      window.dispatchEvent(new Event('admitio-data-loaded'))
      
      console.log('📦 Datos cargados desde Supabase:', {
        leads: storeData.consultas.length,
        usuarios: storeData.usuarios.length,
        carreras: storeData.carreras.length,
        formularios: storeData.formularios.length
      })

      await loadPlanInfo(institucionId, storeData.consultas.length, storeData.usuarios.length)

    } catch (error) {
      // Ignorar AbortError - ocurre cuando el componente se desmonta
      if (error.name === 'AbortError') {
        console.log('⏸️ Carga de datos cancelada (normal en desarrollo)')
        return
      }
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
      // Ignorar AbortError
      if (error.name === 'AbortError') return
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
      // Ignorar AbortError
      if (error.name === 'AbortError') return false
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

  // ========== INVITE USER ==========
  async function inviteUser({ email, nombre, rol, password }) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'No disponible en modo local' }
    }

    if (!user || !['keymaster', 'superadmin'].includes(user.rol_id)) {
      return { success: false, error: 'No tienes permisos para crear usuarios' }
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
    }

    try {
      console.log('📝 Creando usuario via Edge Function:', email)
      
      // Mapear rol a nombre legible
      const rolesNombres = {
        'keymaster': 'Administrador',
        'rector': 'Rector/Director',
        'encargado': 'Encargado de Admisión',
        'asistente': 'Asistente'
      }
      const rolNombre = rolesNombres[rol] || rol
      
      // ========== LLAMAR A EDGE FUNCTION ==========
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: email.toLowerCase().trim(),
          nombre,
          password,
          rol,
          rol_nombre: rolNombre,
          institucion_id: user.institucion_id,
          institucion_nombre: institucion?.nombre || 'tu institución',
          invitado_por: user.id
        }
      })

      if (error) {
        console.error('Error en Edge Function:', error)
        
        // Intentar obtener el mensaje de error real de la respuesta
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorBody = await error.context.json()
            return { success: false, error: errorBody.error || error.message }
          } catch (e) {
            console.error('Error parsing error body:', e)
          }
        }
        
        return { success: false, error: error.message || 'Error al crear usuario' }
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Error al crear usuario' }
      }

      console.log('✅ Usuario creado via Edge Function:', data.user?.email)

      // Actualizar uso
      actualizarUso('usuarios', 1)

      return {
        success: true,
        message: `Usuario ${nombre} creado exitosamente. Se le envió un email de bienvenida.`
      }

    } catch (error) {
      console.error('Error creando usuario:', error)
      return { success: false, error: error.message || 'Error al crear usuario' }
    }
  }

  async function notifyAssignment(params) {
    if (!isSupabaseConfigured()) return { success: false }
    
    try {
      console.log('📧 Enviando notificación de asignación...')
      const { data, error } = await supabase.functions.invoke('notify-assignment', {
        body: params
      })
      if (error) {
        console.error('Error en notify-assignment:', error)
        return { success: false, error: error.message }
      }
      return { success: true, data }
    } catch (error) {
      console.error('Error in notifyAssignment:', error)
      return { success: false, error: error.message }
    }
  }


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
      inviteUser,
      notifyAssignment,
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
