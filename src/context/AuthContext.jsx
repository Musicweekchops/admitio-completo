import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
      
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*, instituciones(id, nombre, tipo, pais, ciudad, region, sitio_web, plan)')
        .eq('auth_id', authUser.id)
        .eq('activo', true)
        .maybeSingle()

      if (error) {
        // Ignorar AbortError
        if (error.name === 'AbortError') {
          console.log('⏸️ Consulta cancelada (normal en desarrollo)')
          return
        }
        console.error('❌ Error consultando usuario:', error)
        return // finally se encarga de cleanup
      }
      
      if (!usuario) {
        console.log('⚠️ Usuario no encontrado en tabla usuarios')
        return // finally se encarga de cleanup
      }

      const rol = ROLES[usuario.rol] || ROLES.asistente

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
    } catch (error) {
      // Ignorar AbortError - ocurre cuando el componente se desmonta
      if (error.name === 'AbortError') {
        console.log('⏸️ Solicitud cancelada (normal en desarrollo)')
        return
      }
      console.error('Error cargando usuario:', error)
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
          // Intentar verificar automáticamente si el usuario existe en nuestra tabla
          // (el admin lo creó, así que confiamos en el email)
          return { success: false, error: 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' }
        }
        return { success: false, error: error.message }
      }

      console.log('✅ Login exitoso, verificando email automáticamente...')
      
      // ========== VERIFICACIÓN AUTOMÁTICA ==========
      // Si el usuario pudo hacer login, su email es válido
      // Marcarlo como verificado en nuestra tabla
      try {
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ email_verificado: true })
          .eq('auth_id', data.user.id)
        
        if (updateError) {
          console.warn('⚠️ No se pudo actualizar email_verificado:', updateError)
        } else {
          console.log('✅ Email verificado automáticamente en primer login')
        }
      } catch (verifyErr) {
        console.warn('⚠️ Error en verificación automática:', verifyErr)
        // No bloqueamos el login por esto
      }
      
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
          email_verificado: true
        })

      if (userError) {
        console.error('Error creando usuario:', userError)
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        return { success: false, error: 'Error al crear el usuario. Por favor intenta de nuevo.' }
      }

      console.log('✅ Cuenta creada:', {
        institucion: nuevaInst.nombre,
        tipo: tipo,
        pais: pais,
        ciudad: ciudad,
        email: emailNormalizado
      })

      return { 
        success: true, 
        requiresVerification: false,
        message: 'Cuenta creada exitosamente.',
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
      console.log('📝 Creando usuario:', email)
      
      // Mapear rol a nombre legible
      const rolesNombres = {
        'keymaster': 'Administrador',
        'rector': 'Rector/Director',
        'encargado': 'Encargado de Admisión',
        'asistente': 'Asistente'
      }
      const rolNombre = rolesNombres[rol] || rol
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: { 
            nombre, 
            rol,
            rol_nombre: rolNombre,
            institucion_nombre: institucion?.nombre || 'tu institución'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=invite`
        }
      })

      if (authError) {
        console.error('Error en auth.signUp:', authError)
        if (authError.message.includes('already registered')) {
          return { success: false, error: 'Este correo ya está registrado' }
        }
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'No se pudo crear el usuario en Auth' }
      }

      console.log('✅ Usuario creado en Auth:', authData.user.id)

      // Crear usuario en nuestra tabla
      // email_verificado: true porque el admin está invitando (confía en el email)
      const { error: userError } = await supabase
        .from('usuarios')
        .insert({
          institucion_id: user.institucion_id,
          auth_id: authData.user.id,
          email: email.toLowerCase().trim(),
          nombre,
          rol,
          activo: true,
          email_verificado: true  // El admin confía en este email
        })

      if (userError) {
        console.error('Error creando usuario en tabla:', userError)
        return { success: false, error: 'Error al crear el usuario: ' + userError.message }
      }

      console.log('✅ Usuario creado en tabla usuarios')

      // Actualizar uso
      actualizarUso('usuarios', 1)

      return {
        success: true,
        message: `Usuario ${nombre} creado exitosamente. Credenciales: ${email} / (la contraseña que definiste)`
      }

    } catch (error) {
      console.error('Error creando usuario:', error)
      return { success: false, error: error.message || 'Error al crear usuario' }
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
