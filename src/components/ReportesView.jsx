import React, { useState, useMemo } from 'react'
import Icon from './Icon'
import * as store from '../lib/store'

const ReportesViewComponent = ({
  user,
  isRector,
  consultas,
  isKeyMaster,
  nombreInstitucion
}) => {
  // Estados principales
  const [periodo, setPeriodo] = useState('mes') // 'semana', 'mes', 'trimestre', 'año'
  const [activeTab, setActiveTab] = useState('embudo') // 'embudo', 'tendencia', 'carreras', 'medios', 'encargados'
  const [agrupacion, setAgrupacion] = useState('dia')

  // Calcular fechas según período seleccionado
  const { fechaInicio, fechaFin, fechaInicioAnterior, fechaFinAnterior } = useMemo(() => {
    const hoy = new Date()
    const fin = new Date(hoy)
    fin.setHours(23, 59, 59, 999)
    let inicio = new Date(hoy)
    let diasPeriodo = 30
    switch (periodo) {
      case 'semana': inicio.setDate(hoy.getDate() - 7); diasPeriodo = 7; break
      case 'mes': inicio.setMonth(hoy.getMonth() - 1); diasPeriodo = 30; break
      case 'trimestre': inicio.setMonth(hoy.getMonth() - 3); diasPeriodo = 90; break
      case 'año': inicio.setFullYear(hoy.getFullYear() - 1); diasPeriodo = 365; break
    }
    inicio.setHours(0, 0, 0, 0)
    const finAnterior = new Date(inicio)
    finAnterior.setDate(finAnterior.getDate() - 1)
    finAnterior.setHours(23, 59, 59, 999)
    const inicioAnterior = new Date(finAnterior)
    inicioAnterior.setDate(inicioAnterior.getDate() - diasPeriodo + 1)
    inicioAnterior.setHours(0, 0, 0, 0)
    return {
      fechaInicio: inicio.toISOString().split('T')[0],
      fechaFin: fin.toISOString().split('T')[0],
      fechaInicioAnterior: inicioAnterior.toISOString().split('T')[0],
      fechaFinAnterior: finAnterior.toISOString().split('T')[0]
    }
  }, [periodo])

  // Estados de filtro
  const [filtroEstados, setFiltroEstados] = useState([])
  const [filtroCarreras, setFiltroCarreras] = useState([])
  const [filtroMedios, setFiltroMedios] = useState([])
  const [filtroEncargados, setFiltroEncargados] = useState([])
  const [filtroTipoAlumno, setFiltroTipoAlumno] = useState('todos')

  // USAR DATOS FRESCOS
  const leadsReporte = useMemo(() => {
    let leads = isRector ? store.getConsultasParaReportes() : [...(consultas || [])]
    if (leads.length === 0 && !isRector) {
      leads = store.getConsultasParaReportes()
    }
    if (user?.rol_id === 'encargado' && user?.id) {
      leads = leads.filter(c => c.asignado_a === user.id)
    }
    if (fechaInicio) {
      const inicio = new Date(fechaInicio)
      inicio.setHours(0, 0, 0, 0)
      leads = leads.filter(c => new Date(c.created_at) >= inicio)
    }
    if (fechaFin) {
      const fin = new Date(fechaFin)
      fin.setHours(23, 59, 59, 999)
      leads = leads.filter(c => new Date(c.created_at) <= fin)
    }
    if (filtroEstados.length > 0) {
      leads = leads.filter(c => {
        if (filtroEstados.includes('matriculado') && c.matriculado) return true
        if (filtroEstados.includes('descartado') && c.descartado) return true
        if (!c.matriculado && !c.descartado && filtroEstados.includes(c.estado)) return true
        return false
      })
    }
    if (filtroCarreras.length > 0) leads = leads.filter(c => filtroCarreras.includes(c.carrera_id))
    if (filtroMedios.length > 0) leads = leads.filter(c => filtroMedios.includes(c.medio_id))
    if (filtroEncargados.length > 0) leads = leads.filter(c => filtroEncargados.includes(c.asignado_a))
    if (filtroTipoAlumno !== 'todos') leads = leads.filter(c => c.tipo_alumno === filtroTipoAlumno)
    return leads
  }, [consultas, isRector, fechaInicio, fechaFin, filtroEstados, filtroCarreras, filtroMedios, filtroEncargados, filtroTipoAlumno, user])

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const total = leadsReporte.length
    const matriculados = leadsReporte.filter(c => c.matriculado).length
    const descartados = leadsReporte.filter(c => c.descartado).length
    const activos = leadsReporte.filter(c => !c.matriculado && !c.descartado).length
    const porEstado = {
      nueva: leadsReporte.filter(c => c.estado === 'nueva' && !c.matriculado && !c.descartado).length,
      contactado: leadsReporte.filter(c => c.estado === 'contactado' && !c.matriculado && !c.descartado).length,
      seguimiento: leadsReporte.filter(c => c.estado === 'seguimiento' && !c.matriculado && !c.descartado).length,
      examen_admision: leadsReporte.filter(c => c.estado === 'examen_admision' && !c.matriculado && !c.descartado).length,
      matriculado: matriculados,
      descartado: descartados
    }
    const porCarrera = {}
    const todasCarreras = store.getCarreras()
    leadsReporte.forEach(c => {
      const carreraId = c.carrera_id || 'sin_carrera'
      if (!porCarrera[carreraId]) {
        const carrera = todasCarreras.find(ca => ca.id === carreraId)
        porCarrera[carreraId] = { total: 0, matriculados: 0, nombre: carrera?.nombre || c.carrera_nombre || 'Sin carrera', color: carrera?.color }
      }
      porCarrera[carreraId].total++; if (c.matriculado) porCarrera[carreraId].matriculados++
    })
    return { total, matriculados, descartados, activos, porEstado, porCarrera, tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0 }
  }, [leadsReporte])

  const [generandoPDF, setGenerandoPDF] = useState(false)

  const cargarJsPDF = () => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) { resolve(window.jspdf.jsPDF); return }
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      script.onload = () => window.jspdf ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF load error'))
      script.onerror = () => reject(new Error('jsPDF fetch error'))
      document.head.appendChild(script)
    })
  }

  const descargarPDF = async () => {
    setGenerandoPDF(true)
    try {
      const jsPDF = await cargarJsPDF()
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 15
      
      pdf.setFillColor(139, 92, 246)
      pdf.rect(0, 0, pageWidth, 45, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24).setFont('helvetica', 'bold').text('Reporte de Admisiones', margin, 20)
      pdf.setFontSize(12).setFont('helvetica', 'normal').text(nombreInstitucion, margin, 30)
      
      pdf.save(`Reporte_${nombreInstitucion.replace(/\s/g, '_')}_${fechaInicio}.pdf`)
    } catch (e) { console.error(e) }
    setGenerandoPDF(false)
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes de Admisión</h2>
          <p className="text-slate-500">Métricas y análisis de rendimiento</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPeriodo('mes')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${periodo === 'mes' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Mes</button>
          <button onClick={() => setPeriodo('trimestre')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${periodo === 'trimestre' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Trimestre</button>
          <button onClick={descargarPDF} disabled={generandoPDF} className="ml-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 flex items-center gap-2">
            <Icon name={generandoPDF ? "Loader2" : "Download"} size={18} className={generandoPDF ? "animate-spin" : ""} />
            {generandoPDF ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 italic">
          <p className="text-sm text-slate-500">Total Leads</p>
          <p className="text-3xl font-bold text-slate-800">{estadisticas.total}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Matrículas</p>
          <p className="text-3xl font-bold text-emerald-600">{estadisticas.matriculados}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Tasa de Conversión</p>
          <p className="text-3xl font-bold text-violet-600">{estadisticas.tasaConversion}%</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">En Seguimiento</p>
          <p className="text-3xl font-bold text-blue-600">{estadisticas.activos}</p>
        </div>
      </div>
      {/* Embudo de Ventas */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Embudo de Conversión</h3>
        <div className="space-y-4">
          {[
            { label: 'Nuevos', value: estadisticas.porEstado?.nueva || 0, color: 'bg-amber-500' },
            { label: 'Contactados', value: estadisticas.porEstado?.contactado || 0, color: 'bg-blue-500' },
            { label: 'En Seguimiento', value: estadisticas.porEstado?.seguimiento || 0, color: 'bg-purple-500' },
            { label: 'Matriculados', value: estadisticas.matriculados, color: 'bg-emerald-500' }
          ].map((item, i) => {
            const percentage = estadisticas.total > 0 ? Math.round((item.value / estadisticas.total) * 100) : 0
            return (
              <div key={i} className="relative">
                <div className="flex justify-between mb-1 text-sm">
                  <span className="font-medium text-slate-600">{item.label}</span>
                  <span className="text-slate-400">{item.value} ({percentage}%)</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rendimiento por Carrera */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Rendimiento por Carrera</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Carrera</th>
              <th className="px-6 py-4 text-center">Leads</th>
              <th className="px-6 py-4 text-center">Matrículas</th>
              <th className="px-6 py-4 text-center">Conversión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {Object.values(estadisticas.porCarrera).sort((a,b) => b.total - a.total).slice(0, 10).map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-medium text-slate-700">{c.nombre}</td>
                <td className="px-6 py-4 text-center text-slate-600">{c.total}</td>
                <td className="px-6 py-4 text-center text-emerald-600 font-semibold">{c.matriculados}</td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-md text-xs font-bold">
                    {c.total > 0 ? Math.round((c.matriculados/c.total)*100) : 0}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReportesViewComponent
