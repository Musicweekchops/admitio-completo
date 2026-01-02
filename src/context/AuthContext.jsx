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
  
  // Refs para evitar race conditions
  const isSigningOut = useRef(false)
  const isLoggingIn = useRef(false)  // Nuevo: evita doble carga en login
  const currentAuthId = useRef(null) // Nuevo: trackea el auth_id actual

  useEffect(() => {
    let mounted = true // Para evitar updates en componente desmontado
    
    // Timeout de seguridad - nunca quedarse en loading más de 10 segundos
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Timeout de carga - forzando fin de loading')
        setLoading(false)
      }
    }, 10000)

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

    // Solo verificar sesión inicial UNA VEZ
    if (!currentAuthId.current) {
      checkSession()
    } else {
      setLoading(false)
    }

    let subscription = null
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return // Componente desmontado
        
        console.log('🔔 Auth event:', event, {
          isSigningOut: isSigningOut.current,
          isLoggingIn: isLoggingIn.current,
          hasUser: !!currentAuthId.current
        })
        
        // REGLA 1: Ignorar TODO durante signOut
        if (isSigningOut.current) {
          console.log('⏸️ Ignorando evento - signOut en progreso')
          return
        }
        
        // REGLA 2: Ignorar SIGNED_IN si login está manejándolo
        if (event === 'SIGNED_IN' && isLoggingIn.current) {
          console.log('⏸️ Ignorando SIGNED_IN - signIn() lo maneja')
          return
        }
        
        // REGLA 3: Ignorar si ya tenemos este usuario
        if (event === 'SIGNED_IN' && session?.user && currentAuthId.current === session.user.id) {
          console.log('⏸️ Usuario ya cargado:', session.user.id.slice(0, 8))
          return
        }
        
        // REGLA 4: Solo procesar eventos válidos
        if (event === 'SIGNED_IN' && session?.user) {
          // Solo cargar si no hay usuario actual (caso de refresh de página)
          if (!currentAuthId.current) {
            console.log('📥 onAuthStateChange: Nueva sesión detectada')
            await loadUserFromAuth(session.user)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 SIGNED_OUT recibido')
          currentAuthId.current = null
          if (mounted) {
            setUser(null)
            setInstitucion(null)
            setLoading(false)
          }
          localStorage.removeItem('admitio_user')
          localStorage.removeItem('admitio_data')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refrescado automáticamente')
        } else if (event === 'INITIAL_SESSION') {
          // Solo procesar si no estamos en proceso de login y no hay usuario
          if (!isLoggingIn.current && !currentAuthId.current) {
            if (session?.user) {
              console.log('📥 INITIAL_SESSION: Restaurando sesión...')
              await loadUserFromAuth(session.user)
            } else {
              console.log('ℹ️ INITIAL_SESSION: Sin sesión')
              if (mounted) setLoading(false)
            }
          }
        }
      })
      subscription = data.subscription
    }

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  async function checkSession() {
    try {
      // No verificar si ya hay un proceso en curso
      if (isSigningOut.current || isLoggingIn.current) {
        console.log('⏸️ checkSession saltado - operación en progreso')
        return
      }
      
      // No verificar si ya tenemos usuario
      if (currentAuthId.current) {
        console.log('⏸️ checkSession saltado - usuario ya cargado')
        setLoading(false)
        return
      }
      
      if (!isSupabaseConfigured()) {
        console.log('⚠️ Supabase no configurado')
        setLoading(false)
        return
      }

      console.log('🔍 checkSession: Verificando sesión existente...')

      // Timeout para getSession
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
      
      // Verificar de nuevo por si algo cambió mientras esperábamos
      if (isSigningOut.current || isLoggingIn.current || currentAuthId.current) {
        console.log('⏸️ checkSession cancelado - estado cambió')
        setLoading(false)
        return
      }
      
      if (session?.user) {
        console.log('✅ checkSession: Sesión encontrada, cargando usuario...')
        await loadUserFromAuth(session.user)
      } else {
        console.log('ℹ️ checkSession: No hay sesión activa')
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
    // GUARD 1: No cargar si estamos cerrando sesión
    if (isSigningOut.current) {
      console.log('⏸️ loadUserFromAuth cancelado - signOut en progreso')
      return false
    }
    
    // GUARD 2: No cargar si ya tenemos este usuario
    if (currentAuthId.current === authUser.id) {
      console.log('⏸️ loadUserFromAuth cancelado - usuario ya cargado:', authUser.id.slice(0, 8))
      return true // Ya está cargado, considerarlo éxito
    }
    
    try {
      console.log('🔍 loadUserFromAuth: Buscando usuario con auth_id:', authUser.id.slice(0, 8))
      
      // Marcar este auth_id como "en proceso" para evitar cargas paralelas
      const processingId = authUser.id
      
      // Buscar usuario SIN JOIN (evita problemas de RLS)
      let { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', authUser.id)
        .eq('activo', true)
        .single()

      // Si no encuentra por auth_id, buscar por email
      if (error || !usuario) {
        console.log('⚠️ No encontrado por auth_id, buscando por email:', authUser.email)
        
        const { data: usuarioPorEmail, error: errorEmail } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', authUser.email.toLowerCase())
          .eq('activo', true)
          .single()
        
        if (errorEmail || !usuarioPorEmail) {
          console.log('❌ Usuario no encontrado en tabla usuarios')
          setLoading(false)
          return false
        }
        
        // Actualizar auth_id si no lo tiene
        if (!usuarioPorEmail.auth_id) {
          console.log('🔗 Vinculando auth_id al usuario existente...')
          await supabase
            .from('usuarios')
            .update({ auth_id: authUser.id })
            .eq('id', usuarioPorEmail.id)
        }
        
        usuario = usuarioPorEmail
      }

      // Verificar que seguimos queriendo cargar este usuario
      if (isSigningOut.current || (currentAuthId.current && currentAuthId.current !== processingId)) {
        console.log('⏸️ loadUserFromAuth cancelado - estado cambió durante carga')
        return false
      }

      // Cargar institución por separado (más robusto)
      let institucionData = null
      if (usuario.institucion_id) {
        const { data: inst } = await supabase
          .from('instituciones')
          .select('id, nombre, tipo, pais, ciudad, region, sitio_web, plan')
          .eq('id', usuario.institucion_id)
          .single()
        
        institucionData = inst
      }

      console.log('👤 Rol:', usuario.rol, '- Permisos:', ROLES[usuario.rol]?.permisos || {})

      // Crear usuario enriquecido
      const enrichedUser = {
        id: usuario.id,
        auth_id: authUser.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol_id: usuario.rol,
        activo: true,
        institucion_id: usuario.institucion_id,
        institucion_nombre: institucionData?.nombre || 'Mi Institución',
        rol: ROLES[usuario.rol] || ROLES.encargado,
        permisos: ROLES[usuario.rol]?.permisos || {}
      }

      // Actualizar refs ANTES de setear estado
      currentAuthId.current = authUser.id

      setUser(enrichedUser)
      setInstitucion(institucionData)
      localStorage.setItem('admitio_user', JSON.stringify(enrichedUser))

      // Cargar datos de la institución
      await loadInstitucionData(usuario.institucion_id)

      console.log('✅ Usuario cargado:', enrichedUser.nombre)
      return true

    } catch (error) {
      console.error('❌ Error cargando usuario:', error)
      setLoading(false)
      return false
    }
  }

  // ========== SIGN IN ==========
  async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado. Contacta al administrador.' }
    }

    // Marcar que estamos en proceso de login
    isSigningOut.current = false
    isLoggingIn.current = true
    // NO llamar setLoading(true) aquí - el componente Login maneja su propio loading
    
    try {
      console.log('🔐 signIn: Iniciando...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })

      if (error) {
        console.error('❌ signIn: Error de autenticación:', error.message)
        isLoggingIn.current = false
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
        isLoggingIn.current = false
        return { success: false, error: 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' }
      }

      // Ahora sí ponemos loading porque vamos a cargar datos
      setLoading(true)
      
      // Cargar usuario y datos de institución
      console.log('🔄 signIn: Cargando usuario y datos...')
      const loadResult = await loadUserFromAuth(data.user)
      
      if (!loadResult) {
        console.error('❌ signIn: Falló la carga del usuario')
        isLoggingIn.current = false
        setLoading(false)
        return { success: false, error: 'Error al cargar datos del usuario. Verifica que tu cuenta esté activa.' }
      }
      
      // Verificar que el usuario está correctamente cargado
      if (!currentAuthId.current) {
        console.error('❌ signIn: Usuario no se cargó correctamente')
        isLoggingIn.current = false
        setLoading(false)
        return { success: false, error: 'Error al cargar datos del usuario' }
      }
      
      isLoggingIn.current = false
      console.log('✅ signIn: Completado exitosamente')
      return { success: true, user: data.user }

    } catch (error) {
      console.error('❌ signIn: Error inesperado:', error)
      isLoggingIn.current = false
      setLoading(false)
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

      // Generar código único para la institución
      const generarCodigo = (nombre) => {
        return nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remover acentos
          .replace(/[^a-z0-9\s]/g, '') // Solo alfanuméricos
          .replace(/\s+/g, '-') // Espacios a guiones
          .substring(0, 50) // Limitar largo
      }
      
      const codigoBase = generarCodigo(nombreInst)
      const codigoUnico = `${codigoBase}-${Date.now().toString(36)}`

      // Verificar si la institución ya existe por nombre exacto o similar
      console.log('🔍 Verificando si existe institución:', nombreInst)
      
      // Búsqueda por nombre exacto (case-insensitive)
      const { data: instExacta, error: errorExacta } = await supabase
        .from('instituciones')
        .select('id, nombre')
        .ilike('nombre', nombreInst)
        .limit(1)

      if (!errorExacta && instExacta && instExacta.length > 0) {
        return { success: false, error: `Ya existe una institución llamada "${instExacta[0].nombre}"` }
      }

      // Búsqueda por nombre similar (contiene)
      const { data: instSimilar, error: errorSimilar } = await supabase
        .from('instituciones')
        .select('id, nombre')
        .ilike('nombre', `%${nombreInst}%`)
        .limit(1)

      if (!errorSimilar && instSimilar && instSimilar.length > 0) {
        return { success: false, error: `Ya existe una institución con un nombre similar: "${instSimilar[0].nombre}"` }
      }

      // Verificar si el email ya existe en usuarios
      console.log('🔍 Verificando si existe email:', emailNormalizado)
      
      const { data: emailExiste, error: errorEmail } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', emailNormalizado)
        .limit(1)

      if (!errorEmail && emailExiste && emailExiste.length > 0) {
        return { success: false, error: 'Este correo electrónico ya está registrado' }
      }

      // ========== PASO 1: CREAR INSTITUCIÓN PRIMERO ==========
      // La creamos antes del auth.user para tener el ID disponible
      console.log('🏢 Creando institución...')
      const { data: nuevaInst, error: instError } = await supabase
        .from('instituciones')
        .insert({ 
          nombre: nombreInst, 
          codigo: codigoUnico,
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

      // ========== PASO 2: CREAR EN SUPABASE AUTH ==========
      // Guardamos todos los datos necesarios en metadata para crear el usuario después de verificar
      console.log('📝 Creando usuario en Auth...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailNormalizado,
        password,
        options: {
          data: {
            nombre: nombreUsuario,
            institucion_id: nuevaInst.id,
            institucion_nombre: nombreInst,
            rol: 'keymaster'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        console.error('Error creando auth user:', authError)
        // Rollback: eliminar la institución creada
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        
        if (authError.message.includes('already registered')) {
          return { success: false, error: 'Este correo electrónico ya está registrado' }
        }
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        // Rollback: eliminar la institución creada
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        return { success: false, error: 'Error al crear usuario' }
      }

      // ========== NO CREAMOS EN TABLA USUARIOS AQUÍ ==========
      // El registro en tabla 'usuarios' se creará en AuthCallback después de verificar email
      // Esto evita problemas de FK y mantiene la BD limpia (solo usuarios verificados)

      localStorage.setItem('admitio_pending_email', emailNormalizado)
      localStorage.setItem('admitio_pending_institucion_id', nuevaInst.id)

      console.log('✅ Signup iniciado:', {
        institucion: nuevaInst.nombre,
        institucion_id: nuevaInst.id,
        email: emailNormalizado,
        pendiente: 'verificación de email'
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
    
    // 1. Marcar que estamos cerrando sesión
    isSigningOut.current = true
    isLoggingIn.current = false
    currentAuthId.current = null
    
    // 2. Limpiar estado de React
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
    
    // 5. Resetear el flag después de un delay
    setTimeout(() => {
      isSigningOut.current = false
      console.log('🔓 Flag isSigningOut reseteado')
    }, 1000)
    
    console.log('👋 Sesión cerrada completamente')
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

  // ========== INVITE USER (Para KeyMaster) ==========
  async function inviteUser({ nombre, email, rol, institucionId }) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado' }
    }

    const emailLower = email.toLowerCase().trim()
    
    try {
      console.log('📨 Invitando usuario:', emailLower)
      
      // 1. Verificar que el email no exista ya en la institución
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('email', emailLower)
        .eq('institucion_id', institucionId)
        .single()
      
      if (existingUser) {
        return { success: false, error: 'Ya existe un usuario con ese email en tu institución' }
      }

      // 2. Generar contraseña temporal segura (el usuario la cambiará)
      const tempPassword = crypto.randomUUID().slice(0, 16) + 'Aa1!'
      
      // 3. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLower,
        password: tempPassword,
        options: {
          data: {
            nombre: nombre,
            rol: rol,
            institucion_id: institucionId,
            invited: true
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        console.error('❌ Error creando usuario en Auth:', authError)
        // Si el usuario ya existe en Auth pero no en nuestra tabla
        if (authError.message.includes('already registered')) {
          return { success: false, error: 'Este email ya está registrado en el sistema. El usuario debe usar "Olvidé mi contraseña" para recuperar acceso.' }
        }
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'No se pudo crear el usuario' }
      }

      console.log('✅ Usuario creado en Auth:', authData.user.id)

      // 4. Crear registro en tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          auth_id: authData.user.id,
          institucion_id: institucionId,
          nombre: nombre,
          email: emailLower,
          rol: rol,
          activo: true,
          invitado_por: user?.id,
          fecha_invitacion: new Date().toISOString(),
          password_pendiente: true
        })
        .select()
        .single()

      if (usuarioError) {
        console.error('❌ Error creando registro de usuario:', usuarioError)
        // Intentar limpiar el usuario de Auth si falla la tabla
        // (No siempre es posible sin admin API)
        return { success: false, error: 'Error al crear el usuario: ' + usuarioError.message }
      }

      console.log('✅ Usuario creado en tabla usuarios:', usuarioData.id)

      // 5. Enviar email de establecer contraseña
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        emailLower,
        { redirectTo: `${window.location.origin}/establecer-password` }
      )

      if (resetError) {
        console.warn('⚠️ Usuario creado pero falló envío de email:', resetError)
        // No fallar, el usuario está creado
      }

      return { 
        success: true, 
        message: `Invitación enviada a ${emailLower}. El usuario recibirá un email para establecer su contraseña.`,
        usuario: usuarioData
      }

    } catch (error) {
      console.error('❌ Error en inviteUser:', error)
      return { success: false, error: 'Error al invitar usuario: ' + error.message }
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
      inviteUser,
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
