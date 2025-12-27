import React, { createContext, useContext, useState, useEffect } from 'react'
import { USUARIOS, ROLES } from '../data/mockData'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

// Configuración de planes por defecto
const PLANES_DEFAULT = {
  free: { nombre: 'Gratis', max_leads: 10, max_usuarios: 1, max_formularios: 1 },
  prueba: { nombre: 'Prueba', max_leads: 15, max_usuarios: 1, max_formularios: 1 },
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

  useEffect(() => {
    checkSession()

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth event:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
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

  async function checkSession() {
    try {
      if (isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          await loadUserFromAuth(session.user)
          return
        }
      }

      const savedUser = localStorage.getItem('admitio_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        
        if (userData.institucion_id && isSupabaseConfigured()) {
          localStorage.removeItem('admitio_user')
          localStorage.removeItem('admitio_data')
        } else {
          const fullUser = USUARIOS.find(u => u.id === userData.id)
          if (fullUser && fullUser.activo) {
            setUser(enrichUser(fullUser))
          }
        }
      }
    } catch (error) {
      console.error('Error checking session:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserFromAuth(authUser) {
    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*, instituciones(id, nombre)')
        .eq('auth_id', authUser.id)
        .eq('activo', true)
        .single()

      if (error || !usuario) {
        console.log('⚠️ Usuario no encontrado en tabla usuarios')
        setLoading(false)
        return
      }

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
        rol: ROLES[usuario.rol] || ROLES.encargado,
        permisos: ROLES[usuario.rol]?.permisos || {}
      }

      setUser(enrichedUser)
      setInstitucion(usuario.instituciones)
      localStorage.setItem('admitio_user', JSON.stringify(enrichedUser))

      await loadInstitucionData(usuario.institucion_id)

      console.log('✅ Usuario cargado:', enrichedUser.nombre)
    } catch (error) {
      console.error('Error cargando usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  function enrichUser(userData) {
    const rol = ROLES[userData.rol_id]
    return {
      ...userData,
      rol,
      permisos: rol?.permisos || {}
    }
  }

  // ========== SIGN IN ==========
  async function signIn(email, password) {
    if (isSupabaseConfigured()) {
      const result = await signInWithSupabase(email, password)
      if (result.success) return result
      if (result.error !== 'Usuario no encontrado') {
        return result
      }
    }
    return signInLocal(email, password)
  }

  async function signInWithSupabase(email, password) {
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
          return { success: false, error: 'Debes verificar tu email antes de iniciar sesión' }
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

  function signInLocal(email, password) {
    const usuario = USUARIOS.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password &&
      u.activo
    )
    
    if (usuario) {
      const enrichedUser = enrichUser(usuario)
      setUser(enrichedUser)
      localStorage.setItem('admitio_user', JSON.stringify({ id: usuario.id }))
      console.log('✅ Login local exitoso:', enrichedUser.nombre)
      return { success: true, user: enrichedUser }
    }
    
    return { success: false, error: 'Credenciales inválidas' }
  }

  // ========== SIGN UP ==========
  async function signUp({ institucion: nombreInstitucion, nombre, email, password }) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Registro no disponible en modo local' }
    }

    const emailNormalizado = email.toLowerCase().trim()
    const nombreInst = nombreInstitucion.trim()
    const nombreUsuario = nombre.trim()

    try {
      // ========== VALIDACIONES PREVIAS (ANTES de crear nada) ==========
      
      // 1. Validar campos
      if (!nombreInst || nombreInst.length < 3) {
        return { success: false, error: 'El nombre de la institución debe tener al menos 3 caracteres' }
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

      // 2. Verificar si la institución ya existe (POR NOMBRE Y CODIGO)
      const { data: instExistePorCodigo } = await supabase
        .from('instituciones')
        .select('id, nombre')
        .eq('codigo', nombreInst)
        .maybeSingle()

      if (instExistePorCodigo) {
        return { success: false, error: `Ya existe una institución llamada "${instExistePorCodigo.nombre}"` }
      }

      // También verificar por nombre (case insensitive)
      const { data: instExistePorNombre } = await supabase
        .from('instituciones')
        .select('id, nombre')
        .ilike('nombre', nombreInst)
        .maybeSingle()

      if (instExistePorNombre) {
        return { success: false, error: `Ya existe una institución con un nombre similar: "${instExistePorNombre.nombre}"` }
      }

      // 3. Verificar si el email ya existe en nuestra tabla
      const { data: emailExisteEnUsuarios } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', emailNormalizado)
        .maybeSingle()

      if (emailExisteEnUsuarios) {
        return { success: false, error: 'Este correo electrónico ya está registrado' }
      }

      // ========== TODO VALIDADO - AHORA SÍ CREAR ==========

      // 4. Crear usuario en Supabase Auth (esto envía el email)
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
          return { success: false, error: 'Este correo electrónico ya está registrado en el sistema de autenticación' }
        }
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Error al crear usuario' }
      }

      // 5. Crear institución
      const { data: nuevaInst, error: instError } = await supabase
        .from('instituciones')
        .insert({ 
          nombre: nombreInst, 
          codigo: nombreInst,
          plan: 'free', 
          estado: 'activo'
        })
        .select()
        .single()

      if (instError) {
        console.error('Error creando institución:', instError)
        // No podemos eliminar fácil el auth user, pero al menos informamos
        return { success: false, error: 'Error al crear la institución. Por favor contacta soporte.' }
      }

      // 6. Crear usuario en nuestra tabla (SIN password_hash)
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
        // Rollback: eliminar institución
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        return { success: false, error: 'Error al crear el usuario. Por favor intenta de nuevo.' }
      }

      // Guardar email para reenvío
      localStorage.setItem('admitio_pending_email', emailNormalizado)

      console.log('✅ Cuenta creada:', {
        institucion: nuevaInst.nombre,
        email: emailNormalizado,
        authId: authData.user.id
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
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setInstitucion(null)
    localStorage.removeItem('admitio_user')
    localStorage.removeItem('admitio_data')
    localStorage.removeItem('admitio_pending_email')
    console.log('👋 Sesión cerrada')
  }

  // ========== RESET PASSWORD ==========
  async function resetPassword(email) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'No disponible en modo local' }
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
      return { success: false, error: 'No disponible en modo local' }
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
          tipo_alumno: lead.tipo_alumno || 'nuevo',
          emails_enviados: lead.emails_enviados || 0,
          fecha_proximo_contacto: lead.fecha_proximo_contacto,
          nuevo_interes: lead.nuevo_interes || false,
          updated_at: lead.updated_at
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
          created_at: f.created_at,
          updated_at: f.updated_at
        })),
        actividad: (acciones || []).map(a => ({
          id: a.id,
          tipo: a.tipo,
          descripcion: a.descripcion,
          fecha: a.created_at,
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
        recordatorios: [],
        lastSync: new Date().toISOString()
      }

      localStorage.setItem('admitio_data', JSON.stringify(storeData))
      console.log('📦 Datos cargados:', {
        leads: storeData.consultas.length,
        usuarios: storeData.usuarios.length,
        carreras: storeData.carreras.length,
        formularios: storeData.formularios.length
      })

      const leadsCount = storeData.consultas.length
      const usuariosCount = storeData.usuarios.length
      await loadPlanInfo(institucionId, leadsCount, usuariosCount)

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
        limites: {
          nombre: limites.nombre,
          max_leads: limites.max_leads,
          max_usuarios: limites.max_usuarios,
          max_formularios: limites.max_formularios || 1
        },
        uso: {
          leads: leadsCount,
          usuarios: usuariosCount,
          formularios: formCount || 0
        }
      })

    } catch (error) {
      console.error('Error cargando info del plan:', error)
      setPlanInfo({
        plan: 'free',
        limites: PLANES_DEFAULT.free,
        uso: { leads: leadsCount || 0, usuarios: usuariosCount || 0, formularios: 0 }
      })
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
