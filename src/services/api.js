// ============================================
// ADMITIO - Servicio de conexión al Backend
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================
// GESTIÓN DE TOKEN
// ============================================
const getToken = () => localStorage.getItem('admitio_token');
const setToken = (token) => localStorage.setItem('admitio_token', token);
const removeToken = () => localStorage.removeItem('admitio_token');

const getUser = () => {
  const user = localStorage.getItem('admitio_user');
  return user ? JSON.parse(user) : null;
};
const setUser = (user) => localStorage.setItem('admitio_user', JSON.stringify(user));
const removeUser = () => localStorage.removeItem('admitio_user');

const getTenant = () => {
  const tenant = localStorage.getItem('admitio_tenant');
  return tenant ? JSON.parse(tenant) : null;
};
const setTenant = (tenant) => localStorage.setItem('admitio_tenant', JSON.stringify(tenant));
const removeTenant = () => localStorage.removeItem('admitio_tenant');

// ============================================
// HEADERS
// ============================================
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

// ============================================
// FETCH WRAPPER
// ============================================
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(options.auth !== false),
        ...options.headers,
      },
    });

    const text = await response.text();
    
    if (!text) {
      console.error('Respuesta vacía del servidor:', response.status);
      throw new Error('El servidor no respondió correctamente');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Respuesta no es JSON:', text.substring(0, 200));
      throw new Error('Error de comunicación con el servidor');
    }

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        removeUser();
        removeTenant();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        throw new Error(data.error || 'Sesión expirada');
      }
      throw new Error(data.error || 'Error en la solicitud');
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('No se pudo conectar con el servidor');
    }
    throw error;
  }
};

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  // Login de usuario (tenant)
  login: async (tenant, email, password) => {
    const data = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tenant, email, password }),
      auth: false,
    });
    
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant);
    }
    
    return data;
  },

  // Login de Super Owner
  adminLogin: async (email, password) => {
    const data = await fetchAPI('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      removeTenant();
    }
    
    return data;
  },

  // Obtener usuario actual
  me: async () => {
    return await fetchAPI('/api/auth/me');
  },

  // Cambiar contraseña
  cambiarPassword: async (passwordActual, passwordNueva) => {
    return await fetchAPI('/api/auth/cambiar-password', {
      method: 'POST',
      body: JSON.stringify({ passwordActual, passwordNueva }),
    });
  },

  // Logout
  logout: () => {
    removeToken();
    removeUser();
    removeTenant();
  },

  // Helpers
  getToken,
  getUser,
  getTenant,
  isAuthenticated: () => !!getToken(),
};

// ============================================
// LEADS API
// ============================================
export const leadsAPI = {
  // Listar leads
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await fetchAPI(`/api/leads${query ? `?${query}` : ''}`);
  },

  // Estadísticas
  stats: async () => {
    return await fetchAPI('/api/leads/stats');
  },

  // Obtener un lead
  get: async (id) => {
    return await fetchAPI(`/api/leads/${id}`);
  },

  // Crear lead
  create: async (leadData) => {
    return await fetchAPI('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  },

  // Actualizar lead
  update: async (id, leadData) => {
    return await fetchAPI(`/api/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  },

  // Archivar lead
  archivar: async (id, motivo) => {
    return await fetchAPI(`/api/leads/${id}/archivar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  },

  // Desarchivar lead
  desarchivar: async (id) => {
    return await fetchAPI(`/api/leads/${id}/desarchivar`, {
      method: 'POST',
    });
  },

  // Registrar contacto
  contacto: async (id, contactoData) => {
    return await fetchAPI(`/api/leads/${id}/contacto`, {
      method: 'POST',
      body: JSON.stringify(contactoData),
    });
  },
};

// ============================================
// USUARIOS API
// ============================================
export const usuariosAPI = {
  // Listar usuarios del tenant
  list: async () => {
    return await fetchAPI('/api/usuarios');
  },

  // Verificar límite
  limite: async () => {
    return await fetchAPI('/api/usuarios/limite');
  },

  // Obtener usuario
  get: async (id) => {
    return await fetchAPI(`/api/usuarios/${id}`);
  },

  // Crear usuario
  create: async (userData) => {
    return await fetchAPI('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Actualizar usuario
  update: async (id, userData) => {
    return await fetchAPI(`/api/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Eliminar usuario
  delete: async (id) => {
    return await fetchAPI(`/api/usuarios/${id}`, {
      method: 'DELETE',
    });
  },

  // Reset password
  resetPassword: async (id) => {
    return await fetchAPI(`/api/usuarios/${id}/reset-password`, {
      method: 'POST',
    });
  },
};

// ============================================
// CARRERAS API
// ============================================
export const carrerasAPI = {
  list: async () => {
    return await fetchAPI('/api/carreras');
  },

  create: async (data) => {
    return await fetchAPI('/api/carreras', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return await fetchAPI(`/api/carreras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return await fetchAPI(`/api/carreras/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// MEDIOS API
// ============================================
export const mediosAPI = {
  list: async () => {
    return await fetchAPI('/api/medios');
  },
};

// ============================================
// HEALTH CHECK
// ============================================
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

export default {
  authAPI,
  leadsAPI,
  usuariosAPI,
  carrerasAPI,
  mediosAPI,
  healthCheck,
};
