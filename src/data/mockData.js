// ============================================
// ADMITIO - Datos de prueba completos
// ============================================

// ROLES DEL SISTEMA
export const ROLES = {
  superadmin: {
    id: 'superadmin',
    nombre: 'Super Administrador',
    descripcion: 'Acceso total del propietario - NO visible para otros usuarios',
    permisos: { 
      ver_todos: true, ver_propios: true, editar: true, 
      reasignar: true, config: true, usuarios: true, 
      reportes: true, formularios: true, ver_superadmin: true,
      eliminar_keymaster: true
    },
    oculto: true // No aparece en selectores de rol
  },
  keymaster: {
    id: 'keymaster',
    nombre: 'Key Master',
    descripcion: 'Administrador principal del sistema',
    permisos: { 
      ver_todos: true, ver_propios: true, editar: true, 
      reasignar: true, config: true, usuarios: true, 
      reportes: true, formularios: true,
      ver_superadmin: false,
      eliminar_keymaster: false
    }
  },
  encargado: {
    id: 'encargado',
    nombre: 'Encargado de Admisión',
    descripcion: 'Gestiona leads asignados',
    permisos: { 
      ver_todos: false, ver_propios: true, editar: true, 
      reasignar: false, config: false, usuarios: false, 
      reportes: true, formularios: false // Ahora puede ver reportes de sus leads
    }
  },
  asistente: {
    id: 'asistente',
    nombre: 'Asistente',
    descripcion: 'Solo puede ingresar nuevos leads',
    permisos: { 
      ver_todos: false, ver_propios: false, editar: false, 
      reasignar: false, config: false, usuarios: false, 
      reportes: false, formularios: false,
      crear_leads: true
    }
  },
  rector: {
    id: 'rector',
    nombre: 'Rector',
    descripcion: 'Solo visualiza reportes ejecutivos',
    permisos: { 
      ver_todos: false, ver_propios: false, editar: false, 
      reasignar: false, config: false, usuarios: false, 
      reportes: true, formularios: false 
    }
  }
}

// USUARIOS
export const USUARIOS = [
  {
    id: 'user-superadmin',
    email: 'owner@admitio.cl',
    password: 'Admitio2024!Secure',
    nombre: 'Propietario Sistema',
    rol_id: 'superadmin',
    activo: true,
    oculto: true // NO visible para KeyMaster ni nadie
  },
  {
    id: 'user-1',
    email: 'admin@projazz.cl',
    password: 'admin123',
    nombre: 'Carolina Vásquez',
    rol_id: 'keymaster',
    activo: true,
    avatar: null,
    config: {
      notificaciones_email: true,
      notificaciones_popup: true
    }
  },
  {
    id: 'user-2',
    email: 'maria@projazz.cl',
    password: '123456',
    nombre: 'María González',
    rol_id: 'encargado',
    activo: true,
    avatar: null,
    config: {
      notificaciones_email: true,
      notificaciones_popup: true
    }
  },
  {
    id: 'user-3',
    email: 'pedro@projazz.cl',
    password: '123456',
    nombre: 'Pedro Soto',
    rol_id: 'encargado',
    activo: true,
    avatar: null,
    config: {
      notificaciones_email: true,
      notificaciones_popup: true
    }
  },
  {
    id: 'user-4',
    email: 'secretaria@projazz.cl',
    password: '123456',
    nombre: 'Andrea Muñoz',
    rol_id: 'asistente',
    activo: true,
    avatar: null
  },
  {
    id: 'user-5',
    email: 'rector@projazz.cl',
    password: 'rector123',
    nombre: 'Dr. Roberto Méndez',
    rol_id: 'rector',
    activo: true,
    avatar: null
  }
]

// CARRERAS
export const CARRERAS = [
  { id: 1, nombre: 'Canto Popular', color: 'bg-pink-500', activa: true },
  { id: 2, nombre: 'Guitarra Eléctrica', color: 'bg-orange-500', activa: true },
  { id: 3, nombre: 'Batería', color: 'bg-red-500', activa: true },
  { id: 4, nombre: 'Bajo Eléctrico', color: 'bg-purple-500', activa: true },
  { id: 5, nombre: 'Piano/Teclados', color: 'bg-blue-500', activa: true },
  { id: 6, nombre: 'Producción Musical', color: 'bg-green-500', activa: true },
  { id: 7, nombre: 'Composición', color: 'bg-teal-500', activa: true },
  { id: 8, nombre: 'Audio', color: 'bg-cyan-500', activa: true },
]

