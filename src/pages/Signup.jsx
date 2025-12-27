import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const Signup = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    institucion: '',
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState(false)
  const [emailRegistrado, setEmailRegistrado] = useState('')
  const navigate = useNavigate()
  const { signup, resendVerification } = useAuth()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    if (!formData.institucion.trim()) {
      setError('Ingresa el nombre de tu institución')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const result = await signup({
        institucion: formData.institucion,
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password
      })

      if (result.success) {
        // Si requiere verificación, mostrar pantalla de éxito
        if (result.requiresVerification) {
          setEmailRegistrado(result.email || formData.email)
          setRegistroExitoso(true)
        } else {
          // Si no requiere verificación (no debería pasar), ir al dashboard
          navigate('/dashboard')
        }
      } else {
        setError(result.error || 'Error al crear la cuenta')
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!emailRegistrado) return
    
    setLoading(true)
    try {
      const result = await resendVerification(emailRegistrado)
      if (result.success) {
        alert('Email de verificación reenviado. Revisa tu bandeja de entrada.')
      } else {
        alert(result.error || 'Error al reenviar email')
      }
    } catch (err) {
      alert('Error al reenviar email')
    } finally {
      setLoading(false)
    }
  }

  // ========== PANTALLA DE ÉXITO ==========
  if (registroExitoso) {
    return (
      <div className="auth-container">
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
              ¡Ya casi está listo!
            </h1>
            <p className="text-white/80 text-lg">
              Solo falta un paso para comenzar a gestionar tus admisiones.
            </p>
          </div>
        </div>

        <div className="auth-right bg-slate-50">
          <div className="auth-form text-center">
            {/* Icono de email */}
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="Mail" className="text-violet-600" size={40} />
            </div>

            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
              Verifica tu correo electrónico
            </h2>

            <p className="text-slate-600 mb-6">
              Hemos enviado un email de verificación a:
            </p>

            <div className="bg-slate-100 rounded-lg px-4 py-3 mb-6">
              <span className="font-semibold text-slate-800">{emailRegistrado}</span>
            </div>

            <p className="text-slate-500 text-sm mb-8">
              Haz clic en el enlace del correo para activar tu cuenta. 
              Si no lo ves, revisa tu carpeta de spam.
            </p>

            {/* Acciones */}
            <div className="space-y-4">
              <button
                onClick={handleResendEmail}
                disabled={loading}
                className="btn btn-secondary w-full justify-center"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Icon name="RefreshCw" size={18} />
                    Reenviar email de verificación
                  </>
                )}
              </button>

              <Link
                to="/login"
                className="btn btn-primary w-full justify-center"
              >
                <Icon name="LogIn" size={18} />
                Ir a iniciar sesión
              </Link>
            </div>

            {/* Ayuda */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-slate-500 text-sm">
                ¿Problemas con el registro?{' '}
                <a href="mailto:soporte@admitio.cl" className="text-violet-600 hover:underline">
                  Contáctanos
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== FORMULARIO DE REGISTRO ==========
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
            Comienza a convertir más leads hoy
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Únete a las instituciones que ya transformaron su proceso de admisiones con Admitio.
          </p>
          
          <div className="space-y-4">
            {[
              'Dashboard intuitivo para gestionar leads',
              'Formularios personalizables para tu web',
              'Reportes de conversión en tiempo real',
              'Gratis para comenzar, sin tarjeta'
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

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-violet-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-violet-600 text-white' : 'bg-slate-200'}`}>
                1
              </div>
              <span className="hidden sm:inline text-sm font-medium">Institución</span>
            </div>
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-violet-600' : 'bg-slate-200'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-violet-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-violet-600 text-white' : 'bg-slate-200'}`}>
                2
              </div>
              <span className="hidden sm:inline text-sm font-medium">Tu cuenta</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              {step === 1 ? 'Crea tu cuenta gratis' : 'Datos del administrador'}
            </h2>
            <p className="text-slate-500">
              {step === 1 ? 'Empieza con el nombre de tu institución' : 'Serás el Key Master de tu institución'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 animate-slide-up">
              <Icon name="AlertCircle" size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Institution */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-5">
              <div>
                <label className="form-label">Nombre de la institución</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Building" size={20} />
                  </div>
                  <input
                    type="text"
                    name="institucion"
                    value={formData.institucion}
                    onChange={handleChange}
                    className="form-input pl-12"
                    placeholder="Ej: Instituto de Música ProJazz"
                    required
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Este será el nombre que verán tus usuarios
                </p>
              </div>

              <button type="submit" className="btn btn-primary w-full justify-center py-4">
                Continuar
                <Icon name="ArrowRight" size={20} />
              </button>
            </form>
          )}

          {/* Step 2: User details */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label">Tu nombre completo</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="User" size={20} />
                  </div>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="form-input pl-12"
                    placeholder="Tu nombre"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Correo electrónico</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Mail" size={20} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input pl-12"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Confirmar contraseña</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Lock" size={20} />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input pl-12"
                    placeholder="Repite tu contraseña"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="btn btn-secondary flex-1 justify-center"
                >
                  <Icon name="ArrowLeft" size={18} />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-[2] justify-center py-4"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta
                      <Icon name="Check" size={20} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Al crear tu cuenta, aceptas nuestros{' '}
                <a href="#" className="text-violet-600 hover:underline">Términos de Servicio</a>
                {' '}y{' '}
                <a href="#" className="text-violet-600 hover:underline">Política de Privacidad</a>
              </p>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold">
                Inicia sesión
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

export default Signup
