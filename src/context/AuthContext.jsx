// ============================================
// ADMITIO - AuthContext Simplificado
// src/context/AuthContext.jsx
// Versión robusta sin race conditions
// ============================================

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ========== ROLES Y PERMISOS ==========
const ROLES = {
  superadmin: {
    nombre: 'Super Admin',
    nivel: 100,
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: true, eliminar: true }
  },
  keymaster: {
    nombre: 'Key Master',
    nivel: 90,
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: true, eliminar: true }
  },
  admin: {
    nombre: 'Administrador',
    nivel: 80,
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: false, eliminar: false }
  },
  encargado: {
    nombre: 'Encargado',
    nivel: 50,
    permisos: { ver_todos: false, editar: true, reasignar: false, config: false, usuarios: false, eliminar: false, ver_propios: true, crear_leads: true }
  },
  viewer: {
    nombre: 'Solo Lectura',
    nivel: 10,
    permisos: { ver_todos: true, editar: false, reasignar: false, config: false, usuarios: false, eliminar: false }
  }
}

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [institucion, setInstitucion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // ========== INICIALIZACIÓN ==========
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase no configurado')
      setLoading(false)
      return
    }

    // Verificar si estamos en /auth/callback - dejar que esa página maneje todo
    if (window.location.pathname === '/auth/callback') {
      console.log('📍 En /auth/callback - esperando procesamiento')
      setLoading(false)
      return
    }

    let mounted = true

    // Listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth event:', event, { hasSession: !!session })

      if (!mounted) return

      // Ignorar eventos mientras estamos en callback
      if (window.location.pathname === '/auth/callback') {
        return
      }

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setInstitucion(null)
        setDataLoaded(false)
        setLoading(false)
        return
      }

      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        await loadUserData(session.user)
      }
    })

    // Verificar sesión inicial
    checkInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ========== VERIFICAR SESIÓN INICIAL ==========
  async function checkInitialSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        console.log('✅ Sesión existente encontrada')
        await loadUserData(session.user)
      } else {
        console.log('ℹ️ No hay sesión activa')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error verificando sesión:', error)
      setLoading(false)
    }
  }

  // ========== CARGAR DATOS DEL USUARIO ==========
  async function loadUserData(authUser) {
    try {
      console.log('🔍 Cargando datos para:', authUser.email)

      // Buscar usuario en nuestra tabla
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', authUser.id)
        .eq('activo', true)
        .maybeSingle()

      if (error) {
        console.error('Error buscando usuario:', error)
        setLoading(false)
        return false
      }

      // Si no existe por auth_id, buscar por email
      let userData = usuario
      if (!userData) {
        console.log('⚠️ No encontrado por auth_id, buscando por email...')
        const { data: usuarioEmail } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', authUser.email.toLowerCase())
          .eq('activo', true)
          .maybeSingle()

        if (usuarioEmail) {
          // Vincular auth_id
          await supabase
            .from('usuarios')
            .update({ auth_id: authUser.id })
            .eq('id', usuarioEmail.id)
          
          userData = usuarioEmail
        }
      }

      if (!userData) {
        console.log('❌ Usuario no encontrado en BD')
        setLoading(false)
        return false
      }

      // Cargar institución
      let institucionData = null
      if (userData.institucion_id) {
        const { data: inst } = await supabase
          .from('instituciones')
          .select('*')
          .eq('id', userData.institucion_id)
          .single()
        
        institucionData = inst
      }

      // Crear objeto de usuario enriquecido
      const rol = ROLES[userData.rol] || ROLES.encargado
      const enrichedUser = {
        id: userData.id,
        auth_id: authUser.id,
        email: userData.email,
        nombre: userData.nombre,
        rol_id: userData.rol,
        activo: true,
        institucion_id: userData.institucion_id,
        institucion_nombre: institucionData?.nombre || 'Mi Institución',
        rol: rol,
        permisos: rol.permisos
      }

      console.log('✅ Usuario cargado:', enrichedUser.nombre)

      setUser(enrichedUser)
      setInstitucion(institucionData)
      
      // Cargar datos adicionales de la institución
      await loadInstitucionData(userData.institucion_id)
      
      setLoading(false)
      return true

    } catch (error) {
      console.error('Error cargando usuario:', error)
      setLoading(false)
      return false
    }
  }

  // ========== CARGAR DATOS DE LA INSTITUCIÓN ==========
  async function loadInstitucionData(institucionId) {
    if (!institucionId) return

    try {
      console.log('📦 Cargando datos de institución...')

      const [leadsRes, usuariosRes, carrerasRes, formulariosRes] = await Promise.all([
        supabase.from('leads').select('*').eq('institucion_id', institucionId),
        supabase.from('usuarios').select('*').eq('institucion_id', institucionId).eq('activo', true),
        supabase.from('carreras').select('*').eq('institucion_id', institucionId),
        supabase.from('formularios').select('*').eq('institucion_id', institucionId)
      ])

      // Guardar en localStorage en el formato que espera el store
      const storeData = {
        consultas: leadsRes.data || [],
        usuarios: usuariosRes.data || [],
        carreras: carrerasRes.data || [],
        formularios: formulariosRes.data || [],
        actividad: [],
        medios: [],
        plantillas: [],
        config: { nombre: institucion?.nombre || 'Mi Institución' },
        metricas_encargados: {},
        recordatorios: [],
        cola_leads: [],
        correos_enviados: [],
        notificaciones: [],
        importaciones: [],
        _supabase_sync: true
      }

      localStorage.setItem('admitio_data', JSON.stringify(storeData))
      localStorage.setItem('admitio_version', '2.7')

      // Disparar evento para que el store se recargue
      window.dispatchEvent(new Event('admitio-data-loaded'))

      setDataLoaded(true)
      console.log('✅ Datos cargados y guardados:', {
        leads: leadsRes.data?.length || 0,
        usuarios: usuariosRes.data?.length || 0,
        carreras: carrerasRes.data?.length || 0,
        formularios: formulariosRes.data?.length || 0
      })

    } catch (error) {
      console.error('Error cargando datos de institución:', error)
    }
  }

  // ========== SIGN IN ==========
  async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado' }
    }

    try {
      console.log('🔐 Iniciando login...')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })

      if (error) {
        console.error('Error en login:', error)
        return { success: false, error: 'Credenciales inválidas' }
      }

      // onAuthStateChange manejará la carga del usuario
      console.log('✅ Login exitoso')
      return { success: true }

    } catch (error) {
      console.error('Error inesperado en login:', error)
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
      return { success: false, error: 'Sistema no configurado' }
    }

    const emailNormalizado = email.toLowerCase().trim()
    const nombreInst = nombreInstitucion.trim()
    const nombreUsuario = nombre.trim()

    try {
      // Validaciones
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
      if (!emailNormalizado.includes('@')) {
        return { success: false, error: 'Email inválido' }
      }
      if (!password || password.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
      }

      // Generar código único
      const codigoUnico = `${nombreInst.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}-${Date.now().toString(36)}`

      // Verificar institución duplicada
      const { data: instExiste } = await supabase
        .from('instituciones')
        .select('id, nombre')
        .ilike('nombre', nombreInst)
        .limit(1)

      if (instExiste?.length > 0) {
        return { success: false, error: `Ya existe una institución llamada "${instExiste[0].nombre}"` }
      }

      // Verificar email duplicado
      const { data: emailExiste } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', emailNormalizado)
        .limit(1)

      if (emailExiste?.length > 0) {
        return { success: false, error: 'Este correo electrónico ya está registrado' }
      }

      console.log('📝 Creando usuario en Auth...')
      
      // Crear en Supabase Auth (envía email automáticamente)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailNormalizado,
        password,
        options: {
          data: { nombre: nombreUsuario, institucion: nombreInst },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        console.error('Error creando auth:', authError)
        if (authError.message.includes('already registered')) {
          return { success: false, error: 'Este correo ya está registrado' }
        }
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Error al crear usuario' }
      }

      console.log('🏢 Creando institución...')
      
      // Crear institución
      const { data: nuevaInst, error: instError } = await supabase
        .from('instituciones')
        .insert({ 
          nombre: nombreInst, 
          codigo: codigoUnico,
          tipo,
          pais,
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
        return { success: false, error: 'Error al crear la institución' }
      }

      console.log('👤 Creando usuario en tabla...')
      
      // Crear usuario en nuestra tabla
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
        // Rollback
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        return { success: false, error: 'Error al crear el usuario' }
      }

      localStorage.setItem('admitio_pending_email', emailNormalizado)

      console.log('✅ Signup completo')
      return { 
        success: true, 
        requiresVerification: true,
        email: emailNormalizado
      }

    } catch (error) {
      console.error('Error en signup:', error)
      return { success: false, error: 'Error al crear cuenta' }
    }
  }

  // ========== SIGN OUT ==========
  async function signOut() {
    console.log('🚪 Cerrando sesión...')
    
    setUser(null)
    setInstitucion(null)
    setDataLoaded(false)
    
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    
    console.log('✅ Sesión cerrada')
  }

  // ========== RESET PASSWORD ==========
  async function resetPassword(email) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado' }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error en reset password:', error)
      return { success: false, error: error.message }
    }
  }

  // ========== UPDATE PASSWORD ==========
  async function updatePassword(newPassword) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado' }
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error actualizando password:', error)
      return { success: false, error: error.message }
    }
  }

  // ========== HELPERS DE PERMISOS ==========
  const canEdit = user?.permisos?.editar || false
  const canDelete = user?.permisos?.eliminar || false
  const canManageUsers = user?.permisos?.usuarios || false
  const canConfig = user?.permisos?.config || false
  const canViewAll = user?.permisos?.ver_todos || false
  const isKeymaster = user?.rol_id === 'keymaster' || user?.rol_id === 'superadmin'

  // ========== CONTEXTO ==========
  const value = {
    user,
    institucion,
    loading,
    dataLoaded,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    loadInstitucionData,
    // Helpers
    canEdit,
    canDelete,
    canManageUsers,
    canConfig,
    canViewAll,
    isKeymaster,
    isAuthenticated: !!user,
    ROLES
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