// MEDIOS DE CONTACTO
export const MEDIOS = [
  { id: 'instagram', nombre: 'Instagram', icono: 'Instagram', color: 'text-pink-500' },
  { id: 'web', nombre: 'Sitio Web', icono: 'Globe', color: 'text-blue-500' },
  { id: 'whatsapp', nombre: 'WhatsApp', icono: 'MessageCircle', color: 'text-green-500' },
  { id: 'telefono', nombre: 'Teléfono', icono: 'Phone', color: 'text-slate-500' },
  { id: 'referido', nombre: 'Referido', icono: 'Users', color: 'text-violet-500' },
  { id: 'facebook', nombre: 'Facebook', icono: 'Facebook', color: 'text-blue-600' },
  { id: 'email', nombre: 'Email directo', icono: 'Mail', color: 'text-amber-500' },
]

// ESTADOS DEL LEAD
export const ESTADOS = {
  nueva: { 
    id: 'nueva', 
    label: 'Nueva Consulta', 
    bg: 'bg-blue-100', 
    text: 'text-blue-700', 
    border: 'border-blue-500',
    orden: 1
  },
  contactado: { 
    id: 'contactado', 
    label: 'Contactado', 
    bg: 'bg-amber-100', 
    text: 'text-amber-700', 
    border: 'border-amber-500',
    orden: 2
  },
  seguimiento: { 
    id: 'seguimiento', 
    label: 'En Seguimiento', 
    bg: 'bg-purple-100', 
    text: 'text-purple-700', 
    border: 'border-purple-500',
    orden: 3
  },
  examen_admision: { 
    id: 'examen_admision', 
    label: 'Examen de Admisión', 
    bg: 'bg-cyan-100', 
    text: 'text-cyan-700', 
    border: 'border-cyan-500',
    orden: 4
  },
  matriculado: { 
    id: 'matriculado', 
    label: 'Matriculado', 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-700', 
    border: 'border-emerald-500',
    orden: 5,
    cerrado: true
  },
  descartado: { 
    id: 'descartado', 
    label: 'Descartado', 
    bg: 'bg-red-100', 
    text: 'text-red-700', 
    border: 'border-red-500',
    orden: 6,
    cerrado: true
  },
}

export const TIPOS_ALUMNO = {
  nuevo: { id: 'nuevo', label: 'Alumno Nuevo', bg: 'bg-blue-100', text: 'text-blue-700' },
  antiguo: { id: 'antiguo', label: 'Alumno Antiguo', bg: 'bg-violet-100', text: 'text-violet-700' },
}

// TIPOS DE ACTIVIDAD
export const TIPOS_ACTIVIDAD = {
  creacion: { icon: 'Plus', color: 'text-blue-500', label: 'Creación' },
  cambio_estado: { icon: 'ArrowRight', color: 'text-amber-500', label: 'Cambio de estado' },
  reasignacion: { icon: 'UserPlus', color: 'text-purple-500', label: 'Reasignación' },
  nota_guardada: { icon: 'FileText', color: 'text-slate-500', label: 'Nota' },
  email_enviado: { icon: 'Mail', color: 'text-blue-500', label: 'Email enviado' },
  whatsapp_intento: { icon: 'MessageCircle', color: 'text-green-500', label: 'Intento WhatsApp' },
  whatsapp_resultado: { icon: 'MessageCircle', color: 'text-green-600', label: 'Resultado WhatsApp' },
  examen_agendado: { icon: 'Calendar', color: 'text-cyan-500', label: 'Examen agendado' },
  recordatorio: { icon: 'Bell', color: 'text-amber-500', label: 'Recordatorio' },
  matriculado: { icon: 'GraduationCap', color: 'text-emerald-500', label: 'Matriculado' },
  descartado: { icon: 'UserX', color: 'text-red-500', label: 'Descartado' },
  reactivado: { icon: 'RefreshCw', color: 'text-violet-500', label: 'Reactivado' },
}

// PLANTILLAS DE CORREO
export const PLANTILLAS_CORREO = [
  {
    id: 'tpl-1',
    nombre: 'Bienvenida',
    asunto: '¡Gracias por tu interés en ProJazz!',
    contenido: `Hola {{nombre}},

¡Gracias por contactarnos! Hemos recibido tu consulta sobre la carrera de {{carrera}}.

En ProJazz formamos músicos profesionales desde 1982. Nos encantaría contarte más sobre nuestro programa.

¿Te gustaría agendar una llamada o visita a nuestras instalaciones?

Saludos,
{{encargado}}
Equipo de Admisión ProJazz`,
    tipo: 'bienvenida',
    activo: true
  },
  {
    id: 'tpl-2',
    nombre: 'Información de carrera',
    asunto: 'Información sobre {{carrera}} - ProJazz',
    contenido: `Hola {{nombre}},

Te envío la información que solicitaste sobre {{carrera}}.

[Adjuntar información de la carrera]

Duración: 4 años
Modalidad: Presencial
Horarios disponibles: Diurno y Vespertino

¿Tienes alguna pregunta? Estoy a tu disposición.

Saludos,
{{encargado}}`,
    tipo: 'informacion',
    activo: true
  },
  {
    id: 'tpl-3',
    nombre: 'Recordatorio examen',
    asunto: 'Recordatorio: Tu examen de admisión es pronto',
    contenido: `Hola {{nombre}},

Te recordamos que tu examen de admisión está agendado para el {{fecha_examen}}.

Ubicación: ProJazz, Av. Libertador Bernardo O'Higgins 1302, Santiago
Hora: {{hora_examen}}

Por favor confirma tu asistencia respondiendo este correo.

¡Mucho éxito!

{{encargado}}
Equipo de Admisión ProJazz`,
    tipo: 'recordatorio_examen',
    activo: true
  },
  {
    id: 'tpl-4',
    nombre: 'Seguimiento',
    asunto: '¿Cómo vas con tu decisión? - ProJazz',
    contenido: `Hola {{nombre}},

Hace un tiempo conversamos sobre tu interés en {{carrera}}.

¿Has tenido oportunidad de revisar la información? ¿Tienes alguna duda que pueda resolver?

Estamos en período de matrículas y me encantaría ayudarte a dar el siguiente paso.

Saludos,
{{encargado}}`,
    tipo: 'seguimiento',
    activo: true
  }
]

