// ============================================
// ADMITIO - Mock Data (VACÍO)
// src/data/mockData.js
// ============================================
// Este archivo está vacío intencionalmente.
// Todos los datos vienen de Supabase.
// ============================================

export const USUARIOS = []
export const CONSULTAS = []
export const CARRERAS = []
export const MEDIOS = []
export const ACTIVIDAD = []
export const FORMULARIOS = []
export const INSTITUCIONES = []

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

export const ESTADOS = {
  nueva: { nombre: 'Nueva', color: 'bg-blue-100 text-blue-700' },
  contactado: { nombre: 'Contactado', color: 'bg-yellow-100 text-yellow-700' },
  interesado: { nombre: 'Interesado', color: 'bg-purple-100 text-purple-700' },
  postulante: { nombre: 'Postulante', color: 'bg-indigo-100 text-indigo-700' },
  matriculado: { nombre: 'Matriculado', color: 'bg-green-100 text-green-700' },
  descartado: { nombre: 'Descartado', color: 'bg-gray-100 text-gray-700' }
}

export const PRIORIDADES = {
  alta: { nombre: 'Alta', color: 'text-red-600' },
  media: { nombre: 'Media', color: 'text-yellow-600' },
  baja: { nombre: 'Baja', color: 'text-green-600' }
}
