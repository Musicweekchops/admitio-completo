import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

export default function EstablecerPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar que hay una sesión de recovery activa
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('El enlace ha expirado o es inválido. Solicita una nueva invitación.')
      }
      setCheckingSession(false)
    }

    // Escuchar cambios de auth (para cuando llega el token del email)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      if (event === 'PASSWORD_RECOVERY') {
        setCheckingSession(false)
        setError('')
      }
    })

    checkSession()

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      // Marcar que ya no tiene password pendiente
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('usuarios')
          .update({ password_pendiente: false })
          .eq('auth_id', user.id)
      }

      setSuccess(true)
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/login')
      }, 3000)

    } catch (err) {
      console.error('Error estableciendo contraseña:', err)
      setError(err.message || 'Error al establecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="CheckCircle" className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Contraseña establecida!</h2>
            <p className="text-slate-500 mb-6">
              Tu cuenta está lista. Serás redirigido al inicio de sesión...
            </p>
            <Link 
              to="/login" 
              className="btn btn-primary w-full justify-center py-3"
            >
              Ir a Iniciar Sesión
              <Icon name="ArrowRight" size={20} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-left items-center justify-center p-12">
        <div className="relative z-10 max-w-lg">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full animate-float"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full animate-float" style={{ animationDelay: '-2s' }}></div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Icon name="GraduationCap" className="text-white" size={32} />
            </div>
            <span className="font-display text-3xl font-bold text-white">Admitio</span>
          </div>
          
          <h1 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            ¡Bienvenido al equipo!
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Has sido invitado a formar parte de tu institución en Admitio. Establece tu contraseña para comenzar.
          </p>
          
          <div className="space-y-4">
            {[
              'Accede a tu panel de leads asignados',
              'Gestiona el seguimiento de prospectos',
              'Colabora con tu equipo en tiempo real',
              'Registra todas las interacciones'
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
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="KeyRound" className="text-violet-600" size={32} />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              Establece tu contraseña
            </h2>
            <p className="text-slate-500">
              Crea una contraseña segura para tu cuenta
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
              <Icon name="AlertCircle" size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="Lock" size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-12"
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading || !!error}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="Lock" size={20} />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input pl-12"
                  placeholder="Repite tu contraseña"
                  required
                  disabled={loading || !!error}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!error}
              className="btn btn-primary w-full justify-center py-4"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Guardando...
                </>
              ) : (
                <>
                  Establecer contraseña
                  <Icon name="Check" size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <Link to="/login" className="flex items-center justify-center gap-2 text-slate-500 hover:text-violet-600 transition-colors">
              <Icon name="ArrowLeft" size={18} />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
