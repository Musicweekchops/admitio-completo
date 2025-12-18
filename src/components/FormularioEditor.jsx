// ============================================
// COMPONENTE: FormularioEditor
// Editor de formularios con preview en tiempo real
// Sin problemas de re-render
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Icon from './Icon'
import * as store from '../lib/store'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ============================================
// MODAL CREAR/EDITAR FORMULARIO
// ============================================
export const ModalFormulario = ({ isOpen, onClose, onCreated, institucionId, editForm = null }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    mostrar_carreras: true,
    campos_extra: [],
    color_primario: '#7c3aed',
    color_fondo: '#f8fafc'
  })
  const [activeTab, setActiveTab] = useState('editor') // editor, preview, codigo
  
  // Cargar datos si es edición
  useEffect(() => {
    if (editForm) {
      setFormData({
        nombre: editForm.nombre || '',
        descripcion: editForm.descripcion || '',
        mostrar_carreras: editForm.mostrar_carreras !== false,
        campos_extra: editForm.campos_extra || [],
        color_primario: editForm.color_primario || '#7c3aed',
        color_fondo: editForm.color_fondo || '#f8fafc'
      })
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        mostrar_carreras: true,
        campos_extra: [],
        color_primario: '#7c3aed',
        color_fondo: '#f8fafc'
      })
    }
  }, [editForm, isOpen])
  
  // Handlers con useCallback para evitar re-renders
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])
  
  const addCampoExtra = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      campos_extra: [...prev.campos_extra, { 
        id: Date.now(), 
        label: '', 
        tipo: 'text', 
        requerido: false,
        opciones: ''
      }]
    }))
  }, [])
  
  const updateCampoExtra = useCallback((id, field, value) => {
    setFormData(prev => ({
      ...prev,
      campos_extra: prev.campos_extra.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      )
    }))
  }, [])
  
  const removeCampoExtra = useCallback((id) => {
    setFormData(prev => ({
      ...prev,
      campos_extra: prev.campos_extra.filter(c => c.id !== id)
    }))
  }, [])
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (editForm) {
      store.updateFormulario(editForm.id, formData)
    } else {
      store.createFormulario(formData)
    }
    onCreated?.()
    onClose()
  }
  
  // Generar código embed con endpoint de Supabase
  const embedCode = useMemo(() => {
    return generarCodigoEmbed(formData, institucionId)
  }, [formData, institucionId])
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header con tabs */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-slate-800">
              {editForm ? 'Editar Formulario' : 'Nuevo Formulario'}
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'editor' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Icon name="Edit" size={14} className="inline mr-1" /> Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'preview' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Icon name="Eye" size={14} className="inline mr-1" /> Preview
              </button>
              <button
                onClick={() => setActiveTab('codigo')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'codigo' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Icon name="Code" size={14} className="inline mr-1" /> Código
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon name="X" size={24} />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' && (
            <EditorTab 
              formData={formData}
              onChange={handleChange}
              onAddCampo={addCampoExtra}
              onUpdateCampo={updateCampoExtra}
              onRemoveCampo={removeCampoExtra}
              onSubmit={handleSubmit}
              onClose={onClose}
              isEdit={!!editForm}
            />
          )}
          
          {activeTab === 'preview' && (
            <PreviewTab formData={formData} />
          )}
          
          {activeTab === 'codigo' && (
            <CodigoTab embedCode={embedCode} formData={formData} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// TAB: EDITOR
// ============================================
const EditorTab = ({ formData, onChange, onAddCampo, onUpdateCampo, onRemoveCampo, onSubmit, onClose, isEdit }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del formulario *</label>
          <input 
            type="text" 
            required 
            value={formData.nombre}
            onChange={e => onChange('nombre', e.target.value)}
            placeholder="Ej: Formulario Landing Page"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" 
          />
        </div>
        
        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
          <textarea 
            value={formData.descripcion}
            onChange={e => onChange('descripcion', e.target.value)}
            placeholder="Descripción opcional..."
            className="w-full h-20 px-4 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" 
          />
        </div>
        
        {/* Colores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Color primario</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={formData.color_primario}
                onChange={e => onChange('color_primario', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border border-slate-200"
              />
              <input 
                type="text"
                value={formData.color_primario}
                onChange={e => onChange('color_primario', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Color de fondo</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={formData.color_fondo}
                onChange={e => onChange('color_fondo', e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border border-slate-200"
              />
              <input 
                type="text"
                value={formData.color_fondo}
                onChange={e => onChange('color_fondo', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Toggle Carreras */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-700">Mostrar selector de carreras</p>
            <p className="text-sm text-slate-500">Permitir elegir carrera de interés</p>
          </div>
          <button 
            type="button"
            onClick={() => onChange('mostrar_carreras', !formData.mostrar_carreras)}
            className={`w-12 h-6 rounded-full transition-colors ${formData.mostrar_carreras ? 'bg-violet-600' : 'bg-slate-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.mostrar_carreras ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        
        {/* Campos Extra */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">Campos Adicionales</label>
            <button 
              type="button" 
              onClick={onAddCampo}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
            >
              <Icon name="Plus" size={14} /> Agregar campo
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.campos_extra.map(campo => (
              <CampoExtraEditor 
                key={campo.id}
                campo={campo}
                onUpdate={onUpdateCampo}
                onRemove={onRemoveCampo}
              />
            ))}
            {formData.campos_extra.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-lg">
                Sin campos adicionales. Los campos básicos (nombre, email, teléfono) siempre se incluyen.
              </p>
            )}
          </div>
        </div>
        
        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700"
          >
            {isEdit ? 'Guardar Cambios' : 'Crear Formulario'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ============================================
// EDITOR DE CAMPO EXTRA (memo para evitar re-renders)
// ============================================
const CampoExtraEditor = React.memo(({ campo, onUpdate, onRemove }) => {
  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-start gap-3">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <input 
            type="text" 
            placeholder="Nombre del campo"
            value={campo.label}
            onChange={e => onUpdate(campo.id, 'label', e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" 
          />
          <select 
            value={campo.tipo}
            onChange={e => onUpdate(campo.id, 'tipo', e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="text">Texto</option>
            <option value="email">Email</option>
            <option value="tel">Teléfono</option>
            <option value="number">Número</option>
            <option value="date">Fecha</option>
            <option value="textarea">Área de texto</option>
            <option value="select">Selector</option>
          </select>
        </div>
        
        <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap bg-white px-3 py-2 rounded-lg border border-slate-200">
          <input 
            type="checkbox" 
            checked={campo.requerido}
            onChange={e => onUpdate(campo.id, 'requerido', e.target.checked)}
            className="rounded border-slate-300 text-violet-600"
          />
          Requerido
        </label>
        
        <button 
          type="button" 
          onClick={() => onRemove(campo.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Icon name="Trash2" size={18} />
        </button>
      </div>
      
      {campo.tipo === 'select' && (
        <div className="mt-3">
          <input 
            type="text"
            placeholder="Opciones separadas por coma: Opción 1, Opción 2, Opción 3"
            value={campo.opciones || ''}
            onChange={e => onUpdate(campo.id, 'opciones', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          />
        </div>
      )}
    </div>
  )
})

// ============================================
// TAB: PREVIEW (Mockup Landing Page)
// ============================================
const PreviewTab = ({ formData }) => {
  const carreras = store.getCarreras()
  
  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#1a1a2e' }}>
      {/* Simulación de Landing Page */}
      <div className="min-h-full">
        {/* Header simulado */}
        <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg"></div>
              <span className="text-white font-bold text-lg">Tu Institución</span>
            </div>
            <div className="flex gap-6 text-white/70 text-sm">
              <span>Inicio</span>
              <span>Programas</span>
              <span>Nosotros</span>
              <span className="text-white font-medium">Admisión</span>
            </div>
          </div>
        </div>
        
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div className="text-white">
            <span className="inline-block px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm mb-4">
              Admisión 2025
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Comienza tu carrera musical con nosotros
            </h1>
            <p className="text-white/70 text-lg mb-8">
              Déjanos tus datos y un asesor se pondrá en contacto contigo para guiarte en el proceso de admisión.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-white/60">
                <Icon name="Check" size={16} className="text-emerald-400" />
                <span>Clases personalizadas</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Icon name="Check" size={16} className="text-emerald-400" />
                <span>Profesores expertos</span>
              </div>
            </div>
          </div>
          
          {/* Formulario */}
          <div 
            className="rounded-2xl p-8 shadow-2xl"
            style={{ backgroundColor: formData.color_fondo }}
          >
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {formData.nombre || 'Solicita Información'}
            </h2>
            {formData.descripcion && (
              <p className="text-slate-500 mb-6">{formData.descripcion}</p>
            )}
            
            <div className="space-y-4">
              {/* Campos base */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
                <input 
                  type="text" 
                  placeholder="Tu nombre completo"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ '--tw-ring-color': formData.color_primario }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input 
                  type="email" 
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
                <input 
                  type="tel" 
                  placeholder="+56 9 1234 5678"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              
              {formData.mostrar_carreras && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Carrera de interés *</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white">
                    <option>Selecciona una carrera</option>
                    {carreras.map(c => (
                      <option key={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">¿Has estudiado aquí antes?</label>
                <select className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white">
                  <option>No, sería mi primera vez</option>
                  <option>Sí, soy alumno/a antiguo/a</option>
                </select>
              </div>
              
              {/* Campos extra */}
              {formData.campos_extra.map(campo => (
                <div key={campo.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {campo.label || 'Campo sin nombre'} {campo.requerido && '*'}
                  </label>
                  {campo.tipo === 'textarea' ? (
                    <textarea 
                      placeholder={campo.label}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white h-24 resize-none"
                    />
                  ) : campo.tipo === 'select' ? (
                    <select className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white">
                      <option>Seleccionar...</option>
                      {(campo.opciones || '').split(',').filter(o => o.trim()).map((opt, i) => (
                        <option key={i}>{opt.trim()}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type={campo.tipo}
                      placeholder={campo.label}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white"
                    />
                  )}
                </div>
              ))}
              
              <button 
                type="button"
                className="w-full py-4 text-white rounded-lg font-semibold text-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: formData.color_primario }}
              >
                Enviar Solicitud
              </button>
              
              <p className="text-xs text-slate-400 text-center">
                Al enviar, aceptas nuestra política de privacidad.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer simulado */}
        <div className="border-t border-white/10 mt-12">
          <div className="max-w-6xl mx-auto px-6 py-6 text-center text-white/40 text-sm">
            © 2025 Tu Institución. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TAB: CÓDIGO EMBED
// ============================================
const CodigoTab = ({ embedCode, formData }) => {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Icon name="Info" className="text-blue-500 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-blue-800">Cómo usar este código</h4>
              <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Copia el código HTML de abajo</li>
                <li>Pégalo en tu sitio web donde quieras mostrar el formulario</li>
                <li>Los leads se crearán automáticamente en Admitio</li>
              </ol>
            </div>
          </div>
        </div>
        
        {/* Código */}
        <div className="relative">
          <div className="flex items-center justify-between bg-slate-800 text-white px-4 py-2 rounded-t-xl">
            <span className="text-sm font-medium">HTML</span>
            <button 
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                copied ? 'bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Icon name={copied ? 'Check' : 'Copy'} size={14} />
              {copied ? 'Copiado!' : 'Copiar código'}
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-300 p-4 rounded-b-xl overflow-x-auto text-sm">
            <code>{embedCode}</code>
          </pre>
        </div>
        
        {/* Info adicional */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Icon name="AlertTriangle" className="text-amber-500 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-amber-800">Importante</h4>
              <p className="text-sm text-amber-700 mt-1">
                El formulario enviará los datos directamente a tu base de datos de Admitio.
                Asegúrate de tener configurada correctamente la conexión con Supabase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// GENERAR CÓDIGO EMBED CON CONEXIÓN A SUPABASE
// ============================================
function generarCodigoEmbed(formData, institucionId) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
  const carreras = store.getCarreras()
  
  const carrerasOptions = formData.mostrar_carreras 
    ? carreras.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('\n                ')
    : ''
  
  const camposExtraHTML = formData.campos_extra.map(campo => {
    const required = campo.requerido ? 'required' : ''
    const name = campo.label.toLowerCase().replace(/\s+/g, '_')
    
    if (campo.tipo === 'textarea') {
      return `
            <div class="admitio-field">
              <label>${campo.label} ${campo.requerido ? '*' : ''}</label>
              <textarea name="${name}" ${required} placeholder="${campo.label}"></textarea>
            </div>`
    } else if (campo.tipo === 'select') {
      const options = (campo.opciones || '').split(',').map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('')
      return `
            <div class="admitio-field">
              <label>${campo.label} ${campo.requerido ? '*' : ''}</label>
              <select name="${name}" ${required}>
                <option value="">Seleccionar...</option>
                ${options}
              </select>
            </div>`
    } else {
      return `
            <div class="admitio-field">
              <label>${campo.label} ${campo.requerido ? '*' : ''}</label>
              <input type="${campo.tipo}" name="${name}" ${required} placeholder="${campo.label}" />
            </div>`
    }
  }).join('')

  return `<!-- Formulario Admitio: ${formData.nombre || 'Formulario de Admisión'} -->
<div id="admitio-form" style="max-width: 500px; margin: 0 auto; font-family: system-ui, sans-serif;">
  <style>
    #admitio-form {
      background: ${formData.color_fondo};
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    #admitio-form h3 {
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
    }
    #admitio-form .admitio-field {
      margin-bottom: 1rem;
    }
    #admitio-form label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #475569;
      margin-bottom: 0.25rem;
    }
    #admitio-form input,
    #admitio-form select,
    #admitio-form textarea {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      box-sizing: border-box;
    }
    #admitio-form input:focus,
    #admitio-form select:focus,
    #admitio-form textarea:focus {
      outline: none;
      border-color: ${formData.color_primario};
      box-shadow: 0 0 0 3px ${formData.color_primario}20;
    }
    #admitio-form textarea {
      min-height: 80px;
      resize: vertical;
    }
    #admitio-form button[type="submit"] {
      width: 100%;
      padding: 1rem;
      background: ${formData.color_primario};
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    #admitio-form button[type="submit"]:hover {
      opacity: 0.9;
    }
    #admitio-form button[type="submit"]:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #admitio-form .admitio-success {
      text-align: center;
      padding: 2rem;
    }
    #admitio-form .admitio-success svg {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
    }
    #admitio-form .admitio-error {
      background: #fef2f2;
      color: #dc2626;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
  </style>
  
  <form id="admitio-contact-form">
    <h3>${formData.nombre || 'Solicita Información'}</h3>
    
    <div id="admitio-error" class="admitio-error" style="display: none;"></div>
    
    <div class="admitio-field">
      <label>Nombre completo *</label>
      <input type="text" name="nombre" required placeholder="Tu nombre completo" />
    </div>
    
    <div class="admitio-field">
      <label>Email *</label>
      <input type="email" name="email" required placeholder="tu@email.com" />
    </div>
    
    <div class="admitio-field">
      <label>Teléfono *</label>
      <input type="tel" name="telefono" required placeholder="+56 9 1234 5678" />
    </div>
    
    ${formData.mostrar_carreras ? `<div class="admitio-field">
      <label>Carrera de interés *</label>
      <select name="carrera_nombre" required>
        <option value="">Selecciona una carrera</option>
        ${carrerasOptions}
      </select>
    </div>` : ''}
    
    <div class="admitio-field">
      <label>¿Has estudiado aquí antes?</label>
      <select name="tipo_alumno">
        <option value="nuevo">No, sería mi primera vez</option>
        <option value="antiguo">Sí, soy alumno/a antiguo/a</option>
      </select>
    </div>
    ${camposExtraHTML}
    
    <button type="submit">Enviar Solicitud</button>
  </form>
  
  <div id="admitio-success" class="admitio-success" style="display: none;">
    <svg fill="none" stroke="#10b981" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <h3 style="color: #10b981;">¡Gracias por tu interés!</h3>
    <p style="color: #64748b;">Nos pondremos en contacto contigo pronto.</p>
  </div>
