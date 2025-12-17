// ============================================
// ADMITIO - Sincronización Store ↔ Supabase
// ============================================
// Este módulo sincroniza el localStorage con Supabase
// Permite que el Dashboard funcione de forma síncrona
// mientras los datos persisten en la nube

import { supabase } from './supabase';

const STORAGE_KEY = 'admitio_data';

// ============================================
// CARGAR DATOS DESDE SUPABASE
// ============================================

export async function cargarDatosInstitucion(institucionId) {
  console.log('📥 Cargando datos desde Supabase...');
  
  try {
    // Cargar leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('institucion_id', institucionId)
      .order('created_at', { ascending: false });

    if (leadsError) throw leadsError;

    // Cargar usuarios
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('institucion_id', institucionId);

    if (usuariosError) throw usuariosError;

    // Cargar carreras
    const { data: carreras, error: carrerasError } = await supabase
      .from('carreras')
      .select('*')
      .eq('institucion_id', institucionId);

    if (carrerasError) throw carrerasError;

    // Cargar acciones de leads
    const leadIds = leads.map(l => l.id);
    let acciones = [];
    if (leadIds.length > 0) {
      const { data: accionesData } = await supabase
        .from('acciones_lead')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });
      acciones = accionesData || [];
    }

    // Convertir formato Supabase → formato Store
    const storeData = {
      consultas: leads.map(lead => ({
        id: lead.id,
        nombre: lead.nombre,
        email: lead.email,
        telefono: lead.telefono,
        carrera_id: lead.carrera_id,
        carrera_nombre: lead.carrera_nombre,
        carreras_interes: lead.carreras_interes || [],
        medio_id: lead.medio,
        estado: lead.estado,
        prioridad: lead.prioridad,
        asignado_a: lead.asignado_a,
        notas: lead.notas,
        tipo_alumno: 'nuevo',
        fecha_creacion: lead.created_at,
        fecha_actualizacion: lead.updated_at,
        fecha_primer_contacto: lead.fecha_primer_contacto,
        fecha_cierre: lead.fecha_cierre,
        created_at: lead.created_at,
        historial: acciones
          .filter(a => a.lead_id === lead.id)
          .map(a => ({
            fecha: a.created_at,
            tipo: a.tipo,
            descripcion: a.descripcion,
            usuario_id: a.usuario_id
          }))
      })),
      usuarios: usuarios.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol_id: u.rol,
        activo: u.activo,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}&background=7c3aed&color=fff`
      })),
      carreras: carreras.map(c => ({
        id: c.id,
        nombre: c.nombre,
        color: c.color,
        activa: c.activa
      })),
      actividad: acciones.slice(0, 50).map(a => ({
        id: a.id,
        tipo: a.tipo,
        descripcion: a.descripcion,
        fecha: a.created_at,
        usuario_id: a.usuario_id,
        consulta_id: a.lead_id
      })),
      // Datos por defecto
      medios: [
        { id: 'instagram', nombre: 'Instagram', icono: 'Instagram', color: 'text-pink-500' },
        { id: 'facebook', nombre: 'Facebook', icono: 'Facebook', color: 'text-blue-600' },
        { id: 'web', nombre: 'Sitio Web', icono: 'Globe', color: 'text-blue-500' },
        { id: 'referido', nombre: 'Referido', icono: 'Users', color: 'text-green-500' },
        { id: 'llamada', nombre: 'Llamada', icono: 'Phone', color: 'text-amber-500' },
        { id: 'email', nombre: 'Email', icono: 'Mail', color: 'text-red-500' },
        { id: 'whatsapp', nombre: 'WhatsApp', icono: 'MessageCircle', color: 'text-green-600' },
        { id: 'presencial', nombre: 'Presencial', icono: 'MapPin', color: 'text-purple-500' },
        { id: 'otro', nombre: 'Otro', icono: 'MoreHorizontal', color: 'text-slate-500' }
      ],
      plantillas: [],
      formularios: [],
      config: {
        nombre: 'Mi Institución',
        logo: null,
        colores: { primario: '#7c3aed', secundario: '#10b981' }
      },
      metricas_encargados: {},
      recordatorios: [],
      cola_leads: [],
      correos_enviados: [],
      notificaciones: [],
      importaciones: [],
      _supabase_sync: true,
      _institucion_id: institucionId,
      _last_sync: new Date().toISOString()
    };

    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
    localStorage.setItem('admitio_version', '2.6');
    
    // Disparar evento para que el Dashboard recargue
    window.dispatchEvent(new CustomEvent('admitio-store-updated', { 
      detail: { institucionId, leadsCount: leads.length, usuariosCount: usuarios.length }
    }));
    
    console.log(`✅ Datos cargados: ${leads.length} leads, ${usuarios.length} usuarios, ${carreras.length} carreras`);
    return storeData;

  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    throw error;
  }
}

// ============================================
// SINCRONIZAR CAMBIOS A SUPABASE
// ============================================

// Cola de sincronización para evitar conflictos
let syncQueue = [];
let isSyncing = false;

async function processSyncQueue() {
  if (isSyncing || syncQueue.length === 0) return;
  
  isSyncing = true;
  
  while (syncQueue.length > 0) {
    const task = syncQueue.shift();
    try {
      await task.execute();
      console.log(`✅ Sincronizado: ${task.type}`);
    } catch (error) {
      console.error(`❌ Error sincronizando ${task.type}:`, error);
      // Re-encolar si falla? Por ahora no para evitar loops
    }
  }
  
  isSyncing = false;
}

function addToSyncQueue(type, execute) {
  syncQueue.push({ type, execute, timestamp: Date.now() });
  // Procesar en background
  setTimeout(processSyncQueue, 100);
}

// ============================================
// FUNCIONES DE SINCRONIZACIÓN
// ============================================

export function syncCrearLead(institucionId, leadData) {
  console.log('🔄 Sincronizando nuevo lead a Supabase:', { institucionId, nombre: leadData.nombre });
  
  if (!institucionId) {
    console.error('❌ No se puede sincronizar: institucionId es null');
    return;
  }
  
  addToSyncQueue('crear_lead', async () => {
    // No enviar el ID local - dejar que Supabase genere UUID
    // Tampoco enviar asignado_a si es un ID local (no UUID)
    const insertData = {
      institucion_id: institucionId,
      nombre: leadData.nombre,
      email: leadData.email || null,
      telefono: leadData.telefono || null,
      carrera_nombre: leadData.carrera_nombre || null,
      medio: leadData.medio_id || 'otro',
      estado: leadData.estado || 'nueva',
      prioridad: leadData.prioridad || 'media',
      notas: leadData.notas || null
    };
    
    // Solo incluir carrera_id si tiene valor
    if (leadData.carrera_id) {
      insertData.carrera_id = leadData.carrera_id;
    }
    
    // Solo incluir asignado_a si parece UUID (contiene guiones en formato UUID)
    if (leadData.asignado_a && leadData.asignado_a.includes('-') && leadData.asignado_a.length > 30) {
      insertData.asignado_a = leadData.asignado_a;
    }
    
    // Incluir creado_por si es UUID válido
    if (leadData.creado_por && leadData.creado_por.includes('-') && leadData.creado_por.length > 30) {
      insertData.creado_por = leadData.creado_por;
    }
    
    console.log('📤 Enviando a Supabase:', insertData);
    
    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('❌ Error sincronizando lead:', error);
      throw error;
    }
    console.log('✅ Lead sincronizado a Supabase:', data);
  });
}

export function syncActualizarLead(leadId, updates) {
  // Si el leadId es local (no UUID), no podemos actualizar en Supabase
  if (!leadId || !leadId.includes('-') || leadId.startsWith('c-')) {
    console.log('⚠️ Lead con ID local, no se sincroniza actualización:', leadId);
    return;
  }
  
  addToSyncQueue('actualizar_lead', async () => {
    const supabaseUpdates = {};
    
    if (updates.nombre !== undefined) supabaseUpdates.nombre = updates.nombre;
    if (updates.email !== undefined) supabaseUpdates.email = updates.email;
    if (updates.telefono !== undefined) supabaseUpdates.telefono = updates.telefono;
    if (updates.estado !== undefined) supabaseUpdates.estado = updates.estado;
    if (updates.prioridad !== undefined) supabaseUpdates.prioridad = updates.prioridad;
    if (updates.notas !== undefined) supabaseUpdates.notas = updates.notas;
    if (updates.carrera_id !== undefined) supabaseUpdates.carrera_id = updates.carrera_id;
    if (updates.carrera_nombre !== undefined) supabaseUpdates.carrera_nombre = updates.carrera_nombre;
    if (updates.carreras_interes !== undefined) supabaseUpdates.carreras_interes = updates.carreras_interes;
    if (updates.fecha_primer_contacto !== undefined) supabaseUpdates.fecha_primer_contacto = updates.fecha_primer_contacto;
    if (updates.fecha_cierre !== undefined) supabaseUpdates.fecha_cierre = updates.fecha_cierre;
    
    // Solo sincronizar asignado_a si parece UUID
    if (updates.asignado_a !== undefined) {
      console.log('🔄 Sincronizando asignado_a:', updates.asignado_a);
      if (updates.asignado_a && updates.asignado_a.includes('-') && updates.asignado_a.length > 30) {
        supabaseUpdates.asignado_a = updates.asignado_a;
        console.log('✅ asignado_a es UUID válido, sincronizando');
      } else if (!updates.asignado_a) {
        supabaseUpdates.asignado_a = null;
        console.log('✅ asignado_a es null, sincronizando');
      } else {
        console.log('⚠️ asignado_a no es UUID válido, NO se sincroniza:', updates.asignado_a);
      }
    }
    
    supabaseUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('leads')
      .update(supabaseUpdates)
      .eq('id', leadId);
    
    if (error) {
      console.error('❌ Error sincronizando actualización:', error);
      throw error;
    }
    console.log('✅ Lead actualizado en Supabase:', leadId);
  });
}

export function syncEliminarLead(leadId) {
  // Si el leadId es local (no UUID), no podemos eliminar en Supabase
  if (!leadId || !leadId.includes('-') || leadId.startsWith('c-')) {
    console.log('⚠️ Lead con ID local, no se sincroniza eliminación:', leadId);
    return;
  }
  
  addToSyncQueue('eliminar_lead', async () => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);
    
    if (error) throw error;
  });
}

export function syncCrearAccion(leadId, accion, usuarioId) {
  // Si el leadId es local, no podemos crear la acción en Supabase
  if (!leadId || leadId.startsWith('c-') || leadId.startsWith('a-')) {
    console.log('⚠️ Lead con ID local, no se sincroniza acción');
    return;
  }
  
  // Validar que leadId parece UUID
  if (!leadId.includes('-') || leadId.length < 30) {
    console.log('⚠️ Lead ID no parece UUID, no se sincroniza acción:', leadId);
    return;
  }
  
  addToSyncQueue('crear_accion', async () => {
    const insertData = {
      lead_id: leadId,
      tipo: accion.tipo,
      descripcion: accion.descripcion
    };
    
    // Solo agregar usuario_id si parece UUID válido
    if (usuarioId && usuarioId.includes('-') && usuarioId.length > 30) {
      insertData.usuario_id = usuarioId;
    }
    
    console.log('📤 Sincronizando acción a Supabase:', insertData);
    
    const { data, error } = await supabase
      .from('acciones_lead')
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('❌ Error sincronizando acción:', error);
      throw error;
    }
    console.log('✅ Acción sincronizada:', data);
  });
}

export function syncCrearUsuario(institucionId, userData) {
  if (!institucionId) {
    console.error('❌ No se puede sincronizar usuario: institucionId es null');
    return;
  }
  
  addToSyncQueue('crear_usuario', async () => {
    // No enviar el ID local - dejar que Supabase genere UUID
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        institucion_id: institucionId,
        nombre: userData.nombre,
        email: userData.email,
        password_hash: userData.password || '123456',
        rol: userData.rol_id || 'encargado',
        activo: true,
        password_temporal: true
      })
      .select();
    
    if (error) {
      console.error('❌ Error sincronizando usuario:', error);
      throw error;
    }
    console.log('✅ Usuario sincronizado a Supabase:', data);
  });
}

export function syncActualizarUsuario(usuarioId, updates) {
  // Si el usuarioId es local (no UUID), no podemos actualizar en Supabase
  if (!usuarioId || usuarioId.startsWith('user-')) {
    console.log('⚠️ Usuario con ID local, no se sincroniza actualización:', usuarioId);
    return;
  }
  
  addToSyncQueue('actualizar_usuario', async () => {
    const supabaseUpdates = {};
    
    if (updates.nombre !== undefined) supabaseUpdates.nombre = updates.nombre;
    if (updates.email !== undefined) supabaseUpdates.email = updates.email;
    if (updates.rol_id !== undefined) supabaseUpdates.rol = updates.rol_id;
    if (updates.activo !== undefined) supabaseUpdates.activo = updates.activo;
    
    supabaseUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('usuarios')
      .update(supabaseUpdates)
      .eq('id', usuarioId);
    
    if (error) throw error;
  });
}

export function syncImportarLeads(institucionId, leads) {
  addToSyncQueue('importar_leads', async () => {
    const leadsParaSupabase = leads.map(lead => ({
      id: lead.id,
      institucion_id: institucionId,
      nombre: lead.nombre,
      email: lead.email,
      telefono: lead.telefono,
      carrera_id: lead.carrera_id,
      carrera_nombre: lead.carrera_nombre,
      medio: lead.medio_id || 'otro',
      estado: lead.estado || 'nueva',
      prioridad: lead.prioridad || 'media',
      notas: lead.notas
    }));

    const { error } = await supabase
      .from('leads')
      .insert(leadsParaSupabase);
    
    if (error) throw error;
  });
}

// ============================================
// VERIFICAR ESTADO DE SINCRONIZACIÓN
// ============================================

export function getSyncStatus() {
  return {
    pendingTasks: syncQueue.length,
    isSyncing,
    lastSync: localStorage.getItem('admitio_last_sync')
  };
}

export function forcSync() {
  return processSyncQueue();
}

// ============================================
// CARRERAS
// ============================================

export function syncCrearCarrera(institucionId, carreraData) {
  if (!institucionId) {
    console.error('❌ No se puede sincronizar carrera: institucionId es null');
    return;
  }
  
  addToSyncQueue('crear_carrera', async () => {
    const { data, error } = await supabase
      .from('carreras')
      .insert({
        institucion_id: institucionId,
        nombre: carreraData.nombre,
        color: carreraData.color || '#7c3aed',
        activa: true
      })
      .select();
    
    if (error) {
      console.error('❌ Error sincronizando carrera:', error);
      throw error;
    }
    console.log('✅ Carrera sincronizada a Supabase:', data);
  });
}

// ============================================
// HELPER: Obtener institucion_id del store
// ============================================

export function getInstitucionIdFromStore() {
  try {
    // Primero buscar en admitio_data
    const stored = localStorage.getItem('admitio_data');
    if (stored) {
      const data = JSON.parse(stored);
      if (data._institucion_id) {
        return data._institucion_id;
      }
    }
    
    // Fallback: buscar en la sesión
    const session = localStorage.getItem('admitio_session');
    if (session) {
      const sessionData = JSON.parse(session);
      if (sessionData.institucion?.id) {
        return sessionData.institucion.id;
      }
    }
  } catch (e) {
    console.error('Error obteniendo institucion_id:', e);
  }
  return null;
}

export default {
  cargarDatosInstitucion,
  syncCrearLead,
  syncActualizarLead,
  syncEliminarLead,
  syncCrearAccion,
  syncCrearUsuario,
  syncActualizarUsuario,
  syncImportarLeads,
  syncCrearCarrera,
  getSyncStatus,
  forcSync,
  getInstitucionIdFromStore
};
