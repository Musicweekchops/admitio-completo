import React from 'react'
import Icon from './Icon'

const ConfiguracionViewComponent = ({
  user,
  planInfo,
  usageData,
  nombreInstitucion,
  setNotification,
  setLocalShowPlanModal
}) => {
  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
          <Icon name="Settings" className="text-slate-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración y Plan</h2>
          <p className="text-slate-500">Administra tu cuenta y suscripción</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Información de Perfil */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6">Información Personal</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.nombre?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{user?.nombre}</p>
                  <p className="text-slate-500 text-sm capitalize">{user?.rol_id?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-slate-700 font-medium">{user?.email}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Institución</p>
                  <p className="text-slate-700 font-medium">{nombreInstitucion}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plan y Suscripción */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-800">Plan y Uso de Datos</h3>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${planInfo?.id === 'gratis' ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-700'}`}>
                Plan {planInfo?.nombre || 'Actual'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Leads', current: usageData?.leads, max: planInfo?.limites?.max_leads, icon: 'Users', color: 'bg-blue-500' },
                { label: 'Usuarios', current: usageData?.usuarios, max: planInfo?.limites?.max_usuarios, icon: 'UserPlus', color: 'bg-violet-500' },
                { label: 'Formularios', current: usageData?.formularios, max: planInfo?.limites?.max_formularios, icon: 'Layout', color: 'bg-emerald-500' }
              ].map((stat, i) => {
                const percentage = Math.min(100, Math.round((stat.current / (stat.max || 1)) * 100))
                return (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center text-${stat.color.split('-')[1]}-600`}>
                        <Icon name={stat.icon} size={18} />
                      </div>
                      <span className="text-xs font-bold text-slate-500">{percentage}%</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-800 mb-2">{stat.current} / {stat.max}</p>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-6 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-violet-200/50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="text-xl font-bold mb-2">¿Necesitas más capacidad?</h4>
                  <p className="text-violet-100 text-sm max-w-md">Actualiza tu plan para desbloquear más leads, usuarios y funciones avanzadas de automatización para tu institución.</p>
                </div>
                <button onClick={() => setLocalShowPlanModal(true)} className="px-6 py-3 bg-white text-violet-600 rounded-xl font-bold hover:bg-violet-50 transition-all shrink-0 shadow-sm active:scale-95">
                  Ver Planes Disponibles
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfiguracionViewComponent
