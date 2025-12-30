import React, { createContext, useContext, useState, useEffect } from 'react'
import { USUARIOS, ROLES } from '../data/mockData'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import * as store from '../lib/store'

const AuthContext = createContext(null)

// Configuración de planes por defecto (si no hay en BD)
const PLANES_DEFAULT = {
  free: { nombre: 'Gratis', max_leads: 10, max_usuarios: 1, max_formularios: 1 },
  prueba: { nombre: 'Prueba', max_leads: 15, max_usuarios: 1, max_formularios: 1 }, // Plan legacy, similar a free
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
          
          // IMPORTANTE: Recargar datos de Supabase al hacer refresh
          console.log('🔄 Recargando datos de Supabase...')
          await loadInstitucionData(userData.institucion_id)
          
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

      // Cargar carreras (solo activas)
      const { data: carreras } = await supabase
        .from('carreras')
        .select('*')
        .eq('institucion_id', institucionId)
        .eq('activa', true)
        .order('nombre', { ascending: true })

      // Cargar formularios
      const { data: formularios } = await supabase
        .from('formularios')
        .select('*')
        .eq('institucion_id', institucionId)
        .order('created_at', { ascending: false })

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
          creado_por: lead.creado_por,
          created_at: lead.created_at,
          fecha_primer_contacto: lead.fecha_primer_contacto,
          fecha_cierre: lead.fecha_cierre,
          // Campos adicionales importantes para reportes y métricas
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
      localStorage.setItem('admitio_version', '2.7')  // Debe coincidir con store.js
      
      // Recargar store con los nuevos datos
      store.reloadStore()
      
      console.log(`✅ Datos cargados: ${leads?.length || 0} leads, ${usuarios?.length || 0} usuarios, ${carreras?.length || 0} carreras, ${formularios?.length || 0} formularios`)

      // Cargar info del plan
      await loadPlanInfo(institucionId, leads?.length || 0, usuarios?.length || 0)

    } catch (error) {
      console.error('Error cargando datos de institución:', error)
    }
  }

  // Cargar información del plan y uso
  async function loadPlanInfo(institucionId, leadsCount, usuariosCount) {
    try {
      // Obtener info de la institución con su plan
      const { data: inst } = await supabase
        .from('instituciones')
        .select('plan, leads_count, usuarios_count')
        .eq('id', institucionId)
        .single()

      const planId = inst?.plan || 'free'
      
      // Intentar cargar config del plan desde la BD
      const { data: planConfig } = await supabase
        .from('planes_config')
        .select('*')
        .eq('id', planId)
        .single()

      // Usar config de BD o default
      const limites = planConfig || PLANES_DEFAULT[planId] || PLANES_DEFAULT.free

      // Contar formularios
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

      console.log(`📊 Plan: ${planId} | Leads: ${leadsCount}/${limites.max_leads} | Usuarios: ${usuariosCount}/${limites.max_usuarios}`)

    } catch (error) {
      console.error('Error cargando info del plan:', error)
      // Usar defaults si hay error
      setPlanInfo({
        plan: 'free',
        limites: PLANES_DEFAULT.free,
        uso: { leads: leadsCount || 0, usuarios: usuariosCount || 0, formularios: 0 }
      })
    }
  }

  // Actualizar uso después de crear/eliminar
  function actualizarUso(tipo, delta) {
    setPlanInfo(prev => ({
      ...prev,
      uso: {
        ...prev.uso,
        [tipo]: Math.max(0, (prev.uso[tipo] || 0) + delta)
      }
    }))
  }

  // Helpers para verificar límites
  const puedeCrearLead = () => planInfo.uso.leads < planInfo.limites.max_leads
  const puedeCrearUsuario = () => planInfo.uso.usuarios < planInfo.limites.max_usuarios
  const puedeCrearFormulario = () => planInfo.uso.formularios < planInfo.limites.max_formularios
  
  const porcentajeUsoLeads = () => Math.round((planInfo.uso.leads / planInfo.limites.max_leads) * 100)
  const porcentajeUsoUsuarios = () => Math.round((planInfo.uso.usuarios / planInfo.limites.max_usuarios) * 100)
  const porcentajeUsoFormularios = () => Math.round((planInfo.uso.formularios / planInfo.limites.max_formularios) * 100)

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

  // Recargar datos desde Supabase (para sincronización en tiempo real)
  async function reloadFromSupabase() {
    if (!user?.institucion_id || !isSupabaseConfigured()) {
      console.log('⚠️ No se puede recargar: sin institución o Supabase no configurado')
      return false
    }
    
    console.log('🔄 Recargando datos desde Supabase...')
    try {
      await loadInstitucionData(user.institucion_id)
      return true
    } catch (error) {
      console.error('❌ Error recargando desde Supabase:', error)
      return false
    }
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
      reloadFromSupabase,
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
      // Plan y límites
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
