import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'

// Logo Component
const Logo = ({ className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/35 transition-transform hover:rotate-[-5deg] hover:scale-105">
      <Icon name="GraduationCap" className="text-white" size={28} />
    </div>
    <span className="font-display text-2xl font-bold text-slate-800">Admitio</span>
  </div>
)

// Navbar
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#como-funciona" className="text-slate-600 hover:text-violet-600 font-medium transition-colors">
            Cómo Funciona
          </a>
          <a href="#features" className="text-slate-600 hover:text-violet-600 font-medium transition-colors">
            Características
          </a>
          <a href="#pricing" className="text-slate-600 hover:text-violet-600 font-medium transition-colors">
            Precios
          </a>
          <a href="#faq" className="text-slate-600 hover:text-violet-600 font-medium transition-colors">
            FAQ
          </a>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="btn btn-ghost">
            Iniciar Sesión
          </Link>
          <Link to="/signup" className="btn btn-primary">
            Comenzar Gratis
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-slate-700"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Icon name={mobileOpen ? 'X' : 'Menu'} size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-xl p-4 animate-slide-up">
          <div className="flex flex-col gap-4">
            <a href="#como-funciona" className="text-slate-600 py-2" onClick={() => setMobileOpen(false)}>
              Cómo Funciona
            </a>
            <a href="#features" className="text-slate-600 py-2" onClick={() => setMobileOpen(false)}>
              Características
            </a>
            <a href="#pricing" className="text-slate-600 py-2" onClick={() => setMobileOpen(false)}>
              Precios
            </a>
            <a href="#faq" className="text-slate-600 py-2" onClick={() => setMobileOpen(false)}>
              FAQ
            </a>
            <hr className="border-slate-200" />
            <Link to="/login" className="btn btn-ghost justify-center" onClick={() => setMobileOpen(false)}>
              Iniciar Sesión
            </Link>
            <Link to="/signup" className="btn btn-primary justify-center" onClick={() => setMobileOpen(false)}>
              Comenzar Gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// Hero Section
const Hero = () => (
  <section className="min-h-screen flex items-center relative overflow-hidden pt-24 pb-16 px-4">
    {/* Background */}
    <div className="absolute inset-0 z-0">
      <div className="hero-gradient"></div>
      <div className="hero-gradient-2"></div>
      <div className="hero-grid"></div>
      
      {/* Floating Shapes */}
      <div className="absolute top-[10%] right-[5%] w-72 h-72 bg-gradient-to-br from-violet-200 to-violet-100 rounded-full opacity-60 animate-float" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute top-[60%] right-[15%] w-36 h-36 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full opacity-30 animate-float" style={{ animationDelay: '-4s' }}></div>
      <div className="absolute top-[20%] left-[10%] w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full opacity-40 animate-float" style={{ animationDelay: '-1s' }}></div>
      <div className="absolute bottom-[10%] left-[5%] w-48 h-48 bg-gradient-to-br from-violet-300 to-violet-400 rounded-full opacity-30 animate-float" style={{ animationDelay: '-3s' }}></div>
    </div>

    <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
      {/* Text */}
      <div className="animate-slide-in-left">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-100 to-violet-50 border border-violet-200 rounded-full text-sm font-semibold text-violet-700 mb-6">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Próximamente: Reportes con IA
        </div>

        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          Transforma tus <span className="gradient-text">admisiones</span> en <span className="gradient-text-emerald">matrículas</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl leading-relaxed">
          El sistema de gestión de admisiones más inteligente para instituciones educativas. Captura leads, automatiza seguimientos y aumenta tu tasa de conversión.
        </p>

        <div className="flex flex-wrap gap-4 mb-10">
          <Link to="/signup" className="btn btn-primary btn-large">
            <Icon name="ChevronRight" size={20} />
            Comenzar Gratis
          </Link>
          <a href="#como-funciona" className="btn btn-secondary btn-large">
            Ver Demo
          </a>
        </div>

        <div className="flex gap-8 md:gap-12">
          <div>
            <div className="font-display text-3xl font-bold text-slate-900">+85%</div>
            <div className="text-sm text-slate-500">Tasa de conversión</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold text-slate-900">-60%</div>
            <div className="text-sm text-slate-500">Tiempo de respuesta</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold text-slate-900">24/7</div>
            <div className="text-sm text-slate-500">Captura de leads</div>
          </div>
        </div>
      </div>

      {/* Visual */}
      <div className="animate-slide-in-right relative">
        <div className="mockup-3d bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Window Header */}
          <div className="flex items-center gap-2 px-5 py-4 bg-slate-50 border-b border-slate-200">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          </div>
          
          {/* Content */}
          <div className="p-6 bg-gradient-to-b from-slate-50 to-white">
            <div className="flex gap-5">
              {/* Mini Sidebar */}
              <div className="flex flex-col gap-3">
                {['Home', 'Users', 'BarChart3', 'Settings'].map((icon, i) => (
                  <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon name={icon} size={18} />
                  </div>
                ))}
              </div>
              
              {/* Main Content */}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-slate-200 rounded"></div>
                  <div className="h-8 w-24 bg-violet-600 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { color: 'bg-violet-100', text: 'text-violet-600', value: '127' },
                    { color: 'bg-emerald-100', text: 'text-emerald-600', value: '84' },
                    { color: 'bg-amber-100', text: 'text-amber-600', value: '32' }
                  ].map((stat, i) => (
                    <div key={i} className={`${stat.color} rounded-xl p-3 text-center`}>
                      <div className={`font-bold text-lg ${stat.text}`}>{stat.value}</div>
                      <div className="h-2 w-12 bg-white/50 rounded mx-auto mt-1"></div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-violet-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                        <div className="h-2 w-16 bg-slate-100 rounded mt-1"></div>
                      </div>
                      <div className="h-6 w-16 bg-emerald-100 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

// How It Works
const HowItWorks = () => {
  const steps = [
    { icon: 'FileText', title: 'Crea tu formulario', desc: 'Diseña formularios personalizados y embébelos en tu sitio web en minutos.' },
    { icon: 'Users', title: 'Captura leads', desc: 'Los interesados llenan el formulario y llegan automáticamente a tu dashboard.' },
    { icon: 'Mail', title: 'Gestiona y convierte', desc: 'Asigna, contacta y haz seguimiento hasta convertirlos en matrículas.' }
  ]

  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-sm font-semibold text-violet-700 uppercase tracking-wide mb-4">
            ⚡ Simple y Efectivo
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            ¿Cómo funciona Admitio?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            En tres simples pasos, transforma tu proceso de admisiones
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < 2 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-violet-200"></div>
              )}
              <div className="card p-8 text-center relative z-10 bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/30">
                  <Icon name={step.icon} className="text-white" size={28} />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <h3 className="font-display text-xl font-bold text-slate-800 mb-3">{step.title}</h3>
                <p className="text-slate-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Features
const Features = () => {
  const features = [
    { icon: 'Users', title: 'Gestión de Leads', desc: 'Organiza todos tus prospectos en un solo lugar con estados personalizables.' },
    { icon: 'BarChart3', title: 'Reportes Avanzados', desc: 'Visualiza métricas de conversión, fuentes y rendimiento de tu equipo.' },
    { icon: 'FileCode', title: 'Formularios Embebibles', desc: 'Crea formularios con tu marca y agrégalos a cualquier página web.' },
    { icon: 'Mail', title: 'Seguimiento Automatizado', desc: 'Recordatorios y alertas para nunca perder un lead caliente.' },
    { icon: 'Upload', title: 'Importación Masiva', desc: 'Sube tus leads existentes desde Excel o CSV en segundos.' },
    { icon: 'Shield', title: 'Datos Seguros', desc: 'Encriptación SSL, backups automáticos y datos aislados por institución.' }
  ]

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-sm font-semibold text-violet-700 uppercase tracking-wide mb-4">
            🚀 Características
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Todo lo que necesitas para aumentar matrículas
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card p-6 hover:border-violet-300">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                <Icon name={f.icon} className="text-violet-600" size={24} />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Pricing
const Pricing = () => {
  const plans = [
    { name: 'Starter', price: '$0', period: '/mes', leads: '50 leads/mes', users: '1 usuario', features: ['Dashboard básico', 'Formulario embebible', 'Reportes simples'] },
    { name: 'Profesional', price: '$29', period: '/mes', leads: '500 leads/mes', users: '5 usuarios', features: ['Todo de Starter', 'Importación CSV', 'Reportes avanzados', 'Soporte prioritario'], featured: true },
    { name: 'Institución', price: '$79', period: '/mes', leads: 'Leads ilimitados', users: 'Usuarios ilimitados', features: ['Todo de Profesional', 'API personalizada', 'Onboarding dedicado', 'SLA garantizado'] }
  ]

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-slate-900 to-violet-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-semibold text-violet-300 uppercase tracking-wide mb-4">
            💰 Precios
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Planes que crecen contigo
          </h2>
          <p className="text-lg text-white/70">Sin compromisos. Cancela cuando quieras.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div key={i} className={`rounded-2xl p-8 ${plan.featured ? 'bg-white scale-105 shadow-2xl' : 'bg-white/10 backdrop-blur'}`}>
              <h3 className={`font-display text-xl font-bold mb-2 ${plan.featured ? 'text-slate-800' : 'text-white'}`}>{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`font-display text-4xl font-bold ${plan.featured ? 'text-violet-600' : 'text-white'}`}>{plan.price}</span>
                <span className={plan.featured ? 'text-slate-500' : 'text-white/60'}>{plan.period}</span>
              </div>
              <div className={`text-sm mb-6 ${plan.featured ? 'text-slate-600' : 'text-white/70'}`}>
                <p>{plan.leads}</p>
                <p>{plan.users}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className={`flex items-center gap-2 text-sm ${plan.featured ? 'text-slate-600' : 'text-white/80'}`}>
                    <Icon name="Check" className={plan.featured ? 'text-emerald-500' : 'text-emerald-400'} size={16} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`btn w-full justify-center ${
                  plan.featured
                    ? 'btn-primary'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}
              >
                {plan.price === '$0' ? 'Comenzar Gratis' : 'Probar 14 días gratis'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// FAQ
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0)

  const faqs = [
    { q: '¿Puedo probar Admitio antes de pagar?', a: '¡Por supuesto! Ofrecemos un plan gratuito con todas las funcionalidades básicas para que pruebes el sistema sin compromiso.' },
    { q: '¿Mis datos están seguros?', a: 'Absolutamente. Utilizamos encriptación SSL, backups automáticos diarios y servidores con certificación de seguridad.' },
    { q: '¿Puedo importar mis datos actuales?', a: 'Sí, puedes importar tus leads existentes desde archivos Excel o CSV. El sistema detecta automáticamente las columnas.' },
    { q: '¿Cómo integro el formulario en mi web?', a: 'Muy simple: creas tu formulario en Admitio, copias un código y lo pegas en cualquier página de tu sitio web.' },
    { q: '¿Ofrecen soporte técnico?', a: 'Todos los planes incluyen soporte por email. Los planes superiores incluyen chat en vivo y soporte telefónico.' }
  ]

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-sm font-semibold text-violet-700 uppercase tracking-wide mb-4">
            ❓ Preguntas Frecuentes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            ¿Tienes dudas?
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-300 ${
                openIndex === i
                  ? 'bg-white border-violet-300 shadow-lg shadow-violet-500/10'
                  : 'bg-slate-50 border-slate-200 hover:border-violet-200'
              }`}
            >
              <button
                className="w-full p-6 flex items-center justify-between gap-4 text-left"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              >
                <span className="font-display text-lg font-semibold text-slate-800">{faq.q}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  openIndex === i ? 'bg-violet-600 rotate-180' : 'bg-violet-100'
                }`}>
                  <Icon name="ChevronDown" className={openIndex === i ? 'text-white' : 'text-violet-600'} size={20} />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? 'max-h-48' : 'max-h-0'}`}>
                <p className="px-6 pb-6 text-slate-600">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA
const CTA = () => (
  <section className="py-24 bg-gradient-to-br from-violet-600 to-violet-800 relative overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
    </div>
    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
        ¿Listo para aumentar tus matrículas?
      </h2>
      <p className="text-xl text-white/80 mb-8">
        Únete a las instituciones que ya transformaron su proceso de admisiones.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/signup" className="btn btn-large bg-white text-violet-600 hover:bg-violet-50">
          Comenzar Gratis
        </Link>
        <Link to="/login" className="btn btn-large bg-transparent text-white border-2 border-white/30 hover:bg-white/10">
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  </section>
)

// Footer
const Footer = () => (
  <footer className="bg-slate-900 py-16">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
              <Icon name="GraduationCap" className="text-white" size={20} />
            </div>
            <span className="font-display text-xl font-bold text-white">Admitio</span>
          </div>
          <p className="text-slate-400 text-sm">
            El sistema de gestión de admisiones más inteligente para instituciones educativas en Chile.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-white mb-4">Producto</h4>
          <ul className="space-y-2">
            {['Características', 'Precios', 'Cómo Funciona'].map((item, i) => (
              <li key={i}>
                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-white mb-4">Soporte</h4>
          <ul className="space-y-2">
            {['Preguntas Frecuentes', 'Documentación', 'Contacto'].map((item, i) => (
              <li key={i}>
                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-white mb-4">Legal</h4>
          <ul className="space-y-2">
            {['Términos de Servicio', 'Privacidad', 'Cookies'].map((item, i) => (
              <li key={i}>
                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-500 text-sm">© 2024 Admitio. Todos los derechos reservados. Hecho con 💜 en Chile.</p>
        <div className="flex gap-4">
          {['Instagram', 'Linkedin', 'Twitter'].map((icon, i) => (
            <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-400 hover:bg-violet-600 hover:text-white transition-all">
              <Icon name={icon} size={20} />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
)

// Main Landing Page
const Landing = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}

export default Landing
