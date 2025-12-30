// ============================================
// ADMITIO - Mock Data (VACÍO)
// src/data/mockData.js
// ============================================
// Este archivo exporta arrays/objetos vacíos.
// Todos los datos reales vienen de Supabase.
// ============================================

// ========== DATOS VACÍOS ==========
export const CONSULTAS_INICIALES = []
export const ACTIVIDAD_INICIAL = []
export const USUARIOS = []
export const CONSULTAS = []
export const CARRERAS = []
export const FORMULARIOS = []
export const INSTITUCIONES = []
export const RECORDATORIOS = []
export const RECORDATORIOS_INICIALES = []
export const COLA_LEADS_INICIAL = []
export const CORREOS_ENVIADOS_INICIAL = []
export const PLANTILLAS_CORREO = []
export const METRICAS_ENCARGADOS = {}

// ========== CONFIG ORG VACÍO ==========
export const CONFIG_ORG = {
  nombre: 'Mi Institución',
  logo: null,
  colores: {
    primario: '#7c3aed',
    secundario: '#4f46e5'
  }
}

// ========== MEDIOS DE CONTACTO ==========
export const MEDIOS = [
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

// ========== ROLES (Configuración del sistema) ==========
export const ROLES = {
  superadmin: {
    id: 'superadmin',
    nombre: 'Super Admin',
    oculto: true,
    permisos: { 
      ver_todos: true, 
      editar: true, 
      reasignar: true, 
      config: true, 
      usuarios: true, 
      reportes: true, 
      formularios: true, 
      crear_leads: true, 
      eliminar_keymaster: true 
    }
  },
  keymaster: {
    id: 'keymaster',
    nombre: 'Key Master',
    permisos: { 
      ver_todos: true, 
      editar: true, 
      reasignar: true, 
      config: true, 
      usuarios: true, 
      reportes: true, 
      formularios: true, 
      crear_leads: true 
    }
  },
  encargado: {
    id: 'encargado',
    nombre: 'Encargado',
    permisos: { 
      ver_todos: true, 
      editar: true, 
      reasignar: true, 
      reportes: true, 
      crear_leads: true 
    }
  },
  asistente: {
    id: 'asistente',
    nombre: 'Asistente',
    permisos: { 
      ver_propios: true, 
      editar: true, 
      crear_leads: true 
    }
  },
  rector: {
    id: 'rector',
    nombre: 'Rector',
    permisos: { 
      ver_todos: true, 
      reportes: true 
    }
  }
}

// ========== ESTADOS DE LEADS ==========
export const ESTADOS = {
  nueva: { 
    id: 'nueva',
    nombre: 'Nueva', 
    color: 'bg-blue-100 text-blue-700',
    orden: 1 
  },
  contactado: { 
    id: 'contactado',
    nombre: 'Contactado', 
    color: 'bg-yellow-100 text-yellow-700',
    orden: 2 
  },
  interesado: { 
    id: 'interesado',
    nombre: 'Interesado', 
    color: 'bg-purple-100 text-purple-700',
    orden: 3 
  },
  postulante: { 
    id: 'postulante',
    nombre: 'Postulante', 
    color: 'bg-indigo-100 text-indigo-700',
    orden: 4 
  },
  matriculado: { 
    id: 'matriculado',
    nombre: 'Matriculado', 
    color: 'bg-green-100 text-green-700',
    orden: 5 
  },
  descartado: { 
    id: 'descartado',
    nombre: 'Descartado', 
    color: 'bg-gray-100 text-gray-700',
    orden: 6 
  }
}

// ========== PRIORIDADES ==========
export const PRIORIDADES = {
  alta: { nombre: 'Alta', color: 'text-red-600' },
  media: { nombre: 'Media', color: 'text-yellow-600' },
  baja: { nombre: 'Baja', color: 'text-green-600' }
}

// ========== TIPOS DE ALUMNO ==========
export const TIPOS_ALUMNO = {
  nuevo: { 
    id: 'nuevo',
    nombre: 'Alumno Nuevo', 
    descripcion: 'Primera vez en la institución',
    color: 'bg-blue-100 text-blue-700'
  },
  antiguo: { 
    id: 'antiguo',
    nombre: 'Alumno Antiguo', 
    descripcion: 'Ya ha estudiado antes aquí',
    color: 'bg-amber-100 text-amber-700'
  },
  transferencia: { 
    id: 'transferencia',
    nombre: 'Transferencia', 
    descripcion: 'Viene de otra institución',
    color: 'bg-purple-100 text-purple-700'
  }
}

// ========== TIPOS DE ACTIVIDAD ==========
export const TIPOS_ACTIVIDAD = {
  llamada: { 
    id: 'llamada',
    nombre: 'Llamada', 
    icono: 'Phone',
    color: 'text-blue-500'
  },
  email: { 
    id: 'email',
    nombre: 'Email', 
    icono: 'Mail',
    color: 'text-amber-500'
  },
  whatsapp: { 
    id: 'whatsapp',
    nombre: 'WhatsApp', 
    icono: 'MessageCircle',
    color: 'text-green-500'
  },
  reunion: { 
    id: 'reunion',
    nombre: 'Reunión', 
    icono: 'Users',
    color: 'text-purple-500'
  },
  nota: { 
    id: 'nota',
    nombre: 'Nota', 
    icono: 'FileText',
    color: 'text-slate-500'
  },
  cambio_estado: { 
    id: 'cambio_estado',
    nombre: 'Cambio de Estado', 
    icono: 'RefreshCw',
    color: 'text-indigo-500'
  },
  asignacion: { 
    id: 'asignacion',
    nombre: 'Asignación', 
    icono: 'UserPlus',
    color: 'text-violet-500'
  },
  creacion: { 
    id: 'creacion',
    nombre: 'Creación', 
    icono: 'Plus',
    color: 'text-emerald-500'
  }
}
