import React, { createContext, useContext, useState, useEffect } from 'react'
import { USUARIOS, ROLES } from '../data/mockData'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import * as store from '../lib/store'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [institucion, setInstitucion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      // Verificar sesión guardada
      const savedUser = localStorage.getItem('admitio_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        
        // Si es usuario de Supabase (tiene institucion_id)
        if (userData.institucion_id && isSupabaseConfigured()) {
          setUser(userData)
          setInstitucion({ id: userData.institucion_id, nombre: userData.institucion_nombre })
        } else {
          // Usuario local (mockData)
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

  function enrichUser(userData) {
    const rol = ROLES[userData.rol_id]
    return {
      ...userData,
      rol,
      permisos: rol?.permisos || {}
    }
  }

  // Login principal - intenta Supabase primero, luego local
  async function signIn(email, password) {
    // Intentar con Supabase si está configurado
    if (isSupabaseConfigured()) {
      const result = await signInWithSupabase(email, password)
      if (result.success) return result
      // Si falla Supabase, intentar local
    }
    
    // Fallback a login local (mockData)
    return signInLocal(email, password)
  }

  // Login con Supabase
  async function signInWithSupabase(email, password) {
    try {
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('*, instituciones(id, nombre)')
        .eq('email', email)
        .eq('activo', true)

      if (error || !usuarios || usuarios.length === 0) {
        return { success: false, error: 'Usuario no encontrado' }
      }

      const usuario = usuarios[0]

      // Verificar contraseña
      if (usuario.password_hash !== password) {
        return { success: false, error: 'Contraseña incorrecta' }
      }

      // Crear usuario enriquecido
      const enrichedUser = {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol_id: usuario.rol,
        activo: true,
        institucion_id: usuario.institucion_id,
        institucion_nombre: usuario.instituciones?.nombre || 'Mi Institución',
        rol: ROLES[usuario.rol] || ROLES.encargado,
        permisos: ROLES[usuario.rol]?.permisos || {}
      }

      setUser(enrichedUser)
      setInstitucion(usuario.instituciones)
      localStorage.setItem('admitio_user', JSON.stringify(enrichedUser))

      // Cargar datos de la institución en localStorage para el store
      await loadInstitucionData(usuario.institucion_id)

      console.log('✅ Login Supabase exitoso:', enrichedUser.nombre)
      return { success: true, user: enrichedUser }

    } catch (error) {
      console.error('Error en login Supabase:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Cargar datos de institución desde Supabase
  async function loadInstitucionData(institucionId) {
    try {
      // Cargar leads
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('institucion_id', institucionId)
        .order('created_at', { ascending: false })

      // Cargar usuarios
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('*')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      // Cargar carreras
      const { data: carreras } = await supabase
        .from('carreras')
        .select('*')
        .eq('institucion_id', institucionId)

      // Cargar acciones
      const { data: acciones } = await supabase
        .from('acciones_lead')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Guardar en localStorage para que el store lo use
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
          created_at: lead.created_at,
          fecha_primer_contacto: lead.fecha_primer_contacto,
          fecha_cierre: lead.fecha_cierre
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
        actividad: (acciones || []).map(a => ({
          id: a.id,
          tipo: a.tipo,
          descripcion: a.descripcion,
          fecha: a.created_at,
          created_at: a.created_at,
          usuario_id: a.usuario_id,
          lead_id: a.lead_id
        })),
        // Campos adicionales requeridos por el store
        medios: [
          { id: 'instagram', nombre: 'Instagram', icono: 'Instagram', color: 'text-pink-500' },
          { id: 'web', nombre: 'Sitio Web', icono: 'Globe', color: 'text-blue-500' },
          { id: 'whatsapp', nombre: 'WhatsApp', icono: 'MessageCircle', color: 'text-green-500' },
          { id: 'telefono', nombre: 'Teléfono', icono: 'Phone', color: 'text-slate-500' },
          { id: 'referido', nombre: 'Referido', icono: 'Users', color: 'text-violet-500' },
          { id: 'facebook', nombre: 'Facebook', icono: 'Facebook', color: 'text-blue-600' },
          { id: 'email', nombre: 'Email directo', icono: 'Mail', color: 'text-amber-500' },
        ],
        plantillas: [],
        formularios: [],
        config: { nombre: 'Mi Institución', logo: null },
        metricas_encargados: {},
        recordatorios: [],
        cola_leads: [],
        correos_enviados: [],
        notificaciones: [],
        importaciones: [],
        _institucion_id: institucionId,
        _supabase_sync: true
      }

      // Guardar en localStorage
      localStorage.setItem('admitio_data', JSON.stringify(storeData))
      localStorage.setItem('admitio_version', '2.6')
      
      // Recargar store con los nuevos datos
      store.reloadStore()
      
      console.log(`✅ Datos cargados: ${leads?.length || 0} leads, ${usuarios?.length || 0} usuarios, ${carreras?.length || 0} carreras`)

    } catch (error) {
      console.error('Error cargando datos de institución:', error)
    }
  }

  // Login local (mockData)
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

  // Signup (crear institución + usuario)
  async function signUp({ institucion: nombreInstitucion, nombre, email, password }) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Registro no disponible en modo local' }
    }

    try {
      // Crear institución
      const { data: nuevaInst, error: instError } = await supabase
        .from('instituciones')
        .insert({ nombre: nombreInstitucion, plan: 'free', activa: true })
        .select()
        .single()

      if (instError) throw instError

      // Crear usuario KeyMaster
      const { data: nuevoUser, error: userError } = await supabase
        .from('usuarios')
        .insert({
          institucion_id: nuevaInst.id,
          email,
          password_hash: password,
          nombre,
          rol: 'keymaster',
          activo: true
        })
        .select()
        .single()

      if (userError) {
        await supabase.from('instituciones').delete().eq('id', nuevaInst.id)
        throw userError
      }

      // Login automático
      return signInWithSupabase(email, password)

    } catch (error) {
      console.error('Error en signup:', error)
      return { success: false, error: error.message || 'Error al crear cuenta' }
    }
  }

  function signOut() {
    setUser(null)
    setInstitucion(null)
    localStorage.removeItem('admitio_user')
    localStorage.removeItem('admitio_data')
    console.log('👋 Sesión cerrada')
  }

  // Aliases para compatibilidad
  const login = signIn
  const logout = signOut
  const signup = signUp

  // Helpers de permisos (igual que el original)
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
      // Auth methods
      signIn,
      signOut,
      signUp,
      // Aliases
      login,
      logout,
      signup,
      // Para verificar autenticación
      isAuthenticated: !!user,
      // Roles
      isSuperAdmin,
      isKeyMaster,
      isEncargado,
      isAsistente,
      isRector,
      // Permisos
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
