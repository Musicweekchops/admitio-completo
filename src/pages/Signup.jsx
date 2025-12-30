import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import Icon from '../components/Icon'

// Tipos de institución
const TIPOS_INSTITUCION = [
  { id: 'musica_artes', nombre: 'Música / Artes' },
  { id: 'idiomas', nombre: 'Idiomas' },
  { id: 'tecnico_oficios', nombre: 'Técnico / Oficios' },
  { id: 'preuniversitario', nombre: 'Preuniversitario' },
  { id: 'educacion_superior', nombre: 'Educación Superior' },
  { id: 'capacitacion_empresarial', nombre: 'Capacitación Empresarial' },
  { id: 'colegio_escuela', nombre: 'Colegio / Escuela' },
  { id: 'otro', nombre: 'Otro' }
]

// Países (principales de Latam)
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
  { id: 'PA', nombre: 'Panamá' },
  { id: 'CR', nombre: 'Costa Rica' },
  { id: 'GT', nombre: 'Guatemala' },
  { id: 'DO', nombre: 'República Dominicana' },
  { id: 'US', nombre: 'Estados Unidos' },
  { id: 'ES', nombre: 'España' },
  { id: 'OTHER', nombre: 'Otro país' }
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
    // Step 1 - Institución
    institucion: '',
    tipo: '',
    pais: 'CL',
    ciudad: '',
    region: '',
    sitioWeb: '',
    // Step 2 - Usuario
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState(false)
  const [emailRegistrado, setEmailRegistrado] = useState('')
  
  // Estado para validación de nombre de institución
  const [validandoNombre, setValidandoNombre] = useState(false)
  const [nombreStatus, setNombreStatus] = useState(null)
  
  // Estado para modal de disputa
  const [mostrarDisputa, setMostrarDisputa] = useState(false)
  const [disputaData, setDisputaData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    documento: '',
    justificacion: ''
  })
  const [enviandoDisputa, setEnviandoDisputa] = useState(false)
  const [disputaEnviada, setDisputaEnviada] = useState(false)
  
  const navigate = useNavigate()
  const { signup, resendVerification } = useAuth()

  // Debounce para validar nombre
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.institucion.trim().length >= 3) {
        validarNombreInstitucion(formData.institucion.trim())
      } else {
        setNombreStatus(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.institucion])

  const validarNombreInstitucion = async (nombre) => {
    if (!isSupabaseConfigured()) return
    
    setValidandoNombre(true)
    try {
      const { data, error } = await supabase.rpc('verificar_nombre_institucion', {
        nombre_buscar: nombre
      })

      if (error) {
        const { data: instExiste } = await supabase
          .from('instituciones')
          .select('id, nombre')
          .ilike('nombre', nombre)
          .maybeSingle()

        if (instExiste) {
          setNombreStatus({
            disponible: false,
            mensaje: 'Este nombre ya está registrado',
            puede_disputar: true,
            institucion_id: instExiste.id
          })
        } else {
          setNombreStatus({
            disponible: true,
            mensaje: 'Nombre disponible',
            puede_disputar: false
          })
        }
      } else {
        setNombreStatus(data)
      }
    } catch (err) {
      console.error('Error validando nombre:', err)
    } finally {
      setValidandoNombre(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    if (name === 'institucion') {
      setNombreStatus(null)
    }
    
    // Resetear ciudad si cambia el país
    if (name === 'pais') {
      setFormData(prev => ({ ...prev, pais: value, ciudad: '', region: '' }))
    }
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    setError('')

    // Validaciones Step 1
    if (!formData.institucion.trim()) {
      setError('Ingresa el nombre de tu institución')
      return
    }
    if (formData.institucion.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres')
      return
    }
    if (nombreStatus && !nombreStatus.disponible) {
      setError('Este nombre no está disponible')
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
    if (!formData.ciudad.trim()) {
      setError('Ingresa la ciudad')
      return
    }

    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.nombre.trim()) {
      setError('Ingresa tu nombre')
      return
    }
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
        tipo: formData.tipo,
        pais: PAISES.find(p => p.id === formData.pais)?.nombre || formData.pais,
        ciudad: formData.ciudad,
        region: formData.region || null,
        sitioWeb: formData.sitioWeb || null,
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password
      })

      if (result.success) {
        if (result.requiresVerification) {
          setEmailRegistrado(result.email || formData.email)
          setRegistroExitoso(true)
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

  // ========== DISPUTAS ==========
  const handleAbrirDisputa = () => {
    setDisputaData({
      ...disputaData,
      nombre: formData.nombre || '',
      email: formData.email || ''
    })
    setMostrarDisputa(true)
  }

  const handleDisputaChange = (e) => {
    setDisputaData({ ...disputaData, [e.target.name]: e.target.value })
  }

  const handleEnviarDisputa = async (e) => {
    e.preventDefault()
    
    if (!disputaData.nombre || !disputaData.email || !disputaData.justificacion) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    setEnviandoDisputa(true)
    try {
      const { error } = await supabase
        .from('disputas_nombre')
        .insert({
          nombre_disputado: formData.institucion.trim(),
          institucion_existente_id: nombreStatus?.institucion_id || null,
          reclamante_nombre: disputaData.nombre,
          reclamante_email: disputaData.email,
          reclamante_telefono: disputaData.telefono || null,
          reclamante_documento: disputaData.documento || null,
          justificacion: disputaData.justificacion,
          estado: 'pendiente'
        })

      if (error) throw error

      setDisputaEnviada(true)
    } catch (err) {
      console.error('Error enviando disputa:', err)
      alert('Error al enviar la disputa. Por favor intenta de nuevo.')
    } finally {
      setEnviandoDisputa(false)
    }
  }

  // ========== PANTALLA DE DISPUTA ENVIADA ==========
  if (disputaEnviada) {
    return (
      <div className="auth-container">
        <div className="auth-left items-center justify-center p-12">
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Icon name="GraduationCap" className="text-white" size={32} />
              </div>
              <span className="font-display text-3xl font-bold text-white">Admitio</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-4">
              Disputa recibida
            </h1>
          </div>
        </div>

        <div className="auth-right bg-slate-50">
          <div className="auth-form text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="FileText" className="text-amber-600" size={40} />
            </div>

            <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
              Hemos recibido tu solicitud
            </h2>

            <p className="text-slate-600 mb-6">
              Tu disputa por el nombre "<strong>{formData.institucion}</strong>" ha sido registrada.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-amber-800">
                <strong>¿Qué sigue?</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>Revisaremos tu solicitud en 24-48 horas</li>
                <li>Te contactaremos a <strong>{disputaData.email}</strong></li>
                <li>Podríamos solicitar documentación adicional</li>
              </ul>
            </div>

            <Link to="/" className="btn btn-primary w-full justify-center">
              <Icon name="Home" size={18} />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ========== MODAL DE DISPUTA ==========
  if (mostrarDisputa) {
    return (
      <div className="auth-container">
        <div className="auth-left items-center justify-center p-12">
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Icon name="GraduationCap" className="text-white" size={32} />
              </div>
              <span className="font-display text-3xl font-bold text-white">Admitio</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-4">
              Disputar nombre
            </h1>
            <p className="text-white/80 text-lg">
              Si crees que el nombre "{formData.institucion}" te pertenece legítimamente, completa este formulario.
            </p>
          </div>
        </div>

        <div className="auth-right bg-slate-50">
          <div className="auth-form">
            <button 
              onClick={() => setMostrarDisputa(false)}
              className="flex items-center gap-2 text-slate-500 hover:text-violet-600 mb-6"
            >
              <Icon name="ArrowLeft" size={18} />
              Volver al registro
            </button>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <Icon name="AlertTriangle" className="text-red-500 flex-shrink-0" size={20} />
                <div>
                  <p className="text-sm text-red-800 font-medium">
                    Nombre ocupado: "{formData.institucion}"
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Este nombre ya está registrado por otra institución.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleEnviarDisputa} className="space-y-4">
              <div>
                <label className="form-label">Tu nombre completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={disputaData.nombre}
                  onChange={handleDisputaChange}
                  className="form-input"
                  placeholder="Nombre del representante legal"
                  required
                />
              </div>

              <div>
                <label className="form-label">Email de contacto *</label>
                <input
                  type="email"
                  name="email"
                  value={disputaData.email}
                  onChange={handleDisputaChange}
                  className="form-input"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={disputaData.telefono}
                  onChange={handleDisputaChange}
                  className="form-input"
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div>
                <label className="form-label">RUT o documento de identidad</label>
                <input
                  type="text"
                  name="documento"
                  value={disputaData.documento}
                  onChange={handleDisputaChange}
                  className="form-input"
                  placeholder="12.345.678-9"
                />
              </div>

              <div>
                <label className="form-label">¿Por qué reclamas este nombre? *</label>
                <textarea
                  name="justificacion"
                  value={disputaData.justificacion}
                  onChange={handleDisputaChange}
                  className="form-input min-h-[120px]"
                  placeholder="Explica por qué este nombre te pertenece legítimamente."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={enviandoDisputa}
                className="btn btn-primary w-full justify-center py-4"
              >
                {enviandoDisputa ? (
                  <>
                    <div className="spinner"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={18} />
                    Enviar solicitud de disputa
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ========== PANTALLA DE ÉXITO ==========
  if (registroExitoso) {
    return (
      <div className="auth-container">
        <div className="auth-left items-center justify-center p-12">
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Icon name="GraduationCap" className="text-white" size={32} />
              </div>
              <span className="font-display text-3xl font-bold text-white">Admitio</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-4">
              ¡Ya casi está listo!
            </h1>
            <p className="text-white/80 text-lg">
              Solo falta verificar tu correo.
            </p>
          </div>
        </div>

        <div className="auth-right bg-slate-50">
          <div className="auth-form text-center">
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
            </p>

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
                    Reenviar email
                  </>
                )}
              </button>

              <Link to="/login" className="btn btn-primary w-full justify-center">
                <Icon name="LogIn" size={18} />
                Ir a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== FORMULARIO DE REGISTRO ==========
  return (
    <div className="auth-container">
      {/* Left Side */}
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
            Únete a las instituciones que ya transformaron su proceso de admisiones.
          </p>
          
          <div className="space-y-4">
            {[
              'Dashboard intuitivo para gestionar leads',
              'Formularios personalizables para tu web',
              'Reportes de conversión en tiempo real',
              'Gratis para comenzar'
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

      {/* Right Side */}
      <div className="auth-right bg-slate-50">
        <div className="auth-form">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
              <Icon name="GraduationCap" className="text-white" size={28} />
            </div>
            <span className="font-display text-2xl font-bold text-slate-800">Admitio</span>
          </div>

          {/* Progress */}
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

          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
              {step === 1 ? 'Datos de tu institución' : 'Datos del administrador'}
            </h2>
            <p className="text-slate-500 text-sm">
              {step === 1 ? 'Cuéntanos sobre tu institución' : 'Serás el Key Master de tu institución'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
              <Icon name="AlertCircle" size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Institución */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="form-label">Nombre de la institución *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Building" size={18} />
                  </div>
                  <input
                    type="text"
                    name="institucion"
                    value={formData.institucion}
                    onChange={handleChange}
                    className={`form-input pl-11 pr-11 ${
                      nombreStatus 
                        ? nombreStatus.disponible 
                          ? 'border-green-500 focus:border-green-500' 
                          : 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    placeholder="Ej: Instituto de Música ProJazz"
                    required
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {validandoNombre && (
                      <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {!validandoNombre && nombreStatus && (
                      nombreStatus.disponible ? (
                        <Icon name="CheckCircle" className="text-green-500" size={18} />
                      ) : (
                        <Icon name="XCircle" className="text-red-500" size={18} />
                      )
                    )}
                  </div>
                </div>
                
                {nombreStatus && (
                  <p className={`mt-1 text-xs ${nombreStatus.disponible ? 'text-green-600' : 'text-red-600'}`}>
                    {nombreStatus.mensaje}
                  </p>
                )}

                {nombreStatus && !nombreStatus.disponible && nombreStatus.puede_disputar && (
                  <button
                    type="button"
                    onClick={handleAbrirDisputa}
                    className="mt-2 text-xs text-amber-700 hover:text-amber-800 underline flex items-center gap-1"
                  >
                    <Icon name="FileText" size={12} />
                    ¿Este nombre te pertenece? Disputar
                  </button>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="form-label">Tipo de institución *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Tag" size={18} />
                  </div>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="form-input pl-11 appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Selecciona el tipo</option>
                    {TIPOS_INSTITUCION.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Icon name="ChevronDown" size={18} className="text-slate-400" />
                  </div>
                </div>
              </div>

              {/* País */}
              <div>
                <label className="form-label">País *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Globe" size={18} />
                  </div>
                  <select
                    name="pais"
                    value={formData.pais}
                    onChange={handleChange}
                    className="form-input pl-11 appearance-none cursor-pointer"
                    required
                  >
                    {PAISES.map(pais => (
                      <option key={pais.id} value={pais.id}>{pais.nombre}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Icon name="ChevronDown" size={18} className="text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Ciudad y Región (solo Chile) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Ciudad *</label>
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
                {formData.pais === 'CL' && (
                  <div>
                    <label className="form-label">Región</label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="form-input appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar</option>
                      {REGIONES_CHILE.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sitio web */}
              <div>
                <label className="form-label">Sitio web <span className="text-slate-400">(opcional)</span></label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Link" size={18} />
                  </div>
                  <input
                    type="url"
                    name="sitioWeb"
                    value={formData.sitioWeb}
                    onChange={handleChange}
                    className="form-input pl-11"
                    placeholder="https://www.tuinstitucion.cl"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={nombreStatus && !nombreStatus.disponible}
                className={`btn w-full justify-center py-3 mt-2 ${
                  nombreStatus && !nombreStatus.disponible 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                Continuar
                <Icon name="ArrowRight" size={18} />
              </button>
            </form>
          )}

          {/* Step 2: Usuario */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Tu nombre completo *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="User" size={18} />
                  </div>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="form-input pl-11"
                    placeholder="Tu nombre"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Correo electrónico *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Mail" size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input pl-11"
                    placeholder="tu@institucion.cl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Contraseña *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Lock" size={18} />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input pl-11"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Confirmar contraseña *</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="Lock" size={18} />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input pl-11"
                    placeholder="Repite tu contraseña"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="btn btn-secondary flex-1 justify-center"
                >
                  <Icon name="ArrowLeft" size={16} />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-[2] justify-center py-3"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      Crear cuenta
                      <Icon name="Check" size={18} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                Al crear tu cuenta, aceptas nuestros{' '}
                <a href="#" className="text-violet-600 hover:underline">Términos de Servicio</a>
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold">
                Inicia sesión
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <Link to="/" className="flex items-center justify-center gap-2 text-slate-500 hover:text-violet-600 transition-colors text-sm">
              <Icon name="ArrowLeft" size={16} />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
