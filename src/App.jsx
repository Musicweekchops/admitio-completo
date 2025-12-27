import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import AuthCallback from './pages/AuthCallback';
import CambiarPassword from './pages/CambiarPassword';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Loading spinner
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Ruta protegida para usuarios autenticados
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Ruta pública (redirige si ya está autenticado)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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

      {/* Dashboard */}
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