// FORMULARIOS EMBEBIBLES
export const FORMULARIOS = [
  {
    id: 'form-1',
    nombre: 'Admisión 2025',
    descripcion: 'Formulario principal de admisión',
    slug: 'admision-2025',
    campos: [
      { id: 'nombre', label: 'Nombre completo', tipo: 'text', requerido: true },
      { id: 'email', label: 'Correo electrónico', tipo: 'email', requerido: true },
      { id: 'telefono', label: 'Teléfono', tipo: 'tel', requerido: true },
      { id: 'carrera', label: 'Carrera de interés', tipo: 'select', requerido: true, opciones: 'carreras' },
    ],
    carreras_ids: [1, 2, 3, 4, 5, 6, 7, 8],
    activo: true,
    fecha_inicio: '2024-11-01',
    fecha_fin: '2025-03-31',
    created_at: '2024-10-01T00:00:00Z'
  },
  {
    id: 'form-2',
    nombre: 'Cursos de Verano 2025',
    descripcion: 'Talleres intensivos de verano',
    slug: 'verano-2025',
    campos: [
      { id: 'nombre', label: 'Nombre completo', tipo: 'text', requerido: true },
      { id: 'email', label: 'Correo electrónico', tipo: 'email', requerido: true },
      { id: 'telefono', label: 'Teléfono', tipo: 'tel', requerido: true },
      { id: 'taller', label: 'Taller de interés', tipo: 'select', requerido: true, opciones: [
        'Improvisación Jazz',
        'Producción con Ableton',
        'Técnica Vocal',
        'Ensamble Rock'
      ]},
      { id: 'nivel', label: 'Nivel musical', tipo: 'select', requerido: true, opciones: [
        'Principiante',
        'Intermedio',
        'Avanzado'
      ]},
    ],
    activo: false,
    fecha_inicio: '2025-01-01',
    fecha_fin: '2025-02-28',
    created_at: '2024-10-15T00:00:00Z'
  }
]

// CONFIGURACIÓN DE LA ORGANIZACIÓN
export const CONFIG_ORG = {
  nombre: 'ProJazz',
  logo_url: null,
  
  // Asignación
  max_leads_diarios_encargado: 15,
  horario_inicio: '09:00',
  horario_fin: '18:00',
  dias_laborales: [1, 2, 3, 4, 5], // Lun-Vie
  
  // Recordatorios
  horas_recordatorio_whatsapp: 2,
  dias_sin_avance_alerta: 3,
  dias_antes_examen_recordatorio: 2,
  
  // Correos
  email_remitente: 'admision@projazz.cl',
  
  // Reportes
  enviar_reporte_semanal: true,
  enviar_reporte_mensual: true,
  email_rector: 'rector@projazz.cl',
}

// MÉTRICAS DE ENCARGADOS (para algoritmo)
export const METRICAS_ENCARGADOS = {
  'user-2': { // María
    leads_recibidos_mes: 45,
    leads_contactados_mes: 42,
    leads_matriculados_mes: 8,
    leads_descartados_mes: 12,
    tiempo_promedio_primer_contacto_hrs: 2.5,
    tasa_conversion: 0.18
  },
  'user-3': { // Pedro
    leads_recibidos_mes: 40,
    leads_contactados_mes: 35,
    leads_matriculados_mes: 5,
    leads_descartados_mes: 15,
    tiempo_promedio_primer_contacto_hrs: 4.2,
    tasa_conversion: 0.125
  }
}

// Helpers para fechas coherentes
const ahora = new Date()

// Crear fecha X días atrás a una hora específica
const diasAtras = (dias, hora = 10) => {
  const fecha = new Date(ahora)
  fecha.setDate(fecha.getDate() - dias)
  fecha.setHours(hora, 0, 0, 0)
  return fecha.toISOString()
}

