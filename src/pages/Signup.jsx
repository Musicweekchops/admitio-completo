import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

// Tipos de institución disponibles
const TIPOS_INSTITUCION = [
  { id: 'universidad', nombre: 'Universidad' },
  { id: 'instituto', nombre: 'Instituto Profesional' },
  { id: 'cft', nombre: 'Centro de Formación Técnica' },
  { id: 'colegio', nombre: 'Colegio' },
  { id: 'preuniversitario', nombre: 'Preuniversitario' },
  { id: 'academia', nombre: 'Academia / Escuela' },
  { id: 'otro', nombre: 'Otro' }
]

// Países disponibles
const PAISES = [
  { id: 'CL', nombre: 'Chile' },
  { id: 'AR', nombre: 'Argentina' },
  { id: 'PE', nombre: 'Perú' },
  { id: 'CO', nombre: 'Colombia' },
  { id: 'MX', nombre: 'México' },
  { id: 'EC', nombre: 'Ecuador' },
  { id: 'BO', nombre: 'Bolivia' },
  { id: 'UY', nombre: 'Uruguay' },
  { id: 'PY', nombre: 'Paraguay' },
  { id: 'VE', nombre: 'Venezuela' },
  { id: 'BR', nombre: 'Brasil' },
  { id: 'ES', nombre: 'España' },
  { id: 'US', nombre: 'Estados Unidos' },
  { id: 'OTRO', nombre: 'Otro' }
]

// Regiones de Chile
const REGIONES_CHILE = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  'O\'Higgins',
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes'
]

const Signup = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // Institución
    institucion: '',
    tipo: '',
    pais: 'CL',
    ciudad: '',
    region: '',
    sitioWeb: '',
    // Usuario
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signup } = useAuth()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Limpiar región si cambia el país
    if (name === 'pais' && value !== 'CL') {
      setFormData(prev => ({ ...prev, region: '' }))
    }
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    setError('')
    
    // Validaciones paso 1
    if (!formData.institucion.trim() || formData.institucion.trim().length < 3) {
      setError('El nombre de la institución debe tener al menos 3 caracteres')
      return
    }
    if (!formData.tipo) {
      setError('Selecciona el tipo de institución')
      return
    }
    if (!formData.pais) {
      setError('Selecciona el país')
      return
    }
    if (!formData.ciudad.trim() || formData.ciudad.trim().length < 2) {
      setError('Ingresa la ciudad')
      return
    }
    
    setStep(2)
  }

  const handlePrevStep = () => {
    setError('')
    setStep(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones paso 2
    if (!formData.nombre.trim() || formData.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return
    }
    if (!formData.email.includes('@')) {
      setError('Ingresa un email válido')
      return
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const result = await signup({
        institucion: formData.institucion,
        tipo: formData.tipo,
        pais: formData.pais,
        ciudad: formData.ciudad,
        region: formData.region,
        sitioWeb: formData.sitioWeb,
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password
      })

      if (result.success) {
        if (result.requiresVerification) {
          // Redirigir a página de verificación pendiente
          navigate('/verificar-email', { state: { email: formData.email } })
        } else {
          navigate('/dashboard')
        }
      } else {
        setError(result.error || 'Error al crear la cuenta')
      }
    } catch (err) {
      console.error('Error en signup:', err)
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
            Comienza a convertir más leads hoy
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Únete a las instituciones que ya transformaron su proceso de admisiones con Admitio.
          </p>
          
          {/* Features list */}
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
              {step === 1 ? 'Datos de tu institución' : 'Crea tu cuenta'}
            </h2>
            <p className="text-slate-500">
              {step === 1 ? 'Cuéntanos sobre tu institución educativa' : 'Serás el administrador principal (Key Master)'}
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
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de la institución *
                </label>
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
                    placeholder="Ej: Instituto Técnico Profesional"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de institución *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="GraduationCap" size={20} />
                  </div>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="form-input pl-12 appearance-none"
                    required
                  >
                    <option value="">Selecciona el tipo</option>
                    {TIPOS_INSTITUCION.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="ChevronDown" size={20} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    País *
                  </label>
                  <select
                    name="pais"
                    value={formData.pais}
                    onChange={handleChange}
                    className="form-input appearance-none"
                    required
                  >
                    {PAISES.map(pais => (
                      <option key={pais.id} value={pais.id}>{pais.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ej: Santiago"
                    required
                  />
                </div>
              </div>

              {formData.pais === 'CL' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Región
                  </label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    className="form-input appearance-none"
                  >
                    <option value="">Selecciona la región</option>
                    {REGIONES_CHILE.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sitio web (opcional)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Globe" size={20} />
                  </div>
                  <input
                    type="url"
                    name="sitioWeb"
                    value={formData.sitioWeb}
                    onChange={handleChange}
                    className="form-input pl-12"
                    placeholder="https://www.tuinstitucion.cl"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full justify-center py-4 mt-6">
                Continuar
                <Icon name="ArrowRight" size={20} />
              </button>
            </form>
          )}

          {/* Step 2: User details */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tu nombre completo *
                </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Correo electrónico *
                </label>
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
                    placeholder="tu@institucion.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña *
                </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmar contraseña *
                </label>
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

              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={handlePrevStep}
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

              <p className="text-xs text-slate-500 text-center mt-4">
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
