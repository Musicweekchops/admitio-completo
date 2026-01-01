import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // IMPORTANTE: await para esperar el resultado completo
      const result = await signIn(email, password)
      
      if (!result.success) {
        setError(result.error || 'Error al iniciar sesión')
        setLoading(false)
        return
      }
      
      // Login exitoso - navegar al dashboard
      console.log('✅ Login exitoso, navegando a dashboard...')
      navigate('/dashboard', { replace: true })
      
    } catch (err) {
      console.error('Error en login:', err)
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const demoCredentials = [
    { email: 'admin@projazz.cl', password: 'admin123', rol: 'Key Master', desc: 'Control total' },
    { email: 'maria@projazz.cl', password: '123456', rol: 'Encargado', desc: 'María - Gestiona sus leads' },
    { email: 'pedro@projazz.cl', password: '123456', rol: 'Encargado', desc: 'Pedro - Gestiona sus leads' },
    { email: 'secretaria@projazz.cl', password: '123456', rol: 'Asistente', desc: 'Solo crea leads' },
    { email: 'rector@projazz.cl', password: 'rector123', rol: 'Rector', desc: 'Solo reportes' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <Icon name="GraduationCap" className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Admitio
          </h1>
          <p className="text-slate-500 mt-1">Sistema de Gestión de Admisiones</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="Mail" className="text-slate-400" size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="Lock" className="text-slate-400" size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                <Icon name="AlertCircle" size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  <Icon name="LogIn" size={20} />
                  Ingresar
                </>
              )}
            </button>
          </form>
          
          {/* Link a registro */}
          <div className="mt-6 text-center">
            <a href="/signup" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              ¿No tienes cuenta? Regístrate aquí
            </a>
          </div>
          
          {/* Link a recuperar contraseña */}
          <div className="mt-2 text-center">
            <a href="/reset-password" className="text-sm text-slate-500 hover:text-slate-700">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Botones de login rápido para demo */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full text-sm text-slate-500 hover:text-violet-600 flex items-center justify-center gap-2"
            >
              <Icon name={showCredentials ? 'ChevronUp' : 'ChevronDown'} size={16} />
              {showCredentials ? 'Ocultar' : 'Mostrar'} credenciales de prueba
            </button>
            
            {showCredentials && (
              <div className="mt-4 space-y-2">
                {demoCredentials.map((cred, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setEmail(cred.email)
                      setPassword(cred.password)
                    }}
                    disabled={loading}
                    className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700 group-hover:text-violet-700">{cred.rol}</p>
                        <p className="text-xs text-slate-400">{cred.desc}</p>
                      </div>
                      <Icon name="ArrowRight" className="text-slate-300 group-hover:text-violet-500" size={16} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-400 mt-6">
          © 2024 Admitio • Sistema de Gestión de Admisiones
        </p>
      </div>
    </div>
  )
}
