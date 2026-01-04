import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '')
  const [loading, setLoading] = useState(false)

  // Limpiar mensaje después de mostrarlo
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const result = await signIn(email, password)
      
      if (!result.success) {
        setError(result.error || 'Error al iniciar sesión')
        setLoading(false)
        return
      }
      
      console.log('✅ Login exitoso, navegando a dashboard...')
      navigate('/dashboard', { replace: true })
      
    } catch (err) {
      console.error('Error en login:', err)
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-left items-center justify-center p-12">
        <div className="relative z-10 max-w-lg">
          {/* Floating shapes */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full animate-float"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full animate-float" style={{ animationDelay: '-2s' }}></div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Icon name="GraduationCap" className="text-white" size={32} />
            </div>
            <span className="font-display text-3xl font-bold text-white">Admitio</span>
          </div>
          
          <h1 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            Bienvenido de vuelta
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Accede a tu panel de control y continúa gestionando tus procesos de admisión.
          </p>
          
          {/* Features list */}
          <div className="space-y-4">
            {[
              'Gestiona todos tus leads en un solo lugar',
              'Revisa métricas y reportes en tiempo real',
              'Colabora con tu equipo de admisiones',
              'Automatiza tu seguimiento de prospectos'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Check" className="text-white" size={14} />
                </div>
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-right bg-slate-50">
        <div className="auth-form">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
              <Icon name="GraduationCap" className="text-white" size={28} />
            </div>
            <span className="font-display text-2xl font-bold text-slate-800">Admitio</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Inicia sesión
            </h2>
            <p className="text-slate-500">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-600 animate-slide-up">
              <Icon name="CheckCircle" size={20} />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 animate-slide-up">
              <Icon name="AlertCircle" size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="Mail" size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-12"
                  placeholder="tu@institucion.com"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <Link 
                  to="/reset-password" 
                  className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="Lock" size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-12"
                  placeholder="Tu contraseña"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-4"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <Icon name="ArrowRight" size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500">
              ¿No tienes cuenta?{' '}
              <Link to="/signup" className="text-violet-600 hover:text-violet-700 font-semibold">
                Regístrate gratis
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <Link to="/" className="flex items-center justify-center gap-2 text-slate-500 hover:text-violet-600 transition-colors">
              <Icon name="ArrowLeft" size={18} />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
