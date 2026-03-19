import React from 'react'

const PieChart = ({ data, size = 200 }) => {
  const total = (data || []).reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return <div className="text-slate-400 text-center py-8">Sin datos</div>

  let currentAngle = 0
  const paths = (data || []).map((item, i) => {
    const percentage = item.value / total
    const angle = percentage * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    const radius = size / 2 - 10
    const cx = size / 2
    const cy = size / 2

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return (
      <path key={i} d={d} fill={item.color} className="hover:opacity-80 transition-opacity cursor-pointer">
        <title>{item.label}: {item.value} ({(percentage * 100).toFixed(1)}%)</title>
      </path>
    )
  })

  return (
    <svg width={size} height={size} className="mx-auto">
      {paths}
      <circle cx={size / 2} cy={size / 2} r={size / 4} fill="white" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-slate-800">
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="middle" className="text-xs fill-slate-500">
        total
      </text>
    </svg>
  )
}

export default PieChart
