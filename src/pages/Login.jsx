import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        navigate('/app')
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
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
            Transforma tus admisiones en matrículas
          </h1>
          <p className="text-white/80 text-lg">
            Gestiona leads, automatiza seguimientos y aumenta tu tasa de conversión con el CRM diseñado para instituciones educativas.
          </p>
          
          <div className="mt-12 flex items-center gap-6">
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-white">+85%</div>
              <div className="text-white/60 text-sm">Conversión</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-white">-60%</div>
              <div className="text-white/60 text-sm">Tiempo resp.</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-white">24/7</div>
              <div className="text-white/60 text-sm">Captura</div>
            </div>
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
              Bienvenido de vuelta
            </h2>
            <p className="text-slate-500">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 animate-slide-up">
              <Icon name="AlertCircle" size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Correo electrónico</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="Mail" size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-12"
                  placeholder="tu@institucion.cl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="Lock" size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                <span className="text-slate-600">Recordarme</span>
              </label>
              <a href="#" className="text-violet-600 hover:text-violet-700 font-medium">
                ¿Olvidaste tu contraseña?
              </a>
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
                  Iniciar Sesión
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

export default Login