// Crear fecha X horas atrás
const horasAtras = (horas) => {
  const fecha = new Date(ahora)
  fecha.setHours(fecha.getHours() - horas)
  return fecha.toISOString()
}

// Crear fecha X horas después de otra fecha
const horasDespues = (fechaBase, horas) => {
  const fecha = new Date(fechaBase)
  fecha.setHours(fecha.getHours() + horas)
  return fecha.toISOString()
}

const hoy = new Date(ahora)
hoy.setHours(12, 0, 0, 0)
const manana = new Date(hoy)
manana.setDate(manana.getDate() + 1)
const pasadoManana = new Date(hoy)
pasadoManana.setDate(pasadoManana.getDate() + 2)
const ayer = new Date(hoy)
ayer.setDate(ayer.getDate() - 1)

// ==========================================
// CONSULTAS DE PRUEBA - ESCENARIOS PARA TESTEAR
// ==========================================
// 
// Lista "Para Contactar Hoy" lógica:
// - Estado "nueva" → SIEMPRE aparece
// - Otros estados sin actividad en 24h → aparece
// - Otros estados con actividad reciente → NO aparece
// - Sin actividad en 48h → aparece ATRASADO (rojo)
//
// ==========================================

export const CONSULTAS_INICIALES = [
  // ==========================================
  // LEADS DE MARÍA (user-2)
  // ==========================================
  
  // Lead 1: NUEVA - Hace 2 horas ✅ APARECE (estado nueva)
  {
    id: 'c-001',
    nombre: 'Juan Pablo Fernández',
    email: 'jpfernandez@gmail.com',
    telefono: '+56 9 8765 4321',
    carrera_id: 1,
    medio_id: 'instagram',
    estado: 'nueva',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-2',
    emails_enviados: 0,
    notas: 'Interesado en horarios vespertinos',
    created_at: horasAtras(2), // Hace 2 horas
    fecha_primer_contacto: null,
    fecha_proximo_contacto: hoy.toISOString(),
    fecha_examen_admision: null,
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: null,
    // Trazabilidad
    origen_entrada: 'formulario',
    creado_por: null,
    creado_por_nombre: 'Formulario Web',
    creado_por_rol: 'sistema',
    formulario_id: 'form-1'
  },
  
  // Lead 2: CONTACTADO - Actividad hace 30h ✅ APARECE + NUEVO INTERÉS (cambió instrumento)
  {
    id: 'c-002',
    nombre: 'Catalina Muñoz Reyes',
    email: 'catamunoz@hotmail.com',
    telefono: '+56 9 7654 3210',
    carrera_id: 3, // Ahora interesada en Batería (antes Guitar)
    carreras_interes: [1, 3], // Guitarra y Batería
    medio_id: 'web',
    estado: 'contactado',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-2',
    emails_enviados: 1,
    notas: 'Tiene experiencia previa en batería. Consulta por becas. Cambió interés de Guitarra a Batería.',
    created_at: diasAtras(3, 10), // Hace 3 días a las 10:00
    fecha_primer_contacto: diasAtras(3, 14), // Contactada 4 horas después
    fecha_proximo_contacto: hoy.toISOString(),
    fecha_examen_admision: null,
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: horasAtras(30), // Hace 30 horas
    nuevo_interes: true, // NUEVO: Cambió de instrumento
    fecha_nuevo_interes: horasAtras(30),
    origen_entrada: 'formulario',
    creado_por: null,
    creado_por_nombre: 'Formulario Web',
    creado_por_rol: 'sistema',
    formulario_id: 'form-1'
  },
  
  // Lead 3: EXAMEN - Actividad hace 3h ❌ NO APARECE (actividad reciente)
  {
    id: 'c-003',
    nombre: 'Sebastián Ortega Lagos',
    email: 'sortega@gmail.com',
    telefono: '+56 9 6543 2109',
    carrera_id: 6,
    medio_id: 'whatsapp',
    estado: 'examen_admision',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-2',
    emails_enviados: 2,
    notas: 'Examen de admisión agendado. Confirmó asistencia hace poco.',
    created_at: diasAtras(10, 9), // Hace 10 días a las 9:00
    fecha_primer_contacto: diasAtras(10, 11), // Contactado 2 horas después
    fecha_proximo_contacto: null,
    fecha_examen_admision: pasadoManana.toISOString(),
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: horasAtras(3), // Hace 3 horas - ACTIVIDAD RECIENTE
    origen_entrada: 'manual',
    creado_por: 'user-1',
    creado_por_nombre: 'Carolina Vásquez',
    creado_por_rol: 'keymaster',
    formulario_id: null
  },
  
  // Lead 4: MATRICULADO - Llegó hace 20 días, contactado en 3 horas, cerrado en 15 días
  {
    id: 'c-004',
    nombre: 'Valentina Rojas Silva',
    email: 'vale.rojas@gmail.com',
    telefono: '+56 9 5432 1098',
    carrera_id: 1,
    medio_id: 'instagram',
    estado: 'matriculado',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-2',
    emails_enviados: 2,
    notas: 'Matriculada! Pagó matrícula el 15/11',
    created_at: diasAtras(20, 11), // Hace 20 días
    fecha_primer_contacto: diasAtras(20, 14), // Contactada 3 horas después
    fecha_proximo_contacto: null,
    fecha_examen_admision: diasAtras(10, 16),
    fecha_cierre: diasAtras(5, 12), // Cerrado hace 5 días (15 días de proceso)
    matriculado: true,
    descartado: false,
    ultimo_whatsapp: null,
    origen_entrada: 'formulario',
    creado_por: null,
    creado_por_nombre: 'Formulario Web',
    creado_por_rol: 'sistema',
    formulario_id: 'form-1'
  },
  
  // Lead 5: MATRICULADO - Ingresado por secretaría hace 25 días
  {
    id: 'c-005',
    nombre: 'Andrés Soto Muñoz',
    email: 'asoto@gmail.com',
    telefono: '+56 9 1111 2222',
    carrera_id: 2,
    medio_id: 'telefono',
    estado: 'matriculado',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-2',
    emails_enviados: 3,
    notas: 'Llamó preguntando por piano. Matriculado exitosamente.',
    created_at: diasAtras(25, 9), // Hace 25 días
    fecha_primer_contacto: diasAtras(25, 10), // Contactado 1 hora después
    fecha_proximo_contacto: null,
    fecha_examen_admision: diasAtras(15, 10),
    fecha_cierre: diasAtras(8, 16), // Cerrado hace 8 días (17 días de proceso)
    matriculado: true,
    descartado: false,
    ultimo_whatsapp: null,
    origen_entrada: 'secretaria',
    creado_por: 'user-4',
    creado_por_nombre: 'Andrea Muñoz',
    creado_por_rol: 'asistente',
    formulario_id: null
  },
  
  // Lead 6: SEGUIMIENTO - Actividad hace 50h ✅ APARECE + ATRASADO (>48h)
  {
    id: 'c-006',
    nombre: 'Paula Castillo Vera',
    email: 'pcastillo@outlook.com',
    telefono: '+56 9 3333 4444',
    carrera_id: 5,
    medio_id: 'web',
    estado: 'seguimiento',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-2',
    emails_enviados: 2,
    notas: 'Muy interesada pero viaja la próxima semana. Sin respuesta hace días.',
    created_at: diasAtras(5, 14), // Hace 5 días
    fecha_primer_contacto: diasAtras(5, 17), // Contactada 3 horas después
    fecha_proximo_contacto: manana.toISOString(),
    fecha_examen_admision: null,
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: horasAtras(50), // Hace 50 horas - ATRASADO
    origen_entrada: 'formulario',
    creado_por: null,
    creado_por_nombre: 'Formulario Web',
    creado_por_rol: 'sistema',
    formulario_id: 'form-1'
  },
  
  // ==========================================
  // LEADS DE PEDRO (user-3)
  // ==========================================
  
  // Lead 7: NUEVA - Hace 5 horas ✅ APARECE (estado nueva)
  {
    id: 'c-007',
    nombre: 'Martín Vega Contreras',
    email: 'martinvega@outlook.com',
    telefono: '+56 9 4321 0987',
    carrera_id: 2,
    medio_id: 'web',
    estado: 'nueva',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-3',
    emails_enviados: 0,
    notas: '',
    created_at: horasAtras(5), // Hace 5 horas
    fecha_primer_contacto: null,
    fecha_proximo_contacto: hoy.toISOString(),
    fecha_examen_admision: null,
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: null,
    origen_entrada: 'formulario',
    creado_por: null,
    creado_por_nombre: 'Formulario Web',
    creado_por_rol: 'sistema',
    formulario_id: 'form-1'
  },
  
  // Lead 8: SEGUIMIENTO - Actividad hace 4h ❌ NO APARECE (actividad reciente)
  {
    id: 'c-008',
    nombre: 'Francisca Díaz Pinto',
    email: 'fran.diaz@gmail.com',
    telefono: '+56 9 3210 9876',
    carrera_id: 5,
    medio_id: 'telefono',
    estado: 'seguimiento',
    tipo_alumno: 'antiguo',
    asignado_a: 'user-3',
    emails_enviados: 2,
    notas: 'Ex-alumna de diplomado 2022. Está comparando con otras escuelas. WhatsApp enviado hace poco.',
    created_at: diasAtras(8, 10), // Hace 8 días
    fecha_primer_contacto: diasAtras(8, 16), // Contactada 6 horas después
    fecha_proximo_contacto: ayer.toISOString(),
    fecha_examen_admision: null,
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: horasAtras(4), // Hace 4 horas - ACTIVIDAD RECIENTE
    origen_entrada: 'secretaria',
    creado_por: 'user-4',
    creado_por_nombre: 'Andrea Muñoz',
    creado_por_rol: 'asistente',
    formulario_id: null
  },
  
  // Lead 9: MATRICULADO - Llegó hace 18 días, contactado en 8 horas, cerrado en 12 días
  {
    id: 'c-009',
    nombre: 'Diego Andrade Morales',
    email: 'dandrade@gmail.com',
    telefono: '+56 9 2109 8765',
    carrera_id: 4,
    medio_id: 'referido',
    estado: 'matriculado',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-3',
    emails_enviados: 1,
    notas: 'Referido por alumno actual (Tomás Pérez). Matriculado!',
    created_at: diasAtras(18, 15), // Hace 18 días
    fecha_primer_contacto: diasAtras(18, 23), // Contactado 8 horas después (al día siguiente)
    fecha_proximo_contacto: null,
    fecha_examen_admision: diasAtras(10, 11),
    fecha_cierre: diasAtras(6, 14), // Cerrado hace 6 días (12 días de proceso)
    matriculado: true,
    descartado: false,
    ultimo_whatsapp: null,
    origen_entrada: 'manual',
    creado_por: 'user-1',
    creado_por_nombre: 'Carolina Vásquez',
    creado_por_rol: 'keymaster',
    formulario_id: null
  },
  
  // Lead 10: DESCARTADO - Llegó hace 12 días
  {
    id: 'c-010',
    nombre: 'Camila Torres Jara',
    email: 'camitorres@yahoo.com',
    telefono: '+56 9 1098 7654',
    carrera_id: 8,
    medio_id: 'instagram',
    estado: 'descartado',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-3',
    emails_enviados: 2,
    notas: 'No tiene disponibilidad horaria compatible. Quizás el próximo año.',
    created_at: diasAtras(12, 11), // Hace 12 días
    fecha_primer_contacto: diasAtras(12, 15), // Contactada 4 horas después
    fecha_proximo_contacto: null,
    fecha_examen_admision: null,
    fecha_cierre: diasAtras(5, 10),
    matriculado: false,
    descartado: true,
    motivo_descarte: 'Sin disponibilidad horaria',
    ultimo_whatsapp: null,
    origen_entrada: 'formulario',
    creado_por: null,
    creado_por_nombre: 'Formulario Web',
    creado_por_rol: 'sistema',
    formulario_id: 'form-1'
  },
  
  // Lead 11: CONTACTADO - Actividad hace 26h ✅ APARECE (>24h sin actividad)
  {
    id: 'c-011',
    nombre: 'Ignacio Fuentes Rivera',
    email: 'ifuentes@gmail.com',
    telefono: '+56 9 5555 6666',
    carrera_id: 7,
    medio_id: 'web',
    estado: 'contactado',
    tipo_alumno: 'nuevo',
    asignado_a: 'user-3',
    emails_enviados: 1,
    notas: 'Interesado en composición. Tiene formación autodidacta. Esperando respuesta.',
    created_at: diasAtras(3, 9), // Hace 3 días
    fecha_primer_contacto: diasAtras(3, 11), // Contactado 2 horas después
    fecha_proximo_contacto: hoy.toISOString(),
    fecha_examen_admision: null,
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: horasAtras(26), // Hace 26 horas
    origen_entrada: 'formulario',
    creado_por: null,
    creado_por_nombre: 'Formulario Web',
    creado_por_rol: 'sistema',
    formulario_id: 'form-1'
  },
  
  // Lead 12: EXAMEN - Actividad hace 60h ✅ APARECE + ATRASADO (>48h)
  {
    id: 'c-012',
    nombre: 'Javiera Molina Pizarro',
    email: 'javimolina@hotmail.com',
    telefono: '+56 9 7777 8888',
    carrera_id: 1,
    medio_id: 'instagram',
    estado: 'examen_admision',
    tipo_alumno: 'antiguo',
    asignado_a: 'user-3',
    emails_enviados: 2,
    notas: 'Alumna del diplomado 2023. Quiere hacer carrera completa. Sin contacto hace días.',
    created_at: diasAtras(7, 16), // Hace 7 días
    fecha_primer_contacto: diasAtras(7, 18), // Contactada 2 horas después
    fecha_proximo_contacto: null,
    fecha_examen_admision: manana.toISOString(),
    fecha_cierre: null,
    matriculado: false,
    descartado: false,
    ultimo_whatsapp: horasAtras(60), // Hace 60 horas - ATRASADO
    origen_entrada: 'secretaria',
    creado_por: 'user-4',
    creado_por_nombre: 'Andrea Muñoz',
    creado_por_rol: 'asistente',
    formulario_id: null
  }
]