</div>

<script>
(function() {
  const SUPABASE_URL = '${supabaseUrl}';
  const SUPABASE_KEY = '${supabaseKey}';
  const INSTITUCION_ID = '${institucionId || 'YOUR_INSTITUCION_ID'}';
  
  const form = document.getElementById('admitio-contact-form');
  const errorDiv = document.getElementById('admitio-error');
  const successDiv = document.getElementById('admitio-success');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    errorDiv.style.display = 'none';
    
    try {
      const formData = new FormData(form);
      const data = {
        institucion_id: INSTITUCION_ID,
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        carrera_nombre: formData.get('carrera_nombre') || null,
        tipo_alumno: formData.get('tipo_alumno') || 'nuevo',
        medio: 'formulario_web',
        estado: 'nueva',
        prioridad: 'media',
        notas: 'Lead desde formulario web: ${formData.nombre || 'Formulario Embebido'}'
      };
      
      const response = await fetch(SUPABASE_URL + '/rest/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }
      
      form.style.display = 'none';
      successDiv.style.display = 'block';
      
    } catch (error) {
      console.error('Error:', error);
      errorDiv.textContent = 'Hubo un error al enviar. Por favor intenta de nuevo.';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
})();
</script>
<!-- Fin Formulario Admitio -->`
}

export default ModalFormulario
