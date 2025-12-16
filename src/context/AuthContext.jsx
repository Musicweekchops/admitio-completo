import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { cargarDatosInstitucion } from '../lib/storeSync'
import * as store from '../lib/store'

// Mock data para modo local (sin Supabase)
import { USUARIOS } from '../data/mockData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [institucion, setInstitucion] = useState(null)
  const [loading, setLoading] = useState(true)

  // Al montar, verificar si hay sesión guardada
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      // Intentar recuperar sesión de localStorage
      const savedSession = localStorage.getItem('admitio_session')
      if (savedSession) {
        const session = JSON.parse(savedSession)
        setUser(session.user)
        setInstitucion(session.institucion)
        
        // Si hay Supabase, recargar datos frescos
        if (isSupabaseConfigured() && session.institucion?.id) {
          await cargarDatosInstitucion(session.institucion.id)
          store.reloadStore()
        }
      }
    } catch (error) {
      console.error('Error checking session:', error)
      localStorage.removeItem('admitio_session')
    } finally {
      setLoading(false)
    }
  }

  // Login
  const login = async (email, password) => {
    try {
      // Si Supabase está configurado, usar auth real
      if (isSupabaseConfigured()) {
        return await loginWithSupabase(email, password)
      } else {
        // Modo local: usar mockData
        return loginLocal(email, password)
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Login con Supabase
  const loginWithSupabase = async (email, password) => {
    // 1. Buscar usuario en tabla usuarios
    const { data: usuarios, error: userError } = await supabase
      .from('usuarios')
      .select('*, instituciones(*)')
      .eq('email', email)
      .eq('activo', true)

    if (userError) {
      console.error('Error buscando usuario:', userError)
      return { success: false, error: 'Error al buscar usuario' }
    }

    if (!usuarios || usuarios.length === 0) {
      return { success: false, error: 'Usuario no encontrado o inactivo' }
    }

    const usuario = usuarios[0]

    // 2. Verificar contraseña (en producción usar hash)
    // Por ahora, comparación simple - MEJORAR EN PRODUCCIÓN
    if (usuario.password_hash !== password) {
      return { success: false, error: 'Contraseña incorrecta' }
    }

    // 3. Obtener institución
    const institucionData = usuario.instituciones || {
      id: usuario.institucion_id,
      nombre: 'Mi Institución'
    }

    // 4. Cargar datos de la institución
    await cargarDatosInstitucion(institucionData.id)
    store.reloadStore()

    // 5. Crear objeto de usuario
    const userData = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol_id: usuario.rol,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nombre)}&background=7c3aed&color=fff`
    }

    // 6. Guardar sesión
    const session = { user: userData, institucion: institucionData }
    localStorage.setItem('admitio_session', JSON.stringify(session))
    
    setUser(userData)
    setInstitucion(institucionData)

    console.log('✅ Login exitoso:', userData.nombre, '- Institución:', institucionData.nombre)
    return { success: true }
  }

  // Login local (modo sin Supabase)
  const loginLocal = (email, password) => {
    const usuario = USUARIOS.find(u => u.email === email && u.password === password && u.activo)
    
    if (!usuario) {
      return { success: false, error: 'Credenciales incorrectas' }
    }

    const userData = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol_id: usuario.rol_id,
      avatar: usuario.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nombre)}&background=7c3aed&color=fff`
    }

    const institucionData = {
      id: 'local-inst',
      nombre: 'Institución Demo'
    }

    // Guardar sesión
    const session = { user: userData, institucion: institucionData }
    localStorage.setItem('admitio_session', JSON.stringify(session))
    
    setUser(userData)
    setInstitucion(institucionData)

    console.log('✅ Login local exitoso:', userData.nombre)
    return { success: true }
  }

  // Signup (crear nueva institución y usuario)
  const signup = async ({ institucion: nombreInstitucion, nombre, email, password }) => {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Registro no disponible en modo local' }
      }

      // 1. Crear institución
      const { data: nuevaInstitucion, error: instError } = await supabase
        .from('instituciones')
        .insert({
          nombre: nombreInstitucion,
          plan: 'free',
          activa: true
        })
        .select()
        .single()

      if (instError) {
        console.error('Error creando institución:', instError)
        return { success: false, error: 'Error al crear institución' }
      }

      // 2. Crear usuario como Key Master
      const { data: nuevoUsuario, error: userError } = await supabase
        .from('usuarios')
        .insert({
          institucion_id: nuevaInstitucion.id,
          email: email,
          password_hash: password, // MEJORAR: usar bcrypt en producción
          nombre: nombre,
          rol: 'keymaster',
          activo: true
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creando usuario:', userError)
        // Rollback: eliminar institución creada
        await supabase.from('instituciones').delete().eq('id', nuevaInstitucion.id)
        return { success: false, error: 'Error al crear usuario. ¿El email ya existe?' }
      }

      // 3. Cargar datos y hacer login automático
      await cargarDatosInstitucion(nuevaInstitucion.id)
      store.reloadStore()

      const userData = {
        id: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol_id: nuevoUsuario.rol,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nuevoUsuario.nombre)}&background=7c3aed&color=fff`
      }

      const session = { user: userData, institucion: nuevaInstitucion }
      localStorage.setItem('admitio_session', JSON.stringify(session))
      
      setUser(userData)
      setInstitucion(nuevaInstitucion)

      console.log('✅ Registro exitoso:', userData.nombre, '- Institución:', nuevaInstitucion.nombre)
      return { success: true }

    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Logout
  const logout = () => {
    localStorage.removeItem('admitio_session')
    localStorage.removeItem('admitio_data')
    setUser(null)
    setInstitucion(null)
    console.log('👋 Sesión cerrada')
  }

  // Refrescar datos de la institución desde Supabase
  const refreshData = async () => {
    if (institucion?.id && isSupabaseConfigured()) {
      await cargarDatosInstitucion(institucion.id)
      store.reloadStore()
      console.log('🔄 Datos refrescados')
    }
  }

  const value = {
    user,
    institucion,
    loading,
    login,
    signup,
    logout,
    refreshData,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
