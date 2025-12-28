// ============================================
// ADMITIO - Mock Data (VACÍO)
// src/data/mockData.js
// ============================================
// Este archivo exporta arrays vacíos.
// Todos los datos reales vienen de Supabase.
// ============================================

// Datos vacíos (para compatibilidad con store.js)
export const CONSULTAS_INICIALES = []
export const ACTIVIDAD_INICIAL = []
export const USUARIOS = []
export const CONSULTAS = []
export const CARRERAS = []
export const MEDIOS = []
export const ACTIVIDAD = []
export const FORMULARIOS = []
export const INSTITUCIONES = []
export const RECORDATORIOS = []

// Configuración de roles (esto SÍ se usa)
export const ROLES = {
  superadmin: {
    nombre: 'Super Admin',
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: true, reportes: true, formularios: true, crear_leads: true, eliminar_keymaster: true }
  },
  keymaster: {
    nombre: 'Key Master',
    permisos: { ver_todos: true, editar: true, reasignar: true, config: true, usuarios: true, reportes: true, formularios: true, crear_leads: true }
  },
  encargado: {
    nombre: 'Encargado',
    permisos: { ver_todos: true, editar: true, reasignar: true, reportes: true, crear_leads: true }
  },
  asistente: {
    nombre: 'Asistente',
    permisos: { ver_propios: true, editar: true, crear_leads: true }
  },
  rector: {
    nombre: 'Rector',
    permisos: { ver_todos: true, reportes: true }
  }
}

// Configuración de estados (esto SÍ se usa)
export const ESTADOS = {
  nueva: { nombre: 'Nueva', color: 'bg-blue-100 text-blue-700' },
  contactado: { nombre: 'Contactado', color: 'bg-yellow-100 text-yellow-700' },
  interesado: { nombre: 'Interesado', color: 'bg-purple-100 text-purple-700' },
  postulante: { nombre: 'Postulante', color: 'bg-indigo-100 text-indigo-700' },
  matriculado: { nombre: 'Matriculado', color: 'bg-green-100 text-green-700' },
  descartado: { nombre: 'Descartado', color: 'bg-gray-100 text-gray-700' }
}

// Configuración de prioridades (esto SÍ se usa)
export const PRIORIDADES = {
  alta: { nombre: 'Alta', color: 'text-red-600' },
  media: { nombre: 'Media', color: 'text-yellow-600' },
  baja: { nombre: 'Baja', color: 'text-green-600' }
}

// Medios de contacto por defecto
export const MEDIOS_DEFAULT = [
  { id: 'instagram', nombre: 'Instagram', icono: 'Instagram', color: 'text-pink-500' },
  { id: 'web', nombre: 'Sitio Web', icono: 'Globe', color: 'text-blue-500' },
  { id: 'whatsapp', nombre: 'WhatsApp', icono: 'MessageCircle', color: 'text-green-500' },
  { id: 'telefono', nombre: 'Teléfono', icono: 'Phone', color: 'text-slate-500' },
  { id: 'referido', nombre: 'Referido', icono: 'Users', color: 'text-violet-500' },
  { id: 'facebook', nombre: 'Facebook', icono: 'Facebook', color: 'text-blue-600' },
  { id: 'email', nombre: 'Email', icono: 'Mail', color: 'text-amber-500' },
  { id: 'presencial', nombre: 'Presencial', icono: 'MapPin', color: 'text-emerald-500' },
  { id: 'otro', nombre: 'Otro', icono: 'MoreHorizontal', color: 'text-gray-500' }
]
