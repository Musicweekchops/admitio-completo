import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CambiarPassword from './pages/CambiarPassword';
import Usuarios from './pages/Usuarios';
import AuthCallback from './pages/AuthCallback';

// Loading spinner
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Ruta protegida para usuarios autenticados
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, debeCambiarPassword, isSuperOwner } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si debe cambiar contraseña, redirigir
  if (debeCambiarPassword) {
    return <Navigate to="/cambiar-password" replace />;
  }

  return children;
};

// Ruta protegida para Super Owners
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, isSuperOwner } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Ruta pública (redirige si ya está autenticado)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, isSuperOwner, debeCambiarPassword } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    if (debeCambiarPassword) {
      return <Navigate to="/cambiar-password" replace />;
    }
    return <Navigate to={isSuperOwner ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

// App Routes
const AppRoutes = () => {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      
      {/* Auth Callback - Para Supabase Auth (verificación email, reset password) */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Cambiar contraseña */}
      <Route path="/cambiar-password" element={<CambiarPassword />} />
      <Route path="/reset-password" element={<CambiarPassword />} />

      {/* Dashboard de usuario */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Gestión de usuarios (KeyMaster) */}
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <Usuarios />
          </ProtectedRoute>
        }
      />

      {/* Panel de administración (Super Owner) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Rutas placeholder para futuras páginas */}
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 - Redirigir a home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
