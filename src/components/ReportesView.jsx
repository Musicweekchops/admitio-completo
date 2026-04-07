import React, { useState, useMemo, memo, useEffect } from 'react'
import Icon from './Icon'
import * as store from '../lib/store'

const BarChart = memo(({ data }) => {
  if (data.length === 0) return <div className="h-72 flex items-center justify-center text-slate-400">Sin datos para mostrar</div>

  // Limitar a máximo 15 barras para legibilidad
  const displayData = data.length > 15 ? data.slice(-15) : data
  const maxVal = Math.max(...displayData.map(d => d.total), 1)

  // Calcular escala Y
  const yLabels = []
  const step = Math.ceil(maxVal / 4)
  for (let i = 0; i <= 4; i++) {
    yLabels.push(step * i)
  }
  yLabels.reverse()

  const formatFecha = (fecha) => {
    const [year, month, day] = fecha.split('-')
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return day ? `${parseInt(day)} ${meses[parseInt(month) - 1]}` : `${meses[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="h-80">
      {/* Leyenda superior */}
      <div className="flex items-center justify-end gap-6 mb-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-violet-500" />
          <span className="text-slate-600">Total leads</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-slate-600">Matriculados</span>
        </span>
      </div>

      <div className="flex h-64">
        {/* Eje Y */}
        <div className="flex flex-col justify-between pr-3 text-right">
          {yLabels.map((val, i) => (
            <span key={i} className="text-xs text-slate-400 font-medium">{val}</span>
          ))}
        </div>

        {/* Área del gráfico */}
        <div className="flex-1 relative">
          {/* Líneas de guía horizontales */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yLabels.map((_, i) => (
              <div key={i} className="border-t border-slate-100 w-full" />
            ))}
          </div>

          {/* Barras */}
          <div className="relative h-full flex items-end gap-1 px-1">
            {displayData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group min-w-[20px]">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20 whitespace-nowrap">
                  <p className="font-semibold">{formatFecha(d.fecha)}</p>
                  <p className="text-violet-300">Total: {d.total}</p>
                  <p className="text-emerald-300">Matriculados: {d.matriculados}</p>
                  <p className="text-slate-400">Descartados: {d.descartados}</p>
                </div>

                {/* Número sobre la barra */}
                <span className="text-xs font-bold text-slate-600 mb-1">{d.total > 0 ? d.total : ''}</span>

                {/* Barra principal (total) */}
                <div
                  className="w-full bg-violet-500 rounded-t-md transition-all duration-200 group-hover:bg-violet-600 relative"
                  style={{ height: `${(d.total / maxVal) * 100}%`, minHeight: d.total > 0 ? '4px' : '0' }}
                >
                  {/* Barra interna (matriculados) */}
                  {d.matriculados > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-md"
                      style={{ height: `${(d.matriculados / d.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eje X - Fechas */}
      <div className="flex mt-2 pl-8">
        <div className="flex-1 flex justify-between px-1">
          {displayData.map((d, i) => (
            <span
              key={i}
              className={`text-xs text-slate-500 text-center flex-1 ${displayData.length > 10 ? 'transform -rotate-45 origin-top-left mt-1' : ''}`}
              style={{ fontSize: displayData.length > 12 ? '10px' : '12px' }}
            >
              {displayData.length <= 10 || i % Math.ceil(displayData.length / 7) === 0 ? formatFecha(d.fecha) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
})

const LineChart = memo(({ data }) => {
  if (data.length < 2) return <div className="h-72 flex items-center justify-center text-slate-400">Se necesitan al menos 2 puntos de datos</div>

  const displayData = data.length > 20 ? data.slice(-20) : data
  const maxVal = Math.max(...displayData.map(d => d.total), 1)

  // Calcular escala Y
  const yLabels = []
  const step = Math.ceil(maxVal / 4)
  for (let i = 0; i <= 4; i++) {
    yLabels.push(step * i)
  }
  yLabels.reverse()

  const formatFecha = (fecha) => {
    const [year, month, day] = fecha.split('-')
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return day ? `${parseInt(day)} ${meses[parseInt(month) - 1]}` : `${meses[parseInt(month) - 1]} ${year}`
  }

  // Calcular puntos para el path SVG
  const chartWidth = 100
  const chartHeight = 100
  const padding = 2

  const getX = (i) => padding + (i / (displayData.length - 1)) * (chartWidth - padding * 2)
  const getY = (val) => chartHeight - padding - (val / maxVal) * (chartHeight - padding * 2)

  const pathTotal = displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.total)}`).join(' ')
  const pathMatr = displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.matriculados)}`).join(' ')

  // Área bajo la curva
  const areaTotal = `${pathTotal} L ${getX(displayData.length - 1)} ${chartHeight - padding} L ${getX(0)} ${chartHeight - padding} Z`

  return (
    <div className="h-80">
      {/* Leyenda superior */}
      <div className="flex items-center justify-end gap-6 mb-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-4 h-1 rounded-full bg-violet-500" />
          <span className="text-slate-600">Total leads</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-1 rounded-full bg-emerald-500" />
          <span className="text-slate-600">Matriculados</span>
        </span>
      </div>

      <div className="flex h-64">
        {/* Eje Y */}
        <div className="flex flex-col justify-between pr-3 text-right">
          {yLabels.map((val, i) => (
            <span key={i} className="text-xs text-slate-400 font-medium">{val}</span>
          ))}
        </div>

        {/* Área del gráfico */}
        <div className="flex-1 relative">
          {/* Líneas de guía horizontales */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yLabels.map((_, i) => (
              <div key={i} className="border-t border-slate-100 w-full" />
            ))}
          </div>

          {/* SVG del gráfico */}
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
            {/* Área sombreada */}
            <path d={areaTotal} fill="url(#gradientArea)" opacity="0.3" />

            {/* Degradado */}
            <defs>
              <linearGradient id="gradientArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Línea de total */}
            <path d={pathTotal} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Línea de matriculados */}
            <path d={pathMatr} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Puntos interactivos */}
            {displayData.map((d, i) => (
              <g key={i} className="group">
                {/* Punto total */}
                <circle
                  cx={getX(i)}
                  cy={getY(d.total)}
                  r="4"
                  fill="#8b5cf6"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
                {/* Punto matriculados */}
                <circle
                  cx={getX(i)}
                  cy={getY(d.matriculados)}
                  r="4"
                  fill="#10b981"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
                {/* Área hover invisible */}
                <rect
                  x={getX(i) - 3}
                  y="0"
                  width="6"
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                />
              </g>
            ))}
          </svg>

          {/* Tooltips (fuera del SVG para mejor renderizado) */}
          <div className="absolute inset-0 flex pointer-events-none">
            {displayData.map((d, i) => (
              <div
                key={i}
                className="flex-1 relative group pointer-events-auto"
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20 whitespace-nowrap">
                  <p className="font-semibold">{formatFecha(d.fecha)}</p>
                  <p className="text-violet-300">Total: {d.total}</p>
                  <p className="text-emerald-300">Matriculados: {d.matriculados}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eje X - Fechas */}
      <div className="flex mt-2 pl-8">
        <div className="flex-1 flex justify-between">
          {displayData.length <= 8 ? (
            displayData.map((d, i) => (
              <span key={i} className="text-xs text-slate-500">{formatFecha(d.fecha)}</span>
            ))
          ) : (
            <>
              <span className="text-xs text-slate-500">{formatFecha(displayData[0].fecha)}</span>
              <span className="text-xs text-slate-500">{formatFecha(displayData[Math.floor(displayData.length / 2)].fecha)}</span>
              <span className="text-xs text-slate-500">{formatFecha(displayData[displayData.length - 1].fecha)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

const ReportesView = memo(({
  isRector,
  isKeyMaster,
  user,
  consultas,
  nombreInstitucion,
  reloadFromSupabase,
  loadData,
  handleRefreshData,
  setNotification,
  formatearTiempoRespuesta
}) => {
  // Estados principales
  const [periodo, setPeriodo] = useState('mes') // 'semana', 'mes', 'trimestre', 'año'
  const [activeTab, setActiveTab] = useState('embudo') // 'embudo', 'tendencia', 'carreras', 'medios', 'encargados'
  const [tipoGrafico, setTipoGrafico] = useState('linea')
  const [agrupacion, setAgrupacion] = useState('dia')

  // Calcular fechas según período seleccionado
  const { fechaInicio, fechaFin, fechaInicioAnterior, fechaFinAnterior } = useMemo(() => {
    const hoy = new Date()
    const fin = new Date(hoy)
    fin.setHours(23, 59, 59, 999)

    let inicio = new Date(hoy)
    let diasPeriodo = 30

    switch (periodo) {
      case 'semana':
        inicio.setDate(hoy.getDate() - 7)
        diasPeriodo = 7
        break
      case 'mes':
        inicio.setMonth(hoy.getMonth() - 1)
        diasPeriodo = 30
        break
      case 'trimestre':
        inicio.setMonth(hoy.getMonth() - 3)
        diasPeriodo = 90
        break
      case 'año':
        inicio.setFullYear(hoy.getFullYear() - 1)
        diasPeriodo = 365
        break
    }
    inicio.setHours(0, 0, 0, 0)

    // Período anterior para comparación
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
  const [showFilters, setShowFilters] = useState(false)

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

    if (filtroCarreras.length > 0) {
      leads = leads.filter(c => filtroCarreras.includes(c.carrera_id))
    }

    if (filtroMedios.length > 0) {
      leads = leads.filter(c => filtroMedios.includes(c.medio_id))
    }

    if (filtroEncargados.length > 0) {
      leads = leads.filter(c => filtroEncargados.includes(c.asignado_a))
    }

    if (filtroTipoAlumno !== 'todos') {
      leads = leads.filter(c => c.tipo_alumno === filtroTipoAlumno)
    }

    return leads
  }, [consultas, isRector, fechaInicio, fechaFin, filtroEstados, filtroCarreras, filtroMedios, filtroEncargados, filtroTipoAlumno, user])

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
        const nombreCarrera = carrera?.nombre || c.carrera?.nombre || c.carrera_nombre || 'Sin carrera'
        porCarrera[carreraId] = { total: 0, matriculados: 0, nombre: nombreCarrera, color: carrera?.color }
      }
      porCarrera[carreraId].total++
      if (c.matriculado) porCarrera[carreraId].matriculados++
    })

    const porMedio = {}
    const todosLosMedios = store.getMedios()
    leadsReporte.forEach(c => {
      const medioId = c.medio_id || 'sin_medio'
      if (!porMedio[medioId]) {
        const medio = todosLosMedios.find(m => m.id === medioId)
        const nombreMedio = medio?.nombre || c.medio?.nombre || medioId
        porMedio[medioId] = { total: 0, matriculados: 0, nombre: nombreMedio, color: medio?.color }
      }
      porMedio[medioId].total++
      if (c.matriculado) porMedio[medioId].matriculados++
    })

    const porEncargado = {}
    const todosUsuarios = store.getTodosLosUsuarios()
    leadsReporte.forEach(c => {
      const encargadoId = c.asignado_a || 'sin_asignar'
      if (!porEncargado[encargadoId]) {
        const usuario = todosUsuarios.find(u => u.id === encargadoId)
        const nombreEncargado = usuario?.nombre || c.encargado?.nombre || 'Sin asignar'
        porEncargado[encargadoId] = {
          total: 0,
          matriculados: 0,
          contactados: 0,
          seguimiento: 0,
          gestionados: 0,
          nombre: nombreEncargado,
          tasa: 0,
          tasaGestion: 0
        }
      }
      porEncargado[encargadoId].total++
      if (c.matriculado) porEncargado[encargadoId].matriculados++

      // Métricas de Gestión
      if (c.estado === 'contactado') porEncargado[encargadoId].contactados++
      if (c.estado === 'seguimiento') porEncargado[encargadoId].seguimiento++

      // Total Gestionados (Cualquier estado que no sea 'nueva')
      if (c.estado !== 'nueva') porEncargado[encargadoId].gestionados++
    })

    Object.keys(porEncargado).forEach(id => {
      const e = porEncargado[id]
      e.tasa = e.total > 0 ? Math.round((e.matriculados / e.total) * 100) : 0
      e.tasaGestion = e.total > 0 ? Math.round((e.gestionados / e.total) * 100) : 0
    })

    const porTipoAlumno = {
      nuevo: leadsReporte.filter(c => c.tipo_alumno === 'nuevo' || !c.tipo_alumno).length,
      antiguo: leadsReporte.filter(c => c.tipo_alumno === 'antiguo').length
    }

    const leadsConPrimerContacto = leadsReporte.filter(c => c.fecha_primer_contacto && c.created_at)
    const tiemposRespuesta = leadsConPrimerContacto.map(c => {
      const inicio = new Date(c.created_at)
      const fin = new Date(c.fecha_primer_contacto)
      return (fin - inicio) / (1000 * 60 * 60) // Horas
    })
    const tiempoRespuestaPromedio = tiemposRespuesta.length > 0
      ? Math.round(tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length * 10) / 10
      : 0

    const leadsConCierre = leadsReporte.filter(c => c.fecha_cierre && c.created_at && c.matriculado)
    const tiemposCierre = leadsConCierre.map(c => {
      const inicio = new Date(c.created_at)
      const fin = new Date(c.fecha_cierre)
      return (fin - inicio) / (1000 * 60 * 60 * 24) // Días
    })
    const tiempoCierrePromedio = tiemposCierre.length > 0
      ? Math.round(tiemposCierre.reduce((a, b) => a + b, 0) / tiemposCierre.length * 10) / 10
      : 0

    return {
      total,
      matriculados,
      descartados,
      activos,
      porEstado,
      porCarrera,
      porMedio,
      porEncargado,
      porTipoAlumno,
      tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0,
      tiempoRespuestaPromedio,
      tiempoCierrePromedio
    }
  }, [leadsReporte])

  const estadisticasAnteriores = useMemo(() => {
    let leads = isRector ? store.getConsultasParaReportes() : [...consultas]

    if (leads.length === 0 && !isRector) {
      leads = store.getConsultasParaReportes()
    }

    if (user?.rol_id === 'encargado' && user?.id) {
      leads = leads.filter(c => c.asignado_a === user.id)
    }

    if (fechaInicioAnterior && fechaFinAnterior) {
      const inicio = new Date(fechaInicioAnterior)
      inicio.setHours(0, 0, 0, 0)
      const fin = new Date(fechaFinAnterior)
      fin.setHours(23, 59, 59, 999)
      leads = leads.filter(c => {
        const fecha = new Date(c.created_at)
        return fecha >= inicio && fecha <= fin
      })
    }

    const total = leads.length
    const matriculados = leads.filter(c => c.matriculado).length

    return {
      total,
      matriculados,
      tasaConversion: total > 0 ? Math.round((matriculados / total) * 100) : 0
    }
  }, [consultas, isRector, fechaInicioAnterior, fechaFinAnterior, user])

  const cambios = useMemo(() => {
    const cambioLeads = estadisticas.total - estadisticasAnteriores.total
    const cambioMatriculas = estadisticas.matriculados - estadisticasAnteriores.matriculados
    const cambioConversion = estadisticas.tasaConversion - estadisticasAnteriores.tasaConversion

    return {
      leads: cambioLeads,
      leadsPercent: estadisticasAnteriores.total > 0 ? Math.round((cambioLeads / estadisticasAnteriores.total) * 100) : 0,
      matriculas: cambioMatriculas,
      conversion: cambioConversion
    }
  }, [estadisticas, estadisticasAnteriores])

  const datosEmbudo = useMemo(() => {
    const total = estadisticas.total || 0
    return [
      { etapa: 'Nuevos', cantidad: estadisticas.porEstado?.nueva || 0, color: 'bg-amber-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.nueva || 0) / total) * 100) : 0 },
      { etapa: 'Contactados', cantidad: estadisticas.porEstado?.contactado || 0, color: 'bg-blue-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.contactado || 0) / total) * 100) : 0 },
      { etapa: 'Seguimiento', cantidad: estadisticas.porEstado?.seguimiento || 0, color: 'bg-purple-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.seguimiento || 0) / total) * 100) : 0 },
      { etapa: 'Examen', cantidad: estadisticas.porEstado?.examen_admision || 0, color: 'bg-cyan-500', percent: total > 0 ? Math.round(((estadisticas.porEstado?.examen_admision || 0) / total) * 100) : 0 },
      { etapa: 'Matriculados', cantidad: estadisticas.matriculados || 0, color: 'bg-emerald-500', percent: total > 0 ? Math.round(((estadisticas.matriculados || 0) / total) * 100) : 0 },
    ]
  }, [estadisticas])

  const datosGrafico = store.getDatosGraficoTemporal(leadsReporte, agrupacion)

  const descargarCSV = () => {
    const csv = store.exportarReporteCSV(leadsReporte, true)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte_admisiones_${fechaInicio}_${fechaFin}.csv`
    link.click()
  }

  const [generandoPDF, setGenerandoPDF] = useState(false)

  const cargarJsPDF = () => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        resolve(window.jspdf.jsPDF)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      script.onload = () => {
        if (window.jspdf) {
          resolve(window.jspdf.jsPDF)
        } else {
          reject(new Error('jsPDF no se cargó correctamente'))
        }
      }
      script.onerror = () => reject(new Error('Error cargando jsPDF desde CDN'))
      document.head.appendChild(script)
    })
  }

  const descargarPDF = async () => {
    setGenerandoPDF(true)
    try {
      const jsPDF = await cargarJsPDF()
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin

      // Colores
      const violetRGB = [139, 92, 246]
      const slateRGB = [100, 116, 139]
      const emeraldRGB = [16, 185, 129]
      const amberRGB = [245, 158, 11]
      const blueRGB = [59, 130, 246]
      const purpleRGB = [168, 85, 247]
      const cyanRGB = [6, 182, 212]

      // Header
      pdf.setFillColor(139, 92, 246)
      pdf.rect(0, 0, pageWidth, 45, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Reporte de Admisiones', margin, 20)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(nombreInstitucion, margin, 30)
      const periodoTexto = { 'semana': 'Última semana', 'mes': 'Último mes', 'trimestre': 'Último trimestre', 'año': 'Último año' }[periodo] || periodo
      pdf.text(`Período: ${periodoTexto} | Generado: ${new Date().toLocaleDateString('es-CL')}`, margin, 38)

      yPosition = 55
      // KPI Conversión
      pdf.setFillColor(245, 243, 255)
      pdf.roundedRect(margin, yPosition, pageWidth - margin * 2, 35, 3, 3, 'F')
      pdf.setTextColor(...violetRGB)
      pdf.setFontSize(10)
      pdf.text('TASA DE CONVERSIÓN', margin + 5, yPosition + 10)
      pdf.setFontSize(36)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${estadisticas?.tasaConversion || 0}%`, margin + 5, yPosition + 28)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const cambioT = cambios.conversion >= 0 ? `+${cambios.conversion}pp vs anterior` : `${cambios.conversion}pp vs anterior`
      pdf.setTextColor(cambios.conversion >= 0 ? 16 : 239, cambios.conversion >= 0 ? 185 : 68, cambios.conversion >= 0 ? 129 : 68)
      pdf.text(cambioT, margin + 50, yPosition + 15)
      pdf.setTextColor(...slateRGB)
      pdf.text(`${estadisticas?.matriculados || 0} matrículas de ${estadisticas?.total || 0} leads`, margin + 50, yPosition + 25)

      yPosition += 45
      // KPIs Secundarios
      const kpiW = (pageWidth - margin * 2 - 10) / 2
      const kpiH = 28
      const kpis = [
        { label: 'Total Leads', value: estadisticas?.total || 0, subtext: cambios.leads !== 0 ? `${cambios.leads > 0 ? '+' : ''}${cambios.leads} vs anterior` : '', color: violetRGB },
        { label: 'Matrículas', value: estadisticas?.matriculados || 0, subtext: `${estadisticas?.activos || 0} en proceso`, color: emeraldRGB },
        { label: 'Tiempo Respuesta', value: estadisticas?.tiempoRespuestaPromedio ? `${estadisticas.tiempoRespuestaPromedio}h` : '-', subtext: 'Primer contacto', color: amberRGB },
        { label: 'Ciclo de Cierre', value: estadisticas?.tiempoCierrePromedio ? `${estadisticas.tiempoCierrePromedio}d` : '-', subtext: 'Días promedio', color: purpleRGB }
      ]
      kpis.forEach((kpi, idx) => {
        const x = margin + (idx % 2) * (kpiW + 10)
        const y = yPosition + Math.floor(idx / 2) * (kpiH + 5)
        pdf.setFillColor(248, 250, 252)
        pdf.roundedRect(x, y, kpiW, kpiH, 2, 2, 'F')
        pdf.setTextColor(...slateRGB)
        pdf.setFontSize(9)
        pdf.text(kpi.label, x + 5, y + 8)
        pdf.setTextColor(...kpi.color)
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        pdf.text(String(kpi.value), x + 5, y + 20)
        pdf.setTextColor(...slateRGB)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.text(kpi.subtext, x + 45, y + 20)
      })

      yPosition += kpiH * 2 + 20
      // Embudo
      pdf.setTextColor(30, 41, 59)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Embudo de Conversión', margin, yPosition)
      yPosition += 8
      const embudoColores = { 'Nuevos': amberRGB, 'Contactados': blueRGB, 'Seguimiento': purpleRGB, 'Examen': cyanRGB, 'Matriculados': emeraldRGB }
      datosEmbudo.forEach((item, idx) => {
        const y = yPosition + idx * 16
        const barW = Math.max(8, (item.cantidad / Math.max(1, estadisticas?.total || 1)) * (pageWidth - margin * 2 - 50))
        pdf.setTextColor(...slateRGB)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.text(item.etapa, margin, y + 8)
        pdf.setFillColor(...(embudoColores[item.etapa] || violetRGB))
        pdf.roundedRect(margin + 35, y, barW, 12, 2, 2, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        if (barW > 20) pdf.text(String(item.cantidad), margin + 38, y + 8)
        pdf.setTextColor(...slateRGB)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`${item.percent}%`, margin + 40 + barW, y + 8)
      })

      pdf.addPage()
      yPosition = margin
      // Gráfico tendencia
      pdf.setTextColor(30, 41, 59)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Tendencia de Leads', margin, yPosition + 5)
      yPosition += 15
      const chartD = datosGrafico.slice(-12)
      if (chartD.length > 0) {
        const cH = 50
        const cW = pageWidth - margin * 2
        const bW = (cW - 20) / chartD.length
        const maxV = Math.max(...chartD.map(d => d.total), 1)
        pdf.setFillColor(250, 250, 252)
        pdf.rect(margin, yPosition, cW, cH, 'F')
        pdf.setDrawColor(230, 230, 235)
        for (let i = 0; i <= 4; i++) {
          const lY = yPosition + (cH / 4) * i
          pdf.line(margin, lY, margin + cW, lY)
        }
        chartD.forEach((d, i) => {
          const bX = margin + 10 + i * bW
          const bH = (d.total / maxV) * (cH - 10)
          const bY = yPosition + cH - bH - 5
          pdf.setFillColor(...violetRGB)
          pdf.rect(bX, bY, bW - 4, bH, 'F')
          if (d.matriculados > 0) {
            const mH = (d.matriculados / maxV) * (cH - 10)
            pdf.setFillColor(...emeraldRGB)
            pdf.rect(bX, yPosition + cH - mH - 5, bW - 4, mH, 'F')
          }
        })
      }

      // Footer
      const totalP = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= totalP; i++) {
        pdf.setPage(i)
        pdf.setTextColor(...slateRGB)
        pdf.setFontSize(8)
        pdf.text(`Página ${i} de ${totalP} | Generado por Admitio | ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
      }

      pdf.save(`Reporte_Admisiones_${nombreInstitucion.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaInicio}.pdf`)
      setNotification({ type: 'success', message: 'PDF generado correctamente' })
    } catch (error) {
      console.error('Error generando PDF:', error)
      setNotification({ type: 'error', message: 'Error al generar PDF' })
    }
    setGenerandoPDF(false)
  }

  const [cargandoDatos, setCargandoDatos] = useState(false)
  const recargarDatosReporte = async () => {
    setCargandoDatos(true)
    try {
      await reloadFromSupabase()
      store.reloadStore()
      loadData()
    } catch (e) { console.error(e) }
    setCargandoDatos(false)
  }

  return (
    <div className="space-y-6">
      {/* Banner Rector */}
      {isRector && leadsReporte.length === 0 && (
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Icon name="BarChart2" size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Bienvenido al Panel de Reportes</h2>
              <p className="text-violet-100 mb-4">Métricas de conversión y progreso de encargados.</p>
              <button onClick={recargarDatosReporte} disabled={cargandoDatos} className="px-4 py-2 bg-white text-violet-600 rounded-lg font-medium hover:bg-violet-50 flex items-center gap-2">
                {cargandoDatos ? <Icon name="Loader2" size={18} className="animate-spin" /> : <><Icon name="RefreshCw" size={18} /> Cargar datos</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon name="Calendar" size={20} className="text-slate-400" />
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-violet-500">
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="trimestre">Este trimestre</option>
            <option value="año">Este año</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefreshData} className="p-2 text-slate-400 hover:text-violet-600 rounded-lg"><Icon name="RefreshCw" size={18} /></button>
          <button onClick={descargarCSV} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Icon name="FileSpreadsheet" size={18} /> CSV
          </button>
          <button onClick={descargarPDF} disabled={generandoPDF} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
            {generandoPDF ? <Icon name="Loader2" size={18} className="animate-spin" /> : <><Icon name="FileText" size={18} /> PDF</>}
          </button>
        </div>
      </div>

      {/* Hero KPI */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1 text-center lg:text-left">
            <p className="text-violet-200 text-sm font-medium mb-1">TASA DE CONVERSIÓN</p>
            <div className="flex items-baseline justify-center lg:justify-start gap-3">
              <span className="text-6xl font-bold">{estadisticas?.tasaConversion || 0}%</span>
              {cambios.conversion !== 0 && (
                <span className={`text-lg font-medium ${cambios.conversion > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {cambios.conversion > 0 ? '+' : ''}{cambios.conversion}pp
                </span>
              )}
            </div>
            <p className="text-violet-200 mt-2">{estadisticas?.matriculados || 0} matrículas de {estadisticas?.total || 0} leads</p>
          </div>
          <div className="w-full lg:w-64">
            <div className="h-4 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, estadisticas?.tasaConversion || 0)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', val: estadisticas?.total || 0, icon: 'Users', color: 'text-violet-600', bg: 'bg-violet-100' },
          { label: 'Matrículas', val: estadisticas?.matriculados || 0, icon: 'GraduationCap', color: 'text-emerald-700', bg: 'bg-emerald-100' },
          { label: 'T. Respuesta', val: formatearTiempoRespuesta(estadisticas?.tiempoRespuestaPromedio).texto || '-', icon: 'Zap', color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Ciclo Cierre', val: estadisticas?.tiempoCierrePromedio ? `${estadisticas.tiempoCierrePromedio}d` : '-', icon: 'Calendar', color: 'text-purple-600', bg: 'bg-purple-100' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
            <div><p className="text-slate-500 text-sm">{kpi.label}</p><p className="text-2xl font-bold text-slate-800">{kpi.val}</p></div>
            <div className={`w-12 h-12 ${kpi.bg} rounded-xl flex items-center justify-center`}><Icon name={kpi.icon} size={24} className={kpi.color} /></div>
          </div>
        ))}
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[
            { id: 'embudo', icon: 'Filter', label: 'Embudo' },
            { id: 'tendencia', icon: 'TrendingUp', label: 'Tendencia' },
            { id: 'carreras', icon: 'GraduationCap', label: 'Carreras' },
            { id: 'medios', icon: 'Share2', label: 'Medios' },
            ...(isKeyMaster || user?.rol_id === 'superadmin' || user?.rol_id === 'superowner' || isRector ? [{ id: 'encargados', icon: 'Users', label: 'Encargados' }] : [])
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${activeTab === tab.id ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Icon name={tab.icon} size={18} /> {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'embudo' && (
            <div className="space-y-6">
              {datosEmbudo.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-600 font-medium">{item.etapa}</div>
                  <div className="flex-1 h-10 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div className={`h-full ${item.color} flex items-center justify-end pr-3`} style={{ width: `${Math.max(5, (item.cantidad / (estadisticas?.total || 1)) * 100)}%` }}>
                      <span className="text-white font-bold text-sm">{item.cantidad}</span>
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm text-slate-500">{item.percent}%</div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'tendencia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Evolución</h3>
                <div className="flex gap-2">
                  <select value={agrupacion} onChange={e => setAgrupacion(e.target.value)} className="px-3 py-1 border rounded-lg text-sm">
                    <option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option>
                  </select>
                </div>
              </div>
              {tipoGrafico === 'linea' ? <LineChart data={datosGrafico} /> : <BarChart data={datosGrafico} />}
            </div>
          )}
          {activeTab === 'carreras' && (
            <div className="space-y-3">
              {Object.entries(estadisticas?.porCarrera || {}).sort((a, b) => b[1].total - a[1].total).map(([id, d]) => (
                <div key={id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${d.color || 'bg-slate-400'}`} />
                  <span className="flex-1 text-slate-700">{d.nombre}</span>
                  <div className="text-sm"><strong>{d.total}</strong> leads | <span className="text-emerald-600">{d.matriculados} matr.</span></div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'medios' && (
            <div className="space-y-3">
              {Object.entries(estadisticas?.porMedio || {}).sort((a, b) => b[1].total - a[1].total).map(([id, d]) => (
                <div key={id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <Icon name="Share2" size={16} className="text-slate-400" />
                  <span className="flex-1 text-slate-700">{d.nombre}</span>
                  <div className="text-sm"><strong>{d.total}</strong> leads</div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'encargados' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500"><th className="pb-3">Encargado</th><th className="pb-3 text-center">Leads</th><th className="pb-3 text-center">Cont.</th><th className="pb-3 text-center">Seg.</th><th className="pb-3 text-center">Matr.</th><th className="pb-3 text-center">% Gest.</th><th className="pb-3 text-center">Conv.</th></tr></thead>
                <tbody>
                  {Object.entries(estadisticas?.porEncargado || {}).filter(([id]) => id !== 'sin_asignar').sort((a, b) => (b[1].tasa || 0) - (a[1].tasa || 0)).map(([id, d]) => (
                    <tr key={id} className="border-t border-slate-50">
                      <td className="py-3 font-medium">{d.nombre}</td>
                      <td className="py-3 text-center">{d.total}</td>
                      <td className="py-3 text-center text-blue-600 font-medium">{d.contactados}</td>
                      <td className="py-3 text-center text-purple-600 font-medium">{d.seguimiento}</td>
                      <td className="py-3 text-center text-emerald-600 font-bold">{d.matriculados}</td>
                      <td className="py-3 text-center"><span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-full font-bold">{d.tasaGestion}%</span></td>
                      <td className="py-3 text-center"><span className="px-2 py-1 bg-slate-100 rounded-full font-bold">{d.tasa}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default ReportesView