// ==========================================
// ACTIVIDAD INICIAL - ESCENARIOS DE PRUEBA
// ==========================================
// 
// Para probar "Para Contactar Hoy":
// - c-001: NUEVA → Aparece (estado nueva siempre aparece)
// - c-002: CONTACTADO, última actividad hace 30h → Aparece (>24h)
// - c-003: EXAMEN, última actividad hace 3h → NO Aparece (<24h)
// - c-004: MATRICULADO → NO aparece (cerrado)
// - c-005: MATRICULADO → NO aparece (cerrado)
// - c-006: SEGUIMIENTO, última actividad hace 50h → Aparece + ATRASADO (>48h)
// - c-007: NUEVA → Aparece (estado nueva)
// - c-008: SEGUIMIENTO, última actividad hace 4h → NO Aparece (<24h)
// - c-009: MATRICULADO → NO aparece (cerrado)
// - c-010: DESCARTADO → NO aparece (cerrado)
// - c-011: CONTACTADO, última actividad hace 26h → Aparece (>24h)
// - c-012: EXAMEN, última actividad hace 60h → Aparece + ATRASADO (>48h)
//
export const ACTIVIDAD_INICIAL = [
  // === LEADS DE MARÍA (user-2) ===
  
  // c-001: NUEVA - Solo creación hace 2h (aparece por estado nueva)
  { id: 'a-001', lead_id: 'c-001', user_id: null, tipo: 'creacion', descripcion: 'Lead ingresado desde formulario web', created_at: horasAtras(2) },
  
  // c-002: CONTACTADO - Última actividad hace 30h → APARECE + NUEVO INTERÉS
  { id: 'a-002', lead_id: 'c-002', user_id: null, tipo: 'creacion', descripcion: 'Lead ingresado desde formulario web', created_at: diasAtras(3, 10) },
  { id: 'a-003', lead_id: 'c-002', user_id: 'user-2', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(3, 14) },
  { id: 'a-004', lead_id: 'c-002', user_id: 'user-2', tipo: 'cambio_interes', descripcion: '🎸 Nuevo interés: Batería (antes: Guitarra)', created_at: horasAtras(30) }, // Cambió de instrumento
  
  // c-003: EXAMEN - Última actividad hace 3h → NO APARECE
  { id: 'a-005', lead_id: 'c-003', user_id: 'user-1', tipo: 'creacion', descripcion: 'Lead ingresado por Carolina Vásquez', created_at: diasAtras(10, 9) },
  { id: 'a-006', lead_id: 'c-003', user_id: 'user-2', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(10, 11) },
  { id: 'a-007', lead_id: 'c-003', user_id: 'user-2', tipo: 'examen_agendado', descripcion: 'Examen de admisión agendado', created_at: diasAtras(5, 14) },
  { id: 'a-008', lead_id: 'c-003', user_id: 'user-2', tipo: 'nota', descripcion: 'Confirmó asistencia al examen', created_at: horasAtras(3) }, // Hace 3h - RECIENTE
  
  // c-004: MATRICULADO - Cerrado
  { id: 'a-009', lead_id: 'c-004', user_id: null, tipo: 'creacion', descripcion: 'Lead ingresado desde formulario web', created_at: diasAtras(20, 11) },
  { id: 'a-010', lead_id: 'c-004', user_id: 'user-2', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(20, 14) },
  { id: 'a-011', lead_id: 'c-004', user_id: 'user-2', tipo: 'matriculado', descripcion: '🎉 Lead matriculado exitosamente', created_at: diasAtras(5, 12) },
  
  // c-005: MATRICULADO - Cerrado
  { id: 'a-012', lead_id: 'c-005', user_id: 'user-4', tipo: 'creacion', descripcion: 'Lead ingresado por Secretaría (Andrea Muñoz)', created_at: diasAtras(25, 9) },
  { id: 'a-013', lead_id: 'c-005', user_id: 'user-2', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(25, 10) },
  { id: 'a-014', lead_id: 'c-005', user_id: 'user-2', tipo: 'matriculado', descripcion: '🎉 Lead matriculado exitosamente', created_at: diasAtras(8, 16) },
  
  // c-006: SEGUIMIENTO - Última actividad hace 50h → APARECE + ATRASADO
  { id: 'a-015', lead_id: 'c-006', user_id: null, tipo: 'creacion', descripcion: 'Lead ingresado desde formulario web', created_at: diasAtras(5, 14) },
  { id: 'a-016', lead_id: 'c-006', user_id: 'user-2', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(5, 17) },
  { id: 'a-017', lead_id: 'c-006', user_id: 'user-2', tipo: 'cambio_estado', descripcion: 'Estado: contactado → seguimiento', created_at: horasAtras(50) }, // Hace 50h - ATRASADO
  
  // === LEADS DE PEDRO (user-3) ===
  
  // c-007: NUEVA - Solo creación hace 5h (aparece por estado nueva)
  { id: 'a-018', lead_id: 'c-007', user_id: null, tipo: 'creacion', descripcion: 'Lead ingresado desde formulario web', created_at: horasAtras(5) },
  
  // c-008: SEGUIMIENTO - Última actividad hace 4h → NO APARECE
  { id: 'a-019', lead_id: 'c-008', user_id: 'user-4', tipo: 'creacion', descripcion: 'Lead ingresado por Secretaría (Andrea Muñoz)', created_at: diasAtras(8, 10) },
  { id: 'a-020', lead_id: 'c-008', user_id: 'user-3', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(8, 16) },
  { id: 'a-021', lead_id: 'c-008', user_id: 'user-3', tipo: 'cambio_estado', descripcion: 'Estado: contactado → seguimiento', created_at: diasAtras(5, 10) },
  { id: 'a-022', lead_id: 'c-008', user_id: 'user-3', tipo: 'nota', descripcion: 'WhatsApp enviado con info de becas', created_at: horasAtras(4) }, // Hace 4h - RECIENTE
  
  // c-009: MATRICULADO - Cerrado
  { id: 'a-023', lead_id: 'c-009', user_id: 'user-1', tipo: 'creacion', descripcion: 'Lead ingresado por Carolina Vásquez', created_at: diasAtras(18, 15) },
  { id: 'a-024', lead_id: 'c-009', user_id: 'user-3', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(18, 23) },
  { id: 'a-025', lead_id: 'c-009', user_id: 'user-3', tipo: 'matriculado', descripcion: '🎉 Lead matriculado exitosamente', created_at: diasAtras(6, 14) },
  
  // c-010: DESCARTADO - Cerrado
  { id: 'a-026', lead_id: 'c-010', user_id: null, tipo: 'creacion', descripcion: 'Lead ingresado desde formulario web', created_at: diasAtras(12, 11) },
  { id: 'a-027', lead_id: 'c-010', user_id: 'user-3', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(12, 15) },
  { id: 'a-028', lead_id: 'c-010', user_id: 'user-3', tipo: 'descartado', descripcion: 'Lead descartado: Sin disponibilidad horaria', created_at: diasAtras(5, 10) },
  
  // c-011: CONTACTADO - Última actividad hace 26h → APARECE
  { id: 'a-029', lead_id: 'c-011', user_id: null, tipo: 'creacion', descripcion: 'Lead ingresado desde formulario web', created_at: diasAtras(3, 9) },
  { id: 'a-030', lead_id: 'c-011', user_id: 'user-3', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(3, 11) },
  { id: 'a-031', lead_id: 'c-011', user_id: 'user-3', tipo: 'nota', descripcion: 'Interesado, pide más info por email', created_at: horasAtras(26) }, // Hace 26h
  
  // c-012: EXAMEN - Última actividad hace 60h → APARECE + ATRASADO
  { id: 'a-032', lead_id: 'c-012', user_id: 'user-4', tipo: 'creacion', descripcion: 'Lead ingresado por Secretaría (Andrea Muñoz)', created_at: diasAtras(7, 16) },
  { id: 'a-033', lead_id: 'c-012', user_id: 'user-3', tipo: 'cambio_estado', descripcion: 'Estado: nueva → contactado', created_at: diasAtras(7, 18) },
  { id: 'a-034', lead_id: 'c-012', user_id: 'user-3', tipo: 'examen_agendado', descripcion: 'Examen de admisión agendado', created_at: horasAtras(60) }, // Hace 60h - ATRASADO
]

