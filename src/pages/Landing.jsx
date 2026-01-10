import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  ChevronRight, 
  Users, 
  BarChart3, 
  FileText, 
  Mail, 
  Upload, 
  Shield,
  Check,
  Phone,
  ChevronDown,
  Instagram,
  Linkedin,
  Twitter,
  Menu,
  X
} from 'lucide-react';

// Logo Component
const Logo = ({ className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/35 transition-transform hover:rotate-[-5deg] hover:scale-105">
      <GraduationCap className="w-7 h-7 text-white" />
    </div>
    <span className="font-display text-2xl font-bold text-slate-800">Admitio</span>
  </div>
);

// Navbar
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
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
  );
};

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
            <ChevronRight className="w-5 h-5" />
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
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-2xl font-bold text-slate-800">247</div>
                    <div className="text-xs text-slate-500">Leads activos</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-2xl font-bold text-emerald-500">89</div>
                    <div className="text-xs text-slate-500">Matriculados</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-2xl font-bold text-violet-500">36%</div>
                    <div className="text-xs text-slate-500">Conversión</div>
                  </div>
                </div>
                
                {/* Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 h-32 flex items-end gap-2">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-md"
                      style={{ height: `${h}%` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-xl animate-bounce-subtle hidden lg:block">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mb-2">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div className="font-semibold text-slate-800 text-sm">¡Nuevo matriculado!</div>
          <div className="text-xs text-slate-500">Piano - Hace 2 min</div>
        </div>

        <div className="absolute bottom-10 -left-8 bg-white rounded-2xl p-4 shadow-xl animate-bounce-subtle hidden lg:block" style={{ animationDelay: '-1.5s' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-2">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div className="font-semibold text-slate-800 text-sm">5 leads pendientes</div>
          <div className="text-xs text-slate-500">Contactar hoy</div>
        </div>
      </div>
    </div>
  </section>
);

// Logos Section
const Logos = () => (
  <section className="py-16 bg-white border-y border-slate-100">
    <div className="max-w-6xl mx-auto px-4 text-center">
      <p className="text-sm text-slate-500 uppercase tracking-wider mb-8">
        ¡PARA QUIÉN ESTÁ PENSADO?
      </p>
      <div className="flex justify-center items-center gap-12 flex-wrap opacity-60">
        {['ESCUELAS DE MÚSICA', 'UNIVERSIDADES', 'ACADEMIAS', 'COLEGIOS', 'CLUB DEPORTIVO'].map((name, i) => (
          <span key={i} className="font-display text-xl font-semibold text-slate-400 hover:text-slate-600 transition-colors">
            {name}
          </span>
        ))}
      </div>
    </div>
  </section>
);

// How It Works Section
const HowItWorks = () => {
  const steps = [
    { icon: FileText, title: 'Captura', desc: 'Formularios embebibles en tu sitio web que capturan leads automáticamente 24/7.' },
    { icon: Users, title: 'Asigna', desc: 'Distribución inteligente de leads entre tu equipo según carrera y carga de trabajo.' },
    { icon: Phone, title: 'Contacta', desc: 'Llamadas, WhatsApp y emails con un click. Todo queda registrado automáticamente.' },
    { icon: BarChart3, title: 'Analiza', desc: 'Reportes en tiempo real para optimizar tu proceso y aumentar conversiones.' },
  ];

  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-sm font-semibold text-violet-700 uppercase tracking-wide mb-4">
            ✨ Simple y Poderoso
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Cómo Funciona
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            En 4 simples pasos, transforma tu proceso de admisiones en una máquina de matriculas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-white border-2 border-violet-200 rounded-full flex items-center justify-center shadow-lg group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-violet-700 group-hover:border-violet-500 group-hover:scale-110 transition-all duration-300">
                <span className="font-display text-2xl font-bold text-violet-600 group-hover:text-white transition-colors">
                  {i + 1}
                </span>
              </div>
              <div className="w-14 h-14 mx-auto mb-4 bg-violet-100 rounded-2xl flex items-center justify-center">
                <step.icon className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="font-display text-xl font-semibold text-slate-800 mb-2">{step.title}</h3>
              <p className="text-slate-600 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Features Section
const Features = () => {
  const features = [
    { icon: '📊', title: 'Dashboard Inteligente', desc: 'Métricas en tiempo real. Revisa tu embudo de conversión de un vistazo.', color: 'violet' },
    { icon: '✅', title: 'Detección de Duplicados', desc: 'Algoritmo que detecta leads duplicados automáticamente para mantener tu base de datos limpia.', color: 'emerald' },
    { icon: '📝', title: 'Formularios Web', desc: 'Crea formularios personalizados y pégalos en tu sitio con un simple código.', color: 'amber' },
    { icon: '📧', title: 'Emails Automáticos', desc: 'Notificaciones a tu equipo cuando llegan nuevos leads. Nunca pierdas una oportunidad.', color: 'rose' },
    { icon: '📥', title: 'Importación CSV', desc: 'Migra tus datos existentes con facilidad.', color: 'blue' },
    { icon: '👥', title: 'Roles y Permisos', desc: 'KeyMaster, Encargados, Asistentes y más. Cada rol ve sólo lo que necesita.', color: 'teal' },
  ];

  const colorClasses = {
    violet: 'from-violet-100 to-violet-200',
    emerald: 'from-emerald-100 to-emerald-200',
    amber: 'from-amber-100 to-amber-200',
    rose: 'from-rose-100 to-rose-200',
    blue: 'from-blue-100 to-blue-200',
    teal: 'from-teal-100 to-teal-200',
  };

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-sm font-semibold text-violet-700 uppercase tracking-wide mb-4">
            🚀 Todo lo que necesitas
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Características
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Herramientas diseñadas específicamente para instituciones educativas que quieren crecer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="card p-8 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses[feature.color]} flex items-center justify-center text-3xl mb-6`}>
                {feature.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Pricing Section
const Pricing = () => {
  const plans = [
    {
      name: 'Gratuito',
      tagline: 'Para empezar a probar',
      price: '$0',
      features: ['1 usuario', '10 leads activos', '1 formulario activo', 'Dashboard',],
      featured: false,
    },
    {
      name: 'Profesional',
      tagline: 'Para instituciones en crecimiento',
      price: '$119.990',
      features: ['15 usuarios', '500 leads activos', '10 formularios web', '200 emails/mes', 'Reportes avanzados', '5GB almacenamiento'],
      featured: true,
    },
    {
      name: 'Institución',
      tagline: 'Para grandes equipos',
      price: '$249.990',
      features: ['50 usuarios', '5,000 leads activos', '30 formularios web', '30,000 emails/mes', 'Reportes avanzados', '20GB almacenamiento'],
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-600/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/10 to-transparent"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 rounded-full text-sm font-semibold text-violet-300 uppercase tracking-wide mb-4">
            💰 Precios transparentes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Planes para cada institución
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Comienza gratis y escala según tus necesidades. Crecemos junto contigo.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 ${
                plan.featured
                  ? 'bg-white scale-105 shadow-2xl'
                  : 'bg-white/5 backdrop-blur border border-white/10'
              }`}
            >
              {plan.featured && (
                <span className="inline-block px-3 py-1 bg-gradient-to-r from-violet-500 to-violet-600 text-white text-xs font-semibold uppercase tracking-wide rounded-full mb-4">
                  Más Popular
                </span>
              )}
              <h3 className={`font-display text-2xl font-semibold mb-2 ${plan.featured ? 'text-slate-800' : 'text-white'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-6 ${plan.featured ? 'text-slate-500' : 'text-slate-400'}`}>
                {plan.tagline}
              </p>
              <div className="mb-6">
                <span className={`font-display text-4xl font-bold ${plan.featured ? 'text-violet-600' : 'text-white'}`}>
                  {plan.price}
                </span>
                <span className={plan.featured ? 'text-slate-500' : 'text-slate-400'}>/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className={`flex items-center gap-3 text-sm ${plan.featured ? 'text-slate-600' : 'text-slate-300'}`}>
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    {feature}
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
                {plan.price === '$0' ? 'Comenzar Gratis' : 'Contactar'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// FAQ Section
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    { q: '¿Puedo probar Admitio antes de pagar?', a: '¡Por supuesto! Ofrecemos un plan gratuito con todas las funcionalidades básicas para que pruebes el sistema sin compromiso. Además, los planes de pago tienen 14 días de prueba gratis.' },
    { q: '¿Mis datos están seguros?', a: 'Absolutamente. Utilizamos encriptación SSL, backups automáticos diarios y servidores con certificación de seguridad. Cada institución tiene sus datos completamente aislados.' },
    { q: '¿Puedo importar mis datos actuales?', a: 'Sí, puedes importar tus leads existentes desde archivos Excel o CSV. El sistema detecta automáticamente las columnas y te guía en el proceso de importación.' },
    { q: '¿Cómo integro el formulario en mi web?', a: 'Muy simple: creas tu formulario en Admitio, personalizas los campos y colores, y copias un código que pegas en cualquier página de tu sitio web. Los leads llegan automáticamente.' },
    { q: '¿Qué pasa si supero el límite de leads?', a: 'Te avisamos cuando estés cerca del límite. Puedes hacer upgrade al siguiente plan o archivar leads antiguos para liberar espacio. Nunca perdemos tus datos.' },
    { q: '¿Ofrecen soporte técnico?', a: 'Todos los planes incluyen soporte por email. Los planes Profesional e Institución incluyen chat en vivo y el plan Institución tiene soporte telefónico prioritario.' },
  ];

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-sm font-semibold text-violet-700 uppercase tracking-wide mb-4">
            Preguntas Frecuentes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            ¿Tienes dudas?
          </h2>
          <p className="text-lg text-slate-600">
            Encuentra respuestas a las preguntas más comunes sobre Admitio.
          </p>
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
                  <ChevronDown className={`w-5 h-5 ${openIndex === i ? 'text-white' : 'text-violet-600'}`} />
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
  );
};

// CTA Section
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
);

// Footer
const Footer = () => (
  <footer className="bg-slate-900 py-16">
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">Admitio</span>
          </div>
          <p className="text-slate-400 text-sm">
            El sistema de gestión de admisión que transparenta y agiliza tu proceso de admisión.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-white mb-4">Producto</h4>
          <ul className="space-y-2">
            {['Características', 'Precios', 'Cómo Funciona', 'Actualizaciones'].map((item, i) => (
              <li key={i}>
                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-white mb-4">Soporte</h4>
          <ul className="space-y-2">
            {['Preguntas Frecuentes', 'Documentación', 'Contacto', 'Estado del Sistema'].map((item, i) => (
              <li key={i}>
                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-white mb-4">Legal</h4>
          <ul className="space-y-2">
            {['Términos de Servicio', 'Política de Privacidad', 'Cookies'].map((item, i) => (
              <li key={i}>
                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-500 text-sm">© 2025 Admitio. Todos los derechos reservados. Hecho con 💜 en Chile.</p>
        <div className="flex gap-4">
          {[Instagram, Linkedin, Twitter].map((Icon, i) => (
            <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-400 hover:bg-violet-600 hover:text-white transition-all">
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

// Main Landing Page
const Landing = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Logos />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
};

export default Landing;
