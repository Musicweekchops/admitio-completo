import React from 'react'
import Icon from './Icon'
import IntegracionGoogleSheets from './IntegracionGoogleSheets'

const BarraUso = ({ label, usado, maximo, color = 'violet' }) => {
  const porcentaje = maximo > 0 ? Math.min(100, Math.round((usado / maximo) * 100)) : 0
  const colorClasses = {
    violet: { bg: 'bg-violet-500', light: 'bg-violet-100' },
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100' },
    blue: { bg: 'bg-blue-500', light: 'bg-blue-100' },
    amber: { bg: 'bg-amber-500', light: 'bg-amber-100' },
    red: { bg: 'bg-red-500', light: 'bg-red-100' },
  }
  const c = colorClasses[porcentaje >= 90 ? 'red' : porcentaje >= 70 ? 'amber' : color]

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{usado} / {maximo}</span>
      </div>
      <div className={`h-3 ${c.light} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${c.bg} rounded-full transition-all duration-500`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      {porcentaje >= 90 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <Icon name="AlertTriangle" size={12} />
          {porcentaje >= 100 ? 'Límite alcanzado' : 'Cerca del límite'}
        </p>
      )}
    </div>
  )
}

const ConfiguracionView = ({ 
  user, 
  institucion, 
  planInfo, 
  nombreInstitucion, 
  setNotification 
}) => {
  const PLANES_INFO = {
    free: { nombre: 'Gratis', color: 'slate', descripcion: 'Ideal para probar la plataforma' },
    prueba: { nombre: 'Prueba', color: 'slate', descripcion: 'Plan de prueba gratuito' },
    inicial: { nombre: 'Inicial', color: 'blue', descripcion: 'Para instituciones pequeñas' },
    profesional: { nombre: 'Profesional', color: 'violet', descripcion: 'Para instituciones en crecimiento' },
    premium: { nombre: 'Premium', color: 'amber', descripcion: 'Para instituciones consolidadas' },
    enterprise: { nombre: 'Enterprise', color: 'emerald', descripcion: 'Solución personalizada' },
  }

  const planActual = PLANES_INFO[planInfo?.plan] || PLANES_INFO.free
  const limites = planInfo?.limites || { max_leads: 10, max_usuarios: 1, max_formularios: 1 }
  const uso = planInfo?.uso || { leads: 0, usuarios: 0, formularios: 0 }

  const handleContactUpgrade = () => {
    const asunto = encodeURIComponent(`Upgrade de Plan - ${institucion?.nombre || 'Mi Institución'}`)
    const cuerpo = encodeURIComponent(`Hola,

Me gustaría conocer más sobre los planes de Admitio para mi institución.

Datos actuales:
- Institución: ${institucion?.nombre || 'N/A'}
- Plan actual: ${planActual.nombre}
- Leads actuales: ${uso.leads}
- Usuarios actuales: ${uso.usuarios}

Gracias.`)

    window.open(`mailto:contacto@admitio.cl?subject=${asunto}&body=${cuerpo}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Icon name="Settings" className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configuración</h1>
            <p className="text-slate-300">Gestiona tu cuenta y plan de suscripción</p>
          </div>
        </div>
      </div>

      {/* Info del Usuario */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Icon name="User" size={20} className="text-slate-400" />
          Información de la Cuenta
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Usuario</p>
            <p className="font-medium text-slate-800">{user?.nombre}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium text-slate-800">{user?.email}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Rol</p>
            <p className="font-medium text-slate-800 capitalize">{user?.rol_id}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Institución</p>
            <p className="font-medium text-slate-800">{institucion?.nombre || nombreInstitucion}</p>
          </div>
        </div>
      </div>

      {/* Plan Actual */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Icon name="CreditCard" size={20} className="text-slate-400" />
            Plan Actual
          </h3>
          <span className={`px-4 py-2 rounded-full text-sm font-bold bg-${planActual.color}-100 text-${planActual.color}-700`}>
            {planActual.nombre}
          </span>
        </div>

        <p className="text-slate-500 mb-6">{planActual.descripcion}</p>

        {/* Barras de uso */}
        <div className="space-y-6">
          <BarraUso
            label="Leads"
            usado={uso.leads}
            maximo={limites.max_leads}
            color="violet"
          />
          <BarraUso
            label="Usuarios"
            usado={uso.usuarios}
            maximo={limites.max_usuarios}
            color="blue"
          />
          <BarraUso
            label="Formularios"
            usado={uso.formularios}
            maximo={limites.max_formularios}
            color="emerald"
          />
        </div>
      </div>

      {/* Mejorar Plan */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon name="Zap" className="text-violet-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 mb-1">¿Necesitas más capacidad?</h3>
            <p className="text-slate-600 text-sm mb-4">
              Actualiza tu plan para obtener más leads, usuarios y funcionalidades avanzadas.
            </p>
            <button
              onClick={handleContactUpgrade}
              className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
            >
              <Icon name="Mail" size={18} />
              Contactar para Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Planes */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Comparativa de Planes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Característica</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">Gratis</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">Inicial</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">Profesional</th>
                <th className="text-center py-3 px-4 text-slate-500 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Leads</td>
                <td className="py-3 px-4 text-center font-medium">10</td>
                <td className="py-3 px-4 text-center font-medium">300</td>
                <td className="py-3 px-4 text-center font-medium">1,500</td>
                <td className="py-3 px-4 text-center font-medium">5,000</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Usuarios</td>
                <td className="py-3 px-4 text-center font-medium">1</td>
                <td className="py-3 px-4 text-center font-medium">5</td>
                <td className="py-3 px-4 text-center font-medium">15</td>
                <td className="py-3 px-4 text-center font-medium">50</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Formularios</td>
                <td className="py-3 px-4 text-center font-medium">1</td>
                <td className="py-3 px-4 text-center font-medium">1</td>
                <td className="py-3 px-4 text-center font-medium">3</td>
                <td className="py-3 px-4 text-center font-medium">10</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Importar CSV</td>
                <td className="py-3 px-4 text-center"><Icon name="X" size={16} className="inline text-slate-300" /></td>
                <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-600">Reportes Avanzados</td>
                <td className="py-3 px-4 text-center"><Icon name="X" size={16} className="inline text-slate-300" /></td>
                <td className="py-3 px-4 text-center"><Icon name="X" size={16} className="inline text-slate-300" /></td>
                <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
                <td className="py-3 px-4 text-center"><Icon name="Check" size={16} className="inline text-emerald-500" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Integración Google Sheets - Solo Enterprise */}
      {planInfo?.plan === 'enterprise' && (
        <IntegracionGoogleSheets 
          user={user}
          setNotification={setNotification}
        />
      )}
    </div>
  )
}

export default ConfiguracionView