// RECORDATORIOS PENDIENTES
export const RECORDATORIOS_INICIALES = [
  {
    id: 'rec-001',
    lead_id: 'c-002',
    user_id: 'user-2',
    tipo: 'whatsapp_followup',
    descripcion: 'Actualizar resultado de contacto WhatsApp',
    fecha_disparo: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    disparado: false,
    resultado: null
  },
  {
    id: 'rec-002',
    lead_id: 'c-003',
    user_id: 'user-2',
    tipo: 'examen_encargado',
    descripcion: 'Confirmar asistencia a examen de admisión',
    fecha_disparo: manana.toISOString(),
    disparado: false,
    resultado: null
  },
  {
    id: 'rec-003',
    lead_id: 'c-008',
    user_id: 'user-3',
    tipo: 'sin_avance',
    descripcion: 'Lead sin avance hace 3 días',
    fecha_disparo: hoy.toISOString(),
    disparado: false,
    resultado: null
  }
]

// COLA DE LEADS (vacía inicialmente)
export const COLA_LEADS_INICIAL = []

// CORREOS ENVIADOS
export const CORREOS_ENVIADOS_INICIAL = [
  {
    id: 'email-001',
    lead_id: 'c-002',
    user_id: 'user-2',
    plantilla_id: 'tpl-1',
    asunto: '¡Gracias por tu interés en ProJazz!',
    destinatario: 'catamunoz@hotmail.com',
    estado: 'enviado',
    created_at: diasAtras(3, 14)
  }
]
