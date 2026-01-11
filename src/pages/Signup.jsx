import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
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

  // Estados para validación en tiempo real del nombre de institución
  const [institucionStatus, setInstitucionStatus] = useState('idle') // 'idle' | 'checking' | 'available' | 'taken' | 'error'
  const [institucionMessage, setInstitucionMessage] = useState('')
  const debounceTimer = useRef(null)

  // Validación en tiempo real del nombre de institución
  useEffect(() => {
    const nombreInst = formData.institucion.trim()
    
    // Si está vacío o muy corto, resetear estado
    if (!nombreInst || nombreInst.length < 3) {
      setInstitucionStatus('idle')
      setInstitucionMessage('')
      return
    }

    // Mostrar estado "verificando"
    setInstitucionStatus('checking')
    setInstitucionMessage('Verificando disponibilidad...')

    // Debounce: esperar 500ms después de que el usuario deje de escribir
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        // Buscar por nombre exacto (case-insensitive)
        const { data: instExacta, error: errorExacta } = await supabase
          .from('instituciones')
          .select('id, nombre')
          .ilike('nombre', nombreInst)
          .limit(1)

        if (errorExacta) {
          console.error('Error verificando institución:', errorExacta)
          setInstitucionStatus('error')
          setInstitucionMessage('Error al verificar. Intenta de nuevo.')
          return
        }

        if (instExacta && instExacta.length > 0) {
          setInstitucionStatus('taken')
          setInstitucionMessage(`"${instExacta[0].nombre}" ya está registrada`)
          return
        }

        // Buscar por nombre similar (contiene)
        const { data: instSimilar, error: errorSimilar } = await supabase
          .from('instituciones')
          .select('id, nombre')
          .ilike('nombre', `%${nombreInst}%`)
          .limit(1)

        if (!errorSimilar && instSimilar && instSimilar.length > 0) {
          setInstitucionStatus('taken')
          setInstitucionMessage(`Ya existe una similar: "${instSimilar[0].nombre}"`)
          return
        }

        // Si llegamos aquí, el nombre está disponible
        setInstitucionStatus('available')
        setInstitucionMessage('¡Nombre disponible!')

      } catch (err) {
        console.error('Error en validación:', err)
        setInstitucionStatus('error')
        setInstitucionMessage('Error de conexión')
      }
    }, 500)

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [formData.institucion])

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
    
    // No permitir continuar si la institución ya existe
    if (institucionStatus === 'taken') {
      setError('El nombre de la institución ya está registrado. Por favor, elige otro.')
      return
    }
    
    // No permitir continuar si aún está verificando
    if (institucionStatus === 'checking') {
      setError('Espera a que se verifique la disponibilidad del nombre')
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
        // Redirigir a login con mensaje de éxito
        navigate('/login', { 
          state: { 
            message: '¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.',
            email: formData.email 
          } 
        })
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

  // Función para obtener clases del input según estado
  const getInstitucionInputClasses = () => {
    const baseClasses = "form-input with-icon pr-12 transition-colors"
    switch (institucionStatus) {
      case 'available':
        return `${baseClasses} border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200`
      case 'taken':
        return `${baseClasses} border-red-400 focus:border-red-500 focus:ring-red-200`
      case 'checking':
        return `${baseClasses} border-amber-400 focus:border-amber-500 focus:ring-amber-200`
      default:
        return baseClasses
    }
  }

  // Función para obtener ícono de estado
  const getStatusIcon = () => {
    switch (institucionStatus) {
      case 'checking':
        return <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      case 'available':
        return <Icon name="CheckCircle" size={20} className="text-emerald-500" />
      case 'taken':
        return <Icon name="XCircle" size={20} className="text-red-500" />
      case 'error':
        return <Icon name="AlertCircle" size={20} className="text-red-500" />
      default:
        return null
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
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="Building" size={20} />
                  </div>
                  <input
                    type="text"
                    name="institucion"
                    value={formData.institucion}
                    onChange={handleChange}
                    className={getInstitucionInputClasses()}
                    placeholder="Ej: Instituto Técnico Profesional"
                    required
                    autoFocus
                  />
                  {/* Ícono de estado a la derecha */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {getStatusIcon()}
                  </div>
                </div>
                {/* Mensaje de estado debajo del input */}
                {institucionMessage && (
                  <p className={`mt-2 text-sm flex items-center gap-1.5 ${
                    institucionStatus === 'available' ? 'text-emerald-600' :
                    institucionStatus === 'taken' ? 'text-red-600' :
                    institucionStatus === 'checking' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {institucionStatus === 'available' && <Icon name="Check" size={14} />}
                    {institucionStatus === 'taken' && <Icon name="X" size={14} />}
                    {institucionMessage}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de institución *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="GraduationCap" size={20} />
                  </div>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="form-input with-icon appearance-none"
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
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="Globe" size={20} />
                  </div>
                  <input
                    type="url"
                    name="sitioWeb"
                    value={formData.sitioWeb}
                    onChange={handleChange}
                    className="form-input with-icon"
                    placeholder="https://www.tuinstitucion.cl"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={institucionStatus === 'taken' || institucionStatus === 'checking'}
                className={`btn w-full justify-center py-4 mt-6 ${
                  institucionStatus === 'taken' 
                    ? 'btn-secondary opacity-50 cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                {institucionStatus === 'checking' ? (
                  <>
                    <div className="spinner"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    Continuar
                    <Icon name="ArrowRight" size={20} />
                  </>
                )}
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
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="User" size={20} />
                  </div>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="form-input with-icon"
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
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="Mail" size={20} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input with-icon"
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
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="Lock" size={20} />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input with-icon"
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
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Icon name="Lock" size={20} />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input with-icon"
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
